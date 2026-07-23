/**
 * tests/FEATURE-009-putback-review.test.js — jsdom tests for Stephan's Round 6
 * feedback (23.07.2026), two issues:
 *
 *   1. "Ich möchte die Karten direkt verschieben können. Das ist umständlich
 *      und unterscheidet sich von der Art wie es im Agent Modus funktioniert."
 *      Agent mode's own categorize step (renderCategorize) puts a visible "↩"
 *      icon directly on a sorted card, which sends it back to the bank so it
 *      can be re-sorted — not a hidden "tap the card again" gesture. The
 *      team-map step now matches that exact pattern.
 *
 *   2. "Wenn ich den Button angeklickt habe, dass ich zum Schritt davor
 *      zurückgehe, öffnet sich ein Overlay. Wenn ich dann aber auf next
 *      klicke, komm ich nicht wieder zurück zu der Seite, auf der ich
 *      eigentlich war." — The review modal's "Next step" button used to just
 *      disable itself at the last reviewable step, a dead end. It now turns
 *      into "Back to where you are →" and closes the modal.
 *
 * Ausführen: node tests/FEATURE-009-putback-review.test.js
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

function testPutBackIcon() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamNext"); // -> map

    const st = window.STAGES[window.S.i];
    const firstEl = doc.querySelector(".item");
    const firstIdx = firstEl.dataset.idx;
    const correctBid = st.items[firstIdx].c === "goal" ? "goal" : st.items[firstIdx].c === "rule" ? "rule" : st.items[firstIdx].c === "ex" ? "ex" : "q";
    const wrongBucket = st.buckets.find((b) => b.id !== correctBid) || st.buckets[0];

    firstEl.dispatchEvent(new window.Event("click", { bubbles: true }));
    doc.querySelector('.bucket[data-b="' + wrongBucket.id + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    const slot = doc.querySelector('.slot[data-idx="' + firstIdx + '"]');
    assert(slot, "Slot sollte existieren");
    const putBackIcon = slot.querySelector(".x");
    assert(putBackIcon, "Der Slot sollte ein sichtbares ↩-Icon haben — wie im Agent-Modus (renderCategorize)");

    putBackIcon.dispatchEvent(new window.Event("click", { bubbles: true }));
    assert.strictEqual(doc.querySelectorAll('.slot[data-idx="' + firstIdx + '"]').length, 0, "Nach Klick auf ↩ sollte kein Slot mehr existieren");
    const bankItem = doc.querySelector('.item[data-idx="' + firstIdx + '"]');
    assert(!bankItem.classList.contains("assigned"), "Die Karte sollte wieder in der Bank aktiv (nicht mehr 'assigned') sein");
    assert.strictEqual(doc.getElementById("cnt").textContent, "0 / " + st.items.length + " sorted",
      "Der Zähler sollte nach dem Zurücklegen wieder sinken (nur diese eine Karte war überhaupt sortiert)");

    // Re-sort it correctly from the bank — confirms the card is genuinely usable again.
    bankItem.dispatchEvent(new window.Event("click", { bubbles: true }));
    doc.querySelector('.bucket[data-b="' + correctBid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    assert.strictEqual(doc.querySelectorAll('.bucket[data-b="' + correctBid + '"] .slot').length, 1, "Karte sollte erneut sortierbar sein, jetzt im richtigen Bucket");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testPutBackIcon: " + err.message;
  }
}

function testReviewNextReturnsHome() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamNext"); // roster -> map, S.i = 1, roster (index 0) now in history

    // Open the review at the ONLY reviewable step (index 0, roster) — this is
    // also the LAST reviewable step (S.i - 1 === 0), so Next should immediately
    // offer "back to where you are", not a dead disabled button.
    window.openReview(0);
    const nextBtn = doc.getElementById("reviewNext");
    assert.strictEqual(nextBtn.disabled, false, "Next darf am letzten ansehbaren Schritt nicht deaktiviert sein — es soll zurückführen");
    assert.strictEqual(nextBtn.textContent, "Back to where you are →", "Die Beschriftung sollte klar sagen, dass es zurück zur laufenden Seite geht");

    nextBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
    assert(!doc.getElementById("ovReview").classList.contains("show"), "Klick auf 'Back to where you are' sollte das Review-Overlay schließen");
    // The live map stage underneath must be completely unaffected/still there.
    assert(doc.getElementById("timerFill"), "Der Live-Stand (Map-Schritt) sollte unverändert weiter sichtbar/aktiv sein");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "testReviewNextReturnsHome: " + err.message;
  }
}

function main() {
  const failures = [testPutBackIcon(), testReviewNextReturnsHome()].filter(Boolean);
  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 2/2 Checks grün (sichtbares ↩-Put-back-Icon wie im Agent-Modus, 'Next' im Review-Overlay führt am Ende zurück zur laufenden Seite statt in eine Sackgasse)");
  process.exit(0);
}

main();
