/**
 * tests/BUG-003.test.js — jsdom checks that German-style quotation marks
 * („...“) in the game's English texts were converted to English-style
 * quotation marks (“...”), matching the existing correct usage already
 * present in the same texts (public/index.html).
 *
 * Root cause (see BUG-003 spec in Backlog.md): some texts were written using
 * German opening/closing quotes „...“ (U+201E / U+201C) instead of the
 * English opening/closing pair “...” (U+201C / U+201D) that the rest of the
 * game already uses. Both scenario texts (SCENARIOS array; 69 pairs) and
 * shared engine texts (buildStages()/BOSS_OPTIONS; 15 pairs) were affected —
 * 84 pairs total. 15 pairs elsewhere already used the correct “...” style
 * and must stay untouched. The fix is a PAIRED replacement of „(.*?)“ with
 * “\1” — a naive single-character find/replace would have been wrong,
 * since U+201C (“) is used both as the (incorrect) German closing quote AND
 * as the (correct) English opening quote in this file, so a blind
 * character swap could not tell those two uses apart.
 *
 * These checks stay durably useful for later tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. No German „ or “ artifacts remain anywhere in the source — the paired
 *      conversion is complete (0 remaining „), and the character counts
 *      balance out exactly as computed during analysis (99 “, 99 ”, 534 ’
 *      unchanged apostrophes).
 *   3. A real scenario ticket (rendered via the actual stageHead() render
 *      path, same as a player would see on the "reveal" stage) shows the
 *      fixed English-style quotes.
 *   4. Real shared-engine debrief texts (rendered via the actual
 *      debriefHTML() render path) show the fixed quotes, including a case
 *      with several „...“ pairs in one block.
 *   5. A real "Definition of Ready" boss-stage option list (rendered via the
 *      actual renderSelect() render path into the live stageHost DOM node)
 *      shows the fixed quotes, and the neighbouring apostrophe (don’t) is
 *      untouched by the fix.
 *
 * Ausführen: node tests/BUG-003.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const RAW_SOURCE = fs.readFileSync(INDEX_HTML, "utf8");

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

function testGameVersion() {
  const dom = loadGame();
  try {
    assert.notStrictEqual(dom.window.GAME_VERSION, "1.22.0", "GAME_VERSION sollte für diese sichtbare Änderung erhöht worden sein");
    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "GAME_VERSION-Check: " + err.message;
  }
}

function testSourceCharacterCounts() {
  try {
    const germanOpen = (RAW_SOURCE.match(/„/g) || []).length;
    const curlyLeft = (RAW_SOURCE.match(/“/g) || []).length;
    const curlyRight = (RAW_SOURCE.match(/”/g) || []).length;
    const apostrophes = (RAW_SOURCE.match(/’/g) || []).length;

    assert.strictEqual(germanOpen, 0, "es sollte kein deutsches „-Zeichen mehr im Quelltext vorkommen, tatsächlich: " + germanOpen);
    assert.strictEqual(curlyLeft, 99, "es sollten genau 99 “-Zeichen im Quelltext stehen (15 unveränderte + 84 neu umgewandelte), tatsächlich: " + curlyLeft);
    assert.strictEqual(curlyRight, 99, "es sollten genau 99 ”-Zeichen im Quelltext stehen (15 unveränderte + 84 neu umgewandelte), tatsächlich: " + curlyRight);
    assert.strictEqual(apostrophes, 534, "die 534 Apostrophe (’) dürfen von dieser Änderung nicht angefasst worden sein, tatsächlich: " + apostrophes);
    return null;
  } catch (err) {
    return "Zeichen-Zählung im Quelltext: " + err.message;
  }
}

function testScenarioTicketRendersFixedQuotes() {
  const dom = loadGame();
  const { window } = dom;
  try {
    const sc = window.SCENARIOS[0];
    assert.strictEqual(
      sc.ticket,
      "“Let companies pay all their suppliers at once by uploading a file.”",
      "das erste Szenario-Ticket sollte die englischen Anführungszeichen tragen"
    );

    const stages = window.buildStages(sc);
    const revealStage = stages.filter(function (st) { return st.type === "reveal"; })[0];
    assert(revealStage, "es sollte eine 'reveal'-Stage geben, die das Ticket zeigt");
    const revealHead = window.stageHead(revealStage);
    assert(
      revealHead.indexOf("“Let companies pay all their suppliers at once by uploading a file.”") !== -1,
      "die gerenderte 'reveal'-Stage sollte das Ticket mit englischen Anführungszeichen enthalten"
    );
    assert(revealHead.indexOf("„") === -1, "die gerenderte 'reveal'-Stage sollte kein deutsches „ mehr enthalten");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Szenario-Ticket-Rendering: " + err.message;
  }
}

function testSharedEngineDebriefRendersFixedQuotes() {
  const dom = loadGame();
  const { window } = dom;
  try {
    const sc = window.SCENARIOS[0];
    const stages = window.buildStages(sc);

    const buildStage = stages.filter(function (st) { return st.type === "build"; })[0];
    assert(buildStage, "es sollte eine 'build'-Stage geben");
    const buildDebrief = window.debriefHTML(buildStage);
    assert(buildDebrief.indexOf("“goes wrong”") !== -1, "'build'-Debrief sollte „goes wrong“ jetzt als “goes wrong” zeigen");
    assert(buildDebrief.indexOf("„") === -1, "'build'-Debrief sollte kein deutsches „ mehr enthalten");

    const noguessStage = stages.filter(function (st) { return st.badge && st.badge.name === "Nothing left to guess"; })[0];
    assert(noguessStage, "es sollte eine Stage mit Badge 'Nothing left to guess' geben");
    const noguessDebrief = window.debriefHTML(noguessStage);
    ["“No one has to guess”", "“limited”", "“blocked”", "“the agent will figure it out”"].forEach(function (phrase) {
      assert(noguessDebrief.indexOf(phrase) !== -1, "'Nothing left to guess'-Debrief sollte " + phrase + " enthalten");
    });
    assert(noguessDebrief.indexOf("„") === -1, "'Nothing left to guess'-Debrief sollte kein deutsches „ mehr enthalten (mehrere Paare in einem Block)");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Shared-Engine-Debrief-Rendering: " + err.message;
  }
}

function testBossOptionsRenderFixedQuotesAndKeepApostrophes() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    doc.getElementById("introCta").click();
    doc.getElementById("pickAgentMode").click();

    const sc = window.SCENARIOS[0];
    const stages = window.buildStages(sc);
    const bossStage = stages.filter(function (st) { return st.isBoss; })[0];
    assert(bossStage, "es sollte eine Boss-Stage (Definition of Ready) geben");

    window.renderSelect(bossStage);
    const optsText = doc.getElementById("stageHost").innerHTML;
    assert(optsText.indexOf("“don’t do this”") !== -1, "die gerenderte Optionsliste sollte “don’t do this” mit englischen Anführungszeichen zeigen");
    assert(optsText.indexOf("„") === -1, "die gerenderte Optionsliste sollte kein deutsches „ mehr enthalten");
    assert(optsText.indexOf("don’t") !== -1, "der Apostroph in 'don’t' darf von der Anführungszeichen-Korrektur nicht angefasst worden sein");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Boss-Optionsliste-Rendering: " + err.message;
  }
}

function main() {
  const failures = [
    testGameVersion(),
    testSourceCharacterCounts(),
    testScenarioTicketRendersFixedQuotes(),
    testSharedEngineDebriefRendersFixedQuotes(),
    testBossOptionsRenderFixedQuotesAndKeepApostrophes(),
  ].filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 5/5 Checks grün (GAME_VERSION erhöht, Zeichen-Zählung im Quelltext stimmt exakt, Szenario-Ticket zeigt englische Anführungszeichen, Shared-Engine-Debriefs (inkl. Mehrfach-Paar-Block) zeigen englische Anführungszeichen, Boss-Optionsliste zeigt englische Anführungszeichen bei unverändertem Apostroph)");
  process.exit(0);
}

main();
