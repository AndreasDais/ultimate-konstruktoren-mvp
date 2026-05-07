import { STEEL_PROFILES, SteelProfile } from "./steel-profiles";

// Matchar "IPE 240", "IPE240", "ipe-240" osv.
const PROFILE_REGEX = /\b(IPE|HEA|HEB)[\s\-]*(\d{2,3})\b/gi;

/**
 * Finn alle stålprofilar nemnt i ein tekst og returner dei matchande
 * SteelProfile-objekta frå databasen.
 *
 * Profilar som er nemnt men ikkje finst i databasen vert hoppa over
 * stille — det er bevisst, slik at agentane framleis kan handtere
 * forespurnaden, men utan injisert data for dei manglande profilane.
 */
export function extractMentionedProfiles(text: string): SteelProfile[] {
  const matches = Array.from(text.matchAll(PROFILE_REGEX));
  const found = new Set<string>();

  for (const match of matches) {
    const family = match[1].toUpperCase();
    const size = match[2];
    found.add(`${family} ${size}`);
  }

  return STEEL_PROFILES.filter((p) => found.has(p.name));
}

/**
 * Bygg ein prompt-blokk som kan sprøytast inn i Agent A/B sin user message.
 * Returnerer tom streng viss ingen profilar er funne.
 */
export function buildProfileDataPromptBlock(profiles: SteelProfile[]): string {
  if (profiles.length === 0) return "";

  const header =
    "PROFILDATA — REFERANSEVERDIAR (bruk desse eksakte verdiane, ikkje hugs frå minnet):\n";

  const rows = profiles
    .map(
      (p) =>
        `${p.name}: ` +
        `h=${p.h} mm, b=${p.b} mm, tw=${p.tw} mm, tf=${p.tf} mm, ` +
        `A=${p.A} cm², m=${p.weight} kg/m, ` +
        `Iy=${p.Iy} cm⁴, Wel,y=${p.Wel_y} cm³, Wpl,y=${p.Wpl_y} cm³, iy=${p.iy} cm, ` +
        `Av,z=${p.Av_z} cm², ` +
        `Iz=${p.Iz} cm⁴, Wel,z=${p.Wel_z} cm³, Wpl,z=${p.Wpl_z} cm³, iz=${p.iz} cm`
    )
    .join("\n");

    return `${header}${rows}\n\n`;
}