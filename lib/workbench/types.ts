/**
 * Typer for Workbench-fasen (input + Tolkar-streaming).
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 5.
 */

/** Output frå Tolkar (Input-agent) — vurdering av brukar sin forespurnad */
export type AgentResult = {
    status: string;
    berekningstype: string | null;
    fagomraade: string | null;
    tolkte_verdiar: Record<string, string>;
    manglande_verdiar: string[];
    kan_reknast_no: string[];
    kan_ikkje_reknast: string[];
    antakingar: string[];
    tolkings_oppsummering: string;
    konfidens: number;
  };
  
  /** Fase i hovudsida (workbench → calculating → calculation_result) */
  export type Phase = "workbench" | "calculating" | "calculation_result";
  
  /** Kategorisering av tolkte_verdiar for visuell gruppering i TolkteVerdiarGrid */
  export type ValueCategory =
    | "profile_material"
    | "geometry"
    | "loads"
    | "load_combinations"
    | "material_props"
    | "section_props"
    | "stability"
    | "serviceability"
    | "other";