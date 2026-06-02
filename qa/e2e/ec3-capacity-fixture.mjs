#!/usr/bin/env node
// PILAR EC3 capacity screening QA fixture + AISC missing-property guard
// ---------------------------------------------------------------------------
// Closeout evidence for EC3 Capacity & Utilization v1 (PRs #54–#59). Drives two
// fresh live runs and asserts the contract:
//
//   CASE ec3  (nb, IPE 300 S355, qEd + L) — EC3 cross-section capacity SCREENING
//     - structured keys M_Ed, V_Ed, Mpl_Rd|M_pl_Rd, Vpl_Rd|V_pl_Rd, eta_M, eta_V
//     - capacity screening card renders, preliminary-only wording
//     - screening keys NOT duplicated into the auto key-results rows
//     - M_Ed / V_Ed remain visible as ordinary results
//     - NO forbidden adequacy/verdict wording IN THE CARD (approved, compliant,
//       compliance, pass, fail, OK, adequate, godkjent, bestått)
//     - Tillit gauge renders separately from the capacity card
//
//   CASE aisc (en/US, W12x26) — demand/LTB diagnostic ONLY (missing-property guard)
//     - no eta_M / eta_V, no capacity card, no DCR, no AISC adequacy/compliance
//
// Read-only against app/runtime source. Writes evidence to
// qa/e2e/reports/ec3-capacity/. No DB/CLI. Scoping notes:
//   * forbidden-wording is checked INSIDE the capacity card only — the separate
//     controller decision badge ("FORELØPIG GODKJENT" / "APPROVED WITH WARNINGS")
//     and the deterministic step text's NEGATED "…not a pass/fail verdict" are
//     the trust/disclaimer layer, not a capacity adequacy claim.
//
// Usage: node qa/e2e/ec3-capacity-fixture.mjs [--base http://localhost:3000] [--timeout 240] [--headful]

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const E2E = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(E2E, 'reports', 'ec3-capacity');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const argv = process.argv.slice(2);
const getArg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const BASE = getArg('--base', 'http://localhost:3000').replace(/\/+$/, '');
const HEADFUL = argv.includes('--headful');
const RUN_TIMEOUT_S = Number(getArg('--timeout', '240'));

const ENG_CTX_KEY = 'pilar-engineering-context-v2';
const US_CTX = {
  language: 'en',
  languagePolicy: { uiLocale: 'en', outputMode: 'same_as_prompt', fallbackLanguage: 'en' },
  region: { countryCode: 'US', countryName: 'United States' },
  standards: { family: 'aisc_asce_aci', label: 'AISC / ASCE / ACI', supportLevel: 'experimental', confidence: 'user_selected' },
  outputPreferences: { units: 'imperial', notationStyle: 'us_customary' },
};

// bilingual workbench matchers (nb default + en international)
const RE_INTERPRET = /Tolk oppgave|Tolk oppgåva|Tolk på nytt|Interpret task|Interpret again/i;
const RE_START = /Start beregning|Start berekning|Start calculation/i;
const RE_STREAMING = /STREAMER|STREAMING|Tolker\.\.\.|Interpreting\.\.\./i;

const CASES = [
  { id: 'ec3', name: 'EC3 capacity screening (nb, IPE 300 S355)', promptFile: 'eurocode-ipe-capacity.txt', context: null, expectLang: 'nb', expectCapacity: true },
  { id: 'aisc', name: 'AISC missing-property guard (en, W12x26)', promptFile: 'english-aisc-simple-beam.txt', context: US_CTX, expectLang: 'en', expectCapacity: false },
];

