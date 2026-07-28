/**
 * tests/FEATURE-016.test.js — jsdom tests for the real, clickable T-shirt-size
 * "Estimation" step in Team mode (FEATURE-016) in "Spec or Regret"
 * (public/index.html).
 *
 * Replaces the old narrative-only estimate box (FEATURE-010, folded into the
 * roster screen, fixed formula 2d base + 18/14d role surcharge) with a real,
 * clickable Team-mode step directly after the roster screen: a literal
 * business-ask quote (SC.ticket), then seven Fibonacci-like T-shirt-size
 * buttons (XXS=1 … XXL=21 days, days shown openly on the button). The chosen
 * size is now the SOLE source of the finale's comparison number — the rolled
 * missing role no longer influences it at all (see Backlog.md FEATURE-016,
 * final design 25.07.2026, "keine Rollen-Kopplung mehr"). ROLE_GAP_THREAD's
 * independent +2d consequence on "Your run" is untouched and must keep
 * working exactly as before.
 *
 * These checks stay durably useful for later team-mode tickets too:
 *   1. GAME_VERSION bumped for this visible change.
 *   2. The new step renders after the roster screen: business-ask quote (the
 *      real SC.ticket text, for two different scenarios — not the same text
 *      reused), the size-picker text, all seven size buttons each labelled
 *      with its real day count, and the Continue button starts disabled.
 *   3. Each of the seven sizes drives a full run to the finale and shows the
 *      exact matching Estimation day count (1/2/3/5/8/13/21) — real computed
 *      values via a real click path, not just presence checks.
 *   4. The SAME chosen size gives the SAME Estimation number regardless of
 *      which role was rolled as missing (role-independence) — checked with
 *      "po" missing (which used to carry the highest surcharge) vs "dev".
 *   5. The SAME chosen size gives the SAME Estimation number regardless of
 *      how the rest of the meeting was played (clean vs. every shortcut
 *      taken) — mirrors the FEATURE-010 test's "unaffected by play" proof.
 *   6. The finale label reads "Estimation" (not "Fast start") with a note
 *      "<Size> → <N> day(s)" — no separate breakdown/disclosure element.
 *   7. The new step carries no agent references (text or 🤖).
 *   8. Regression: ROLE_GAP_THREAD's independent +2d consequence on "Your
 *      run" still fires for a missing role, unaffected by which size was
 *      picked.
 *   9. Regression: both Agent-mode occurrences of "The fast start" (Round 1
 *      reveal kicker, Agent-mode finale lbar) are byte-for-byte unchanged —
 *      only the Team-mode finale label was renamed.
 *
 * Ausführen: node tests/FEATURE-016.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
// GAME_VERSION before this ticket (TASK-004: "moved past the known previous
// value" instead of a pinned exact string — see Backlog.md TASK-004).
const KNOWN_PREVIOUS_VERSION = "1.26.0";

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
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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
function solveGherkinPrecisely(window, doc) {
  click(doc, "precise");
  const st = window.STAGES[window.S.i];
  st.scenarios.forEach((sc, si) => {
    sc.lines.forEach((ln, li) => {
      let correctGi = null;
      ln.segs.forEach((seg, gi) => { if (seg.c) correctGi = gi; });
      doc.querySelector('.seg[data-k="' + si + '.' + li + '"][data-g="' + correctGi + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}
function answerSelectCorrectly(window, doc, mode) {
  const s = window.STAGES[window.S.i];
  s.options.forEach((o, idx) => {
    const shouldPick = (mode === "catch") ? o.bad : !o.bad;
    if (shouldPick) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}

// Drives a full Team-mode run from mode-pick to finale for a given rolled
// missing role, chosen T-shirt size and play style (clean/honest vs. every
// shortcut taken). Returns the finale HTML plus the raw data-layer values
// that matter (S.benchmark, TeamState.estimateLabel, S.rework) so callers can
// assert on both the rendered text and the underlying computation.
async function playSizedRun(missingRole, sizeKey, clean) {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  window.pickMissingRoleId = function () { return missingRole; };
  click(doc, "introCta");
  click(doc, "pickTeamMode");
  click(doc, "teamRndBtn");
  click(doc, "teamStartBtn");

  click(doc, "teamNext"); // roster -> teamestimate (NEW, FEATURE-016)
  pickTshirtAndContinue(window, doc, sizeKey); // teamestimate -> map

  if (clean) {
    sortMapHonestly(window, doc);
    click(doc, "nextBtn"); // -> bizvalue fork (po) or gherkin (others)
    if (missingRole === "po") { click(doc, "tSolid"); await wait(700); click(doc, "nextBtn"); }
    solveGherkinPrecisely(window, doc);
    click(doc, "nextBtn"); // -> question fork
    click(doc, "tSolid"); await wait(700);
    click(doc, "nextBtn"); // -> premortemSkip fork
    click(doc, "tSolid"); await wait(700);
    click(doc, "nextBtn"); // -> premortem
    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR
    click(doc, "markAll");
    click(doc, "dorContinue");
    click(doc, "nextBtn"); // -> teamimpl
  } else {
    const tick0 = window.__intervalFns[window.__intervalFns.length - 1];
    for (let i = 0; i < 69; i++) tick0(); // map timeout, nothing sorted
    click(doc, "nextBtn"); // -> bizvalue fork (po) or gherkin (others)
    if (missingRole === "po") { click(doc, "tTempt"); await wait(700); click(doc, "nextBtn"); }
    click(doc, "vagueChoice"); await wait(600);
    click(doc, "nextBtn"); // -> question fork
    click(doc, "tTempt"); await wait(700);
    click(doc, "nextBtn"); // -> premortemSkip fork
    click(doc, "tSolid"); await wait(700); // keep pre-mortem itself played (isolates the role-gap thread)
    click(doc, "nextBtn"); // -> premortem
    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR
    click(doc, "markAll");
    click(doc, "dorContinue");
    click(doc, "nextBtn"); // -> teamimpl
  }

  click(doc, "handoff");
  await wait(2500);
  click(doc, "nextBtn"); // -> finale
  const html = doc.getElementById("stageHost").innerHTML;
  const result = {
    html,
    benchmark: window.S.benchmark,
    label: window.TeamState.estimateLabel,
    rework: window.S.rework.slice(),
  };
  dom.window.close();
  return result;
}

async function main() {
  const failures = [];
  const SIZES = [
    { key: "xxs", label: "XXS", days: 1 },
    { key: "xs", label: "XS", days: 2 },
    { key: "s", label: "S", days: 3 },
    { key: "m", label: "M", days: 5 },
    { key: "l", label: "L", days: 8 },
    { key: "xl", label: "XL", days: 13 },
    { key: "xxl", label: "XXL", days: 21 },
  ];

  // Test 1: GAME_VERSION wurde für dieses sichtbare Feature erhöht.
  try {
    const dom = loadGame();
    assert.notStrictEqual(dom.window.GAME_VERSION, KNOWN_PREVIOUS_VERSION, "GAME_VERSION sollte gegenüber " + KNOWN_PREVIOUS_VERSION + " erhöht worden sein");
    dom.window.close();
  } catch (err) { failures.push("GAME_VERSION: " + err.message); }

  // Test 2: Der neue Schritt zeigt Business-Text (echtes sc.ticket-Zitat für
  // zwei UNTERSCHIEDLICHE Szenarien), Schätz-Text und alle 7 Größen-Buttons
  // mit korrekter Tage-Zahl; der Fortsetzen-Button ist vor der Wahl deaktiviert.
  try {
    for (const idx of [0, 1]) {
      const dom = loadGame();
      const { window } = dom;
      const doc = window.document;
      click(doc, "introCta");
      click(doc, "pickTeamMode");
      pickScenario(window, doc, idx);
      click(doc, "teamNext"); // roster -> teamestimate
      const html = doc.getElementById("stageHost").innerHTML;
      const expectedTicket = window.SCENARIOS[idx].ticket;
      assert(html.indexOf(expectedTicket) !== -1, "Business-Text sollte das echte ticket-Zitat von Szenario " + idx + " zeigen (" + expectedTicket + ")");
      SIZES.forEach((sz) => {
        const btn = doc.querySelector('.tshirtopt[data-key="' + sz.key + '"]');
        assert(btn, "Button für Größe " + sz.key + " sollte existieren");
        assert(btn.textContent.indexOf(sz.label) !== -1, "Button " + sz.key + " sollte sein Label zeigen");
        assert(btn.textContent.indexOf(String(sz.days)) !== -1, "Button " + sz.key + " sollte seine Tage-Zahl (" + sz.days + ") offen zeigen");
      });
      const nextBtn = doc.getElementById("teamEstNext");
      assert(nextBtn, "Fortsetzen-Button sollte existieren");
      assert.strictEqual(nextBtn.disabled, true, "Fortsetzen-Button sollte vor einer Größenwahl deaktiviert sein");
      dom.window.close();
    }
  } catch (err) { failures.push("Neuer Schritt: Business-/Schätz-Text + 7 Buttons: " + err.message); }

  // Test 3 + 4: für jede der 7 Größen ein kompletter Lauf; Estimation zeigt
  // exakt die zugehörige Tage-Zahl. Läuft mit fester Rolle ("dev") für
  // Geschwindigkeit — Rollen-Unabhängigkeit wird separat unten geprüft.
  const runsBySize = {};
  for (const sz of SIZES) {
    try {
      const r = await playSizedRun("dev", sz.key, true);
      assert.strictEqual(r.benchmark, sz.days, "Größe " + sz.key + " sollte S.benchmark=" + sz.days + " ergeben, tatsächlich " + r.benchmark);
      const dayWord = sz.days === 1 ? "day" : "days";
      const expectedNote = sz.label + " → " + sz.days + " " + dayWord;
      assert(r.html.indexOf(expectedNote) !== -1, "Finale sollte die Notiz '" + expectedNote + "' für Größe " + sz.key + " zeigen");
      runsBySize[sz.key] = r;
    } catch (err) { failures.push("Größe " + sz.key + " liefert korrekte Estimation: " + err.message); }
  }

  // Test 5: Rollen-Unabhängigkeit — dieselbe gewählte Größe (xxs) ergibt mit
  // "po" fehlend (frühere Formel: höchster Aufschlag) exakt denselben Wert
  // wie mit "dev" fehlend.
  try {
    const withPo = await playSizedRun("po", "xxs", true);
    const withDev = runsBySize.xxs;
    assert.strictEqual(withPo.benchmark, 1, "xxs + PO fehlt sollte trotzdem 1 Tag ergeben");
    assert.strictEqual(withPo.benchmark, withDev.benchmark, "Dieselbe Größe sollte unabhängig von der gewürfelten fehlenden Rolle denselben Estimation-Wert ergeben");
  } catch (err) { failures.push("Rollen-Unabhängigkeit: " + err.message); }

  // Test 6: Spielverhalten-Unabhängigkeit — dieselbe gewählte Größe (m) ergibt
  // bei einem sauberen Lauf und bei einem durchgängig schlechten Lauf exakt
  // denselben Estimation-Wert.
  try {
    const cleanRun = runsBySize.m;
    const badRun = await playSizedRun("dev", "m", false);
    assert.strictEqual(cleanRun.benchmark, 5);
    assert.strictEqual(badRun.benchmark, 5, "Ein durchgängig schlechter Lauf sollte TROTZDEM 5 Tage Estimation zeigen (Größe m)");
    assert(cleanRun.html.indexOf("M → 5 days") !== -1 && badRun.html.indexOf("M → 5 days") !== -1, "Beide Läufe sollten 'M → 5 days' in der Estimation-Zeile zeigen");
  } catch (err) { failures.push("Spielverhalten-Unabhängigkeit: " + err.message); }

  // Test 7: Finale-Label heißt "Estimation" (nicht "Fast start"), Notiz zeigt
  // "<Größe> → <Tage> day(s)".
  try {
    const r = runsBySize.m;
    assert(r.html.indexOf("Estimation") !== -1, "Finale sollte das Label 'Estimation' zeigen");
    assert(r.html.indexOf("The fast start") === -1, "Finale sollte NICHT mehr 'The fast start' zeigen (Team-Modus)");
    assert.strictEqual(r.label, "M", "TeamState.estimateLabel sollte 'M' sein");
    assert(r.html.indexOf("M → 5 days") !== -1, "Notiz sollte exakt 'M → 5 days' zeigen");
  } catch (err) { failures.push("Finale-Label 'Estimation': " + err.message); }

  // Test 8: kein Agentenbezug (Text/🤖) im neuen Schritt.
  try {
    const dom = loadGame();
    const { window } = dom;
    const doc = window.document;
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");
    click(doc, "teamNext"); // -> teamestimate
    const html = doc.getElementById("stageHost").innerHTML;
    assert(html.indexOf("🤖") === -1, "Der neue Schritt sollte kein 🤖-Symbol zeigen");
    assert(html.toLowerCase().indexOf("agent") === -1, "Der neue Schritt sollte keinen Agentenbezug im Text haben");
    dom.window.close();
  } catch (err) { failures.push("Kein Agentenbezug im neuen Schritt: " + err.message); }

  // Test 9: Regression — ROLE_GAP_THREAD wirkt weiterhin unabhängig von der
  // gewählten Größe (2 unterschiedliche Größen, gleiche fehlende Rolle "po").
  try {
    const runA = await playSizedRun("po", "xxs", true); // 1 day estimation
    const runB = await playSizedRun("po", "xxl", true); // 21 days estimation
    [runA, runB].forEach((r, i) => {
      const gapEntry = r.rework.filter((x) => x.item.indexOf("Product Owner wasn’t in the meeting") !== -1 || x.item.indexOf("Product Owner") !== -1);
      assert(gapEntry.length >= 1, "Lauf " + i + " sollte einen ROLE_GAP_THREAD-Rework-Eintrag für die fehlende PO-Rolle haben");
      assert.strictEqual(gapEntry[0].days, 2, "ROLE_GAP_THREAD sollte weiterhin +2 Tage kosten, unabhängig von der gewählten Größe");
    });
    assert.strictEqual(runA.benchmark, 1);
    assert.strictEqual(runB.benchmark, 21);
  } catch (err) { failures.push("ROLE_GAP_THREAD-Regression: " + err.message); }

  // Test 10: Regression — beide Agenten-Modus-Vorkommen von "The fast start"
  // bleiben wortwörtlich unverändert (Round-1-Reveal-Kicker, Agenten-Finale).
  try {
    const dom = loadGame();
    const { window } = dom;
    const doc = window.document;
    click(doc, "introCta");
    click(doc, "pickAgentMode");
    const sc = window.SCENARIOS[0];
    const stages = window.buildStages(sc);
    const revealStage = stages.filter((st) => st.type === "reveal")[0];
    assert.strictEqual(revealStage.kicker, "The fast start", "Agenten-Modus-Reveal-Kicker sollte unverändert 'The fast start' bleiben");
    dom.window.close();
  } catch (err) { failures.push("Agenten-Modus 'The fast start' unverändert: " + err.message); }

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 10/10 Checks grün (Version, Business-/Schätz-Text + 7 Buttons für 2 Szenarien, 7 Größen -> korrekte Estimation, Rollen-Unabhängigkeit, Spielverhalten-Unabhängigkeit, 'Estimation'-Label, kein Agentenbezug, ROLE_GAP_THREAD-Regression, Agenten-Modus unverändert)");
  process.exit(0);
}

main();
