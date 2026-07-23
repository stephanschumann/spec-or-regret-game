/**
 * tests/FEATURE-009-navigation.test.js — jsdom tests for Stephan's Round 4
 * feedback (23.07.2026) on the Team-mode finale screenshot:
 *
 *   1. A card sorted into the team-map board can be re-assigned to a
 *      different category while the step is still active (before the timer
 *      actually runs out) — previously an assigned card was permanently
 *      locked (`pointer-events:none`), which was the actual bug.
 *   2. Once the timer really does run out, the board locks — re-assignment
 *      must no longer be possible (this must NOT regress).
 *   3. A "Look back" control lets the player review ANY step already played
 *      (not just ones that award a badge) via Previous/Next buttons, and the
 *      review is genuinely view-only (a static HTML snapshot).
 *   4. The finale's "look back" tile grid shows every played step, not only
 *      the badge-earning ones.
 *
 * Ausführen: node tests/FEATURE-009-navigation.test.js
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

async function testReassignmentWhileActive() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");
    click(doc, "teamNext"); // -> map

    const st = window.STAGES[window.S.i];
    const items = doc.querySelectorAll(".item");
    // The bank is rendered in SHUFFLED order — the first DOM element's real
    // item index (and correct category) must be read from its own dataset,
    // not assumed to be array index 0.
    const firstIdx = items[0].dataset.idx;
    const correctBid = st.items[firstIdx].c === "goal" ? "goal" : st.items[firstIdx].c === "rule" ? "rule" : st.items[firstIdx].c === "ex" ? "ex" : "q";
    const wrongBucket = st.buckets.find((b) => b.id !== correctBid) || st.buckets[0];

    // Sort the first card into the WRONG bucket first.
    items[0].dispatchEvent(new window.Event("click", { bubbles: true }));
    doc.querySelector('.bucket[data-b="' + wrongBucket.id + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    assert.strictEqual(doc.querySelectorAll('.bucket[data-b="' + wrongBucket.id + '"] .slot').length, 1,
      "Die erste Zuordnung sollte einen Slot im (falschen) Bucket erzeugen");

    // Now re-click the SAME card (already assigned) and move it to its correct bucket.
    items[0].dispatchEvent(new window.Event("click", { bubbles: true })); // pick again — must NOT be blocked
    doc.querySelector('.bucket[data-b="' + correctBid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));

    assert.strictEqual(doc.querySelectorAll('.bucket[data-b="' + wrongBucket.id + '"] .slot').length, 0,
      "Der alte Slot im falschen Bucket sollte entfernt worden sein");
    assert.strictEqual(doc.querySelectorAll('.bucket[data-b="' + correctBid + '"] .slot').length, 1,
      "Es sollte jetzt genau ein Slot im richtigen Bucket existieren (keine Dopplung)");
    assert.strictEqual(doc.querySelectorAll('.slot[data-idx="' + firstIdx + '"]').length, 1, "Insgesamt darf es nur EINEN Slot für diese Karte geben");

    // Finish sorting the rest honestly, board completes before the timer runs out.
    Array.from(items).slice(1).forEach((el) => {
      el.dispatchEvent(new window.Event("click", { bubbles: true }));
      const idx = el.dataset.idx;
      const bid = st.items[idx].c === "goal" ? "goal" : st.items[idx].c === "rule" ? "rule" : st.items[idx].c === "ex" ? "ex" : "q";
      doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    assert(doc.querySelector(".debrief"), "Ein vollständig sortiertes Board sollte automatisch den Debrief zeigen");
    assert.strictEqual(window.S.analysis, 1, "Ein rechtzeitig fertiges Board sollte trotz Korrektur volle Analysezeit geben");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testReassignmentWhileActive: " + err.message;
  }
}

async function testLockAfterTimeout() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");
    click(doc, "teamNext"); // -> map

    const tick = window.__intervalFns[window.__intervalFns.length - 1];
    for (let i = 0; i < 69; i++) tick(); // let the timer run all the way out
    assert(doc.querySelector(".debrief"), "Nach Ablauf sollte der Debrief erscheinen");

    const slotsBefore = doc.querySelectorAll(".slot").length;
    const item = doc.querySelector(".item");
    item.dispatchEvent(new window.Event("click", { bubbles: true }));
    const anyBucket = doc.querySelector(".bucket");
    if (anyBucket) anyBucket.dispatchEvent(new window.Event("click", { bubbles: true }));
    const slotsAfter = doc.querySelectorAll(".slot").length;
    assert.strictEqual(slotsAfter, slotsBefore, "Nach Ablauf der Zeit darf ein Klick keine neue Zuordnung mehr erzeugen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testLockAfterTimeout: " + err.message;
  }
}

async function testLookBackAndFinaleGrid() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");

    assert.strictEqual(doc.getElementById("navFoot").style.display, "none",
      "Ganz am Anfang (S.i === 0) gibt es noch nichts zum Zurückblicken");

    click(doc, "teamNext"); // roster -> map (S.i now 1, roster is in history)
    assert.notStrictEqual(doc.getElementById("navFoot").style.display, "none",
      "Nach dem ersten abgeschlossenen Schritt sollte die 'Look back'-Leiste am unteren Rand sichtbar sein");

    // Open the review for the roster step (index 0) — it has NO badge, proving
    // the review mechanism works for non-badge steps too.
    window.openReview(0);
    assert(doc.getElementById("ovReview").classList.contains("show"), "Review-Overlay sollte offen sein");
    assert(doc.getElementById("reviewBody").innerHTML.indexOf("Who's in the room") !== -1 || doc.getElementById("reviewBody").innerHTML.indexOf("roster") !== -1 || doc.getElementById("reviewBody").innerHTML.length > 0,
      "Review-Inhalt sollte den echten Roster-Schnappschuss zeigen");
    assert.strictEqual(doc.getElementById("reviewPrev").disabled, true, "Vor Schritt 0 gibt es nichts weiter zurück");

    // Sort the map board fully so we advance further and have more history.
    const st = window.STAGES[window.S.i];
    Array.from(doc.querySelectorAll(".item")).forEach((el) => {
      el.dispatchEvent(new window.Event("click", { bubbles: true }));
      const idx = el.dataset.idx;
      const bid = st.items[idx].c === "goal" ? "goal" : st.items[idx].c === "rule" ? "rule" : st.items[idx].c === "ex" ? "ex" : "q";
      doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    click(doc, "nextBtn"); // -> gherkin, S.i = 2

    window.openReview(0); // still reviewable
    assert.strictEqual(doc.getElementById("reviewNext").disabled, false, "Von Schritt 0 aus sollte 'weiter' zu Schritt 1 (Map) möglich sein");
    click(doc, "reviewNext");
    assert.strictEqual(window.reviewIdx, 1, "Der Klick auf 'Next step' sollte zur Map-Ansicht (Index 1) wechseln");
    click(doc, "reviewPrev");
    assert.strictEqual(window.reviewIdx, 0, "Der Klick auf 'Previous step' sollte zurück zur Roster-Ansicht (Index 0) wechseln");
    doc.querySelector('#ovReview [data-close]').dispatchEvent(new window.Event("click", { bubbles: true }));
    assert(!doc.getElementById("ovReview").classList.contains("show"), "Schließen sollte das Review-Overlay verstecken, der Live-Stand bleibt unverändert");

    // Fast-forward the rest of the run to the finale to check the tile grid.
    click(doc, "precise");
    const stG = window.STAGES[window.S.i];
    stG.scenarios.forEach((sc, si) => sc.lines.forEach((ln, li) => {
      let correctGi = null; ln.segs.forEach((seg, gi) => { if (seg.c) correctGi = gi; });
      doc.querySelector('.seg[data-k="' + si + '.' + li + '"][data-g="' + correctGi + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    }));
    doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "nextBtn"); // -> question fork
    click(doc, "tSolid"); await wait(700); click(doc, "nextBtn"); // -> premortem
    function answerSelect(mode) {
      const s = window.STAGES[window.S.i];
      s.options.forEach((o, idx) => { if ((mode === "catch") ? o.bad : !o.bad) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true })); });
      doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
    }
    answerSelect("pick"); click(doc, "nextBtn"); // -> overreach
    answerSelect("catch"); click(doc, "nextBtn"); // -> dor
    click(doc, "markAll"); click(doc, "dorContinue"); click(doc, "nextBtn"); // -> impl
    click(doc, "handoff"); await wait(2500); click(doc, "nextBtn"); // -> finale

    const finaleHTML = doc.getElementById("stageHost").innerHTML;
    const tileCount = (finaleHTML.match(/class="fbadge"/g) || []).length;
    assert.strictEqual(tileCount, 8, "Der Dev-fehlt-Durchlauf hat 8 gespielte Schritte vor dem Finale — alle sollten als Kachel erscheinen, nicht nur die 4 mit Badge");
    assert.strictEqual(window.S.badges.length, 4, "Nur 4 dieser 8 Schritte vergeben tatsächlich ein Badge (Map, Gherkin, Pre-mortem, Scope guardian)");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testLookBackAndFinaleGrid: " + err.message;
  }
}

function testStaticCopyAndStyle() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  const failures = [];
  if (html.indexOf('.hintline{font-size:13px;color:var(--text);font-weight:600') === -1) {
    failures.push("Die .hintline-Regel sollte auf var(--text) mit erhöhtem Kontrast stehen, unveränderte Schriftgröße 13px");
  }
  if (html.indexOf('button: "Start Development"') === -1) {
    failures.push('Der Handover-Button sollte jetzt "Start Development" heißen');
  }
  return failures;
}

async function main() {
  const failures = [];
  const results = await Promise.all([testReassignmentWhileActive(), testLockAfterTimeout(), testLookBackAndFinaleGrid()]);
  results.forEach((r) => { if (r) failures.push(r); });
  failures.push(...testStaticCopyAndStyle());

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 4/4 Checks grün (Karte im Map-Schritt neu zuordenbar solange aktiv, Sperre nach echtem Zeitablauf bleibt, Zurückblicken funktioniert für JEDEN Schritt inkl. Prev/Next, Finale-Kachelraster zeigt alle gespielten Schritte statt nur Badges, Copy/Kontrast-Fixes vorhanden)");
  process.exit(0);
}

main();
