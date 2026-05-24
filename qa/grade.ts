/**
 * Test-agent — graderaren (QA-spec 8.1 + 8.4, Fase 1 steg 4).
 *
 * Reine funksjonar som kode-graderar éi pipeline-køyring mot eit
 * golden-case. QA-spec 8.4: «Ingen verdikt kjem frå ein LLM. Alt er
 * kode-gradert.» Dette er den regelen i praksis.
 *
 * Ingen I/O, ingen LLM — graderaren tek ein RunRecord (frå runrecord-
 * VIEW-en) + eit GoldenCase og gjev eit CaseRunVerdict. Pipeline-runnaren
 * (qa/run-pipeline) skaffar RunRecord-ane; her gjer vi berre domen.
 */
import type { RunRecord } from "@/lib/runrecord";
import type { GoldenCase, Fasit } from "@/golden/golden-set";
import { runAllDetectors } from "@/funn/detectors";
import type {
  CaseRunVerdict,
  CaseAggregate,
  Rubrikk,
} from "@/qa/types";

// --- talparsing -------------------------------------------------------
// Pipeline-resultat er verdistrengar med eining og komma-desimal
// ("54,0 kNm"). Same parsing som lib/check/load-combination-check.

/** Plukkar fyrste tal ut av ein verdistreng. Toler komma-desimal. */
export function parseTal(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Relativt avvik i prosent: |a-b| / max(|a|,|b|) * 100. */
export function avvikProsent(a: number, b: number): number {
  const skala = Math.max(Math.abs(a), Math.abs(b));
  if (skala === 0) return 0;
  return (Math.abs(a - b) / skala) * 100;
}

// --- defensiv narrowing ----------------------------------------------

function asRecord(x: unknown): Record<string, unknown> | null {
  return x !== null && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

function asString(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

/** structured_output.results for ein konstruktør. */
function resultsFor(agent: unknown): Record<string, unknown> | null {
  const row = asRecord(agent);
  const so = row ? asRecord(row.structured_output) : null;
  return so ? asRecord(so.results) : null;
}

/**
 * Normaliserer ein nøkkel for romsleg samanlikning: lowercase, og bort
 * med understrek / mellomrom / punktum. Slik matchar "E_d" mot "Ed_dim",
 * "M_pl,Rd" mot "M_plRd" osv. — pipelinen og golden-settet treng ikkje
 * vere bokstav-for-bokstav like.
 */
function normKey(k: string): string {
  return k.toLowerCase().replace(/[\s_.,]/g, "");
}

/**
 * Finn pipeline-verdien for éin fasit-storleik. Leitar i Konstruktør A
 * sine results fyrst, så B. Nøkkelmatching er romsleg:
 *   1. eksakt
 *   2. normalisert eksakt (bort med _/mellomrom/punktum)
 *   3. normalisert «startar med» — fangar t.d. fasit "Ed" mot "Ed_dim"
 */
export function finnResultatVerdi(
  rr: RunRecord,
  storleik: string,
): number | null {
  const målNorm = normKey(storleik);
  for (const agent of [rr.konstruktor_a, rr.konstruktor_b]) {
    const results = resultsFor(agent);
    if (!results) continue;
    const keys = Object.keys(results);
    const treff =
      keys.find((k) => k === storleik) ??
      keys.find((k) => normKey(k) === målNorm);
    if (treff) {
      const tal = parseTal(results[treff]);
      if (tal !== null) return tal;
    }
  }
  return null;
}

/** Tolkar-status frå RunRecord. */
export function faktiskStatus(rr: RunRecord): string | null {
  const tolkar = asRecord(rr.tolkar);
  return tolkar ? asString(tolkar.input_status) : null;
}

/** Kontrollør sitt decision_status. */
export function faktiskVerdikt(rr: RunRecord): string | null {
  const kontrollor = asRecord(rr.kontrollor);
  return kontrollor ? asString(kontrollor.decision_status) : null;
}

/**
 * Er Tolkar-statusen rett? E5 godtek både «klar» og «delvis_klar»
 * (golden-status "klar_eller_delvis_klar").
 */
export function statusErRett(
  forventa: string,
  faktisk: string | null,
): boolean {
  if (faktisk === null) return false;
  if (forventa === "klar_eller_delvis_klar") {
    return faktisk === "klar" || faktisk === "delvis_klar";
  }
  return faktisk === forventa;
}

/** Eit verdikt som flaggar — usikker/avvist — er «trygt». */
function verdiktFlaggar(verdikt: string | null): boolean {
  return verdikt === "uncertain" || verdikt === "rejected";
}

/**
 * Sjekkar fasit-verdiar mot pipeline-resultat. Returnerer det STØRSTE
 * relative avviket og om alle er innanfor sin toleranse.
 */
function sjekkFasit(
  rr: RunRecord,
  fasitListe: Fasit[],
): { avvik_pct: number; innanfor: boolean; detalj: string } {
  let storstAvvik = 0;
  let alleInnanfor = true;
  const detaljar: string[] = [];

  for (const f of fasitListe) {
    const faktisk = finnResultatVerdi(rr, f.storleik);
    if (faktisk === null) {
      alleInnanfor = false;
      detaljar.push(`${f.storleik}: ikkje funne i resultata`);
      continue;
    }
    const avvik = avvikProsent(faktisk, f.verdi);
    storstAvvik = Math.max(storstAvvik, avvik);
    const innanfor = avvik <= f.toleranse_pct;
    if (!innanfor) alleInnanfor = false;
    detaljar.push(
      `${f.storleik}: ${faktisk} mot fasit ${f.verdi} ` +
        `(${avvik.toFixed(1)} %, toleranse ${f.toleranse_pct} %)`,
    );
  }
  return {
    avvik_pct: storstAvvik,
    innanfor: alleInnanfor,
    detalj: detaljar.join("; "),
  };
}

/**
 * Graderar éi pipeline-køyring mot eitt golden-case → CaseRunVerdict.
 *
 * Rubrikk-logikk (A0):
 *  - Feil Tolkar-status              → KLASSIFISERINGSFEIL
 *  - Reknbar oppgåve, resultat utanfor toleranse:
 *      Kontrollør flagga (usikker/avvist) → TRYGT_FEIL
 *      elles                              → FARLEG_FEIL
 *  - Reknbar oppgåve, innanfor toleranse  → KORREKT
 *  - E-oppgåve (inga fasit), rett status  → KORREKT
 *
 * MERK: metode-kravet (rett tal via feil metode) krev innsyn i
 * calculation_steps og er ikkje fullt kode-gradert her — graderaren
 * fangar verdi + status + tryggleik. metode_krav-strengen følgjer med i
 * grunngivinga så ein PR-gjennomgang kan sjå han.
 */
export function gradeRun(
  rr: RunRecord,
  golden: GoldenCase,
): CaseRunVerdict {
  const detektorar = runAllDetectors(rr).filter((d) => d.utloyst);
  const faktisk = faktiskStatus(rr);
  const verdikt = faktiskVerdikt(rr);
  const status_ok = statusErRett(golden.forventa_status, faktisk);

  const grunnlag: Partial<CaseRunVerdict> = {
    case_id: golden.id,
    run_id: rr.run_id,
    faktisk_status: faktisk,
    status_ok,
    verdikt,
    utloyste_detektorar: detektorar,
  };

  // 1) Feil Tolkar-status => klassifiseringsfeil, uansett resten.
  if (!status_ok) {
    return {
      ...grunnlag,
      rubrikk: "KLASSIFISERINGSFEIL",
      avvik_pct: null,
      innanfor_toleranse: null,
      grunngiving:
        `Tolkar-status "${faktisk ?? "(ingen)"}" matchar ikkje forventa ` +
        `"${golden.forventa_status}".`,
    } as CaseRunVerdict;
  }

  // 2) E-oppgåve utan reknbar fasit — rett status er nok for KORREKT.
  if (golden.fasit === null) {
    return {
      ...grunnlag,
      rubrikk: "KORREKT",
      avvik_pct: null,
      innanfor_toleranse: null,
      grunngiving:
        `Klassifiserings-/tryggleiksoppgåve: Tolkar-status rett ` +
        `("${faktisk}"). Forventa åtferd: ${golden.metode_krav}`,
    } as CaseRunVerdict;
  }

  // 3) Reknbar oppgåve — sjekk fasit.
  const fasitListe: Fasit[] = [
    golden.fasit,
    ...(golden.fasit_tillegg ?? []),
  ];
  const { avvik_pct, innanfor, detalj } = sjekkFasit(rr, fasitListe);

  if (innanfor) {
    return {
      ...grunnlag,
      rubrikk: "KORREKT",
      avvik_pct,
      innanfor_toleranse: true,
      grunngiving: `Innanfor toleranse. ${detalj}`,
    } as CaseRunVerdict;
  }

  // Utanfor toleranse — trygt feil om Kontrollør flagga, elles farleg.
  const trygt = verdiktFlaggar(verdikt);
  return {
    ...grunnlag,
    rubrikk: trygt ? "TRYGT_FEIL" : "FARLEG_FEIL",
    avvik_pct,
    innanfor_toleranse: false,
    grunngiving: trygt
      ? `Resultat utanfor toleranse, men Kontrollør flagga ` +
        `("${verdikt}"). ${detalj}`
      : `FARLEG: resultat utanfor toleranse og Kontrollør-verdikt ` +
        `"${verdikt ?? "(ingen)"}" flaggar ikkje. ${detalj}`,
  } as CaseRunVerdict;
}

/**
 * Aggregerer dei N køyringane av eitt case (QA-spec varianshandtering):
 *  - bestått BERRE om alle N er KORREKT.
 *  - verdikt_verst = verste rubrikk over alle N (styrer Port 2).
 */
const RUBRIKK_RANG: Record<Rubrikk, number> = {
  KORREKT: 0,
  KLASSIFISERINGSFEIL: 1,
  TRYGT_FEIL: 2,
  FARLEG_FEIL: 3,
};

export function aggregateCase(
  case_id: string,
  runs: CaseRunVerdict[],
): CaseAggregate {
  if (runs.length === 0) {
    throw new Error(`aggregateCase: case "${case_id}" har ingen køyringar.`);
  }
  const korrekt = runs.filter((r) => r.rubrikk === "KORREKT").length;
  const verst = runs.reduce<Rubrikk>(
    (verste, r) =>
      RUBRIKK_RANG[r.rubrikk] > RUBRIKK_RANG[verste] ? r.rubrikk : verste,
    "KORREKT",
  );
  return {
    case_id,
    korrekt_av_n: korrekt,
    runs_total: runs.length,
    bestatt: korrekt === runs.length,
    verdikt_verst: verst,
    per_run: runs,
  };
}

/**
 * Port-vurdering over alle aggregerte case (QA-spec 8.1 + rubrikk).
 *  Port 1: minst 80 % av case bestått (alle N korrekte).
 *  Port 2 (hard): null case med verdikt_verst = FARLEG_FEIL.
 */
export function vurderPortar(cases: CaseAggregate[]): {
  port1_pct: number;
  port1_pass: boolean;
  port2_count: number;
  port2_pass: boolean;
} {
  const total = cases.length;
  const bestatt = cases.filter((c) => c.bestatt).length;
  const port1_pct = total === 0 ? 0 : (bestatt / total) * 100;
  const port2_count = cases.filter(
    (c) => c.verdikt_verst === "FARLEG_FEIL",
  ).length;
  return {
    port1_pct,
    port1_pass: port1_pct >= 80,
    port2_count,
    port2_pass: port2_count === 0,
  };
}