// ---- one live run ---------------------------------------------------------
async function runCase(c) {
  const prompt = readFileSync(path.join(E2E, 'prompts', c.promptFile), 'utf8').trim();
  const browser = await puppeteer.launch({ headless: !HEADFUL, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const api = [];
  const out = { id: c.id, runId: null, url: null, displayLanguage: null, reportReady: false, text: '', controls: [], structured: null };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1400 });

    if (c.context) {
      await page.evaluateOnNewDocument((ctx, key) => {
        try { localStorage.setItem(key, JSON.stringify(ctx)); document.cookie = 'pilar-ui-mode=intl; path=/; max-age=31536000; samesite=lax'; } catch {}
      }, c.context, ENG_CTX_KEY);
    } else {
      await page.evaluateOnNewDocument((key) => {
        try { localStorage.removeItem(key); document.cookie = 'pilar-ui-mode=no; path=/; max-age=31536000; samesite=lax'; } catch {}
      }, ENG_CTX_KEY);
    }

    const evalSafe = async (fn, ...a) => {
      for (let i = 0; ; i++) {
        try { return await page.evaluate(fn, ...a); }
        catch (e) { const m = e?.message || String(e); if (i < 5 && /detached|destroyed|Execution context|Target closed/i.test(m)) { await sleep(500); continue; } throw e; }
      }
    };
    const handleByText = async (re) => {
      const h = await page.evaluateHandle((src) => [...document.querySelectorAll('button, a')].find((b) => new RegExp(src, 'i').test((b.textContent || '').trim())) || null, re.source);
      return h.asElement();
    };

    page.on('response', async (res) => {
      const u = res.url(); if (!/\/api\//.test(u)) return; let body = '';
      try { if (/json/.test(res.headers()['content-type'] || '')) { const j = await res.json(); body = JSON.stringify(j).slice(0, 200); if (/\/api\/init-run/.test(u) && j?.run_id) out.runId = j.run_id; } } catch {}
      api.push(`${res.request().method()} ${res.status()} ${u.replace(BASE, '')} ${body}`);
    });

    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('textarea', { timeout: 30000 });
    await page.$eval('textarea', (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }, prompt);
    await sleep(500);

    const tolk = await handleByText(RE_INTERPRET); if (tolk) await tolk.click();

    let startReady = false;
    for (let i = 0; i < 120; i++) {
      const s = await evalSafe((startSrc, streamSrc) => {
        const sb = [...document.querySelectorAll('button')].find((b) => new RegExp(startSrc, 'i').test(b.textContent || ''));
        return { present: !!sb, disabled: sb ? !!sb.disabled : true, streaming: new RegExp(streamSrc, 'i').test(document.body.innerText) };
      }, RE_START.source, RE_STREAMING.source);
      if (s.present && !s.disabled && !s.streaming) { startReady = true; break; }
      await sleep(1000);
    }
    if (startReady) await sleep(800);

    if (startReady) {
      api.length = 0;
      const sb = await handleByText(RE_START); if (sb) await sb.click();
      const READY = 2000; const started = Date.now(); let last = -1, stable = 0;
      while ((Date.now() - started) / 1000 < RUN_TIMEOUT_S) {
        await sleep(2500);
        if (!out.runId) out.runId = await evalSafe(() => { const a = document.querySelector('a[href*="rapport/"]'); const m = location.href.match(/\/rapport\/([0-9a-f-]{8,})/i) || ((a && a.getAttribute('href')) || '').match(/rapport\/([0-9a-f-]{8,})/i); return m ? m[1] : null; });
        const st = await evalSafe(() => ({ onReport: /\/rapport\//.test(location.href), len: document.body.innerText.length }));
        if (st.onReport && st.len > READY) { if (st.len === last) { if (++stable >= 3) { out.reportReady = true; break; } } else { stable = 0; last = st.len; } }
      }
      if (!out.reportReady && out.runId) {
        await page.goto(`${BASE}/rapport/${out.runId}`, { waitUntil: 'networkidle2', timeout: 60000 });
        last = -1; stable = 0;
        for (let i = 0; i < 40; i++) { await sleep(1500); const len = await evalSafe(() => document.body.innerText.length); if (len > READY && len === last) { if (++stable >= 3) break; } else { stable = 0; last = len; } }
        out.reportReady = (await evalSafe(() => document.body.innerText.length)) > READY;
      }
      if (out.reportReady) {
        out.url = await evalSafe(() => location.href);
        out.text = await evalSafe(() => document.body.innerText);
        out.controls = await evalSafe(() => { const o = []; for (const el of document.querySelectorAll('button, a, [role="tab"]')) { const t = (el.textContent || '').replace(/\s+/g, ' ').trim(); if (t && t.length <= 48 && !o.includes(t)) o.push(t); } return o.slice(0, 48); });
        await page.screenshot({ path: path.join(OUT, `${c.id}-${out.runId || 'noid'}.png`), fullPage: true });
      }
    }
    // structured results + decision via the public self-serve endpoint (read-only)
    if (out.runId) {
      try {
        const resp = await fetch(`${BASE}/api/runs/${out.runId}`);
        if (resp.ok) {
          const j = await resp.json();
          out.displayLanguage = j?.run?.display_language ?? null;
          out.structured = {
            resultsA: j?.calculationA?.results ?? {},
            resultsB: j?.calculationB?.results ?? {},
            decision: j?.controllerDecision?.decision_status ?? null,
          };
        }
      } catch {}
    }
    writeFileSync(path.join(OUT, `${c.id}-api.log`), api.join('\n') + '\n', 'utf8');
    if (out.text) writeFileSync(path.join(OUT, `${c.id}-${out.runId || 'noid'}.txt`), out.text, 'utf8');
    if (out.structured) writeFileSync(path.join(OUT, `${c.id}-structured.json`), JSON.stringify(out.structured, null, 2), 'utf8');
  } finally { await browser.close(); }
  return out;
}

// ---- assertion helpers ----------------------------------------------------
const countOcc = (text, sub) => text.split(sub).length - 1;
function structuredKeys(out) {
  const s = out.structured || { resultsA: {}, resultsB: {} };
  return new Set([...Object.keys(s.resultsA || {}), ...Object.keys(s.resultsB || {})]);
}
// Slice from a start marker up to (but not including) the first end marker.
// Bounds section windows so they do not bleed into adjacent sections (the
// capacity card sits between the cover key-results and the Tillit gauge).
function sliceFrom(text, startRe, endRes) {
  const m = text.match(startRe);
  if (!m) return '';
  const rest = text.slice(m.index + m[0].length);
  let end = rest.length;
  for (const re of endRes) { const mm = rest.match(re); if (mm && mm.index < end) end = mm.index; }
  return m[0] + rest.slice(0, end);
}
// Cover key-results (auto rows) = header → before the capacity card / Tillit gauge.
function coverKeyResultsBlock(text) {
  return sliceFrom(text, /NØKKELRESULTATER|KEY RESULTS/i, [/Kapasitets-?screening|Capacity screening/i, /\d+\s*\/\s*100/, /VIKTIG MERKNAD|IMPORTANT NOTE/i]);
}
// Capacity card = EXACT card header → before the Tillit gauge / controller prose.
// Anchor on the full header (with the (foreløpig)/(førebels)/(preliminary) suffix
// from CapacityScreening.tsx) — a loose "screening" match also hits the report
// TITLE when it reads "kapasitetsscreening av stålbjelke …", over-capturing into
// the controller decision ("…foreløpig godkjent…").
function capacityCardBlock(text) {
  return sliceFrom(text, /Kapasitets-?screening \((?:foreløpig|førebels)\)|Capacity screening \(preliminary\)/i, [/\d+\s*\/\s*100/, /VIKTIG MERKNAD|IMPORTANT NOTE/i, /Beregningen er forel|The calculation is/i]);
}
function reportTitleLine(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const docIndex = lines.findIndex((line) => /BEREGNINGSNOTAT|CALCULATION REPORT/i.test(line));
  const titleWindow = lines.slice(Math.max(0, docIndex + 1), docIndex >= 0 ? docIndex + 12 : 12);
  return titleWindow.find((line) => /kapasitets-?screening|kapasitetsscreening|capacity screening/i.test(line)) || '';
}

function assertEc3(out) {
  const A = [];
  const text = out.text;
  const keys = structuredKeys(out);
  const hasK = (...alts) => alts.some((k) => keys.has(k));
  const card = capacityCardBlock(text);
  const title = reportTitleLine(text);
  A.push(['lang nb', out.displayLanguage === 'nb', `display_language=${out.displayLanguage}`]);
  A.push(['report rendered', out.reportReady, `len=${text.length}`]);
  A.push(['structured keys present', hasK('M_Ed') && hasK('V_Ed') && hasK('Mpl_Rd', 'M_pl_Rd') && hasK('Vpl_Rd', 'V_pl_Rd') && hasK('eta_M') && hasK('eta_V'), `keys=${[...keys].join(',')}`]);
  A.push(['capacity card shows', card.length > 0, `cardLen=${card.length}`]);
  A.push(['title preliminary capacity screening', /(foreløpig|førebels|preliminary)/i.test(title) && /kapasitets-?screening|kapasitetsscreening|capacity screening/i.test(title) && !/kapasitetskontroll|full capacity check/i.test(title), `title=${title || '-'}`]);
  A.push(['card wording preliminary-only', /(foreløpig|førebels|preliminary)/i.test(card) && /(ikkje? ein? fullstendig kapasitetskontroll|ikke en fullstendig kapasitetskontroll|not a full capacity check)/i.test(card), '']);
  const cover = coverKeyResultsBlock(text);
  A.push(['no duplicate screening keys in cover/result/comparison rows', !/eta_?[MV]|η[MV]|[MV]pl[_,]?Rd|Mpl|Vpl/i.test(cover) && countOcc(text, 'Mpl_Rd') <= 1 && countOcc(text, 'Vpl_Rd') <= 1, `coverHasScreening=${/eta|η|Mpl|Vpl/i.test(cover)} MplRdCount=${countOcc(text, 'Mpl_Rd')}`]);
  A.push(['M_Ed / V_Ed visible', /\bM_Ed\b/.test(text) && /\bV_Ed\b/.test(text), '']);
  const FORBIDDEN = ['approved', 'compliant', 'compliance', 'adequate', 'godkjent', 'bestått', 'OK', 'pass', 'fail'];
  const hitsInCard = FORBIDDEN.filter((w) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'iu').test(card));
  out.diagnostics = { reportTitleLine: title, capacityCardText: card, capacityCardForbiddenHits: hitsInCard };
  A.push(['no forbidden wording in card', card.length > 0 && hitsInCard.length === 0, `cardLen=${card.length} hits=${hitsInCard.join('|') || 'none'}`]);
  A.push(['tillit gauge separate + present', /\/100/.test(text) && /(HØY|HOY|GOOD|MEDIUM|MIDDELS|LAV|LOW)/i.test(text) && /Kapasitets-?screening|Capacity screening/i.test(text), '']);
  return A;
}

function assertAisc(out) {
  const A = [];
  const text = out.text;
  const keys = structuredKeys(out);
  A.push(['lang en', out.displayLanguage === 'en', `display_language=${out.displayLanguage}`]);
  A.push(['report rendered', out.reportReady, `len=${text.length}`]);
  A.push(['demand present (Mu/M_Ed + Vu/V_Ed)', /\bM(?:u|_Ed)\b/.test(text) && /\bV(?:u|_Ed)\b/.test(text), '']);
  A.push(['no eta_M / eta_V keys', !keys.has('eta_M') && !keys.has('eta_V'), `keys=${[...keys].join(',')}`]);
  A.push(['no capacity screening card', !/Kapasitets-?screening|Capacity screening/i.test(text), '']);
  A.push(['no DCR value / utilization claim', !/\bDCR\b\s*[=:]/i.test(text) && !/utilization\s*[=:]\s*\d/i.test(text), '']);
  // Affirmative adequacy/compliance claim about the section — sentence-scoped and
  // NEGATION-AWARE so disclaimers ("does not constitute a code-compliant check",
  // "cannot be shown adequate", "if the capacity check indicates inadequacy") do
  // NOT count. The deterministic guards above (no eta / no card / phi_*_Mn "Not
  // computed") are the primary signal; this catches any prose adequacy leak.
  const ADEQUACY = /\b(?:is|are)\s+(?:adequate|sufficient|safe|compliant|code[- ]compliant)\b|\b(?:section|beam|member|profile)\s+(?:is\s+)?(?:adequate|compliant|sufficient|passes|ok)\b|\bpasses\s+(?:the\s+)?(?:aisc|flexural|shear|capacity|chapter\s*f|code)\b|\bmeets\s+(?:all\s+)?(?:aisc|code)\b|\b(?:adequacy|compliance|capacity)\s+(?:is\s+)?(?:confirmed|demonstrated|verified|satisfied|established)\b/i;
  const NEG = /\b(?:not|no|cannot|can ?not|without|before|until|once|if|whether|pending|unable|requires?|indicates?|undetermined|unverified|does not|do not|in ?adequa\w*|in ?sufficient)\b/i;
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  const affirmHits = sentences.filter((s) => ADEQUACY.test(s) && !NEG.test(s));
  A.push(['no AISC adequacy / final compliance claim', affirmHits.length === 0, affirmHits.length ? `affirmative: "${affirmHits[0].replace(/\s+/g, ' ').slice(0, 90)}"` : 'none (disclaimers negation-aware)']);
  return A;
}

// ---- main -----------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const results = [];
for (const c of CASES) {
  console.log(`\n=== ${c.name} ===`);
  let out, asserts;
  try {
    out = await runCase(c);
    asserts = c.id === 'ec3' ? assertEc3(out) : assertAisc(out);
  } catch (e) {
    console.error(`crash: ${e?.message || e}`);
    results.push({ id: c.id, name: c.name, error: String(e?.message || e), asserts: [], pass: false });
    continue;
  }
  console.log(`runId=${out.runId || '-'} lang=${out.displayLanguage || '?'} decision=${out.structured?.decision || '-'}`);
  for (const [name, pass, detail] of asserts) console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
  const allPass = asserts.every((a) => a[1]);
  const result = { id: c.id, name: c.name, runId: out.runId, url: out.url, displayLanguage: out.displayLanguage, decision: out.structured?.decision ?? null, asserts: asserts.map(([n, p, d]) => ({ name: n, pass: p, detail: d })), pass: allPass };
  if (out.diagnostics) result.diagnostics = out.diagnostics;
  results.push(result);
}

const verdict = results.every((r) => r.pass) ? 'GREEN' : results.some((r) => r.asserts?.some((a) => !a.pass)) ? 'RED' : 'YELLOW';
writeFileSync(path.join(OUT, 'fixture-result.json'), JSON.stringify({ base: BASE, verdict, results }, null, 2), 'utf8');
console.log(`\n=== FIXTURE SUMMARY: ${verdict} ===`);
for (const r of results) console.log(`  ${r.id}: ${r.pass ? 'PASS' : 'FAIL'}${r.error ? ` (${r.error})` : ''}`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
