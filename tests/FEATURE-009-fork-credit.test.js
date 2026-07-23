/**
 * tests/FEATURE-009-fork-credit.test.js — jsdom test for Stephan's Round 7
 * feedback (23.07.2026, Screenshot "One more open question"):
 *
 *   "Put it in the 'decide later' pile führte zu einem Tag Analysis, aber
 *   genau das wurde ja nicht getan. Es wurde die Abkürzung gewählt."
 *
 * Bug: both team-mode fork steps (the business-value question when the PO is
 * missing, and the "decide now or later" open question) always granted the
 * free "+1d analysis" credit via completeStep(st, out) — regardless of which
 * choice the player made. Choosing the DISHONEST/shortcut option (guess the
 * number, defer the question) must NOT earn that free credit — only the
 * honest choice (which is the one that actually does the analysis work) may.
 * This is the exact same principle already applied to the team-map timeout
 * and the vague-Gherkin shortcut (see completeStep's noCredit parameter,
 * FEATURE-009 scoring fix 22.07.2026) — Runde 7 closes the one place team
 * mode still didn't apply it.
 *
 * Ausführen: node tests/FEATURE-009-fork-credit.test.js
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

// Sorts every map card into its correct bucket via real clicks (same helper
// pattern as FEATURE-009-consequences.test.js) — finishes the map honestly,
// in time, so finishMap(true) fires automatically and we reach the next stage.
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

async function testForkCredit(missingRoleId, kind, honest) {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return missingRoleId; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");
    click(doc, "teamNext"); // roster -> map
    sortMapHonestly(window, doc); // finishes in time -> next stage auto-reached

    if (kind === "bizvalue") {
      // The map's own debrief is the bizvalue-fork stage's predecessor only
      // when the PO is missing (buildTeamStages only inserts it then) —
      // click through to it.
      click(doc, "nextBtn"); // -> bizvalue fork
    } else {
      // "question" fork comes later: bizvalue fork (if PO missing) -> gherkin -> question.
      click(doc, "nextBtn");
      if (window.STAGES[window.S.i].type === "teamfork" && window.STAGES[window.S.i].kind === "bizvalue") {
        click(doc, "tSolid"); await wait(700); click(doc, "nextBtn"); // skip past bizvalue honestly
      }
      // now at gherkin — take the vague (shortcut) path, fastest way through.
      click(doc, "vagueChoice"); await wait(700); click(doc, "nextBtn"); // -> question fork
    }

    const st = window.STAGES[window.S.i];
    assert.strictEqual(st.type, "teamfork", "Sollte jetzt auf dem Fork-Schritt stehen");
    assert.strictEqual(st.kind, kind, "Sollte auf dem erwarteten Fork-Typ stehen");

    const analysisBefore = window.S.analysis;
    click(doc, honest ? "tSolid" : "tTempt");
    await wait(700);

    if (honest) {
      assert.strictEqual(window.S.analysis, analysisBefore + 1,
        "Die ehrliche Wahl muss weiterhin die freie Analysezeit gutschreiben (unverändertes Verhalten)");
      assert(doc.querySelector(".debrief").innerHTML.indexOf("analysis — and it") !== -1,
        "Im Debrief muss nach der ehrlichen Wahl weiterhin der \"+1d analysis\"-Hinweis erscheinen");
    } else {
      assert.strictEqual(window.S.analysis, analysisBefore,
        "Die unehrliche Abkürzung darf KEINE freie Analysezeit gutschreiben");
      assert(doc.querySelector(".debrief").innerHTML.indexOf("analysis — and it") === -1,
        "Im Debrief darf nach der Abkürzung kein \"+1d analysis\"-Hinweis erscheinen");
    }

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testForkCredit(" + missingRoleId + "," + kind + "," + honest + "): " + err.message;
  }
}

async function main() {
  const failures = (await Promise.all([
    // "question" fork ("Decide now or later") exists in every run.
    testForkCredit("dev", "question", false),
    testForkCredit("dev", "question", true),
    // "bizvalue" fork only exists when the PO is the missing role.
    testForkCredit("po", "bizvalue", false),
    testForkCredit("po", "bizvalue", true),
  ])).filter(Boolean);
  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 4/4 Checks grün (unehrliche Abkürzung bei beiden Fork-Typen — Geschäftswert raten, Frage vertagen — bekommt keine Gratis-Analysezeit mehr; ehrliche Wahl weiterhin unverändert belohnt)");
  process.exit(0);
}

main();
