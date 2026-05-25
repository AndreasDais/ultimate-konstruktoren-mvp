import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(root, p), s, 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

function patchFile(p, fn) {
  if (!exists(p)) {
    console.log(`SKIP ${p} (not found)`);
    return;
  }
  const before = read(p);
  const after = fn(before);
  if (after !== before) {
    write(p, after);
    console.log(`PATCHED ${p}`);
  } else {
    console.log(`OK ${p}`);
  }
}

function insertBefore(s, marker, block) {
  if (s.includes(block.trim().split('\n')[0])) return s;
  if (!s.includes(marker)) return s;
  return s.replace(marker, `${block}\n${marker}`);
}

// ---------------------------------------------------------------------------
// 1) lib/international/display.ts — central English label/prose polish
// ---------------------------------------------------------------------------
patchFile('lib/international/display.ts', (s) => {
  const sprint337LabelBlock = `export const SPRINT337_ENGLISH_LABEL_BY_KEY: Record<string, string> = {
  // Workbench / phase headers
  workbenchEyebrow: "New calculation",
  workbenchTitle: "Describe the task",
  workbenchDescription: "Enter the request. PILAR reads it and shows the interpretation here — you can edit and re-interpret before starting the calculation.",
  calculatingEyebrow: "Step · calculating",
  calculatingTitle: "Two independent engineers solve the same problem",
  calculatingDescription: "Engineer A and Engineer B use independent methods. The Comparator checks agreement before the result is presented.",
  resultEyebrow: "Step 3 of 3 · Result",
  resultTitle: "Calculation note",
  resultDescription: "Preliminary result with agent control. Must be checked by a qualified professional before use.",

  // Result page labels
  kontrollorAvgjerd: "Controller — final decision",
  kontrollor: "Controller",
  kontrollorPopover1: "The Controller agent reads both engineers and the Comparator, then decides whether the result is safe enough to show. It does",
  kontrollorPopover2: "not",
  kontrollorPopover3: "replace professional review.",
  sluttkonklusjonUtelaten: "Final conclusion omitted by the Controller.",
  hallusinasjonarTekst: "The Controller identified hallucinations in the engineers' short-form conclusion. See the Results field and full calculation below for correct values.",
  kortSvar: "Short answer",
  resultat: "Results",
  visMellomledd: "Show {n} intermediate values",
  skjulMellomledd: "Hide intermediate values",
  foresetnaderBrukt: "Assumptions used",
  stegvisUtrekning: "Step-by-step calculation",
  stegvisBerreFormel: "Formulas only",
  stegvisAlleSteg: "All steps",
  stegvisGaaTilSteg: "Go to step",
  kvaErIkkjeRekna: "What is not calculated",
  atvaringar: "Warnings",
  konstruktorA: "Engineer A",
  konstruktorB: "Engineer B",
  konstruktorAKonfidens: "Engineer A confidence",
  konstruktorBKonfidens: "Engineer B confidence",
  konstruktorKonfidens: "Engineer confidence",
  konstruktorKonfidensPopover: "The engineer's self-reported confidence in its own solution. This is not the same as the Trust Score — it only measures one agent's confidence in itself.",
  konfidensHighA: "Engineer A reports HIGH confidence: the method is established, the necessary input is present, and the result is internally consistent. Self-assessment — not an independent verification.",
  konfidensHighB: "Engineer B reports HIGH confidence on its independent solution. B solved the task without seeing A's answer. HIGH means B is confident in its own method — agreement between A and B is a separate check.",
  konfidensMediumA: "Engineer A reports MEDIUM confidence: the method is correct, but one or more inputs are assumed or extrapolated. Check the assumptions before relying on the result.",
  konfidensMediumB: "Engineer B reports MEDIUM confidence: B solved the task, but at least one assumption is uncertain. See the assumptions in the Engineer B block.",
  konfidensLowA: "Engineer A reports LOW confidence: significant uncertainty in method or input. The result should not be used without manual verification.",
  konfidensLowB: "Engineer B reports LOW confidence in its own solution. B is uncertain about the method or input. Manual professional review is strongly recommended.",
  konstruktorBUavhengig: "Engineer B — independent check",
  bUavhengigKontroll: "Engineer B — independent check",
  loysteOppgavaUtan: "Solved the task without seeing Engineer A's answer",
  konstruktorBKonklusjon: "Engineer B conclusion",
  konstruktorBResultat: "Engineer B results",
  verdiktMatch: "Engineer A and Engineer B fully agree on the governing values.",
  verdiktMinor: "Engineer A and Engineer B have minor differences — no critical deviations.",
  verdiktSignificant: "Engineer A and Engineer B have significant deviations in governing values.",
  verdiktCritical: "Engineer A and Engineer B disagree — manual review is required.",
  fagligMerknad: "Engineering note",
  fagligGruppeMetode: "Method",
  fagligGruppeAntakelser: "Assumptions & warnings",
  lesHeileVurderinga: "Read the full Controller assessment",
  skjulVurderinga: "Hide assessment",
  krevFagligGjennomgang: "Requires professional review",
  sjølvkontrollEtikett: "Self-check",
  sjølvkontrollIngen: "No inconsistencies found",
  sjølvkontrollFunne: "{n} inconsistency/inconsistencies found",
  sjølvkontrollSkjul: "Hide details",
  visningProfil: "View",
  profilTrygg: "Safe",
  profilStandard: "Standard",
  profilKrevGjennomgang: "Requires review",
  profilForklaringTrygg: "Agreement check passed, no warnings — the page shows a short main answer.",
  profilForklaringStandard: "Approved — details are collapsed; click to explore.",
  profilForklaringStandardMedAdvarsler: "Approved with warnings — details are collapsed; click to explore.",
  profilForklaringKrev: "Significant deviations — difference rows and notes are expanded by default.",
  bEnigeMedA: "AGREES WITH A",
  bMindreSkilnader: "Minor differences from A",
  bVesentlegAvvik: "Significant deviation from A",
  bKritiskUsemje: "Critical disagreement with A",
  bKonfidens: "confidence",
  bUtanComparison: "no comparison available",
  samanliknarSkilnader: "Comparator — differences found",
  numeriskeSkilnader: "Numerical differences",
  metodiskeSkilnader: "Methodological differences",
  forskjellarForesetnader: "Assumption differences",
  internInkonsistens: "Internal inconsistency",
  tabellFelt: "Field",
  tabellSkilnad: "Difference",
  tabellAlvor: "Severity",
  samanliknarKvifor: "Why:",
  samanliknarAVerdi: "Engineer A",
  samanliknarBVerdi: "Engineer B",
  generelleMerknader: "General notes from the Comparator",
  skjulMerknader: "Hide notes",
  resultatetForebels: "The result is preliminary and must be checked by a qualified professional.",
  tilbake: "← Back",
  generRapport: "Generate report →",

  // Mission Control
  doneToComparator: "Done — sending result to Comparator",
  cellKonklusjon: "CONCLUSION",
  toAvToEinige: "2 of 2 methods agree",
};
`;

  s = insertBefore(s, 'export function buildLocalizedLabelProxyForLanguage', sprint337LabelBlock);

  // Merge sprint-wide English defaults into both label proxy helpers.
  s = s.replace(
    /for \(const \[key, value\] of Object\.entries\(english\)\) \{/g,
    (match, offset) => {
      const prefix = s.slice(Math.max(0, offset - 180), offset);
      if (prefix.includes('mergedEnglish')) return match;
      return 'const mergedEnglish = { ...SPRINT337_ENGLISH_LABEL_BY_KEY, ...english };\n  for (const [key, value] of Object.entries(mergedEnglish)) {';
    },
  );

  const sprint337Polish = `export function sprint337PolishEnglishText(value: string): string {
  return String(value ?? "")
    .replace(/\bGOD\b/g, "GOOD")
    .replace(/\bGod\b/g, "Good")
    .replace(/\bGODKJENT\b/g, "APPROVED")
    .replace(/\bFORELØPIG GODKJENT\b/g, "PRELIMINARILY APPROVED")
    .replace(/\bMINDRE FORSKJELLER\b/g, "MINOR DIFFERENCES")
    .replace(/\bMindre forskjeller\b/g, "Minor differences")
    .replace(/\bEnige\b/g, "Agreement")
    .replace(/\bGodkjent\b/g, "Approved")
    .replace(/Beregningen er godkjent for visning\. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering\./gi, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/Berekninga er godkjend for visning\. Føreset manuell verifikasjon av ansvarleg fagperson før bruk i prosjektering\./gi, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/\bSTEG 3 AV 3 · RESULTAT\b/g, "STEP 3 OF 3 · RESULT")
    .replace(/\bBeregningsnotat\b/g, "Calculation note")
    .replace(/\bBerekningsnotat\b/g, "Calculation note")
    .replace(/Foreløpig resultat med agentkontroll\. Må kontrolleres av fagperson før bruk\./gi, "Preliminary result with agent control. Must be checked by a qualified professional before use.")
    .replace(/Førebels resultat med agentkontroll\. Må kontrollerast av fagperson før bruk\./gi, "Preliminary result with agent control. Must be checked by a qualified professional before use.")
    .replace(/\bKonstruktør A og Konstruktør B bruker same grunnleggjande metode\b/gi, "Engineer A and Engineer B use the same basic method")
    .replace(/\bKonstruktør A og Konstruktør B brukar same grunnleggjande metode\b/gi, "Engineer A and Engineer B use the same basic method")
    .replace(/\bKonstruktør B presenterer ein alternativ utrekningsrute\b/gi, "Engineer B presents an alternative calculation route")
    .replace(/\bKonstruktør B rapporterer eksplisitt lastfaktorane\b/gi, "Engineer B explicitly reports the load factors")
    .replace(/\bKonstruktør B rapporterer phi_b_Mn og phi_v_Vn eksplisitt\b/gi, "Engineer B explicitly reports phi_b_Mn and phi_v_Vn")
    .replace(/\bKonstruktør B rapporterer\b/gi, "Engineer B reports")
    .replace(/\bKonstruktør A rapporterer\b/gi, "Engineer A reports")
    .replace(/\bBegge konstruktørar nemner\b/gi, "Both engineers note")
    .replace(/\bBegge konstruktører nevner\b/gi, "Both engineers note")
    .replace(/\bBegge konstruktørar legg til grunn\b/gi, "Both engineers assume")
    .replace(/\bBegge konstruktører legger til grunn\b/gi, "Both engineers assume")
    .replace(/\bCb-antaginga er identisk\b/gi, "The Cb assumption is identical")
    .replace(/\bCb-antakelsen er identisk\b/gi, "The Cb assumption is identical")
    .replace(/\bIngen metodisk forskjell er identifisert\b/gi, "No methodological difference is identified")
    .replace(/\bIngen forskjell i sjølve antaginga\b/gi, "No difference in the assumption itself")
    .replace(/\bIngen forskjell\b/gi, "No difference")
    .replace(/\bDette er ei forskjell i presentasjonsform, ikkje i metode\b/gi, "This is a presentation difference, not a method difference")
    .replace(/\bDette er en forskjell i presentasjonsform, ikke i metode\b/gi, "This is a presentation difference, not a method difference")
    .replace(/\bmedan\b/gi, "while")
    .replace(/\bog\b/g, "and")
    .replace(/\beigne resultatfelt\b/gi, "separate result fields")
    .replace(/\beige results-felt\b/gi, "separate results field")
    .replace(/\bresultatfelt\b/gi, "result fields")
    .replace(/\bhovudformelen\b/gi, "the main formula")
    .replace(/\butrekningsrute\b/gi, "calculation route")
    .replace(/\bintern kryssjekk\b/gi, "internal cross-check")
    .replace(/\blastfaktorane\b/gi, "the load factors")
    .replace(/\beigenvekta\b/gi, "the self-weight")
    .replace(/\bjamnlasta enkeltfelt\b/gi, "uniformly loaded simply supported span")
    .replace(/\bskjærsenter\b/gi, "shear center")
    .replace(/\btyngdepunktet\b/gi, "the centroid")
    .replace(/\btopplastscenarioet\b/gi, "the top-flange loading scenario")
    .replace(/\bekstra risikofaktor\b/gi, "additional risk factor")
    .replace(/\bføresetnad\b/gi, "assumption")
    .replace(/\bføresetnader\b/gi, "assumptions")
    .replace(/\bantaginga\b/gi, "assumption")
    .replace(/\bantakinga\b/gi, "assumption")
    .replace(/\bforskjell\b/gi, "difference")
    .replace(/\bforskjeller\b/gi, "differences")
    .replace(/\bskilnad\b/gi, "difference")
    .replace(/\bskilnader\b/gi, "differences")
    .replace(/\blikeverdig\b/gi, "equivalent")
    .replace(/\bulik\b/gi, "different")
    .replace(/\bikkje\b/gi, "not")
    .replace(/\bikke\b/gi, "not")
    .replace(/\bsjølve\b/gi, "itself")
    .replace(/\bKONSTRUKTØR B SIN KONKLUSJON\b/g, "ENGINEER B CONCLUSION")
    .replace(/\bKONSTRUKTØR B SINE RESULTATER\b/g, "ENGINEER B RESULTS")
    .replace(/\bKONSTRUKTØR B SINE RESULTAT\b/g, "ENGINEER B RESULTS")
    .replace(/\bSammenligner — forskjeller funnet\b/gi, "Comparator — differences found")
    .replace(/\bSamanliknar — skilnader funne\b/gi, "Comparator — differences found")
    .replace(/\bFerdig — leverer resultat til Sammenligner\b/g, "Done — sending result to Comparator")
    .replace(/\bFerdig – Leverer resultat til Sammenligner\b/g, "Done — sending result to Comparator");
}
`;
  s = insertBefore(s, 'export function polishEnglishGeneratedText', sprint337Polish);
  s = s.replace(
    /export function polishEnglishGeneratedText\(value: string\): string \{[\s\S]*?\n\}/,
    `export function polishEnglishGeneratedText(value: string): string {
  return sprint337PolishEnglishText(sprint335PolishEnglishText(value));
}`,
  );

  // Strengthen AISC guard text without risking syntax errors.
  if (!s.includes('Do not provide numerical typical ranges for AISC Manual-derived values')) {
    s = s.replace(
      '  "- You may state qualitative risk, e.g. LTB may be critical when Lb is large, but do not compute final AISC capacity from unverified properties.",',
      '  "- You may state qualitative risk, e.g. LTB may be critical when Lb is large, but do not compute final AISC capacity from unverified properties.",\n  "- Do not provide numerical typical ranges for AISC Manual-derived values such as Lp/Lr/Cb unless the values are verified input or retrieved from an approved application data source.",',
    );
  }

  // Extend result-label map inside localizeResultLabel.
  if (!s.includes('const sprint337Known')) {
    s = s.replace(
      '  const compact = label.toLowerCase().replace(/[\\s_,.-]+/g, "");',
      `  const compact = label.toLowerCase().replace(/[\\s_,.-]+/g, "");
  const sprint337Known: Record<string, string> = {
    ltbrisk: "LTB risk",
    ltbriskflag: "LTB risk",
    ltb: "LTB risk",
    mu: "Mu",
    vu: "Vu",
    wu: "wu",
    wd: "Dead load, D",
    wl: "Live load, L",
    d: "Dead load, D",
    lload: "Live load, L",
    load: "Load",
    loadd: "Dead load factor",
    loadl: "Live load factor",
    loadfactor: "Load factor",
    gamma: "Load factor",
    γ: "Load factor",
    gamma1: "Load factor",
    gamma12: "Dead load factor",
    gamma16: "Live load factor",
    factor_d: "Dead load factor",
    factor_l: "Live load factor",
    phibmn: "φbMn",
    phivvn: "φvVn",
    phibmnlb: "φbMn(Lb)",
  };
  if (sprint337Known[compact]) return sprint337Known[compact];`,
    );
  }

  return s;
});

// ---------------------------------------------------------------------------
// 2) app/page.tsx — English phase header when international context is active
// ---------------------------------------------------------------------------
patchFile('app/page.tsx', (s) => {
  s = s.replace(
    'import { buildLocalizedLabelProxy } from "@/lib/international/display";',
    'import { buildLocalizedLabelProxy, displayLanguageForContext } from "@/lib/international/display";',
  );

  if (s.includes('const englishPhaseHeaders: Record<Phase')) return s;

  s = s.replace(
    '  const pageHeader = PHASE_HEADERS[locale][phase];',
    `  const pageDisplayLanguage = displayLanguageForContext(locale, engineeringContext);
  const englishPhaseHeaders: Record<Phase, { eyebrow: string; title: string; description: string }> = {
    workbench: {
      eyebrow: "NEW CALCULATION",
      title: "Describe the task",
      description: "Enter the request. PILAR reads it and shows the interpretation here — you can edit and interpret again before starting the calculation.",
    },
    calculating: {
      eyebrow: "STEP · CALCULATING",
      title: "Two independent engineers solve the same problem",
      description: "Engineer A and Engineer B use independent methods. The Comparator checks agreement before the result is presented.",
    },
    calculation_result: {
      eyebrow: "STEP 3 OF 3 · RESULT",
      title: "Calculation note",
      description: "Preliminary result with agent control. Must be checked by a qualified professional before use.",
    },
  };
  const pageHeader = pageDisplayLanguage === "en" ? englishPhaseHeaders[phase] : PHASE_HEADERS[locale][phase];`,
  );
  return s;
});

// ---------------------------------------------------------------------------
// 3) CalculationResultView — displayLanguage-aware result page and prose polish
// ---------------------------------------------------------------------------
patchFile('app/components/result/CalculationResultView.tsx', (s) => {
  s = s.replace(
    'import { buildLocalizedLabelProxy, polishEnglishGeneratedText, localizeResultLabel } from "@/lib/international/display";',
    'import { buildLocalizedLabelProxy, displayLanguageForContext, polishEnglishGeneratedText, localizeResultLabel } from "@/lib/international/display";',
  );

  if (!s.includes('const displayLanguage = displayLanguageForContext(locale, engineeringContext);')) {
    s = s.replace(
      '  const isBlocked = (key: string): boolean =>\n    !!controllerDecision?.blocked_outputs?.includes(key);',
      `  const isBlocked = (key: string): boolean =>
    !!controllerDecision?.blocked_outputs?.includes(key);

  const displayLanguage = displayLanguageForContext(locale, engineeringContext);
  const isEnglishResult = displayLanguage === "en";
  const uiText = (value: string | null | undefined): string =>
    isEnglishResult ? polishEnglishGeneratedText(String(value ?? "")) : String(value ?? "");`,
    );
  }

  // Turn raw controller chips into display-language-safe chips.
  s = s.replace(
    /const chips = buildKontrollorChips\(\n\s+comparison,\n\s+calculationA,\n\s+calculationB,\n\s+controllerDecision,\n\s+locale,\n\s+\);/,
    `const rawChips = buildKontrollorChips(
                  comparison,
                  calculationA,
                  calculationB,
                  controllerDecision,
                  locale,
                );
                const chips = isEnglishResult
                  ? rawChips.map((chip) => ({
                      ...chip,
                      text: uiText(chip.text),
                      body: chip.body ? uiText(chip.body) : chip.body,
                    }))
                  : rawChips;`,
  );

  s = s.replace(/polishEnglishGeneratedText\(/g, 'uiText(');

  // Status helpers in English mode.
  s = s.replace(
    /\{decisionStatusLabel\(controllerDecision\.decision_status, locale\)\}/g,
    '{uiText(decisionStatusLabel(controllerDecision.decision_status, locale))}',
  );
  s = s.replace(
    /\{matchStatusLabel\(comparison\.match_status, locale\)\}/g,
    '{uiText(matchStatusLabel(comparison.match_status, locale))}',
  );

  // Main controller verdict and generated prose.
  s = s.replace(/\{verdikt\}/g, '{uiText(verdikt)}');
  s = s.replace(
    '                              {controllerDecision.user_message\n                                .split(/(?<=[.!?])\\s+(?=[A-ZÆØÅ])/)'
      .replace(/\\n/g, '\n'),
    '                              {uiText(controllerDecision.user_message)\n                                .split(/(?<=[.!?])\\s+(?=[A-ZÆØÅ])/)'
      .replace(/\\n/g, '\n'),
  );

  // Generated summaries and conclusions.
  s = s.replace('{comparison.summary}', '{uiText(comparison.summary)}');
  s = s.replace('{calculationA.short_conclusion}', '{uiText(calculationA.short_conclusion)}');
  s = s.replace('{calculationB.short_conclusion}', '{uiText(calculationB.short_conclusion)}');

  // Method/assumption differences in disclosure list.
  s = s.replace('<span style={{ minWidth: 0 }}>{m}</span>', '<span style={{ minWidth: 0 }}>{uiText(m)}</span>');
  s = s.replace('<span style={{ minWidth: 0 }}>{a}</span>', '<span style={{ minWidth: 0 }}>{uiText(a)}</span>');

  // B summary badge labels from match-status-derived helper.
  s = s.replace('return WB_LABELS.bEnigeMedA[locale];', 'return uiText(WB_LABELS.bEnigeMedA[locale]);');
  s = s.replace('return WB_LABELS.bMindreSkilnader[locale];', 'return uiText(WB_LABELS.bMindreSkilnader[locale]);');
  s = s.replace('return WB_LABELS.bVesentlegAvvik[locale];', 'return uiText(WB_LABELS.bVesentlegAvvik[locale]);');
  s = s.replace('return WB_LABELS.bKritiskUsemje[locale];', 'return uiText(WB_LABELS.bKritiskUsemje[locale]);');
  s = s.replace('return WB_LABELS.bUtanComparison[locale];', 'return uiText(WB_LABELS.bUtanComparison[locale]);');

  return s;
});

// ---------------------------------------------------------------------------
// 4) MissionControl — finish line label to Comparator
// ---------------------------------------------------------------------------
patchFile('app/components/MissionControl.tsx', (s) => {
  if (!s.includes('doneToComparator:')) {
    s = s.replace(
      '  toAvToEinige: { nb: "2 av 2 metoder enige", nn: "2 av 2 metodar einige" },',
      '  toAvToEinige: { nb: "2 av 2 metoder enige", nn: "2 av 2 metodar einige" },\n  doneToComparator: { nb: "Ferdig — leverer resultat til Sammenligner", nn: "Ferdig — leverer resultat til Samanliknar" },',
    );
  }
  s = s.replace('Ferdig — leverer resultat til Sammenligner', '{L.doneToComparator[locale]}');
  s = s.replace('Ferdig – Leverer resultat til Sammenligner', '{L.doneToComparator[locale]}');
  return s;
});

// ---------------------------------------------------------------------------
// 5) tile-heuristics — clean common US/AISC result tile labels
// ---------------------------------------------------------------------------
patchFile('lib/result/tile-heuristics.ts', (s) => {
  if (!s.includes('M_u: { nb: "Mu", nn: "Mu" }')) {
    s = s.replace(
      'const KEY_TILE_LABELS: Record<string, Record<Locale, string>> = {',
      `const KEY_TILE_LABELS: Record<string, Record<Locale, string>> = {
  // AISC / US customary demand keys
  M_u: { nb: "Mu", nn: "Mu" },
  V_u: { nb: "Vu", nn: "Vu" },
  w_u: { nb: "wu", nn: "wu" },
  D: { nb: "D", nn: "D" },
  L_load: { nb: "L", nn: "L" },
  Lb: { nb: "Lb", nn: "Lb" },
  LTBrisk: { nb: "LTB · RISK", nn: "LTB · RISK" },
  LTB_risk: { nb: "LTB · RISK", nn: "LTB · RISK" },
  phi_b_Mn: { nb: "φbMn", nn: "φbMn" },
  phi_v_Vn: { nb: "φvVn", nn: "φvVn" },`,
    );
  }
  return s;
});

// ---------------------------------------------------------------------------
// 6) Agent prompts: comparator/controller/reporter English-only in international mode
// ---------------------------------------------------------------------------
patchFile('lib/engineering-context/agent.ts', (s) => {
  if (!s.includes('This instruction overrides any Norwegian role-name wording')) {
    s = s.replace(
      '        "- Do not use Norwegian labels such as Konstruktør, Samanliknar/Sammenligner, Kontrollør, beregningsnotat, fagperson in English output.",',
      '        "- Do not use Norwegian labels such as Konstruktør, Samanliknar/Sammenligner, Kontrollør, beregningsnotat, fagperson in English output.",\n        "- This instruction overrides any Norwegian role-name wording in the base prompt or upstream agent output.",\n        "- If upstream text contains Norwegian/Nynorsk comparator prose, translate it to English before emitting user-facing JSON fields.",',
    );
  }
  return s;
});

patchFile('app/api/agent-c/route.ts', (s) => {
  if (!s.includes('isInternationalEnglishContext')) {
    s = s.replace(
      'import { buildAgentSystemPrompt, engineeringContextUserMessageBlock, parseEngineeringContextPayload } from "@/lib/engineering-context/agent";',
      'import { buildAgentSystemPrompt, engineeringContextUserMessageBlock, parseEngineeringContextPayload } from "@/lib/engineering-context/agent";\nimport { isInternationalEnglishContext } from "@/lib/international/display";',
    );
  }

  if (!s.includes('function buildEnglishComparisonBlock')) {
    s = s.replace(
      'function buildComparisonBlock(cmp: ResultComparison): string {',
      `function buildEnglishComparisonBlock(cmp: ResultComparison): string {
  const lines: string[] = [
    "DETERMINISTIC NUMERICAL COMPARISON (computed in code — authoritative; do not recalculate):",
  ];
  if (cmp.paired.length > 0) {
    lines.push("Paired keys reported by BOTH engineers:");
    for (const p of cmp.paired) {
      const pd =
        p.percentDiff === null
          ? "non-numeric"
          : \`\${(Math.round(p.percentDiff * 10) / 10).toFixed(1)} %\`;
      lines.push(\`  \${p.key}: A = \${p.aValue} / B = \${p.bValue} -> \${pd}\`);
    }
  } else {
    lines.push("Paired keys: none.");
  }
  lines.push(
    cmp.onlyA.length > 0
      ? \`Keys reported ONLY by Engineer A: \${cmp.onlyA.join(", ")}\`
      : "Keys reported only by Engineer A: none.",
  );
  lines.push(
    cmp.onlyB.length > 0
      ? \`Keys reported ONLY by Engineer B: \${cmp.onlyB.join(", ")}\`
      : "Keys reported only by Engineer B: none.",
  );
  return lines.join("\\n") + "\\n";
}

function buildComparisonBlock(cmp: ResultComparison): string {`,
    );
  }

  if (!s.includes('const comparatorEnglishMode = isInternationalEnglishContext(engineeringContext);')) {
    s = s.replace(
      '    const engineeringContext = parseEngineeringContextPayload(engineering_context);',
      '    const engineeringContext = parseEngineeringContextPayload(engineering_context);\n    const comparatorEnglishMode = isInternationalEnglishContext(engineeringContext);',
    );
  }

  s = s.replace(
    '    const comparisonBlock = buildComparisonBlock(comparison);',
    '    const comparisonBlock = comparatorEnglishMode ? buildEnglishComparisonBlock(comparison) : buildComparisonBlock(comparison);',
  );

  s = s.replace(
    /const userMessage = `\$\{engineeringContextUserMessageBlock\(engineeringContext\)\}KONSTRUKTØR A SITT SVAR:\n\$\{JSON\.stringify\(agent_a_output, null, 2\)\}\n\nKONSTRUKTØR B SITT SVAR:\n\$\{JSON\.stringify\(agent_b_output, null, 2\)\}\n\n\$\{comparisonBlock\}\nSamanlikne desse to løysingane systematisk i samsvar med systeminstruksen\. Sjekk også intern konsistens i kvar konstruktør\. Hugs at i alle prosa-felt \(method_differences, assumption_differences, summary, likely_cause\) skal dei to løysingane omtalast som "Konstruktør A" og "Konstruktør B" — aldri "Agent A\/B"\.`;/,
    `const userMessage = comparatorEnglishMode
      ? \`\${engineeringContextUserMessageBlock(engineeringContext)}ENGINEER A OUTPUT:
\${JSON.stringify(agent_a_output, null, 2)}

ENGINEER B OUTPUT:
\${JSON.stringify(agent_b_output, null, 2)}

\${comparisonBlock}
Compare these two solutions systematically according to the system instruction. Also check internal consistency in each engineer. In every user-facing prose field (method_differences, assumption_differences, summary, likely_cause), use English only and refer to the two solutions as "Engineer A" and "Engineer B" — never "Konstruktør", "Samanliknar", "Sammenligner", or "Agent A/B".\`
      : \`\${engineeringContextUserMessageBlock(engineeringContext)}KONSTRUKTØR A SITT SVAR:
\${JSON.stringify(agent_a_output, null, 2)}

KONSTRUKTØR B SITT SVAR:
\${JSON.stringify(agent_b_output, null, 2)}

\${comparisonBlock}
Samanlikne desse to løysingane systematisk i samsvar med systeminstruksen. Sjekk også intern konsistens i kvar konstruktør. Hugs at i alle prosa-felt (method_differences, assumption_differences, summary, likely_cause) skal dei to løysingane omtalast som "Konstruktør A" og "Konstruktør B" — aldri "Agent A/B".\`;`,
  );

  return s;
});

console.log('Sprint 33.7 result view + comparator language cleanup applied. Run: npx tsc --noEmit --pretty false');
