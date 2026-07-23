/**
 * tests/FEATURE-013.test.js — jsdom tests for short glossary explanations
 * ("Given/When/Then", "Definition of Ready", "Pre-mortem") added at each
 * term's first user-visible occurrence in "Spec or Regret" (public/index.html).
 *
 * Scope (see FEATURE-013 spec in Backlog.md): Agent mode and Team mode each
 * have their own, independent first occurrence of all three terms (a player
 * may only ever see one of the two modes). The two collapsed "What's
 * different here?" mode-picker info boxes are explicitly OUT of scope (they
 * carry their own layout bug, BUG-004) and must stay untouched. Every later
 * repeat of a term (mid-build chat bubble, finale breakdown, ...) must also
 * stay untouched — only the first occurrence per mode gets the explanation.
 *
 * These checks stay durably useful for later tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. Agent mode: the three explanations exist, each attached to the real
 *      first-occurrence stage (build / select-premortem / DoR-boss), via the
 *      actual render functions (stageHead/debriefHTML), not just raw data.
 *   3. Team mode: same, for its own independent first occurrence
 *      (teamgherkin / teamselect-premortem / teamdor).
 *   4. Existing wording is preserved character-for-character (pure
 *      append, nothing reworded) — a diff-style substring check.
 *   5. Each explanation phrase appears in the source exactly twice (once
 *      per mode) — guards against it accidentally landing in the excluded
 *      mode-picker info boxes or being duplicated at a repeat location.
 *
 * Ausführen: node tests/FEATURE-013.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const RAW_SOURCE = fs.readFileSync(INDEX_HTML, "utf8");

const EXPLAIN_GWT = "(the situation, the trigger, and the expected result)";
const EXPLAIN_PREMORTEM = "(imagining how this could fail, before it’s built)";
const EXPLAIN_DOR = "(the checklist that must be true before anyone can start)";

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
    assert.notStrictEqual(dom.window.GAME_VERSION, "1.19.0", "GAME_VERSION sollte für diese sichtbare Änderung erhöht worden sein");
    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "GAME_VERSION-Check: " + err.message;
  }
}

function testAgentModeExplanations() {
  const dom = loadGame();
  const { window } = dom;
  try {
    const sc = window.SCENARIOS[0];
    const stages = window.buildStages(sc);

    const buildStage = stages.filter(function (st) { return st.type === "build"; })[0];
    assert(buildStage, "Agent-Modus sollte eine 'build'-Stage haben (Given/When/Then)");
    const buildDebrief = window.debriefHTML(buildStage);
    assert(buildDebrief.indexOf(EXPLAIN_GWT) !== -1, "Agent-Modus 'build'-Debrief sollte die Given/When/Then-Erklärung enthalten");
    assert(buildDebrief.indexOf("Written as Given / When / Then " + EXPLAIN_GWT + ", behaviour becomes testable") !== -1,
      "Agent-Modus 'build'-Debrief: bestehender Wortlaut sollte zeichengleich erhalten sein, nur um die Erklärung ergänzt");

    const premortemStage = stages.filter(function (st) { return st.badge && st.badge.name === "Pre-mortem"; })[0];
    assert(premortemStage, "Agent-Modus sollte eine Stage mit Badge 'Pre-mortem' haben");
    const premortemDebrief = window.debriefHTML(premortemStage);
    assert(premortemDebrief.indexOf(EXPLAIN_PREMORTEM) !== -1, "Agent-Modus Pre-mortem-Debrief sollte die Erklärung enthalten");
    assert(premortemDebrief.indexOf("A pre-mortem " + EXPLAIN_PREMORTEM + " turns likely failure") !== -1,
      "Agent-Modus Pre-mortem-Debrief: bestehender Wortlaut sollte zeichengleich erhalten sein, nur um die Erklärung ergänzt");

    const dorStage = stages.filter(function (st) { return st.isBoss; })[0];
    assert(dorStage, "Agent-Modus sollte eine Boss-Stage (Definition of Ready) haben");
    const dorHead = window.stageHead(dorStage);
    assert(dorHead.indexOf(EXPLAIN_DOR) !== -1, "Agent-Modus DoR-Stage sollte die Erklärung enthalten");
    assert(dorHead.indexOf("This is your Definition of Ready " + EXPLAIN_DOR + " — the contract with the agent") !== -1,
      "Agent-Modus DoR-Stage: bestehender Wortlaut sollte zeichengleich erhalten sein, nur um die Erklärung ergänzt");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Agent-Modus-Erklärungen: " + err.message;
  }
}

function testTeamModeExplanations() {
  const dom = loadGame();
  const { window } = dom;
  try {
    const sc = window.SCENARIOS[0];
    const tstages = window.buildTeamStages(sc);

    const gherkinStage = tstages.filter(function (st) { return st.type === "teamgherkin"; })[0];
    assert(gherkinStage, "Team-Modus sollte eine 'teamgherkin'-Stage haben (Given/When/Then)");
    const gherkinDebrief = window.debriefHTML(gherkinStage);
    assert(gherkinDebrief.indexOf(EXPLAIN_GWT) !== -1, "Team-Modus 'teamgherkin'-Debrief sollte die Given/When/Then-Erklärung enthalten");
    assert(gherkinDebrief.indexOf("Given/When/Then " + EXPLAIN_GWT + " leaves nothing to interpretation") !== -1,
      "Team-Modus 'teamgherkin'-Debrief: bestehender Wortlaut sollte zeichengleich erhalten sein, nur um die Erklärung ergänzt");

    const premortemStage = tstages.filter(function (st) { return st.type === "teamselect" && st.kind === "premortem"; })[0];
    assert(premortemStage, "Team-Modus sollte eine 'teamselect'-Stage mit kind 'premortem' haben");
    const premortemDebrief = window.debriefHTML(premortemStage);
    assert(premortemDebrief.indexOf(EXPLAIN_PREMORTEM) !== -1, "Team-Modus Pre-mortem-Debrief sollte die Erklärung enthalten");
    assert(premortemDebrief.indexOf("A pre-mortem " + EXPLAIN_PREMORTEM + " turns a likely failure") !== -1,
      "Team-Modus Pre-mortem-Debrief: bestehender Wortlaut sollte zeichengleich erhalten sein, nur um die Erklärung ergänzt");

    const dorStage = tstages.filter(function (st) { return st.type === "teamdor"; })[0];
    assert(dorStage, "Team-Modus sollte eine 'teamdor'-Stage haben");
    const dorHead = window.stageHead(dorStage);
    assert(dorHead.indexOf(EXPLAIN_DOR) !== -1, "Team-Modus DoR-Stage sollte die Erklärung enthalten");
    assert(dorHead.indexOf("Your Definition of Ready " + EXPLAIN_DOR) !== -1,
      "Team-Modus DoR-Stage: bestehender Wortlaut sollte zeichengleich erhalten sein, nur um die Erklärung ergänzt");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "Team-Modus-Erklärungen: " + err.message;
  }
}

function testExplanationsNotDuplicatedOrLeaked() {
  try {
    [
      ["Given/When/Then-Erklärung", EXPLAIN_GWT],
      ["Pre-mortem-Erklärung", EXPLAIN_PREMORTEM],
      ["Definition of Ready-Erklärung", EXPLAIN_DOR],
    ].forEach(function (pair) {
      const label = pair[0], phrase = pair[1];
      const count = RAW_SOURCE.split(phrase).length - 1;
      assert.strictEqual(count, 2, label + " sollte im Quelltext genau zweimal vorkommen (einmal Agent-, einmal Team-Modus), tatsächlich: " + count);
    });

    // Explicitly excluded per Scope: the collapsed "What's different here?"
    // mode-picker info boxes must stay untouched by this ticket.
    const modePickerMatch = RAW_SOURCE.match(/function renderModePicker[\s\S]*?\n}/);
    assert(modePickerMatch, "renderModePicker() sollte auffindbar sein");
    const modePickerSrc = modePickerMatch[0];
    [EXPLAIN_GWT, EXPLAIN_PREMORTEM, EXPLAIN_DOR].forEach(function (phrase) {
      assert(modePickerSrc.indexOf(phrase) === -1, "renderModePicker() (Startbildschirm-Infoboxen) sollte laut Scope KEINE der neuen Erklärungen enthalten");
    });

    return null;
  } catch (err) {
    return "Keine Duplizierung/kein Leck in ausgeschlossene Stellen: " + err.message;
  }
}

function main() {
  const failures = [
    testGameVersion(),
    testAgentModeExplanations(),
    testTeamModeExplanations(),
    testExplanationsNotDuplicatedOrLeaked(),
  ].filter(Boolean);

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 4/4 Checks grün (GAME_VERSION erhöht, Agent-Modus-Erklärungen an der richtigen Stelle mit erhaltenem Wortlaut, Team-Modus dito, keine Duplizierung/kein Leck in ausgeschlossene Stellen)");
  process.exit(0);
}

main();
