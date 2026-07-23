/**
 * tests/FEATURE-009-scroll-position.test.js — jsdom test for Stephan's Round 8
 * feedback (23.07.2026):
 *
 *   "Wenn ich den Button Starte Development anklicke ... springt der
 *   Bildschirm direkt ganz ans Ende und ich muss dann wieder nach oben
 *   scrollen ... Ein ähnliches Szenario habe ich auch beim Agent Modus, wo
 *   ich im ersten Schritt an den Agent übergebe und der dann mehrere
 *   Schritte ausführt. Es wäre gut, wenn der Screen oben stehen bleibt."
 *
 * Two long, self-playing reveal sequences (agent mode's opening "hand off to
 * the agent" hook, and team mode's "Start Development" handover) used to
 * force-scroll to the final debrief block once everything had finished
 * appearing — jumping the player past content that had just appeared above,
 * which they hadn't read yet. Both now leave scroll position alone so the
 * player can follow the sequence top-to-bottom and scroll down themselves.
 * Every OTHER (short, single-action) step must keep auto-scrolling to its
 * debrief as before — this is a targeted fix, not a global behaviour change.
 *
 * Ausführen: node tests/FEATURE-009-scroll-position.test.js
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
      window.__intervalFns = [];
      window.setInterval = function (fn) { window.__intervalFns.push(fn); return window.__intervalFns.length; };
      window.clearInterval = function () {};
    },
  });
  const { window } = dom;
  // Spy instead of no-op: record every scrollIntoView call so tests can
  // assert on whether — and on what — it was invoked.
  window.__scrollCalls = [];
  window.Element.prototype.scrollIntoView = function () { window.__scrollCalls.push(this.className || this.id || this.tagName); };
  return dom;
}

function click(doc, id) {
  const el = doc.getElementById(id);
  assert(el, `Element #${id} sollte im DOM existieren`);
  el.dispatchEvent(new doc.defaultView.Event("click", { bubbles: true }));
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function testAgentHookDoesNotJumpToEnd() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickAgentMode");
    doc.querySelector(".scenopt").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "startBtn"); // -> renderReveal, the very first stage
    assert(doc.getElementById("handoff"), "Der 'an den Agent übergeben'-Button sollte jetzt da sein");

    window.__scrollCalls.length = 0; // ignore the harmless scenario-picker scroll-into-view from before
    click(doc, "handoff");
    // Agent build reveal (1500ms) -> detonate's penalty tickets (several,
    // 650ms apart) -> debrief (500ms after the last one). Wait past all of it.
    await wait(1500 + 650 * 6 + 500 + 200);

    assert(doc.querySelector(".debrief"), "Der Debrief sollte inzwischen erschienen sein");
    assert.strictEqual(window.__scrollCalls.length, 0,
      "Die ganze Übergabe-an-den-Agenten-Sequenz darf den Bildschirm nicht automatisch ans Ende springen lassen (gefunden: " + JSON.stringify(window.__scrollCalls) + ")");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testAgentHookDoesNotJumpToEnd: " + err.message;
  }
}

async function testTeamHandoverDoesNotJumpToEnd() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamNext"); // roster -> map
    // Finish the map instantly (timeout) to reach teamimpl the fast way.
    const tick = window.__intervalFns[window.__intervalFns.length - 1];
    for (let i = 0; i < 70; i++) tick();
    click(doc, "nextBtn"); // -> gherkin
    click(doc, "vagueChoice"); await wait(700); click(doc, "nextBtn"); // -> question fork
    click(doc, "tTempt"); await wait(700); click(doc, "nextBtn"); // -> premortem
    window.STAGES[window.S.i].options.forEach(function (o, idx) {
      if (!o.bad) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    click(doc, "check"); click(doc, "nextBtn"); // -> overreach
    window.STAGES[window.S.i].options.forEach(function (o, idx) {
      if (o.bad) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    click(doc, "check"); click(doc, "nextBtn"); // -> DoR
    click(doc, "dorContinue"); click(doc, "nextBtn"); // -> teamimpl

    assert.strictEqual(window.STAGES[window.S.i].type, "teamimpl", "Sollte jetzt auf 'The team starts building' stehen");
    window.__scrollCalls.length = 0; // ignore whatever scrolling happened getting here
    click(doc, "handoff"); // "Start Development"
    await wait(1400 + 900 + 200); // the chat-bubble build sequence + its own debrief delay

    assert(doc.querySelector(".debrief"), "Der Debrief sollte inzwischen erschienen sein");
    assert.strictEqual(window.__scrollCalls.length, 0,
      "Die 'Start Development'-Sequenz darf den Bildschirm nicht automatisch ans Ende springen lassen (gefunden: " + JSON.stringify(window.__scrollCalls) + ")");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testTeamHandoverDoesNotJumpToEnd: " + err.message;
  }
}

async function testOrdinaryStepsStillAutoScroll() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamNext"); // roster -> map
    const st = window.STAGES[window.S.i];
    Array.from(doc.querySelectorAll(".item")).forEach((el) => {
      el.dispatchEvent(new window.Event("click", { bubbles: true }));
      const idx = el.dataset.idx;
      const c = st.items[idx].c;
      const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
      doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    // The map finishes honestly and calls completeStep -> should scroll as before.
    assert(window.__scrollCalls.length > 0,
      "Ein gewöhnlicher (kurzer) Schritt sollte weiterhin automatisch zum Debrief scrollen — unverändertes Verhalten");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testOrdinaryStepsStillAutoScroll: " + err.message;
  }
}

async function main() {
  const failures = (await Promise.all([
    testAgentHookDoesNotJumpToEnd(),
    testTeamHandoverDoesNotJumpToEnd(),
    testOrdinaryStepsStillAutoScroll(),
  ])).filter(Boolean);
  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 3/3 Checks grün (Agent-Übergabe springt nicht mehr ans Ende, Team-'Start Development' springt nicht mehr ans Ende, gewöhnliche Schritte scrollen weiterhin wie gewohnt zum Debrief)");
  process.exit(0);
}

main();
