/**
 * tests/FEATURE-009-content.test.js — jsdom test guarding against "undefined"
 * literally leaking into the rendered Team-mode UI.
 *
 * Root cause this guards against (found via Stephan's own testing, 22.07.2026):
 * the shared stageHead(st) helper always renders st.setup, even if a stage
 * definition in buildTeamStages() forgot to set it — string concatenation then
 * silently prints the literal word "undefined" under the stage title. Five of
 * the nine Team-mode stage definitions had this gap (both teamfork stages, both
 * teamselect stages, and teamimpl) — invisible in jsdom's DOM assertions unless
 * something explicitly grep-checks the rendered HTML text, which is exactly
 * what this test does. Plays through BOTH branches (Product Owner missing /
 * present) since they produce a different stage sequence (the bizvalue fork
 * only exists on the PO-missing branch) and both must stay clean.
 *
 * Ausführen: node tests/FEATURE-009-content.test.js
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

async function playThrough(window, doc, roleMissing) {
  const seen = []; // collect every stageHost snapshot to check afterwards
  function snap(label) {
    const html = doc.getElementById("stageHost").innerHTML;
    seen.push({ label, html });
  }

  window.pickMissingRoleId = function () { return roleMissing; };
  click(doc, "introCta");
  click(doc, "pickTeamMode");
  click(doc, "teamRndBtn");
  click(doc, "teamStartBtn");
  snap("roster");

  click(doc, "teamNext"); // -> map
  snap("map");
  // sort everything honestly so we walk the "clean" content path too
  const st = window.STAGES[window.S.i];
  const itemEls = Array.from(doc.querySelectorAll(".item"));
  itemEls.forEach((el) => {
    el.dispatchEvent(new window.Event("click", { bubbles: true }));
    const idx = el.dataset.idx;
    const bid = st.items[idx].c === "goal" ? "goal" : st.items[idx].c === "rule" ? "rule" : st.items[idx].c === "ex" ? "ex" : "q";
    doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  snap("map-done");
  click(doc, "nextBtn");

  // If PO is missing, the bizvalue fork appears next — this is the exact stage
  // Stephan's screenshot showed "undefined" on.
  if (window.STAGES[window.S.i].type === "teamfork" && window.STAGES[window.S.i].kind === "bizvalue") {
    snap("bizvalue-fork");
    click(doc, "tSolid");
    await wait(700);
    snap("bizvalue-fork-resolved");
    click(doc, "nextBtn");
  }

  snap("gherkin");
  click(doc, "precise");
  const stG = window.STAGES[window.S.i];
  stG.scenarios.forEach((sc, si) => {
    sc.lines.forEach((ln, li) => {
      let correctGi = null;
      ln.segs.forEach((seg, gi) => { if (seg.c) correctGi = gi; });
      doc.querySelector('.seg[data-k="' + si + '.' + li + '"][data-g="' + correctGi + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
  snap("gherkin-done");
  click(doc, "nextBtn");

  snap("question-fork");
  click(doc, "tSolid");
  await wait(700);
  snap("question-fork-resolved");
  click(doc, "nextBtn");

  // FEATURE-014: new pre-premortem fork — solid path, keeps the existing
  // premortem content-snapshot coverage below unchanged.
  snap("premortemskip-fork");
  click(doc, "tSolid");
  await wait(700);
  snap("premortemskip-fork-resolved");
  click(doc, "nextBtn");

  function answerSelect(mode) {
    const s = window.STAGES[window.S.i];
    s.options.forEach((o, idx) => {
      const shouldPick = (mode === "catch") ? o.bad : !o.bad;
      if (shouldPick) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
  }
  snap("premortem");
  answerSelect("pick");
  snap("premortem-done");
  click(doc, "nextBtn");
  snap("overreach");
  answerSelect("catch");
  snap("overreach-done");
  click(doc, "nextBtn");

  snap("dor");
  click(doc, "markAll");
  click(doc, "dorContinue");
  snap("dor-done");
  click(doc, "nextBtn");

  snap("impl");
  click(doc, "handoff");
  await wait(2500);
  snap("impl-done");
  click(doc, "nextBtn");
  snap("finale");

  return seen;
}

async function main() {
  const failures = [];
  for (const roleMissing of ["po", "dev"]) {
    const dom = loadGame();
    const { window } = dom;
    const doc = window.document;
    try {
      const snaps = await playThrough(window, doc, roleMissing);
      snaps.forEach(({ label, html }) => {
        if (/\bundefined\b/.test(html)) {
          failures.push(`roleMissing="${roleMissing}", stage "${label}": rendered HTML contains the literal word "undefined"`);
        }
      });
    } catch (err) {
      failures.push(`roleMissing="${roleMissing}": threw — ${err.message}`);
    } finally {
      dom.window.close();
    }
  }

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 1/1 Check grün (kein \"undefined\" im gerenderten Team-Modus-Text, beide Verzweigungen: PO fehlt / PO vorhanden)");
  process.exit(0);
}

main();
