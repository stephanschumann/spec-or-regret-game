/**
 * tests/FEATURE-012.test.js — jsdom tests for opening up "Work as a Team" to
 * all 21 banking scenarios (FEATURE-012) in "Spec or Regret" (public/index.html).
 *
 * Before this ticket, Team mode was hard-locked to exactly one scenario
 * ("four-eyes") via TEAM_SCENARIO_ID / findTeamScenario(). This ticket:
 *   1. Removes that lock — startTeamMode(sc) now takes the scenario as an
 *      argument, same as Agent mode's renderPicker() -> startBtn flow.
 *   2. Adds a dedicated renderTeamPicker() screen (21 cards + "Surprise us"),
 *      shown between the mode picker and the team roster screen.
 *
 * The single biggest silent-failure risk this ticket introduces: some other
 * one of the 21 scenarios doesn't actually share the exact data shape the
 * generic renderTeam* functions assume (8 map items in a 1/3/2/2 split, 6
 * premortem items, 7 overreach items, full behaviour.happy/negative/edge).
 * Test 1 below is a hard regression guard for exactly that.
 *
 * Ausführen: node tests/FEATURE-012.test.js
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

/* ---------- Test 1: all 21 scenarios share the exact shape Team mode assumes ---------- */
async function testAllScenariosShapeValid() {
  const dom = loadGame();
  try {
    const { window } = dom;
    const scenarios = window.SCENARIOS;
    assert.strictEqual(scenarios.length, 21, "Es sollten genau 21 Szenarien geben");

    const badMap = [], badPremortem = [], badOverreach = [], badBehaviour = [];
    scenarios.forEach((sc) => {
      const goal = sc.map.filter((m) => m.c === "goal").length;
      const rule = sc.map.filter((m) => m.c === "rule").length;
      const ex = sc.map.filter((m) => m.c === "ex").length;
      const q = sc.map.filter((m) => m.c === "q").length;
      if (!(sc.map.length === 8 && goal === 1 && rule === 3 && ex === 2 && q === 2)) badMap.push(sc.id);
      if (!(Array.isArray(sc.premortem) && sc.premortem.length === 6)) badPremortem.push(sc.id);
      if (!(Array.isArray(sc.overreach) && sc.overreach.length === 7)) badOverreach.push(sc.id);
      const b = sc.behaviour;
      const bOk = b && b.happy && b.negative && b.edge &&
        Array.isArray(b.happy.lines) && b.happy.lines.length > 0 &&
        Array.isArray(b.negative.lines) && b.negative.lines.length > 0 &&
        Array.isArray(b.edge.lines) && b.edge.lines.length > 0;
      if (!bOk) badBehaviour.push(sc.id);
    });

    assert.strictEqual(badMap.length, 0, "Szenarien mit falscher map-Aufteilung (erwartet 1 goal/3 rule/2 ex/2 q): " + badMap.join(", "));
    assert.strictEqual(badPremortem.length, 0, "Szenarien mit falscher premortem-Länge (erwartet 6): " + badPremortem.join(", "));
    assert.strictEqual(badOverreach.length, 0, "Szenarien mit falscher overreach-Länge (erwartet 7): " + badOverreach.join(", "));
    assert.strictEqual(badBehaviour.length, 0, "Szenarien mit unvollständigem behaviour (happy/negative/edge): " + badBehaviour.join(", "));

    return null;
  } catch (err) { return "Szenario-Formcheck (alle 21): " + err.message; }
  finally { dom.window.close(); }
}

/* ---------- Test 2: GAME_VERSION ---------- */
async function testGameVersion() {
  const dom = loadGame();
  try {
    assert.strictEqual(dom.window.GAME_VERSION, "1.19.0", "GAME_VERSION sollte auf 1.19.0 stehen");
    return null;
  } catch (err) { return "GAME_VERSION: " + err.message; }
  finally { dom.window.close(); }
}

