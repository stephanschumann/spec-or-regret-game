/**
 * tests/BUG-009.test.js — jsdom regression tests for the mode-picker
 * Start-button size mismatch (public/index.html, renderModePicker()).
 *
 * Background (see BUG-009 spec in Backlog.md): Stephan reported (screenshot,
 * 27.07.2026) that the two Start buttons in the mode-picker ("We collaborate
 * with AI Agents" / "We collaborate as a Human-only Team") render at visibly
 * different sizes — the agent button noticeably taller/wider-padded than
 * the team button. Root cause, verified against the real code (not
 * assumed): the agent button used class="btn big" (padding 18px 30px,
 * font-size 19px, .btn.big rule) while the team button used only
 * class="btn team" (base .btn padding 14px 22px, font-size 16px — .btn.team
 * only overrides background/color/box-shadow, not size). This size gap has
 * existed since the very first Firebase-hosting commit (git blame,
 * -S".btn.big" on public/index.html) — it predates BUG-004 and BUG-006,
 * which both fixed the buttons' Y-POSITION/alignment (card-height stretch),
 * never their own intrinsic size. So this was never actually fixed before,
 * not a fresh regression from TASK-003.
 *
 * Fix: add the "big" class to the team button too (class="btn big team"),
 * so it inherits the same padding/font-size from .btn.big while .btn.team
 * (declared later in the stylesheet, same specificity) still overrides
 * background/color/box-shadow to keep the teal color.
 *
 * jsdom has no real layout engine (documented limit, see BUG-006 test
 * comments) — it CAN resolve which CSS class names are present on an
 * element, which is what these checks verify structurally. The actual
 * rendered pixel size is confirmed separately by
 * tests/BUG-009-visual.test.js (Playwright/Chromium).
 *
 * Ausführen: node tests/BUG-009.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");

const OLD_GAME_VERSION = "1.28.0";

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

function testBothStartButtonsHaveSameSizeClass() {
  const dom = loadGame();
  const { window } = dom;
  const document = window.document;
  try {
    window.renderModePicker();
    const agentBtn = document.getElementById("pickAgentMode");
    const teamBtn = document.getElementById("pickTeamMode");
    assert(agentBtn, "Agent-Start-Button sollte existieren");
    assert(teamBtn, "Team-Start-Button sollte existieren");

    const agentClasses = agentBtn.className.split(/\s+/).filter(Boolean);
    const teamClasses = teamBtn.className.split(/\s+/).filter(Boolean);

    assert(agentClasses.indexOf("big") !== -1, "Agent-Button sollte weiterhin die Größen-Klasse 'big' tragen");
    assert(teamClasses.indexOf("big") !== -1, "Team-Button sollte jetzt ebenfalls die Größen-Klasse 'big' tragen (Fix BUG-009)");
    // Farbunterscheidung bleibt erhalten — team-spezifische Klasse nicht verloren.
    assert(teamClasses.indexOf("team") !== -1, "Team-Button sollte weiterhin die Farb-Klasse 'team' tragen");
    assert(agentClasses.indexOf("team") === -1, "Agent-Button sollte NICHT die Team-Farb-Klasse tragen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Button-Größenklasse: " + err.message;
  }
}

function testModeButtonsStillWork() {
  const dom = loadGame();
  const { window } = dom;
  const document = window.document;
  try {
    window.renderModePicker();
    assert(document.getElementById("pickAgentMode"), "Moduswahl sollte weiterhin eine anklickbare Agent-Kachel-Schaltfläche zeigen (Regression FEATURE-009/BUG-006/TASK-003)");
    assert(document.getElementById("pickTeamMode"), "Moduswahl sollte weiterhin eine anklickbare Team-Kachel-Schaltfläche zeigen (Regression FEATURE-009/BUG-006/TASK-003)");

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
    testBothStartButtonsHaveSameSizeClass(),
    testModeButtonsStillWork(),
  ].filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 3/3 Checks grün (GAME_VERSION erhöht, beide Start-Buttons tragen dieselbe Größen-Klasse 'big', Mode-Buttons weiterhin funktionsfähig)");
  process.exit(0);
}

main();
