/**
 * tests/BUG-002.test.js — jsdom tests for the single-person address fix
 * (BUG-002) in "Spec or Regret" (public/index.html).
 *
 * Scope (see BUG-002 spec in Backlog.md): the direct fourth-wall address to
 * the playing person (intro overlay, mode-picker heading, the recurring
 * debrief box, the scenario-picker sentence, the Agent-mode finale question)
 * now speaks to a single person in BOTH Agent mode and Team mode. The actual
 * in-story content (Team mode's roster/roles, reflection questions about
 * "your team") stays untouched — that is the real content of Team mode, not
 * an address bug. The "For facilitators" panel is kept (not removed) in
 * Agent mode and newly added to Team mode, both extended with mode-specific
 * agile-methods content, so coaches/trainers can still run either mode as a
 * group session.
 *
 * These checks stay durably useful for later tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. Intro overlay and mode-picker heading address a single person.
 *   3. debriefHTML() wrapper is single-person-addressed and IDENTICAL for
 *      Agent mode and Team mode (no more mode branching needed).
 *   4. Agent-mode scenario picker: single-person address; "For facilitators"
 *      button/panel still present and toggles.
 *   5. Team-mode scenario picker: single-person address; a NEW "For
 *      facilitators" button/panel is present, toggles, and has different
 *      (mode-specific) content than the Agent-mode panel.
 *   6. Agent-mode finale: single-person address instead of "Last team
 *      question"/"your team".
 *   7. Regression: Team mode's roster/role narrative is untouched — still
 *      genuinely team-framed, because that is Team mode's actual content.
 *
 * Ausführen: node tests/BUG-002.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const RAW_SOURCE = fs.readFileSync(INDEX_HTML, "utf8");

function loadGame() {
  const html = RAW_SOURCE;
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

async function testGameVersion() {
  const dom = loadGame();
  try {
    assert.notStrictEqual(dom.window.GAME_VERSION, "1.20.0", "GAME_VERSION sollte für diese sichtbare Änderung erhöht worden sein");
    return null;
  } catch (err) { return "GAME_VERSION: " + err.message; }
  finally { dom.window.close(); }
}

async function testIntroAndModePickerSinglePerson() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    const introText = doc.getElementById("ovIntro").textContent;
    assert(!/your team/i.test(introText), "Begrüßungsbildschirm sollte nicht mehr 'your team' zeigen");
    assert(!/everyone/i.test(introText), "Begrüßungsbildschirm sollte nicht mehr 'everyone' zeigen");

    click(doc, "introCta");
    const pickerHtml = doc.getElementById("stageHost").innerHTML;
    assert(!/Choose how your team works today/i.test(pickerHtml), "Moduswahl-Überschrift sollte nicht mehr 'your team' ansprechen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Begrüßung/Moduswahl-Ansprache: " + err.message;
  }
}

async function testDebriefWrapperSameInBothModesAndSinglePerson() {
  const dom = loadGame();
  const { window } = dom;
  try {
    const sc = window.SCENARIOS[0];
    const agentStages = window.buildStages(sc);
    const agentDebriefStage = agentStages.filter(function (st) { return st.debrief; })[0];
    const agentDebriefHtml = window.debriefHTML(agentDebriefStage);
    assert(!/Team debrief/i.test(agentDebriefHtml), "Agent-Modus-Debrief sollte nicht mehr 'Team debrief' zeigen");
    assert(!/Talk as a team/i.test(agentDebriefHtml), "Agent-Modus-Debrief sollte nicht mehr 'Talk as a team' zeigen");

    const teamStages = window.buildTeamStages(sc);
    const teamDebriefStage = teamStages.filter(function (st) { return st.debrief; })[0];
    const teamDebriefHtml = window.debriefHTML(teamDebriefStage);
    assert(!/Team debrief/i.test(teamDebriefHtml), "Team-Modus-Debrief sollte nicht mehr 'Team debrief' zeigen");
    assert(!/Talk as a team/i.test(teamDebriefHtml), "Team-Modus-Debrief sollte nicht mehr 'Talk as a team' zeigen");

    // Same wrapper label/intro in both modes — no mode branching needed anymore.
    const agentWrapperOnly = agentDebriefHtml.split('<div class="take">')[0];
    const teamWrapperOnly = teamDebriefHtml.split('<div class="take">')[0];
    assert.strictEqual(agentWrapperOnly, teamWrapperOnly, "Debrief-Wrapper (Label + 'Talk as a team'-Ersatz) sollte in beiden Modi identisch sein");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Debrief-Wrapper (beide Modi): " + err.message;
  }
}

async function testAgentPickerSinglePersonAndFacilitatorKept() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickAgentMode");
    const html = doc.getElementById("stageHost").innerHTML;
    assert(!/The facilitator picks one/i.test(html), "Agent-Szenarioauswahl sollte nicht mehr 'The facilitator picks one' zeigen");

    const facBtn = doc.getElementById("facBtn");
    const facil = doc.getElementById("facil");
    assert(facBtn, "'For facilitators'-Button sollte im Agent-Modus weiterhin existieren");
    assert(facil, "Facilitator-Infofeld sollte im Agent-Modus weiterhin existieren");
    assert(!facil.classList.contains("show"), "Facilitator-Infofeld sollte anfangs eingeklappt sein");
    click(doc, "facBtn");
    assert(facil.classList.contains("show"), "Facilitator-Infofeld sollte sich nach Klick öffnen");

    assert(/Definition of Ready/i.test(facil.innerHTML), "Agent-Facilitator-Infofeld sollte die im Agent-Modus simulierten agilen Methoden nennen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Agent-Szenarioauswahl (Ansprache + Facilitator-Baustein): " + err.message;
  }
}

async function testTeamPickerSinglePersonAndNewFacilitatorPanel() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    const html = doc.getElementById("stageHost").innerHTML;
    assert(!/Choose one for your team/i.test(html), "Team-Szenarioauswahl sollte nicht mehr 'Choose one for your team' zeigen");
    assert(!/Pick what your team refines/i.test(html), "Team-Szenarioauswahl sollte nicht mehr 'Pick what your team refines' zeigen");

    const facBtn = doc.getElementById("teamFacBtn");
    const facil = doc.getElementById("teamFacil");
    assert(facBtn, "'For facilitators'-Button sollte neu im Team-Modus existieren");
    assert(facil, "Facilitator-Infofeld sollte neu im Team-Modus existieren");
    assert(!facil.classList.contains("show"), "Facilitator-Infofeld sollte anfangs eingeklappt sein");
    click(doc, "teamFacBtn");
    assert(facil.classList.contains("show"), "Facilitator-Infofeld sollte sich nach Klick öffnen");

    assert(/Product Owner/i.test(facil.innerHTML), "Team-Facilitator-Infofeld sollte die im Team-Modus simulierten agilen Methoden nennen");

    // Regression: choosing a scenario and starting the round must still work
    // after the new button was added — it must not have broken the picker.
    doc.querySelector("#teamScenlist .scenopt").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "teamStartBtn");
    assert(window.STAGES && window.STAGES.length > 0, "Team-Runde sollte nach Klick auf Start trotz neuem Button starten");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Team-Szenarioauswahl (Ansprache + neuer Facilitator-Baustein + Regression): " + err.message;
  }
}

async function testAgentFinaleSinglePerson() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickAgentMode");
    doc.querySelector(".scenopt").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "startBtn");

    const expectedMax = window.maxAnalysisDays();
    window.S.analysis = expectedMax;
    window.S.badges = window.STAGES.map(function (st, idx) { return st.badge ? { e: st.badge.e, name: st.badge.name, i: idx } : null; }).filter(Boolean);
    window.S.rework = [];
    const bossSt = window.STAGES.filter(function (st) { return st.isBoss; })[0];
    window.S.cycle = bossSt.buildDays;
    window.S.benchmark = 15;

    window.renderFinale();
    const html = doc.getElementById("stageHost").innerHTML;
    assert(!/Last team question/i.test(html), "Agent-Finale sollte nicht mehr 'Last team question' zeigen");
    assert(!/your team most often start/i.test(html), "Agent-Finale sollte nicht mehr 'your team most often start' zeigen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Agent-Finale-Ansprache: " + err.message;
  }
}

async function testTeamModeStoryUnchangedRegression() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    doc.querySelector("#teamScenlist .scenopt").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "teamStartBtn");
    const rosterHtml = doc.getElementById("stageHost").innerHTML;
    assert(/Who's in the room\?/i.test(rosterHtml), "Team-Modus-Rollen-Aufstellung ('Who's in the room?') sollte unverändert bleiben — das ist die eigentliche Spielgeschichte, keine Ansage");

    // A representative business-domain "everyone" mention inside a scenario
    // itself must stay untouched — that is ordinary domain language, not
    // an address to the playing person (out of scope per the spec).
    assert(/pay everyone.s salary in one go/i.test(RAW_SOURCE), "Fachtext innerhalb eines Bankszenarios ('everyone's salary') sollte unverändert bleiben");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Team-Modus-Spielgeschichte unverändert (Regression): " + err.message;
  }
}

async function main() {
  const failures = (await Promise.all([
    testGameVersion(),
    testIntroAndModePickerSinglePerson(),
    testDebriefWrapperSameInBothModesAndSinglePerson(),
    testAgentPickerSinglePersonAndFacilitatorKept(),
    testTeamPickerSinglePersonAndNewFacilitatorPanel(),
    testAgentFinaleSinglePerson(),
    testTeamModeStoryUnchangedRegression(),
  ])).filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 7/7 Checks grün (Version, Begrüßung/Moduswahl, Debrief-Wrapper beide Modi identisch, Agent-Picker+Facilitator, Team-Picker+neuer Facilitator, Agent-Finale, Team-Story-Regression)");
  process.exit(0);
}

main();
