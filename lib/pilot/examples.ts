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
    profiles: ["eurocode_norway"],
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
    profiles: ["eurocode_norway"],
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
    profiles: ["eurocode_norway"],
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
    profiles: ["eurocode_norway"],
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

  // ============================================================
  // INTERNASJONALE EKSEMPEL — first draft, treng SME-review
  // ============================================================
  // Strukturen følgjer dei norske: 4 eksempel per profil med
  // category easy/medium/medium/hard. Engelske strenger berre.
  //
  // Profilar dekt no: eurocode_general, eurocode_uk_na, aisc_asce_aci.
  // canada og australia kjem seinare; sida viser tom-tilstand til då.
  // ============================================================

  // ---------- Eurocode general (no NA) ----------
  {
    id: "ec-gen-beam-basic",
    category: "beam",
    difficulty: "easy",
    profiles: ["eurocode_general"],
    tags: ["beam", "moment", "shear", "EC"],
    title: { en: "Simply-supported beam — moment and shear" },
    description: {
      en: "Tests the basic flow: interpret input, compute internal forces, produce a report and calculation sheet.",
    },
    prompt: {
      en: `A simply-supported steel beam has span L = 5.0 m.

It carries a uniformly distributed design load:
qEd = 8.0 kN/m.

Compute:
1. Maximum design bending moment MEd
2. Maximum design shear force VEd
3. Show step-by-step working
4. Explain where moment and shear are largest

Apply Eurocode 0 / EN 1990 conventions. Do not apply national annex factors.`,
    },
  },
  {
    id: "ec-gen-load-combination",
    category: "load_combination",
    difficulty: "medium",
    profiles: ["eurocode_general"],
    tags: ["EN1990", "load_combination", "ULS"],
    title: { en: "Load combination per EN 1990 (no NA)" },
    description: {
      en: "Tests symbol handling, combination factors, tables and multiple calculation alternatives.",
    },
    prompt: {
      en: `A beam carries the following characteristic loads:

Permanent: Gk = 6.0 kN/m
Imposed (office, category B): Qk = 8.0 kN/m
Snow: Sk = 3.5 kN/m

Determine the design ultimate-limit-state combination per EN 1990 (Eurocode 0) using the general recommended values (no national annex).

Use:
gammaG = 1.35 (eqn 6.10a)
gammaG = 1.20 (eqn 6.10b)
gammaQ = 1.50
psi0 for imposed cat B = 0.7
psi0 for snow (general recommended, H ≤ 1000 m) = 0.5

Check:
1. eqn 6.10a (all variables with psi0)
2. eqn 6.10b with imposed as the leading variable action
3. eqn 6.10b with snow as the leading variable action
4. Identify the governing combination`,
    },
  },
  {
    id: "ec-gen-steel-capacity",
    category: "steel_capacity",
    difficulty: "medium",
    profiles: ["eurocode_general"],
    tags: ["EN1993", "IPE", "capacity"],
    title: { en: "Steel beam — moment and shear capacity per EN 1993" },
    description: {
      en: "Tests EC3 capacity, utilisation, engineering caveats and uncertain check status.",
    },
    prompt: {
      en: `A simply-supported steel beam in an office building.

Data:
Span L = 6.0 m
Section: IPE 300
Steel grade: S355
Design uniformly distributed load qEd = 18.0 kN/m

Assume (general EN 1993-1-1 values, no NA):
Wpl,y = 628 cm3
Av = 2760 mm2
fy = 355 MPa
gammaM0 = 1.00

Check:
1. Maximum moment MEd
2. Maximum shear force VEd
3. Plastic moment capacity Mpl,Rd
4. Shear capacity Vpl,Rd
5. Moment utilisation
6. Shear utilisation
7. Provide an engineering assessment and conclusion

Apply Eurocode 3 principles. No national annex factors.`,
    },
  },
  {
    id: "ec-gen-column-buckling",
    category: "buckling",
    difficulty: "hard",
    profiles: ["eurocode_general"],
    tags: ["EN1993", "buckling", "HEB"],
    title: { en: "Column buckling — minor axis per EN 1993" },
    description: {
      en: "Tests slenderness, buckling curves, symbolic notation and calculation sheet output.",
    },
    prompt: {
      en: `Check the flexural buckling capacity of an HEB 200 column in S355 steel about the minor axis.

Data:
Section: HEB 200
A = 78.08 cm2
Iz = 2003 cm4
iz = 5.07 cm
fy = 355 N/mm2
E = 210000 N/mm2
Buckling length Lcr = 4.0 m
Buckling curve z-z: curve c
alpha = 0.49
gammaM1 = 1.00

Compute:
1. Reference slenderness lambda1
2. Relative slenderness lambdabar_z
3. Phi_z
4. Reduction factor chi_z
5. Buckling capacity Nb,Rd
6. Short engineering assessment

Apply EN 1993-1-1 §6.3.1 without national annex factors.`,
    },
  },

  // ---------- Eurocode + UK National Annex ----------
  {
    id: "ec-uk-beam-basic",
    category: "beam",
    difficulty: "easy",
    profiles: ["eurocode_uk_na"],
    tags: ["BS_EN", "beam", "UK_NA"],
    title: { en: "Simply-supported beam — moment and shear (UK NA)" },
    description: {
      en: "Tests the basic flow against BS EN with the UK National Annex.",
    },
    prompt: {
      en: `A simply-supported steel beam has span L = 5.0 m.

It carries a uniformly distributed design load:
qEd = 8.0 kN/m.

Compute per BS EN 1993-1-1 with the UK National Annex:
1. Maximum design bending moment MEd
2. Maximum design shear force VEd
3. Step-by-step working
4. Explain location of maximum moment and shear

Reference: NA to BS EN 1990 and NA to BS EN 1993-1-1.`,
    },
  },
  {
    id: "ec-uk-load-combination",
    category: "load_combination",
    difficulty: "medium",
    profiles: ["eurocode_uk_na"],
    tags: ["BS_EN1990", "load_combination", "UK_NA"],
    title: { en: "Load combination per BS EN 1990 with UK NA" },
    description: {
      en: "Tests UK-NA-specific partial factors and combination factors.",
    },
    prompt: {
      en: `A beam carries the following characteristic loads:

Permanent: Gk = 6.0 kN/m
Imposed (office, category B): Qk = 8.0 kN/m
Snow: Sk = 3.5 kN/m

Determine the design ULS combination per BS EN 1990 with the UK National Annex.

Use UK NA values:
gammaG = 1.35 (eqn 6.10a)
gammaG = 1.25 (eqn 6.10b, UK NA)
gammaQ = 1.50
psi0 for imposed cat B = 0.7
psi0 for snow (UK, altitude ≤ 1000 m) = 0.5

Check:
1. eqn 6.10a
2. eqn 6.10b with imposed as leading variable
3. eqn 6.10b with snow as leading variable
4. Identify the governing combination`,
    },
  },
  {
    id: "ec-uk-steel-capacity",
    category: "steel_capacity",
    difficulty: "medium",
    profiles: ["eurocode_uk_na"],
    tags: ["BS_EN1993", "UB", "UK_NA"],
    title: { en: "Steel beam — moment and shear capacity per BS EN 1993 + UK NA" },
    description: {
      en: "Tests EC3 capacity check using a UK universal beam section.",
    },
    prompt: {
      en: `A simply-supported steel beam in an office building.

Data:
Span L = 6.0 m
Section: UB 305x102x33 (UK universal beam)
Steel grade: S355
Design uniformly distributed load qEd = 18.0 kN/m

Section properties (UK steel manual, indicative):
Wpl,y = 481 cm3
Av = 1860 mm2
fy = 355 MPa
gammaM0 = 1.00 (UK NA to BS EN 1993-1-1)

Check:
1. Maximum moment MEd
2. Maximum shear VEd
3. Plastic moment capacity Mpl,Rd = Wpl,y × fy / gammaM0
4. Shear capacity Vpl,Rd
5. Moment utilisation
6. Shear utilisation
7. Engineering assessment

Apply BS EN 1993-1-1 with the UK National Annex.`,
    },
  },
  {
    id: "ec-uk-column-buckling",
    category: "buckling",
    difficulty: "hard",
    profiles: ["eurocode_uk_na"],
    tags: ["BS_EN1993", "UC", "buckling", "UK_NA"],
    title: { en: "Column buckling — minor axis per BS EN 1993 + UK NA" },
    description: {
      en: "Tests minor-axis flexural buckling of a UK column section.",
    },
    prompt: {
      en: `Check the flexural buckling capacity of a UC 203x203x46 column in S355 about the minor axis.

Data:
Section: UC 203x203x46
A = 58.7 cm2
Iz = 1548 cm4
iz = 5.13 cm
fy = 355 N/mm2
E = 210000 N/mm2
Buckling length Lcr = 4.0 m
Buckling curve z-z: curve c
alpha = 0.49
gammaM1 = 1.00 (UK NA)

Compute:
1. Reference slenderness lambda1
2. Relative slenderness lambdabar_z
3. Phi_z
4. Reduction factor chi_z
5. Buckling capacity Nb,Rd
6. Brief engineering assessment

Apply BS EN 1993-1-1 §6.3.1 with UK NA.`,
    },
  },

  // ---------- AISC / ASCE / ACI (US) ----------
  {
    id: "aisc-beam-basic",
    category: "beam",
    difficulty: "easy",
    profiles: ["aisc_asce_aci"],
    tags: ["AISC", "LRFD", "beam"],
    title: { en: "Simply-supported beam — moment and shear (US units, LRFD)" },
    description: {
      en: "Tests the basic flow in US customary units against AISC 360 LRFD conventions.",
    },
    prompt: {
      en: `A simply-supported steel beam has a span L = 16 ft.

It carries a uniformly distributed factored design load (LRFD):
wu = 0.55 kip/ft

Compute:
1. Maximum factored bending moment Mu in kip-ft
2. Maximum factored shear Vu in kip
3. Step-by-step working
4. Explain where moment and shear are largest

Use US customary units throughout. Follow AISC 360 LRFD conventions.`,
    },
  },
  {
    id: "aisc-load-combination",
    category: "load_combination",
    difficulty: "medium",
    profiles: ["aisc_asce_aci"],
    tags: ["ASCE7", "LRFD", "load_combination"],
    title: { en: "Load combination per ASCE 7 LRFD" },
    description: {
      en: "Tests ASCE 7 factored load combinations and identifying the governing case.",
    },
    prompt: {
      en: `A beam carries the following nominal loads:

Dead load D = 0.40 kip/ft
Live load L = 0.55 kip/ft (office, ASCE 7 Table 4.3-1)
Snow load S = 0.24 kip/ft (ground snow pg = 30 psf, exposure normal)

Determine the governing LRFD load combination per ASCE 7-22 Section 2.3.

Check the following combinations (as applicable):
1. 1.4D
2. 1.2D + 1.6L + 0.5(Lr or S or R)
3. 1.2D + 1.6(Lr or S or R) + (L or 0.5W)
4. Identify governing combination and the design factored UDL wu`,
    },
  },
  {
    id: "aisc-steel-capacity",
    category: "steel_capacity",
    difficulty: "medium",
    profiles: ["aisc_asce_aci"],
    tags: ["AISC360", "LRFD", "W-shape"],
    title: { en: "Steel beam — flexural and shear capacity per AISC 360 LRFD" },
    description: {
      en: "Tests AISC 360 LRFD beam design with a compact W-shape, fully braced.",
    },
    prompt: {
      en: `A simply-supported steel beam in an office building, lateral-torsional buckling assumed prevented (fully braced).

Data:
Span L = 20 ft
Section: W12x26
Steel: ASTM A992 (Fy = 50 ksi)
Factored uniformly distributed load wu = 1.20 kip/ft

Section properties (AISC Steel Construction Manual, indicative):
Zx = 37.2 in3
Sx = 33.4 in3
Ag = 7.65 in2
tw = 0.230 in
d = 12.22 in
phi_b = 0.90 (flexure)
phi_v = 1.00 (shear, h/tw within Section G2.1(b)(1) limit)

Compute:
1. Required moment Mu (in kip-ft)
2. Required shear Vu (in kip)
3. Plastic moment Mp = Fy × Zx (assume compact section)
4. Nominal moment Mn = Mp
5. Design flexural strength phi_b × Mn
6. Web area Aw = d × tw
7. Nominal shear Vn = 0.6 × Fy × Aw × Cv (assume Cv = 1.0)
8. Design shear strength phi_v × Vn
9. Demand-to-capacity ratios for moment and shear
10. Engineering assessment

Apply AISC 360-22 LRFD.`,
    },
  },
  {
    id: "aisc-column-buckling",
    category: "buckling",
    difficulty: "hard",
    profiles: ["aisc_asce_aci"],
    tags: ["AISC360", "buckling", "W-shape", "LRFD"],
    title: { en: "Column buckling — minor axis per AISC 360 LRFD" },
    description: {
      en: "Tests AISC 360 Chapter E flexural buckling for a non-slender W-shape.",
    },
    prompt: {
      en: `Check the flexural buckling capacity of a W8x31 column in ASTM A992 steel about the minor (y) axis.

Data:
Section: W8x31
Ag = 9.13 in2
ry = 2.02 in
Iy = 37.1 in4
Fy = 50 ksi
E = 29000 ksi
Unbraced length Ly = 12 ft
Effective length factor Ky = 1.0
phi_c = 0.90

Compute per AISC 360-22 Chapter E (assume non-slender W-shape, flexural buckling controls):
1. Slenderness K × L / ry
2. Elastic buckling stress Fe = pi^2 × E / (KL/ry)^2
3. Check slenderness limit 4.71 × sqrt(E/Fy) and pick equation E3-2 or E3-3
4. Critical stress Fcr
5. Nominal compressive strength Pn = Fcr × Ag
6. Design compressive strength phi_c × Pn
7. Brief engineering assessment`,
    },
  },
];
