/**
 * tests/BUG-009-visual.test.js — real-browser (Playwright/Chromium) check
 * that the two mode-picker Start buttons (#pickAgentMode / #pickTeamMode)
 * render at the SAME size (height and width), not just the same Y position.
 *
 * Why a separate file from tests/BUG-009.test.js: jsdom has no real layout
 * engine (boundingBox()/getBoundingClientRect() return zeros there), so it
 * can only verify which CSS classes are present on each button, not the
 * actual rendered pixel size the fix is about. This mirrors the existing
 * split between tests/BUG-006.test.js (jsdom) and
 * tests/BUG-006-visual.test.js (Playwright).
 *
 * Bug (BUG-009, reported by Stephan via screenshot, 27.07.2026): the agent
 * Start button used class="btn big" (padding 18px 30px, font-size 19px)
 * while the team Start button used only class="btn team" (base .btn
 * padding 14px 22px, font-size 16px) — a real height/padding gap that
 * predates this project's BUG-004/BUG-006 fixes (those corrected the
 * buttons' Y-alignment when a details box opens, never their own intrinsic
 * size). Fix: team button now also carries the "big" class
 * (class="btn big team"), inheriting the same padding/font-size while
 * keeping its teal color via the later, same-specificity .btn.team rule.
 *
 * This test measures both buttons' height and width on a wide viewport,
 * in the baseline (both detail boxes closed) state, and asserts they match
 * within a small pixel tolerance.
 *
 * Requires the "playwright" package with a Chromium binary available. Skips
 * gracefully (exit 0, clearly logged) if Playwright isn't installed in the
 * environment this runs in, rather than failing the whole regression suite
 * for an environment gap unrelated to the game's own code.
 *
 * Ausführen: node tests/BUG-009-visual.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const MAX_SIZE_DIFF_PX = 2;

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
    await page.locator("#pickAgentMode").waitFor({ state: "visible" });

    const agentBtnBox = await page.locator("#pickAgentMode").boundingBox();
    const teamBtnBox = await page.locator("#pickTeamMode").boundingBox();
    assert(agentBtnBox && teamBtnBox, "beide Start-Buttons sollten eine Bounding-Box haben");

    const heightDiff = Math.abs(agentBtnBox.height - teamBtnBox.height);
    const widthDiff = Math.abs(agentBtnBox.width - teamBtnBox.width);

    assert(
      heightDiff <= MAX_SIZE_DIFF_PX,
      `Die beiden Start-Buttons sollten gleich hoch sein (Agent: ${agentBtnBox.height.toFixed(1)}px, Team: ${teamBtnBox.height.toFixed(1)}px, Differenz ${heightDiff.toFixed(1)}px)`
    );
    assert(
      widthDiff <= MAX_SIZE_DIFF_PX,
      `Die beiden Start-Buttons sollten gleich breit sein (Agent: ${agentBtnBox.width.toFixed(1)}px, Team: ${teamBtnBox.width.toFixed(1)}px, Differenz ${widthDiff.toFixed(1)}px)`
    );

    console.log(
      `PASS — beide Start-Buttons gleich groß (Höhe ${agentBtnBox.height.toFixed(1)}px vs ${teamBtnBox.height.toFixed(1)}px, Breite ${agentBtnBox.width.toFixed(1)}px vs ${teamBtnBox.width.toFixed(1)}px, jeweils innerhalb ${MAX_SIZE_DIFF_PX}px).`
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
