/**
 * tests/BUG-005.test.js — jsdom tests for the Team-mode mapping step ("Map the
 * change") bug: the step only checked whether all cards were PLACED somewhere
 * (completeness), never whether each card landed in the actually correct
 * category (correctness) — so a board sorted entirely wrong was celebrated as
 * "Everyone in the room sees the same picture." Stephan chose Option B: a
 * wrong placement now ALSO costs its own, independent rework thread in the
 * build step later, exactly like an unsorted card already does.
 *
 * Root cause (verified by reading the code, not guessed): finishMap() in
 * renderTeamMap() only ever compared timing (finishedInTime) and completeness
 * (Object.keys(placement).length) — never placement[idx] against the item's
 * real category (st.items[idx].c), unlike the structurally identical
 * agent-mode step (renderCategorize()), which already does that comparison.
 *
 * These checks stay durably useful for any later ticket touching Team-mode
 * mapping/scoring, not just this bug fix.
 *
 * Ausführen: node tests/BUG-005.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const KNOWN_PREVIOUS_VERSION = "1.24.0"; // GAME_VERSION before this ticket

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
      window.clearInterval = function () {};
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
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// A category that is definitely NOT the card's real one — deterministic cyclic
// shift over the four MAP_BUCKETS ids, works for any of the 21 scenarios.
function wrongBucketFor(actualC) {
  const shift = { goal: "rule", rule: "ex", ex: "q", q: "goal" };
  return shift[actualC] || "rule";
}

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

function correctBucket(actualC) {
  return actualC === "goal" ? "goal" : actualC === "rule" ? "rule" : actualC === "ex" ? "ex" : "q";
}

function sortAllCorrectly(window, doc) { sortAll(window, doc, correctBucket); }
function sortAllWrong(window, doc) { sortAll(window, doc, wrongBucketFor); }

// Sorts the first `n` cards into a wrong bucket, leaves the rest untouched,
// then lets the meeting timer run out (mixed unsorted + wrong scenario).
function sortSomeWrongThenTimeout(window, doc, n) {
  const st = window.STAGES[window.S.i];
  const items = Array.from(doc.querySelectorAll(".item"));
  items.slice(0, n).forEach((el) => {
    el.dispatchEvent(new window.Event("click", { bubbles: true }));
    const idx = el.dataset.idx;
    const bid = wrongBucketFor(st.items[idx].c);
    doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  const tick = window.__intervalFns[window.__intervalFns.length - 1];
  for (let i = 0; i < 69; i++) tick();
}

// Sorts exactly one card CORRECTLY, then lets the timer run out — same
// technique as FEATURE-015.test.js's sortMapButLeaveSomeUnsorted, reused here
// as the pure "incomplete but not wrong" regression case.
function sortOneCorrectlyThenTimeout(window, doc) {
  const st = window.STAGES[window.S.i];
  const firstItem = doc.querySelector(".item");
  firstItem.dispatchEvent(new window.Event("click", { bubbles: true }));
  const firstIdx = firstItem.dataset.idx;
  const bid = correctBucket(st.items[firstIdx].c);
  doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  const tick = window.__intervalFns[window.__intervalFns.length - 1];
  for (let i = 0; i < 69; i++) tick();
}

function solveGherkinPrecisely(window, doc) {
  click(doc, "precise");
  const st = window.STAGES[window.S.i];
  st.scenarios.forEach((sc, si) => {
    sc.lines.forEach((ln, li) => {
      let correctGi = null;
      ln.segs.forEach((seg, gi) => { if (seg.c) correctGi = gi; });
      doc.querySelector('.seg[data-k="' + si + '.' + li + '"][data-g="' + correctGi + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}
function answerSelectCorrectly(window, doc, mode) {
  const s = window.STAGES[window.S.i];
  s.options.forEach((o, idx) => {
    const shouldPick = (mode === "catch") ? o.bad : !o.bad;
    if (shouldPick) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}

// Drives Team mode (dev missing, so the bizvalue fork is skipped — deterministic
// stage sequence) from start through the map step (via `sortMapFn`) all the way
// to the build step, keeping every OTHER shortcut honest so only the mapping
// step's own consequence (or lack of it) is visible in the result.
async function runToImpl(sortMapFn) {
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
  const mapReactBefore = doc.getElementById("react");
  sortMapFn(window, doc);
  // Analysis-Gutschrift unmittelbar NACH dem Map-Schritt, BEVOR nachfolgende
  // Schritte (Gherkin/Pre-Mortem/Overreach/DoR) ihre eigene Gutschrift
  // addieren — sonst ließe sich die Gutschrift des Map-Schritts selbst nicht
  // isoliert prüfen.
  const analysisAfterMap = window.S.analysis;
  const badgesAfterMap = window.S.badges.slice();

  click(doc, "nextBtn"); // -> gherkin (dev-missing has no bizvalue fork)
  solveGherkinPrecisely(window, doc);
  click(doc, "nextBtn"); // -> question fork
  click(doc, "tSolid"); await wait(700); // don't defer
  click(doc, "nextBtn"); // -> premortemSkip fork
  click(doc, "tSolid"); await wait(700); // don't skip
  click(doc, "nextBtn"); // -> premortem
  answerSelectCorrectly(window, doc, "pick");
  click(doc, "nextBtn"); // -> overreach
  answerSelectCorrectly(window, doc, "catch");
  click(doc, "nextBtn"); // -> DoR
  click(doc, "markAll"); // everything actually true this run -> no paperwork
  click(doc, "dorContinue");
  assert.strictEqual(window.S.dorPaperwork, 0, "Bei diesem Testaufbau sollte kein DoR-Paperwork entstehen");
  click(doc, "nextBtn"); // -> teamimpl

  click(doc, "handoff");
  await wait(2500);

  const impl = doc.getElementById("impl");
  assert(impl, "#impl sollte existieren");
  return { dom, window, doc, impl, mapReactHTML: mapReactBefore.innerHTML, analysisAfterMap, badgesAfterMap };
}

function findThreadByTitle(impl, needle) {
  return Array.from(impl.querySelectorAll(".tthread")).find((c) => c.querySelector(".ttitle").textContent.indexOf(needle) !== -1);
}

// Case 1: all cards correct AND in time -> unchanged success path, no new thread.
async function scenarioAllCorrectInTime() {
  let dom;
  try {
    const r = await runToImpl(sortAllCorrectly);
    dom = r.dom;
    assert(r.mapReactHTML.indexOf("The board is sorted. Everyone in the room sees the same picture.") !== -1,
      "Erfolgstext sollte bei korrekter, rechtzeitiger Sortierung unverändert erscheinen");
    assert(r.badgesAfterMap.some((b) => b.name === "Team mapper"), "Abzeichen sollte bei korrekter Sortierung vergeben werden");
    assert.strictEqual(r.analysisAfterMap, 1, "Analyse-Gutschrift des Map-Schritts (1 Tag) sollte bei korrekter Sortierung erfolgen");
    assert(!findThreadByTitle(r.impl, "wrong kind") && !findThreadByTitle(r.impl, "mapped into the wrong"),
      "Bei korrekter Sortierung sollte im Bau-Schritt KEIN Falsch-Zuordnungs-Thread erscheinen");
    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioAllCorrectInTime: " + err.message;
  }
}

// Case 2: all 7 cards sorted WRONG, but in time — the exact bug Stephan
// reported. No badge, no credit, honest feedback, capped rework thread later.
async function scenarioAllWrongInTime() {
  let dom;
  try {
    const r = await runToImpl(sortAllWrong);
    dom = r.dom;
    assert(r.mapReactHTML.indexOf("Everyone in the room sees the same picture") === -1,
      "Ein komplett falsch sortiertes Board darf NICHT mehr als 'alle sehen dasselbe Bild' gefeiert werden");
    assert(!r.badgesAfterMap.some((b) => b.name === "Team mapper"), "Bei komplett falscher Sortierung darf KEIN Abzeichen vergeben werden");
    assert.strictEqual(r.analysisAfterMap, 0, "Bei komplett falscher Sortierung darf der Map-Schritt KEINE Analyse-Gutschrift geben");
    // Kartenzahl je Szenario variiert (zufällig gewähltes Szenario über
    // teamRndBtn) — bei "mappingComplete" (dev fehlt, nicht PO) ist es die
    // volle Kartenmenge des Szenarios, siehe TeamState.mappingComplete.
    const expectedCount = r.window.SC.map.length;
    assert(expectedCount >= 4, "Erwartete Kartenzahl sollte plausibel sein, gefunden: " + expectedCount);
    assert.strictEqual(r.window.TeamState.mapWrongCount, expectedCount, "Alle Karten des Szenarios sollten als falsch erkannt werden");

    const thread = findThreadByTitle(r.impl, "wrong kind");
    assert(thread, "Der neue Bau-Schritt-Thread für falsch sortierte Karten sollte erscheinen");
    const cost = thread.querySelector(".tcost");
    assert(cost && cost.textContent.indexOf("+3d") !== -1, "Bei " + expectedCount + " falschen Karten (>3) sollte der Deckel von 3 Tagen greifen, gefunden: " + (cost && cost.textContent));
    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioAllWrongInTime: " + err.message;
  }
}

// Case 3: timeout with BOTH unsorted AND wrongly-sorted cards among what made
// it onto the board — both consequences must show up independently.
async function scenarioMixedTimeout() {
  let dom;
  try {
    const r = await runToImpl((window, doc) => sortSomeWrongThenTimeout(window, doc, 2));
    dom = r.dom;
    assert(r.window.TeamState.mapWrongCount === 2, "Zwei Karten sollten als falsch sortiert erkannt werden, gefunden: " + r.window.TeamState.mapWrongCount);
    assert(r.window.TeamState.mapUnsortedCount > 0, "Es sollten weiterhin nicht abgelegte Karten gezählt werden");
    assert(!r.badgesAfterMap.some((b) => b.name === "Team mapper"), "Bei Zeitablauf darf ohnehin kein Abzeichen vergeben werden");

    const wrongThread = findThreadByTitle(r.impl, "wrong kind");
    const unsortedThread = findThreadByTitle(r.impl, "unsorted");
    assert(wrongThread, "Der Falsch-Zuordnungs-Thread sollte trotz Zeitablauf zusätzlich erscheinen");
    assert(unsortedThread, "Der bereits bestehende Unsorted-Thread sollte weiterhin erscheinen");
    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioMixedTimeout: " + err.message;
  }
}

// Case 4: timeout, but every card that WAS placed is correct — pure regression
// check that the pre-existing unsorted-only path is completely unchanged.
async function scenarioTimeoutOnlyUnsorted() {
  let dom;
  try {
    const r = await runToImpl(sortOneCorrectlyThenTimeout);
    dom = r.dom;
    assert.strictEqual(r.window.TeamState.mapWrongCount, 0, "Bei ausschließlich korrekt abgelegten Karten sollte kein Falsch-Zähler entstehen");
    assert(r.window.TeamState.mapUnsortedCount > 0, "Es sollten weiterhin nicht abgelegte Karten gezählt werden");
    assert(!findThreadByTitle(r.impl, "wrong kind"), "Ohne falsch sortierte Karten darf der neue Thread NICHT erscheinen");
    assert(findThreadByTitle(r.impl, "unsorted"), "Der bestehende Unsorted-Thread sollte unverändert erscheinen");
    dom.window.close();
    return null;
  } catch (err) {
    if (dom) dom.window.close();
    return "scenarioTimeoutOnlyUnsorted: " + err.message;
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
  // Timer-Mechanismus (__intervalFns) und teilt sich sonst leicht den
  // Meeting-Timer-Zustand zwischen parallel laufenden jsdom-Instanzen.
  const scenarios = [
    scenarioAllCorrectInTime,
    scenarioAllWrongInTime,
    scenarioMixedTimeout,
    scenarioTimeoutOnlyUnsorted,
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
  console.log("PASS — 5/5 Checks grün (korrekt+rechtzeitig unverändert, komplett falsch+rechtzeitig ohne Abzeichen/Gutschrift + gedeckelter Bau-Schritt-Thread, gemischt falsch+unsortiert bei Zeitablauf mit beiden Threads, reiner Unsorted-Regressionsfall unverändert, GAME_VERSION erhöht)");
  process.exit(0);
}

main();
