/**
 * Lag 2 — kode-tvungen verdikt-grense for Controller (agent_d).
 *
 * Ein prompt-instruks er ikkje tvingande; dette er. Finst eit hardt
 * blokkeringsvilkår — NA-avvik, Tolkar-motstrid, eller kombinasjonsstruktur-
 * avvik — kan resultatet ALDRI vere approved / approved_with_warnings,
 * uansett kva LLM-Controlleren konkluderte. Fangar A2-klassen (F11): eit
 * gale svar presentert som godkjent.
 *
 * Trekt ut av app/api/agent-d/route.ts so itself Port-2-grensa kan unit-
 * testast. Funksjonen er rein: han muterer ikkje input og loggar ikkje.
 * Kallaren (route-en) loggar når `clamped` er sann.
 */

/**
 * Controller-avgjerda slik ho kjem frå LLM-en (JSON.parse-resultat).
 * Berre felta clampen rører er typa; resten passerer uendra via
 * index-signaturen.
 */
export type ControllerDecision = {
    decision_status?: unknown;
    risk_level?: unknown;
    manual_review_required?: unknown;
    controller_notes?: unknown;
    [key: string]: unknown;
  };
  
  /** Tal på funn frå dei tre deterministiske forhåndskontrollane. */
  export type HardBlockCounts = {
    /** NA-avvik — feil nasjonalt bestemt verdi (checkNaDeviations). */
    naDeviations: number;
    /** Motstrid flagga av Tolkar (input_review.motstrid). */
    motstrid: number;
    /** Kombinasjonsstruktur-avvik (checkLoadCombination / FIKS 2 + 12). */
    loadCombo: number;
  };
  
  export type HardBlockOutcome = {
    /**
     * Avgjerda etter porten. Ved overstyring ein ny, overstyrt kopi;
     * elles same objekt-referanse som input.
     */
    decision: ControllerDecision;
    /** Sann når porten overstyrte ei approving avgjerd. */
    clamped: boolean;
    /** decision_status før overstyring — only sett når `clamped`. */
    original: string | null;
  };
  
  /** approved / approved_with_warnings er dei einaste "approving" statusane. */
  function isApprovingStatus(status: unknown): boolean {
    return status === "approved" || status === "approved_with_warnings";
  }
  
  /**
   * Bruker den kode-tvungne verdikt-grensa på ei Controller-avgjerd.
   *
   * Finst eit hardt blokkeringsvilkår OG avgjerda er approving, blir ho
   * overstyrt til `uncertain` med `manual_review_required = true`. Elles
   * passerer avgjerda uendra.
   */
  export function applyControllerHardBlock(
    decision: ControllerDecision,
    counts: HardBlockCounts,
  ): HardBlockOutcome {
    const hardBlock =
      counts.naDeviations > 0 || counts.motstrid > 0 || counts.loadCombo > 0;
  
    if (!hardBlock || !isApprovingStatus(decision.decision_status)) {
      return { decision, clamped: false, original: null };
    }
  
    const original = decision.decision_status as string;
  
    const clamped: ControllerDecision = {
      ...decision,
      decision_status: "uncertain",
      manual_review_required: true,
      // Berre lyft low -> medium; medium/high blir verande.
      risk_level:
        decision.risk_level === "low" ? "medium" : decision.risk_level,
      controller_notes:
        `[KODE-OVERSTYRING] decision_status sett frå "${original}" til ` +
        `"uncertain": deterministisk forhåndskontroll fann ` +
        `${counts.naDeviations} NA-avvik, ${counts.motstrid} motstrid og ` +
        `${counts.loadCombo} kombinasjonsstruktur-avvik. ` +
        `Approved er ikkje tillate her. Opphavleg Controller-grunngiving: ` +
        `${decision.controller_notes ?? "(ingen)"}`,
    };
  
    return { decision: clamped, clamped: true, original };
  }