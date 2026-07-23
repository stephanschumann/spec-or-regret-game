/**
 * tests/example.test.js — jsdom-Startpunkt für "Spec or Regret" (public/index.html).
 *
 * Lädt die komplette Single-File-App in jsdom, führt sie aus und bedient sie über
 * echte Klick-/Event-Handler statt Funktionen isoliert aufzurufen. Kein externes
 * Test-Framework nötig (kein package.json-Zwang) — `assert` reicht, Skript beendet
 * sich mit Exit-Code 0 (grün) oder 1 (rot).
 *
 * Ausführen: node tests/example.test.js
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
    pretendToBeVisual: true, // liefert requestAnimationFrame (Konfetti-Loop braucht es)
    url: "http://localhost/",
    // beforeParse läuft VOR dem einzigen <script>-Block der App — wichtig, weil
    // dessen letzte Zeilen sofort synchron eine Konfetti-Canvas-Schleife anwerfen.
    beforeParse(window) {
      // jsdom kennt matchMedia nicht (wird u.a. für Touch-Erkennung genutzt).
      window.matchMedia = window.matchMedia || function () {
        return { matches: false, addListener() {}, removeListener() {} };
      };
      // jsdom implementiert HTMLCanvasElement.getContext nicht. Ohne diesen Stub
      // wirft der erste synchrone loop()-Aufruf beim Laden (Konfetti-Canvas) eine
      // TypeError, die den GESAMTEN <script>-Block abbricht — alle onclick-Handler
      // nach der Fehlerstelle (u.a. der Start-Button) würden dann nie registriert.
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
  // jsdom kennt scrollIntoView nicht — harmlose Lücke, hier no-op stubben.
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
    // Test 1: GAME_VERSION existiert als globale Variable und ist nicht leer.
    assert.strictEqual(typeof window.GAME_VERSION, "string");
    assert(window.GAME_VERSION.length > 0, "GAME_VERSION darf nicht leer sein");

    // Test 2: SCENARIOS ist ein befülltes Array (aktuell 21 Szenarien).
    assert(Array.isArray(window.SCENARIOS));
    assert(window.SCENARIOS.length > 0, "SCENARIOS darf nicht leer sein");

    // Test 3: buildStages(sc) baut für JEDES Szenario dieselbe Grund-Abfolge
    // (reveal zuerst, finale zuletzt) — das ist die geteilte Funktion, die laut
    // spec-or-regret-analyze bei Änderungen an gemeinsamer Logik am ehesten
    // unbemerkt alle Szenarien gleichzeitig betrifft.
    const sc = window.SCENARIOS[0];
    const stages = window.buildStages(sc);
    assert.strictEqual(stages[0].type, "reveal", "erste Stage sollte 'reveal' sein");
    assert.strictEqual(stages[stages.length - 1].type, "finale", "letzte Stage sollte 'finale' sein");

    // Test 4: echter Klickpfad — Intro-Overlay schließt sich über den echten
    // Button (#introCta), nicht durch direkten Aufruf von startGame().
    const ovIntro = doc.getElementById("ovIntro");
    assert(ovIntro.classList.contains("show"), "Intro-Overlay sollte beim Laden sichtbar sein");
    click(doc, "introCta");
    assert(!ovIntro.classList.contains("show"), "Intro-Overlay sollte nach Klick auf introCta schließen");

    // Test 5: nach dem echten Klickpfad hat renderPicker() echte Szenario-Auswahl
    // in #stageHost gerendert (kein leerer Container).
    const stageHost = doc.getElementById("stageHost");
    assert(stageHost.innerHTML.length > 0, "stageHost sollte nach dem Klick befüllt sein");

    console.log("PASS — 5/5 Checks grün (GAME_VERSION, SCENARIOS, buildStages, Intro-Klick, Picker-Render)");
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
