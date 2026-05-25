from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import subprocess
import datetime

root = Path(".").resolve()
downloads = Path.home() / "Downloads"
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
out = downloads / f"pilar-claude-handoff-33-10e-fix2-{stamp}.zip"

def run(cmd):
    try:
        return subprocess.check_output(cmd, cwd=root, text=True, stderr=subprocess.STDOUT).strip()
    except Exception as e:
        return f"FAILED: {' '.join(cmd)}\n{e}"

branch = run(["git", "branch", "--show-current"])
commit = run(["git", "rev-parse", "--short", "HEAD"])
status = run(["git", "status", "--short"])

handoff = f"""# PILAR handoff to Claude - Sprint 33.10e-fix2

Branch: {branch}
Commit: {commit}
Generated: {stamp}

## Status

TypeScript is green. This is a checkpoint after Sprint 33.10e-fix.

AISC Data Guard is improved, but not fully enforced in every output layer.

## Remaining bugs to fix narrowly

Remove/sanitize these remaining leaks from full report, result view, calculation sheet, PDF and Word exports:

- actual Cb for uniform load is 1.14
- Cb approx 1.14
- Cb > 1.0
- W12x26 nominally 26 lb/ft = 0.026 kip/ft
- relatively shallow, wide-flange section
- phib*Mn reduction below phib*Mp expected
- available flexural strength likely reduced below plastic moment
- FORELOPIG GODKJENT / FORELØPIG GODKJENT
- om alle design values

## Desired safe wording

- No refined Cb value is computed or assumed without verified input.
- Beam self-weight must be supplied as verified input or calculated from an approved data source before recalculating demand.
- AISC flexural strength cannot be determined without verified AISC Manual section properties and Chapter F checks.
- LTB may be critical because Lb equals the full span and no intermediate lateral bracing is provided.

## Likely files

- lib/international/display.ts
- lib/report/build-report-model.ts
- lib/report/normalize-report-model.ts
- lib/report/calculation-sheet-model.ts
- app/components/result/CalculationResultView.tsx
- app/rapport/[run_id]/page.tsx
- app/rapport/[run_id]/beregning/page.tsx
- lib/report/render-docx.ts
- lib/report/render-calculation-docx.ts

## Build commands

npx tsc --noEmit --pretty false
npm run debug:sweep
npm run build
"""

include_files = [
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "last-run.log",

    "lib/international/display.ts",
    "lib/engineering-context/agent.ts",
    "lib/report/build-report-model.ts",
    "lib/report/normalize-report-model.ts",
    "lib/report/calculation-sheet-model.ts",
    "lib/report/render-docx.ts",
    "lib/report/render-calculation-docx.ts",
    "lib/report/render-calculation-latex.ts",
    "lib/result/labels.ts",
    "lib/result/tile-heuristics.ts",
    "lib/marginalia-katalog.ts",

    "app/components/result/CalculationResultView.tsx",
    "app/components/TillitGauge.tsx",
    "app/rapport/[run_id]/page.tsx",
    "app/rapport/[run_id]/beregning/page.tsx",
    "app/rapport/[run_id]/_components/OrdlisteFlyt.tsx",
    "app/api/agent-a/route.ts",
    "app/api/agent-b/route.ts",
    "app/api/agent-c/route.ts",
    "app/api/agent-d/route.ts",
    "app/api/agent-e/route.ts",
]

download_patterns = [
    "*F938184D*.pdf",
    "*f938184d*.pdf",
    "*F938184D*.docx",
    "*f938184d*.docx",
    "*Pilar11a*.pdf",
    "*Berekningsnotat*Pilar11a*.pdf",
    "*AI-konstruksjonsassistent11a*.pdf",
]

with ZipFile(out, "w", ZIP_DEFLATED) as z:
    z.writestr("CLAUDE_HANDOFF_33_10E_FIX2.md", handoff)

    for rel in include_files:
        p = root / rel
        if p.exists() and p.is_file():
            z.write(p, f"repo/{rel}")

    docs = root / "docs"
    if docs.exists():
        for p in docs.rglob("*.md"):
            z.write(p, f"repo/{p.relative_to(root)}")

    for pat in download_patterns:
        for p in downloads.glob(pat):
            if p.exists() and p.is_file():
                z.write(p, f"artifacts/{p.name}")

print("Created Claude handoff zip:")
print(out)
print()
print("Git status:")
print(status or "clean")
