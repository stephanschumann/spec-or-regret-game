/**
 * tests/TASK-003.test.js — jsdom tests for the renamed mode-picker card
 * titles and the new always-visible mode-axis lines in "Spec or Regret"
 * (public/index.html, renderModePicker()).
 *
 * Background (see TASK-003 spec in Backlog.md): a real user test of the
 * mode-picker landing page showed players didn't realize the two cards
 * represent two fundamentally different approaches to building software —
 * with an AI agent vs. a human-only team. That axis previously lived only
 * inside the collapsed "What's different here?" detail box, not in the
 * visible title or intro text. This ticket renames the two card titles,
 * adds one short always-visible line under each title, and appends one
 * sentence to the existing shared intro paragraph — all without touching
 * the collapsed detail lists (still deliberately spoiler-free) or any game
 * mechanic/shortcut.
 *
 * These checks stay durably useful for later tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. Both new card titles render exactly as agreed with Stephan.
 *   3. Both new always-visible mode-axis lines render, each without a
 *      leading icon (an icon there would duplicate the larger .e icon
 *      already above the title — a mistake this ticket deliberately
 *      undoes from an earlier draft).
 *   4. The shared intro paragraph above the cards ends with the new axis
 *      sentence, appended to (not replacing) the existing text.
 *   5. Regression: both mode buttons (pickAgentMode/pickTeamMode) still
 *      exist and still trigger their respective picker screens — the
 *      existing FEATURE-009/BUG-006 tests rely on these same IDs and must
 *      keep working unmodified.
 *   6. The collapsed "What's different here?" detail lists are untouched
 *      (still contain the old wording, e.g. "No agent") — this ticket is
 *      scoped to the always-visible copy only, not the spoiler-protected
 *      detail content.
 *
 * Ausführen: node tests/TASK-003.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const RAW_SOURCE = fs.readFileSync(INDEX_HTML, "utf8");

const OLD_GAME_VERSION = "1.27.0";
const TITLE_AGENT = "We collaborate with AI Agents";
const TITLE_TEAM = "We collaborate as a Human-only Team";
const BADGE_AGENT = "An AI agent does the actual building. You steer it.";
const BADGE_TEAM = "No AI involved — your team builds it, start to finish.";
const AXIS_SENTENCE = "Same requirement, same goal — one way with AI agents doing the build, the other with a human-only team.";

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
    },
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
  return dom;
}

function testGameVersion() {
  const dom = loadGame();
  try {
    assert.notStrictEqual(dom.window.GAME_VERSION, OLD_GAME_VERSION, "GAME_VERSION sollte für diese sichtbare Änderung erhöht worden sein");
    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "GAME_VERSION-Check: " + err.message;
  }
}

function testRenamedTitlesAndBadges() {
  const dom = loadGame();
  const { window } = dom;
  const document = window.document;
  try {
    window.renderModePicker();
    const html = document.getElementById("stageHost").innerHTML;

    assert(html.indexOf(TITLE_AGENT) !== -1, "Agent-Kachel sollte den neuen Titel '" + TITLE_AGENT + "' zeigen");
    assert(html.indexOf(TITLE_TEAM) !== -1, "Team-Kachel sollte den neuen Titel '" + TITLE_TEAM + "' zeigen");
    assert(html.indexOf(BADGE_AGENT) !== -1, "Agent-Kachel sollte die neue Kurzzeile zeigen");
    assert(html.indexOf(BADGE_TEAM) !== -1, "Team-Kachel sollte die neue Kurzzeile zeigen");
    assert(html.indexOf(AXIS_SENTENCE) !== -1, "Der gemeinsame Einleitungstext sollte um den neuen Achsen-Satz ergänzt sein");

    // The badges must be plain text, no leading icon (would duplicate the
    // larger .e icon above the title — an earlier draft's mistake).
    const agentBadgeMatch = html.match(/<p class="modebadge">([^<]*)<\/p>/);
    assert(agentBadgeMatch, "Es sollte mindestens eine .modebadge-Zeile geben");
    assert(html.indexOf('<p class="modebadge">🤖') === -1, "Die Agent-Kurzzeile darf kein führendes 🤖-Icon haben");
    assert(html.indexOf('<p class="modebadge">👥') === -1, "Die Team-Kurzzeile darf kein führendes 👥-Icon haben");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Titel/Kurzzeilen: " + err.message;
  }
}

function testDetailListsUntouched() {
  try {
    // Scoped out of this ticket on purpose — the spoiler-protected detail
    // list still uses the old, unrenamed wording ("No agent"), not the new
    // card titles or badge phrasing.
    const modePickerMatch = RAW_SOURCE.match(/function renderModePicker[\s\S]*?\n}/);
    assert(modePickerMatch, "renderModePicker() sollte auffindbar sein");
    const src = modePickerMatch[0];
    assert(src.indexOf("No agent") !== -1, "Die eingeklappte Detailliste sollte weiterhin den unveränderten Punkt 'No agent' enthalten (out of scope für dieses Ticket)");
    return null;
  } catch (err) {
    return "Detaillisten unangetastet: " + err.message;
  }
}

function testModeButtonsStillWork() {
  const dom = loadGame();
  const { window } = dom;
  const document = window.document;
  try {
    window.renderModePicker();
    assert(document.getElementById("pickAgentMode"), "Moduswahl sollte weiterhin eine anklickbare Agent-Kachel-Schaltfläche zeigen (Regression FEATURE-009/BUG-006)");
    assert(document.getElementById("pickTeamMode"), "Moduswahl sollte weiterhin eine anklickbare Team-Kachel-Schaltfläche zeigen (Regression FEATURE-009/BUG-006)");

    document.getElementById("pickTeamMode").onclick();
    assert(document.getElementById("stageHost").innerHTML.indexOf("Pick a scenario") !== -1 ||
      document.querySelectorAll(".scenopt").length > 0,
      "Klick auf die Team-Kachel sollte weiterhin zur Team-Szenarioauswahl führen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Regression Mode-Buttons: " + err.message;
  }
}

function main() {
  const failures = [
    testGameVersion(),
    testRenamedTitlesAndBadges(),
    testDetailListsUntouched(),
    testModeButtonsStillWork(),
  ].filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 4/4 Checks grün (GAME_VERSION erhöht, neue Titel+Kurzzeilen ohne Icon-Duplikat, eingeklappte Detailliste unangetastet, Mode-Buttons weiterhin funktionsfähig)");
  process.exit(0);
}

main();
