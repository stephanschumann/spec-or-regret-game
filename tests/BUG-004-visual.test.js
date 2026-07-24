/**
 * tests/BUG-004-visual.test.js — real-browser (Playwright/Chromium) layout
 * check for the mode-picker "What's different here?" info boxes, same
 * pattern as tests/FEATURE-009-visual.test.js.
 *
 * Why this exists as a SEPARATE test file, not part of the jsdom
 * tests/BUG-004.test.js: jsdom does not run a real CSS layout/rendering
 * engine (getBoundingClientRect() returns zeros there), so it cannot see the
 * actual layout jump this bug is about, or confirm the fix actually smooths
 * it. Only a real rendering engine can reproduce and verify this.
 *
 * The bug (Stephan's first-impression test, 23.07.2026): clicking the first
 * mode card's "What's different here?" box instantly shifted the second
 * card's own box down (via CSS-Grid row-stretch on wide screens, or by
 * simply being the next stacked card on narrow screens) — a fast follow-up
 * click aimed at the SECOND box's old position missed. Fixed by animating
 * .difflist's height via CSS Grid (0fr -> 1fr) instead of an instant
 * display:none/block snap (see public/index.html, .moredet rules).
 *
 * This test reproduces the exact reported scenario: click the first box,
 * then immediately (no artificial wait) click at the SECOND box's
 * pre-click coordinates — the way a fast real click would land — on both a
 * wide (cards side by side) and a narrow (cards stacked) viewport, and
 * confirms the second box still opens. It also sanity-checks that the two
 * boxes still genuinely shift position after the first opens (i.e. the fix
 * smooths the jump, it doesn't just happen to avoid it by making the boxes
 * static — that would silently no longer match the real page).
 *
 * Requires the "playwright" package with a Chromium binary available. Skips
 * gracefully (exit 0, clearly logged) if Playwright isn't installed in the
 * environment this runs in, rather than failing the whole regression suite
 * for an environment gap unrelated to the game's own code.
 *
 * Ausführen: node tests/BUG-004-visual.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");

async function runScenario(browser, { width, height, label }) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto("file://" + INDEX_HTML);
  await page.click("#introCta");

  const agentSummary = page.locator(".modecard.modeagent summary");
  const teamSummary = page.locator(".modecard.team summary");
  await agentSummary.waitFor({ state: "visible" });
  await teamSummary.waitFor({ state: "visible" });

  const oldBox = await teamSummary.boundingBox();
  assert(oldBox, `${label}: Team-Summary sollte vor dem Öffnen eine Bounding-Box haben`);

  // Reproduce the exact reported scenario: click box 1, then IMMEDIATELY
  // click at box 2's PRE-click coordinates (no artificial delay) — the way
  // a fast real click would land if the person aimed before box 1 opened.
  await agentSummary.click();
  await page.mouse.click(oldBox.x + oldBox.width / 2, oldBox.y + oldBox.height / 2);

  const teamOpenAfterFastClick = await page.locator(".modecard.team details.moredet").getAttribute("open");
  assert(
    teamOpenAfterFastClick !== null,
    `${label}: ein sofortiger zweiter Klick auf die alte Position der Team-Infobox sollte sie trotzdem öffnen (Kern des Bugs)`
  );

  // Sanity check: the boxes still genuinely move once the transition has
  // settled — this fix smooths the jump, it does not remove it. If this
  // assertion ever fails because the shift is now ~0px, the page layout has
  // changed enough that this test (and the original bug) may no longer be
  // representative, and that's worth knowing.
  await page.waitForTimeout(400); // > the .28s CSS transition, let it fully settle
  const newBox = await teamSummary.boundingBox();
  const shift = Math.abs(newBox.y - oldBox.y);
  assert(shift > 2, `${label}: die Team-Infobox sollte nach dem Öffnen der Agent-Box weiterhin sichtbar verschoben sein (Differenz ${shift.toFixed(1)}px) — sonst bildet der Test das echte Layout nicht mehr ab`);

  // Regression: normal click (not a coordinate guess) still opens/closes
  // both boxes correctly after the structural change.
  await teamSummary.click(); // was opened by the fast coordinate click above; this closes it
  await page.waitForTimeout(400);
  const teamOpenAfterExplicitClose = await page.locator(".modecard.team details.moredet").getAttribute("open");
  assert(teamOpenAfterExplicitClose === null, `${label}: Team-Infobox sollte sich per regulärem Klick wieder schließen lassen`);

  await page.close();
  return { label, shift };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (e) {
    console.log("SKIP — playwright nicht installiert in dieser Umgebung, visueller Check übersprungen.");
    process.exit(0);
  }

  const launchOpts = {};
  if (fs.existsSync("/opt/pw-browsers/chromium")) launchOpts.executablePath = "/opt/pw-browsers/chromium";

  const browser = await chromium.launch(launchOpts);
  try {
    const wide = await runScenario(browser, { width: 1400, height: 1000, label: "breiter Bildschirm (Karten nebeneinander)" });
    // height:2000, not a realistic phone height — deliberately tall enough that
    // both boxes are visible without scrolling. Playwright's .click() auto-scrolls
    // its target into view first; on a short viewport that scroll happens BETWEEN
    // capturing the team box's "old" coordinates and clicking them, which moves
    // the coordinates out from under the click for reasons unrelated to this bug
    // (found while writing this test — first version flaked here). The narrow
    // WIDTH (stacked single-column layout) is what this scenario is testing, not
    // the viewport height.
    const narrow = await runScenario(browser, { width: 375, height: 2000, label: "Handy-Breite (Karten untereinander)" });

    console.log(
      `PASS — 2/2 Szenarien grün (schneller Zweitklick auf die alte Position der Team-Infobox trifft trotzdem, auf ${wide.label} [Verschiebung ${wide.shift.toFixed(1)}px] und ${narrow.label} [Verschiebung ${narrow.shift.toFixed(1)}px]; reguläres Schließen funktioniert weiterhin)`
    );
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
