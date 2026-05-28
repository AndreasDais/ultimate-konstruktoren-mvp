# Konstruktør emits invalid KaTeX (`\sqrt^3`) — handoff to Codex

**Source:** intl sweep session, 2026-05-28 (observed on manual run `a98bf5aa-f58d-457e-919a-b86968a682bd`).
**Author:** UI/Landing track. This is a Runtime-lane (Konstruktør agent output) finding, surfaced as a handoff per `LANES.md`. Not fixed by this track.

## What

A Konstruktør agent (agent-a / agent-b) emitted **invalid LaTeX** in a `calculation_steps` entry — `\sqrt^3` where it should be `\sqrt{3}` (the √3 in the EC3 shear formula τ = f_y/√3). Exact string from the browser log:

```latex
\begin{aligned}Vc,Rd &=  A_v \times (f_y / \sqrt^3) / \gamma_{M0} \\ &=  2006.8 \times (355 / \sqrt^3) / 1.00 \\ &=  2006.8 \times 204.96 \\ &=  411 302 N \\ &=  411.3\,\mathrm{kN}\end{aligned}
```

`\sqrt` requires a braced argument; `\sqrt^3` (sqrt immediately followed by a superscript) is always malformed and KaTeX rejects it with *"Expected group as argument to '\sqrt'"*.

## Impact (low — presentation only)

- **No crash, no data corruption.** `app/components/Formula.tsx` (UI lane) is robust: it catches the parse error and falls back to the plain-text derivation, and is additionally wrapped in an error boundary. The calculation sheet page rendered `200`. **No change needed in Formula.tsx** — verified this sweep.
- The only effect: that one step shows as plain text instead of a typeset formula. Numbers/results are unaffected (agent_outputs JSON is valid).

## Suggested direction (Runtime lane)

1. Tighten the Konstruktør A/B system-prompt LaTeX guidance: roots must be `\sqrt{...}` (braced), never `\sqrt^...`. Same class of issue as the LaTeX double-escaping that drove the `jsonrepair` fallback — worth a one-line "valid-LaTeX" rule + example.
2. Optionally add a tiny server-side LaTeX sanitiser for the unambiguous `\sqrt^{n}`/`\sqrt^n` → `\sqrt{n}` case (the UI track can instead add it presentation-side if you'd rather keep it out of the agent path — say the word).
3. Consider a cheap eval assertion: agent `calculation_steps[].latex` parses under KaTeX `throwOnError:true`.
