/**
 * tests/BUG-006.test.js — jsdom-Test für den Mode-Picker Button-Alignment-Fix.
 *
 * Bug: Beide Moduswahl-Karten ("Collaborate with Agents" / "Work as a Team")
 * liegen in einem zweispaltigen CSS-Grid (.modecards). Grid-Zeilen werden auf
 * gleiche Höhe gestreckt — öffnete man die "What's different here?"-Box einer
 * Karte, wuchs die ANDERE (geschlossene) Karte auf dieselbe neue Höhe, und weil
 * .modecard .story bislang flex:1 trug, absorbierte genau dieser Textabsatz die
 * Streck-Höhe und schob den Start-Button der geschlossenen Karte nach unten —
 * der Button der geöffneten Karte bewegte sich dagegen nicht. Fix (Option B,
 * von Stephan freigegeben): .story trägt kein flex:1 mehr, ein neues
 * unsichtbares .cardspace-Element NACH dem Button (vor der <details>-Box)
 * absorbiert die Streck-Höhe stattdessen — der Button bleibt an fester
 * Position, die beiden Kartenboxen bleiben weiterhin als Paar gleich hoch
 * (CSS-Grid-Stretch unverändert aktiv).
 *
 * jsdom hat keine echte Layout-Engine (boundingBox()/getBoundingClientRect()
 * liefern dort nur Nullen) — ob die Buttons tatsächlich auf gleicher Höhe
 * BLEIBEN, kann dieser Test nicht zeigen. Das prüft tests/BUG-006-visual.test.js
 * mit echtem Chromium. Dieser jsdom-Test prüft stattdessen die funktionalen
 * Aspekte: beide Boxen öffnen/schließen weiterhin unabhängig voneinander über
 * echte Klicks, und beide Start-Buttons funktionieren nach dem Öffnen/Schließen
 * weiterhin (Klick führt weiterhin zum jeweils nächsten Screen).
 *
 * GAME_VERSION wird bewusst NICHT auf einen exakten neuen String geprüft
 * (siehe tests/FEATURE-009.test.js & Folge-Tickets für die Fragilitätsklasse,
 * die dadurch entsteht) — nur, dass sie sich gegenüber dem zuletzt bekannten
 * Stand "1.25.0" geändert hat. Ein künftiges Ticket bumpt die Version weiter;
 * ein exakter String hier würde dann fälschlich rot werden, obwohl BUG-006
 * selbst weiterhin korrekt funktioniert.
 *
 * Ausführen: node tests/BUG-006.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const OLD_KNOWN_VERSION = "1.25.0";

function loadGame() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true, // liefert requestAnimationFrame (Konfetti-Loop braucht es)
    url: "http://localhost/",
    // beforeParse läuft VOR dem einzigen <script>-Block der App — dessen letzte
    // Zeilen werfen sofort synchron eine Konfetti-Canvas-Schleife an.
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

function click(doc, elOrId) {
  const el = typeof elOrId === "string" ? doc.getElementById(elOrId) : elOrId;
  assert(el, `Element ${elOrId} sollte im DOM existieren`);
  el.dispatchEvent(new doc.defaultView.Event("click", { bubbles: true }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;

  try {
    // Test 1: GAME_VERSION wurde gegenüber dem alten bekannten Stand erhöht.
    assert.notStrictEqual(window.GAME_VERSION, OLD_KNOWN_VERSION, "GAME_VERSION sollte gegenüber 1.25.0 erhöht worden sein");

    // Get to the mode picker via the real intro click path.
    click(doc, "introCta");
    const agentDetails = doc.querySelector(".modecard.modeagent details.moredet");
    const teamDetails = doc.querySelector(".modecard.team details.moredet");
    const agentSummary = agentDetails.querySelector("summary");
    const teamSummary = teamDetails.querySelector("summary");
    assert(agentDetails && teamDetails, "beide Karten sollten eine .moredet-Box haben");

    // Test 2: .cardspace-Spacer existiert in beiden Karten, direkt nach dem
    // jeweiligen Start-Button und vor der .moredet-Box (Markup-Reihenfolge).
    const agentCard = doc.querySelector(".modecard.modeagent");
    const teamCard = doc.querySelector(".modecard.team");
    const agentSpacer = agentCard.querySelector(".cardspace");
    const teamSpacer = teamCard.querySelector(".cardspace");
    assert(agentSpacer, "Agent-Karte sollte ein .cardspace-Element enthalten");
    assert(teamSpacer, "Team-Karte sollte ein .cardspace-Element enthalten");
    const agentBtn = doc.getElementById("pickAgentMode");
    const teamBtn = doc.getElementById("pickTeamMode");
    // button -> cardspace -> details, in genau dieser Reihenfolge im Markup.
    assert.strictEqual(agentBtn.nextElementSibling, agentSpacer, "Agent: .cardspace sollte direkt auf den Start-Button folgen");
    assert.strictEqual(agentSpacer.nextElementSibling, agentDetails, "Agent: .moredet sollte direkt auf .cardspace folgen");
    assert.strictEqual(teamBtn.nextElementSibling, teamSpacer, "Team: .cardspace sollte direkt auf den Start-Button folgen");
    assert.strictEqual(teamSpacer.nextElementSibling, teamDetails, "Team: .moredet sollte direkt auf .cardspace folgen");

    // Test 3: beide Boxen öffnen unabhängig voneinander per echtem Klick.
    click(doc, agentSummary);
    assert(agentDetails.hasAttribute("open"), "Agent-Box sollte nach Klick offen sein");
    assert(!teamDetails.hasAttribute("open"), "Team-Box sollte unverändert geschlossen bleiben");

    click(doc, teamSummary);
    assert(teamDetails.hasAttribute("open"), "Team-Box sollte nach eigenem Klick offen sein");
    assert(agentDetails.hasAttribute("open"), "Agent-Box sollte weiterhin offen bleiben (unabhängig)");

    // Test 4: beide Boxen schließen unabhängig voneinander. Das Schließen
    // entfernt das `open`-Attribut erst nach der 280ms max-height-Transition
    // (siehe der Klick-Handler in renderModePicker(), BUG-004) — also warten,
    // nicht sofort nach dem Klick prüfen.
    click(doc, agentSummary);
    await sleep(320);
    assert(!agentDetails.hasAttribute("open"), "Agent-Box sollte nach zweitem Klick wieder geschlossen sein");
    assert(teamDetails.hasAttribute("open"), "Team-Box sollte davon unberührt offen bleiben");

    click(doc, teamSummary);
    await sleep(320);
    assert(!teamDetails.hasAttribute("open"), "Team-Box sollte nach eigenem zweiten Klick wieder geschlossen sein");

    // Test 5: Start-Buttons funktionieren nach dem Öffnen/Schließen weiterhin —
    // Klick auf #pickAgentMode führt zum nächsten Screen (renderPicker() befüllt
    // #stageHost). Re-render the picker fresh to test the team button in isolation.
    click(doc, agentSummary); // open again, then click Start
    const stageHost = doc.getElementById("stageHost");
    click(doc, "pickAgentMode");
    assert(stageHost.innerHTML.length > 0, "pickAgentMode sollte nach Öffnen/Schließen weiterhin zum nächsten Screen führen");

    // Reset back to the mode picker to test the team button the same way.
    window.renderModePicker();
    const teamDetails2 = doc.querySelector(".modecard.team details.moredet");
    const teamSummary2 = teamDetails2.querySelector("summary");
    click(doc, teamSummary2);
    await sleep(20);
    click(doc, teamSummary2); // open then close
    await sleep(320);
    click(doc, "pickTeamMode");
    assert(stageHost.innerHTML.length > 0, "pickTeamMode sollte nach Öffnen/Schließen weiterhin zum nächsten Screen führen");

    console.log("PASS — 5/5 Checks grün (GAME_VERSION gebumpt, .cardspace an richtiger Markup-Position in beiden Karten, unabhängiges Öffnen/Schließen, beide Start-Buttons funktionieren weiterhin)");
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
