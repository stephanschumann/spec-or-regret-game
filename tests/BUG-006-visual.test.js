/**
 * tests/BUG-006-visual.test.js — real-browser (Playwright/Chromium) layout
 * check that the mode-picker Start buttons stay at a fixed Y position
 * regardless of which "What's different here?" info box(es) are open, while
 * the two .modecard boxes themselves keep matching heights as a pair (same
 * pattern as tests/BUG-004-visual.test.js).
 *
 * Why this exists as a SEPARATE test file, not part of the jsdom
 * tests/BUG-006.test.js: jsdom has no real CSS layout engine
 * (boundingBox()/getBoundingClientRect() return zeros there), so it cannot
 * observe actual pixel positions or confirm the CSS-Grid row-stretch fix.
 *
 * The bug (BUG-006, 25.07.2026): .modecards is a two-column CSS grid; grid
 * rows stretch to equal height by default. Opening one card's "What's
 * different here?" box grew that card, and the OTHER (closed) card was
 * stretched to match. Because .modecard .story used to carry flex:1, that
 * text paragraph (positioned BEFORE the Start button in the markup) absorbed
 * the stretch — pushing the closed card's button down. The opened card's own
 * button never moved (it's before its now-taller box). Result: after opening
 * either box, the two Start buttons no longer lined up.
 *
 * Fix (Option B, approved by Stephan — an earlier proposal to fully decouple
 * card heights via align-items:start was explicitly REJECTED because it made
 * the two card boxes look visibly mismatched in height): .story no longer
 * has flex:1; a new invisible .cardspace spacer AFTER the button (before the
 * <details> box) absorbs the stretch instead. Both buttons should now stay
 * fixed regardless of open/closed state, while the two .modecard boxes keep
 * matching heights as a pair (still driven by the same CSS-Grid row-stretch
 * as before — that part deliberately stays unchanged).
 *
 * This test measures both button positions AND both card heights across all
 * four open/closed combinations on a wide viewport (cards side by side,
 * where the grid-stretch effect applies):
 *   (a) both closed [baseline]
 *   (b) only agent open
 *   (c) only team open
 *   (d) both open
 * Asserts: neither button's Y position drifts more than ~2px from baseline
 * in any state (the actual point of this ticket), AND the two .modecard
 * heights stay within ~2px of each other in every state (confirms the two
 * card boxes are still paired/equal height, i.e. the rejected alternative's
 * downside was avoided).
 *
 * Requires the "playwright" package with a Chromium binary available. Skips
 * gracefully (exit 0, clearly logged) if Playwright isn't installed in the
 * environment this runs in, rather than failing the whole regression suite
 * for an environment gap unrelated to the game's own code.
 *
 * Ausführen: node tests/BUG-006-visual.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const MAX_BUTTON_DRIFT_PX = 2;
const MAX_CARD_HEIGHT_DIFF_PX = 2;
const TRANSITION_SETTLE_MS = 400; // > the .28s CSS max-height transition

async function measure(page) {
  const agentBtnBox = await page.locator("#pickAgentMode").boundingBox();
  const teamBtnBox = await page.locator("#pickTeamMode").boundingBox();
  const agentCardBox = await page.locator(".modecard.modeagent").boundingBox();
  const teamCardBox = await page.locator(".modecard.team").boundingBox();
  assert(agentBtnBox && teamBtnBox && agentCardBox && teamCardBox, "alle vier Bounding-Boxes sollten vorhanden sein");
  return { agentBtnBox, teamBtnBox, agentCardBox, teamCardBox };
}

async function setOpen(page, { agent, team }) {
  const agentOpen = await page.locator(".modecard.modeagent details.moredet").getAttribute("open");
  const teamOpen = await page.locator(".modecard.team details.moredet").getAttribute("open");
  if (agent !== (agentOpen !== null)) await page.locator(".modecard.modeagent summary").click();
  if (team !== (teamOpen !== null)) await page.locator(".modecard.team summary").click();
  await page.waitForTimeout(TRANSITION_SETTLE_MS);
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
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.goto("file://" + INDEX_HTML);
    await page.click("#introCta");
    await page.locator(".modecard.modeagent summary").waitFor({ state: "visible" });

    // (a) baseline — both closed
    await setOpen(page, { agent: false, team: false });
    const baseline = await measure(page);
    const baselineCardDiff = Math.abs(baseline.agentCardBox.height - baseline.teamCardBox.height);
    assert(
      baselineCardDiff <= MAX_CARD_HEIGHT_DIFF_PX,
      `Baseline: die beiden Kartenboxen sollten bereits gleich hoch sein (Differenz ${baselineCardDiff.toFixed(1)}px)`
    );

    const states = [
      { label: "nur Agent-Box offen", agent: true, team: false },
      { label: "nur Team-Box offen", agent: false, team: true },
      { label: "beide Boxen offen", agent: true, team: true },
    ];

    for (const state of states) {
      await setOpen(page, state);
      const m = await measure(page);

      const agentBtnDrift = Math.abs(m.agentBtnBox.y - baseline.agentBtnBox.y);
      const teamBtnDrift = Math.abs(m.teamBtnBox.y - baseline.teamBtnBox.y);
      assert(
        agentBtnDrift <= MAX_BUTTON_DRIFT_PX,
        `${state.label}: Agent-Start-Button sollte an fester Y-Position bleiben (Abweichung ${agentBtnDrift.toFixed(1)}px gegenüber Baseline)`
      );
      assert(
        teamBtnDrift <= MAX_BUTTON_DRIFT_PX,
        `${state.label}: Team-Start-Button sollte an fester Y-Position bleiben (Abweichung ${teamBtnDrift.toFixed(1)}px gegenüber Baseline)`
      );

      const cardHeightDiff = Math.abs(m.agentCardBox.height - m.teamCardBox.height);
      assert(
        cardHeightDiff <= MAX_CARD_HEIGHT_DIFF_PX,
        `${state.label}: die beiden Kartenboxen sollten weiterhin als Paar gleich hoch bleiben (Differenz ${cardHeightDiff.toFixed(1)}px)`
      );
    }

    // Sanity check: at least in the "both open" state, the cards are
    // genuinely taller than the baseline — confirms this test isn't
    // vacuously passing because nothing actually opened/grew.
    await setOpen(page, { agent: true, team: true });
    const bothOpen = await measure(page);
    assert(
      bothOpen.agentCardBox.height > baseline.agentCardBox.height + 10,
      "beide Karten offen: die Kartenhöhe sollte gegenüber der Baseline spürbar gewachsen sein (sonst testet dieser Test nichts Reales)"
    );

    console.log(
      `PASS — Start-Buttons blieben in allen 4 Zuständen (beide zu / nur Agent / nur Team / beide offen) innerhalb ${MAX_BUTTON_DRIFT_PX}px der Baseline-Y-Position; die beiden Kartenboxen blieben in jedem Zustand innerhalb ${MAX_CARD_HEIGHT_DIFF_PX}px gleich hoch.`
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
