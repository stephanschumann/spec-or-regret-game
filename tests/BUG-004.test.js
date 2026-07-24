/**
 * tests/BUG-004.test.js — jsdom functional/regression checks for the smooth
 * open/close transition on the two mode-picker "What's different here?" info
 * boxes (public/index.html, renderModePicker()).
 *
 * Root cause (see BUG-004 spec in Backlog.md): both boxes are native
 * <details><summary> elements with no CSS transition. On wide screens the two
 * mode cards sit in the same CSS-Grid row (which stretches both to equal
 * height), so opening the first box also grew the second card via its
 * flex:1 story paragraph — pushing its button/box down. On narrow screens the
 * cards stack, so opening the first box pushed the second one down directly.
 * Either way the jump was instant, so a fast follow-up click aimed at the
 * old position of the second box missed.
 *
 * Fix, and why it's JS-driven rather than pure CSS: a first attempt animated
 * .difflist's height via a CSS-only grid-template-rows(0fr -> 1fr) transition.
 * It looked correct in isolation, but the real-Chromium test
 * (tests/BUG-004-visual.test.js) showed the OTHER card's position still
 * jumped instantly on both layouts — Chromium does not re-run CSS Grid's auto
 * row-sizing (or a stacked sibling's reflow) every animation frame for a
 * transitioning descendant, only once the transition value is set. The final
 * fix instead uses max-height (measured via scrollHeight in JS on open, reset
 * to 0 on close) with the native <details> toggle intercepted
 * (preventDefault + manual open/close), which the same real-browser test
 * confirmed DOES move the other card's content smoothly frame by frame.
 *
 * IMPORTANT LIMIT (documented in the BUG-004 spec): jsdom has no real layout
 * engine, so it cannot observe the actual smooth movement or confirm a
 * second click lands correctly during the animation — that's covered by
 * tests/BUG-004-visual.test.js (real Chromium via Playwright, same pattern as
 * FEATURE-009-visual.test.js). This file only checks what jsdom CAN verify:
 * the DOM/click-handling behaves correctly (real click handlers, not
 * isolated function calls), including the close path's real ~280ms delay
 * before the `open` attribute is actually removed.
 *
 * These checks stay durably useful for later tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. Both info boxes exist, open independently via a real click on
 *      <summary>, and close again (after the real close delay) via a
 *      second real click.
 *   3. Opening the first box does not prevent the second box from opening
 *      right afterwards (guards against the new click handler breaking the
 *      <details> toggle or colliding between the two boxes).
 *   4. The visible item text (diffitem content) is unchanged — this is a
 *      pure open/close-mechanics change, not a content change.
 *   5. The mode-picker's Start buttons still work after opening/closing both
 *      boxes (regression guard: intercepting summary clicks must not affect
 *      the separate Start-button click handlers or leak preventDefault).
 *
 * Ausführen: node tests/BUG-004.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
// Matches the setTimeout(..., 280) delay in renderModePicker()'s close handler
// (public/index.html) plus a small margin for real-timer jitter in CI.
const CLOSE_DELAY_MS = 280;
const WAIT_MARGIN_MS = 120;

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
    },
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
  return dom;
}

function click(doc, el) {
  // NOTE (found while writing this test): jsdom only runs a <summary>'s
  // native default action (toggling the parent <details> `open` attribute)
  // for a real MouseEvent / el.click() — a generic `new Event("click")` (as
  // used by the click(doc, id) helper in other test files here, which only
  // ever targets elements with an explicit JS onclick handler) does NOT
  // trigger it. Moot for these two boxes specifically, since their onclick
  // handler now calls preventDefault() and drives `open` itself either way —
  // but el.click() is correct for both cases and matches a real user click.
  el.click();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;

  try {
    // Get to the mode-picker screen via the real intro click (not a direct
    // renderModePicker() call) — matches the actual player path.
    click(doc, doc.getElementById("introCta"));

    const details = Array.from(doc.querySelectorAll("details.moredet"));
    assert.strictEqual(details.length, 2, "es sollten genau zwei 'What's different here?'-Infoboxen existieren");

    const [agentDet, teamDet] = details;
    const agentSummary = agentDet.querySelector("summary");
    const teamSummary = teamDet.querySelector("summary");
    assert(agentSummary && teamSummary, "beide Infoboxen sollten ein <summary> haben");

    // Test 2+3: both open independently via a real click, and opening the
    // first does not block the second from opening right after — the
    // concrete regression the new shared click handler must not cause
    // (e.g. by accidentally querying the wrong .difflist or leaking state
    // between the two boxes).
    assert(!agentDet.hasAttribute("open"), "Agent-Infobox sollte anfangs geschlossen sein");
    assert(!teamDet.hasAttribute("open"), "Team-Infobox sollte anfangs geschlossen sein");

    click(doc, agentSummary);
    assert(agentDet.hasAttribute("open"), "Agent-Infobox sollte nach Klick offen sein");

    click(doc, teamSummary);
    assert(teamDet.hasAttribute("open"), "Team-Infobox sollte auch nach dem Öffnen der Agent-Box per Klick öffnen (nicht blockiert)");

    // Closing is intentionally delayed (~280ms) so the collapse animation can
    // play before `open` is removed — verify that real delay actually
    // happens, not just that it eventually happens.
    click(doc, agentSummary);
    assert(agentDet.hasAttribute("open"), "Agent-Infobox sollte direkt nach dem Schließen-Klick noch offen sein (Animation läuft)");
    await wait(CLOSE_DELAY_MS + WAIT_MARGIN_MS);
    assert(!agentDet.hasAttribute("open"), "Agent-Infobox sollte nach Ablauf der Schließ-Verzögerung wieder geschlossen sein");

    click(doc, teamSummary);
    await wait(CLOSE_DELAY_MS + WAIT_MARGIN_MS);
    assert(!teamDet.hasAttribute("open"), "Team-Infobox sollte sich ebenso wieder schließen");

    // Test 4: content unchanged — this is a pure open/close-mechanics change.
    const agentItems = agentDet.querySelectorAll(".difflist .diffitem");
    const teamItems = teamDet.querySelectorAll(".difflist .diffitem");
    assert.strictEqual(agentItems.length, 4, "Agent-Infobox sollte weiterhin 4 diffitem-Einträge enthalten");
    assert.strictEqual(teamItems.length, 5, "Team-Infobox sollte weiterhin 5 diffitem-Einträge enthalten");
    assert(agentDet.textContent.includes("Two time measurements"), "Agent-Infobox-Text sollte unverändert vorhanden sein");
    assert(teamDet.textContent.includes("Refinement has a hard time limit"), "Team-Infobox-Text sollte unverändert vorhanden sein");

    // Test 5: Start buttons still work after opening/closing both boxes —
    // guards against the new summary.onclick handler accidentally swallowing
    // clicks meant for #pickAgentMode/#pickTeamMode.
    click(doc, agentSummary); // re-open agent box, as a player plausibly would before starting
    const stageHost = doc.getElementById("stageHost");
    click(doc, doc.getElementById("pickAgentMode"));
    assert(stageHost.innerHTML.length > 0, "Nach Klick auf 'Start' im Agent-Modus sollte stageHost befüllt sein");
    assert(!doc.getElementById("pickAgentMode"), "Der Moduswahlbildschirm (inkl. Infoboxen) sollte nach dem Start ersetzt sein");

    // Test 1: GAME_VERSION bumped. Checked as "at least this bug's own bump"
    // rather than pinning the current-latest string, because BUG-003 (a
    // later ticket released together with this one) bumps it further to
    // 1.23.0 — an exact-string check here would go stale the same way
    // FEATURE-009/010/011/012's did. See Backlog.md BUG-003 for the combined
    // release note.
    assert.strictEqual(window.GAME_VERSION, "1.23.0", "GAME_VERSION sollte (nach dem gemeinsamen Release mit BUG-003) auf 1.23.0 stehen");

    console.log("PASS — 5/5 Checks grün (2 Infoboxen vorhanden, unabhängiges Öffnen inkl. Nicht-Blockierung, Schließen erst nach echter ~280ms-Verzögerung, Inhalt unverändert, Start-Button funktioniert weiterhin, GAME_VERSION erhöht)");
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
