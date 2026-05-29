#!/usr/bin/env node
// PILAR Synthetic User E2E runner
// ---------------------------------------------------------------------------
// Automates qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md flows A (English/AISC) and
// B (Norwegian/Eurocode): input -> interpret -> run -> /rapport/<runId>, then
// asserts the checklist's must-show / must-not-show strings and writes an
// evidence bundle to qa/e2e/reports/.
//
// Lane: qa/e2e (Synthetic User / E2E). Touches NO app code, agent prompts,
// Supabase schema, report rendering, PDF/Word code, or i18n. This is the
// sanctioned "future automation target" from checklist §7 (the manual
// checklist has already been exercised for both flows).
//
// Usage:
//   node qa/e2e/synthetic-user.mjs --flow B
//   node qa/e2e/synthetic-user.mjs --flow A
//   node qa/e2e/synthetic-user.mjs --flow A,B            (default)
//   node qa/e2e/synthetic-user.mjs --flow A --base http://localhost:3000 \
//        --headful --timeout 180
//
// Exit codes: 0 = all requested flows PASS or PASS-WITH-WARNINGS
//             1 = at least one flow FAILed
//             2 = setup error (no valid flow requested)
// ---------------------------------------------------------------------------

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const E2E = path.dirname(fileURLToPath(import.meta.url));
const REPORTS = path.join(E2E, 'reports');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- args ----------------------------------------------------------------
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const BASE = getArg('--base', 'http://localhost:3000').replace(/\/+$/, '');
const HEADFUL = argv.includes('--headful');
const RUN_TIMEOUT_S = Number(getArg('--timeout', '180'));
const FLOWS_REQUESTED = getArg('--flow', 'A,B')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

// ---- engineering context (controls display language) ---------------------
// localStorage key the app loads engineering context from (lib/engineering-context/profiles.ts).
const ENGINEERING_CONTEXT_STORAGE_KEY = 'pilar-engineering-context-v2';
// US/AISC context — exactly what the /international selector persists. Seeding this
// makes displayLanguageForContext() resolve to "en", so Flow A runs in international/
// English mode. WITHOUT it PILAR defaults to Norwegian (display_language "nb") and the
// Flow A English-label assertions are meaningless. countryCode must NOT be "NO" or the
// app discards it on load (Norway = the default Norwegian flow).
const US_AISC_CONTEXT = {
  language: 'en',
  languagePolicy: { uiLocale: 'en', outputMode: 'same_as_prompt', fallbackLanguage: 'en' },
  region: { countryCode: 'US', countryName: 'United States' },
  standards: { family: 'aisc_asce_aci', label: 'AISC / ASCE / ACI', supportLevel: 'experimental', confidence: 'user_selected' },
  outputPreferences: { units: 'imperial', notationStyle: 'us_customary' },
};

// Workbench controls are bilingual — nb default vs en international labels
// (lib/result/labels.ts + page.tsx override map). Match BOTH so the runner drives
// either mode: "Start beregning →"/"Start calculation →", "Tolk oppgaven →"/
// "Interpret task →", "● STREAMER"/"Tolker..."/"● STREAMING"/"Interpreting...".
const RE_INTERPRET = /Tolk oppgave|Tolk oppgåva|Tolk på nytt|Interpret task|Interpret again/i;
const RE_START = /Start beregning|Start berekning|Start calculation/i;
const RE_STREAMING = /STREAMER|STREAMING|Tolker\.\.\.|Interpreting\.\.\./i;

// ---- flow definitions (from checklist §4 / §5) ---------------------------
// mustShow:    array of OR-groups; a group passes if ANY alternative is present
//              (case-insensitive substring — lenient, since we *want* to find these).
// mustNotShow: forbidden tokens matched on Unicode *letter* boundaries, so that
//              'ft' does NOT match 'skjærkraft' and 'GOD' does NOT match
//              'godkjent', while a digit-glued leak like '100/100Høy' is still
//              caught. This reproduces the original Flow B result (forbidden: []).
const FLOWS = {
  A: {
    label: 'A',
    name: 'English/AISC diagnostic',
    promptFile: 'english-aisc-simple-beam.txt',
    context: US_AISC_CONTEXT, // activate international/US => display_language "en"
    expectLanguage: 'en',
    mustShow: [
      ['Engineer A'], ['Engineer B'],
      ['Comparator', 'Engineer comparison', 'Comparison'], // labelled "Engineer comparison" when A/B agree
      ['Controller'],
      ['Preliminarily approved', 'preliminary'],
      ['High', 'Medium', 'Low'],
      ['Calculation note'], ['Assumptions'], ['Warnings'],
    ],
    mustNotShow: [
      'Konstruktør', 'Kontrollør', 'Samanliknar', 'Sammenligner',
      'FØREBELS', 'FORELØPIG', 'HØG', 'HØY', 'LAV', 'GOD',
      'NS-EN', 'Eurocode 3', 'M_Ed', 'V_Ed', 'gamma_G', 'gamma_Q',
    ],
  },
  B: {
    label: 'B',
    name: 'Norwegian Eurocode sanity',
    promptFile: 'norwegian-simple-beam.txt',
    context: null, // Norwegian default (no international context) => display_language "nb"
    expectLanguage: 'nb',
    mustShow: [
      ['kN/m'], ['kNm'], ['kN'],
      ['maksimalt bøyemoment', 'største bøyemoment'],
      ['skjærkraft'],
      // "simply supported beam" — bokmål "opplagret" / nynorsk "opplagd", often "stålbjelke"
      ['fritt opplagd bjelke', 'fritt opplagret bjelke', 'fritt opplagd', 'fritt opplagret'],
    ],
    mustNotShow: ['AISC', 'ASCE', 'kip', 'ft', 'W12x26', 'ASTM A992', 'LRFD'],
  },
};

