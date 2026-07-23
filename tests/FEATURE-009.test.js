/**
 * tests/FEATURE-009.test.js — jsdom test for the new "Work as a Team" mode
 * (FEATURE-009 vertical slice) in "Spec or Regret" (public/index.html).
 *
 * Follows the pattern established in tests/example.test.js: loads the full
 * single-file app in jsdom, drives it through real click/event handlers.
 * These six checks are chosen to stay durably useful for later Team-mode
 * tickets too (not one-off assertions) — see FEATURE-009 Testplan.
 *
 * Ausführen: node tests/FEATURE-009.test.js
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
      // Deterministic, instant meeting-timer for tests: capture the interval
      // callback instead of really waiting 45 real seconds per test run.
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

function main() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;

  try {
    // Test 1: GAME_VERSION wurde für dieses Feature erhöht.
    // 1.16.0 statt 1.15.1: Runde 8 (23.07.2026) — die beiden langen,
    // sich von selbst abspielenden Bau-Sequenzen (Agent-Modus: "an den Agent
    // übergeben", Team-Modus: "Start Development") springen nach dem letzten
    // Chat-/Rework-Eintrag nicht mehr automatisch ans Ende der Seite — der
    // Bildschirm bleibt stehen, damit man den Ablauf von oben nach unten
    // chronologisch mitverfolgen kann (siehe FEATURE-009-scroll-position.test.js).
    // Gewöhnliche, kurze Schritte scrollen weiterhin wie gewohnt zum Debrief.
    assert.strictEqual(window.GAME_VERSION, "1.16.0", "GAME_VERSION sollte auf 1.16.0 stehen");

    // Test 2: Nach dem Intro-Klick kommt die neue Moduswahl-Seite (zwei Kacheln),
    // NICHT mehr direkt die bisherige Szenarioauswahl.
    click(doc, "introCta");
    assert(doc.getElementById("pickAgentMode"), "Moduswahl sollte eine 'Collaborate with Agents'-Kachel zeigen");
    assert(doc.getElementById("pickTeamMode"), "Moduswahl sollte eine 'Work as a Team'-Kachel zeigen");
    assert(!doc.getElementById("scenlist"), "Die Szenario-Liste sollte NICHT sofort sichtbar sein, sondern erst nach Moduswahl");

    // Test 3: "Collaborate with Agents" führt zum unveränderten bestehenden Modus
    // (Regressionsschutz — alle 21 Szenarien weiterhin da, exakt wie vor diesem Ticket).
    click(doc, "pickAgentMode");
    const scenopts = doc.querySelectorAll(".scenopt");
    assert.strictEqual(scenopts.length, window.SCENARIOS.length, "Alle Szenarien sollten im bestehenden Modus weiterhin wählbar sein");
    assert.strictEqual(window.SCENARIOS.length, 21, "Es sollten weiterhin 21 Szenarien sein");

    // Reset back to the mode picker for the Team-mode checks below.
    click(doc, "introCta"); // no-op if overlay already closed, but harmless
    window.renderModePicker();

    // Test 4: "Work as a Team" zeigt die Besetzungsliste mit genau einer fehlenden Rolle.
    click(doc, "pickTeamMode");
    const missing = doc.querySelectorAll(".rolechip.missing");
    assert.strictEqual(missing.length, 1, "Genau eine Rolle sollte als fehlend markiert sein");
    assert(["Developer", "QA", "Tech Lead", "Product Owner"].some((label) => missing[0].textContent.indexOf(label) !== -1),
      "Die fehlende Rolle sollte eine der vier bekannten Rollen sein");

    // Test 5: Der Meeting-Timer erzwingt den Übergang, auch wenn das Board nicht fertig ist.
    click(doc, "teamNext"); // roster -> team map
    assert(doc.getElementById("timerFill"), "Der Meeting-Timer sollte während des Mapping-Schritts sichtbar sein");
    assert(window.__intervalFns.length > 0, "Der Timer sollte über setInterval laufen");
    const tick = window.__intervalFns[window.__intervalFns.length - 1];
    for (let i = 0; i < 69; i++) tick(); // simulate the full 68s countdown expiring (45s + 50%, FEATURE-009 Feedback 22.07.2026)
    assert(doc.querySelector(".debrief"), "Nach Ablauf der Zeit sollte automatisch der Team-Debrief erscheinen — ohne dass vorher ein 'Weiter trotzdem'-Button bestätigt wurde");
    assert(doc.getElementById("timerText").textContent === "0s", "Die Zeitanzeige sollte bei Null stehenbleiben");

    // Test 6: Im gesamten bisher gerenderten Team-Modus-Verlauf taucht kein Agentenbezug auf.
    const teamHTML = doc.getElementById("stageHost").innerHTML;
    assert(teamHTML.indexOf("🤖") === -1, "Kein Roboter-Emoji im Team-Modus");
    assert(!/\bAgent\b/.test(teamHTML), "Kein Wort 'Agent' im Team-Modus-Text");

    console.log("PASS — 6/6 Checks grün (Version, Moduswahl, Agent-Modus-Regression, Rollen-Besetzung, Meeting-Timer erzwingt Weiterschaltung, kein Agentenbezug)");
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
