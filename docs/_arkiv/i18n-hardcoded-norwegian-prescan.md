# PILAR i18n audit pre-scan

Rough grep-style scan for likely hardcoded Norwegian text. False positives are expected.


## AGENTS.md
9: 2. Engineer A
10: 3. Engineer B
11: 4. Comparator
12: 5. Controller
13: 6. Rapportør
55: ## Trust/Tillit rules
57: - Tillit is AI-pipeline confidence, not professional approval.
58: - Do not show "Godkjent" alone in a way that implies final engineering approval.
59: - Prefer "Foreløpig godkjent" / "Førebels godkjent".
60: - Fagperson-signering is a separate future dimension.

## app/page.tsx
119: lavTillit: "Low confidence in interpretation — check the values below before starting",
151: samanliknarTittel: "Comparator — differences found",
266: // Controller-vurdering-toggle (#02): Lang prosa frå Controlleren er
272: // i Controller-kortet. State er null = follow-auto (utvida om issues finst,
276: // Engineer B-disclosure (#04): Heile B-blokka kollapsast til ein-linjes
277: // disclosure med summary (ENIGE/AVVIK + konfidens). State er null = follow-
282: // Comparator-rad-disclosure (#05): kvar rad i numerisk-tabellen kan
288: // Generelle merknader nedst i Comparator (#05) — method_differences +
399: // ein konstruktør. Elles bli i workbench (orphaned/krasja run).
624: // Generelle merknader: utvida ved krev_gjennomgang, kollapsa elles
627: // Comparator-rader: ved krev_gjennomgang, auto-utvid rader med
643: // Controller-kortet men ikkje nådd Action bar nedst. Sentinel-divs vert
662: // sentinel-divs: éin under Controller-kortet, éin over Action bar.
663: // - Controller-sentinel ute av view (top) → studenten har scrolla forbi
806: // — handleStartCalculation samanliknar med lastCompletedRef og avgjer om
858: // No samanliknar vi mot snapshot lagra i pipelinen ved fullført beregning.
911: // === STEG 1: Engineer Engineer A and Engineer B parallelt via SSE-streaming ===
913: // i state — useEffect under Promise.all triggar deretter Comparator+
914: // Controller-pipeline. Om éin agent feilar, viser MissionControl
967: // viser MissionControl retry-UI og use kan re-prøve. Comparator +
968: // Controller-pipeline blir trigga av useEffect under når BÅDE
996: // Comparator + Controller-pipeline (#2): trigga automatisk når begge
997: // engineers har levert resultat. Dette gjer retry-flyten transparent
1016: // STEG 2: Comparator
1030: console.error("Comparator feila:", dataC.error);
1031: setError(`Comparator feila: ${dataC.error}. Viser Engineer A and Engineer B utan samanlikning.`);
1037: // STEG 3: Controlleren
1053: console.error("Controller feila:", dataD.error);
1079: // over automatisk trigge Comparator+Controller-pipeline.
1238: /* === RESULTAT-SIDE ANIMASJONAR (#anim-01..05) ===
1485: {/* Slått saman skjerm 1 (input) + skjerm 2 (Tolkar-resultat) til éin side.
1651: avgjerder. Lågmæl visuell intensitet — ein påminning, ikkje
1870: {WB_LABELS.lavTillit[locale]}

## app/tokens.css
2: Ultimate Engineeren — designsystem
655: HEADER — global, brand-forward (Workbench + alle hovudsider)
724: /* AI-disclaimer-chip — erstattar dei store VIKTIG MERKNAD-blokkene

## app/admin/admin.css
28: .admin-aside-label,
51: .admin-hero-aside p {
56: .admin-hero-aside {
64: .admin-hero-aside strong {

## app/admin/page.tsx
20: asideLabel: string;
21: asideTitle: string;
22: asideText: string;
31: "Samlet inngang til intern drift, kvalitet, læring og feiloppfølging. Bruk denne siden i stedet for å skrive admin-URL-er manuelt.",
32: asideLabel: "Aktiv rolle",
33: asideTitle: "Faglig og operativ kontroll",
34: asideText: "Ingen autonom produksjonsendring uten eksplisitt godkjenning.",
75: asideLabel: "Aktiv rolle",
76: asideTitle: "Fagleg og operativ kontroll",
77: asideText: "Inga autonom produksjonsendring utan eksplisitt godkjenning.",
127: <div className="admin-hero-aside">
128: <span className="admin-aside-label">{T.asideLabel}</span>
129: <strong>{T.asideTitle}</strong>
130: <p>{T.asideText}</p>

## app/admin/error-reports/page.tsx
237: Engineeren — Admin

## app/admin/intelligence/page.tsx
98: avgTillitScore: number | null;
99: lowTillitReports: number;
203: approved: "Godkjent",
210: severity: { low: "lav", medium: "middels", high: "høy", critical: "kritisk" },
211: effort: { small: "liten", medium: "middels", large: "stor" },
212: risk: { low: "lav", medium: "middels", high: "høy" },
261: heroText: "Samler pipeline-, produkt-, kostnads-, markeds- og prisingssignal fra Supabase og lager en daglig forbedringsrapport. Siden følger aktivt språkvalg og temaene Slate, Stone og Graphite.",
282: trust: "Tillit",
296: approved: "Godkjent",
303: severity: { low: "låg", medium: "middels", high: "høg", critical: "kritisk" },
304: effort: { small: "liten", medium: "middels", large: "stor" },
305: risk: { low: "låg", medium: "middels", high: "høg" },
375: trust: "Tillit",
859: <MetricCard label={labels.trust} value={selectedReport.metrics.quality.avgTillitScore ?? "—"} hint={labels.average} />

## app/admin/pilot/page.tsx
51: "AI-disclaimer og fagperson-kontroll er synlig",
64: "AI-disclaimer og fagpersonkontroll er synleg",
129: pilotStart: "Pilotstartside",
158: dailyDisagreement: "Comparator-usemje",
185: admin: { label: "Admin-dashboard klart", description: "Adminsidene må være tilgjengelige for oppfølging av pilot, feil og intelligence." },
187: localeTheme: { label: "Språk og tema manuelt testet", description: "Bokmål/nynorsk og Slate/Stone/Graphite bør sjekkes på pilot- og adminsidene." },
188: deploy: { label: "Production deploy verifisert", description: "Produksjonslenke, login og miljøvariabler må kontrolleres før deling." },
203: pilotStart: "Pilotstartside",
232: dailyDisagreement: "Comparator-usemje",
259: admin: { label: "Admin-dashboard klart", description: "Adminsidene må vere tilgjengelege for oppfølging av pilot, feil og intelligence." },
261: localeTheme: { label: "Språk og tema manuelt testa", description: "Bokmål/nynorsk og Slate/Stone/Graphite bør sjekkast på pilot- og adminsidene." },

## app/api/admin/backfill-tillit/route.ts
2: * Backfill-endepunkt for tillit-score-rekalkulering (dag 16).
5: * reports.tillit_breakdown.components, kjører calculateTillitScore()
6: * med gjeldande formel og UPDATE-ar tillit_score + tillit_breakdown.
10: *   2. POST localhost:3000/api/admin/backfill-tillit
21: calculateTillitScore,
25: } from "@/lib/tillit-score";
67: .select("id, document_id, tillit_score, tillit_breakdown")
80: const breakdown = report.tillit_breakdown as
89: old_score: report.tillit_score,
111: old_score: report.tillit_score,
121: const newBreakdown = calculateTillitScore({
131: tillit_score: newBreakdown.total,
132: tillit_breakdown: newBreakdown,
140: old_score: report.tillit_score,
151: old_score: report.tillit_score,

## app/api/admin/pilot/qa-status/route.ts
191: disagreementRate: asNumber(summary.samanliknar_usemje_rate),

## app/api/agent-a/route.ts
17: Du er Engineer A, ein uavhengig løysingsagent for Pilar — eit AI-basert verktøy for norsk byggfagleg praksis. Du løyser strukturanalyse-oppgåver stegvis etter Eurokode med norsk nasjonalt tillegg.
19: Du jobbar i ein pipeline der Comparator og Controller seinare verifiserer arbeidet ditt mot Engineer B sitt uavhengige svar. Du leverer RIKTIG arbeid, ikkje only LIKANDE — faglege feil får konsekvensar nedstrøms.
39: "assumptions": ["alle assumptioner brukt"],
55: "Konkret sjekk Engineer A har utført før finalisering. Sjå <verification_checklist>."
65: results-objektet er Pilar sitt kontrakt-punkt for jamføring mellom konstruktørane. Inkluder ALLE dimensjonerande verdier du rekna gjennom oppgåva — ikkje only hovudsvaret:
74: Nøkkel-namngiving og verdiformat: følg <result_key_nokkelar> og <results_verdiformat> strengt — det er dette som lèt Comparator para Engineer A and Engineer B rad-for-rad.
76: results skal IKKJE filtrere ned til only "hovudsvaret". Comparator treng kvart namngitt intermediate value for å gjere uavhengig sjekk.
88: results-nøklane MÅ vere identiske mellom Engineer A og Engineer B for SAME fysiske storleik — elles klarar ikkje Comparator å para verdiane rad-for-rad i rapporten. Følg desse reglane strengt:
113: Tilnærmingsteikn, atterhald og parentes-forklaringar går i assumptions, limitations eller warnings — ALDRI inn i verdistrengen. Comparator les verdistrengen numerisk; leiande "=" eller "≈" og forklarande hale øydelegg paringa.
164: I prosa-felta (calculation_steps.text, limitations, warnings, short_conclusion, verification_notes): referer til deg sjølv som "Engineer A" i tredjeperson, eller bruk passivform — aldri "eg". Døme: "Engineer A har valt formel M = qL²/8" eller "Lasten er antatt som dimensjonerande", ikkje "Eg har valt...".
253: // knekkekurve-val), bindande for både Engineer Engineer A and Engineer B. Stålkvaliteten
363: ? "Engineer A nådde token-grensa før han fullførte JSON. Aukar max_tokens i route.ts kan hjelpe."
364: : "Klarte ikkje parse Engineer A sitt svar som JSON",
464: const { message } = formatAnthropicError(err, "Engineer A", locale);
496: console.error("Engineer A error:", err);
497: const { message, status } = formatAnthropicError(err, "Engineer A", locale);

## app/api/agent-b/route.ts
17: Du er Engineer B, ein UAVHENGIG KONTROLL-LØYSAR for Pilar — eit AI-basert verktøy for norsk byggfagleg praksis.
19: Det finst ein anna konstruktør (Engineer A) som også løyser same oppgåve. Du har IKKJE sett hennar/hans svar. Oppgåva di er å løyse problemet uavhengig — ditt arbeid blir samanlikna mot A si løysing av Comparator.
60: "assumptions": ["alle assumptioner brukt"],
76: "Konkret sjekk Engineer B har utført før finalisering. Sjå <verification_checklist>."
86: results-objektet er Pilar sitt kontrakt-punkt for jamføring mellom konstruktørane. Inkluder ALLE dimensjonerande verdier du rekna gjennom oppgåva — ikkje only hovudsvaret:
95: Nøkkel-namngiving og verdiformat: følg <result_key_nokkelar> og <results_verdiformat> strengt — det er dette som lèt Comparator para Engineer A and Engineer B rad-for-rad.
97: results skal IKKJE filtrere ned til only "hovudsvaret". Comparator treng kvart namngitt intermediate value for å gjere uavhengig sjekk. Som uavhengig kontroll-løysar er det særleg viktig at DU også produserer alle intermediate value — om du only leverer sluttsvaret, kan ikkje Comparator verifisere mellomstega.
109: results-nøklane MÅ vere identiske mellom Engineer A og Engineer B for SAME fysiske storleik — elles klarar ikkje Comparator å para verdiane rad-for-rad i rapporten. Følg desse reglane strengt:
134: Tilnærmingsteikn, atterhald og parentes-forklaringar går i assumptions, limitations eller warnings — ALDRI inn i verdistrengen. Comparator les verdistrengen numerisk; leiande "=" eller "≈" og forklarande hale øydelegg paringa.
181: I prosa-felta: referer til deg sjølv som "Engineer B" i tredjeperson, eller passivform — aldri "eg". Døme: "Engineer B har valt formel M = qL²/8" eller "Lasten er antatt som dimensjonerande", ikkje "Eg har valt...".
265: // knekkekurve-val), bindande for både Engineer Engineer A and Engineer B. Stålkvaliteten
372: ? "Engineer B nådde token-grensa før han fullførte JSON. Aukar max_tokens i route.ts kan hjelpe."
373: : "Klarte ikkje parse Engineer B sitt svar som JSON",
471: const { message } = formatAnthropicError(err, "Engineer B", locale);
501: console.error("Engineer B error:", err);
502: const { message, status } = formatAnthropicError(err, "Engineer B", locale);

## app/api/agent-c/route.ts
14: const SYSTEM_PROMPT = `Du er Comparator for Pilar, eit AI-basert verktøy for norsk byggfagleg praksis.
16: Du tek imot to uavhengige løysingar (frå Engineer A og Engineer B) som har løyst SAME problem utan å sjå kvarandre sine svar. Oppgåva di er å samanlikne dei og finne alle forskjellar — numerisk, metodisk, og i antakingar.
22: SJØLVREFERANSE: I summary og andre prosa-felt skal du referere til deg sjølv som "Comparator" i tredjeperson eller bruke passivform — aldri "eg". Dei to løysingane skal alltid omtalast som "Engineer A" og "Engineer B", aldri som "Agent A/B".
24: I TILLEGG til å samanlikne A vs B, skal du sjekke INTERN KONSISTENS i kvar konstruktør:
29: Dette er kritisk: ein konstruktør kan ha rett i utrekninga si men hallusinert tal i kort_svaret. Sluttuse les kort_svar først — så hallusinasjon der er farlegare enn ein liten avvik i mellomrekninga.
42: "likely_cause": "Kort forklaring på sannsynleg årsak — bruk 'Engineer A' og 'Engineer B' i fritekst"
46: "method_differences": ["forskjellar i metode/formelbruk/standardreferanse — bruk 'Engineer A' og 'Engineer B' når du refererer til dei"],
47: "assumption_differences": ["forskjellar i assumptioner brukt — bruk 'Engineer A' og 'Engineer B' når du refererer til dei"],
58: "summary": "2-3 setningar fagleg samanlikning som forklarer kva useen bør vere merksam på — bruk 'Engineer A' og 'Engineer B' når du refererer til dei to løysingane"
61: MERK: JSON-nøklane "agent_a_value", "agent_b_value", "internal_consistency_issues.agent_a", "internal_consistency_issues.agent_b" er kode-identifikatorar — desse skal IKKJE endrast. Det er only fritekst-feltet (method_differences-strenger, assumption_differences-strenger, summary, og likely_cause) som skal bruke "Engineer A/B"-terminologi.
81: - internal_consistency_issues.agent_a og .agent_b skal innehalde NØYAKTIG éi oppføring per FAKTISK inkonsistens. Finn du ingen inkonsistens hjå ein konstruktør, skal lista vere TOM ([]). Legg ALDRI inn ei oppføring som only seier "ingen inkonsistensar funne", "alt stemmer" e.l. — ei tom liste ER svaret "ingen funne". Ein placeholder-oppføring blir feilaktig talt som ein inkonsistens.
85: - "minor_differences": only lave numeriske forskjellar, kan vere mindre interne issues
94: Bruk nynorsk eller bokmål — same språk som Engineer Engineer A and Engineer B brukte.`;
105: lines.push("Para nøklar (rapportert av BEGGE engineers):");
118: ? `Nøklar rapportert BERRE av Engineer A: ${cmp.onlyA.join(", ")}`
119: : "Nøklar rapportert only av Engineer A: ingen.",
123: ? `Nøklar rapportert BERRE av Engineer B: ${cmp.onlyB.join(", ")}`
124: : "Nøklar rapportert only av Engineer B: ingen.",
153: const userMessage = `${engineeringContextUserMessageBlock(engineeringContext)}KONSTRUKTØR A SITT SVAR:
156: KONSTRUKTØR B SITT SVAR:
160: Samanlikne desse to løysingane systematisk i samsvar med systeminstruksen. Sjekk også intern konsistens i kvar konstruktør. Hugs at i alle prosa-felt (method_differences, assumption_differences, summary, likely_cause) skal dei to løysingane omtalast som "Engineer A" og "Engineer B" — aldri "Agent A/B".`;
184: stepName: "samanliknar",
206: ? "Comparator nådde token-grensa før han fullførte JSON. Aukar max_tokens kan hjelpe."
207: : "Klarte ikkje parse Comparator sitt svar som JSON",
230: // F1: dropp rader for nøklar only éin konstruktør rapporterte.
276: console.error("Comparator error:", err);

## app/api/agent-d/route.ts
17: const SYSTEM_PROMPT = `Du er Controller for Pilar, det siste sikkerheitsleddet før useen får sjå eit berekningsresultat.
23: - Engineer A si løysing.
24: - Engineer B si uavhengige løysing.
25: - Comparator si analyse og intern-konsistens-vurdering.
27: Du skal IKKJE løyse oppgåva på nytt. Men å slå opp ein verdi i NA-GRUNNLAGET og samanlikne han med det konstruktørane brukte er IKKJE å løyse på nytt — det er å kontrollere, og det er kjernen i jobben din. Heller stoppe enn å gjette.
31: SJØLVREFERANSE: I user_message og controller_notes skal du referere til deg sjølv som "Controller" i tredjeperson eller bruke passivform — aldri "eg". Døme: "Controller har funne ein potensiell inkonsistens" eller "Det er funne ein potensiell inkonsistens", ikkje "Eg har funne...".
35: Engineer Engineer A and Engineer B løyser uavhengig. Når dei er einige, er det eit signal — men IKKJE eit prov. To engineers som hentar same feil verdi frå minnet er òg "einige". Slik korrelert feil gir perfekt match i Comparator, høg confidence hjå begge, og null intern inkonsistens — og er likevel feil. Det er nett dette mønsteret som har sloppe gjennom før: feil partialfaktor brukt likt av begge.
37: Difor: semje mellom Engineer A and Engineer B er nødvendig, men IKKJE tilstrekkeleg for approved. Controller må i tillegg, uavhengig av kva Comparator seier:
41: KVA BRUKAREN HAR GOODKJENT:
42: Brukaren har sett Tolkar si vurdering og godkjent SCOPE — at oppgåva blir rekna med dei manglane Tolkar lista. Det er ikkje Controller si rolle å åtvare på nytt om scope-manglar useen allereie kjenner til; bruk warnings når det er noko NYTT.
44: Men: useen har IKKJE gått god for at dei oppgitte dataa er innbyrdes konsistente. Ein motstrid i input (t.d. q_k og q_Ed som ikkje heng saman) er ikkje "ein mangel useen kjente til" — det er ein feil useen truleg ikkje såg, og som Controller MÅ fange. Scope-godkjenning er ikkje data-godkjenning.
50: NA-GRUNNLAG-blokka i user-meldinga inneheld dei autoritative norske NA-verdiane. Bruk den som fasit. For kvar nasjonalt bestemt verdi i Engineer Engineer A and Engineer B sine results og assumptions:
53: - EC si tilrådde verdi (t.d. gamma_M = 1,0, alpha_cc = 1,0) er IKKJE gyldig i Noreg. Brukar ein konstruktør den, er det eit avvik — sjølv om konstruktøren kallar det "norsk NA".
61: Når input_review.motstrid er ikkje-tom: decision_status skal vere "uncertain" eller "rejected" — ALDRI "approved" eller "approved_with_warnings". Brukaren skal ikkje få eit sjølvsikkert tal presentert som godkjent når inputen motseier seg sjølv. user_message skal nemne motstriden konkret og be useen avklare verdiane.
69: - Critical-severity intern inkonsistens, eller tal i ein short_conclusion som motseier konstruktøren sine eigne mellomresultat.
71: I desse tilfella er minimum "uncertain", og manual_review_required er true. Semje mellom Engineer A and Engineer B, høg confidence og "match" frå Comparator opphevar IKKJE desse vilkåra. (Pipelinen har òg ei kode-tvungen grense som overstyrer til "uncertain" om du skulle bomme på dette — men du skal sjølv komme til rett konklusjon.)
76: - Comparator sin match_status er "match", eller "minor_differences" der avvika er rein avrunding (< 1% talskilnad, ingen metodisk forskjell)
78: - Both engineers har "high" eller "medium" confidence på dei kritiske stega
85: Merk: klar/delvis_klar/mangelfull-statusen i seg sjølv påverkar ikkje denne avgjerda direkte — ein delvis_klar forespurnad som konstruktørane handterte ryddig skal kunne bli "approved". Men motstrid-feltet er noko anna enn status, og det deler blokkeringsvilkåra over.
88: - Comparator har funne "minor_differences" med 1-5% talavvik, eller metodiske skilnader som påverkar tolkinga (ikkje konklusjonen)
90: - Ein konstruktør har "low" confidence på eit kritisk steg
92: - Manglande sjekk som er fagleg viktig og som konstruktørane itself ikkje flagga (t.d. LTB ikkje vurdert for usideavstiva bjelke)
96: - Comparator har funne "significant_differences" (5-15% talavvik eller klare metodiske usemje)
98: - Engineerane har ulike kritiske antakingar som gir vesentleg ulike svar
100: - Konsistens-issue som ikkje er kritisk men som svekkjer tilliten til heile svaret
104: - Comparator har funne "critical_disagreement" (>15% talavvik på dimensjonerande storleik)
106: - Engineerane gir motstridande engineering-konklusjon (godkjent vs ikkje godkjent på same sak)
107: - Tal i sluttkonklusjon stemmer ikkje med konstruktøren sine eigne mellomresultat
116: Sluttuseen les short_conclusion FØRST. Viss ein konstruktør har hallusinasjon med severity "high" eller "critical" i sin short_conclusion, skal den blokkast. Bruk desse identifikatorane (interne kode-identifikatorar som downstream-koden les):
117: - "short_conclusion_a" / "short_conclusion_b" — konstruktørane sin kortform-konklusjon
121: Viss noko blir blokka, må allowed_outputs lista kva som ER trygt. Når begge engineers har korrekt utrekning men hallusinert short_conclusion, skal blocked_outputs vere ["short_conclusion_a", "short_conclusion_b"] og allowed_outputs ["calculation_steps_a", "results_a", "calculation_steps_b", "results_b"]. Brukaren får då sjå fakta utan å bli misleia.
135: - Vere på same språk som konstruktørane (nynorsk eller bokmål)
138: - Forklare KVA SOM ER NYTT — kva Controller oppdaga som konstruktørane itself ikkje allereie flagga
139: - Ved NA-avvik eller motstrid: seie konkret kva som er gale (kva verdi, kva han skulle vore), og kvifor resultatet difor ikkje er godkjent
141: - Alltid avslutte med at resultatet er førebels og skal kontrollerast av fagperson
146: - Eventuelle mønster som peikar mot system-issues (t.d. "Engineer B brukte konsekvent feil tverrsnittsformel")
173: * Forventa NA-verdiar per kanonisk result-nøkkel. Engineerane emitterer
197: * konstruktør sine results og samanliknar mot NA_EXPECTED. Kode hallusinerer
248: // ── NA-grunnlag: same autoritative tabell konstruktørane fekk, slik at
249: //    Controller sin NA-sjekk er eit oppslag og ikkje ein minne-recall.
288: lines.push("NA-avvik — konstruktør har brukt feil nasjonalt bestemt verdi:");
291: `  - Engineer ${d.agent}: ${d.key} = ${d.brukt} ` +
298: "Kombinasjonsstruktur-avvik — konstruktør har rapportert feil " +
303: `  - Engineer ${d.agent}: Ed_dim = ${d.reported} — korrekt ` +
319: KONSTRUKTØR A SITT SVAR:
322: KONSTRUKTØR B SITT SVAR:
325: SAMANLIKNAR SI VURDERING:
364: ? "Controller nådde token-grensa før han fullførte JSON. Aukar max_tokens kan hjelpe."
365: : "Klarte ikkje parse Controller sitt svar som JSON",
439: console.error("Controller error:", err);
440: const { message, status } = formatAnthropicError(err, "Controller", locale);

## app/api/agent-e/route.ts
4: calculateTillitScore,
6: type TillitBreakdown,
9: } from "@/lib/tillit-score";
23: Du er Rapportør for Pilar — eit AI-basert verktøy for norsk byggfagleg praksis.
25: Rolla di er å skrive prosa-felta i ein berekningsrapport som vert lest av ingeniørar. Du syntetiserer arbeid som allereie er gjort av tidlegare agentar (Tolkar, Engineer Engineer A and Engineer B, Comparator, Controller) til lesbar prosa. Du sjølv reknar IKKJE — ingen tal, formlar eller standardreferansar skal stamme frå deg.
29: Du er siste ledd i pipelinen før rapport-rendering. Controller har allereie gjort den endelege fagvurderinga (approved / approved_with_warnings / uncertain / rejected). Det er IKKJE di oppgåve å overstyre eller mjuke opp Controller si avgjerd — det er di oppgåve å TRANSMITTERE ho fagleg riktig til lesaren.
32: - Resultat-tabellar (numerisk data frå Engineerane, rendrast frå strukturert output)
33: - Stegvis utrekning (KaTeX-typesetta formlar frå Engineerane)
34: - Comparator-blokk og Controller-avgjerd (rendrast direkte frå DB)
46: 1. Kva er Controller si avgjerd? (approved / approved_with_warnings / uncertain / rejected) Den styrer tonen.
48: 3. Er det kritisk usemje mellom Engineer Engineer A and Engineer B som Comparator har fanga opp?
67: GOOD: "Berekninga gjeld dimensjonering av strekkarmering i ein enkeltarmert betongbjelke (b = 250 mm, d = 450 mm, C25/30) for eit dimensjonerande bøyemoment M_Ed = 120 kNm. Engineer Engineer A and Engineer B er fullt einige om at nødvendig armeringsareal er A_s,req = 751 mm² og at enkeltarmering er tilstrekkeleg. Controller har godkjent berekninga som førebels grunnlag, og resultatet skal kontrollerast av ansvarleg fagperson før bruk i prosjektering."
77: Praktisk vegvising. Kva skal lesaren gjere vidare? Ikkje overstyr Controller — viss han har gitt "approved_with_warnings", reflekter det. Viss han har gitt "uncertain" eller "rejected", ver tydeleg om at useen må kontrollere på nytt eller søke fagperson FØR vidare bruk.
83: - ALDRI inkluder NS-EN- eller EC-paragrafnummer i prosaen din. Engineerane har allereie referert dei i sin output — referer generisk til "EC2-metode" eller "etter Eurokode", ikkje spesifikke §-nummer. Du står langt frå utleiinga og kan ikkje verifisere referansane sjølv.
84: - ALDRI inkluder tal eller resultat som ikkje står eksplisitt i Engineer A eller B sitt results-felt eller short_conclusion. Viss du vil nemne eit tal, kopier det eksakt frå upstream — ikkje skriv om frå minnet.
85: - ALDRI bruk frasar som "berekninga er trygg", "kapasiteten er godkjent for bygging", "resultatet er konservativt for alle scenarier" eller liknande absolutte/normative påstandar. Alt er førebels og krev fagperson-verifikasjon.
90: Prosaen din MÅ vere lojal mot upstream-data. Den vanlegaste feilen ein AI-rapportør gjer er å mjuke opp ein streng kontrollør-vurdering. Du skal ikkje gjere det.
94: 1. KONTROLLØR-VERDICT-MAPPING (styrer tonen i conclusion):
95: - "approved" → prosaen kan seie "Controller har godkjent berekninga som førebels grunnlag"
96: - "approved_with_warnings" → prosaen MÅ seie "godkjent med åtvaringar" eller liknande, og åtvaringane MÅ nemnast i technical_assessment
97: - "uncertain" → prosaen MÅ seie "Controller har vurdert resultatet som usikkert" og lesaren MÅ varslast om at vidare arbeid krevst
98: - "rejected" → prosaen MÅ seie "Controller har avvist berekninga" — IKKJE softa det opp
100: 2. SAMANLIKNAR-MAPPING (påverkar technical_assessment):
101: - "match" eller "minor_differences" → kan seiast at konstruktørane er einige
106: Viss Controller har blokkert enkelttall eller delkonklusjonar frå éin av Engineerane, presenter ikkje desse blokka verdiane som om dei vart godkjent. Skriv heller "Engineer X sine talverdiar er blokkerte av Controller."
109: Viss Engineer A eller B har "low" eller "medium" konfidens og Controller likevel godkjent, er det relevant kontekst som kan nemnast i technical_assessment.
112: Viss det er åtvaringar i Engineer- eller Controller-output, må minst dei viktigaste reflekterast — særleg dei som påverkar gyldigheita av resultatet (t.d. "only gyldig viss bjelken er sideavstiva").
118: - Tredjeperson for agent-referansar: "Engineer Engineer A and Engineer B har funne...", "Controller har vurdert..." — aldri "vi" eller "eg" eller "Rapportør".
143: * Reknar tillit-score frå oppstrøms-data. Returnerer null viss kritisk data
146: function computeTillitFor(
150: ): TillitBreakdown | null {
152: console.warn("[tillit-score] Manglar comparison.match_status");
156: console.warn("[tillit-score] Manglar controller_decisions.decision_status");
169: return calculateTillitScore({
176: console.warn("[tillit-score] Klarte ikkje rekne ut tillit-score:", err);
248: * Sjekkar cache + backfillar tillit-score om naudsynt. Returnerer
261: let enrichedReport = existing as { id: string; tillit_score: number | null; tillit_breakdown: unknown };
263: enrichedReport.tillit_score === null ||
264: enrichedReport.tillit_score === undefined ||
265: isBreakdownStale(enrichedReport.tillit_breakdown);
268: const tillit = computeTillitFor(inputReview, comparison, controllerDecision);
269: if (tillit) {
273: tillit_score: tillit.total,
274: tillit_breakdown: tillit,
320: KONSTRUKTØR A SI LØYSING:
323: KONSTRUKTØR B SI LØYSING:
326: SAMANLIKNAR SI VURDERING:
329: KONTROLLØR SI AVGJERD:
406: console.error("Failed to parse Rapportør response. Raw text was:");
408: throw new Error("Rapportør returned invalid JSON");
484: const tillit = computeTillitFor(
499: tillit_score: tillit?.total ?? null,
500: tillit_breakdown: tillit ?? null,
522: const { message } = formatAnthropicError(err, "Rapportør", locale);
570: const tillit = computeTillitFor(
585: tillit_score: tillit?.total ?? null,
586: tillit_breakdown: tillit ?? null,
608: error instanceof Error ? error.message : "Unknown error in Rapportør";
609: console.error("Rapportør error:", error);

## app/api/input-agent/route.ts
26: Tryggleiken ligg ikkje i deg åleine — Engineer A og Engineer B løyser uavhengig, Comparator finn avvik mellom dei, og Controller har stoppmandat. Du er første ledd, ikkje einaste ledd.
28: VIKTIG: velvilje gjeld SCOPE — ikkje data. Du skal vere romsleg med kva slags fagområde du slepp gjennom, men streng på at dei oppgitte dataa faktisk heng saman. Velvilje på scope gir deg ikkje løyve til å oversjå sjølvmotseiande input (sjå MOTSTRID-DETEKSJON).
36: - "relevant_ikkje_stotta" — BERRE for fagområde der vi ikkje har metodisk grunnlag overhodet: brannprosjektering, seismisk dimensjonering, dynamisk respons og utmatting, geoteknisk dimensjonering (utover enkel jordtrykk-modell). IKKJE bruk denne for vanlege strukturberekningar i stål/betong/tre — la heller agentane prøve.
58: Tolkar tolkar forespurnaden. Tolkar reknar ikkje, og Tolkar vel ikkje faglege parametrar. Følgjande er konstruktørane sin jobb — dei slår det opp frå sitt autoritative NA-grunnlag — og skal ALDRI fastsetjast av Tolkar:
67: Skriv ALDRI noko som "knekkingskurve b antatt", "gamma_M1 = 1,0 antatt" eller "tverrsnittsklasse 1 antatt" i antakingar eller tolkte_verdiar — og finn ALDRI på paragrafreferansar for slike val. Det er å gjere konstruktøren sin jobb, og ein feil der forplantar seg til BEGGE engineers samtidig, slik at Comparator og Controller ser ein falsk konsensus. Oppgi profil og stålkvalitet i tolkte_verdiar slik useen gav dei; konstruktørane finn kurve, faktorar og fasthet itself.
88: - Sett konfidens til 0,45 eller lågare.
91: Status kan framleis vere klar eller delvis_klar — ein motstrid blokkerer ikkje i seg sjølv tolkinga. Men eit utfylt motstrid-felt er eit signal Controller MÅ handle på. motstrid er tom array når ingen motstrid finst. Ein motstrid høyrer korkje i manglande_verdiar (dataa ER der) eller kan_ikkje_reknast (du KAN rekne — det er nettopp fella) — difor eige felt.
98: - 0.45-0.65: forespurnaden er på grensa av MVP eller har fleire moglege tolkingar. Controller bør sjå nøye på resultatet.
148: Døme 4 — delvis_klar med låg konfidens (grensetilfelle, lar agentane prøve):
149: Input: "IPE 300 S355, L=8m, qEd=6 kN/m, ikkje sideavstiva. Vurder momentkapasitet."
152: → report_subtitle: "S355, L = 8,0 m, ikkje sideavstiva"
154: → tolkte_verdiar: { "profil": "IPE 300", "stålkvalitet": "S355", "L": "8,0 m", "qEd": "6,0 kN/m", "sideavstiving": "ingen" }
162: Grunngiving: Forespurnaden er fagleg gyldig sjølv om vipping ligg på grensa. Vi let agentane prøve, flags usikkerheit gjennom konfidens og antakingar, og lar Controller ta endeleg avgjerd. Merk at "lastangrepspunkt" er antatt (tyngdepunkt) — det skal IKKJE samtidig stå i manglande_verdiar. Merk òg at knekkekurve, gamma_M og tverrsnittsklasse IKKJE er nemnt — det er konstruktørane sin jobb, ikkje Tolkar sin.
191: Grunngiving: MEd kan reknast formelt, så status er ikkje mangelfull. Men inputen er sjølvmotseiande. Tolkar resolverer det IKKJE stille — motstriden er flagga eksplisitt, konfidens er sett lågt, og Controller har det han treng for å gå til usikker/avvist. Å velje q_Ed = 15 og rapportere eitt sjølvsikkert moment ville vore ein farleg feil.
199: Pilar byggjer eit berekningsnotat av resultatet. Desse tre felta styrer forsida og resultat-grupperinga, og er separate frå berekningstype (det frie, menneskelege namnet).
201: - report_title: ein kort, konkret tittel for notatet. Namngi konstruksjonselementet og kva som blir analysert — som emne-linja i eit konsulent-notat. Døme: "Fritt opplagd stålbjelke — moment og skjær", "Strekkarmering i rektangulær betongbjelke". IKKJE generisk "Berekningsnotat" eller "Konstruksjonsberekning".
202: - report_subtitle: éi kort presisering, eller null. Spenn, last, materiale eller styrande standard. Døme: "L = 5,0 m, q = 8,0 kN/m", "S355, ikkje sideavstiva", "Kontroll mot NS-EN 1992-1-1". Hald det til ei underline, ikkje ei setning.
215: Når oppgåva er ein STR-lastkombinasjon, fyller du — i tillegg til tolkte_verdiar — ut feltet lastkombinasjon_input, slik at Controller kan re-rekne 6.10a/6.10b deterministisk:
593: //   konstruktørane og Controller via SSE "complete"-payloaden under.

## app/api/requests/[id]/route.ts
9: * Returnerer ein request + tilhøyrande input_review (tolking) + nyaste
82: .select("id, document_id, tillit_score, created_at")

## app/api/runs/[id]/route.ts
84: .select("id, document_id, tillit_score, created_at")

## app/components/Header.tsx
12: /** Vis AI-disclaimer-chipen. Standard: true. Set false på admin-sider. */
21: "kontrolleres av kvalifisert fagperson før bruk i reelle prosjekt.",
24: "kontrollerast av kvalifisert fagperson før bruk i reelle prosjekt.",
73: nb: "Pilar — til forsiden",

