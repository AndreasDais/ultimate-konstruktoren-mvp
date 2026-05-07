/**
 * Stålprofil-database for Ultimate Konstruktøren.
 *
 * KJELDE: Standard nominal-verdiar frå EN 10365 / typiske profilkatalogar.
 *
 * VERIFISER FØR REELL BRUK: Verdiane skal kryssjekkast mot EN 10365 eller ein
 * autoritativ profilkatalog (SSAB, ArcelorMittal) før systemet blir brukt
 * for noko som skal til prosjektering. Små variasjonar mellom kjelder førekjem.
 *
 * UTVIDING: Strukturen er stabil — legg til fleire profilar etter same mønster
 * når behov dukkar opp. Versjoner endringar i Git slik at gamle rapportar
 * kan reproduserast.
 */

export type SteelProfile = {
    name: string;        // "IPE 240"
    family: "IPE" | "HEA" | "HEB";
    // Geometri (mm)
    h: number;           // total høgd
    b: number;           // flensbreidde
    tw: number;          // stegtjukkleik
    tf: number;          // flenstjukkleik
    // Tverrsnitt
    A: number;           // areal, cm²
    weight: number;      // kg/m
    // Sterk akse (y-y)
    Iy: number;          // andre arealmoment, cm⁴
    Wel_y: number;       // elastisk motstandsmoment, cm³
    Wpl_y: number;       // plastisk motstandsmoment, cm³
    iy: number;          // gyrasjonsradius, cm
    Av_z: number;        // skjærareal vertikal last, cm²
    // Svak akse (z-z)
    Iz: number;          // cm⁴
    Wel_z: number;       // cm³
    Wpl_z: number;       // cm³
    iz: number;          // cm
  };
  
  export const STEEL_PROFILES: SteelProfile[] = [
    // — IPE —
    { name: "IPE 80",  family: "IPE", h: 80,  b: 46, tw: 3.8, tf: 5.2, A: 7.64,  weight: 6.0,  Iy: 80.1,  Wel_y: 20.03, Wpl_y: 23.22, iy: 3.24, Av_z: 3.58, Iz: 8.49,  Wel_z: 3.69,  Wpl_z: 5.82,  iz: 1.05 },
    { name: "IPE 100", family: "IPE", h: 100, b: 55, tw: 4.1, tf: 5.7, A: 10.32, weight: 8.1,  Iy: 171.0, Wel_y: 34.20, Wpl_y: 39.41, iy: 4.07, Av_z: 5.08, Iz: 15.92, Wel_z: 5.79,  Wpl_z: 9.15,  iz: 1.24 },
    { name: "IPE 120", family: "IPE", h: 120, b: 64, tw: 4.4, tf: 6.3, A: 13.21, weight: 10.4, Iy: 317.8, Wel_y: 52.96, Wpl_y: 60.73, iy: 4.90, Av_z: 6.31, Iz: 27.67, Wel_z: 8.65,  Wpl_z: 13.58, iz: 1.45 },
    { name: "IPE 140", family: "IPE", h: 140, b: 73, tw: 4.7, tf: 6.9, A: 16.43, weight: 12.9, Iy: 541.2, Wel_y: 77.32, Wpl_y: 88.34, iy: 5.74, Av_z: 7.64, Iz: 44.92, Wel_z: 12.31, Wpl_z: 19.25, iz: 1.65 },
    { name: "IPE 160", family: "IPE", h: 160, b: 82, tw: 5.0, tf: 7.4, A: 20.09, weight: 15.8, Iy: 869.3, Wel_y: 108.7, Wpl_y: 123.9, iy: 6.58, Av_z: 9.66, Iz: 68.31, Wel_z: 16.66, Wpl_z: 26.10, iz: 1.84 },
    { name: "IPE 180", family: "IPE", h: 180, b: 91, tw: 5.3, tf: 8.0, A: 23.95, weight: 18.8, Iy: 1317, Wel_y: 146.3, Wpl_y: 166.4, iy: 7.42, Av_z: 11.25, Iz: 100.9, Wel_z: 22.16, Wpl_z: 34.60, iz: 2.05 },
    { name: "IPE 200", family: "IPE", h: 200, b: 100, tw: 5.6, tf: 8.5, A: 28.48, weight: 22.4, Iy: 1943, Wel_y: 194.3, Wpl_y: 220.6, iy: 8.26, Av_z: 14.00, Iz: 142.4, Wel_z: 28.47, Wpl_z: 44.61, iz: 2.24 },
    { name: "IPE 220", family: "IPE", h: 220, b: 110, tw: 5.9, tf: 9.2, A: 33.37, weight: 26.2, Iy: 2772, Wel_y: 252.0, Wpl_y: 285.4, iy: 9.11, Av_z: 15.88, Iz: 204.9, Wel_z: 37.25, Wpl_z: 58.11, iz: 2.48 },
    { name: "IPE 240", family: "IPE", h: 240, b: 120, tw: 6.2, tf: 9.8, A: 39.12, weight: 30.7, Iy: 3892, Wel_y: 324.3, Wpl_y: 366.6, iy: 9.97, Av_z: 19.14, Iz: 283.6, Wel_z: 47.27, Wpl_z: 73.92, iz: 2.69 },
    { name: "IPE 270", family: "IPE", h: 270, b: 135, tw: 6.6, tf: 10.2, A: 45.95, weight: 36.1, Iy: 5790, Wel_y: 428.9, Wpl_y: 484.0, iy: 11.23, Av_z: 22.14, Iz: 419.9, Wel_z: 62.20, Wpl_z: 96.95, iz: 3.02 },
    { name: "IPE 300", family: "IPE", h: 300, b: 150, tw: 7.1, tf: 10.7, A: 53.81, weight: 42.2, Iy: 8356, Wel_y: 557.1, Wpl_y: 628.4, iy: 12.46, Av_z: 25.68, Iz: 603.8, Wel_z: 80.50, Wpl_z: 125.2, iz: 3.35 },
    { name: "IPE 330", family: "IPE", h: 330, b: 160, tw: 7.5, tf: 11.5, A: 62.61, weight: 49.1, Iy: 11770, Wel_y: 713.1, Wpl_y: 804.3, iy: 13.71, Av_z: 30.81, Iz: 788.1, Wel_z: 98.52, Wpl_z: 153.7, iz: 3.55 },
    { name: "IPE 360", family: "IPE", h: 360, b: 170, tw: 8.0, tf: 12.7, A: 72.73, weight: 57.1, Iy: 16270, Wel_y: 903.6, Wpl_y: 1019, iy: 14.95, Av_z: 35.14, Iz: 1043, Wel_z: 122.8, Wpl_z: 191.1, iz: 3.79 },
    { name: "IPE 400", family: "IPE", h: 400, b: 180, tw: 8.6, tf: 13.5, A: 84.46, weight: 66.3, Iy: 23130, Wel_y: 1156, Wpl_y: 1307, iy: 16.55, Av_z: 42.69, Iz: 1318, Wel_z: 146.4, Wpl_z: 229.0, iz: 3.95 },
    { name: "IPE 450", family: "IPE", h: 450, b: 190, tw: 9.4, tf: 14.6, A: 98.82, weight: 77.6, Iy: 33740, Wel_y: 1500, Wpl_y: 1702, iy: 18.48, Av_z: 50.85, Iz: 1676, Wel_z: 176.4, Wpl_z: 276.4, iz: 4.12 },
    { name: "IPE 500", family: "IPE", h: 500, b: 200, tw: 10.2, tf: 16.0, A: 115.5, weight: 90.7, Iy: 48200, Wel_y: 1928, Wpl_y: 2194, iy: 20.43, Av_z: 59.87, Iz: 2142, Wel_z: 214.2, Wpl_z: 335.9, iz: 4.31 },
  
    // — HEA —
    { name: "HEA 200", family: "HEA", h: 190, b: 200, tw: 6.5, tf: 10.0, A: 53.83, weight: 42.3, Iy: 3692, Wel_y: 388.6, Wpl_y: 429.5, iy: 8.28, Av_z: 18.08, Iz: 1336, Wel_z: 133.6, Wpl_z: 203.8, iz: 4.98 },
    { name: "HEA 220", family: "HEA", h: 210, b: 220, tw: 7.0, tf: 11.0, A: 64.34, weight: 50.5, Iy: 5410, Wel_y: 515.2, Wpl_y: 568.5, iy: 9.17, Av_z: 20.67, Iz: 1955, Wel_z: 177.7, Wpl_z: 270.6, iz: 5.51 },
    { name: "HEA 240", family: "HEA", h: 230, b: 240, tw: 7.5, tf: 12.0, A: 76.84, weight: 60.3, Iy: 7763, Wel_y: 675.1, Wpl_y: 744.6, iy: 10.05, Av_z: 25.18, Iz: 2769, Wel_z: 230.7, Wpl_z: 351.7, iz: 6.00 },
    { name: "HEA 280", family: "HEA", h: 270, b: 280, tw: 8.0, tf: 13.0, A: 97.26, weight: 76.4, Iy: 13670, Wel_y: 1013, Wpl_y: 1112, iy: 11.86, Av_z: 31.74, Iz: 4763, Wel_z: 340.2, Wpl_z: 518.1, iz: 7.00 },
    { name: "HEA 300", family: "HEA", h: 290, b: 300, tw: 8.5, tf: 14.0, A: 112.5, weight: 88.3, Iy: 18260, Wel_y: 1260, Wpl_y: 1383, iy: 12.74, Av_z: 37.28, Iz: 6310, Wel_z: 420.6, Wpl_z: 641.2, iz: 7.49 },
  
    // — HEB —
    { name: "HEB 200", family: "HEB", h: 200, b: 200, tw: 9.0, tf: 15.0, A: 78.08, weight: 61.3, Iy: 5696, Wel_y: 569.6, Wpl_y: 642.5, iy: 8.54, Av_z: 24.83, Iz: 2003, Wel_z: 200.3, Wpl_z: 305.8, iz: 5.07 },
    { name: "HEB 220", family: "HEB", h: 220, b: 220, tw: 9.5, tf: 16.0, A: 91.04, weight: 71.5, Iy: 8091, Wel_y: 735.5, Wpl_y: 827.0, iy: 9.43, Av_z: 27.92, Iz: 2843, Wel_z: 258.5, Wpl_z: 393.9, iz: 5.59 },
    { name: "HEB 240", family: "HEB", h: 240, b: 240, tw: 10.0, tf: 17.0, A: 106.0, weight: 83.2, Iy: 11260, Wel_y: 938.3, Wpl_y: 1053, iy: 10.31, Av_z: 33.23, Iz: 3923, Wel_z: 326.9, Wpl_z: 498.4, iz: 6.08 },
    { name: "HEB 280", family: "HEB", h: 280, b: 280, tw: 10.5, tf: 18.0, A: 131.4, weight: 103.0, Iy: 19270, Wel_y: 1376, Wpl_y: 1534, iy: 12.11, Av_z: 41.09, Iz: 6595, Wel_z: 471.0, Wpl_z: 717.6, iz: 7.09 },
    { name: "HEB 300", family: "HEB", h: 300, b: 300, tw: 11.0, tf: 19.0, A: 149.1, weight: 117.0, Iy: 25170, Wel_y: 1678, Wpl_y: 1869, iy: 12.99, Av_z: 47.43, Iz: 8563, Wel_z: 570.9, Wpl_z: 870.1, iz: 7.58 },
  ];
  
  /**
   * Slå opp ein profil etter eksakt namn (t.d. "IPE 240").
   * Returnerer null viss profilen ikkje finst i tabellen.
   */
  export function findProfile(name: string): SteelProfile | null {
    const normalized = name.trim().toUpperCase().replace(/\s+/g, " ");
    return STEEL_PROFILES.find((p) => p.name.toUpperCase() === normalized) ?? null;
  }