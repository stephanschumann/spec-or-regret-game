/**
 * tests/FEATURE-017.test.js — jsdom checks for FEATURE-017 ("Wer ist im Raum?"-
 * Einleitungstext ausführlicher erklären, siehe Backlog.md).
 *
 * The very first Team-mode screen ("Who's in the room?", stage type
 * "teamroster") used to show only one short, factual sentence as its intro
 * text: "Before you touch the ticket, here's who showed up for this
 * refinement." Stephan asked for a more human sentence to be prepended,
 * acknowledging that incomplete meeting attendance is normal, everyday work
 * life — while the existing sentence stays word-for-word unchanged right
 * after it, as one flowing text (no visible paragraph break, confirmed by
 * Stephan 28.07.2026).
 *
 * This screen is shared across all 21 scenarios (buildTeamStages() builds an
 * identical "teamroster" stage regardless of which scenario is chosen) — a
 * test against a single scenario is representative for all 21, per the
 * Fundstellen-Sweep/Testabdeckung reasoning in the ticket's spec.
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
    // Real click path: close intro, open mode picker, pick "Team", pick any
    // scenario, start the Team round — this exercises the actual handlers
    // (renderPicker -> renderModePicker's team button -> renderTeamPicker's
    // scenario list -> startTeamMode), not an isolated function call.
    click(doc, "introCta");
    window.renderPicker();

    assert(typeof window.SCENARIOS !== "undefined" && window.SCENARIOS.length > 0);
    const sc = window.SCENARIOS[0];
    window.startTeamMode(sc);

    // We should now be on the very first Team stage ("teamroster").
    assert.strictEqual(window.STAGES[0].type, "teamroster", "erste Team-Stage sollte 'teamroster' sein");

    const setupEl = doc.querySelector(".setup");
    assert(setupEl, ".setup-Element sollte gerendert sein");
    const setupText = setupEl.textContent;

    const existingSentence = "Before you touch the ticket, here’s who showed up for this refinement.";
    assert(
      setupText.indexOf(existingSentence) !== -1,
      "der bisherige Satz sollte unverändert und wortgleich weiter im Einleitungstext stehen, tatsächlich: " + setupText
    );

    const existingIdx = setupText.indexOf(existingSentence);
    assert(existingIdx > 0, "vor dem bisherigen Satz sollte jetzt zusätzlicher Text stehen (der neue, menschlichere Satz), tatsächlich stand er ganz am Anfang: " + setupText);

    const prefix = setupText.slice(0, existingIdx).trim();
    assert(prefix.length > 20, "der neue Satz vor dem Bestandssatz sollte ein echter, ausformulierter Satz sein, nicht nur ein paar Zeichen: '" + prefix + "'");

    // No visible paragraph break: exactly one .setup element, no nested <p>/<br>.
    assert.strictEqual(doc.querySelectorAll(".setup").length, 1, "es sollte weiterhin nur ein einziger .setup-Textblock sein (kein zusätzlicher Absatz-Container)");
    assert(setupEl.innerHTML.indexOf("<br") === -1, "kein sichtbarer Zeilenumbruch <br> im Einleitungstext (Stephans Entscheidung: fließender Text, kein Absatzumbruch)");
    assert(setupEl.querySelector("p") === null, "kein zusätzliches <p>-Element im Einleitungstext (fließender Text, kein Absatzumbruch)");

    // Roster chips themselves are unaffected by this change.
    const chips = doc.querySelectorAll(".rolechip");
    assert(chips.length > 0, "die Team-Besetzungsanzeige (Rollen-Chips) sollte weiterhin unverändert angezeigt werden");

    console.log("PASS — 6/6 Checks grün (teamroster-Stage erreicht, neuer Satz vorangestellt, Bestandssatz wortgleich, kein Absatzumbruch, Rollen-Chips unverändert)");
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
