/**
 * tests/FEATURE-010.test.js — jsdom tests for the Team-mode "Estimation"
 * basis (originally "Fast Start").
 *
 * ⚠️ SUPERSEDED BY FEATURE-016 (25.07.2026, Stephans ausdrückliche Freigabe
 * über den Koordinator, "weitermachen" auf die zwei benannten offenen Punkte):
 * FEATURE-010's original mechanism — a narrative-only estimate box folded
 * into the roster screen, producing a FIXED value the moment the missing
 * role was rolled (2 days base + 18/14 days role-dependent surcharge,
 * 20d/16d total) — has been completely replaced, not just recombined. See
 * Backlog.md FEATURE-016 ("keine Rollen-Kopplung mehr, komplette statt
 * teilweise Ablösung der FEATURE-010-Formel"). The role now has NO influence
 * at all on the Estimation number; the number is instead the team's own real,
 * clicked T-shirt-size choice (XXS=1 … XXL=21 days) on a new, dedicated step
 * right after the roster screen. Full coverage of the NEW mechanism (all 7
 * sizes, role-independence, play-independence, finale label/note) lives in
 * tests/FEATURE-016.test.js — this file is intentionally kept lean and does
 * NOT duplicate that exhaustive coverage. What changed here, and why (per
 * the TDD escape-hatch protocol):
 *   - Test 1 (GAME_VERSION): unchanged in intent, but the hardcoded "1.17.0"
 *     was already stale (many unrelated releases happened since FEATURE-010)
 *     — switched to the same non-brittle notStrictEqual pattern BUG-003
 *     already uses, since it was already touched here anyway.
 *   - Test 2 previously asserted the OLD narrative box ("Before anyone looks
 *     at the ticket") on the roster screen with no extra click required. That
 *     assumption is now false by design — replaced with a structural
 *     regression guard: the old narrative box must be GONE from the roster
 *     screen, and the new dedicated step must exist as the very next screen.
 *   - Tests 3/4 previously asserted TeamState.fastStart === 20 (PO missing)
 *     / === 16 (other role missing) — the exact old formula. That field no
 *     longer exists (renamed TeamState.estimateLabel/S.benchmark, set only
 *     after a real click). Replaced with a data-layer proof that picking a
 *     missing role alone, before any size is clicked, produces NO automatic
 *     estimate (S.benchmark stays 0) — i.e. the role→number coupling
 *     FEATURE-010 introduced is verifiably gone, not just recomputed.
 *   - Test 5 previously played two full runs with the SAME missing role but
 *     different behaviour, expecting the identical OLD "16d cycle" value.
 *     Replaced with a stronger version of the same underlying concern (does
 *     the Estimation number stay independent of things it shouldn't depend
 *     on?): two full runs with the SAME chosen T-shirt size but DIFFERENT
 *     missing roles (PO vs. QA) now show the identical Estimation value —
 *     proving the role has zero effect, not just a fixed effect per role.
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

// Drives a full run to the finale for a given rolled missing role, picking a
// fixed T-shirt size ("s" = 3 days) right after the roster screen. Returns
// the finale HTML.
async function playRunWithRole(missingRole) {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return missingRole; };
  click(doc, "introCta");
  click(doc, "pickTeamMode");
  click(doc, "teamRndBtn");
  click(doc, "teamStartBtn");

  click(doc, "teamNext"); // roster -> teamestimate (FEATURE-016)
  const opt = doc.querySelector('.tshirtopt[data-key="s"]');
  assert(opt, "T-Shirt-Option 's' sollte existieren");
  opt.dispatchEvent(new window.Event("click", { bubbles: true }));
  click(doc, "teamEstNext"); // -> map

  sortMapHonestly(window, doc);
  click(doc, "nextBtn");
  if (missingRole === "po") { click(doc, "tSolid"); await wait(700); click(doc, "nextBtn"); }
  solveGherkinPrecisely(window, doc);
  click(doc, "nextBtn");
  click(doc, "tSolid"); await wait(700);
  click(doc, "nextBtn");
  click(doc, "tSolid"); await wait(700);
  click(doc, "nextBtn");
  answerSelectCorrectly(window, doc, "pick");
  click(doc, "nextBtn");
  answerSelectCorrectly(window, doc, "catch");
  click(doc, "nextBtn");
  click(doc, "markAll");
  click(doc, "dorContinue");
  click(doc, "nextBtn");

  click(doc, "handoff");
  await wait(2500);
  click(doc, "nextBtn");
  const html = doc.getElementById("stageHost").innerHTML;
  dom.window.close();
  return html;
}

async function main() {
  const failures = [];

  // Test 1: GAME_VERSION wurde seit FEATURE-010 mehrfach erhöht — nur noch
  // gegen den damaligen Ausgangswert geprüft (non-brittle, wie BUG-003).
  try {
    const dom = loadGame();
    assert.notStrictEqual(dom.window.GAME_VERSION, "1.17.0", "GAME_VERSION sollte seit FEATURE-010 (1.17.0) erhöht worden sein");
    dom.window.close();
  } catch (err) { failures.push("GAME_VERSION: " + err.message); }

  // Test 2: Strukturelle Regression — die alte, rein erzählende Schätzbox
  // ("Before anyone looks at the ticket") ist vom Roster-Screen VERSCHWUNDEN,
  // und direkt danach folgt der neue, eigene FEATURE-016-Schritt mit den
  // sieben T-Shirt-Buttons statt direkt der Karte ("map").
  try {
    const dom = loadGame();
    const { window } = dom;
    const doc = window.document;
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");
    const rosterHTML = doc.getElementById("stageHost").innerHTML;
    assert(rosterHTML.indexOf("Before anyone looks at the ticket") === -1, "Die alte Erzähltext-Schätzbox sollte NICHT mehr auf dem Roster-Screen erscheinen");
    assert(rosterHTML.indexOf("starting guess, not a plan") === -1, "Der alte Hinweistext sollte NICHT mehr auf dem Roster-Screen erscheinen");
    click(doc, "teamNext");
    const nextHTML = doc.getElementById("stageHost").innerHTML;
    assert(doc.querySelectorAll(".tshirtopt").length === 7, "Nach dem Roster-Screen sollte direkt der neue Schritt mit 7 T-Shirt-Buttons folgen");
    assert(nextHTML.indexOf("Before anyone looks at the ticket") === -1, "Der neue Schritt zeigt einen anderen Text als die alte Box");
    dom.window.close();
  } catch (err) { failures.push("Alte Erzählbox entfernt, neuer Schritt folgt: " + err.message); }

  // Test 3: Die gewürfelte fehlende Rolle allein — VOR jedem Größen-Klick —
  // erzeugt keinerlei automatischen Schätzwert mehr (S.benchmark bleibt 0).
  // Das ist der Daten-Beleg, dass die Rollen-Kopplung aus FEATURE-010
  // tatsächlich entfernt wurde, nicht nur umbenannt.
  try {
    for (const role of ["po", "qa"]) {
      const dom = loadGame();
      const { window } = dom;
      const doc = window.document;
      window.pickMissingRoleId = function () { return role; };
      click(doc, "introCta");
      click(doc, "pickTeamMode");
      click(doc, "teamRndBtn");
      click(doc, "teamStartBtn");
      assert.strictEqual(window.S.benchmark, 0, "S.benchmark sollte VOR jeder Größenwahl 0 sein, unabhängig von der Rolle (" + role + ")");
      assert.strictEqual(window.TeamState.fastStart, undefined, "TeamState.fastStart sollte es nicht mehr geben (FEATURE-016 ersetzt es durch TeamState.estimateLabel/S.benchmark)");
      dom.window.close();
    }
  } catch (err) { failures.push("Keine automatische Rollen-Kopplung mehr: " + err.message); }

  // Test 4: Zwei komplette Läufe mit DERSELBEN gewählten Größe ("s" = 3 Tage),
  // aber unterschiedlicher gewürfelter fehlender Rolle (PO vs. QA), zeigen im
  // Finale exakt dieselbe Estimation-Zahl — die Rolle hat jetzt GAR keinen
  // Einfluss mehr (stärker als FEATURE-010s ursprüngliche Erwartung, die noch
  // von einem festen, rollenabhängigen Unterschied ausging).
  try {
    const poHTML = await playRunWithRole("po");
    const qaHTML = await playRunWithRole("qa");
    assert(poHTML.indexOf("S → 3 days") !== -1, "PO-fehlt-Lauf sollte 'S → 3 days' zeigen");
    assert(qaHTML.indexOf("S → 3 days") !== -1, "QA-fehlt-Lauf sollte TROTZDEM 'S → 3 days' zeigen — die Rolle darf keinen Unterschied machen");
  } catch (err) { failures.push("Estimation unabhängig von der Rolle: " + err.message); }

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 4/4 Checks grün (Version, alte Erzählbox entfernt + neuer Schritt folgt, keine automatische Rollen-Kopplung mehr, Estimation unabhängig von der Rolle)");
  process.exit(0);
}

main();
