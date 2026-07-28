/**
 * tests/FEATURE-018.test.js — jsdom tests for the Team-mode "teamgherkin"
 * step ("Team · 5" / kicker "Spell it out") intro text in "Spec or Regret"
 * (public/index.html).
 *
 * Root cause (see FEATURE-018 spec in Backlog.md): the step's intro ("setup")
 * text used to be a single hardcoded string, identical across all 21
 * scenarios, giving players no sense of which ticket/topic the shown draft
 * statement ("The user gets a reasonable error message when approval fails.")
 * actually belongs to. The fix ties the intro to the currently played
 * scenario via the already-existing sc.short field (same pattern already
 * used in Agent-mode Round 1 / the Team-mode scenario picker) — the vague
 * example sentence itself stays untouched by design (Konzept-Team-Modus.md,
 * "Shortcut C"), only the framing around it changes. Title, kicker, mcode,
 * both choice controls (vague checkbox / "Make it precise instead" button)
 * and the debrief text are unchanged.
 *
 * These checks stay durably useful for later tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. For several different scenarios, the rendered intro text names that
 *      scenario's real sc.short topic AND still contains the unchanged vague
 *      example sentence — real computed values via a real click path, not
 *      just a static string check.
 *   3. Two different scenarios produce two DIFFERENTLY worded intros (proves
 *      the text is actually scenario-specific, not still a shared constant).
 *   4. Both existing choice controls (vague checkbox, "Make it precise
 *      instead" button) are still present and unchanged in this step.
 *   5. Regression: the Agent-mode "build" step (its own, unrelated intro
 *      text) is untouched by this change.
 *
 * Ausführen: node tests/FEATURE-018.test.js
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

function pickScenario(window, doc, idx) {
  const opt = doc.querySelector('#teamScenlist .scenopt[data-idx="' + idx + '"]');
  assert(opt, "Szenario-Kachel " + idx + " sollte existieren");
  opt.dispatchEvent(new window.Event("click", { bubbles: true }));
  click(doc, "teamStartBtn");
}

function pickTshirtAndContinue(window, doc, key) {
  const opt = doc.querySelector('.tshirtopt[data-key="' + key + '"]');
  assert(opt, 'T-Shirt-Option "' + key + '" sollte im DOM existieren');
  opt.dispatchEvent(new window.Event("click", { bubbles: true }));
  click(doc, "teamEstNext");
}

function sortMapHonestly(window, doc) {
  const st = window.STAGES[window.S.i];
  Array.from(doc.querySelectorAll(".item")).forEach((el) => {
    el.dispatchEvent(new window.Event("click", { bubbles: true }));
    const idx = el.dataset.idx;
    const c = st.items[idx].c;
    const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
    doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
}

// Drives a Team-mode run from mode-pick up to (but not past) the
// "teamgherkin" step for a given scenario index, with "dev" forced as the
// missing role so no bizvalue fork is inserted before gherkin (keeps the
// click path identical for every scenario). Returns the doc + window plus
// the rendered stageHost HTML at that step.
function reachGherkinStage(idx) {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return "dev"; };
  click(doc, "introCta");
  click(doc, "pickTeamMode");
  pickScenario(window, doc, idx);
  click(doc, "teamNext"); // roster -> teamestimate
  pickTshirtAndContinue(window, doc, "m"); // teamestimate -> map
  sortMapHonestly(window, doc);
  click(doc, "nextBtn"); // map -> teamgherkin (dev missing, no bizvalue fork)
  const st = window.STAGES[window.S.i];
  assert.strictEqual(st.type, "teamgherkin", "sollte jetzt bei der 'teamgherkin'-Stage stehen");
  const html = doc.getElementById("stageHost").innerHTML;
  return { dom, window, doc, html };
}

function main() {
  const failures = [];
  const VAGUE_SENTENCE = "The user gets a reasonable error message when approval fails.";

  // Test 1: GAME_VERSION wurde für diese sichtbare Änderung erhöht.
  try {
    const { dom, window } = reachGherkinStage(0);
    assert.strictEqual(window.GAME_VERSION, "1.28.3", "GAME_VERSION sollte auf 1.28.3 stehen");
    dom.window.close();
  } catch (err) { failures.push("GAME_VERSION: " + err.message); }

  // Test 2: für mehrere unterschiedliche Szenarien nennt der Einleitungstext
  // das jeweils echte sc.short-Thema UND enthält weiterhin unverändert den
  // vagen Beispielsatz.
  const IDXS = [0, 5, 11];
  const introsByIdx = {};
  try {
    IDXS.forEach((idx) => {
      const { dom, window, html } = reachGherkinStage(idx);
      const expectedShort = window.SCENARIOS[idx].short;
      assert(html.indexOf(expectedShort) !== -1,
        "Einleitungstext bei Szenario " + idx + " sollte das echte Thema (" + expectedShort + ") nennen");
      assert(html.indexOf(VAGUE_SENTENCE) !== -1,
        "Einleitungstext bei Szenario " + idx + " sollte weiterhin unverändert den vagen Beispielsatz zeigen");
      introsByIdx[idx] = html;
      dom.window.close();
    });
  } catch (err) { failures.push("Themenbezug + unveränderter Beispielsatz: " + err.message); }

  // Test 3: zwei unterschiedliche Szenarien erzeugen tatsächlich UNTERSCHIEDLICH
  // formulierte Einleitungen (beweist Themenbezug, nicht weiterhin ein
  // gemeinsamer, fester Textbaustein).
  try {
    assert.notStrictEqual(introsByIdx[0], introsByIdx[5],
      "Szenario 0 und Szenario 5 sollten unterschiedliche Einleitungstexte zeigen");
  } catch (err) { failures.push("Themenspezifisch statt weiterhin generisch: " + err.message); }

  // Test 4: beide bestehenden Wahlmöglichkeiten sind weiterhin vorhanden und
  // unverändert (vage-Checkbox-Text, "Make it precise instead"-Button).
  try {
    const { dom, doc } = reachGherkinStage(0);
    const vagueEl = doc.getElementById("vagueChoice");
    assert(vagueEl, "Die 'vage lassen'-Auswahl sollte weiterhin existieren");
    assert(vagueEl.textContent.indexOf("Keep it vague") !== -1, "Vage-Auswahl-Text sollte unverändert sein");
    const preciseBtn = doc.getElementById("precise");
    assert(preciseBtn, "Der 'Make it precise instead'-Button sollte weiterhin existieren");
    assert(preciseBtn.textContent.indexOf("Make it precise instead") !== -1, "Precise-Button-Text sollte unverändert sein");
    dom.window.close();
  } catch (err) { failures.push("Beide Wahlmöglichkeiten unverändert: " + err.message); }

  // Test 5: Regression — der Agenten-Modus-"build"-Schritt (eigener,
  // unabhängiger Einleitungstext) bleibt von dieser Änderung unberührt.
  try {
    const dom = loadGame();
    const { window } = dom;
    const sc = window.SCENARIOS[0];
    const stages = window.buildStages(sc);
    const buildStage = stages.filter((st) => st.type === "build")[0];
    assert(buildStage.setup.indexOf("Spell out what should happen") !== -1,
      "Agenten-Modus-'build'-Einleitungstext sollte unverändert bleiben (nicht Teil dieses Tickets)");
    dom.window.close();
  } catch (err) { failures.push("Agenten-Modus 'build'-Schritt unberührt: " + err.message); }

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 5/5 Checks grün (Version, Themenbezug + unveränderter Beispielsatz für 3 Szenarien, Themenspezifisch, beide Wahlmöglichkeiten unverändert, Agenten-Modus-Regression)");
  process.exit(0);
}

main();