## app/components/info-popover.css
3: Brukt for forklaring av tillit-tal, konfidens-tal, fase-badges,

## app/components/InfoPopover.tsx
7: * Klikk på (i)-ikonet for å vise innhaldet. Lukkar på outside-click,
13: * med overflow: hidden/auto (t.d. rapport-sidebar). Posisjonen oppdaterast
21: *   <InfoPopover label="Tillit">
22: *     <p>Tillit-skåren måler AI-pipeline si interne semje...</p>
113: // === Lukk på outside-click ===

## app/components/mission-control.css
3: Lasteskjerm som demonstrerer at to engineers arbeider
217: /* === Comparator-panel === */

## app/components/MissionControl.tsx
58: title: { nb: "To uavhengige engineers beregner samme problem", nn: "To uavhengige engineers reknar same problem" },
59: subtitle: { nb: "Engineer Engineer A and Engineer B use ulik metode. Comparatoren bekrefter at de er enige før resultatet presenteres.", nn: "Engineer Engineer A and Engineer B use ulik metode. Comparatoren stadfestar at dei er einige før resultatet er presentert." },
63: // Engineer tags
64: konstruktorA: { nb: "Engineer", nn: "Engineer" },
65: konstruktorB: { nb: "Engineer", nn: "Engineer" },
86: blokkertForklaring: { nb: "Both engineers må fullføre før samanlikning kan starte.", nn: "Both engineers må fullføre før samanlikning kan starte." },
89: // ComparatorPanel
90: samanliknar: { nb: "Comparator", nn: "Comparator" },
96: einige: { nb: "ENIGE", nn: "EINIGE" },
98: nestenEinige: { nb: "NESTEN ENIGE", nn: "NESTEN EINIGE" },
100: terskelEnige: { nb: "Alle avvik under 5 %", nn: "Alle avvik under 5 %" },
101: terskelNestenEnige: { nb: "Alle avvik under 15 %, nokre over 5 %", nn: "Alle avvik under 15 %, nokre over 5 %" },
102: terskelAvvik: { nb: "Eitt eller fleire avvik over 15 %", nn: "Eitt eller fleire avvik over 15 %" },
110: cellAvvikSuffix: { nb: "AVVIK", nn: "AVVIK" },
116: videreKontrollor: { nb: "Videre til kontrollør", nn: "Vidare til kontrollør" },
119: tabellAvvik: { nb: "AVVIK", nn: "AVVIK" },
120: toAvToEinige: { nb: "2 av 2 metoder enige", nn: "2 av 2 metodar einige" },
204: samanliknar: "Comparator",
211: terskelEnige: "All differences below 5%",
212: terskelNestenEnige: "All differences below 15%, some above 5%",
213: terskelAvvik: "One or more differences above 15%",
220: cellAvvikSuffix: "DIFFERENCE",
228: tabellAvvik: "DIFFERENCE",
236: // Auto-scroll til Comparator i to fasar (#5):
237: //  Fase 1: når begge engineers er ferdige → vis "BEREGNER AVVIK"-kortet.
241: const sammenlignerRef = useRef<HTMLDivElement>(null);
245: sammenlignerRef.current?.scrollIntoView({
256: sammenlignerRef.current?.scrollIntoView({
391: <div ref={sammenlignerRef}>
392: <ComparatorPanel
437: // Engineer A si prompt har generert numererte steg, men dei to konstruktørane
469: // Resultat-verdiar (q_Ed osv.) er flytta til Comparator-kortet (#5),
553: {/* Resultat-verdiar (q_Ed osv.) er flytta til Comparator-kortet
556: staden — signaliserer at kortet leverer til Comparator. */}
564: Ferdig — leverer resultat til Comparator
629: function ComparatorPanel({
652: // BLOKKERT-tilstand (#2): éin agent har feila — Comparator kan ikkje
659: <div className="mc-compare-name">{L.samanliknar[locale]}</div>
685: // Comparator finst i pipelinen men ventar på A+B. Erstattar tidlegare
720: <span>{L.samanliknar[locale]}</span>
732: <div className="mc-compare-name">{L.samanliknar[locale]}</div>
748: const classification: "enige" | "nesten" | "avvik" =
749: maxAvvik < 5 ? "enige" : maxAvvik < 15 ? "nesten" : "avvik";
751: classification === "enige"
757: classification === "enige"
758: ? L.terskelEnige[locale]
760: ? L.terskelNestenEnige[locale]
761: : L.terskelAvvik[locale];
807: <div className="mc-compare-name">{L.samanliknar[locale]}</div>
813: classification === "enige"
819: classification === "enige"
825: classification === "enige"
857: <div className="uk-eyebrow" style={{ fontSize: 10, textAlign: "right" }}>{L.tabellAvvik[locale]}</div>

## app/components/StatusStripe.tsx
6: * Brukt for Controller-avgjerds-kort, Comparator-banner, Advarsler-blokk

## app/components/ThemeToggle.tsx
51: // DOM/localStorage-sideeffektar ligg i effect, ikkje i event-handleren.
86: // Outside-click + ESC + scroll/resize reposition + lytt etter andre popovers

## app/components/TillitGauge.tsx
4: import { tillitVisuals } from "@/lib/tillit-score";
10: * TillitGauge — sirkulær gauge-komponent for AI-pipeline-tillit (0-100).
17: * Fagperson-status vises separat i Kontrollstatus-panelet — ikkje i denne gauge'n.
18: * Begrunnelse: pilot har ikkje fagperson-signering enno, så å inkludere ho i
26: ikkjeRekna: { nb: "Tillit-score ikke beregnet", nn: "Tillit-score ikkje rekna" },
28: ariaPre: { nb: "Tillit-score ", nn: "Tillit-score " },
32: konstruktorSemje: { nb: "Engineer-enighet", nn: "Engineer-semje" },
33: konstruktorSemjeExpl: { nb: "Speiler Comparator sin vurdering av om Engineer Engineer A and Engineer B kom frem til samme svar. Full enighet gir høyeste verdi; metodiske eller numeriske avvik trekker ned.", nn: "Speglar Comparator si vurdering av om Engineer Engineer A and Engineer B kom fram til same svar. Full semje gjev høgaste verdi; metodiske eller numeriske avvik trekker ned." },
34: kontrollorVerdict: { nb: "Controller-verdict", nn: "Controller-verdict" },
35: kontrollorVerdictExpl: { nb: "Speiler Controllerens endelige avgjørelse. Godkjent gir høyeste verdi; godkjent med advarsler litt lavere; usikker mye lavere; avvist nuller ut.", nn: "Speglar Controller si endelege avgjerd. Godkjent gjev høgaste verdi; godkjent med åtvaringar litt lågare; usikker mykje lågare; avvist nullar ut." },
38: formulaNote: { nb: "Gauge'en måler AI-pipeline-tillit. Fagperson-kontroll vises separat i kontrollstatus. Formelen er en pilot-hypotese og blir kalibrert i v0.2.", nn: "Gauge'n måler AI-pipeline-tillit. Fagperson-kontroll vises separat i kontrollstatus. Formelen er ein pilot-hypotese og blir kalibrert i v0.2." },
50: approved: "Godkjent",
51: approved_with_warnings: "Godkjent med advarsler",
60: approved: "Godkjent",
61: approved_with_warnings: "Godkjent med åtvaringar",
67: interface TillitBreakdown {
82: interface TillitGaugeProps {
84: breakdown?: TillitBreakdown | null;
93: export function TillitGauge({ score, breakdown }: TillitGaugeProps) {
99: <div className="tillit-gauge tillit-gauge--idle">
100: <span className="tillit-gauge__placeholder">
107: const { label, color } = tillitVisuals(score, locale);
111: <div className="tillit-gauge">
114: className="tillit-gauge__button"
124: className="tillit-gauge__svg"
147: className="tillit-gauge__progress"
150: <div className="tillit-gauge__center">
151: <span className="tillit-gauge__score">{score}</span>
152: <span className="tillit-gauge__max">/100</span>
154: <div className="tillit-gauge__label" style={{ color }}>
161: className="tillit-gauge__breakdown"
189: <p className="tillit-gauge__formula-note">
209: <div className="tillit-gauge__row">
210: <div className="tillit-gauge__row-header">
211: <span className="tillit-gauge__row-label">
217: <span className="tillit-gauge__row-value">
221: <div className="tillit-gauge__row-bar" aria-hidden="true">
223: className="tillit-gauge__row-bar-fill"
227: {detail && <div className="tillit-gauge__row-detail">{detail}</div>}

## app/components/result/CalculationResultView.tsx
4: * CalculationResultView (#refaktor-fase-7) — heile resultat-side-blokka.
9: * - Controller-kort med chips, sjølvkontroll, "Les hele vurderingen" (#02, #09)
10: * - Engineer A: short_conclusion, tiles, results-tabell, stegvis, advarsler
13: * - Sticky decision-bar (#07) når studenten har scrolla forbi Controller
132: // Hjelpe-funksjon: sjekk om ein output er blokka av Controlleren.
156: samanliknarTittel: "Comparator — differences found",
169: // Bestemmer default-tilstand for B-blokka, generelle merknader
175: // FIKS 7 (F6): finst det faktisk advarsler? Engineer-warnings
176: // eller Comparator sine metode-/assumption-skilnader.
195: // FIKS 7 (F6): "standard" dekkjer både godkjent-med-advarsler
196: // og godkjent-utan. Vel forklaring etter om det FAKTISK finst
197: // advarsler — same signal computeProfile les. Elles påstår
198: // sida "med advarsler" på reine køyringar (slik A2 viste).
200: ? WB_LABELS.profilForklaringStandardMedAdvarsler[locale]
260: {/* Controlleren si avgjerd — primær banner */}
261: {/* Controller-kort (#02) — fire-sleng struktur:
362: method_differences frå Comparator
363: - "Antakelser & advarsler": warn + neutral chips
422: {WB_LABELS.fagligGruppeAntakelser[locale]}
456: // FIKS 5 (F3): tel only REELLE inkonsistensar. Comparator
708: /^(Engineer [AB]s?|Both engineers?|Begge tilnærminger?|Resultatet|Beregningen)/
735: forbi Controller-kortet) og viser sticky-onlyn då. */}
738: {/* Fallback: Comparator-banner viss Controlleren feila */}
771: {/* Warn-stripe når Controlleren har blokka sluttkonklusjon.
954: {/* Føresetnader */}
1298: Default kollapsa når Engineer A and Engineer B er enige (vanlegaste tilfelle),
1313: if (matchStatus === "match") return WB_LABELS.bEnigeMedA[locale];
1448: {/* Comparison details — Comparator (#05).
1451: assumption-differences kollapsa som "Generelle merknader"
1454: // FIKS 8 (F5): ein verdi Controller har blokkert skal aldri
1480: <div className="uk-card__title">{WB_LABELS.samanliknarSkilnader[locale]}</div>
1573: {WB_LABELS.samanliknarKvifor[locale]}
1590: {WB_LABELS.samanliknarAVerdi[locale]}:{" "}
1596: {WB_LABELS.samanliknarBVerdi[locale]}:{" "}
1620: {/* Generelle merknader frå Comparator (#05) — method +
1651: ? WB_LABELS.skjulMerknader[locale]
1652: : `${WB_LABELS.generelleMerknader[locale]} (${methodDiffs.length + assumptionDiffs.length})`}
1749: Controller-kortet som sjølvkontroll-disclosure (#09).
1855: // z-index lågare enn navonlyns 50, slik at navonlyn ligg på topp

## app/components/result/CountUp.tsx
9: * useen si auga er på Controller-kortet på toppen først, og når dei

## app/components/result/DimensjonerandeTile.tsx
163: // På smale viewports (mobile) reduserar minmax(0, 1fr) tiles til lågare

## app/components/result/KontrollorChipPill.tsx
4: * KontrollorChipPill (#02) — kompakt chip for fag-flagg i Controller-kortet.
11: * samanlikne fleire faglege merknader side om side utan å miste kontekst.
39: // er minst 10% synleg i viewporten. Brukar sin auga er på Controller-
178: lange forklaringar lettare å skanne. Engineer-namn vert markert
201: {/* Detekter konstruktør-prefix og marker fed for skanning */}
203: const m = sentence.match(/^(Engineer [AB]s?|Both engineers?|Begge tilnærminger?)/);

## app/innstillingar/page.tsx
11: maVereInnlogga: { nb: "Du må være innlogget for å se denne siden.", nn: "Du må vere innlogga for å sjå denne sida." },
23: pilotP2: { nb: "Tilbakemelding er velkommen. Bruk «Send feilrapport» nederst på hver rapport-side, eller send e-post.", nn: "Tilbakemelding er velkomen. Bruk «Send feilrapport» nederst på kvar rapport-side, eller send e-post." },

## app/international/page.tsx
206: <aside className="international-card context-card">
221: </aside>

## app/mine/MineList.tsx
16: tillit: number | null;
42: "Engineer Engineer A and Engineer B er ferdige med utregningen. Klikk for å se sammenligning, kontrollør-vurdering og generere rapporten.",
47: "Ferdig beregningsnotat. Klikk for å lese, eksportere til Word eller dele via QR-kode.",
64: "Engineer Engineer A and Engineer B er ferdige med utrekninga. Klikk for å sjå samanlikning, kontrollør-vurdering og generere rapporten.",
69: "Ferdig berekningsnotat. Klikk for å lese, eksportere til Word eller dele via QR-kode.",
85: tillit: { nb: "Tillit", nn: "Tillit" },
86: tillitSkarLabel: { nb: "Tillit-skår", nn: "Tillit-skår" },
87: tillitPopover1: { nb: "AI-pipelinens interne enighet (0–100). Måler hvor godt konstruktørene og kontrolløren er enige om resultatet.", nn: "AI-pipeline si interne semje (0–100). Måler kor godt konstruktørane og kontrolløren er einige om resultatet." },
88: tillitPopover2Pre: { nb: "Erstatter", nn: "Erstattar" },
89: tillitPopover2Mid: { nb: "ikke", nn: "ikkje" },
90: tillitPopover2Post: { nb: "fagperson-kontroll. Formelen er en pilot-hypotese og blir kalibrert i v0.2.", nn: "fagperson-kontroll. Formelen er ein pilot-hypotese og blir kalibrert i v0.2." },
114: function getTillitColor(score: number): string {
275: {row.tillit !== null && (
279: style={{ color: getTillitColor(row.tillit) }}
281: {row.tillit}
284: <span>{ML_LABELS.tillit[locale]}</span>
285: <InfoPopover label={ML_LABELS.tillitSkarLabel[locale]}>
286: <p>{ML_LABELS.tillitPopover1[locale]}</p>
288: {ML_LABELS.tillitPopover2Pre[locale]} <strong>{ML_LABELS.tillitPopover2Mid[locale]}</strong> {ML_LABELS.tillitPopover2Post[locale]}

## app/mine/page.tsx
16: maVereInnlogga: { nb: "Du må være innlogget for å se denne siden.", nn: "Du må vere innlogga for å sjå denne sida." },
100: | { tillit_score: number | null; document_id: string | null }
101: | { tillit_score: number | null; document_id: string | null }[]
152: reports ( tillit_score, document_id ),
186: const tillit = report?.tillit_score ?? null;
188: const hasEngineerOutputs = (run.agent_outputs ?? []).some(
204: } else if (hasEngineerOutputs) {
218: tillit,
238: tillit: null,
249: // === SIDE ===

## app/pilot/page.tsx
31: "PILAR er et AI-generert lærings- og dokumentasjonsverktøy. Resultat skal alltid kontrolleres av kvalifisert fagperson før bruk i prosjektering.",
44: "PILAR er eit AI-generert lærings- og dokumentasjonsverktøy. Resultat skal alltid kontrollerast av kvalifisert fagperson før bruk i prosjektering.",

## app/rapport/[run_id]/feilrapport-modal.tsx
14: * - Focus-trap, Escape-to-close, click-outside-to-close, body-scroll-lock
35: { value: "low", label: "Låg" },
36: { value: "medium", label: "Middels" },

## app/rapport/[run_id]/layout.tsx
4: title: "Berekningsnotat — Pilar",

## app/rapport/[run_id]/page.tsx
79: * kollisjonsrisikoen er låg.
209: nb: "Beregningen er foreløpig godkjent. Resultatet skal kontrolleres av ansvarlig fagperson før bruk.",
210: nn: "Berekninga er førebels godkjend. Resultatet skal kontrollerast av ansvarleg fagperson før bruk.",
214: nn: "Berekninga er førebels godkjend med åtvaringar. Atterhalda må avklarast før prosjekteringsbruk.",
242: // Venstre-sidebar
249: // Forside / cover
250: berekningsnotat: { nb: "Calculation note", nn: "Berekningsnotat" },
251: dokumentID: { nb: "Dokument-ID:", nn: "Dokument-ID:" },
252: forsideDato: { nb: "Dato:", nn: "Dato:" },
253: forsideStatus: { nb: "Status:", nn: "Status:" },
254: forsideRapportVersjon: { nb: "Rapport-versjon:", nn: "Rapport-versjon:" },
255: viktigMerknad: { nb: "VIKTIG MERKNAD", nn: "VIKTIG MERKNAD" },
261: sub21Forutsetninger: { nb: "02.1 — FORUTSETNINGER", nn: "02.1 — FØRESETNADER" },
273: sub33Advarsler: { nb: "03.3 — ADVARSLER", nn: "03.3 — ÅTVARINGAR" },
274: sub41Konstruktorkontroll: { nb: "04.1 — KONSTRUKTØRKONTROLL", nn: "04.1 — KONSTRUKTØRKONTROLL" },
275: sub42KontrollorAvgjerd: { nb: "04.2 — KONTROLLØRENS AVGJØRELSE", nn: "04.2 — KONTROLLØR SI AVGJERD" },
304: verifikasjonSamsvarAria: { nb: "Samsvar mellom konstruktørene", nn: "Samsvar mellom konstruktørane" },
305: verifikasjonAvvikAria: { nb: "Avvik mellom konstruktørene", nn: "Avvik mellom konstruktørane" },
307: // Forside-tabular metadata (Fase 1, B-redesign — utan kolon)
308: forsideMetaDokumentID: { nb: "Dokument-ID", nn: "Dokument-ID" },
309: forsideMetaBrukar: { nb: "Bruker", nn: "Brukar" },
310: forsideMetaDato: { nb: "Dato", nn: "Dato" },
311: forsideMetaStatus: { nb: "Status", nn: "Status" },
312: forsideMetaVersjon: { nb: "Versjon", nn: "Versjon" },
313: forsideFallbackTittel: { nb: "Calculation note", nn: "Berekningsnotat" },
314: forsideTillitOverskrift: { nb: "Tillit", nn: "Tillit" },
315: forsideAITekst: { nb: "AI-generert dokument", nn: "AI-generert dokument" },
325: nb: "Innholdet skal kun brukes som støtte, læringshjelp eller foreløpig teknisk vurdering. Ikke erstatning for kontroll av kvalifisert fagperson.",
326: nn: "Innhaldet skal only brukast som støtte, læringshjelp eller førebels teknisk vurdering. Ikkje ein erstatning for kontroll av kvalifisert fagperson.",
328: disclaimer: { nb: "Dette dokumentet er generert av et AI-basert beregnings- og dokumentasjonsverktøy. Innholdet skal kun brukes som støtte, læringshjelp eller foreløpig teknisk vurdering. Dokumentet er ikke en erstatning for kontroll utført av kvalifisert fagperson, ansvarlig prosjekterende eller godkjent foretak. Alle beregninger, assumptioner, standardreferanser, materialdata og konklusjoner må kontrolleres av en kompetent byggingeniør før de blir brukt i reelle prosjekter, byggesøknader, produksjon eller utføring.", nn: "Dette dokumentet er generert av eit AI-basert bereknings- og dokumentasjonsverktøy. Innhaldet skal only brukast som støtte, læringshjelp eller førebels teknisk vurdering. Dokumentet er ikkje ein erstatning for kontroll utført av kvalifisert fagperson, ansvarleg prosjekterande eller godkjent føretak. Alle berekningar, assumptioner, standardreferansar, materialdata og konklusjonar må kontrollerast av ein kompetent byggingeniør før dei blir brukte i reelle prosjekt, byggesøknader, produksjon eller utføring." },
336: foresetnaderH3: { nb: "Forutsetninger", nn: "Føresetnader" },
344: atvaringarH3: { nb: "Advarsler", nn: "Åtvaringar" },
348: berekningaLoyst: { nb: "Beregningen er løst uavhengig av to AI-engineers (Engineer A and Engineer B).", nn: "Berekninga er løyst uavhengig av to AI-engineers (Engineer A and Engineer B)." },
349: kontrollorAvgjerd: { nb: "Controllerens avgjørelse:", nn: "Controlleren si avgjerd:" },
352: forebelsBerekning: { nb: "Foreløpig beregning — må kontrolleres av fagperson før bruk i prosjektering.", nn: "Førebels berekning — må kontrollerast av fagperson før bruk i prosjektering." },
357: // Høgre sidebar — Actions
367: statusInputExplanation: { nb: "Tolkerens vurdering av hvor klar oppgaven var til å beregnes. 'Klar' = all info på plass; andre statuser = Tolkeren gjorde rimelige antakelser eller manglet info.", nn: "Tolkar si vurdering av kor klar oppgåva var til å reknast. 'Klar' = all info på plass; andre statusar = Tolkar gjorde rimelege antakingar eller mangla info." },
370: statusKonstruktorExplanation: { nb: "Engineerens egenrapporterte sikkerhet på eget svar (high/medium/low). Måler only én agents tillit til seg selv, ikke den samlede rapporten.", nn: "Engineeren si eigenrapporterte sikkerheit på eige svar (high/medium/low). Målar only éin agent sin tillit til seg sjølv, ikkje den samla rapporten." },
372: statusSamanlikningExplanation: { nb: "Comparator-agenten sjekker om Engineer A and Engineer B kom frem til samme svar. 'Enige' = ingen avvik; 'Stor avvik' eller 'Kritisk' krever nærmere ettersyn.", nn: "Comparator-agenten sjekkar om Engineer A and Engineer B kom fram til same svar. 'Einige' = ingen avvik; 'Stor avvik' eller 'Kritisk' krev nærare ettersyn." },
373: statusKontrollor: { nb: "Controller", nn: "Controller" },
374: statusKontrollorExplanation: { nb: "Controller-agenten leser både engineers og Comparator, og avgjør om resultatet er trygt nok å vise. Erstatter ikke fagperson-kontroll.", nn: "Controller-agenten les både engineers og Comparator, og avgjer om resultatet er trygt nok å vise. Erstattar ikkje fagperson-kontroll." },
375: statusFagperson: { nb: "Fagperson", nn: "Fagperson" },
377: statusFagpersonExplanation: { nb: "Sjekker om en kvalifisert byggingeniør har signert rapporten. I pilot-versjonen er dette alltid 'Ikke kontrollert' — du må selv få en fagperson til å gjennomgå før bruk i reelle prosjekter.", nn: "Sjekkar om ein kvalifisert byggingeniør har signert rapporten. I pilot-versjonen er dette alltid 'Ikkje kontrollert' — du må sjølv få ein fagperson til å gjennomgå før bruk i reelle prosjekt." },
382: import { TillitGauge } from "@/app/components/TillitGauge";
383: import type { TillitBreakdown } from "@/lib/tillit-score";
409: * Talavvik mellom Engineer A and Engineer B for eit gjeve felt, frå Comparator
444: tillit_score: number | null;
445: tillit_breakdown: TillitBreakdown | null;
581: berekningsnotat: "Calculation note",
583: forsideDato: "Date:",
584: forsideStatus: "Status:",
585: forsideRapportVersjon: "Report version:",
591: sub21Forutsetninger: "02.1 — ASSUMPTIONS",
602: sub33Advarsler: "03.3 — WARNINGS",
622: forsideMetaDato: "Date",
623: forsideMetaStatus: "Status",
624: forsideMetaVersjon: "Version",
625: forsideFallbackTittel: "Calculation note",
626: forsideAITekst: "AI-generated document",
668: statusFagperson: "Professional reviewer",
711: // kontrollørprosaen. Den fulle vurderinga ligg i § 04.2 og i
765: // === Forside-data ===
774: const reportTitle = reportModel.cover.title || RP_LABELS.forsideFallbackTittel[locale];
792: // Forsida vis full controller.user_message som tillit-prose; verdict-boksen
795: // Held forsida som tillit-narrativ, verdict-box som beslutning.
798: nb: "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.",
799: nn: "Berekninga er godkjend for visning. Føreset manuell verifisering av ansvarleg fagperson før bruk i prosjektering.",
803: nn: "Berekninga er førebels godkjend med åtvaringar. Skal verifiserast av ansvarleg fagperson før bruk i prosjektering.",
953: // Samsvar-dom: Agent C (Comparator) er den faglege autoriteten på
956: // Som backup samanliknar vi numerisk (normalizeNumeric) for å fange
1020: // itself poenget med konstruktørkontrollen og skal stå synleg.
1055: {/* === Venstre sidebar: TOC + metadata === */}
1056: <aside className="rapport-sidebar rapport-sidebar--left no-print">
1095: </aside>
1101: FORSIDE — Retning B (Konsulent-notat). PageStripe topp,
1103: tillit-blokk, kort disclaimer. Ingen eigen TOC-entry;
1107: className="rapport-section rapport-forside"
1108: id="forside"
1117: <header className="rapport-forside__head">
1118: <h1 className="rapport-forside__title">{reportTitle}</h1>
1120: <p className="rapport-forside__subtitle">{reportSubtitle}</p>
1124: <dl className="rapport-forside__meta">
1125: <div className="rapport-forside__meta-row">
1126: <dt>{RP_LABELS.forsideMetaDokumentID[locale]}</dt>
1130: <div className="rapport-forside__meta-row">
1131: <dt>{RP_LABELS.forsideMetaBrukar[locale]}</dt>
1135: <div className="rapport-forside__meta-row">
1136: <dt>{RP_LABELS.forsideMetaDato[locale]}</dt>
1139: <div className="rapport-forside__meta-row">
1140: <dt>{RP_LABELS.forsideMetaStatus[locale]}</dt>
1143: className={`rapport-forside__status-badge rapport-forside__status-badge--${statusBadgeVariant}`}
1149: <div className="rapport-forside__meta-row">
1150: <dt>{RP_LABELS.forsideMetaVersjon[locale]}</dt>
1156: <aside className="rapport-access-card" aria-label={reportModel.cover.qrLabel}>
1182: </aside>
1205: <aside className="rapport-model-warning no-print" role="note">
1207: </aside>
1210: <div className="rapport-forside__trust">
1211: <div className="rapport-forside__trust-gauge">
1212: <TillitGauge
... 27 more hits omitted in this file

## app/rapport/[run_id]/rapport.css
118: break-inside: avoid;
556: page-break-inside: avoid;
588: .rapport-sidebar {
598: .rapport-sidebar .uk-eyebrow {
679: /* Høgre sidebar — actions */
691: /* Høgre sidebar — kontrollstatus-panel */
710: /* Mobil — sidebars hidden, single-column */
717: .rapport-sidebar {
884: TILLIT-GAUGE
888: .tillit-gauge {
895: .tillit-gauge--idle {
902: .tillit-gauge__placeholder {
909: .tillit-gauge__button {
923: .tillit-gauge__button:hover {
927: .tillit-gauge__button:focus-visible {
933: .tillit-gauge__svg {
937: .tillit-gauge__progress {
942: .tillit-gauge__center {
953: .tillit-gauge__score {
961: .tillit-gauge__max {
969: .tillit-gauge__label {
983: .tillit-gauge__breakdown {
996: .tillit-gauge__breakdown[data-expanded="false"] {
1000: .tillit-gauge__row {
1006: .tillit-gauge__row-header {
1012: .tillit-gauge__row-label {
1018: .tillit-gauge__row-value {
1024: .tillit-gauge__row-bar {
1031: .tillit-gauge__row-bar-fill {
1037: .tillit-gauge__row-detail {
1042: .tillit-gauge__formula-note {
1054: .tillit-gauge__button {
1058: .tillit-gauge__breakdown[data-expanded="false"],
1059: .tillit-gauge__breakdown[data-expanded="true"] {
1063: .tillit-gauge__row-bar {
1069: FORSIDE-HEADER med tillit-gauge
1073: .rapport-forside-header {
1081: .rapport-forside-header__title {
1086: /* Document-meta får mindre margin når han er inni forside-header,
1088: .rapport-forside-header__title .document-meta {
1092: .rapport-forside-header__gauge {
1100: .rapport-forside-header {
1105: .rapport-forside-header__title {
1108: .rapport-forside-header__gauge {
1116: .rapport-forside-header {
1120: .rapport-forside-header__title {
1124: .rapport-forside-header__gauge {
1127: page-break-inside: avoid;
1134: .tillit-gauge {
1138: .tillit-gauge__breakdown {
1201: page-break-inside: auto;
1209: page-break-inside: auto;
1644: Fase 1 (B-redesign) — Forside
1646: status-badge, tillit-blokk, kort disclaimer.
1649: .rapport-forside {
1656: .rapport-forside__head {
1660: .rapport-forside__title {
1670: .rapport-forside__subtitle {
1681: .rapport-forside__title { font-size: 1.875rem; }
1682: .rapport-forside__subtitle { font-size: 0.9375rem; }
1686: .rapport-forside__meta {
1692: .rapport-forside__meta-row {
1701: .rapport-forside__meta-row dt {
1711: .rapport-forside__meta-row dd {
1720: .rapport-forside__meta-row dd.uk-mono {
1725: .rapport-forside__meta-row {
1730: .rapport-forside__meta-row dt { font-size: 0.625rem; }
1731: .rapport-forside__meta-row dd { font-size: 0.875rem; }
1735: .rapport-forside__status-badge {
1751: .rapport-forside__status-badge--ok {
1757: .rapport-forside__status-badge--gold {
1763: .rapport-forside__status-badge--warn {
1769: .rapport-forside__status-badge--bad {
1775: /* --- Tillit-blokk — gauge venstre + prosa høgre -------------- */
1776: .rapport-forside__trust {
1785: .rapport-forside__trust-gauge {
1787: /* TillitGauge renderar seg sjølv — vi gir only plassen. */
1790: .rapport-forside__trust-prose {
1798: .rapport-forside__trust-prose p {
1803: .rapport-forside__trust {
1808: .rapport-forside__trust-gauge {
1811: .rapport-forside__trust-prose {
1818: .rapport-forside__disclaimer {
1825: .rapport-forside__disclaimer-label {
1838: .rapport-forside__disclaimer-sep {
1843: .rapport-forside__disclaimer-body {
1852: .rapport-forside__disclaimer {
1855: .rapport-forside__disclaimer-label {
1864: .rapport-forside__title,
1865: .rapport-forside__subtitle {
1868: .rapport-forside__meta {
1871: .rapport-forside__meta-row {
1873: page-break-inside: avoid;
1874: break-inside: avoid;
1876: .rapport-forside__meta-row dt {
1879: .rapport-forside__meta-row dd {
1882: .rapport-forside__status-badge {
1887: .rapport-forside__status-badge--gold {
1890: .rapport-forside__trust {
1891: page-break-inside: avoid;
... 128 more hits omitted in this file

## app/rapport/[run_id]/RapportLoadingPilelinja.tsx
5: * faktisk streaming frå Agent E (Rapportør).
13: *   2. "Vurderer kontrollør-tone" thinking_start → text_start  (Claude tenker)
35: // Forventa text-output frå Rapportør (3 prosa-felt). Brukast for å rekne
53: step2: "Vurderer kontrollør-tone",
67: step2: "Vurderer kontrollør-tone",

## app/rapport/[run_id]/beregning/beregning.css
146: break-inside: avoid;
230: .beregning-section { break-inside: auto; }
233: .beregning-formula-item { break-inside: avoid; }

## app/rapport/[run_id]/beregning/page.tsx
29: documentId: "Dokument-ID",
32: given: "Gitte data",
33: assumptions: "Forutsetninger",
34: calculation: "Stegvis beregning",
36: notes: "Merknader",
37: generatedNote: "Generert av PILAR. Beregningen skal kontrolleres av ansvarlig fagperson før bruk.",
75: documentId: "Dokument-ID",
79: assumptions: "Føresetnader",
82: notes: "Merknader",
83: generatedNote: "Generert av PILAR. Berekninga skal kontrollerast av ansvarleg fagperson før bruk.",

## app/rapport/[run_id]/feedback/page.tsx
38: trustLegend: "Tillit",
75: trustLegend: "Tillit",

## app/rapport/[run_id]/_components/ForebelStripe.tsx
3: * ForebelStripe — DNA-element som signaliserer at rapporten er førebels.
5: * Mono "FØREBELS"-label + sans-tekst "Må kontrollerast av fagperson...".
15: label: { nb: "PRELIMINARY", nn: "FØREBELS" },
18: nn: "Må kontrollerast av fagperson før bruk i prosjektering.",

## app/rapport/[run_id]/_components/FormulaStack.tsx
80: * ei ny gruppe (ny storleik); "="-ledd høyrer til storleiken over.

## app/rapport/[run_id]/_components/OrdlisteFlyt.tsx
11: * Trigger-knappen er rendra inline i høgre sidebar (under Fagperson-rada);
17: * eller overflow-klippa forelder. Knappen sjølv ligg i .no-print-sideonlyn
97: <aside
132: </aside>,

## app/rapport/[run_id]/_components/PageStripe.tsx
4: * Layout: "BEREKNINGSNOTAT · PILAR-XXX" venstre, dato høgre.
7: * Frå Retning B-designet. Page-numerering (SIDE N AV M) er ikkje
15: berekningsnotat: { nb: "Beregningsnotat", nn: "Berekningsnotat" },
28: <span>{LABELS.berekningsnotat[locale]}</span>

## app/vilkar/page.tsx
33: nb: " ved hjelp av store språkmodeller og må kontrolleres av kvalifisert fagperson før bruk i reelle prosjekter.",
34: nn: " ved hjelp av store språkmodellar og må kontrollerast av kvalifisert fagperson før bruk i reelle prosjekt.",
61: nb: "Vi use dataen til å forbedre produktet og analysere kalibreringen av tillit-systemet vårt. Data blir lagret i Supabase (EU-region). Vi deler ikke dataen din med tredjepart utenfor det som er nødvendig for å levere tjenesten (Anthropic for AI-beregning, Supabase for lagring, Vercel for hosting).",
62: nn: "Vi use dataen til å forbetre produktet og analysere kalibreringa av tillit-systemet vårt. Data blir lagra i Supabase (EU-region). Vi deler ikkje dataen din med tredjepart utanfor det som er naudsynt for å levere tenesta (Anthropic for AI-berekning, Supabase for lagring, Vercel for hosting).",

## docs/admin-locale-theme-sprint28.md
3: Denne sprinten gjer admin-sidene meir konsistente med resten av PILAR.

## docs/admin-polish-sprint27.md
5: Gjer admin-opplevinga meir navigerbar og ryddar Stone/Graphite-tema på sidene som vart lagt til i dei siste sprintane.
9: - Ny `/admin`-forside med lenker til:

## docs/calculation-sheet-sprint14.md
7: - eigen beregningsside: `/rapport/[run_id]/beregning`
17: 1. Beregningsside

## docs/calculation-sheet-sprint17.md
7: - Equation lines i stegvis beregning blir samlet i `aligned`-miljø i LaTeX.
8: - Forklaringstekst får fjernet rene formellinjer, slik at beregningssiden ikke viser samme utregning dobbelt.
13: - Beregningssiden får knapp for `Full LaTeX`.

## docs/calculation-sheet-sprint20.md
17: - Normaliserer tekst i assumptioner og merknader for fleire stål-/knekkesymbol.

## docs/debugging-skill.md
43: - **AI-tillit:** output kan sjå ut som fagleg godkjenning utan review.

## docs/i18n-hardcoded-norwegian-prescan.md
7: 9: 2. Engineer A
8: 10: 3. Engineer B
9: 11: 4. Comparator
10: 12: 5. Controller
11: 13: 6. Rapportør
12: 55: ## Trust/Tillit rules
13: 57: - Tillit is AI-pipeline confidence, not professional approval.
14: 58: - Do not show "Godkjent" alone in a way that implies final engineering approval.
15: 59: - Prefer "Foreløpig godkjent" / "Førebels godkjent".
16: 60: - Fagperson-signering is a separate future dimension.
19: 119: lavTillit: "Low confidence in interpretation — check the values below before starting",
20: 151: samanliknarTittel: "Comparator — differences found",
21: 266: // Controller-vurdering-toggle (#02): Lang prosa frå Controlleren er
22: 272: // i Controller-kortet. State er null = follow-auto (utvida om issues finst,
23: 276: // Engineer B-disclosure (#04): Heile B-blokka kollapsast til ein-linjes
24: 277: // disclosure med summary (ENIGE/AVVIK + konfidens). State er null = follow-
25: 282: // Comparator-rad-disclosure (#05): kvar rad i numerisk-tabellen kan
26: 288: // Generelle merknader nedst i Comparator (#05) — method_differences +
27: 399: // ein konstruktør. Elles bli i workbench (orphaned/krasja run).
28: 624: // Generelle merknader: utvida ved krev_gjennomgang, kollapsa elles
29: 627: // Comparator-rader: ved krev_gjennomgang, auto-utvid rader med
30: 643: // Controller-kortet men ikkje nådd Action bar nedst. Sentinel-divs vert
31: 662: // sentinel-divs: éin under Controller-kortet, éin over Action bar.
32: 663: // - Controller-sentinel ute av view (top) → studenten har scrolla forbi
33: 806: // — handleStartCalculation samanliknar med lastCompletedRef og avgjer om
34: 858: // No samanliknar vi mot snapshot lagra i pipelinen ved fullført beregning.
35: 911: // === STEG 1: Engineer Engineer A and Engineer B parallelt via SSE-streaming ===
36: 913: // i state — useEffect under Promise.all triggar deretter Comparator+
37: 914: // Controller-pipeline. Om éin agent feilar, viser MissionControl
38: 967: // viser MissionControl retry-UI og use kan re-prøve. Comparator +
39: 968: // Controller-pipeline blir trigga av useEffect under når BÅDE
40: 996: // Comparator + Controller-pipeline (#2): trigga automatisk når begge
41: 997: // engineers har levert resultat. Dette gjer retry-flyten transparent
42: 1016: // STEG 2: Comparator
43: 1030: console.error("Comparator feila:", dataC.error);
44: 1031: setError(`Comparator feila: ${dataC.error}. Viser Engineer A and Engineer B utan samanlikning.`);
45: 1037: // STEG 3: Controlleren
46: 1053: console.error("Controller feila:", dataD.error);
47: 1079: // over automatisk trigge Comparator+Controller-pipeline.
48: 1238: /* === RESULTAT-SIDE ANIMASJONAR (#anim-01..05) ===
49: 1485: {/* Slått saman skjerm 1 (input) + skjerm 2 (Tolkar-resultat) til éin side.
50: 1651: avgjerder. Lågmæl visuell intensitet — ein påminning, ikkje
51: 1870: {WB_LABELS.lavTillit[locale]}
54: 2: Ultimate Engineeren — designsystem
55: 655: HEADER — global, brand-forward (Workbench + alle hovudsider)
56: 724: /* AI-disclaimer-chip — erstattar dei store VIKTIG MERKNAD-blokkene
59: 28: .admin-aside-label,
60: 51: .admin-hero-aside p {
61: 56: .admin-hero-aside {
62: 64: .admin-hero-aside strong {
65: 20: asideLabel: string;
66: 21: asideTitle: string;
67: 22: asideText: string;
68: 31: "Samlet inngang til intern drift, kvalitet, læring og feiloppfølging. Bruk denne siden i stedet for å skrive admin-URL-er manuelt.",
69: 32: asideLabel: "Aktiv rolle",
70: 33: asideTitle: "Faglig og operativ kontroll",
71: 34: asideText: "Ingen autonom produksjonsendring uten eksplisitt godkjenning.",
72: 75: asideLabel: "Aktiv rolle",
73: 76: asideTitle: "Fagleg og operativ kontroll",
74: 77: asideText: "Inga autonom produksjonsendring utan eksplisitt godkjenning.",
75: 127: <div className="admin-hero-aside">
76: 128: <span className="admin-aside-label">{T.asideLabel}</span>
77: 129: <strong>{T.asideTitle}</strong>
78: 130: <p>{T.asideText}</p>
81: 237: Engineeren — Admin
84: 98: avgTillitScore: number | null;
85: 99: lowTillitReports: number;
86: 203: approved: "Godkjent",
87: 210: severity: { low: "lav", medium: "middels", high: "høy", critical: "kritisk" },
88: 211: effort: { small: "liten", medium: "middels", large: "stor" },
89: 212: risk: { low: "lav", medium: "middels", high: "høy" },
90: 261: heroText: "Samler pipeline-, produkt-, kostnads-, markeds- og prisingssignal fra Supabase og lager en daglig forbedringsrapport. Siden følger aktivt språkvalg og temaene Slate, Stone og Graphite.",
91: 282: trust: "Tillit",
92: 296: approved: "Godkjent",
93: 303: severity: { low: "låg", medium: "middels", high: "høg", critical: "kritisk" },
94: 304: effort: { small: "liten", medium: "middels", large: "stor" },
95: 305: risk: { low: "låg", medium: "middels", high: "høg" },
96: 375: trust: "Tillit",
97: 859: <MetricCard label={labels.trust} value={selectedReport.metrics.quality.avgTillitScore ?? "—"} hint={labels.average} />
100: 51: "AI-disclaimer og fagperson-kontroll er synlig",
101: 64: "AI-disclaimer og fagpersonkontroll er synleg",
102: 129: pilotStart: "Pilotstartside",
103: 158: dailyDisagreement: "Comparator-usemje",
104: 185: admin: { label: "Admin-dashboard klart", description: "Adminsidene må være tilgjengelige for oppfølging av pilot, feil og intelligence." },
105: 187: localeTheme: { label: "Språk og tema manuelt testet", description: "Bokmål/nynorsk og Slate/Stone/Graphite bør sjekkes på pilot- og adminsidene." },
106: 188: deploy: { label: "Production deploy verifisert", description: "Produksjonslenke, login og miljøvariabler må kontrolleres før deling." },
107: 203: pilotStart: "Pilotstartside",
108: 232: dailyDisagreement: "Comparator-usemje",
109: 259: admin: { label: "Admin-dashboard klart", description: "Adminsidene må vere tilgjengelege for oppfølging av pilot, feil og intelligence." },
110: 261: localeTheme: { label: "Språk og tema manuelt testa", description: "Bokmål/nynorsk og Slate/Stone/Graphite bør sjekkast på pilot- og adminsidene." },
112: ## app/api/admin/backfill-tillit/route.ts
113: 2: * Backfill-endepunkt for tillit-score-rekalkulering (dag 16).
114: 5: * reports.tillit_breakdown.components, kjører calculateTillitScore()
115: 6: * med gjeldande formel og UPDATE-ar tillit_score + tillit_breakdown.
116: 10: *   2. POST localhost:3000/api/admin/backfill-tillit
117: 21: calculateTillitScore,
118: 25: } from "@/lib/tillit-score";
119: 67: .select("id, document_id, tillit_score, tillit_breakdown")
120: 80: const breakdown = report.tillit_breakdown as
121: 89: old_score: report.tillit_score,
... 1401 more hits omitted in this file

## docs/intelligence-agent-sprint23.md
40: ### Adminside
118: - Berre lågrisiko-endringar kan køyrast automatisk.

## docs/intelligence-agent-sprint24.md
10: - godkjent
47: 4. Marker eit forslag som godkjent, avvist, planlagt, implementert eller verifisert.

## docs/intelligence-agent-sprint26.md
45: - kan valfritt lage implementeringsplanar for godkjente/planlagde lågrisiko-forslag

## docs/international-sprint32.md
12: - Engineer A/B får same kontekst som Tolkar.
13: - Comparator og Controller får same kontekst.
14: - Rapportør får same kontekst frå rapportloading-komponenten.

## docs/international-sprint33-2-render-cleanup.md
15: - `Gitte data` → `Given data`
16: - `Forutsetninger` → `Assumptions`
17: - `Stegvis beregning` / `STEG` → `Step-by-step calculation` / `STEP`
19: - `Merknader` → `Notes`
20: - `TILLIT-SKÅR` → `TRUST SCORE`
21: - `VIKTIG MERKNAD` → `IMPORTANT NOTE`
25: - `Side` → `Page`

## docs/international-sprint33-3-calculation-sheet-localization.md
45: 4. Calculation sheet DOCX/PDF/LaTeX no longer shows `BEREGNINGSARK`, `Gitte data`, `Forutsetninger`, `Stegvis beregning`, `Resultater`, `Merknader` for AISC/ASCE run.

## docs/pilot-readiness-sprint30-locale-theme-fix.md
22: 1. `useLocale()` or server-side locale resolution.

## docs/report-engine-v4-sprint12.md
5: Rapportane skal ha ein konkret fagleg tittel i staden for generisk «Beregningsnotat».

## docs/report-engine-v4-sprint13.md
24: - Forsida use kort statusoppsummering utan ellipsis i staden for å klippe lang kontrollørtekst.

## docs/report-engine-v4-sprint2-summary.md
30: - forside-resultat blir listeliknande, ikkje tabellskvist
48: - QR-kode på første side
49: - Nøkkelresultat på første side
51: - Kontroll/signatur på siste side

## docs/report-engine-v4-sprint2.md
16: - Pipeline-status, tillit, disclaimer, kontrolløravgjerd og signaturfelt kjem frå same rapportmodell.
25: - Print-overrides som gjer forsideresultat mindre skvist.
27: - Store tekniske seksjonar får bryte naturleg over sider.
28: - Tabellrader og små kort blir haldne samla, men heile store seksjonar blir ikkje låste til éi side.
49: - QR-kode på første side
50: - Nøkkelresultat på første side
59: - PDF kan seinare få eigen server-side Playwright-route for meir deterministisk eksport.

## docs/report-engine-v4-sprint4.md
8: - Deduping av like resultat frå Engineer Engineer A and Engineer B når agentane use ulike nøkkelvariantar.

## docs/report-engine-v4-sprint6.md
8: - konstruktørkontroll-tabellen

## docs/report-engine-v4-sprint7.md
10: 2. eigen forside i PDF
45: Print-CSS tvingar no første seksjon etter forsida til ny side:
48: .rapport-forside + .rapport-section {
53: Dette gjer forsida meir bevisst som ein rapportforside med QR, metadata, nøkkelresultat, tillit og disclaimer.
72: - PDF side 1 er ei rein forside.
74: - Sammendrag startar på neste side.

## docs/report-engine-v4-sprint9.md
7: - Forside-teksten frå Controller blir avgrensa til ei kort leveranseoppsummering.
8: - Full kontrollørtekst ligg framleis i § 04.2 og i pipeline/nettversjon.
18: 2. Oppgåve 3: forsida skal ikkje klippe lang kontrollørtekst.

## docs/report-engine-v4.md
20: - Koden eig layout, QR, sideskift, tabellar og signaturfelt.

## docs/sprint33-4-final-international-polish.md
8: 2. Calculation sheet Word/PDF footer: `Side` -> `Page` when `displayLanguage = en`.
11: 5. Generated text polish: `Engineer A/B` -> `Engineer A/B`, `Comparator` -> `Comparator`, `PRELIMINARY` -> `PRELIMINARY`, etc.
19: - Calculation sheet PDF/DOCX use `Page`, not `Side`, in English context.

## docs/sprint33-5-final-english-polish-guard.md
8: - `BEREGNINGSNOTAT` -> `CALCULATION NOTE`
9: - `DOKUMENT-ID` -> `DOCUMENT ID`
10: - `MIDDELS` -> `MEDIUM`
11: - `Rapportør` -> `Reporter`
12: - `PRELIMINARY` -> `PRELIMINARY`
14: 2. Word report status/tillit polish:
15: - `TILLIT-SKÅR` -> `TRUST SCORE`
16: - `VIKTIG MERKNAD` -> `IMPORTANT NOTE`
17: - `Delvis klar`, `Høy`, `Middels`, `Mindre avvik`, `Med advarsel` -> English equivalents.
20: - `Engineer A/B` -> `Engineer A/B`
21: - `Comparator` -> `Comparator`
22: - `METODISKE FORSKJELLER` -> `METHODOLOGICAL DIFFERENCES`
23: - `FORSKJELLER I FORUTSETNINGER` -> `ASSUMPTION DIFFERENCES`

## docs/pilot/invitasjon-mal.md
17: på kvar rapport-side. Det er feedbacken eg treng mest.

## lib/anthropic-errors.ts
8: //     const { message, status } = formatAnthropicError(err, "Engineer A", locale);
13: // - 529 Overloaded — Anthropic-side metning (Anthropic er ute, ikkje vår feil)
65: * @param agentName Norsk namn på agenten ("Engineer A", "Tolkar", ...)
80: // 529 Overloaded — Anthropic-side metning, transient

## lib/format.ts
18: // ═══ MATCH-STATUS (Comparator) ════════════════════════════
23: match: "Both engineers er enige",
29: match: "Both engineers er einige",
38: match: "Enige",
57: " Det er betydelige forskjeller mellom svarene — se Controllerens vurdering nedenfor.",
65: " Det er betydelege forskjellar mellom svara — sjå Controlleren si vurdering nedanfor.",
96: // ═══ DECISION-STATUS (Controller) ══════════════════════════
101: approved: "Foreløpig godkjent",
102: approved_with_warnings: "Godkjent med advarsler",
104: rejected: "Avvist — må kontrolleres",
108: approved: "Førebels godkjent",
109: approved_with_warnings: "Godkjent med åtvaringar",
118: approved: "Godkjent",
125: approved: "Godkjent",
155: high: "Høy",
156: medium: "Middels",
157: low: "Lav",
161: medium: "Middels",
162: low: "Låg",
178: // ═══ SEVERITY (Feilrapport + Comparator) ═══════════════════
184: low: "Lav",
185: medium: "Middels",
186: high: "Høy",
190: low: "Låg",
191: medium: "Middels",
288: * agent_e_v0.3 → Rapportør v0.3.
291: * Språknøytral — "Rapportør" er stadnamn for rolla, ikkje ein term som
297: if (match) return `Rapportør ${match[1]}`;

## lib/locale.ts
34: assumptioner, advarsler eller andre tekstfelt. JSON-nøkler holdes på det som
43: assumptioner, åtvaringar eller andre tekstfelt. JSON-nøklar held seg på det som
83: // ═══ CLIENT-SIDE HELPER ═════════════════════════════════════
109: // ═══ SERVER-SIDE COOKIE HELPER ════════════════════════════════
111: // locale frå cookie. Klient-side use useLocale() i staden.

## lib/marginalia-katalog.ts
10: * Nøklane skal matche keys frå Engineer-agentane sine `results` og
58: // Agent-konstruktørane use ofte samanslått "Ed" i staden for "E_d".
129: f_ctm:             { description: "middels strekkfastheit, betong", unit: "N/mm²" },

## lib/models.ts
4: * QA-spec P7: modellen er config, aldri hardkoda. Tidlegare låg strengen

## lib/partial-json.ts
99: const inside = arrEnd > 0 ? arrContent.slice(0, arrEnd) : arrContent;
104: while ((m = itemRegex.exec(inside)) !== null) {
121: const inside = objEnd > 0 ? objContent.slice(0, objEnd) : objContent;
126: while ((m = keyValRegex.exec(inside)) !== null) {
148: const inside = arrayEnd > 0 ? stepsText.slice(0, arrayEnd) : stepsText;
152: while ((m = TITLE_REGEX.exec(inside)) !== null) {

## lib/runrecord.ts
55: samanliknar: unknown | null;

## lib/step-metrics.ts
61: /** Sett for konstruktør/samanliknar/kontrollør/rapportør. */
65: /** tolkar | konstruktor_a | konstruktor_b | samanliknar | kontrollor | rapportor */

## lib/stream-agent.ts
2: * Generisk SSE-konsument for streaming agent-routes (Tolkar, Engineer A/B,
3: * Rapportør).
10: * - `cached`        — for Rapportør: rapporten var i cache, complete kjem
13: *                     thinking: enabled — Rapportør sin Agent E)
96: // For Rapportør: heile full-respons-objektet (report, run,
97: // agentA, agentB, ...) er i parsed. For Engineer A/B

## lib/tillit-score.test.ts
3: calculateTillitScore,
4: tillitVisuals,
6: } from "@/lib/tillit-score";
8: describe("calculateTillitScore — komponentar", () => {
9: it("full semje + godkjent + alt rekna = 100", () => {
10: const r = calculateTillitScore({
26: const r = calculateTillitScore({
36: const r = calculateTillitScore({
46: it("avvist kontrollør gir 0 på den komponenten", () => {
47: const r = calculateTillitScore({
67: const r = calculateTillitScore({
78: const r = calculateTillitScore({
89: const r = calculateTillitScore({
99: describe("tillitVisuals — score til label/farge", () => {
101: expect(tillitVisuals(100).labelKey).toBe("high");
102: expect(tillitVisuals(90).labelKey).toBe("high");
103: expect(tillitVisuals(89).labelKey).toBe("good");
104: expect(tillitVisuals(75).labelKey).toBe("good");
105: expect(tillitVisuals(74).labelKey).toBe("medium");
106: expect(tillitVisuals(50).labelKey).toBe("medium");
107: expect(tillitVisuals(49).labelKey).toBe("low");
108: expect(tillitVisuals(0).labelKey).toBe("low");
112: expect(tillitVisuals(100, "nn").label).toBe("Høg");
113: expect(tillitVisuals(100, "nb").label).toBe("Høy");

## lib/tillit-score.ts
4: * Tillit-score-kalkulator for Pilar.
6: * Score-formelen måler AI-PIPELINE-TILLIT — kor mykje vi kan stole på
7: * AI-agentane sitt arbeid. Fagperson-signering er ein separat dimensjon
19: *   50-74   Middels  okrer     (#B0822E)
20: *   0-49    Låg      raud      (#8B2331)
23: export const FORMULA_VERSION = "v0.2-no-fagperson";
37: export type TillitLabelKey = "high" | "good" | "medium" | "low";
38: export type TillitLabel = "Høg" | "God" | "Middels" | "Låg" | "Høy" | "God" | "Middels" | "Lav";
39: export type TillitColor = "#1F5945" | "#4F8B6E" | "#B0822E" | "#8B2331";
41: export interface TillitInput {
50: export interface TillitBreakdown {
51: /** Komponent 1 — Engineer-semje, 0-35 */
53: /** Komponent 2 — Controller-verdict, 0-35 */
86: * Reknar tillit-score frå pipeline-output. Determinisk og rein matematikk —
89: export function calculateTillitScore(input: TillitInput): TillitBreakdown {
122: const TILLIT_LABELS_BY_LOCALE: Record<Locale, Record<TillitLabelKey, string>> = {
123: nb: { high: "Høy", good: "God", medium: "Middels", low: "Lav" },
124: nn: { high: "Høg", good: "God", medium: "Middels", low: "Låg" },
127: export function tillitVisuals(
132: color: TillitColor;
133: labelKey: TillitLabelKey;
135: const labels = TILLIT_LABELS_BY_LOCALE[locale];

## lib/calc/load-combination.ts
5: * Rein, sideeffektfri funksjon — same rolle for lastkombinasjon som
10: *  - Controller (agent_d) — uavhengig re-rekning som fangar

## lib/check/controller-hard-block.test.ts
14: controller_notes: "Both engineers samde, NA-verdiar korrekte.",
113: expect(notes).toContain("Both engineers samde");

## lib/check/controller-hard-block.ts
2: * Lag 2 — kode-tvungen verdikt-grense for Controller (agent_d).
7: * uansett kva LLM-Controlleren konkluderte. Fangar A2-klassen (F11): eit
8: * gale svar presentert som godkjent.
16: * Controller-avgjerda slik ho kjem frå LLM-en (JSON.parse-resultat).
56: * Bruker den kode-tvungne verdikt-grensa på ei Controller-avgjerd.
87: `Approved er ikkje tillate her. Opphavleg Controller-grunngiving: ` +

## lib/check/load-combination-check.test.ts
19: // Engineer-output der dimensjonerande verdi ligg under ein vald,
27: it("flags A2-feilen: konstruktør rapporterer 23,78 (ekv. 6.10)", () => {
41: it("flags begge engineers når begge bommar", () => {
67: it("ingen avvik når konstruktøren ikkje rapporterte Ed_dim", () => {

## lib/check/load-combination-check.ts
2: * Deterministisk kombinasjonsstruktur-sjekk for Controller (agent_d).
5: * laster via load-combination.ts, og samanliknar mot den dimensjonerande
6: * verdien Ed_dim kvar konstruktør rapporterte. Fangar A2-klassen: ekv. 6.10
25: /** Ed_dim konstruktøren rapporterte. */
51: * til eitt bokstavleg nøkkelnamn (A0 viste at engineers varierer:
76: `[load-combination-check] Engineer ${agent}: fleire result_roles-` +
86: `[load-combination-check] Engineer ${agent}: fann korkje "Ed_dim" ` +
94: * Sjekkar STR-lastkombinasjonen til begge engineers mot ei deterministisk
95: * re-rekning. Returnerer eitt avvik per konstruktør som bommar.

## lib/compare/consistency-issues.ts
2: * FIKS 5 (F3): normalisering av internal_consistency_issues frå Comparator.
5: * internal_consistency_issues. Ein inkonsistens-fri konstruktør skal gi ei
11: * only reelle inkonsistensar står att. Rein, sideeffektfri.

## lib/compare/result-compare.ts
2: * Deterministisk samanlikning av to konstruktør-resultatsett.
4: * Same rolle for Comparator (agent_c) som load-combination.ts har for
5: * Controller: taljamføringa skal reknast i kode, ikkje av ein språkmodell.
6: * Ein LLM som «samanliknar» tal kan finne på semje på ein nøkkel only éin
7: * konstruktør rapporterte (F1), eller behandle avrundingsformat ulikt (F9).
11: * skil ut nøklar only éin side rapporterte. Rein, sideeffektfri.
34: /** Eitt para felt — rapportert av BEGGE engineers. */
36: /** Engineer A si skrivemåte av nøkkelen (kanonisk for visning). */
38: /** Rå verdi frå Engineer A and Engineer B (slik konstruktøren skreiv dei). */
54: /** Nøklar only Engineer A rapporterte (A si skrivemåte). */
56: /** Nøklar only Engineer B rapporterte (B si skrivemåte). */
61: * Comparator to results-objekt deterministisk.
63: * Para nøklar får eit ekte relativt avvik. Nøklar only éin side rapporterte

## lib/engineering-context/agent.ts
38: "- Do not use Norwegian labels such as Engineer, Comparator/Comparator, Controller, beregningsnotat, fagperson in English output.",

## lib/intelligence/generate-report.ts
144: "Usikre eller avviste kontrollørvedtak",
145: `${snapshot.counts.controllerUncertainOrRejected} av ${snapshot.counts.controllerTotal} kontrollørvedtak var usikre eller avviste (${uncertaintyRate} %).`,
153: "Analyser usikre kontrollørvedtak",
154: "Gå gjennom usikre og avviste rapportar frå dagen. Finn om årsaka er manglande input, feil standarddata, agent-usemje eller for streng/for mild kontrollørlogikk.",
156: "Reduserer fagleg risiko og gjer kontrolløragenten meir presis over tid.",
167: "Engineer A/B hadde avvik",
177: "Samle dei vanlegaste variablane der Engineer Engineer A and Engineer B er usamde. Prioriter variablar som materialfaktorar, lastkombinasjonar, skjærareal og LTB-relaterte antakingar.",
186: if (snapshot.quality.avgTillitScore !== null) {
190: "Gjennomsnittleg tillit-score",
191: `Gjennomsnittleg tillit-score for rapportar i dag var ${snapshot.quality.avgTillitScore}/100. ${snapshot.quality.lowTillitReports} rapportar låg under 70.`,
192: snapshot.quality.avgTillitScore < 70 ? "high" : "low",
193: "reports.avg_tillit_score",
226: "Gå gjennom nye feilrapportar og knyt dei til konkrete pipeline-steg: input, A/B, samanliknar, kontrollør, rapport eller eksport.",
240: "Agenten fann ikkje tabell for cost_events. Kostnad per run, per agent og per godkjent rapport kan difor ikkje analyserast enno.",
350: `${snapshot.counts.controllerUncertainOrRejected} kontrollørvedtak var usikre eller avviste, og ${snapshot.counts.comparisonsWithDeviation} A/B-samanlikningar hadde avvik.`,

## lib/intelligence/implementation-plan.ts
124: if (includesAny(text, ["kontrollør", "usikker", "avvik", "risiko"])) areas.push("quality_control");
138: if (includesAny(text, ["agent", "prompt", "kontrollør", "beregning", "standard", "eurokode"])) {
164: doneWhen: "Du veit kvar endringa høyrer heime, og har unngått å endre urelaterte delar.",
196: tests.push("Test eit tilfelle med A/B-avvik og sjekk at Controller ikkje overgodkjenner.");
217: "Endringa er avgrensa til tiltaket som vart godkjent.",

## lib/intelligence/metrics.ts
144: "id, run_id, document_id, tillit_score, prompt_version, created_at",
226: const avgTillitScore = averageNumeric(reports.rows, "tillit_score");
227: if (avgTillitScore !== null) metric(metrics, "reports.avg_tillit_score", avgTillitScore, "reports");
229: const lowTillitReports = countWhere(reports.rows, (row) => {
230: const score = row.tillit_score;
233: metric(metrics, "reports.low_tillit", lowTillitReports, "reports");
281: avgTillitScore,
282: lowTillitReports,

## lib/intelligence/render-markdown.ts
54: approved: "Godkjent",
142: `| Usikker/avvist kontrollør | ${counts.controllerUncertainOrRejected} |`,
146: `| Gj.snitt tillit | ${quality.avgTillitScore ?? "—"} |`,
147: `| Låg tillit | ${quality.lowTillitReports} |`,

## lib/intelligence/types.ts
122: avgTillitScore: number | null;
123: lowTillitReports: number;

## lib/international/display.ts
9: .replace(/\bBEREGNINGSNOTAT\b/g, "CALCULATION NOTE")
11: .replace(/\bDOKUMENT-ID\b/g, "DOCUMENT ID")
12: .replace(/\bRapportør\b/g, "Reporter")
13: .replace(/\bTILLIT-SKÅR\b/g, "TRUST SCORE")
14: .replace(/\bVIKTIG MERKNAD\b/g, "IMPORTANT NOTE")
15: .replace(/\bMIDDELS\b/g, "MEDIUM")
16: .replace(/\bHØY\b/g, "HIGH")
18: .replace(/\bLAV\b/g, "LOW")
22: .replace(/\bGodkjent med advarsler\b/g, "Approved with warnings")
23: .replace(/\bPRELIMINARY\b/g, "PRELIMINARY")
24: .replace(/\bForeløpig\b/g, "Preliminary")
25: .replace(/Beregningen er foreløpig godkjent med advarsler\. Forbeholdene må avklares før prosjekteringsbruk\./gi, "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.")
26: .replace(/Beregningen er foreløpig godkjent med advarsler\. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering\./gi, "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.")
27: .replace(/Må kontrolleres av fagperson før bruk i prosjektering\./gi, "Must be checked by a qualified professional before use in design work.")
28: .replace(/må kontrolleres av fagperson før bruk i prosjektering/gi, "must be checked by a qualified professional before use in design work")
29: .replace(/\bEngineer A\b/g, "Engineer A")
30: .replace(/\bEngineer B\b/g, "Engineer B")
31: .replace(/\bEngineer\b/g, "Engineer")
32: .replace(/\bComparator\b/g, "Comparator")
33: .replace(/\bComparator\b/g, "Comparator")
34: .replace(/\bController\b/g, "Controller")
35: .replace(/\bFaglig merknad\b/gi, "Engineering note")
36: .replace(/\bANTAKELSER & ADVARSLER\b/g, "ASSUMPTIONS & WARNINGS")
37: .replace(/\bMETODISKE FORSKJELLER\b/g, "METHODOLOGICAL DIFFERENCES")
38: .replace(/\bFORSKJELLER I FORUTSETNINGER\b/g, "ASSUMPTION DIFFERENCES")
39: .replace(/\bSkjul merknader\b/g, "Hide notes")
73: .replace(/\bBEREGNINGSNOTAT\b/g, "CALCULATION NOTE")
74: .replace(/\bBEREKNINGSNOTAT\b/g, "CALCULATION NOTE")
77: .replace(/\bDOKUMENT-ID\b/g, "DOCUMENT ID")
78: .replace(/\bRapportør\b/g, "Reporter")
79: .replace(/\bTILLIT-SKÅR\b/g, "TRUST SCORE")
80: .replace(/\bVIKTIG MERKNAD\b/g, "IMPORTANT NOTE")
81: .replace(/\bMIDDELS\b/g, "MEDIUM")
82: .replace(/\bMiddels\b/g, "Medium")
83: .replace(/\bHØY\b/g, "HIGH")
84: .replace(/\bHøy\b/g, "High")
86: .replace(/\bLAV\b/g, "LOW")
87: .replace(/\bLav\b/g, "Low")
91: .replace(/\bGodkjent med advarsler\b/g, "Approved with warnings")
92: .replace(/\bPRELIMINARY\b/g, "PRELIMINARY")
93: .replace(/\bForeløpig\b/g, "Preliminary")
94: .replace(/Beregningen er foreløpig godkjent med advarsler\. Forbeholdene må avklares før prosjekteringsbruk\./gi, "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.")
95: .replace(/Beregningen er foreløpig godkjent med advarsler\. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering\./gi, "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.")
98: .replace(/Må kontrolleres av fagperson før bruk i prosjektering\./gi, "Must be checked by a qualified professional before use in design work.")
99: .replace(/må kontrolleres av fagperson før bruk i prosjektering/gi, "must be checked by a qualified professional before use in design work")
100: .replace(/\bEngineer A\b/g, "Engineer A")
101: .replace(/\bEngineer B\b/g, "Engineer B")
102: .replace(/\bEngineeren\b/g, "the engineer")
103: .replace(/\bEngineer\b/g, "Engineer")
104: .replace(/\bComparator\b/g, "Comparator")
105: .replace(/\bComparator\b/g, "Comparator")
106: .replace(/\bController\b/g, "Controller")
107: .replace(/\bFaglig merknad\b/gi, "Engineering note")
108: .replace(/\bANTAKELSER & ADVARSLER\b/g, "ASSUMPTIONS & WARNINGS")
109: .replace(/\bMETODISKE FORSKJELLER\b/g, "METHODOLOGICAL DIFFERENCES")
110: .replace(/\bFORSKJELLER I FORUTSETNINGER\b/g, "ASSUMPTION DIFFERENCES")
111: .replace(/\bSkjul merknader\b/g, "Hide notes")
112: .replace(/\bSkjul vurderingen\b/g, "Hide assessment")
119: .replace(/\bLåg\b/g, "Low")
121: .replace(/\bprosjektering\b/gi, "design work")
122: .replace(/\bfagperson\b/gi, "qualified professional");
241: .replace(/\bEngineer A\b/g, "Engineer A")
242: .replace(/\bEngineer B\b/g, "Engineer B")
243: .replace(/\bEngineerane\b/g, "the engineers")
244: .replace(/\bEngineerene\b/g, "the engineers")
245: .replace(/\bControllerens\b/g, "Controller's")
246: .replace(/\bControlleren\b/g, "the Controller")
247: .replace(/\bController\b/g, "Controller")
248: .replace(/\bComparator\b/g, "Comparator")
249: .replace(/\bComparator\b/g, "Comparator")
250: .replace(/\bFagperson\b/g, "Professional reviewer")
251: .replace(/\bforeløpig godkjent\b/gi, "preliminarily approved")
252: .replace(/\bførebels godkjend\b/gi, "preliminarily approved")
253: .replace(/\bprosjektering\b/gi, "design work");

## lib/json/extract-json.test.ts
23: it("keeps braces inside strings", () => {
24: const result = parseJsonWithFallback('Tolkar:\n{"text":"value with { brace } inside","status":"klar"}\nDone');
26: if (result.ok) expect(result.value).toEqual({ text: "value with { brace } inside", status: "klar" });

## lib/pilot/completeness.ts
32: "Stålbjelker uten dokumentert sideavstivning kan være styrt av lateral-torsjonal vipping. Kontroller dette før bruk i dimensjonering.",

## lib/profiles/na-basis.ts
2: * NA-grunnlag for Pilar-konstruktørane (agent_a / agent_b).
9: * GJELD BEGGE KONSTRUKTØRAR. B vel framleis sjølv løysingsmetode (numerisk,
16: * fagperson FØR omfanget blir utvida — funksjonane kastar heller enn å gjette.
91: `pilotomfang — fagperson må leggje til verdien.`,
137: `av EC3 tabell 6.2 for valsa I-profil — fagperson må vurdere.`
155: // Both engineers OG ξ_lim-sjekken skal bruke denne normaliseringa.
171: "NA-GRUNNLAG — AUTORITATIVE VERDIAR (gjeld både Engineer Engineer A and Engineer B)\n" +
230: * Bygg NA-grunnlag-blokka for innsprøyting i konstruktør-prompten.

## lib/profiles/steel-profiles.ts
2: * Stålprofil-database for Ultimate Engineeren.
8: * for noko som skal til prosjektering. Små variasjonar mellom kjelder førekjem.

## lib/report/build-report-model.test.ts
11: conclusion: "Resultatet må kontrolleres av fagperson før bruk.",
14: tillit_score: 100,
15: tillit_breakdown: null,
55: user_message: "Beregningen er godkjent for visning.",

## lib/report/build-report-model.ts
11: import { tillitVisuals, type TillitBreakdown } from "@/lib/tillit-score";
59: tillit_score: number | null;
60: tillit_breakdown: TillitBreakdown | null;
89: title: { nb: "Beregningsnotat", nn: "Berekningsnotat", en: "Calculation note" },
90: subtitle: { nb: "AI-generert beregningsnotat", nn: "AI-generert berekningsnotat", en: "AI-generated calculation note" },
98: konstruktorA: { nb: "Engineer A", nn: "Engineer A", en: "Engineer A" },
99: konstruktorB: { nb: "Engineer B", nn: "Engineer B", en: "Engineer B" },
101: kontrollor: { nb: "Controller", nn: "Controller", en: "Controller" },
102: fagperson: { nb: "Fagperson", nn: "Fagperson", en: "Professional reviewer" },
109: if (["approved", "match", "klar", "high", "ok", "godkjent"].some((token) => normalized.includes(token))) return "ok";
110: if (["warning", "warnings", "minor", "medium", "delvis", "foreløpig"].some((token) => normalized.includes(token))) return "warning";
272: { label: LABELS.fagperson[displayLanguage], value: LABELS.ikkjeKontrollert[displayLanguage], status: "warning" },
416: const tillit = data.report.tillit_score === null || data.report.tillit_score === undefined
418: : tillitVisuals(data.report.tillit_score, locale);
487: score: data.report.tillit_score ?? null,
488: label: displayLanguage === "en" ? sprint335PolishEnglishText(tillit.label) : tillit.label,
489: tone: displayLanguage === "en" ? sprint335PolishEnglishText(tillit.labelKey) : tillit.labelKey,
490: breakdown: data.report.tillit_breakdown ?? null,

## lib/report/calculation-sheet-model.ts
325: //     Berre reine identifikatorar paa begge sider — IKKJE uttrykk
422: if (/\b(dette|den|det|styrende|ligning|likning|innsetting|for|ved|norsk|useen|maksimal|maksimalt|kontrollør|tolkar)\b/i.test(lhs)) return false;

## lib/report/render-calculation-docx.ts
38: documentId: { nb: "Dokument-ID", nn: "Dokument-ID", en: "Document ID" },
42: given: { nb: "Gitte data", nn: "Gjevne data", en: "Given data" },
43: assumptions: { nb: "Forutsetninger", nn: "Føresetnader", en: "Assumptions" },
44: calculation: { nb: "Stegvis beregning", nn: "Stegvis berekning", en: "Step-by-step calculation" },
46: notes: { nb: "Merknader", nn: "Merknader", en: "Notes" },
48: nb: "Generert av PILAR. Beregningen skal kontrolleres av ansvarlig fagperson før bruk.",
49: nn: "Generert av PILAR. Berekninga skal kontrollerast av ansvarleg fagperson før bruk.", en: "Generated by PILAR. The calculation must be checked by a qualified professional before use."
55: page: { nb: "Side", nn: "Side", en: "Page" },

## lib/report/render-calculation-latex.ts
12: const nb = { given: "Gitte data", assumptions: "Forutsetninger", calculation: "Stegvis beregning", results: "Resultater", notes: "Merknader", step: "Steg" };
13: const nn = { given: "Gjevne data", assumptions: "Føresetnader", calculation: "Stegvis berekning", results: "Resultat", notes: "Merknader", step: "Steg" };
120: lines.push("% Hugs manuell kontroll av ansvarleg fagperson før bruk i prosjektering.");
134: : `\\noindent\\textbf{Dokument-ID:} ${documentId}\\quad\\textbf{Dato:} ${date}`);
139: lines.push(`\\subsection{${isEnglishDisplayLanguage(D) ? "Given data" : isEnglishDisplayLanguage(D) ? "Given data" : L === "nn" ? "Gjevne data" : "Gitte data"}}`);
147: lines.push(`\\subsection{${isEnglishDisplayLanguage(D) ? "Assumptions" : isEnglishDisplayLanguage(D) ? "Assumptions" : L === "nn" ? "Føresetnader" : "Forutsetninger"}}`);
156: lines.push(`\\subsection{${isEnglishDisplayLanguage(D) ? "Step-by-step calculation" : isEnglishDisplayLanguage(D) ? "Step-by-step calculation" : L === "nn" ? "Stegvis berekning" : "Stegvis beregning"}}`);
177: lines.push(`\\subsection{${isEnglishDisplayLanguage(D) ? "Notes" : "Merknader"}}`);

## lib/report/render-docx.ts
44: eyebrow: { nb: "BEREGNINGSNOTAT", nn: "BEREKNINGSNOTAT", en: "CALCULATION NOTE" },
45: documentId: { nb: "Dokument-ID", nn: "Dokument-ID", en: "DOCUMENT ID" },
52: trustScore: { nb: "Tillit-skår", nn: "Tillit-skår", en: "TRUST SCORE" },
54: importantNote: { nb: "Viktig merknad", nn: "Viktig merknad", en: "IMPORTANT NOTE" },
57: input: { nb: "Input og assumptioner", nn: "Input og assumptioner", en: "Input and assumptions" },
58: assumptions: { nb: "Forutsetninger", nn: "Føresetnader", en: "Assumptions" },
60: calculation: { nb: "Stegvis beregning", nn: "Stegvis utrekning", en: "Step-by-step calculation" },
63: warnings: { nb: "Advarsler", nn: "Åtvaringar", en: "Warnings" },
65: constructorControl: { nb: "Engineerkontroll", nn: "Engineerkontroll", en: "Engineer comparison" },
73: notControlled: { nb: "Må kontrolleres av fagperson før bruk i prosjektering.", nn: "Må kontrollerast av fagperson før bruk i prosjektering.", en: "Must be checked by a qualified professional before use in design work." },
77: a: { nb: "Engineer A", nn: "Engineer A", en: "Engineer A" },
78: b: { nb: "Engineer B", nn: "Engineer B", en: "Engineer B" },

## lib/report/report-model.ts
3: import type { TillitBreakdown } from "@/lib/tillit-score";
110: breakdown: TillitBreakdown | null;
141: nb: "AI-generert beregningsnotat. Innholdet er støtte, læringshjelp og foreløpig teknisk vurdering. Det erstatter ikke kontroll utført av kvalifisert fagperson, ansvarlig prosjekterende eller godkjent foretak. Alle beregninger, assumptioner, standardreferanser, materialdata og konklusjoner må kontrolleres før bruk i reelle prosjekter.",
142: nn: "AI-generert berekningsnotat. Innhaldet er støtte, læringshjelp og førebels teknisk vurdering. Det erstattar ikkje kontroll utført av kvalifisert fagperson, ansvarleg prosjekterande eller godkjent føretak. Alle berekningar, assumptioner, standardreferansar, materialdata og konklusjonar må kontrollerast før bruk i reelle prosjekt.",

## lib/report/report-template.ts
14: export type PageBreakPolicy = "always-before" | "avoid-inside" | "allow-break" | "keep-with-next";
27: label: "Forside",
30: printHint: "Side 1: metadata, nøkkelresultat, QR, kort disclaimer.",
36: pagePolicy: "avoid-inside",
41: label: "Input og assumptioner",
44: printHint: "Kan bryte over sider ved lang assumptionsliste.",
50: pagePolicy: "avoid-inside",
55: label: "Stegvis beregning",
65: printHint: "Vanleg tekstseksjon. Skal ikkje tvingast inn på éi side.",
76: label: "Advarsler",
78: pagePolicy: "avoid-inside",
86: printHint: "Controlleravgjerd, samanlikning og pipeline-status.",
92: pagePolicy: "avoid-inside",
93: printHint: "Praktisk sluttekst som speglar kontrollørstatus.",
99: pagePolicy: "avoid-inside",
100: printHint: "Skal ikkje splittast over sider.",

## lib/report/validate-report-model.ts
20: issues.push(issue("error", "missing_document_id", "meta.documentId", "Rapporten manglar dokument-ID."));
41: issues.push(issue("warning", "missing_assumptions", "interpretation.assumptions", "Rapporten har ingen assumptioner."));
50: issues.push(issue("error", "missing_disclaimer", "disclaimer", "Rapporten manglar AI-/fagpersonforbehold."));

## lib/result/formula-extract.tsx
41: // Engineerane returnerer results-keys som "M_Ed", "epsilon_cu3", "psi_0_B"
72: // "kategori" er agent-konstruktørens måte å namnespace ψ-faktorar per
158: // Engineer-agentane produserer ofte fleirlinjes-utrekningar pakka i

## lib/result/kontrollor-chips.test.ts
9: // Minimal Engineer-output der only `warnings` varierer per test.
39: "Her gir q_k som ledende klart høyest Ed (22,88 vs. 20,85 kN/m) — " +
48: describe("FIKS 11 (F15) — kryss-A/B nær-dedup av advarsler", () => {
49: it("kalibrering: A2-paret ligg over terskelen, distinkte advarsler under", () => {
60: it("kollapsar ulikt formulerte A/B-advarsler om same faktum", () => {
69: it("behaldar distinkte B-advarsler som ikkje liknar nokon A-advarsel", () => {
77: it("verbatim-identiske A/B-advarsler blir vist only éin gong", () => {
82: it("nær-dedup gjeld only kryss A↔B, ikkje to liknande frå same konstruktør", () => {
84: // til; begge skal stå att (only verbatim-dedup innan ein konstruktør).

## lib/result/kontrollor-chips.ts
2: * Hjelpefunksjonar for Controller-kortet på Resultat-sida.
5: * - getVerdiktForMatchStatus: 1-linjers verdikt frå Comparator sin match_status
8: * - buildKontrollorChips: bygger chip-arrayet frå agent-output (klient-side)
11: * side frå method_differences, assumption_differences, warnings og manual_
47: // klient-side frå method_differences, assumption_differences, warnings
74: // === FIKS 11 (F15): kryss-konstruktør nær-dedup av advarsler ================
76: // Verbatim-dedupen i steg 3 fangar only identisk ordlyd. Når Engineer A
87: //  - only kryss A↔B. To liknande advarsler frå SAME konstruktør er truleg
89: //  - korte advarsler (< WARNING_NEAR_DUP_MIN_TOKENS token) blir aldri fuzzy-
208: // 3) Warnings frå begge engineers → warn-chip.
210: //    legg til kryss-A/B nær-dedup for ulikt formulerte, men like advarsler.
224: // 3a) Engineer A — verbatim-dedup. Hugs token-sett for nær-dedup i 3b.
235: // 3b) Engineer B — verbatim-dedup + nær-dedup mot behaldne A-advarsler.

## lib/result/labels.ts
38: antakingar: { nb: "Antakelser", nn: "Antakingar" },
44: inputstatusExplanation: { nb: "Pilar si vurdering av hvor klar oppgaven er til å beregnes. 'Klar' = all info på plass. 'Delvis klar' = Pilar har gjort rimelige antakelser (synlig ovenfor) som du kan justere før du starter. Andre statuser trenger mer input eller faller utenfor pilot-versjonen.", nn: "Pilar si vurdering av kor klar oppgåva er til å reknast. 'Klar' = all info på plass. 'Delvis klar' = Pilar har gjort rimelege antakingar (synleg ovanfor) som du kan justere før du startar. Andre statusar treng meir input eller fell utanfor pilot-versjonen." },
53: lavTillit: { nb: "Lav tillit i tolkningen — sjekk verdiene under før du starter", nn: "Låg tillit i tolkinga — sjekk verdiane under før du startar" },
60: startMedMangler: { nb: "Start beregning · {n} antakelser brukt", nn: "Start berekning · {n} antakingar brukte" },
84: kontrollorAvgjerd: { nb: "Controller — endelig avgjørelse", nn: "Controller — endeleg avgjerd" },
85: kontrollor: { nb: "Controller", nn: "Controller" },
86: kontrollorPopover1: { nb: "Controller-agenten leser både engineers og Comparator, og avgjør om resultatet er trygt nok å vise. Erstatter", nn: "Controller-agenten les både engineers og Comparator, og avgjer om resultatet er trygt nok å vise. Erstattar" },
88: kontrollorPopover3: { nb: "fagperson-kontroll.", nn: "fagperson-kontroll." },
89: sluttkonklusjonUtelaten: { nb: "Sluttkonklusjon utelatt av Controlleren.", nn: "Sluttkonklusjon utelaten av Controlleren." },
90: hallusinasjonarTekst: { nb: "Controlleren identifiserte hallusinasjoner i konstruktørenes kortform-konklusjon. Se Resultat-felt og full utregning under for korrekte verdier.", nn: "Controlleren identifiserte hallusinasjonar i konstruktørane sin kortform-konklusjon. Sjå Resultat-felt og full utrekning under for korrekte verdiar." },
95: foresetnaderBrukt: { nb: "Forutsetninger brukt", nn: "Føresetnader brukt" },
102: atvaringar: { nb: "Advarsler", nn: "Åtvaringar" },
104: konstruktorAKonfidens: { nb: "Engineer A konfidens", nn: "Engineer A konfidens" },
105: konstruktorBKonfidens: { nb: "Engineer B konfidens", nn: "Engineer B konfidens" },
106: konstruktorKonfidens: { nb: "Engineer-konfidens", nn: "Engineer-konfidens" },
107: konstruktorKonfidensPopover: { nb: "Engineerens egenrapporterte sikkerhet på eget svar (high/medium/low). Ikke det samme som Tillit-skåren — måler only én agents tillit til seg selv.", nn: "Engineeren si eigenrapporterte sikkerheit på eige svar (high/medium/low). Ikkje det same som Tillit-skåren — målar only éin agent sin tillit til seg sjølv." },
110: nb: "Engineer A rapporterer HIGH-konfidens: metoden er etablert, alle nødvendige input er gitt, og resultatet er konsistent gjennom utregningen. Egenvurdering — ikke en uavhengig verifikasjon.",
111: nn: "Engineer A rapporterer HIGH-konfidens: metoden er etablert, alle naudsynte input er gitt, og resultatet er konsistent gjennom utrekninga. Eigenvurdering — ikkje ei uavhengig verifisering.",
114: nb: "Engineer B rapporterer HIGH-konfidens in its independent solution. B løste oppgaven uten å se A sitt svar. HIGH means at B er trygg på its own method — at Engineer A and Engineer B er enige er en separat sjekk (see verdict above).",
115: nn: "Engineer B rapporterer HIGH-konfidens in its independent solution. B løyste oppgåva utan å sjå A sitt svar. HIGH her tyder at B er trygg på its own method — at Engineer A and Engineer B er samde er ein separat sjekk (sjå verdikt over).",
118: nb: "Engineer A rapporterer MEDIUM-konfidens: metoden er korrekt, men en eller flere input er antatt eller ekstrapolert. Sjekk assumptionene før du stoler på resultatet.",
119: nn: "Engineer A rapporterer MEDIUM-konfidens: metoden er korrekt, men ein eller fleire input er antatt eller ekstrapolert. Sjekk assumptionene før du stolar på resultatet.",
122: nb: "Engineer B rapporterer MEDIUM-konfidens: B løste oppgaven, men minst én assumption er usikker. Se assumptionene i Engineer B-blokka.",
123: nn: "Engineer B rapporterer MEDIUM-konfidens: B løyste oppgåva, men minst éin assumption er usikker. Sjå assumptionene i Engineer B-blokka.",
126: nb: "Engineer A rapporterer LOW-konfidens: vesentlig usikkerhet i metode eller input. Resultatet bør ikke brukes uten manuell verifikasjon — start gjerne på nytt med mer presise inndata.",
127: nn: "Engineer A rapporterer LOW-konfidens: vesentleg usikkerheit i metode eller input. Resultatet bør ikkje brukast utan manuell verifisering — start gjerne på nytt med meir presise inndata.",
130: nb: "Engineer B rapporterer LOW-konfidens på egen løsning. B er usikker på metode eller input. Manuell faglig kontroll anbefales sterkt.",
131: nn: "Engineer B rapporterer LOW-konfidens på eiga løysing. B er usikker på metode eller input. Manuell fagleg kontroll vert sterkt anbefalt.",
133: // Engineer B-panel
134: konstruktorBUavhengig: { nb: "Engineer B — uavhengig kontroll", nn: "Engineer B — uavhengig kontroll" },
135: loysteOppgavaUtan: { nb: "Løste oppgaven uten å se Engineer A sitt svar", nn: "Løyste oppgåva utan å sjå Engineer A sitt svar" },
136: konstruktorBKonklusjon: { nb: "Engineer B sin konklusjon", nn: "Engineer B sin konklusjon" },
137: konstruktorBResultat: { nb: "Engineer B sine resultater", nn: "Engineer B sine resultat" },
138: // Controller-kort (#02) — verdikt-setningar per match_status og toggle-labels
140: nb: "Engineer Engineer A and Engineer B fully agree om alle design values.",
141: nn: "Engineer Engineer A and Engineer B er fullstendig samde om alle design values.",
144: nb: "Engineer Engineer A and Engineer B har små forskjeller — ingen kritiske avvik.",
145: nn: "Engineer Engineer A and Engineer B har små skilnader — ingen kritiske avvik.",
148: nb: "Engineer Engineer A and Engineer B har vesentlige avvik på design values.",
149: nn: "Engineer Engineer A and Engineer B har vesentlege avvik på design values.",
152: nb: "Engineer Engineer A and Engineer B er ikke enige — manuell gjennomgang trengs.",
153: nn: "Engineer Engineer A and Engineer B er ikkje samde — manuell gjennomgang trengst.",
155: fagligMerknad: { nb: "Faglig merknad", nn: "Fagleg merknad" },
158: fagligGruppeAntakelser: { nb: "Antakelser & advarsler", nn: "Antakingar & åtvaringar" },
159: lesHeileVurderinga: { nb: "Les hele vurderingen fra Controlleren", nn: "Les heile vurderinga frå Controlleren" },
160: skjulVurderinga: { nb: "Skjul vurderingen", nn: "Skjul vurderinga" },
174: nb: "Enig kontroll, ingen advarsler — siden viser kort hovedsvar.",
175: nn: "Enig kontroll, ingen advarsler — sida viser kort hovudsvar.",
178: nb: "Godkjent — detaljer er kollapset, klikk for å utforske.",
179: nn: "Godkjent — detaljar er kollapsa, klikk for å utforske.",
181: profilForklaringStandardMedAdvarsler: {
182: nb: "Godkjent med advarsler — detaljer er kollapset, klikk for å utforske.",
183: nn: "Godkjent med advarsler — detaljar er kollapsa, klikk for å utforske.",
186: nb: "Vesentlige avvik — avvik-rader og merknader er pre-ekspandert.",
187: nn: "Vesentlege avvik — avvik-rader og merknader er pre-ekspandert.",
189: // Engineer B-disclosure (#04) — éin-linjes summary i kollapsa state
190: bUavhengigKontroll: { nb: "Engineer B — uavhengig kontroll", nn: "Engineer B — uavhengig kontroll" },
191: bEnigeMedA: { nb: "ENIGE med A", nn: "ENIGE med A" },
197: // Comparator
198: samanliknarSkilnader: { nb: "Comparator — forskjeller funnet", nn: "Comparator — skilnader funne" },
200: metodiskeSkilnader: { nb: "Metodiske forskjeller", nn: "Metodiske skilnader" },
201: forskjellarForesetnader: { nb: "Forskjeller i assumptioner", nn: "Forskjellar i assumptioner" },
203: // Tabell-headers (Felt, Engineer A, Engineer B, Skilnad, Alvor)
207: // Comparator ekspander-rad (#05)
208: samanliknarKvifor: { nb: "Hvorfor:", nn: "Kvifor:" },
209: samanliknarAVerdi: { nb: "Engineer A", nn: "Engineer A" },
210: samanliknarBVerdi: { nb: "Engineer B", nn: "Engineer B" },
211: generelleMerknader: { nb: "Generelle merknader fra Comparator", nn: "Generelle merknader frå Comparator" },
212: skjulMerknader: { nb: "Skjul merknader", nn: "Skjul merknader" },
214: resultatetForebels: { nb: "Resultatet er foreløpig og må kontrolleres av fagperson.", nn: "Resultatet er førebels og må kontrollerast av fagperson." },

## lib/result/profile.ts
3: * på Controller si avgjerd, Comparator sin match_status, og Engineer
8: * - "trygg": Engineer A and Engineer B fullt einige + ingen advarsler + ≤4 steg → minimal

## lib/result/tile-heuristics.test.ts
4: // FIKS 4: getDimensjonerandeKeys skal bruke konstruktøren si eksplisitte

## lib/result/tile-heuristics.ts
4: * Backend (Engineer A/B) har IKKJE primary-flagg per result-key i
5: * pilot-skjema. Vi avgjer klient-side kva som er "dimensjonerande" (det
14: * Post-pilot bør structured_output utvidast med primary_keys i konstruktør-
107: // Patterns for keys som høyrer heime i BRUKSGRENSETILSTAND (SLS), ikkje
127: * Returnerer true om ein key høyrer i BRUKSGRENSE-band (SLS) heller enn
142: // agent-variantar fordi konstruktørane use begge.
300: nb: "Relativt moment μ_Ed = M_Ed / (b · d² · f_cd). Dimensjonsløs parameter brukt i armeringsdesign — bestemmer om bjelken er underarmert (μ_Ed < μ_lim) eller om du trenger trykkarmering. Lavere er bedre fra utnyttings-perspektiv.",
301: nn: "Relativt moment μ_Ed = M_Ed / (b · d² · f_cd). Dimensjonslaus parameter brukt i armeringsdesign — avgjer om bjelken er underarmert (μ_Ed < μ_lim) eller om du treng trykkarmering. Lågare er betre frå utnyttings-perspektiv.",
308: nb: "Grensen for relativ trykksone-høyde ξ = x/d, der x er nøytralaksens dybde. Sikrer duktilitetskrav etter EC2 §5.6.3 (vanligvis ξ_lim ≈ 0,45–0,5). Lavere ξ gir mer duktil oppførsel og varsel før brudd.",
309: nn: "Grensa for relativ trykksone-høgd ξ = x/d, der x er nøytralaksens djupne. Sikrar duktilitetskrav etter EC2 §5.6.3 (vanlegvis ξ_lim ≈ 0,45–0,5). Lågare ξ gir meir duktil oppførsel og varsel før brudd.",
312: nb: "Dimensjonerende utnyttingsgrad — forholdet mellom dimensjonerende påkjenning og kapasitet. Verdier < 1,0 indikerer at tverrsnittet har tilstrekkelig kapasitet. Lavere er bedre, men for lav verdi (< 0,5) kan indikere overdesign.",
313: nn: "Dimensjonerande utnyttingsgrad — forholdet mellom dimensjonerande påkjenning og kapasitet. Verdiar < 1,0 indikerer at tverrsnittet har tilstrekkeleg kapasitet. Lågare er betre, men for låg verdi (< 0,5) kan indikere overdesign.",
345: // === Controller-kort helpers (#02) ===
348: // (Comparator feila), fallbackar kallaren til getFirstSentence på
358: // Steg 0 (FIKS 4): eksplisitt rolle frå konstruktøren. Har konstruktøren
423: // Engineer-agentane legg av og til verdikt-/sjekk-setningar inn i
428: // Slike par høyrer ikkje heime i resultat-tabellen eller verifikasjons-

## lib/result/types.ts
4: * Dekker datastrukturane som kjem frå AI-pipeline (Engineer A/B,
5: * Comparator, Controller) samt utleia UI-typer som `Profile` og
13: /** Output frå Engineer Engineer A and Engineer B */
25: * Rolle per result-nøkkel, sett av konstruktøren (FIKS 4):
38: /** Konsistens-issue frå Comparator (intern sjekk per agent) */
44: /** Talavvik mellom Engineer A and Engineer B for samme felt */
54: /** Output frå Comparator */
71: * Nøklar rapportert av only éin konstruktør. Sett deterministisk av
72: * Comparator-routen (kode, ikkje LLM). Slike nøklar er IKKJE avvik og
82: /** Output frå Controller — siste sikkerheitslag */
100: * - "trygg": Engineer A and Engineer B fullt einige, ingen advarsler, kort utrekning →
103: * - "krev_gjennomgang": Controller har funne avvik/uncertainty → utvida
109: * Chip i Controller-kortet sin "Faglig merknad"-rad.

## lib/shadow/shadow-check.ts
10: * approving. Det er eit gale svar presentert som godkjent.
17: /** Verdikt som tel som "godkjent" — eit avvik her er farleg. */

## lib/workbench/categorize.ts
76: if (/^(l$|l_|h$|b$|d$|h_|b_|d_|span|spennvidde|knekklengde|oppleggs|sideavstiving|geometri|skive)/.test(k)) {

## lib/workbench/constants.ts
36: title: "Engineerene jobber",
38: "Dobbel-kontroll med to uavhengige engineers, sammenligning og kontrolløravgjørelse.",
42: title: "Beregningsnotat",
44: "Foreløpig resultat med agentkontroll. Må kontrolleres av fagperson før bruk.",
56: title: "Engineerane jobbar",
58: "Dobbel-kontroll med to uavhengige engineers, samanlikning og kontrolløravgjerd.",
62: title: "Berekningsnotat",
64: "Førebels resultat med agentkontroll. Må kontrollerast av fagperson før bruk.",

## qa/grade.test.ts
29: samanliknar: null,
119: it("fell tilbake til Engineer B", () => {
158: it("TRYGT_FEIL når resultat er gale men Controller flags", () => {

## qa/grade.ts
52: /** structured_output.results for ein konstruktør. */
70: * Finn pipeline-verdien for éin fasit-storleik. Leitar i Engineer A
102: /** Controller sitt decision_status. */
169: *      Controller flagga (usikker/avvist) → TRYGT_FEIL
240: // Utanfor toleranse — trygt feil om Controller flagga, elles farleg.
248: ? `Resultat utanfor toleranse, men Controller flagga ` +
250: : `FARLEG: resultat utanfor toleranse og Controller-verdikt ` +

## qa/README.md
16: ## Føresetnader
21: 2. **`ANTHROPIC_API_KEY`** er sett — pipelinen gjer LLM-kall server-side.

## qa/run-pipeline.ts
93: samanliknar: null,
147: // --- Steg 2: Engineer A + B parallelt ---------------------------
156: // --- Steg 3: Comparator -------------------------------------------
165: // --- Steg 4: Controller --------------------------------------------
175: // --- Steg 5: Rapportør ---------------------------------------------

## qa/test-agent.ts
11: * Krev: køyrande Pilar-server, ANTHROPIC_API_KEY (server-side), og

## qa/types.ts
15: *  TRYGT_FEIL         resultatet er gale, MEN Controller flagga det.
16: *  FARLEG_FEIL        gale resultat presentert som godkjent — bryt Port 2.
37: /** Controller sitt decision_status. */

## qa/reports/2026-05-23T18-07-21-703Z.json
35: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. E_d: ikkje funne i resultata"

## qa/reports/2026-05-23T19-25-18-262Z.json
71: "grunngiving": "Pipeline-feil: http://localhost:3000/api/agent-a -> HTTP 500: Engineer A møtte ein uventa feil. Prøv igjen — om problemet vedvarer, send tilbakemelding."
185: "grunngiving": "Pipeline-feil: http://localhost:3000/api/agent-a -> HTTP 500: Klarte ikkje parse Engineer A sitt svar som JSON"
242: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. M_pl,Rd: ikkje funne i resultata"
254: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved_with_warnings\" flags ikkje. M_pl,Rd: ikkje funne i resultata"
266: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. M_pl,Rd: ikkje funne i resultata"
278: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. M_pl,Rd: ikkje funne i resultata"
290: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. M_pl,Rd: ikkje funne i resultata"
311: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_pl,Rd: ikkje funne i resultata"
329: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved_with_warnings\" flags ikkje. V_pl,Rd: ikkje funne i resultata"
347: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_pl,Rd: ikkje funne i resultata"
359: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_pl,Rd: ikkje funne i resultata"
371: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_pl,Rd: ikkje funne i resultata"
398: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. eta: 0.267 mot fasit 26.7 (99.0 %, toleranse 2 %)"
410: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. eta: 0.267 mot fasit 26.7 (99.0 %, toleranse 2 %)"
422: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved_with_warnings\" flags ikkje. eta: 0.267 mot fasit 26.7 (99.0 %, toleranse 2 %)"
440: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved_with_warnings\" flags ikkje. eta: 0.267 mot fasit 26.7 (99.0 %, toleranse 2 %)"

## qa/reports/2026-05-23T20-46-05-501Z.json
134: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved_with_warnings\" flags ikkje. M_pl,Rd: ikkje funne i resultata"
146: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. M_pl,Rd: ikkje funne i resultata"
167: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_pl,Rd: ikkje funne i resultata"
179: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_pl,Rd: ikkje funne i resultata"
200: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. eta: 0.267 mot fasit 26.7 (99.0 %, toleranse 2 %)"
218: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved_with_warnings\" flags ikkje. eta: 0.267 mot fasit 26.7 (99.0 %, toleranse 2 %)"
239: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. N_b,Rd: ikkje funne i resultata"
251: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. N_b,Rd: ikkje funne i resultata"
272: "grunngiving": "Pipeline-feil: http://localhost:3000/api/agent-b -> HTTP 500: Klarte ikkje parse Engineer B sitt svar som JSON"
284: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. A_s: 226 mot fasit 1001 (77.4 %, toleranse 5 %)"
311: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. A_s,min: ikkje funne i resultata"
323: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved_with_warnings\" flags ikkje. A_s,min: ikkje funne i resultata"
344: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_Rd,c: ikkje funne i resultata"
356: "grunngiving": "FARLEG: resultat utanfor toleranse og Controller-verdikt \"approved\" flags ikkje. V_Rd,c: ikkje funne i resultata"

## scripts/apply-sprint33-2-international-render-cleanup.mjs
69: s += `\n\nexport function polishEnglishGeneratedText(value: string): string {\n  return value\n    .replace(/\\bEngineer A\\b/g, "Engineer A")\n    .replace(/\\bEngineer B\\b/g, "Engineer B")\n    .replace(/\\bEngineerane\\b/g, "the engineers")\n    .replace(/\\bEngineerene\\b/g, "the engineers")\n    .replace(/\\bEngineer\\b/g, "Engineer")\n    .replace(/\\bComparator\\b/g, "Comparator")\n    .replace(/\\bComparator\\b/g, "Comparator")\n    .replace(/\\bControllerens\\b/g, "Controller's")\n    .replace(/\\bControlleren\\b/g, "the Controller")\n    .replace(/\\bController\\b/g, "Controller")\n    .replace(/\\bFagperson\\b/g, "Professional reviewer")\n    .replace(/\\bFaglig merknad\\b/g, "Engineering note")\n    .replace(/\\bAntakelser & advarsler\\b/g, "Assumptions & warnings")\n    .replace(/\\bSkjul merknader\\b/g, "Hide notes")\n    .replace(/\\bHvorfor:/g, "Why:")\n    .replace(/\\bForeløpig resultat med agentkontroll\\. Må kontrolleres av fagperson før bruk\\./g, "Preliminary result with agent review. Must be checked by a qualified professional before use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\. Forbeholdene må avklares før prosjekteringsbruk\\./g, "The calculation is preliminarily approved with warnings. Conditions must be resolved before design use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\./g, "The calculation is preliminarily approved with warnings.")\n    .replace(/\\bMå kontrolleres av fagperson før bruk i prosjektering\\./g, "Must be checked by a qualified professional before use in design work.")\n    .replace(/\\bSkal verifiseres av ansvarlig fagperson før bruk i prosjektering\\./g, "Must be verified by the engineer of record before use in design work.")\n    .replace(/\\bDet er små forskjeller mellom svarene, hovedsakelig avrunding\\./g, "There are minor differences between the answers, mainly rounding.")\n    .replace(/\\bTabellen viser de viktigste kontrollpunktene\\. Full variabel-\\/pipeline-sporing finnes i nettversjonen:/g, "The table shows the most important review points. Full variable/pipeline trace is available in the web version:")\n    .replace(/\\bNavn · stilling · foretak\\b/g, "Name · title · company")\n    .replace(/\\bDD\\.MM\\.ÅÅÅÅ\\b/g, "MM/DD/YYYY")\n    .replace(/\\bSide\\b/g, "Page");\n}\n`;
245: s = s.replace(/L === "nn" \? "Gjevne data" : "Gitte data"/g, 'D === "en" ? "Given data" : L === "nn" ? "Gjevne data" : "Gitte data"');
246: s = s.replace(/L === "nn" \? "Føresetnader" : "Forutsetninger"/g, 'D === "en" ? "Assumptions" : L === "nn" ? "Føresetnader" : "Forutsetninger"');
247: s = s.replace(/L === "nn" \? "Stegvis berekning" : "Stegvis beregning"/g, 'D === "en" ? "Step-by-step calculation" : L === "nn" ? "Stegvis berekning" : "Stegvis beregning"');
249: s = s.replace(/L === "nn" \? "Merknader" : "Merknader"/g, 'D === "en" ? "Notes" : "Merknader"');
252: s = s.replace(/Generert av PILAR\. Beregningen skal kontrolleres av ansvarlig fagperson før bruk\./g, 'Generated by PILAR. The calculation must be checked by a qualified professional before use.');
294: d = d.replace(/TILLIT-SKÅR/g, "TRUST SCORE");
295: d = d.replace(/MIDDELS/g, "MEDIUM");
296: d = d.replace(/HØY/g, "HIGH");
298: d = d.replace(/Controller-verdict/g, "Controller verdict");
299: d = d.replace(/Engineer-enighet/g, "Engineer agreement");
300: d = d.replace(/VIKTIG MERKNAD/g, "IMPORTANT NOTE");
305: d = d.replace(/Side /g, "Page ");

## scripts/apply-sprint33-3-calculation-sheet-localization.mjs
89: s += `\n\nexport function polishEnglishGeneratedText(value: string): string {\n  return value\n    .replace(/\\bEngineer A\\b/g, "Engineer A")\n    .replace(/\\bEngineer B\\b/g, "Engineer B")\n    .replace(/\\bEngineerane\\b/g, "the engineers")\n    .replace(/\\bEngineerene\\b/g, "the engineers")\n    .replace(/\\bEngineer\\b/g, "Engineer")\n    .replace(/\\bComparator\\b/g, "Comparator")\n    .replace(/\\bComparator\\b/g, "Comparator")\n    .replace(/\\bControllerens\\b/g, "Controller's")\n    .replace(/\\bControlleren\\b/g, "the Controller")\n    .replace(/\\bController\\b/g, "Controller")\n    .replace(/\\bFagperson\\b/g, "Professional reviewer")\n    .replace(/\\bFaglig merknad\\b/g, "Engineering note")\n    .replace(/\\bAntakelser & advarsler\\b/g, "Assumptions & warnings")\n    .replace(/\\bSkjul merknader\\b/g, "Hide notes")\n    .replace(/\\bMetodiske forskjeller\\b/gi, "Method differences")\n    .replace(/\\bForskjeller i assumptioner\\b/gi, "Assumption differences")\n    .replace(/\\bHvorfor:/g, "Why:")\n    .replace(/\\bForeløpig resultat med agentkontroll\\. Må kontrolleres av fagperson før bruk\\./g, "Preliminary result with agent review. Must be checked by a qualified professional before use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\. Forbeholdene må avklares før prosjekteringsbruk\\./g, "The calculation is preliminarily approved with warnings. Conditions must be resolved before design use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\./g, "The calculation is preliminarily approved with warnings.")\n    .replace(/\\bMå kontrolleres av fagperson før bruk i prosjektering\\./g, "Must be checked by a qualified professional before use in design work.")\n    .replace(/\\bSkal verifiseres av ansvarlig fagperson før bruk i prosjektering\\./g, "Must be verified by the engineer of record before use in design work.")\n    .replace(/\\bDet er små forskjeller mellom svarene, hovedsakelig avrunding\\./g, "There are minor differences between the answers, mainly rounding.")\n    .replace(/\\bTabellen viser de viktigste kontrollpunktene\\. Full variabel-\\/pipeline-sporing finnes i nettversjonen:/g, "The table shows the most important review points. Full variable/pipeline trace is available in the web version:")\n    .replace(/\\bSelvkontroll: Ingen inkonsistenser funnet\\b/g, "Self-check: no inconsistencies found")\n    .replace(/\\bNavn · stilling · foretak\\b/g, "Name · title · company")\n    .replace(/\\bDD\\.MM\\.ÅÅÅÅ\\b/g, "MM/DD/YYYY")\n    .replace(/\\bMIDDELS\\b/g, "MEDIUM")\n    .replace(/\\bPRELIMINARY\\b/g, "PRELIMINARY")\n    .replace(/\\bSide\\b/g, "Page");\n}\n`;
264: if (end !== -1) s = `${s.slice(0, end)}  page: { nb: "Side", nn: "Side", en: "Page" },\n${s.slice(end)}`;
291: // Replace footer hardcoded Side if present.
292: s = s.replace(/text:\s*"Side "/g, 'text: `${LABELS.page?.[displayLanguage] ?? "Page"} `');
307: const helper = `\nfunction calculationSheetDisplayLanguage(sheet: CalculationSheetModel): PilarDisplayLanguage {\n  const explicit = sheet.meta.displayLanguage;\n  if (explicit === "en" || explicit === "nb" || explicit === "nn") return explicit;\n  const signal = [sheet.meta.title, sheet.meta.subtitle, ...sheet.assumptions, ...sheet.notes].join("\\n");\n  return inferCalculationEnglishDisplay(signal) ? "en" : sheet.meta.locale;\n}\n\nfunction labelFor(language: PilarDisplayLanguage, key: "given" | "assumptions" | "calculation" | "results" | "notes" | "step"): string {\n  const en = { given: "Given data", assumptions: "Assumptions", calculation: "Step-by-step calculation", results: "Results", notes: "Notes", step: "Step" };\n  const nb = { given: "Gitte data", assumptions: "Forutsetninger", calculation: "Stegvis beregning", results: "Resultater", notes: "Merknader", step: "Steg" };\n  const nn = { given: "Gjevne data", assumptions: "Føresetnader", calculation: "Stegvis berekning", results: "Resultat", notes: "Merknader", step: "Steg" };\n  return language === "en" ? en[key] : language === "nn" ? nn[key] : nb[key];\n}\n`;
318: s = s.replace(/D === "en" \? "Given data" : L === "nn" \? "Gjevne data" : "Gitte data"/g, 'labelFor(D, "given")');
319: s = s.replace(/D === "en" \? "Assumptions" : L === "nn" \? "Føresetnader" : "Forutsetninger"/g, 'labelFor(D, "assumptions")');
320: s = s.replace(/D === "en" \? "Step-by-step calculation" : L === "nn" \? "Stegvis berekning" : "Stegvis beregning"/g, 'labelFor(D, "calculation")');
322: s = s.replace(/D === "en" \? "Notes" : "Merknader"/g, 'labelFor(D, "notes")');
344: s = s.replace(/TILLIT-SKÅR/g, "TRUST SCORE");
345: s = s.replace(/MIDDELS/g, "MEDIUM");
346: s = s.replace(/VIKTIG MERKNAD/g, "IMPORTANT NOTE");
347: s = s.replace(/Controller/g, "Controller");
348: s = s.replace(/Høy/g, "High");
358: ["Beregningsnotat", "Calculation note"],
359: ["Foreløpig resultat med agentkontroll. Må kontrolleres av fagperson før bruk.", "Preliminary result with agent review. Must be checked by a qualified professional before use."],
360: ["FAGLIG MERKNAD", "ENGINEERING NOTE"],
361: ["ANTAKELSER & ADVARSLER", "ASSUMPTIONS & WARNINGS"],
362: ["Comparator", "Comparator"],
363: ["Engineer", "Engineer"],
364: ["Skjul merknader", "Hide notes"],
365: ["METODISKE FORSKJELLER", "METHOD DIFFERENCES"],
366: ["FORSKJELLER I FORUTSETNINGER", "ASSUMPTION DIFFERENCES"],
367: ["Godkjent med advarsler", "Approved with warnings"],

## scripts/apply-sprint33-4-final-international-polish.mjs
129: '  value: {$1},\n  page: { nb: "Side", nn: "Side", en: "Page" },'
136: text = text.replace(/children: \[" ┬À Side ", PageNumber\.CURRENT\]/g, 'children: [` ┬À ${LABELS.page[displayLanguage]} `, PageNumber.CURRENT]');
137: text = text.replace(/children: \[" · Side ", PageNumber\.CURRENT\]/g, 'children: [` · ${LABELS.page[displayLanguage]} `, PageNumber.CURRENT]');
138: text = text.replace(/children: \[" \\u00b7 Side ", PageNumber\.CURRENT\]/g, 'children: [` · ${LABELS.page[displayLanguage]} `, PageNumber.CURRENT]');
149: .replace(/\\bBEREGNINGSNOTAT\\b/g, "CALCULATION NOTE")
151: .replace(/\\bDOKUMENT-ID\\b/g, "DOCUMENT ID")
152: .replace(/\\bRapportør\\b/g, "Reporter")
153: .replace(/\\bTILLIT-SKÅR\\b/g, "TRUST SCORE")
154: .replace(/\\bVIKTIG MERKNAD\\b/g, "IMPORTANT NOTE")
155: .replace(/\\bMIDDELS\\b/g, "MEDIUM")
156: .replace(/\\bHØY\\b/g, "HIGH")
158: .replace(/\\bLAV\\b/g, "LOW")
162: .replace(/\\bGodkjent med advarsler\\b/g, "Approved with warnings")
163: .replace(/\\bPRELIMINARY\\b/g, "PRELIMINARY")
164: .replace(/\\bForeløpig\\b/g, "Preliminary")
165: .replace(/Beregningen er foreløpig godkjent med advarsler\\. Forbeholdene må avklares før prosjekteringsbruk\\./gi, "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.")
166: .replace(/Beregningen er foreløpig godkjent med advarsler\\. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering\\./gi, "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.")
167: .replace(/Må kontrolleres av fagperson før bruk i prosjektering\\./gi, "Must be checked by a qualified professional before use in design work.")
168: .replace(/må kontrolleres av fagperson før bruk i prosjektering/gi, "must be checked by a qualified professional before use in design work")
169: .replace(/\\bEngineer A\\b/g, "Engineer A")
170: .replace(/\\bEngineer B\\b/g, "Engineer B")
171: .replace(/\\bEngineer\\b/g, "Engineer")
172: .replace(/\\bComparator\\b/g, "Comparator")
173: .replace(/\\bComparator\\b/g, "Comparator")
174: .replace(/\\bController\\b/g, "Controller")
175: .replace(/\\bFaglig merknad\\b/gi, "Engineering note")
176: .replace(/\\bANTAKELSER & ADVARSLER\\b/g, "ASSUMPTIONS & WARNINGS")
177: .replace(/\\bMETODISKE FORSKJELLER\\b/g, "METHODOLOGICAL DIFFERENCES")
178: .replace(/\\bFORSKJELLER I FORUTSETNINGER\\b/g, "ASSUMPTION DIFFERENCES")
179: .replace(/\\bSkjul merknader\\b/g, "Hide notes")
257: text = text.replace(/trustScore:\s*\{\s*nb:\s*"Tillit-skår",\s*nn:\s*"Tillit-skår"\s*\}/, 'trustScore: { nb: "Tillit-skår", nn: "Tillit-skår", en: "Trust score" }');
258: text = text.replace(/importantNote:\s*\{\s*nb:\s*"Viktig merknad",\s*nn:\s*"Viktig merknad"\s*\}/, 'importantNote: { nb: "Viktig merknad", nn: "Viktig merknad", en: "Important note" }');
259: text = text.replace(/notControlled:\s*\{\s*nb:\s*"Må kontrolleres av fagperson før bruk i prosjektering\.",\s*nn:\s*"Må kontrollerast av fagperson før bruk i prosjektering\."\s*\}/, 'notControlled: { nb: "Må kontrolleres av fagperson før bruk i prosjektering.", nn: "Må kontrollerast av fagperson før bruk i prosjektering.", en: "Must be checked by a qualified professional before use in design work." }');
266: text = text.replace(/PRELIMINARY/g, "PRELIMINARY");
267: text = text.replace(/Må kontrolleres av fagperson før bruk i prosjektering\./g, "Must be checked by a qualified professional before use in design work.");

## scripts/apply-sprint33-5-final-english-polish-guard.mjs
90: .replace(/\\bBEREGNINGSNOTAT\\b/g, "CALCULATION NOTE")
91: .replace(/\\bBEREKNINGSNOTAT\\b/g, "CALCULATION NOTE")
94: .replace(/\\bDOKUMENT-ID\\b/g, "DOCUMENT ID")
95: .replace(/\\bRapportør\\b/g, "Reporter")
96: .replace(/\\bTILLIT-SKÅR\\b/g, "TRUST SCORE")
97: .replace(/\\bVIKTIG MERKNAD\\b/g, "IMPORTANT NOTE")
98: .replace(/\\bMIDDELS\\b/g, "MEDIUM")
99: .replace(/\\bMiddels\\b/g, "Medium")
100: .replace(/\\bHØY\\b/g, "HIGH")
101: .replace(/\\bHøy\\b/g, "High")
103: .replace(/\\bLAV\\b/g, "LOW")
104: .replace(/\\bLav\\b/g, "Low")
108: .replace(/\\bGodkjent med advarsler\\b/g, "Approved with warnings")
109: .replace(/\\bPRELIMINARY\\b/g, "PRELIMINARY")
110: .replace(/\\bForeløpig\\b/g, "Preliminary")
111: .replace(/Beregningen er foreløpig godkjent med advarsler\\. Forbeholdene må avklares før prosjekteringsbruk\\./gi, "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.")
112: .replace(/Beregningen er foreløpig godkjent med advarsler\\. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering\\./gi, "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.")
115: .replace(/Må kontrolleres av fagperson før bruk i prosjektering\\./gi, "Must be checked by a qualified professional before use in design work.")
116: .replace(/må kontrolleres av fagperson før bruk i prosjektering/gi, "must be checked by a qualified professional before use in design work")
117: .replace(/\\bEngineer A\\b/g, "Engineer A")
118: .replace(/\\bEngineer B\\b/g, "Engineer B")
119: .replace(/\\bEngineeren\\b/g, "the engineer")
120: .replace(/\\bEngineer\\b/g, "Engineer")
121: .replace(/\\bComparator\\b/g, "Comparator")
122: .replace(/\\bComparator\\b/g, "Comparator")
123: .replace(/\\bController\\b/g, "Controller")
124: .replace(/\\bFaglig merknad\\b/gi, "Engineering note")
125: .replace(/\\bANTAKELSER & ADVARSLER\\b/g, "ASSUMPTIONS & WARNINGS")
126: .replace(/\\bMETODISKE FORSKJELLER\\b/g, "METHODOLOGICAL DIFFERENCES")
127: .replace(/\\bFORSKJELLER I FORUTSETNINGER\\b/g, "ASSUMPTION DIFFERENCES")
128: .replace(/\\bSkjul merknader\\b/g, "Hide notes")
129: .replace(/\\bSkjul vurderingen\\b/g, "Hide assessment")
136: .replace(/\\bLåg\\b/g, "Low")
138: .replace(/\\bprosjektering\\b/gi, "design work")
139: .replace(/\\bfagperson\\b/gi, "qualified professional");
270: text = text.replace(/label: tillit\.label,/g, 'label: displayLanguage === "en" ? sprint335PolishEnglishText(tillit.label) : tillit.label,');
271: text = text.replace(/tone: tillit\.labelKey,/g, 'tone: displayLanguage === "en" ? sprint335PolishEnglishText(tillit.labelKey) : tillit.labelKey,');
354: text = text.replace(/BEREGNINGSNOTAT/g, "CALCULATION NOTE");
355: text = text.replace(/DOKUMENT-ID/g, "DOCUMENT ID");
356: text = text.replace(/Rapportør/g, "Reporter");
357: text = text.replace(/MIDDELS/g, "MEDIUM");
358: text = text.replace(/PRELIMINARY/g, "PRELIMINARY");
359: text = text.replace(/Må kontrolleres av fagperson før bruk i prosjektering\./g, "Must be checked by a qualified professional before use in design work.");
360: text = text.replace(/Beregningen er foreløpig godkjent med advarsler\. Forbeholdene må avklares før prosjekteringsbruk\./g, "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.");
361: text = text.replace(/Beregningen er foreløpig godkjent med advarsler\. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering\./g, "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.");
371: text = text.replace(/Beregningsnotat/g, "Calculation note");
372: text = text.replace(/Foreløpig resultat med agentkontroll\. Må kontrolleres av fagperson før bruk\./g, "Preliminary result with agent control. Must be checked by a qualified professional before use.");
373: text = text.replace(/FAGLIG MERKNAD/g, "ENGINEERING NOTE");
374: text = text.replace(/ANTAKELSER & ADVARSLER/g, "ASSUMPTIONS & WARNINGS");
375: text = text.replace(/METODISKE FORSKJELLER/g, "METHODOLOGICAL DIFFERENCES");
376: text = text.replace(/FORSKJELLER I FORUTSETNINGER/g, "ASSUMPTION DIFFERENCES");
377: text = text.replace(/Skjul merknader/g, "Hide notes");
378: text = text.replace(/Engineer A/g, "Engineer A");
379: text = text.replace(/Engineer B/g, "Engineer B");
380: text = text.replace(/Engineer/g, "Engineer");
381: text = text.replace(/Comparator/g, "Comparator");
384: text = text.replace(/"Engineer A"/g, '"Engineer A"');
385: text = text.replace(/"Engineer B"/g, '"Engineer B"');
395: text = text.replace(/PRELIMINARY/g, "PRELIMINARY");
396: text = text.replace(/Må kontrolleres av fagperson før bruk i prosjektering\./g, "Must be checked by a qualified professional before use in design work.");
