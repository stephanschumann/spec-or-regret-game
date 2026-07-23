/**
 * tests/FEATURE-009-visual.test.js — real-browser (Playwright/Chromium) layout
 * check for the mode-picker cards.
 *
 * Why this exists as a SEPARATE test file, not a jsdom one: jsdom does not run
 * a real CSS layout/rendering engine, so it cannot see box heights, alignment,
 * or any other visual defect — getBoundingClientRect() in jsdom returns zeros.
 * The bug this guards against (found via Stephan's own testing, 22.07.2026) was
 * exactly this kind: the "Collaborate with Agents" mode-picker card carried the
 * CSS class "agent", which collided with the pre-existing, unrelated .agent{...}
 * rule used throughout the game for build-result/reaction panels — silently
 * overriding its padding/background/margin/animation and making the two
 * mode-picker cards visibly different heights. No jsdom test could have caught
 * this; only a real rendering engine can. Fixed by renaming the card's class to
 * "modeagent" (see buildTeamStages/renderModePicker in public/index.html).
 *
 * Requires the "playwright" package with a Chromium binary available. Skips
 * gracefully (exit 0, clearly logged) if Playwright isn't installed in the
 * environment this runs in, rather than failing the whole regression suite for
 * an environment gap unrelated to the game's own code.
 *
 * Ausführen: node tests/FEATURE-009-visual.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");

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
    await page.waitForTimeout(700); // let the .stage "rise" CSS animation (0.45s) settle before measuring

    const agent = await page.locator(".modecard.modeagent").boundingBox();
    const team = await page.locator(".modecard.team").boundingBox();
    assert(agent, "#modeagent-Karte sollte im DOM existieren und sichtbar sein");
    assert(team, "team-Karte sollte im DOM existieren und sichtbar sein");

    const heightDiff = Math.abs(agent.height - team.height);
    const topDiff = Math.abs(agent.y - team.y);
    assert(heightDiff < 2, `Die beiden Moduswahl-Karten sollten (nahezu) gleich hoch sein — Differenz: ${heightDiff.toFixed(1)}px (agent=${agent.height}, team=${team.height})`);
    assert(topDiff < 2, `Die beiden Moduswahl-Karten sollten auf gleicher Höhe beginnen — Differenz: ${topDiff.toFixed(1)}px`);

    console.log(`PASS — 1/1 Check grün (Moduswahl-Karten gleich hoch und gleich ausgerichtet, Höhe=${agent.height}px)`);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
