/**
 * Lokaliserte etikettar for Resultat-sida (calculation_result-fase).
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 1. Held bm/nn-tekstar
 * i ein flat Record-struktur slik at vi kan slå opp via WB_LABELS[key][locale].
 */

import type { Locale } from "@/lib/locale";

export const WB_LABELS: Record<string, Record<Locale, string>> = {
  // Resume-banner
  fortsetterFra: { nb: "Fortsetter fra tidligere beregning.", nn: "Held fram frå tidlegare berekning." },
  endringerOpprett: { nb: "Endringer oppretter en ny beregning — originalen forblir uendret.", nn: "Endringar opprettar ein ny berekning — originalen blir uendra." },
  // Input-form
  skrivInnOppgave: { nb: "Skriv inn en konstruksjonsoppgave", nn: "Skriv inn ei konstruksjonsoppgåve" },
  placeholderEksempel: { nb: "For eksempel: Finn maksimalt moment og skjær for en fritt opplagt bjelke med L = 5 m og jevnt fordelt last q = 8 kN/m...", nn: "Til dømes: Finn maksimalt moment og skjær for ein fritt opplagd bjelke med L = 5 m og jamt fordelt last q = 8 kN/m..." },
  // Filopplasting
  lastOppFil: { nb: "Last opp fil", nn: "Last opp fil" },
  filopplasting: { nb: "Filopplasting", nn: "Filopplasting" },
  filopplastingP1: { nb: "Last opp et bilde (JPG, PNG, GIF, WEBP), PDF eller Word-dokument med oppgaven.", nn: "Last opp eit bilete (JPG, PNG, GIF, WEBP), PDF eller Word-dokument med oppgåva." },
  filopplastingP2Pre: { nb: "Maks filstørrelse:", nn: "Maks filstorleik:" },
  filopplastingP2Post: { nb: ". Pilar leser filen og henter ut tekst, tall og kontekst.", nn: ". Pilar les fila og hentar ut tekst, tal og kontekst." },
  fjernFil: { nb: "Fjern fil", nn: "Fjern fil" },
  // Eksempel
  eksempel: { nb: "Eksempel", nn: "Eksempel" },
  // Knappar
  tolkarLoading: { nb: "Tolker...", nn: "Tolkar..." },
  tolkPaNytt: { nb: "Tolk på nytt →", nn: "Tolk på nytt →" },
  tolkOppgava: { nb: "Tolk oppgaven →", nn: "Tolk oppgåva →" },
  feil: { nb: "Feil", nn: "Feil" },
  // Tolking-panel
  tolking: { nb: "Tolkning", nn: "Tolking" },
  tolkarBadge: { nb: "Tolker", nn: "Tolkar" },
  stromer: { nb: "● STREAMER", nn: "● STRØYMER" },
  berekningstype: { nb: "Beregningstype", nn: "Berekningstype" },
  tolkteVerdiar: { nb: "Tolkede verdier", nn: "Tolkte verdiar" },
  manglandeData: { nb: "Manglende data", nn: "Manglande data" },
  antakingar: { nb: "Antakelser", nn: "Antakingar" },
  kvaKanReknast: { nb: "Hva kan beregnes nå", nn: "Kva kan reknast no" },
  krevMeirInput: { nb: "krever mer input", nn: "krev meir input" },
  // Status-card
  status: { nb: "Status", nn: "Status" },
  inputstatus: { nb: "Status", nn: "Status" },
  inputstatusExplanation: { nb: "Pilar si vurdering av hvor klar oppgaven er til å beregnes. 'Klar' = all info på plass. 'Delvis klar' = Pilar har gjort rimelige antakelser (synlig ovenfor) som du kan justere før du starter. Andre statuser trenger mer input eller faller utenfor pilot-versjonen.", nn: "Pilar si vurdering av kor klar oppgåva er til å reknast. 'Klar' = all info på plass. 'Delvis klar' = Pilar har gjort rimelege antakingar (synleg ovanfor) som du kan justere før du startar. Andre statusar treng meir input eller fell utanfor pilot-versjonen." },
  fagomraade: { nb: "Fagområde", nn: "Fagområde" },
  // Status-banner (#02) — detail-tekstar per status-tilstand. {n} blir erstatta med antal.
  bannerKlarDetail: { nb: "alle {n} kontroller går", nn: "alle {n} kontrollar går" },
  bannerDelvisDetail: { nb: "{n} element mangler input", nn: "{n} element manglar input" },
  bannerMangelfullDetail: { nb: "{n} felt må fylles før beregning", nn: "{n} felt må fyllast før berekning" },
  bannerIkkjeStottaDetail: { nb: "ikke støttet i pilot-versjonen", nn: "ikkje støtta i pilot-versjonen" },
  bannerAvvistDetail: { nb: "ikke byggfaglig oppgave", nn: "ikkje byggfagleg oppgåve" },
  bannerUklartDetail: { nb: "Pilar trenger mer kontekst", nn: "Pilar treng meir kontekst" },
  lavTillit: { nb: "Lav tillit i tolkningen — sjekk verdiene under før du starter", nn: "Låg tillit i tolkinga — sjekk verdiane under før du startar" },
  // Tolkning-disclosure (#01) — toggle for å vise/skjule full tolkning
  visFullTolkning: { nb: "Vis full tolkning og tolkede verdier", nn: "Vis full tolkning og tolkede verdiar" },
  skjulFullTolkning: { nb: "Skjul full tolkning", nn: "Skjul full tolkning" },
  // Mangelfull-chips (#03) — chip-stripe rett under input
  tolkarTreng: { nb: "Pilar trenger {n} felt til — klikk for å sette inn", nn: "Pilar treng {n} felt til — klikk for å setje inn" },
  tolkarTrengAvvist: { nb: "Pilar avviste oppgaven — se forklaring under", nn: "Pilar avviste oppgåva — sjå forklaring under" },
  startMedMangler: { nb: "Start beregning · {n} antakelser brukt", nn: "Start berekning · {n} antakingar brukte" },
  // Fil-upload + AI-disclaimer (#06)
  lastOppStottefil: { nb: "+ Last opp støttefil", nn: "+ Last opp støttefil" },
  filFormatHint: { nb: "PDF, PNG, DOCX — Pilar ser oppgaven og vedlegget saman.", nn: "PDF, PNG, DOCX — Pilar ser oppgåva og vedlegget saman." },
  aiDisclaimerKort: { nb: "AI-generert · krever faglig kontroll", nn: "AI-generert · krev fagleg kontroll" },
  // Eksempel-kollaps (#07) — etter første Tolk vert eksempla kollapsa til lenke
  seEksempel: { nb: "▸ Se 3 eksempel", nn: "▸ Sjå 3 eksempel" },
  // Første-gongs-guide (#09) — éi-setnings forklaring, dismissable, persistert i localStorage
  forsteGongGuide: {
    nb: "Workbench er steg 1 av 3. Skriv inn hva du vil beregne — Pilar leser og viser deg hva den forstod, så du kan rette opp før beregningen starter.",
    nn: "Workbench er steg 1 av 3. Skriv kva du vil rekne ut — Pilar les og viser kva den forstod, så du kan rette opp før berekninga startar.",
  },
  forsteGongDismiss: { nb: "Skjul", nn: "Skjul" },
  // Mobil-tabs (#08) — vises only under 720px viewport
  tabResultat: { nb: "Resultat", nn: "Resultat" },
  tabTolkning: { nb: "Tolkning", nn: "Tolkning" },
  tabStatus: { nb: "Status", nn: "Status" },
  // Start-CTA
  stemmerTolkinga: { nb: "Stemmer tolkningen? Da kan du starte beregningen.", nn: "Stemmer tolkinga? Då kan du starte berekninga." },
  avbryt: { nb: "Avbryt", nn: "Avbryt" },
  startBerekning: { nb: "Start beregning →", nn: "Start berekning →" },
  scrollTilStart: { nb: "Scroll til Start beregning", nn: "Scroll til Start berekning" },
  klarTilStart: { nb: "Klar til å starte beregningen", nn: "Klar til å starte berekninga" },
  // Result-fase
  kontrollorAvgjerd: { nb: "Controller — endelig avgjørelse", nn: "Controller — endeleg avgjerd" },
  kontrollor: { nb: "Controller", nn: "Controller" },
  kontrollorPopover1: { nb: "Controller-agenten leser både engineers og Comparator, og avgjør om resultatet er trygt nok å vise. Erstatter", nn: "Controller-agenten les både engineers og Comparator, og avgjer om resultatet er trygt nok å vise. Erstattar" },
  kontrollorPopover2: { nb: "ikke", nn: "ikkje" },
  kontrollorPopover3: { nb: "fagperson-kontroll.", nn: "fagperson-kontroll." },
  sluttkonklusjonUtelaten: { nb: "Sluttkonklusjon utelatt av Controlleren.", nn: "Sluttkonklusjon utelaten av Controlleren." },
  hallusinasjonarTekst: { nb: "Controlleren identifiserte hallusinasjoner i konstruktørenes kortform-konklusjon. Se Resultat-felt og full utregning under for korrekte verdier.", nn: "Controlleren identifiserte hallusinasjonar i konstruktørane sin kortform-konklusjon. Sjå Resultat-felt og full utrekning under for korrekte verdiar." },
  kortSvar: { nb: "Kort svar", nn: "Kort svar" },
  resultat: { nb: "Resultat", nn: "Resultat" },
  visMellomledd: { nb: "Vis {n} intermediate value", nn: "Sjå {n} intermediate value" },
  skjulMellomledd: { nb: "Skjul intermediate value", nn: "Skjul intermediate value" },
  foresetnaderBrukt: { nb: "Forutsetninger brukt", nn: "Føresetnader brukt" },
  stegvisUtrekning: { nb: "Stegvis utregning", nn: "Stegvis utrekning" },
  // Stegvis view-toggle (#08)
  stegvisBerreFormel: { nb: "Bare formlene", nn: "Berre formlane" },
  stegvisAlleSteg: { nb: "Alle steg", nn: "Alle steg" },
  stegvisGaaTilSteg: { nb: "Gå til steg", nn: "Gå til steg" },
  kvaErIkkjeRekna: { nb: "Hva er ikke beregnet", nn: "Kva er ikkje rekna" },
  atvaringar: { nb: "Advarsler", nn: "Åtvaringar" },
  // Konfidens-card
  konstruktorAKonfidens: { nb: "Engineer A konfidens", nn: "Engineer A konfidens" },
  konstruktorBKonfidens: { nb: "Engineer B konfidens", nn: "Engineer B konfidens" },
  konstruktorKonfidens: { nb: "Engineer-konfidens", nn: "Engineer-konfidens" },
  konstruktorKonfidensPopover: { nb: "Engineerens egenrapporterte sikkerhet på eget svar (high/medium/low). Ikke det samme som Tillit-skåren — måler only én agents tillit til seg selv.", nn: "Engineeren si eigenrapporterte sikkerheit på eige svar (high/medium/low). Ikkje det same som Tillit-skåren — målar only éin agent sin tillit til seg sjølv." },
  // Per-nivå forklaringar for konfidens-chips (#09)
  konfidensHighA: {
    nb: "Engineer A rapporterer HIGH-konfidens: metoden er etablert, alle nødvendige input er gitt, og resultatet er konsistent gjennom utregningen. Egenvurdering — ikke en uavhengig verifikasjon.",
    nn: "Engineer A rapporterer HIGH-konfidens: metoden er etablert, alle naudsynte input er gitt, og resultatet er konsistent gjennom utrekninga. Eigenvurdering — ikkje ei uavhengig verifisering.",
  },
  konfidensHighB: {
    nb: "Engineer B rapporterer HIGH-konfidens in its independent solution. B løste oppgaven uten å se A sitt svar. HIGH means at B er trygg på its own method — at Engineer A and Engineer B er enige er en separat sjekk (see verdict above).",
    nn: "Engineer B rapporterer HIGH-konfidens in its independent solution. B løyste oppgåva utan å sjå A sitt svar. HIGH her tyder at B er trygg på its own method — at Engineer A and Engineer B er samde er ein separat sjekk (sjå verdikt over).",
  },
  konfidensMediumA: {
    nb: "Engineer A rapporterer MEDIUM-konfidens: metoden er korrekt, men en eller flere input er antatt eller ekstrapolert. Sjekk assumptionene før du stoler på resultatet.",
    nn: "Engineer A rapporterer MEDIUM-konfidens: metoden er korrekt, men ein eller fleire input er antatt eller ekstrapolert. Sjekk assumptionene før du stolar på resultatet.",
  },
  konfidensMediumB: {
    nb: "Engineer B rapporterer MEDIUM-konfidens: B løste oppgaven, men minst én assumption er usikker. Se assumptionene i Engineer B-blokka.",
    nn: "Engineer B rapporterer MEDIUM-konfidens: B løyste oppgåva, men minst éin assumption er usikker. Sjå assumptionene i Engineer B-blokka.",
  },
  konfidensLowA: {
    nb: "Engineer A rapporterer LOW-konfidens: vesentlig usikkerhet i metode eller input. Resultatet bør ikke brukes uten manuell verifikasjon — start gjerne på nytt med mer presise inndata.",
    nn: "Engineer A rapporterer LOW-konfidens: vesentleg usikkerheit i metode eller input. Resultatet bør ikkje brukast utan manuell verifisering — start gjerne på nytt med meir presise inndata.",
  },
  konfidensLowB: {
    nb: "Engineer B rapporterer LOW-konfidens på egen løsning. B er usikker på metode eller input. Manuell faglig kontroll anbefales sterkt.",
    nn: "Engineer B rapporterer LOW-konfidens på eiga løysing. B er usikker på metode eller input. Manuell fagleg kontroll vert sterkt anbefalt.",
  },
  // Engineer B-panel
  konstruktorBUavhengig: { nb: "Engineer B — uavhengig kontroll", nn: "Engineer B — uavhengig kontroll" },
  loysteOppgavaUtan: { nb: "Løste oppgaven uten å se Engineer A sitt svar", nn: "Løyste oppgåva utan å sjå Engineer A sitt svar" },
  konstruktorBKonklusjon: { nb: "Engineer B sin konklusjon", nn: "Engineer B sin konklusjon" },
  konstruktorBResultat: { nb: "Engineer B sine resultater", nn: "Engineer B sine resultat" },
  // Controller-kort (#02) — verdikt-setningar per match_status og toggle-labels
  verdiktMatch: {
    nb: "Engineer Engineer A and Engineer B fully agree om alle design values.",
    nn: "Engineer Engineer A and Engineer B er fullstendig samde om alle design values.",
  },
  verdiktMinor: {
    nb: "Engineer Engineer A and Engineer B har små forskjeller — ingen kritiske avvik.",
    nn: "Engineer Engineer A and Engineer B har små skilnader — ingen kritiske avvik.",
  },
  verdiktSignificant: {
    nb: "Engineer Engineer A and Engineer B har vesentlige avvik på design values.",
    nn: "Engineer Engineer A and Engineer B har vesentlege avvik på design values.",
  },
  verdiktCritical: {
    nb: "Engineer Engineer A and Engineer B er ikke enige — manuell gjennomgang trengs.",
    nn: "Engineer Engineer A and Engineer B er ikkje samde — manuell gjennomgang trengst.",
  },
  fagligMerknad: { nb: "Faglig merknad", nn: "Fagleg merknad" },
  // Grupper-overskrifter for fag-chips (delt frå #lettlese5)
  fagligGruppeMetode: { nb: "Metode", nn: "Metode" },
  fagligGruppeAntakelser: { nb: "Antakelser & advarsler", nn: "Antakingar & åtvaringar" },
  lesHeileVurderinga: { nb: "Les hele vurderingen fra Controlleren", nn: "Les heile vurderinga frå Controlleren" },
  skjulVurderinga: { nb: "Skjul vurderingen", nn: "Skjul vurderinga" },
  krevFagligGjennomgang: { nb: "Krever faglig gjennomgang", nn: "Krev fagleg gjennomgang" },
  // Sjølvkontroll-disclosure (#09) — viser internal_consistency_issues
  sjølvkontrollEtikett: { nb: "Selvkontroll", nn: "Sjølvkontroll" },
  sjølvkontrollIngen: { nb: "Ingen inkonsistenser funnet", nn: "Ingen inkonsistensar funne" },
  sjølvkontrollFunne: { nb: "{n} inkonsistens(er) funnet", nn: "{n} inkonsistens(ar) funne" },
  sjølvkontrollSkjul: { nb: "Skjul detaljer", nn: "Skjul detaljar" },
  // Visningsprofil-indikator (#03) — viser kva default-tilstand sida er i,
  // basert på agent-output. Ikkje klikkbar — kommunikasjon, ikkje kontroll.
  visningProfil: { nb: "Visning", nn: "Visning" },
  profilTrygg: { nb: "Trygg", nn: "Trygg" },
  profilStandard: { nb: "Standard", nn: "Standard" },
  profilKrevGjennomgang: { nb: "Krev gjennomgang", nn: "Krev gjennomgang" },
  profilForklaringTrygg: {
    nb: "Enig kontroll, ingen advarsler — siden viser kort hovedsvar.",
    nn: "Enig kontroll, ingen advarsler — sida viser kort hovudsvar.",
  },
  profilForklaringStandard: {
    nb: "Godkjent — detaljer er kollapset, klikk for å utforske.",
    nn: "Godkjent — detaljar er kollapsa, klikk for å utforske.",
  },
  profilForklaringStandardMedAdvarsler: {
    nb: "Godkjent med advarsler — detaljer er kollapset, klikk for å utforske.",
    nn: "Godkjent med advarsler — detaljar er kollapsa, klikk for å utforske.",
  },
  profilForklaringKrev: {
    nb: "Vesentlige avvik — avvik-rader og merknader er pre-ekspandert.",
    nn: "Vesentlege avvik — avvik-rader og merknader er pre-ekspandert.",
  },
  // Engineer B-disclosure (#04) — éin-linjes summary i kollapsa state
  bUavhengigKontroll: { nb: "Engineer B — uavhengig kontroll", nn: "Engineer B — uavhengig kontroll" },
  bEnigeMedA: { nb: "ENIGE med A", nn: "ENIGE med A" },
  bMindreSkilnader: { nb: "Mindre forskjeller fra A", nn: "Mindre skilnader frå A" },
  bVesentlegAvvik: { nb: "Vesentlig avvik fra A", nn: "Vesentleg avvik frå A" },
  bKritiskUsemje: { nb: "Kritisk uenighet med A", nn: "Kritisk usemje med A" },
  bKonfidens: { nb: "konfidens", nn: "konfidens" },
  bUtanComparison: { nb: "ingen sammenligning tilgjengelig", nn: "inga samanlikning tilgjengeleg" },
  // Comparator
  samanliknarSkilnader: { nb: "Comparator — forskjeller funnet", nn: "Comparator — skilnader funne" },
  numeriskeSkilnader: { nb: "Numeriske forskjeller", nn: "Numeriske skilnader" },
  metodiskeSkilnader: { nb: "Metodiske forskjeller", nn: "Metodiske skilnader" },
  forskjellarForesetnader: { nb: "Forskjeller i assumptioner", nn: "Forskjellar i assumptioner" },
  internInkonsistens: { nb: "Intern inkonsistens", nn: "Intern inkonsistens" },
  // Tabell-headers (Felt, Engineer A, Engineer B, Skilnad, Alvor)
  tabellFelt: { nb: "Felt", nn: "Felt" },
  tabellSkilnad: { nb: "Forskjell", nn: "Skilnad" },
  tabellAlvor: { nb: "Alvor", nn: "Alvor" },
  // Comparator ekspander-rad (#05)
  samanliknarKvifor: { nb: "Hvorfor:", nn: "Kvifor:" },
  samanliknarAVerdi: { nb: "Engineer A", nn: "Engineer A" },
  samanliknarBVerdi: { nb: "Engineer B", nn: "Engineer B" },
  generelleMerknader: { nb: "Generelle merknader fra Comparator", nn: "Generelle merknader frå Comparator" },
  skjulMerknader: { nb: "Skjul merknader", nn: "Skjul merknader" },
  // Action bar
  resultatetForebels: { nb: "Resultatet er foreløpig og må kontrolleres av fagperson.", nn: "Resultatet er førebels og må kontrollerast av fagperson." },
  tilbake: { nb: "← Tilbake", nn: "← Tilbake" },
  generRapport: { nb: "Generer rapport →", nn: "Generer rapport →" },
};