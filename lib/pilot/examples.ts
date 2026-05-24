import type { PilotExample } from "./types";

export const PILOT_EXAMPLES: PilotExample[] = [
  {
    id: "beam-basic",
    category: "beam",
    difficulty: "easy",
    title: {
      nb: "Enkel bjelke — moment og skjær",
      nn: "Enkel bjelke — moment og skjer",
    },
    description: {
      nb: "Tester grunnflyten: tolk input, beregn snittkrefter, lag rapport og beregningsark.",
      nn: "Testar grunnflyten: tolk input, rekn snittkrefter, lag rapport og berekningsark.",
    },
    tags: ["bjelke", "moment", "skjær", "baseline"],
    prompt: {
      nb: `Fritt opplagd stålbjelke med spennvidde L = 5,0 m.

Bjelken har en jevnt fordelt dimensjonerende last:
qEd = 8,0 kN/m.

Regn ut:
1. Maksimalt dimensjonerende bøyemoment MEd
2. Maksimal dimensjonerende skjærkraft VEd
3. Vis stegvis utregning
4. Forklar hvor moment og skjærkraft er størst`,
      nn: `Fritt opplagd stålbjelke med spennvidde L = 5,0 m.

Bjelken har ei jamt fordelt dimensjonerande last:
qEd = 8,0 kN/m.

Rekn ut:
1. Maksimalt dimensjonerande bøyemoment MEd
2. Maksimal dimensjonerande skjerkraft VEd
3. Vis stegvis utrekning
4. Forklar kvar moment og skjerkraft er størst`,
    },
  },
  {
    id: "ec0-load-combination",
    category: "load_combination",
    difficulty: "medium",
    title: {
      nb: "Lastkombinasjon etter EC0",
      nn: "Lastkombinasjon etter EC0",
    },
    description: {
      nb: "Tester symboler, kombinasjonsfaktorer, tabeller og flere beregningsalternativer.",
      nn: "Testar symbol, kombinasjonsfaktorar, tabellar og fleire berekningsalternativ.",
    },
    tags: ["EC0", "lastkombinasjon", "gamma", "psi"],
    prompt: {
      nb: `En bjelke bærer følgende karakteristiske laster:

Permanent last:
gk = 6,0 kN/m

Nyttelast:
qk = 8,0 kN/m
Kategori B, kontor

Snølast:
sk = 3,5 kN/m

Finn dimensjonerende lastkombinasjon i bruddgrense etter NS-EN 1990 / EC0 med norsk NA.

Bruk:
gammaG = 1,35 for 6.10a
gammaG = 1,20 for 6.10b
gammaQ = 1,50
psi0 for nyttelast kategori B = 0,7
psi0 for snølast = 0,7

Kontroller:
1. 6.10a
2. 6.10b med nyttelast som ledende variabel last
3. 6.10b med snølast som ledende variabel last
4. Finn styrende kombinasjon`,
      nn: `Ein bjelke ber følgjande karakteristiske laster:

Permanent last:
gk = 6,0 kN/m

Nyttelast:
qk = 8,0 kN/m
Kategori B, kontor

Snølast:
sk = 3,5 kN/m

Finn dimensjonerande lastkombinasjon i brotgrense etter NS-EN 1990 / EC0 med norsk NA.

Bruk:
gammaG = 1,35 for 6.10a
gammaG = 1,20 for 6.10b
gammaQ = 1,50
psi0 for nyttelast kategori B = 0,7
psi0 for snølast = 0,7

Kontroller:
1. 6.10a
2. 6.10b med nyttelast som leiande variabel last
3. 6.10b med snølast som leiande variabel last
4. Finn styrande kombinasjon`,
    },
  },
  {
    id: "steel-capacity",
    category: "steel_capacity",
    difficulty: "medium",
    title: {
      nb: "Stålbjelke — moment- og skjærkapasitet",
      nn: "Stålbjelke — moment- og skjerkapasitet",
    },
    description: {
      nb: "Tester EC3-kapasitet, utnyttelsesgrad, faglige forbehold og usikker kontrollstatus.",
      nn: "Testar EC3-kapasitet, utnyttingsgrad, faglege atterhald og usikker kontrollstatus.",
    },
    tags: ["EC3", "IPE", "kapasitet", "utnytting"],
    prompt: {
      nb: `Jeg har en fritt opplagd stålbjelke i et kontorbygg.

Data:
Spennvidde L = 6,0 m
Profil: IPE 300
Stålkvalitet: S355
Dimensjonerende jevnt fordelt last qEd = 18,0 kN/m

Anta:
Wpl,y = 628 cm3
Av = 2760 mm2
fy = 355 MPa
gammaM0 = 1,0

Kontroller:
1. Maksimalt moment MEd
2. Maksimal skjærkraft VEd
3. Plastisk momentkapasitet Mpl,Rd
4. Skjærkapasitet Vpl,Rd
5. Utnyttelsesgrad for moment
6. Utnyttelsesgrad for skjær
7. Gi faglig vurdering og konklusjon

Bruk Eurokode 3-prinsipp.`,
      nn: `Eg har ein fritt opplagd stålbjelke i eit kontorbygg.

Data:
Spennvidde L = 6,0 m
Profil: IPE 300
Stålkvalitet: S355
Dimensjonerande jamt fordelt last qEd = 18,0 kN/m

Anta:
Wpl,y = 628 cm3
Av = 2760 mm2
fy = 355 MPa
gammaM0 = 1,0

Kontroller:
1. Maksimalt moment MEd
2. Maksimal skjerkraft VEd
3. Plastisk momentkapasitet Mpl,Rd
4. Skjerkapasitet Vpl,Rd
5. Utnyttingsgrad for moment
6. Utnyttingsgrad for skjer
7. Gje fagleg vurdering og konklusjon

Bruk Eurokode 3-prinsipp.`,
    },
  },
  {
    id: "column-buckling",
    category: "buckling",
    difficulty: "hard",
    title: {
      nb: "Søyleknekking — svak akse",
      nn: "Søyleknekking — svak akse",
    },
    description: {
      nb: "Tester slankhet, knekkingskurver, symbolikk og beregningsark til Overleaf.",
      nn: "Testar slankheit, knekkekurver, symbolikk og berekningsark til Overleaf.",
    },
    tags: ["EC3", "knekking", "HEB", "søyle"],
    prompt: {
      nb: `Kontroller knekkingskapasitet for en HEB 200-søyle i S355 om svak akse.

Data:
Profil: HEB 200
A = 78,08 cm2
Iz = 2003 cm4
iz = 5,07 cm
fy = 355 N/mm2
E = 210000 N/mm2
Knekkingslengde Lcr = 4,0 m
Knekkekurve z-z: kurve c
alpha = 0,49
gammaM1 = 1,05

Regn ut:
1. Referanseslankhet lambda1
2. Relativ slankhet lambdabarz
3. Knekkingsparameter phiz
4. Reduksjonsfaktor chiz
5. Knekkingskapasitet Nb,Rd
6. Kort vurdering`,
      nn: `Kontroller knekkingskapasitet for ei HEB 200-søyle i S355 om svak akse.

Data:
Profil: HEB 200
A = 78,08 cm2
Iz = 2003 cm4
iz = 5,07 cm
fy = 355 N/mm2
E = 210000 N/mm2
Knekkingslengde Lcr = 4,0 m
Knekkekurve z-z: kurve c
alpha = 0,49
gammaM1 = 1,05

Rekn ut:
1. Referanseslankheit lambda1
2. Relativ slankheit lambdabarz
3. Knekkingsparameter phiz
4. Reduksjonsfaktor chiz
5. Knekkingskapasitet Nb,Rd
6. Kort vurdering`,
    },
  },
];
