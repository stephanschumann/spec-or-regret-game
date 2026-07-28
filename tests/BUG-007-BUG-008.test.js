/**
 * tests/BUG-007-BUG-008.test.js — jsdom tests for the Team-mode mapping step
 * ("Map the change" / "A shared picture") timer-freeze + lost-credit bug pair.
 *
 * Root cause (verified by reading the code, not guessed — see Backlog.md,
 * BUG-007 "Analyse & Planung"): finishMap() in renderTeamMap() was a
 * once-only function — `if(advanced)return; advanced=true; clearInterval(timerId);`
 * ran unconditionally the very first time the board became fully placed,
 * whether or not the placement was actually correct. That single line caused
 * two symptoms with one shared cause: (1) the visible "Meeting time left"
 * countdown stopped for good at that instant (BUG-007), and (2) if the board
 * was complete but still had a wrong card, the "no credit" verdict became
 * permanent — a later correction (the existing ↩ put-back / re-tap-to-move
 * affordance already allowed this) was never re-evaluated, so the badge and
 * the "Analysis" day credit stayed lost forever (BUG-008).
 *
 * Fix (Option C, von Stephan freigegeben, siehe Backlog.md): a "complete but
 * still wrong" board is no longer treated as final. The timer keeps running
 * and finishMap() may run again after a later correction. Only a genuine
 * success (complete AND correct, time still left) or a genuine timeout is
 * final — only THEN does the timer actually stop and further evaluation lock.
 * This intentionally leaves tests/BUG-005.test.js's existing, already-approved
 * contract untouched: a fully-but-wrongly sorted board still makes "Next step"
 * immediately clickable with no credit (Option B was rejected specifically to
 * avoid breaking that test — see Backlog.md "Wichtiger bestehender
 * Test-Konflikt").
 *
 * To observe whether the countdown was actually stopped (BUG-007) without
 * depending on real timer scheduling, this file's own loadGame() records every
 * clearInterval(id) call the app makes (window.__clearedIntervalIds) instead of
 * silently no-op'ing it the way tests/BUG-005.test.js's mock does — the app
 * itself decides whether/when to call clearInterval, this test only observes
 * that decision.
 *
 * Ausführen: node tests/BUG-007-BUG-008.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const KNOWN_PREVIOUS_VERSION = "1.28.1"; // GAME_VERSION before this ticket

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
      window.scrollTo = function () {};
      window.__intervalFns = [];
      window.setInterval = function (fn) { window.__intervalFns.push(fn); return window.__intervalFns.length; };
      // Anders als tests/BUG-005.test.js: clearInterval wird NICHT stillschweigend
      // zu einem No-op — die aufgerufenen IDs werden aufgezeichnet, damit dieser
      // Test tatsächlich beobachten kann, OB und WANN die App selbst den Timer
      // stoppt (genau das ist der Kern von BUG-007), statt es nur zu behaupten.
      window.__clearedIntervalIds = [];
      window.clearInterval = function (id) { window.__clearedIntervalIds.push(id); };
    },
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function () {};
  return dom;
}

function click(doc, id) {
  const el = doc.getElementById(id);
  assert(el, `Element #${id} sollte im DOM existieren`);
  el.dispatchEvent(new doc.defaultView.Event("click", { bubbles: true }));
}

// A category that is definitely NOT the card's real one — deterministic cyclic
// shift over the four MAP_BUCKETS ids, works for any of the 21 scenarios.
// (Identical helper to tests/BUG-005.test.js — duplicated rather than shared,
// matching this project's existing per-file convention.)
function wrongBucketFor(actualC) {
  const shift = { goal: "rule", rule: "ex", ex: "q", q: "goal" };
  return shift[actualC] || "rule";
}
function correctBucket(actualC) {
  return actualC === "goal" ? "goal" : actualC === "rule" ? "rule" : actualC === "ex" ? "ex" : "q";
}

// Sorts every card on the board via pickBucket(actualCategory) -> bucketId.
// Re-tapping an already-assigned card and picking a different bucket reassigns
// it cleanly (assign() removes the old slot first) — no explicit put-back tap
// needed, exactly the shortcut the in-game hint text describes ("tap the card
// itself to move it straight to a different category").
function sortAll(window, doc, pickBucket) {
  const st = window.STAGES[window.S.i];
  Array.from(doc.querySelectorAll(".item")).forEach((el) => {
    el.dispatchEvent(new window.Event("click", { bubbles: true }));
    const idx = el.dataset.idx;
    const actualC = st.items[idx].c;
    const bid = pickBucket(actualC);
    doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
}

// Drives Team mode from the very start up to and including the map step,
// stopping right there — every acceptance criterion for this ticket pair
// (analysis credit, badge, timer, debrief-block count) is already observable
// at the map step itself, so (unlike BUG-005.test.js's runToImpl) there is no
// need to drive all the way to the later build/impl step.
async function enterMap() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return "dev"; };

  click(doc, "introCta");
  click(doc, "pickTeamMode");
  click(doc, "teamRndBtn");
  click(doc, "teamStartBtn");
  click(doc, "teamNext"); // roster -> teamestimate (FEATURE-016, additive)
  doc.querySelector('.tshirtopt[data-key="m"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  click(doc, "teamEstNext"); // -> map
  return { dom, window, doc };
}

function reactHTML(doc) { return doc.getElementById("react").innerHTML; }
function debriefCount(doc) { return doc.getElementById("react").querySelectorAll(".debrief").length; }
function teamNotesCount(doc) { return doc.getElementById("react").querySelectorAll(".agent").length; }
function lastTick(window) { return window.__intervalFns[window.__intervalFns.length - 1]; }

// Case 1: board sorted fully WRONG first (the exact BUG-005 scenario — no
// credit yet, "Next step" already available), THEN corrected to fully correct
// while time is still running -> badge + analysis credit must now actually be
// granted, instead of staying lost forever.
async function scenarioLateCorrectionCredits() {
  let dom;
  try {
    const { dom: d, window, doc } = await enterMap();
    dom = d;

    sortAll(window, doc, wrongBucketFor);
    assert.strictEqual(window.S.analysis, 0, "Bei vollständig falscher Sortierung darf noch keine Analyse-Gutschrift erfolgen");
    assert(!window.S.badges.some((b) => b.name === "Team mapper"), "Bei vollständig falscher Sortierung darf noch kein Abzeichen vergeben werden");
    assert(doc.getElementById("nextBtn"), "'Next step' sollte bei vollständiger, aber falscher Sortierung weiterhin sofort verfügbar sein (bestehender BUG-005-Vertrag)");
    assert.strictEqual(window.__clearedIntervalIds.length, 0, "Der Timer darf bei vollständiger, aber falscher Sortierung noch NICHT gestoppt werden");

    sortAll(window, doc, correctBucket); // re-tap every card, reassign to its correct bucket

    assert.strictEqual(window.S.analysis, 1, "Nach vollständiger Korrektur vor Zeitablauf sollte die Analyse-Gutschrift (1 Tag) jetzt doch erfolgen");
    assert(window.S.badges.some((b) => b.name === "Team mapper"), "Nach vollständiger Korrektur vor Zeitablauf sollte das Abzeichen jetzt doch vergeben werden");
    assert(reactHTML(doc).indexOf("Everyone in the room sees the same picture") !== -1, "Nach vollständiger Korrektur sollte der Erfolgstext erscheinen");
    assert.strictEqual(window.__clearedIntervalIds.length, 1, "Bei echtem Erfolg sollte der Timer jetzt genau einmal final gestoppt werden");

    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioLateCorrectionCredits: " + err.message;
  }
}

// Case 2: after the first full-but-wrong sort, the countdown must keep
// counting down (simulated ticks actually change the displayed time), and the
// app itself must not have called clearInterval yet — that combination is
// what "the timer is not frozen" concretely means here.
async function scenarioTimerKeepsRunningAfterFullWrongSort() {
  let dom;
  try {
    const { dom: d, window, doc } = await enterMap();
    dom = d;

    sortAll(window, doc, wrongBucketFor);
    assert.strictEqual(window.__clearedIntervalIds.length, 0, "clearInterval darf nach vollständiger, aber falscher Sortierung noch nicht aufgerufen worden sein");

    const textBefore = doc.getElementById("timerText").textContent;
    const fillBefore = doc.getElementById("timerFill").style.width;
    const tick = lastTick(window);
    assert(tick, "Es sollte einen aktiven Timer-Tick-Callback geben");
    tick(); tick(); tick();
    const textAfter = doc.getElementById("timerText").textContent;
    const fillAfter = doc.getElementById("timerFill").style.width;
    assert.notStrictEqual(textAfter, textBefore, "Die angezeigte Restzeit sollte nach dem ersten vollständigen (aber falschen) Sortieren weiter herunterzählen, nicht eingefroren bleiben");
    assert.notStrictEqual(fillAfter, fillBefore, "Der Füllstand der Zeitleiste sollte sich nach weiteren Ticks ändern, nicht eingefroren bleiben");
    assert.strictEqual(window.__clearedIntervalIds.length, 0, "Reines Weiterlaufen der Zeit darf den Timer nicht stoppen");

    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioTimerKeepsRunningAfterFullWrongSort: " + err.message;
  }
}

// Case 3: real timeout still finalizes exactly as before (regression guard) —
// even after an earlier full-but-wrong evaluation already ran once.
async function scenarioRealTimeoutStillFinalizes() {
  let dom;
  try {
    const { dom: d, window, doc } = await enterMap();
    dom = d;

    sortAll(window, doc, wrongBucketFor); // first evaluation: complete, wrong, not final
    assert.strictEqual(window.__clearedIntervalIds.length, 0);

    const tick = lastTick(window);
    for (let i = 0; i < 69; i++) tick(); // run the clock all the way out

    // >= 1 statt === 1: die gemockte clearInterval() verhindert (anders als im
    // echten Browser) nicht, dass derselbe aufgezeichnete Tick-Callback danach
    // erneut aufgerufen wird — jeder weitere Tick nach Zeitablauf ruft daher
    // ebenfalls nochmal clearInterval() auf (redundant, aber harmlos: finishMap()
    // selbst wertet dank "advanced" kein zweites Mal aus). Entscheidend ist nur,
    // dass der Timer bei echtem Zeitablauf tatsächlich gestoppt WURDE.
    assert(window.__clearedIntervalIds.length >= 1, "Bei echtem Zeitablauf sollte der Timer jetzt final gestoppt werden");
    assert(reactHTML(doc).indexOf("Time’s up") !== -1, "Bei echtem Zeitablauf sollte weiterhin der Zeitablauf-Text erscheinen");
    assert.strictEqual(window.S.analysis, 0, "Bei Zeitablauf ohne vollständig korrekte Sortierung darf keine Gutschrift erfolgen");

    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioRealTimeoutStillFinalizes: " + err.message;
  }
}

// Case 4: multiple corrections in a row must each REPLACE the visible "Team
// notes" feedback, never stack additional copies of it.
async function scenarioNoStackedDebriefOnRepeatedCorrections() {
  let dom;
  try {
    const { dom: d, window, doc } = await enterMap();
    dom = d;
    const st = window.STAGES[window.S.i];
    const items = Array.from(doc.querySelectorAll(".item"));
    assert(items.length >= 2, "Testszenario braucht mindestens 2 Karten");

    // Round 1: everything wrong.
    sortAll(window, doc, wrongBucketFor);
    assert.strictEqual(teamNotesCount(doc), 1, "Nach der ersten vollständigen Sortierung sollte genau ein 'Team notes'-Block erscheinen");
    assert.strictEqual(debriefCount(doc), 1, "Nach der ersten vollständigen Sortierung sollte genau ein Debrief-Block erscheinen");

    // Round 2: fix only the first card, leave the rest wrong -> still complete, still wrong, still not final.
    const firstIdx = items[0].dataset.idx;
    items[0].dispatchEvent(new window.Event("click", { bubbles: true }));
    doc.querySelector('.bucket[data-b="' + correctBucket(st.items[firstIdx].c) + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    assert.strictEqual(teamNotesCount(doc), 1, "Nach einer Zwischenkorrektur sollte weiterhin genau ein 'Team notes'-Block erscheinen (ersetzt, nicht gestapelt)");
    assert.strictEqual(debriefCount(doc), 1, "Nach einer Zwischenkorrektur sollte weiterhin genau ein Debrief-Block erscheinen (ersetzt, nicht gestapelt)");

    // Round 3: fix everything else too -> now truly correct, final.
    sortAll(window, doc, correctBucket);
    assert.strictEqual(teamNotesCount(doc), 1, "Nach der finalen Korrektur sollte weiterhin genau ein 'Team notes'-Block erscheinen");
    assert.strictEqual(debriefCount(doc), 1, "Nach der finalen Korrektur sollte weiterhin genau ein Debrief-Block erscheinen");
    assert.strictEqual(window.S.analysis, 1, "Die finale Korrektur sollte die Analyse-Gutschrift auslösen");

    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioNoStackedDebriefOnRepeatedCorrections: " + err.message;
  }
}

async function scenarioVersionBumped() {
  const dom = loadGame();
  try {
    assert.notStrictEqual(dom.window.GAME_VERSION, KNOWN_PREVIOUS_VERSION, "GAME_VERSION sollte gegenüber " + KNOWN_PREVIOUS_VERSION + " erhöht worden sein");
    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioVersionBumped: " + err.message;
  }
}

async function main() {
  const failures = [];
  // Sequentiell statt Promise.all — jedes Szenario startet einen eigenen
  // Timer-Mechanismus (__intervalFns/__clearedIntervalIds) und teilt sich
  // sonst leicht den Meeting-Timer-Zustand zwischen parallel laufenden
  // jsdom-Instanzen (gleiches Vorgehen wie tests/BUG-005.test.js).
  const scenarios = [
    scenarioLateCorrectionCredits,
    scenarioTimerKeepsRunningAfterFullWrongSort,
    scenarioRealTimeoutStillFinalizes,
    scenarioNoStackedDebriefOnRepeatedCorrections,
    scenarioVersionBumped,
  ];
  for (const s of scenarios) {
    const r = await s();
    if (r) failures.push(r);
  }

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 5/5 Checks grün (späte Korrektur vor Zeitablauf gibt jetzt doch Abzeichen+Gutschrift, Timer läuft nach vollständig-falscher Sortierung nachweislich weiter statt eingefroren, echter Zeitablauf finalisiert weiterhin korrekt, mehrfache Korrekturen ersetzen den Debrief-Block statt ihn zu stapeln, GAME_VERSION erhöht)");
  process.exit(0);
}

main();
