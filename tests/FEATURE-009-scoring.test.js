/**
 * tests/FEATURE-009-scoring.test.js — jsdom test for the Team-mode scoring/credit
 * bug reported by Stephan after his own manual test of FEATURE-009:
 *
 *   "Obwohl ich im ersten Spielschritt nicht alles zugeordnet hatte [Map-Timeout]
 *   und im zweiten keep it vague anklickte [Gherkin], wurde das positive auf die
 *   Analysis Time angerechnet, obwohl das doch beides Rework generierte."
 *
 * Root cause (verified by reading the code, not guessed): every team stage in
 * buildTeamStages() carries a fixed analysisDays/badge on the STAGE OBJECT, and
 * completeStep()/debriefHTML() always applied that credit regardless of which
 * choice the player actually made — so a rushed/incomplete map board and a
 * deliberately vague behaviour spec were credited exactly like the honest,
 * complete outcome. That contradicts the pattern already established for the
 * "defer the question" shortcut (TeamState.deferredQuestion), which correctly
 * withholds credit and instead resurfaces as paid-for rework during the build
 * step (renderTeamImpl chat interrupt, +2d).
 *
 * These checks stay durably useful for any later ticket touching Team-mode
 * scoring, not just this bug fix — see spec-or-regret-impl Testplan guidance.
 *
 * Ausführen: node tests/FEATURE-009-scoring.test.js
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
      // Deterministic meeting-timer, same pattern as FEATURE-009.test.js.
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

async function main() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;

  try {
    // Force a deterministic run: Product Owner NOT missing, so the bizvalue-fork
    // stage is skipped and the stage sequence is fixed and known in advance.
    window.pickMissingRoleId = function () { return "dev"; };

    click(doc, "introCta");
    click(doc, "pickTeamMode");
    assert.strictEqual(window.TeamState.roleMissing, "dev", "Test-Stub für die fehlende Rolle sollte gegriffen haben");

    // --- Stage 1: roster -> map, let the timer run out with an EMPTY board (no
    // card sorted at all) — the shortcut this bug report is about.
    click(doc, "teamNext");
    assert(window.__intervalFns.length > 0, "Meeting-Timer sollte laufen");
    const tick = window.__intervalFns[window.__intervalFns.length - 1];
    for (let i = 0; i < 69; i++) tick(); // 68s abgelaufen (45s + 50%), Board nicht fertig sortiert
    assert(doc.querySelector(".debrief"), "Nach Ablauf sollte automatisch der Debrief erscheinen");

    // Check 1: an unfinished board must NOT be credited as free analysis time,
    // and must NOT unlock the "Team mapper" badge — it was rushed, not done.
    assert.strictEqual(window.S.analysis, 0, "Ein nicht fertiges Board darf keine Analysis-Time-Gutschrift geben");
    assert.strictEqual(window.S.badges.length, 0, "Ein nicht fertiges Board darf kein Badge freischalten");

    click(doc, "nextBtn"); // -> teamgherkin

    // --- Stage 2: Gherkin — choose "keep it vague" (the other shortcut Stephan tested).
    click(doc, "vagueChoice");
    await wait(600); // renderTeamGherkin's vague path calls completeStep after a 500ms setTimeout
    assert(doc.querySelector(".debrief"), "Nach 'keep it vague' sollte der Debrief erscheinen");

    // Check 2: staying vague must NOT be credited as free analysis time either,
    // and must NOT unlock the "Behaviour spelled out" badge.
    assert.strictEqual(window.S.analysis, 0, "Eine bewusst vage gelassene Formulierung darf keine Analysis-Time-Gutschrift geben");
    assert.strictEqual(window.S.badges.length, 0, "Eine bewusst vage gelassene Formulierung darf kein Badge freischalten");
    assert.strictEqual(window.TeamState.acPrecise, false, "TeamState sollte die vage Wahl korrekt vermerkt haben");

    click(doc, "nextBtn"); // -> teamfork "question"

    // --- Stage 3: the open-question fork — take the HONEST path here, so any
    // later rework we see can only come from the map timeout and the vague AC,
    // isolating exactly the two shortcuts this bug report is about.
    click(doc, "tSolid");
    await wait(700); // renderTeamFork's resolve() calls completeStep after a 500ms setTimeout
    assert(doc.querySelector(".debrief"), "Nach der ehrlichen Fork-Wahl sollte der Debrief erscheinen");
    assert.strictEqual(window.TeamState.deferredQuestion, null, "Die ehrliche Wahl darf keine offene Frage aufschieben");
    click(doc, "nextBtn"); // -> teamselect premortem

    // --- Stage 4/5: pre-mortem + overreach — answer correctly using the real
    // options from the scenario data (data-idx is the ORIGINAL index into
    // st.options, stable regardless of the shuffled display order).
    function answerSelect(mode) {
      const st = window.STAGES[window.S.i];
      st.options.forEach(function (o, idx) {
        const shouldPick = (mode === "catch") ? o.bad : !o.bad;
        if (shouldPick) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
      });
      doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
    }
    answerSelect("pick"); // pre-mortem
    assert(doc.querySelector(".debrief"), "Pre-Mortem sollte mit den korrekten Antworten den Debrief zeigen");
    click(doc, "nextBtn"); // -> teamselect overreach
    answerSelect("catch"); // overreach
    assert(doc.querySelector(".debrief"), "Overreach-Erkennung sollte mit den korrekten Antworten den Debrief zeigen");
    click(doc, "nextBtn"); // -> teamdor

    // --- Stage 6: DoR checklist — mark everything as done (paperwork is a
    // separate, already-covered mechanic, not what this bug report is about).
    click(doc, "markAll");
    click(doc, "dorContinue");
    assert(doc.querySelector(".debrief"), "DoR-Schritt sollte den Debrief zeigen");
    click(doc, "nextBtn"); // -> teamimpl

    // --- Stage 7: hand it to the team — this is where deferred/shortcut threads
    // are supposed to resurface as real, paid-for rework (cycle time).
    const reworkBefore = window.S.rework.length;
    click(doc, "handoff");
    await wait(2500); // 1400ms + 900ms nested setTimeouts inside renderTeamImpl's handler

    // Check 3: the two shortcuts taken earlier (rushed/incomplete map, vague AC)
    // must show up as real rework now — this is the "Rework generierte" Stephan
    // expected but didn't see.
    const newRework = window.S.rework.slice(reworkBefore);
    assert(newRework.length >= 2, "Rushed map + vage AC sollten zusammen mindestens 2 Rework-Einträge beim Build erzeugen, gefunden: " + newRework.length);
    assert(window.S.cycle > 0, "Cycle time sollte durch das nachträgliche Rework gestiegen sein");

    console.log("PASS — 3/3 Checks grün (kein Analysis-/Badge-Fehlanreiz bei Map-Timeout, kein Analysis-/Badge-Fehlanreiz bei vager AC, beide lösen echtes Rework beim Build aus)");
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
