/**
 * tests/FEATURE-014.test.js — jsdom tests for the tempting pre-mortem skip
 * fork in Team mode, with a delayed consequence (FEATURE-014) in
 * "Spec or Regret" (public/index.html).
 *
 * A new "teamfork" stage (kind: "premortemSkip") is inserted immediately
 * before the existing mandatory pre-mortem pick-task ("Team · 7" after this
 * ticket's renumbering, kind: "premortem"). Choosing the tempt option
 * ("we're agile, build and learn") skips that pick-task entirely and shows
 * no immediate consequence; choosing solid plays the pick-task unchanged.
 * The skipped pre-mortem's real cost surfaces later, at "The team starts
 * building" (renderTeamImpl): a new, lumped rework thread naming the actual
 * missed risks (the scenario's `bad:false` pre-mortem entries) and adding
 * exactly +3 days to the running rework/cycle counter.
 *
 * Critical constraint (see Backlog.md FEATURE-014 "Wichtiger Befund" and
 * tests/FEATURE-011.test.js): the new fork must NOT carry its own
 * analysisDays — only the pre-mortem pick-task keeps its existing credit,
 * and only when actually played. Otherwise the best-possible Team-mode run
 * (currently hard-coded at 7 analysis days in FEATURE-011) would silently
 * become 8.
 *
 * These checks stay durably useful for later Team-mode tickets too:
 *   1. GAME_VERSION increased since the pre-change baseline (not an exact
 *      string — see spec-or-regret-impl guidance on GAME_VERSION fragility).
 *   2. Solid path: the pre-mortem pick-task appears unchanged (same options,
 *      same "Confirm" flow), and completing it credits analysis time as
 *      before — no rework is added by taking this path.
 *   3. Tempt path: the pre-mortem pick-task never renders (the very next
 *      stage after resolving the fork is "overreach", not "premortem"), and
 *      no rework/cycle change happens at the moment of skipping.
 *   4. Tempt path, continued to build-start: a new chat thread appears
 *      naming the scenario's real risks (the four `bad:false` pre-mortem
 *      items) by their exact text, and the rework counter increases by
 *      exactly 3 (and by nothing else attributable to this feature).
 *   5. Solid path, continued to build-start: the new message does NOT
 *      appear, and the rework counter is unaffected by this feature.
 *
 * Ausführen: node tests/FEATURE-014.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const PRE_CHANGE_GAME_VERSION = "1.23.0";

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
function solveGherkinPrecisely(window, doc) {
  click(doc, "precise");
  window.STAGES[window.S.i].scenarios.forEach((sc, si) => {
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

// Drives a "dev missing" run (no bizvalue fork, fewest branches) up to and
// including the new premortemSkip fork, resolving it either solid or tempt.
// Leaves the dom OPEN (caller must close it).
async function playToPremortemForkAndResolve(honest) {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return "dev"; };
  click(doc, "introCta");
  click(doc, "pickTeamMode");
  click(doc, "teamRndBtn");
  click(doc, "teamStartBtn");
  click(doc, "teamNext"); // -> map
  sortMapHonestly(window, doc);
  click(doc, "nextBtn"); // -> gherkin
  solveGherkinPrecisely(window, doc);
  click(doc, "nextBtn"); // -> question fork ("Team · 5")
  click(doc, "tSolid"); await wait(700); click(doc, "nextBtn"); // -> premortemSkip fork ("Team · 6")

  const forkSt = window.STAGES[window.S.i];
  assert.strictEqual(forkSt.type, "teamfork", "Sollte jetzt auf dem neuen Pre-Mortem-Skip-Fork stehen");
  assert.strictEqual(forkSt.kind, "premortemSkip", "Der neue Fork sollte kind 'premortemSkip' tragen");
  assert.strictEqual(forkSt.analysisDays, undefined, "Der neue Fork darf KEINE eigene analysisDays-Gutschrift tragen (sonst bricht der 7-Tage-Bestwert aus FEATURE-011)");

  const analysisBeforeFork = window.S.analysis;
  const reworkBeforeFork = window.S.rework.length;
  click(doc, honest ? "tSolid" : "tTempt");
  await wait(700);

  return { dom, window, doc, analysisBeforeFork, reworkBeforeFork };
}

async function testSolidPathUnchanged() {
  let dom;
  try {
    const r = await playToPremortemForkAndResolve(true);
    dom = r.dom;
    const { window, doc, analysisBeforeFork, reworkBeforeFork } = r;

    assert.strictEqual(window.TeamState.premortemSkipped, false, "Solide Wahl darf premortemSkipped nicht setzen");
    assert.strictEqual(window.S.rework.length, reworkBeforeFork, "Die Fork-Entscheidung selbst darf kein Rework erzeugen");
    click(doc, "nextBtn"); // -> premortem pick-task

    const pmSt = window.STAGES[window.S.i];
    assert.strictEqual(pmSt.type, "teamselect", "Nach der soliden Wahl sollte die Risikoauswahl-Aufgabe unverändert erscheinen");
    assert.strictEqual(pmSt.kind, "premortem", "Es sollte wirklich die Pre-Mortem-Aufgabe sein, nicht übersprungen");
    assert(doc.querySelector(".opt"), "Die Risikoauswahl-Optionen sollten im DOM gerendert sein");
    assert.strictEqual(pmSt.analysisDays, 1, "Die Risikoauswahl-Aufgabe behält ihre bestehende 1-Tage-Gutschrift");

    const analysisBeforePick = window.S.analysis;
    answerSelectCorrectly(window, doc, "pick");
    assert(doc.querySelector(".debrief"), "Korrekt gelöste Risikoauswahl sollte den Debrief zeigen");
    assert.strictEqual(window.S.analysis, analysisBeforePick + 1, "Die normal durchgeführte Risikoauswahl sollte weiterhin 1 Analyse-Tag gutschreiben");
    assert.strictEqual(window.S.analysis, analysisBeforeFork + 1, "Insgesamt sollte nur die Risikoauswahl selbst Gutschrift geben, der Fork nichts extra");

    return null;
  } catch (err) { return "Solider Pfad unverändert: " + err.message; }
  finally { if (dom) dom.window.close(); }
}

async function testTemptPathSkipsPickTaskNoImmediateConsequence() {
  let dom;
  try {
    const r = await playToPremortemForkAndResolve(false);
    dom = r.dom;
    const { window, doc, analysisBeforeFork, reworkBeforeFork } = r;

    assert.strictEqual(window.TeamState.premortemSkipped, true, "Verlockende Wahl sollte premortemSkipped setzen");
    // No immediate consequence: the fork's own debrief must not mention rework,
    // and the rework/analysis counters must be untouched right here.
    assert.strictEqual(window.S.rework.length, reworkBeforeFork, "Im Moment des Überspringens darf noch kein Rework sichtbar werden");
    assert.strictEqual(window.S.analysis, analysisBeforeFork, "Der Fork selbst darf keine Analysezeit gutschreiben (weder positiv noch negativ)");
    const debriefHTML = doc.querySelector(".debrief").innerHTML;
    assert(debriefHTML.indexOf("+3") === -1, "Der Fork-Debrief selbst darf die spätere 3-Tage-Konsequenz noch nicht verraten");

    click(doc, "nextBtn"); // should skip the pick-task entirely and land on overreach

    const nextSt = window.STAGES[window.S.i];
    assert.strictEqual(nextSt.type, "teamselect", "Nächster sichtbarer Schritt sollte eine teamselect-Stage sein");
    assert.strictEqual(nextSt.kind, "overreach", "Die Risikoauswahl-Aufgabe sollte komplett übersprungen worden sein — direkt weiter zu 'overreach'");
    assert(doc.getElementById("stageHost").innerHTML.indexOf("What could go wrong?") === -1,
      "Der Titel der Risikoauswahl-Aufgabe darf nirgends im aktuell gerenderten HTML auftauchen (kein Flackern der Pick-UI)");
    assert.strictEqual(window.S.analysis, analysisBeforeFork, "Übersprungene Risikoauswahl darf keine Analysezeit gutschreiben");

    return null;
  } catch (err) { return "Verlockender Pfad überspringt Pick-Task ohne sofortige Konsequenz: " + err.message; }
  finally { if (dom) dom.window.close(); }
}

// Drives the tempt path all the way to build-start ("handoff") and returns
// the rendered chat HTML plus the actual missed-risk texts for this run's
// scenario, so the assertions can check the message names them by name.
async function playTemptPathToHandoff() {
  const r = await playToPremortemForkAndResolve(false);
  const { window, doc } = r;
  click(doc, "nextBtn"); // -> overreach (pick-task skipped)
  answerSelectCorrectly(window, doc, "catch");
  click(doc, "nextBtn"); // -> DoR
  click(doc, "markAll");
  click(doc, "dorContinue");
  click(doc, "nextBtn"); // -> teamimpl

  const reworkBefore = window.S.rework.length;
  const cycleBefore = window.S.cycle;
  click(doc, "handoff");
  await wait(2500);

  const html = doc.getElementById("stageHost").innerHTML;
  const newRework = window.S.rework.slice(reworkBefore);
  const realRisks = window.SC.premortem.filter((o) => !o.bad).map((o) => o.t);
  return { dom: r.dom, window, doc, html, newRework, cycleBefore, realRisks };
}

async function testTemptPathConsequenceAtBuildStart() {
  let dom;
  try {
    const r = await playTemptPathToHandoff();
    dom = r.dom;
    const { window, html, newRework, cycleBefore, realRisks } = r;

    const ourThread = newRework.find((t) => t.item.indexOf("pre-mortem") !== -1);
    assert(ourThread, "Es sollte einen neuen Rework-Eintrag geben, der das übersprungene Pre-Mortem benennt, gefunden: " + JSON.stringify(newRework));
    assert.strictEqual(ourThread.days, 3, "Die neue Konsequenz sollte exakt 3 Tage Rework hinzufügen");

    // Exactly ONE lumped item for this feature, not one per risk.
    const allOurThreads = newRework.filter((t) => t.item.indexOf("pre-mortem") !== -1);
    assert.strictEqual(allOurThreads.length, 1, "Es sollte genau EIN gebündelter Eintrag sein, nicht einer pro Risiko");

    // +4 is the fixed "build itself" baseline (bumped via completeStep's
    // isBoss/buildDays branch, independent of this feature) on top of the sum
    // of every new rework thread's days (our +3 plus whatever else this run's
    // branch always adds, e.g. the missing-role thread).
    assert.strictEqual(window.S.cycle, cycleBefore + 4 + newRework.reduce((s, t) => s + t.days, 0),
      "Der laufende Cycle-Zähler sollte um den Bau-Grundpreis plus die Summe aller neuen Rework-Tage gestiegen sein");

    // The real risks (bad:false entries) must be named by their exact text.
    assert.strictEqual(realRisks.length, 4, "Diese Testreihe geht von 4 echten Risiken pro Szenario aus (verifiziert gegen die Szenariendaten)");
    realRisks.forEach((riskText) => {
      assert(html.indexOf(riskText) !== -1, "Die neue Nachricht sollte den echten Risikotext namentlich nennen: " + riskText);
      assert(ourThread.item.indexOf(riskText) !== -1, "Der Rework-Listeneintrag sollte den echten Risikotext namentlich nennen: " + riskText);
    });

    return null;
  } catch (err) { return "Konsequenz beim Baubeginn (verlockender Pfad): " + err.message; }
  finally { if (dom) dom.window.close(); }
}

async function testSolidPathNoConsequenceAtBuildStart() {
  let dom;
  try {
    const r = await playToPremortemForkAndResolve(true);
    dom = r.dom;
    const { window, doc } = r;
    click(doc, "nextBtn"); // -> premortem pick-task
    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR
    click(doc, "markAll");
    click(doc, "dorContinue");
    click(doc, "nextBtn"); // -> teamimpl

    const reworkBefore = window.S.rework.length;
    const cycleBefore = window.S.cycle;
    click(doc, "handoff");
    await wait(2500);

    const html = doc.getElementById("stageHost").innerHTML;
    const newRework = window.S.rework.slice(reworkBefore);
    const ourThread = newRework.find((t) => t.item.indexOf("pre-mortem") !== -1);
    assert.strictEqual(ourThread, undefined, "Bei normal durchgeführtem Pre-Mortem darf kein Überspring-Rework-Eintrag entstehen");
    assert(html.indexOf("skipping the pre-mortem") === -1, "Die neue Konsequenz-Nachricht darf bei normal durchgeführtem Pre-Mortem gar nicht erst erscheinen");
    // The dev-missing branch always adds its own role-gap thread (2d) plus the
    // 4d build baseline, regardless of this feature — the point here is that
    // NOTHING attributable to this feature (no +3d, no "pre-mortem" thread)
    // is mixed in, not that the cycle counter stays literally at its prior value.
    assert.strictEqual(window.S.cycle, cycleBefore + 4 + newRework.reduce((s, t) => s + t.days, 0),
      "Der Cycle-Zuwachs sollte vollständig durch den Bau-Grundpreis plus die (von diesem Feature unabhängigen) anderen Rework-Einträge erklärt sein");

    return null;
  } catch (err) { return "Solider Pfad zeigt beim Baubeginn keine Konsequenz: " + err.message; }
  finally { if (dom) dom.window.close(); }
}

async function testGameVersionIncreased() {
  const dom = loadGame();
  try {
    assert.notStrictEqual(dom.window.GAME_VERSION, PRE_CHANGE_GAME_VERSION,
      "GAME_VERSION sollte gegenüber dem Vor-Ticket-Stand (" + PRE_CHANGE_GAME_VERSION + ") erhöht worden sein");
    return null;
  } catch (err) { return "GAME_VERSION erhöht: " + err.message; }
  finally { dom.window.close(); }
}

async function main() {
  const failures = (await Promise.all([
    testGameVersionIncreased(),
    testSolidPathUnchanged(),
    testTemptPathSkipsPickTaskNoImmediateConsequence(),
    testTemptPathConsequenceAtBuildStart(),
    testSolidPathNoConsequenceAtBuildStart(),
  ])).filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 5/5 Checks grün (GAME_VERSION erhöht, solider Pfad unverändert, verlockender Pfad überspringt ohne sofortige Konsequenz, Konsequenz beim Baubeginn mit +3d und genannten Risiken, solider Pfad ohne Konsequenz beim Baubeginn)");
  process.exit(0);
}

main();
