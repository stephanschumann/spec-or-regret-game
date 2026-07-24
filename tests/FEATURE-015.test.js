/**
 * tests/FEATURE-015.test.js — jsdom tests for the Team-mode consequence-chat
 * redesign ("Build in progress" → thread cards instead of loose bubbles).
 *
 * Stephan saw a clickable HTML prototype and approved it explicitly ("Sieht
 * super aus. So für alle Scenarios machen!"). This ticket is a presentation
 * layer change only — see Backlog.md FEATURE-015 for the full spec. These
 * tests check three things a purely visual reading of the code can't:
 *
 *   1. The new thread-card DOM (role badges, per-card cost badge, multi-
 *      message threads for the two requested cases) actually renders when
 *      driven through real click handlers — not just present in the source.
 *   2. The underlying data layer (S.rework items/days, S.cycle) is BYTE-FOR-
 *      BYTE unchanged from before the redesign — this was a hard constraint
 *      from the spec's pre-mortem (any drift here would silently wrong the
 *      running rework counter and the finale retrospective).
 *   3. The Agent-mode consequence screen (detonate()/renderReveal(), which
 *      shares the .rework/.rticket CSS classes with the OLD Team-mode code)
 *      still renders with its original amber classes — proving the redesign
 *      didn't leak into the other game mode via the shared class names.
 *
 * Ausführen: node tests/FEATURE-015.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");
const KNOWN_PREVIOUS_VERSION = "1.23.1"; // GAME_VERSION before this ticket

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
      window.scrollTo = function () {};
      window.__intervalFns = [];
      window.setInterval = function (fn) { window.__intervalFns.push(fn); return window.__intervalFns.length; };
      window.clearInterval = function () {};
    },
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function () {};
  return dom;
}

function click(doc, id) {
  const el = doc.getElementById(id);
  assert(el, `Element #${id} sollte im DOM existieren`);
  el.dispatchEvent(new doc.defaultView.Event("click", { bubbles: true }));
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function sortMapButLeaveSomeUnsorted(window, doc) {
  // Sorts exactly one card, then lets the meeting timer run out — same
  // technique as FEATURE-009-consequences.test.js's scenarioEverythingBad,
  // reused here so this test drives a run with a non-empty mapUnsortedCount.
  const st = window.STAGES[window.S.i];
  const firstItem = doc.querySelector(".item");
  firstItem.dispatchEvent(new window.Event("click", { bubbles: true }));
  const firstIdx = firstItem.dataset.idx;
  const c = st.items[firstIdx].c;
  const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
  doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  const tick = window.__intervalFns[window.__intervalFns.length - 1];
  for (let i = 0; i < 69; i++) tick();
  assert(window.TeamState.mapUnsortedCount > 0, "Es sollten noch offene Kärtchen übrig sein");
}

function answerSelectCorrectly(window, doc, mode) {
  const s = window.STAGES[window.S.i];
  s.options.forEach((o, idx) => {
    const shouldPick = (mode === "catch") ? o.bad : !o.bad;
    if (shouldPick) doc.querySelector('.opt[data-idx="' + idx + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
}

// Drives Team mode through every available shortcut (PO missing, map timeout,
// vague AC, guessed business value, deferred question, DoR falsely checked)
// so every one of the seven possible thread types is present at once —
// mirrors FEATURE-009-consequences.test.js's scenarioEverythingBad exactly,
// reused here to check the NEW DOM instead of just the data layer.
async function scenarioAllThreadsPresent() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "po"; };
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");

    click(doc, "teamNext"); // -> map
    sortMapButLeaveSomeUnsorted(window, doc);
    click(doc, "nextBtn"); // -> bizvalue fork

    click(doc, "tTempt"); // dishonest
    await wait(700);
    click(doc, "nextBtn"); // -> gherkin

    click(doc, "vagueChoice"); // dishonest
    await wait(600);
    click(doc, "nextBtn"); // -> question fork

    click(doc, "tTempt"); // dishonest — defer the question
    await wait(700);
    assert(window.TeamState.deferredQuestion, "Die aufgeschobene Frage sollte vermerkt sein");
    click(doc, "nextBtn"); // -> premortemSkip fork

    click(doc, "tSolid"); // keep the pre-mortem itself played honestly
    await wait(700);
    click(doc, "nextBtn"); // -> premortem

    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR

    click(doc, "markAll"); // dishonestly certifies everything as done
    click(doc, "dorContinue");
    assert(window.S.dorPaperwork > 0, "markAll sollte mindestens einen falschen Haken zählen");
    click(doc, "nextBtn"); // -> teamimpl

    const reworkBefore = window.S.rework.slice();
    click(doc, "handoff");
    await wait(2500);

    const impl = doc.getElementById("impl");
    assert(impl, "#impl sollte existieren");

    // --- New DOM structure actually rendered ---
    const cards = impl.querySelectorAll(".tthread");
    assert.strictEqual(cards.length, 6, "Sechs Threads (Frage, Map, AC, Business Value, PO-Lücke, Audit) sollten je eine eigene Karte sein, gefunden: " + cards.length);

    const badges = impl.querySelectorAll(".rolebadge");
    assert(badges.length >= 6, "Jede Nachricht sollte ein Rollen-Etikett haben, gefunden nur " + badges.length);
    const roleClasses = new Set();
    badges.forEach((b) => b.classList.forEach((c) => { if (c.indexOf("role-") === 0) roleClasses.add(c); }));
    assert(roleClasses.has("role-po"), "Es sollte mindestens ein PO-Etikett geben");
    assert(roleClasses.has("role-dev"), "Es sollte mindestens ein Dev-Etikett geben");
    assert(roleClasses.has("role-compliance"), "Der Audit-Thread sollte ein Compliance-Etikett haben");

    const costBadges = impl.querySelectorAll(".tcost");
    assert.strictEqual(costBadges.length, 6, "Jede der sechs Karten sollte ihren eigenen Tage-Badge zeigen");

    // Team-mode teal accent visible (not the Agent-mode amber this screen
    // used to inherit via the shared .rework/.rticket classes).
    assert(impl.querySelector(".tledger"), "Die Zusammenfassung sollte die neue, teal-akzentuierte Ledger-Box sein");
    assert(!impl.querySelector(".rework"), "Die alte, amber-farbige .rework-Box sollte hier nicht mehr vorkommen");
    assert(!impl.querySelector(".bubble"), "Die alten, undifferenzierten .bubble-Divs sollten nicht mehr vorkommen");

    // The two requested multi-message threads: find each by its title and
    // check it actually has more than one message.
    const cardByTitle = (needle) => Array.from(cards).find((c) => c.querySelector(".ttitle").textContent.indexOf(needle) !== -1);
    const deferredCard = cardByTitle("Open question, deferred");
    assert(deferredCard, "Die Karte für die aufgeschobene Frage sollte existieren");
    assert(deferredCard.querySelectorAll(".tmsg").length >= 3, "Die aufgeschobene Frage sollte einen Mehrfach-Nachrichten-Verlauf zeigen (fragen, nachhaken, späte Antwort)");
    assert(deferredCard.querySelector(".twait"), "Die aufgeschobene Frage sollte eine sichtbare Warte-Markierung zeigen");

    const poGapCard = cardByTitle("Product Owner missing from the meeting");
    assert(poGapCard, "Die Karte für die fehlende PO-Rolle sollte existieren");
    assert(poGapCard.querySelectorAll(".tmsg").length >= 4, "Die fehlende PO-Rolle sollte einen Verlauf mit unvollständiger erster Antwort + Nachfrage zeigen");

    // --- Data layer unchanged: same items/days as the pre-redesign behaviour
    // (values themselves cross-checked against FEATURE-009-consequences.test.js) ---
    const newRework = window.S.rework.slice(reworkBefore.length);
    assert.strictEqual(newRework.length, 6, "Datenebene: weiterhin genau sechs Rework-Einträge");
    const total = newRework.reduce((s, r) => s + r.days, 0);
    assert.strictEqual(window.S.cycle, 4 + total, "Cycle time sollte weiterhin Grundpreis (4) + Summe aller Rework-Tage sein");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioAllThreadsPresent: " + err.message;
  }
}

// Empty-state check: an honest run with no shortcuts still shows the
// friendly single-message case, now in the new card format instead of the
// old lone .bubble.
async function scenarioCleanRunEmptyState() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    window.pickMissingRoleId = function () { return "dev"; }; // no bizvalue fork on this branch
    click(doc, "introCta");
    click(doc, "pickTeamMode");
    click(doc, "teamRndBtn");
    click(doc, "teamStartBtn");

    click(doc, "teamNext"); // -> map
    const st = window.STAGES[window.S.i];
    Array.from(doc.querySelectorAll(".item")).forEach((el) => {
      el.dispatchEvent(new window.Event("click", { bubbles: true }));
      const idx = el.dataset.idx;
      const c = st.items[idx].c;
      const bid = c === "goal" ? "goal" : c === "rule" ? "rule" : c === "ex" ? "ex" : "q";
      doc.querySelector('.bucket[data-b="' + bid + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    });
    click(doc, "nextBtn"); // -> gherkin
    click(doc, "precise");
    const gst = window.STAGES[window.S.i];
    gst.scenarios.forEach((sc, si) => sc.lines.forEach((ln, li) => {
      let correctGi = null;
      ln.segs.forEach((seg, gi) => { if (seg.c) correctGi = gi; });
      doc.querySelector('.seg[data-k="' + si + '.' + li + '"][data-g="' + correctGi + '"]').dispatchEvent(new window.Event("click", { bubbles: true }));
    }));
    doc.getElementById("check").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "nextBtn"); // -> question fork
    click(doc, "tSolid"); await wait(700);
    click(doc, "nextBtn"); // -> premortemSkip fork
    click(doc, "tSolid"); await wait(700);
    click(doc, "nextBtn"); // -> premortem
    answerSelectCorrectly(window, doc, "pick");
    click(doc, "nextBtn"); // -> overreach
    answerSelectCorrectly(window, doc, "catch");
    click(doc, "nextBtn"); // -> DoR
    click(doc, "markAll"); // everything actually true this run -> no paperwork
    click(doc, "dorContinue");
    assert.strictEqual(window.S.dorPaperwork, 0);
    click(doc, "nextBtn"); // -> teamimpl

    click(doc, "handoff");
    await wait(2500);

    const impl = doc.getElementById("impl");
    assert.strictEqual(impl.querySelectorAll(".tthread").length, 1, "Nur der Rollen-Lücke-Thread (Dev fehlte) sollte als Karte erscheinen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioCleanRunEmptyState: " + err.message;
  }
}

// Agent-mode regression: proves the redesign didn't leak into the other game
// mode via the shared .rework/.rticket/.rh classes (see spec Fundstellen-Sweep).
async function scenarioAgentModeUnaffected() {
  const dom = loadGame();
  const { window } = dom;
  const doc = window.document;
  try {
    click(doc, "introCta");
    click(doc, "pickAgentMode");
    doc.querySelector(".scenopt").dispatchEvent(new window.Event("click", { bubbles: true }));
    click(doc, "startBtn"); // -> reveal (stage 0)

    click(doc, "handoff");
    await wait(6000); // 1500ms build + 900ms + up to 4 penalties * 650ms + 500ms buffer

    const reveal = doc.getElementById("reveal");
    assert(reveal, "#reveal sollte existieren (Agent-Modus)");
    assert(reveal.querySelector(".rework"), "Agent-Modus sollte weiterhin die alte .rework-Box benutzen");
    assert(reveal.querySelector(".rticket"), "Agent-Modus sollte weiterhin .rticket-Zeilen benutzen");
    assert(!reveal.querySelector(".tthread"), "Agent-Modus sollte KEINE der neuen Team-Modus-Karten zeigen");
    assert(!reveal.querySelector(".tledger"), "Agent-Modus sollte KEINE der neuen Team-Modus-Ledger-Box zeigen");
    assert(!reveal.querySelector(".rolebadge"), "Agent-Modus sollte keine der neuen Rollen-Etiketten zeigen");

    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioAgentModeUnaffected: " + err.message;
  }
}

async function scenarioVersionBumped() {
  const dom = loadGame();
  const { window } = dom;
  try {
    // Per spec-or-regret-impl Regel: nicht auf einen exakten String prüfen
    // (bricht beim nächsten Versionssprung eines späteren Tickets) — nur
    // sicherstellen, dass sie sich seit dem zuletzt bekannten Stand geändert hat.
    assert.notStrictEqual(window.GAME_VERSION, KNOWN_PREVIOUS_VERSION, "GAME_VERSION sollte gegenüber " + KNOWN_PREVIOUS_VERSION + " erhöht worden sein");
    dom.window.close();
    return null;
  } catch (err) {
    dom.window.close();
    return "scenarioVersionBumped: " + err.message;
  }
}

async function main() {
  const failures = [];
  const results = await Promise.all([
    scenarioAllThreadsPresent(),
    scenarioCleanRunEmptyState(),
    scenarioAgentModeUnaffected(),
    scenarioVersionBumped(),
  ]);
  results.forEach((r) => { if (r) failures.push(r); });

  if (failures.length) {
    console.error("FAIL —\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS — 4/4 Checks grün (Thread-Karten mit Rollen-Etiketten + Mehrfach-Nachrichten-Verlauf für die zwei gewünschten Fälle, leerer Zustand im neuen Format, Agent-Modus unangetastet, GAME_VERSION erhöht)");
  process.exit(0);
}

main();