// ---- matchers ------------------------------------------------------------
const hasGroup = (text, group) => {
  const lc = text.toLowerCase();
  return group.some((alt) => lc.includes(alt.toLowerCase()));
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasToken = (text, token) =>
  // letters are word chars; digits/punct/space are boundaries
  new RegExp(`(^|[^\\p{L}])${escapeRe(token)}([^\\p{L}]|$)`, 'iu').test(text);

// Strip report lines that echo the user's prompt, so guardrail checks judge the
// MODEL's output, not the user's own words — both prompts literally name
// forbidden terms (e.g. "Do not use ... NS-EN, Eurocode 3 ..."). Fuzzy by
// word-overlap (Jaccard >= 0.6) because the UI re-renders tokens (gamma_G -> γG,
// M_Ed -> MEd), which defeats verbatim line matching. Short lines are kept so
// standalone shell badges (e.g. "GOD", "FORELØPIG") are still judged.
const normWord = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const wordsOf = (line) =>
  new Set(line.split(/[\s,;:.()/]+/).map(normWord).filter((w) => w.length > 1));
const stripPromptEcho = (text, promptText) => {
  const promptSets = promptText.split('\n').map(wordsOf).filter((s) => s.size >= 3);
  return text.split('\n').filter((line) => {
    const lw = wordsOf(line);
    if (lw.size < 3) return true;
    for (const ps of promptSets) {
      let inter = 0;
      for (const w of lw) if (ps.has(w)) inter++;
      const union = lw.size + ps.size - inter;
      if (union > 0 && inter / union >= 0.6) return false;
    }
    return true;
  }).join('\n');
};

// ---- per-flow runner -----------------------------------------------------
async function runFlow(flow) {
  const prompt = readFileSync(path.join(E2E, 'prompts', flow.promptFile), 'utf8').trim();
  const browser = await puppeteer.launch({
    headless: !HEADFUL,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const result = {
    label: flow.label, name: flow.name, verdict: 'FAIL', reportReady: false,
    runId: null, url: null, missing: [], forbidden: [], hasPdf: false,
    hasWord: false, textLen: 0, scanLen: 0, screenshot: null, controls: [],
    displayLanguage: null, expectLanguage: flow.expectLanguage,
  };
  const api = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });

    // Activate the engineering context BEFORE any page script runs, so page.tsx's
    // loadEngineeringContextFromStorage() picks it up on mount. Flow A => US/AISC
    // (display_language "en"); Flow B => cleared (Norwegian default "nb"). Each flow
    // uses a fresh browser, so this is the only state seeded.
    if (flow.context) {
      await page.evaluateOnNewDocument((ctx, key) => {
        try {
          localStorage.setItem(key, JSON.stringify(ctx));
          document.cookie = 'pilar-ui-mode=intl; path=/; max-age=31536000; samesite=lax';
        } catch { /* storage blocked */ }
      }, flow.context, ENGINEERING_CONTEXT_STORAGE_KEY);
    } else {
      await page.evaluateOnNewDocument((key) => {
        try {
          localStorage.removeItem(key);
          document.cookie = 'pilar-ui-mode=no; path=/; max-age=31536000; samesite=lax';
        } catch { /* storage blocked */ }
      }, ENGINEERING_CONTEXT_STORAGE_KEY);
    }

    // Streaming run detaches frames / destroys execution contexts mid-evaluate.
    // Retry transient context errors a few times before giving up.
    const evalSafe = async (fn, ...args) => {
      for (let i = 0; ; i++) {
        try { return await page.evaluate(fn, ...args); }
        catch (e) {
          const msg = e && e.message ? e.message : String(e);
          if (i < 5 && /detached|destroyed|Execution context|Target closed/i.test(msg)) {
            await sleep(500); continue;
          }
          throw e;
        }
      }
    };
    const handleByText = async (re) => {
      const h = await page.evaluateHandle((src) => {
        const rx = new RegExp(src, 'i');
        return [...document.querySelectorAll('button, a')]
          .find((b) => rx.test((b.textContent || '').trim())) || null;
      }, re.source);
      return h.asElement();
    };

    page.on('response', async (res) => {
      const u = res.url();
      if (!/\/api\//.test(u)) return;
      let body = '';
      try {
        if (/json/.test(res.headers()['content-type'] || '')) {
          const json = await res.json();
          body = JSON.stringify(json).slice(0, 240);
          if (/\/api\/init-run/.test(u) && json && json.run_id) result.runId = json.run_id;
        }
      } catch { /* non-JSON or already consumed */ }
      api.push(`${res.request().method()} ${res.status()} ${u.replace(BASE, '')} ${body}`);
    });

    // 1. open + enter the prompt
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('textarea', { timeout: 30000 });
    await page.$eval('textarea', (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, prompt);
    await sleep(500);

    // 2. interpret (resilient — auto-interpret may already have run)
    const tolk = await handleByText(RE_INTERPRET);
    if (tolk) await tolk.click();

    // 3. wait until interpretation streaming FINISHES and "Start beregning" is
    //    actually actionable. The button appears in the DOM while the interpret
    //    stream is still running ("● STREAMER" / "Tolker..."), but clicking it
    //    then is a no-op (no /api/init-run fires). Gate on: button present +
    //    enabled + no active streaming indicator.
    let startReady = false;
    for (let i = 0; i < 120; i++) {
      const s = await evalSafe((startSrc, streamSrc) => {
        const reStart = new RegExp(startSrc, 'i');
        const reStream = new RegExp(streamSrc, 'i');
        const sb = [...document.querySelectorAll('button')]
          .find((b) => reStart.test(b.textContent || ''));
        return {
          present: !!sb,
          disabled: sb ? !!sb.disabled : true,
          streaming: reStream.test(document.body.innerText),
        };
      }, RE_START.source, RE_STREAMING.source);
      if (s.present && !s.disabled && !s.streaming) { startReady = true; break; }
      await sleep(1000);
    }
    if (startReady) await sleep(800); // let the enabled handler settle

    // 3b. interpret-stage snapshot (fallback evidence; matches flow-*-noid.*)
    try {
      writeFileSync(path.join(REPORTS, `flow-${flow.label}-noid.txt`),
        await evalSafe(() => document.body.innerText), 'utf8');
      await page.screenshot({ path: path.join(REPORTS, `flow-${flow.label}-noid.png`), fullPage: true });
    } catch { /* snapshot is best-effort */ }

    if (!startReady) {
      api.push('NOTE: "Start beregning" never became actionable within 120s (interpretation may still be streaming)');
    } else {
      // 4. start the run (clear pre-run API noise first)
      api.length = 0;
      const sb = await handleByText(RE_START);
      if (sb) await sb.click();

      // 5. wait for the run pipeline to finish and the report to FULLY render.
      //    The app navigates to /rapport/<id> and streams the report body in
      //    (agent-e is the reporter), so the shell (~400 chars) appears long
      //    before the content. Gate on innerText growing past the shell and
      //    then holding steady. Length-based (not keyword-based) so Flow A's
      //    English report is judged the same way as Flow B's Norwegian one.
      const READY_LEN = 2000;
      const started = Date.now();
      let lastLen = -1, stable = 0;
      while ((Date.now() - started) / 1000 < RUN_TIMEOUT_S) {
        await sleep(2500);
        if (!result.runId) {
          result.runId = await evalSafe(() => {
            const a = document.querySelector('a[href*="rapport/"]');
            const m = location.href.match(/\/rapport\/([0-9a-f-]{8,})/i)
              || ((a && a.getAttribute('href')) || '').match(/rapport\/([0-9a-f-]{8,})/i);
            return m ? m[1] : null;
          });
        }
        const st = await evalSafe(() => ({
          onReport: /\/rapport\//.test(location.href),
          len: document.body.innerText.length,
        }));
        if (st.onReport && st.len > READY_LEN) {
          if (st.len === lastLen) { if (++stable >= 3) { result.reportReady = true; break; } }
          else { stable = 0; lastLen = st.len; }
        }
      }

      // 6. fallback: runId known but the app never rendered a report in place
      //    (e.g. it stayed on the workbench with a link). Load it directly and
      //    wait for content the same way.
      if (!result.reportReady && result.runId) {
        await page.goto(`${BASE}/rapport/${result.runId}`, { waitUntil: 'networkidle2', timeout: 60000 });
        lastLen = -1; stable = 0;
        for (let i = 0; i < 40; i++) {
          await sleep(1500);
          const len = await evalSafe(() => document.body.innerText.length);
          if (len > READY_LEN && len === lastLen) { if (++stable >= 3) break; }
          else { stable = 0; lastLen = len; }
        }
        result.reportReady = (await evalSafe(() => document.body.innerText.length)) > READY_LEN;
      }

      // 7. extract, check, and record
      if (result.reportReady) {
        result.url = await evalSafe(() => location.href);
        const reportText = await evalSafe(() => document.body.innerText);
        result.textLen = reportText.length;
        result.controls = await evalSafe(() => {
          const out = [];
          for (const el of document.querySelectorAll('button, a, [role="tab"]')) {
            const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (t && t.length <= 40 && !out.includes(t)) out.push(t);
          }
          return out.slice(0, 40);
        });
        const controlsBlob = result.controls.join('\n');
        result.hasPdf = /pdf/i.test(controlsBlob);
        result.hasWord = /word/i.test(controlsBlob);

        // Judge the model's GENERATED output, not the echoed prompt (full text
        // is still saved to the .txt artifact for evidence).
        const scanText = stripPromptEcho(reportText, prompt);
        result.scanLen = scanText.length;

        result.missing = flow.mustShow.filter((g) => !hasGroup(scanText, g)).map((g) => g.join(' / '));
        result.forbidden = flow.mustNotShow.filter((tok) => hasToken(scanText, tok));

        // verify the run executed in the intended display language — authoritative
        // DB value via the self-serve endpoint (no SQL). If it didn't, context
        // activation failed and the language assertions are not meaningful.
        if (result.runId) {
          try {
            const resp = await fetch(`${BASE}/api/runs/${result.runId}`);
            if (resp.ok) result.displayLanguage = (await resp.json())?.run?.display_language ?? null;
          } catch { /* endpoint unavailable */ }
        }

        // verdict: wrong display language = invalid test (FAIL); forbidden hit =
        // guardrail breach (FAIL); missing must-show only = warning.
        if (result.displayLanguage && result.displayLanguage !== flow.expectLanguage) {
          result.verdict = 'FAIL';
          result.note = `display_language='${result.displayLanguage}' but expected '${flow.expectLanguage}' — context activation failed; language assertions not meaningful`;
        } else if (result.forbidden.length > 0) result.verdict = 'FAIL';
        else if (result.missing.length > 0) result.verdict = 'PASS WITH WARNINGS';
        else result.verdict = 'PASS';

        const idTag = result.runId || 'noid';
        writeFileSync(path.join(REPORTS, `flow-${flow.label}-${idTag}.txt`), reportText, 'utf8');
        result.screenshot = path.join(REPORTS, `flow-${flow.label}-${idTag}.png`);
        await page.screenshot({ path: result.screenshot, fullPage: true });
      } else {
        api.push('NOTE: report never became ready within timeout');
      }
    }

    writeFileSync(path.join(REPORTS, `flow-${flow.label}-api.log`), api.join('\n') + '\n', 'utf8');
    writeFileSync(path.join(REPORTS, `flow-${flow.label}-result.json`), JSON.stringify(result, null, 2), 'utf8');
  } finally {
    await browser.close();
  }
  return result;
}

// ---- main ----------------------------------------------------------------
mkdirSync(REPORTS, { recursive: true });
const flowsToRun = FLOWS_REQUESTED.map((k) => FLOWS[k]).filter(Boolean);
if (!flowsToRun.length) {
  console.error(`No valid flows in --flow "${FLOWS_REQUESTED.join(',')}". Valid: A, B`);
  process.exit(2);
}

const results = [];
for (const flow of flowsToRun) {
  console.log(`\n=== Flow ${flow.label} — ${flow.name} ===`);
  try {
    const r = await runFlow(flow);
    results.push(r);
    console.log(`Flow ${r.label}: ${r.verdict} | reportReady=${r.reportReady} lang=${r.displayLanguage || '?'} (want ${r.expectLanguage}) runId=${r.runId || '-'}`);
    console.log(`  url=${r.url || '-'}`);
    if (r.note) console.log(`  note=${r.note}`);
    console.log(`  missing=${JSON.stringify(r.missing)}`);
    console.log(`  forbidden=${JSON.stringify(r.forbidden)}`);
    console.log(`  hasPdf=${r.hasPdf} hasWord=${r.hasWord} textLen=${r.textLen}`);
    console.log(`  screenshot=${r.screenshot || '-'}`);
  } catch (e) {
    console.error(`Flow ${flow.label} crashed: ${e && e.message ? e.message : e}`);
    results.push({ label: flow.label, verdict: 'FAIL', error: String(e && e.message ? e.message : e) });
  }
}

console.log('\n=== SUMMARY ===');
for (const r of results) console.log(`Flow ${r.label}: ${r.verdict}${r.error ? ' (' + r.error + ')' : ''}`);
process.exit(results.some((r) => r.verdict === 'FAIL') ? 1 : 0);
