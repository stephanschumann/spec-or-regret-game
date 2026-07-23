/**
 * tests/FEATURE-011.test.js — jsdom tests for the Lead-Time retrospective
 * breakdown on the finale screen (FEATURE-011) in "Spec or Regret"
 * (public/index.html).
 *
 * Two things changed:
 *   1. The "What it could have been" bar's analysis number is now the true
 *      best-possible run (every analysis-eligible step credited), not just
 *      whatever this run actually earned. In Agent mode these were already
 *      always equal (every categorize/build/select step must be solved
 *      correctly to proceed — no partial-credit path exists there); in Team
 *      mode a shortcut (map timeout, vague behaviour, a guessed business
 *      value, a deferred question) can skip credit, so the two numbers can
 *      genuinely differ.
 *   2. Variante B: an inline, collapsible breakdown appears directly under
 *      the "Your run" and "What it could have been" bars, itemising exactly
 *      which decisions produced the analysis/cycle numbers — for a real
 *      team retrospective. The three bars themselves are unchanged.
 *
 * These checks stay durably useful for later finale-related tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. Team mode, PO-missing branch, a run with every possible shortcut taken:
 *      the ideal bar shows the true maximum (7d analysis), NOT the reduced
 *      number this run actually earned — the specific bug this ticket fixes.
 *   3. The breakdown panels exist in the rendered DOM, start collapsed, and
 *      the sums of their itemised rows exactly match the bar totals — for
 *      both the "actual" and "ideal" breakdown, in both a clean and a
 *      shortcut-heavy run.
 *   4. Agent mode regression: the ideal bar's analysis number is unchanged
 *      (still equals the actual analysis number, as it structurally always
 *      has) — verified against the real STAGES built for a real scenario.
 *
 * Ausführen: node tests/FEATURE-011.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");

function loadGame() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    url: "http://localhost/",
    beforeParse(window) {
      window.matchMedia = window.matchMedia || function () {
        return { matches: false, addListener() {}, removeListener() {} };
      };
      window.HTMLCanvasElement.prototype.getContext = function () {
        return {
          clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {},
          fillRect() {}, beginPath() {}, arc() {}, fill() {},
          set fillStyle(_v) {}, set globalAlpha(_v) {},
        };
      };
      window.scrollTo = window.scrollTo || function () {};
      window.__intervalFns = [];
      window.setInterval = function (fn) { window.__intervalFns.push(fn); return window.__intervalFns.length; };
      window.clearInterval = function () {};
    },
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
  return dom;
}

function click(doc, id) {
  const el = doc.getElementById(id);
  assert(el, `Element #${id} sollte im DOM existieren`);
  el.dispatchEvent(new doc.defaultView.Event("click", { bubbles: true }));
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function answerSelectCorrectly(window, doc, mode) {
  const s = window.STAGES[window.S.i];
  s.options.forEach((o, idx) => {
    const shouldPick = (mode === "catch") ? o.bad : !o.bad;
    if (shouldPick) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}

// Sums every ".d" span's day value inside a given element — the .d span
// always carries the row's ACTUAL contribution to its category total (0 for
// missed/avoided rows), so summing every .d under a group must equal that
// group's displayed bar total.
function sumDaySpans(doc, groupEl) {
  let total = 0;
  groupEl.querySelectorAll(".d").forEach((el) => {
    const n = parseInt((el.textContent || "").replace(/[^0-9]/g, ""), 10);
    total += isNaN(n) ? 0 : n;
  });
  return total;
}

// Drives a Team-mode run with the Product Owner rolled as missing, taking
// every possible shortcut (mirrors FEATURE-009-consequences.test.js's
// scenarioEverythingBad) so real credit is skipped on four of the seven
// analysis-eligible steps. Leaves the dom OPEN (caller must close it) so
// breakdown assertions can query the live document.
async function playPoEverythingBadRun() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return "po"; };
  click(doc, "introCta");
  click(doc, "pickTeamMode");

  click(doc, "teamNext"); // -> map
  const firstItem = doc.querySelector(".item");
  firstItem.dispatchEvent(new window.Event("click", { bubbles: true }));
  const st = window.STAGES[window.S.i];
  const firstIdx = firstItem.dataset.idx;
  const c = st.items[firstIdx].c;
  const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
  doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  const tick = window.__intervalFns[window.__intervalFns.length - 1];
  for (let i = 0; i < 69; i++) tick(); // timeout -> map credit skipped
  click(doc, "nextBtn"); // -> bizvalue fork

  click(doc, "tTempt"); await wait(700); click(doc, "nextBtn"); // guessed -> skipped
  click(doc, "vagueChoice"); await wait(600); click(doc, "nextBtn"); // vague -> skipped
  click(doc, "tTempt"); await wait(700); click(doc, "nextBtn"); // deferred -> skipped

  answerSelectCorrectly(window, doc, "pick"); click(doc, "nextBtn"); // premortem, credited
  answerSelectCorrectly(window, doc, "catch"); click(doc, "nextBtn"); // overreach, credited

  click(doc, "markAll"); click(doc, "dorContinue"); click(doc, "nextBtn"); // DoR, credited (but dishonest -> paperwork rework)

  click(doc, "handoff");
  await wait(2500);
  click(doc, "nextBtn"); // -> finale
  return { dom, window, doc, analysisAtHandoff: window.S.analysis, cycleAtFinale: window.S.cycle };
}

async function testGameVersion() {
  const dom = loadGame();
  try {
    assert.strictEqual(dom.window.GAME_VERSION, "1.18.0", "GAME_VERSION sollte auf 1.18.0 stehen");
    return null;
  } catch (err) { return "GAME_VERSION: " + err.message; }
  finally { dom.window.close(); }
}

async function testIdealBarShowsTrueMaximum() {
  let dom;
  try {
    const r = await playPoEverythingBadRun();
    dom = r.dom;
    const html = r.doc.getElementById("stageHost").innerHTML;
    assert(r.analysisAtHandoff < 7, "Dieser Lauf sollte durch die Abkürzungen WENIGER als die maximal möglichen 7 Analyse-Tage verdient haben, tatsächlich: " + r.analysisAtHandoff);
    assert(html.indexOf("7d analysis + 4d cycle") !== -1,
      "Der 'What it could have been'-Balken sollte trotz verpasster Gutschrift die maximal möglichen 7 Analyse-Tage zeigen (bestmöglicher Lauf überhaupt), nicht die tatsächlich verdienten " + r.analysisAtHandoff);
    return null;
  } catch (err) { return "Ideal-Balken zeigt wahres Maximum: " + err.message; }
  finally { if (dom) dom.window.close(); }
}

async function testBreakdownPanelsPresentCollapsedAndSummed() {
  let dom;
  try {
    const r = await playPoEverythingBadRun();
    dom = r.dom;
    const { doc, analysisAtHandoff, cycleAtFinale } = r;
    const html = doc.getElementById("stageHost").innerHTML;

    assert(html.indexOf('class="bktoggle"') !== -1, "Aufklapp-Buttons sollten im Finale-HTML vorhanden sein");
    assert(doc.querySelectorAll(".bkpanel").length === 2, "Es sollten genau zwei Aufklapp-Panels geben (Your run + Ideal)");
    assert(doc.querySelectorAll(".bkpanel.show").length === 0, "Panels sollten standardmäßig eingeklappt sein (keine 'show'-Klasse beim ersten Render)");

    const anaGroups = doc.querySelectorAll(".bkgroup-ana");
    const cycGroups = doc.querySelectorAll(".bkgroup-cyc");
    assert.strictEqual(anaGroups.length, 2, "Es sollte genau zwei Analyse-Aufschlüsselungen geben (Your run + Ideal)");
    assert.strictEqual(cycGroups.length, 2, "Es sollte genau zwei Cycle-Aufschlüsselungen geben (Your run + Ideal)");

    // [0] = "Your run" (actual), [1] = "What it could have been" (ideal).
    assert.strictEqual(sumDaySpans(doc, anaGroups[0]), analysisAtHandoff, "Summe der 'Your run'-Analyse-Zeilen sollte exakt S.analysis entsprechen");
    assert.strictEqual(sumDaySpans(doc, anaGroups[1]), 7, "Summe der 'Ideal'-Analyse-Zeilen sollte exakt 7 (maximal möglich) entsprechen");
    assert.strictEqual(sumDaySpans(doc, cycGroups[0]), cycleAtFinale, "Summe der 'Your run'-Cycle-Zeilen sollte exakt S.cycle entsprechen");
    assert.strictEqual(sumDaySpans(doc, cycGroups[1]), 4, "Summe der 'Ideal'-Cycle-Zeilen sollte exakt dem 4-Tage-Bau-Grundpreis entsprechen (kein Rework)");

    assert(html.indexOf("no credit (shortcut taken)") !== -1, "Die 'Your run'-Aufschlüsselung sollte mindestens einen nicht gutgeschriebenen Schritt klar benennen");
    assert(html.indexOf("you missed this one this run") !== -1, "Die 'Ideal'-Aufschlüsselung sollte benennen, welche konkrete Entscheidung im tatsächlichen Lauf verpasst wurde");

    return null;
  } catch (err) { return "Aufschlüsselungs-Panels vorhanden/eingeklappt/Summen stimmen: " + err.message; }
  finally { if (dom) dom.window.close(); }
}

async function testCleanRunBreakdownsMatch() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamNext"); // -> map
    const st = window.STAGES[window.S.i];
    Array.from(doc.querySelectorAll(".item")).forEach((el) => {
      el.dispatchEvent(new window.Event("click", { bubbles: true }));
      const idx = el.dataset.idx;
      const c = st.items[idx].c;
      const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
      doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    click(doc, "nextBtn"); // -> gherkin
    click(doc, "precise");
    window.STAGES[window.S.i].scenarios.forEach((sc, si) => {
      sc.lines.forEach((ln, li) => {
        let correctGi = null;
        ln.segs.forEach((seg, gi) => { if (seg.c) correctGi = gi; });
        doc.querySelector('.seg[data-k="' + si + '.' + li + '"][data-g="' + correctGi + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
      });
    });
    doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "nextBtn"); // -> question fork
    click(doc, "tSolid"); await wait(700); click(doc, "nextBtn"); // -> premortem
    answerSelectCorrectly(window, doc, "pick"); click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch"); click(doc, "nextBtn"); // -> DoR
    click(doc, "markAll"); click(doc, "dorContinue"); click(doc, "nextBtn"); // -> teamimpl
    click(doc, "handoff");
    await wait(2500);
    click(doc, "nextBtn"); // -> finale
    const html = doc.getElementById("stageHost").innerHTML;

    // Dev-missing branch has no bizvalue fork -> 6 analysis-eligible steps max.
    assert.strictEqual(window.S.analysis, 6, "Sauberer Dev-fehlt-Lauf sollte alle 6 Analyseschritte verdienen");
    assert(html.indexOf("6d analysis + 4d cycle") !== -1, "Bei einem sauberen Lauf sollten 'Your run' und 'Ideal' dieselbe Analysezahl (6d) zeigen");
    assert(html.indexOf("no credit (shortcut taken)") === -1, "Ein sauberer Lauf sollte keinen 'nicht gutgeschrieben'-Hinweis zeigen");
    assert(html.indexOf("you missed this one this run") === -1, "Ein sauberer Lauf sollte keinen 'verpasst'-Hinweis zeigen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Sauberer Lauf zeigt in beiden Aufschlüsselungen sinnvoll identische Werte: " + err.message;
  }
}

async function testAgentModeRegression() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickAgentMode");
    doc.querySelector(".scenopt").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "startBtn"); // -> renderReveal (real STAGES/SC now set for a real scenario)

    const expectedMax = window.maxAnalysisDays();
    assert(expectedMax > 0, "Agent-Szenario sollte analyse-tragende Schritte haben");

    // Simulate a fully completed, clean run without re-solving all seven
    // categorize/build/select puzzles by hand (orthogonal to this ticket —
    // already covered by other regression tests): every analysis-eligible
    // step credited, no rework, at the real build-baseline cycle cost.
    window.S.analysis = expectedMax;
    window.S.badges = window.STAGES.map(function (st, idx) { return st.badge ? { e: st.badge.e, name: st.badge.name, i: idx } : null; }).filter(Boolean);
    window.S.rework = [];
    var bossSt = window.STAGES.filter(function (st) { return st.isBoss; })[0];
    window.S.cycle = bossSt.buildDays;
    window.S.benchmark = 15;

    window.renderFinale();
    const html = doc.getElementById("stageHost").innerHTML;
    assert(html.indexOf("You took it — your run WAS the best case: " + expectedMax + "d analysis") !== -1,
      "Agent-Modus: die Ideal-Analyse-Zahl sollte unverändert (weiterhin identisch mit der tatsächlichen) bleiben — keine Regression");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Agent-Modus-Regression (Ideal-Analyse unverändert): " + err.message;
  }
}

async function main() {
  const failures = (await Promise.all([
    testGameVersion(),
    testIdealBarShowsTrueMaximum(),
    testBreakdownPanelsPresentCollapsedAndSummed(),
    testCleanRunBreakdownsMatch(),
    testAgentModeRegression(),
  ])).filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 5/5 Checks grün (Version, Ideal-Balken zeigt wahres Maximum statt verpasster Gutschrift, Aufschlüsselungs-Panels vorhanden/eingeklappt/Summen stimmen, sauberer Lauf zeigt identische Werte, Agent-Modus unverändert)");
  process.exit(0);
}

main();
