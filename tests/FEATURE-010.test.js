/**
 * tests/FEATURE-010.test.js — jsdom tests for the new "Fast Start" basis in
 * Team mode (FEATURE-010) in "Spec or Regret" (public/index.html).
 *
 * Replaces the old fixed `S.benchmark || 12` with: a fixed 2-day base guess
 * plus a surcharge that depends on which role the dice actually rolled as
 * missing this run (18d if Product Owner, 14d otherwise) — 20d or 16d total.
 * The value is fixed the moment the missing role is rolled (in startTeamMode,
 * before the team looks at the ticket) and must NOT change based on anything
 * the player does afterwards in the meeting.
 *
 * These checks stay durably useful for later team-mode tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. The new narrative estimate moment is visible on the very first team-mode
 *      screen (folded into the roster screen, not a separate click step —
 *      see Ticket Analyse & Planung for why a separate stage was rejected:
 *      it would have shifted every existing team-mode stage index and broken
 *      the FEATURE-009 regression suite).
 *   3./4. "Fast Start" is fixed immediately when the role is rolled, before any
 *      play happens, and differs correctly by role (20d for PO, 16d otherwise).
 *   5. Two full runs with the SAME rolled role but completely different player
 *      behaviour (one clean, one everything-bad) show the IDENTICAL "Fast
 *      Start" number — proving it is not recalculated from the player's run.
 *
 * Ausführen: node tests/FEATURE-010.test.js
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

// Drives a full "dev missing" run (no bizvalue fork branch) to the finale,
// either playing it clean/honest or letting everything go wrong, and returns
// the rendered finale HTML.
async function playDevMissingRun(clean) {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return "dev"; };
  click(doc, "introCta");
  click(doc, "pickTeamMode");

  if (clean) {
    click(doc, "teamNext"); // -> map
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
    click(doc, "markAll");
    click(doc, "dorContinue");
    click(doc, "nextBtn"); // -> teamimpl
  } else {
    click(doc, "teamNext"); // -> map
    // sort nothing, let the timer run out
    const tick0 = window.__intervalFns[window.__intervalFns.length - 1];
    for (let i = 0; i < 69; i++) tick0();
    click(doc, "nextBtn"); // -> gherkin
    click(doc, "vagueChoice"); // dishonest — keep it vague
    await wait(600);
    click(doc, "nextBtn"); // -> question fork
    click(doc, "tTempt"); // dishonest — defer
    await wait(700);
    click(doc, "nextBtn"); // -> premortem
    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR
    click(doc, "markAll"); // dishonest
    click(doc, "dorContinue");
    click(doc, "nextBtn"); // -> teamimpl
  }

  click(doc, "handoff");
  await wait(2500);
  click(doc, "nextBtn"); // -> finale
  const html = doc.getElementById("stageHost").innerHTML;
  dom.window.close();
  return html;
}

async function main() {
  const failures = [];

  // Test 1: GAME_VERSION wurde für dieses Feature erhöht.
  try {
    const dom = loadGame();
    assert.strictEqual(dom.window.GAME_VERSION, "1.17.0", "GAME_VERSION sollte auf 1.17.0 stehen");
    dom.window.close();
  } catch (err) { failures.push("GAME_VERSION: " + err.message); }

  // Test 2: Der neue Schätz-Text ist auf dem allerersten Team-Modus-Screen
  // sichtbar (auf demselben Screen wie die Besetzungsliste, kein Extra-Klick).
  try {
    const dom = loadGame();
    const { window } = dom;
    const doc = window.document;
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    const html = doc.getElementById("stageHost").innerHTML;
    assert(html.indexOf("Before anyone looks at the ticket") !== -1, "Der Schätz-Kicker sollte auf dem Roster-Screen erscheinen");
    assert(html.indexOf("starting guess, not a plan") !== -1, "Der deutlich abgesetzte Hinweis sollte auf dem Roster-Screen erscheinen");
    assert(doc.getElementById("teamNext"), "Der bestehende 'Start the meeting'-Button sollte weiterhin da sein (kein Extra-Klick nötig)");
    dom.window.close();
  } catch (err) { failures.push("Schätz-Text sichtbar: " + err.message); }

  // Test 3: Bei gewürfeltem "Product Owner fehlt" steht Fast Start sofort auf
  // 20 (2 Basis + 18 Aufschlag) — schon bevor irgendetwas gespielt wurde.
  try {
    const dom = loadGame();
    const { window } = dom;
    const doc = window.document;
    window.pickMissingRoleId = function () { return "po"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    assert.strictEqual(window.TeamState.fastStart, 20, "PO fehlt -> 20 Tage (2 Basis + 18 Aufschlag)");
    assert.strictEqual(window.S.benchmark, 20, "S.benchmark sollte direkt beim Start gesetzt sein, nicht erst im Finale");
    dom.window.close();
  } catch (err) { failures.push("Fast Start bei PO fehlt: " + err.message); }

  // Test 4: Bei einer der anderen drei Rollen steht Fast Start sofort auf 16
  // (2 Basis + 14 Aufschlag) — kein Business-Value-Aufschlag möglich.
  try {
    const dom = loadGame();
    const { window } = dom;
    const doc = window.document;
    window.pickMissingRoleId = function () { return "qa"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    assert.strictEqual(window.TeamState.fastStart, 16, "QA fehlt -> 16 Tage (2 Basis + 14 Aufschlag)");
    assert.strictEqual(window.S.benchmark, 16);
    dom.window.close();
  } catch (err) { failures.push("Fast Start bei anderer Rolle: " + err.message); }

  // Test 5: Zwei komplette Durchläufe mit DERSELBEN gewürfelten Rolle (dev),
  // aber komplett unterschiedlichem Spielverhalten (einmal sauber, einmal
  // durchgängig unehrlich/verspätet), zeigen im Finale exakt denselben
  // "Fast Start"-Wert (16d) — der Wert reagiert NICHT auf das Spielverhalten.
  try {
    const cleanHTML = await playDevMissingRun(true);
    const badHTML = await playDevMissingRun(false);
    assert(cleanHTML.indexOf("0 analysis + 16d cycle") !== -1, "Sauberer Lauf (Dev fehlt) sollte 'Fast Start' mit 16d zeigen");
    assert(badHTML.indexOf("0 analysis + 16d cycle") !== -1, "Durchgängig schlechter Lauf (Dev fehlt) sollte TROTZDEM 'Fast Start' mit 16d zeigen — unverändert durch das Spielverhalten");
  } catch (err) { failures.push("Fast Start unabhängig vom Spielverlauf: " + err.message); }

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 5/5 Checks grün (Version, Schätz-Text sichtbar ohne Extra-Klick, Fast Start 20d bei PO, 16d bei anderer Rolle, unverändert durch Spielverhalten)");
  process.exit(0);
}

main();
