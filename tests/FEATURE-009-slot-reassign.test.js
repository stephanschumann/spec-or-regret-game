/**
 * tests/FEATURE-009-slot-reassign.test.js — jsdom test for Stephan's Round 5
 * feedback (23.07.2026): re-sorting a card on the team-map board still didn't
 * work for him, even after Round 4's fix.
 *
 * Root cause, found via a real-mouse-event Playwright reproduction (not
 * guessed): Round 4 made the ORIGINAL bank card clickable again once assigned,
 * but the card as it visually appears INSIDE its bucket (the "slot") had no
 * click handler at all. A real player looks at where their card landed — the
 * slot — not at a now-faded duplicate sitting in the bank above. Clicking the
 * slot did nothing, which is exactly what Stephan reported.
 *
 * This test drives the interaction the way a player actually would: click the
 * SLOT (not the original bank item) to pick a card back up, then click a
 * different bucket to move it there.
 *
 * Ausführen: node tests/FEATURE-009-slot-reassign.test.js
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

async function main() {
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
    const firstEl = doc.querySelector(".item");
    const firstIdx = firstEl.dataset.idx;
    const correctBid = st.items[firstIdx].c === "goal" ? "goal" : st.items[firstIdx].c === "rule" ? "rule" : st.items[firstIdx].c === "ex" ? "ex" : "q";
    const wrongBucket = st.buckets.find((b) => b.id !== correctBid) || st.buckets[0];

    // Sort it into the wrong bucket first (via the bank card, as before).
    firstEl.dispatchEvent(new window.Event("click", { bubbles: true }));
    doc.querySelector('.bucket[data-b="' + wrongBucket.id + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    const slot = doc.querySelector('.slot[data-idx="' + firstIdx + '"]');
    assert(slot, "Nach der Zuordnung sollte ein Slot mit data-idx existieren");

    // THIS is what a real player does: click the card where it landed — the
    // slot inside the bucket — not the faded original in the bank.
    slot.dispatchEvent(new window.Event("click", { bubbles: true }));
    assert(slot.classList.contains("picked") || doc.querySelector('.item[data-idx="' + firstIdx + '"]').classList.contains("picked"),
      "Ein Klick auf den Slot sollte die Karte 'aufnehmen' (sichtbar markiert), genau wie ein Klick auf die Bank-Karte");

    // Now click a DIFFERENT bucket — this must move the card, not leave it inert.
    const correctBucketEl = doc.querySelector('.bucket[data-b="' + correctBid + '"]');
    correctBucketEl.dispatchEvent(new window.Event("click", { bubbles: true }));

    assert.strictEqual(doc.querySelectorAll('.bucket[data-b="' + wrongBucket.id + '"] .slot').length, 0,
      "Der Klick auf den SLOT (nicht die Bank-Karte) sollte die Karte tatsächlich aus dem falschen Bucket entfernen");
    assert.strictEqual(doc.querySelectorAll('.bucket[data-b="' + correctBid + '"] .slot').length, 1,
      "...und im richtigen Bucket neu platzieren");
    assert.strictEqual(doc.querySelectorAll('.slot[data-idx="' + firstIdx + '"]').length, 1,
      "Insgesamt weiterhin nur ein Slot für diese Karte — keine Dopplung");

    // Regression guard: clicking a slot must NOT also immediately re-assign it
    // back into the SAME bucket via event bubbling to the bucket's own onclick.
    assert.strictEqual(window.S.cycle, 0, "Kein Cycle-Time-Seiteneffekt allein durchs Umsortieren");

    console.log("PASS — 1/1 Check grün (Klick auf die Karte IM Bucket — den Slot — sortiert tatsächlich um, nicht nur ein Klick auf die verblasste Bank-Kopie)");
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
