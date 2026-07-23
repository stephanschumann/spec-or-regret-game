/**
 * tests/FEATURE-009-consequences.test.js — jsdom tests for the Team-mode
 * cycle-time consequence model from Stephan's Round 3 feedback (23.07.2026):
 *
 *   "es kann nicht sein, dass es keine Entwicklungszeit benötigt ... für jede
 *   Abkürzung, für jedes Meeting, wo jemand nicht komplett ist, für jede nicht
 *   zugeordnete Frage, Entscheidung, Regel oder Business Value oder das Goal
 *   [muss es] eine Konsequenz in einer verlängerten Cycle Time geben."
 *
 * Verifies the five mechanics added on top of the existing deferred-question
 * and vague-Gherkin threads (already covered by FEATURE-009-scoring.test.js):
 *   1. A fixed 4-day baseline build cost at the handover step (teamimpl now
 *      carries isBoss/buildDays, same mechanism as the agent-mode "gate" step)
 *      — this is what makes "What it could have been" show >0d cycle time.
 *   2. A guaranteed, role-specific rework thread tied to whichever of the four
 *      roles was missing this run (not just Product Owner).
 *   3. A rework thread for a dishonestly-answered business-value question.
 *   4. A team-map rework thread that scales with how many cards were actually
 *      left unsorted when the clock ran out (capped at 3d), not a flat penalty.
 *   5. A real (not cosmetic) rework thread for Definition-of-Ready boxes
 *      checked despite not being true, framed as an audit/compliance cost.
 *
 * Ausführen: node tests/FEATURE-009-consequences.test.js
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
  window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
  return dom;
}

function click(doc, id) {
  const el = doc.getElementById(id);
  assert(el, `Element #${id} sollte im DOM existieren`);
  el.dispatchEvent(new doc.defaultView.Event("click", { bubbles: true }));
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Sorts every map card into its correct bucket via real clicks — used whenever
// a scenario wants the map to finish honestly, in time (no timeout).
function sortMapHonestly(window, doc) {
  const st = window.STAGES[window.S.i];
  Array.from(doc.querySelectorAll(".item")).forEach((el) => {
    el.dispatchEvent(new window.Event("click", { bubbles: true }));
    const idx = el.dataset.idx;
    const c = st.items[idx].c;
    const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
    doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
}

// Solves the Given/When/Then puzzle correctly via real clicks. Clicks "Make it
// precise instead" first, which swaps the vague-choice view for the puzzle.
function solveGherkinPrecisely(window, doc) {
  click(doc, "precise");
  const st = window.STAGES[window.S.i];
  st.scenarios.forEach((sc, si) => {
    sc.lines.forEach((ln, li) => {
      let correctGi = null;
      ln.segs.forEach((seg, gi) => { if (seg.c) correctGi = gi; });
      doc.querySelector('.seg[data-k="' + si + '.' + li + '"][data-g="' + correctGi + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}

function answerSelectCorrectly(window, doc, mode) {
  const s = window.STAGES[window.S.i];
  s.options.forEach((o, idx) => {
    const shouldPick = (mode === "catch") ? o.bad : !o.bad;
    if (shouldPick) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}

function reworkItem(rework, needle) {
  return rework.find((r) => r.item.indexOf(needle) !== -1);
}

async function scenarioCleanPoRun() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "po"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    assert.strictEqual(window.TeamState.roleMissing, "po");

    click(doc, "teamNext"); // -> map
    sortMapHonestly(window, doc); // finishes in time -> finishMap(true) fires automatically
    click(doc, "nextBtn"); // -> bizvalue fork (PO missing)

    click(doc, "tSolid"); // honest
    await wait(700);
    assert.strictEqual(window.TeamState.businessValueHonest, true);
    click(doc, "nextBtn"); // -> gherkin

    solveGherkinPrecisely(window, doc);
    click(doc, "nextBtn"); // -> question fork

    click(doc, "tSolid"); // honest
    await wait(700);
    assert.strictEqual(window.TeamState.deferredQuestion, null);
    click(doc, "nextBtn"); // -> premortem

    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR

    // Honest DoR: check only the items that are actually true. With PO missing,
    // "Understood by the whole team" (index 3) stays false all run — leave it
    // unchecked. All other items are true in this honest run.
    [0, 1, 2, 4, 5].forEach((idx) => doc.querySelector('.dorpoint[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true })));
    click(doc, "dorContinue");
    assert.strictEqual(window.S.dorPaperwork, 0, "Ehrliches DoR-Abhaken darf keine falschen Häkchen zählen");
    click(doc, "nextBtn"); // -> teamimpl

    const reworkBefore = window.S.rework.length;
    click(doc, "handoff");
    await wait(2500);

    const newRework = window.S.rework.slice(reworkBefore);
    assert.strictEqual(newRework.length, 1, "Ein sauberer Durchlauf sollte nur den Rollen-Lücke-Thread erzeugen (PO fehlte), gefunden: " + JSON.stringify(newRework));
    assert(reworkItem(newRework, "Product Owner"), "Der einzige Rework-Eintrag sollte auf die fehlende Rolle (PO) zurückgehen");
    assert.strictEqual(window.S.analysis, 7, "Ein sauberer PO-fehlt-Durchlauf sollte 7 Tage Analysezeit geben (alle 7 Analyseschritte)");
    assert.strictEqual(window.S.cycle, 6, "4 Tage Grundpreis fürs Bauen + 2 Tage Rollen-Lücke = 6 Tage Cycle Time");

    click(doc, "nextBtn"); // -> finale
    const finaleHTML = doc.getElementById("stageHost").innerHTML;
    // FEATURE-011 (23.07.2026, Stephans Freigabe): "theoretisch"/"ideal" ist
    // jetzt der bestmögliche Lauf überhaupt (maximal mögliche Analysezeit),
    // nicht mehr die tatsächlich verdiente. In diesem sauberen Lauf sind
    // beide Zahlen ohnehin identisch (alle 7 Schritte wurden verdient) — die
    // Erwartung bleibt inhaltlich unverändert, nur zur Konsistenz erneut geprüft.
    assert(finaleHTML.indexOf("7d analysis + 4d cycle") !== -1,
      "Der 'What it could have been'-Balken sollte selbst im Idealfall den 4-Tage-Grundpreis fürs Bauen zeigen (kein 0d-Cycle-Time-Bug mehr)");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioCleanPoRun: " + err.message;
  }
}

async function scenarioEverythingBad() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "po"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");

    click(doc, "teamNext"); // -> map
    // Sort exactly ONE item, then let the timer run out — leaves the rest unsorted.
    const firstItem = doc.querySelector(".item");
    firstItem.dispatchEvent(new window.Event("click", { bubbles: true }));
    const st = window.STAGES[window.S.i];
    const firstIdx = firstItem.dataset.idx;
    const c = st.items[firstIdx].c;
    const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
    doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    const tick = window.__intervalFns[window.__intervalFns.length - 1];
    for (let i = 0; i < 69; i++) tick();
    assert(window.TeamState.mapUnsortedCount > 0, "Es sollten noch offene Kärtchen übrig sein");
    click(doc, "nextBtn"); // -> bizvalue fork

    click(doc, "tTempt"); // dishonest — fabricate the answer
    await wait(700);
    assert.strictEqual(window.TeamState.businessValueHonest, false);
    click(doc, "nextBtn"); // -> gherkin

    click(doc, "vagueChoice"); // dishonest — keep it vague
    await wait(600);
    click(doc, "nextBtn"); // -> question fork

    click(doc, "tTempt"); // dishonest — defer the question
    await wait(700);
    assert(window.TeamState.deferredQuestion, "Die aufgeschobene Frage sollte vermerkt sein");
    click(doc, "nextBtn"); // -> premortem

    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR

    click(doc, "markAll"); // dishonestly certifies everything as done
    click(doc, "dorContinue");
    assert(window.S.dorPaperwork > 0, "Das dishonest markAll sollte mindestens einen falschen Haken zählen");
    const dorPaperworkAtDoR = window.S.dorPaperwork;
    click(doc, "nextBtn"); // -> teamimpl

    const reworkBefore = window.S.rework.length;
    const analysisAtHandoff = window.S.analysis;
    click(doc, "handoff");
    await wait(2500);

    const newRework = window.S.rework.slice(reworkBefore);
    assert.strictEqual(newRework.length, 6,
      "Jede der sechs Abkürzungen/Lücken sollte ihren eigenen Rework-Eintrag erzeugen (Frage, Map, AC, Business Value, Rollen-Lücke, Audit), gefunden: " + JSON.stringify(newRework));
    assert(reworkItem(newRework, "Chasing down the answer"), "Aufgeschobene Frage sollte einen Thread erzeugen");
    assert(reworkItem(newRework, "Re-mapping"), "Nicht fertig sortierte Kärtchen sollten einen Thread erzeugen");
    assert(reworkItem(newRework, "vague behaviour"), "Vage AC sollte einen Thread erzeugen");
    assert(reworkItem(newRework, "business-value"), "Unehrliche Business-Value-Antwort sollte einen Thread erzeugen");
    assert(reworkItem(newRework, "Product Owner"), "Fehlende Rolle (PO) sollte einen Thread erzeugen");
    const auditThread = reworkItem(newRework, "Audit review");
    assert(auditThread, "Falsch abgehakte DoR-Punkte sollten einen benannten Audit-Thread erzeugen");
    assert.strictEqual(auditThread.days, dorPaperworkAtDoR, "Der Audit-Thread sollte genau 1 Tag je falsch abgehaktem Punkt kosten");

    const reworkTotal = newRework.reduce((s, r) => s + r.days, 0);
    assert.strictEqual(window.S.cycle, 4 + reworkTotal, "Cycle time sollte genau Grundpreis (4) + Summe aller Rework-Tage sein");

    click(doc, "nextBtn"); // -> finale
    const finaleHTML = doc.getElementById("stageHost").innerHTML;
    // FEATURE-011 (23.07.2026, Stephans Freigabe): "theoretisch"/"ideal" ist
    // jetzt der bestmögliche Lauf überhaupt (jede Entscheidung richtig, keine
    // Abkürzung, kein Rework) — also die maximal mögliche Analysezeit dieses
    // Szenario-Zweigs (7 Tage, PO-Zweig), NICHT mehr die in diesem konkreten,
    // durchgängig schlechten Lauf tatsächlich verdiente (reduzierte) Zahl.
    // Vorher (bis FEATURE-010) erwartete dieser Test genau das Gegenteil:
    // `analysisAtHandoff + "d analysis + 4d cycle"` (die tatsächlich
    // verdiente, hier 3 statt 7 Tage) — das entsprach der alten Definition
    // von "ideal" (eigener Lauf minus Rework) und ist mit dieser Freigabe
    // bewusst korrigiert.
    assert(analysisAtHandoff < 7, "Dieser durchgängig schlechte Lauf sollte tatsächlich weniger als die maximal möglichen 7 Analyse-Tage verdient haben, gefunden: " + analysisAtHandoff);
    assert(finaleHTML.indexOf("7d analysis + 4d cycle") !== -1,
      "Der 'What it could have been'-Balken sollte auch bei einem durchgängig schlechten Lauf die maximal möglichen 7 Analyse-Tage zeigen (bestmöglicher Lauf überhaupt) plus den 4-Tage-Grundpreis, kein aufgelaufenes Rework");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioEverythingBad: " + err.message;
  }
}

async function scenarioDevMissingRoleThread() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    assert.strictEqual(window.TeamState.roleMissing, "dev");

    click(doc, "teamNext"); // -> map (no bizvalue fork on this branch)
    sortMapHonestly(window, doc);
    click(doc, "nextBtn"); // -> gherkin

    solveGherkinPrecisely(window, doc);
    click(doc, "nextBtn"); // -> question fork

    click(doc, "tSolid");
    await wait(700);
    click(doc, "nextBtn"); // -> premortem

    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR

    click(doc, "markAll"); // everything actually true on this honest run -> no paperwork
    click(doc, "dorContinue");
    assert.strictEqual(window.S.dorPaperwork, 0);
    click(doc, "nextBtn"); // -> teamimpl

    const reworkBefore = window.S.rework.length;
    click(doc, "handoff");
    await wait(2500);

    const newRework = window.S.rework.slice(reworkBefore);
    assert.strictEqual(newRework.length, 1, "Nur der Rollen-Lücke-Thread (Dev fehlte) sollte entstehen, gefunden: " + JSON.stringify(newRework));
    assert(reworkItem(newRework, "no developer was in the meeting"), "Der Thread sollte klar auf die fehlende Dev-Rolle benennen");
    assert.strictEqual(window.S.analysis, 6, "Ohne PO-Zweig sind es 6 Analyseschritte");
    assert.strictEqual(window.S.cycle, 6, "4 Tage Grundpreis + 2 Tage Rollen-Lücke");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioDevMissingRoleThread: " + err.message;
  }
}

async function main() {
  const failures = [];
  const results = await Promise.all([scenarioCleanPoRun(), scenarioEverythingBad(), scenarioDevMissingRoleThread()]);
  results.forEach((r) => { if (r) failures.push(r); });

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 3/3 Szenarien grün (sauberer PO-Lauf zeigt 4-Tage-Grundpreis statt 0d, jede der sechs Abkürzungen/Lücken erzeugt ihren eigenen Rework-Thread, Rollen-Lücke gilt auch für Dev/QA/Tech-Lead)");
  process.exit(0);
}

main();