/* ---------- Test 3: mode-picker -> team-picker -> roster gating ---------- */
async function testTeamPickerGating() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickTeamMode");

    // The dedicated scenario picker should now show, NOT the roster screen.
    assert(doc.getElementById("teamScenlist"), "Nach pickTeamMode sollte #teamScenlist (Team-Szenario-Picker) erscheinen");
    assert(doc.getElementById("teamStartBtn"), "Team-Picker sollte #teamStartBtn zeigen");
    assert(doc.getElementById("teamRndBtn"), "Team-Picker sollte #teamRndBtn zeigen");
    assert(!doc.getElementById("teamNext"), "Die Roster-Ansicht (#teamNext) sollte NOCH NICHT erscheinen, bevor ein Szenario gewählt wurde");
    assert.strictEqual(doc.getElementById("teamStartBtn").disabled, true, "#teamStartBtn sollte deaktiviert sein, solange kein Szenario ausgewählt ist");

    // Pick a specific card (index 3), then start.
    doc.querySelector('#teamScenlist .scenopt[data-idx="3"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    assert.strictEqual(doc.getElementById("teamStartBtn").disabled, false, "#teamStartBtn sollte nach Auswahl aktiviert sein");
    click(doc, "teamStartBtn");

    assert(doc.getElementById("teamNext"), "Nach Klick auf #teamStartBtn sollte die Roster-Ansicht (#teamNext) erscheinen");
    assert.strictEqual(window.SC.id, window.SCENARIOS[3].id, "SC sollte auf das per Karte gewählte Szenario (idx 3) gesetzt sein");

    return null;
  } catch (err) { return "Modus- -> Team-Picker- -> Roster-Gating: " + err.message; }
  finally { dom.window.close(); }
}

/* Drives one full Team-mode round for a specific scenario, picked via a real
   click on its .scenopt card in #teamScenlist (never "Surprise us"), through
   to the finale. Forces the missing role to "dev" so the no-PO / no-bizvalue-
   fork branch is used uniformly across scenarios (orthogonal to this ticket,
   already covered by FEATURE-009/010/011). Leaves the dom OPEN. */
async function playTeamRoundForScenarioIdx(idx) {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return "dev"; };

  click(doc, "introCta");
  click(doc, "pickTeamMode");
  doc.querySelector('#teamScenlist .scenopt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  click(doc, "teamStartBtn");

  const expectedId = window.SCENARIOS[idx].id;
  assert.strictEqual(window.SC.id, expectedId, "SC sollte dem per Karte gewählten Szenario entsprechen");

  const rosterHTML = doc.getElementById("stageHost").innerHTML;

  click(doc, "teamNext"); // -> map
  const st = window.STAGES[window.S.i];
  Array.from(doc.querySelectorAll(".item")).forEach((el) => {
    el.dispatchEvent(new window.Event("click", { bubbles: true }));
    const i2 = el.dataset.idx;
    const c = st.items[i2].c;
    const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
    doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  click(doc, "nextBtn"); // -> gherkin (dev-missing has no bizvalue fork)

  const mapHTML = doc.getElementById("stageHost").innerHTML;

  click(doc, "precise");
  window.STAGES[window.S.i].scenarios.forEach((sc2, si) => {
    sc2.lines.forEach((ln, li) => {
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

  const finaleHTML = doc.getElementById("stageHost").innerHTML;
  return { dom, window, doc, expectedId, rosterHTML, mapHTML, finaleHTML };
}

/* ---------- Test 4: real click-through for 3 different scenarios ---------- */
async function testTeamRoundAcrossMultipleScenarios() {
  const indices = [0, 10, 20]; // three different, spread-out scenarios
  let dom;
  try {
    for (const idx of indices) {
      const r = await playTeamRoundForScenarioIdx(idx);
      dom = r.dom;
      assert(r.doc.getElementById("teamAgain"), "Szenario idx " + idx + " (" + r.expectedId + ") sollte den echten Finale-Button #teamAgain erreichen");
      assert(r.rosterHTML.length > 0 && r.rosterHTML.indexOf("undefined") === -1, "Roster-HTML für " + r.expectedId + " sollte befüllt sein und kein 'undefined' enthalten");
      assert(r.mapHTML.length > 0 && r.mapHTML.indexOf("undefined") === -1, "Map-HTML für " + r.expectedId + " sollte befüllt sein und kein 'undefined' enthalten");
      assert(r.finaleHTML.length > 0 && r.finaleHTML.indexOf("undefined") === -1, "Finale-HTML für " + r.expectedId + " sollte befüllt sein und kein 'undefined' enthalten");
      assert(r.finaleHTML.indexOf(r.window.SC.short) !== -1, "Finale-HTML für " + r.expectedId + " sollte den echten Szenario-Kurztext enthalten");
      dom.window.close();
      dom = null;
    }
    return null;
  } catch (err) { return "Team-Runde durch mehrere echte Szenarien (idx 0, 10, 20): " + err.message; }
  finally { if (dom) dom.window.close(); }
}

async function main() {
  const failures = (await Promise.all([
    testAllScenariosShapeValid(),
    testGameVersion(),
    testTeamPickerGating(),
    testTeamRoundAcrossMultipleScenarios(),
  ])).filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 4/4 Checks grün (alle 21 Szenarien formgleich, GAME_VERSION 1.19.0, Team-Picker-Gating vor Roster, echte Team-Runde durch 3 verschiedene Szenarien bis ins Finale)");
  process.exit(0);
}

main();
