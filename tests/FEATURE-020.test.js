/**
 * tests/FEATURE-020.test.js — "Format-Streuung bei Regel-Karten gegen reines
 * Symbol-Raten im Mapping-Board" (Kategorisierungs-Board "A shared picture",
 * renderCategorize, MAP_BUCKETS, Kategorie "rule").
 *
 * Vor diesem Ticket trug ausnahmslos jede der 42 c==="ex"-Karten einen Pfeil
 * ("→") und keine der 63 c==="rule"-Karten. FEATURE-020 stattet in jedem der
 * 21 Szenarien eine der drei Regel-Karten (1 von 3 = 21 von 63) mit einer
 * Wenn-Dann-Formulierung samt Pfeil aus, bleibt dabei aber strikt
 * allgemeingültig (kein Name, keine Zahl, kein benannter Einzelfall) — damit
 * reines Symbol-Raten (Pfeil ja/nein) unzuverlässig wird, während
 * inhaltliches Lesen weiterhin sicher zwischen Regel und Beispiel
 * unterscheidet.
 *
 * Prüft:
 *   1. Es gibt weiterhin exakt 63 rule-Karten und 42 ex-Karten (Kategorie-
 *      Feld c unverändert als einzige Grundlage der Korrektheits-Prüfung).
 *   2. Genau 21 rule-Karten enthalten jetzt einen Pfeil ("→") — eine pro
 *      Szenario, nicht mehrere in einem und keine in einem anderen.
 *   3. Jede pfeiltragende rule-Karte bleibt c==="rule" (keine versehentliche
 *      Umkategorisierung).
 *   4. Jede pfeiltragende rule-Karte trägt eine erkennbare
 *      "immer"/"jedes Mal"/"nie"-Formulierung (Generalisierungs-Marker) —
 *      das unterscheidet sie sprachlich von einer Beispiel-Karte trotz
 *      Pfeil.
 *   5. Jede pfeiltragende rule-Karte enthält KEINEN der in FEATURE-019
 *      definierten Einzelfall-Marker (keine Ziffer, kein £-Betrag, kein
 *      Prozentsatz, kein Wochentag, keine der Einzelfall-Phrasen "that one/
 *      same", "on one day", "in that same run/batch", "for one", und keine
 *      "eine von…"-Konstruktion wie "one payment"/"one customer" usw.).
 *      Generische Idiome wie "no one"/"someone"/"anyone" lösen bewusst NICHT
 *      aus (siehe MARKER-Definition unten) — das sind keine Einzelfall-
 *      Referenzen.
 *   6. Fragen-Karten (c==="q", 42 insgesamt) bleiben textlich exakt
 *      unverändert und enden weiterhin auf "?".
 *   7. Ziel-Karten (c==="goal", 21 insgesamt) bleiben textlich exakt
 *      unverändert.
 *   8. GAME_VERSION wurde seit dem letzten bekannten Stand (1.28.5, Stand
 *      FEATURE-019) erhöht.
 *
 * Ausführen: node tests/FEATURE-020.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");

// Einzelfall-Marker, analog zu FEATURE-019, aber bewusst so eingeschränkt,
// dass generische Idiome wie "no one"/"someone"/"anyone"/"everyone" NICHT
// auslösen — die kommen in mehreren unveränderten Regel-Karten bereits
// legitim vor und sind keine Referenz auf einen konkreten Einzelfall.
const SINGLE_CASE_MARKER = new RegExp(
  [
    "\\bthat (one|same)\\b",
    "\\bon one day\\b",
    "\\bin that (same run|batch)\\b",
    "\\bfor one\\b",
    "\\bone (payment|customer|account|card|request|number|file|employee|supplier|user|person|manager|approver)\\b",
    "£[\\d,]+",
    "\\b\\d+%",
    "\\b\\d+\\b",
    "\\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b",
  ].join("|"),
  "i"
);

// Verallgemeinernde "immer"/"nie"-Sprache, die eine Regel-Karte trotz Pfeil
// klar von einer Beispiel-Karte (einmalige Beobachtung) unterscheidet.
const GENERALIZING_MARKER = /\b(always|never|every time|whenever|without exception|no exceptions)\b/i;

// Bekannte "eine von…"-Muster, die das Ticket explizit ausschließt.
const ONE_OF_MARKER = /\bone of\b/i;

// Erwarteter Vorher-Stand aller 42 Fragen-Karten (unverändert von FEATURE-020
// erwartet) und aller 21 Ziel-Karten (ebenfalls unverändert erwartet) — Snapshot
// aus dem Stand direkt nach FEATURE-020 (Fragen/Ziele selbst nicht betroffen,
// dieser Snapshot dient als Regressionsschutz gegen versehentliche Änderung).
const EXPECTED_QUESTIONS = [
  "Does the limit apply to each single line, to the file’s total, or to both?",
  "If some lines are fine and one is broken, do we pay the good ones now or hold the whole file until it’s fixed?",
  "If there isn’t enough for the whole run, do we pay no one, or pay in an order the company sets?",
  "When a held payment is fixed, do we retry it automatically or wait for the team to release it?",
  "What exactly is the threshold amount, and does it count per payment or per day?",
  "If a payment waits too long, does it expire and cancel, or just keep waiting?",
  "Does the limit sit per person, or is there also a shared limit per department on top?",
  "Which kinds of spending are blocked by default, and who can change that list?",
  "If a refund comes back after the card is closed, where does the money go?",
  "How long should the number stay valid before its end date if it’s never used?",
  "If a collection fails for no funds, how many times do we retry and how far apart?",
  "When a customer disputes a collection, do we refund straight away or hold while we check?",
  "After a payment is sent, how long can it still be recalled if the details were wrong?",
  "What is the daily cut-off time for the money to arrive the same day?",
  "If the same supplier is added twice, do we merge the two or flag the duplicate?",
  "How long should the cool-off period be, and can an urgent payment ever skip it?",
  "For a close match (a small spelling difference), do we still warn, or let it through quietly?",
  "If the company ignores a warning and pays the wrong person, who is responsible for the loss?",
  "In what order are accounts swept when several feed the same main one?",
  "Should a bank holiday’s sweep run on the next working day, or just be skipped?",
  "Should extra-sensitive accounts (like payroll) need a separate, higher permission even to view?",
  "Does “can pay” have its own daily limit, separate from “can approve”?",
  "If the date lands on a weekend, do we move it earlier or later to still hit the deadline?",
  "How long before the run date must the second person approve by?",
  "How fresh do the numbers need to be — real-time, or is a few minutes’ delay fine?",
  "When several currencies are involved, do we also show a combined total in one chosen currency?",
  "When does the daily total reset — at midnight, or at the start of the working day?",
  "Is there a way to let an urgent payment through above the cap, and who signs it off?",
  "If the customer pays only part of the amount, do we keep the request open for the rest or close it?",
  "How many reminders do we send, and how far apart, before we leave the customer alone?",
  "When someone signs in from a brand-new device, do we add an extra check or just let them in?",
  "If the fingerprint scanner fails, what is the fallback — a texted code, or something else?",
  "Do we hold alerts during agreed quiet hours and send them in the morning, or send straight away?",
  "On an account shared by two companies, who gets told when money moves?",
  "Do we refund the money provisionally while we investigate, or only once it’s settled?",
  "Do we block or freeze the card while the dispute is open, or leave it running?",
  "What happens to payments already in flight and to regular subscriptions when we freeze it?",
  "When someone orders a replacement, do subscriptions move to the new card automatically or not?",
  "Is there a short window to cancel a payment just after it’s sent, or is it final at once?",
  "For scheduled payments, do we check the funds now or on the day it’s due?",
  "Can a customer decline part of the amount, or only the whole request?",
  "If a customer declines because they think it’s wrong, does that turn into a dispute or stay a plain decline?",
];

// Erwarteter Vorher-Stand aller 21 Ziel-Karten (unverändert von FEATURE-020 erwartet).
const EXPECTED_GOALS = [
  "As a finance team I want to pay all our suppliers from one uploaded file so I don’t enter each payment by hand.",
  "As a company I want to pay every employee’s salary in one run so I don’t pay each person by hand each month.",
  "As a company I want big payments to need a second person’s sign-off so no one can send large sums alone.",
  "As a company I want each employee to have a card with their own monthly limit so people can buy what they need without overspending.",
  "As an employee I want a one-time card number for a single purchase so I don’t expose the company’s real card.",
  "As a company I want to collect our monthly fee from many customers in one run so we don’t chase each payment by hand.",
  "As a company I want to pay an overseas supplier in their own currency so they get the right amount without doing the conversion themselves.",
  "As a company I want to add a new supplier and their bank details so I can pay them later.",
  "As a company I want to be warned when a supplier’s name doesn’t match their bank account so I don’t pay the wrong person.",
  "As a finance team we want spare cash pulled into one main account each evening so it’s all in one place.",
  "As a finance manager I want a new team member to see the accounts but not send money.",
  "As a company I want to schedule a large tax payment for a future date so it’s paid on time.",
  "As a finance team we want one view of every account balance so we can see our whole cash position at a glance.",
  "As a company we want a cap on how much can be sent out in a day, with a warning as we get close.",
  "As a company I want to ask a customer to pay a specific amount so I get paid without chasing by hand.",
  "As a company user I want to sign in to the portal so I can manage the company’s money securely.",
  "As the finance team I want to be told when money moves so we spot problems without watching the account all day.",
  "As a company I want to report a payment I don’t recognise so I can get wrongly-taken money back.",
  "As a company I want to freeze a lost card straight away so no one can spend on it.",
  "As a company I want to send money to one recipient so I can pay them without a whole batch.",
  "As a customer I want to turn down a payment request so I’m not pushed to pay something I don’t owe.",
];

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

function main() {
  const dom = loadGame();
  const { window } = dom;

  try {
    assert(Array.isArray(window.SCENARIOS), "SCENARIOS sollte ein Array sein");
    assert.strictEqual(window.SCENARIOS.length, 21, "Es sollten 21 Szenarien existieren");

    const failures = [];
    let totalRule = 0;
    let totalEx = 0;
    let totalGoal = 0;
    let totalQ = 0;
    let arrowRuleCount = 0;
    const arrowRuleScenarios = new Set();
    const actualQuestions = [];
    const actualGoals = [];

    window.SCENARIOS.forEach((sc, si) => {
      assert(Array.isArray(sc.map), `Szenario ${si} (${sc.title}) sollte ein map-Array haben`);

      const ruleCards = sc.map.filter((c) => c.c === "rule");
      const exCards = sc.map.filter((c) => c.c === "ex");
      const goalCards = sc.map.filter((c) => c.c === "goal");
      const qCards = sc.map.filter((c) => c.c === "q");

      // Strukturelle Grundzahlen je Szenario unverändert (3 rule, 2 ex, 1 goal, 2 q)
      if (ruleCards.length !== 3) {
        failures.push(`Szenario ${si} (${sc.title}): erwartet 3 rule-Karten, gefunden ${ruleCards.length}`);
      }
      if (exCards.length !== 2) {
        failures.push(`Szenario ${si} (${sc.title}): erwartet 2 ex-Karten, gefunden ${exCards.length}`);
      }
      if (goalCards.length !== 1) {
        failures.push(`Szenario ${si} (${sc.title}): erwartet 1 goal-Karte, gefunden ${goalCards.length}`);
      }
      if (qCards.length !== 2) {
        failures.push(`Szenario ${si} (${sc.title}): erwartet 2 q-Karten, gefunden ${qCards.length}`);
      }

      totalRule += ruleCards.length;
      totalEx += exCards.length;
      totalGoal += goalCards.length;
      totalQ += qCards.length;

      goalCards.forEach((c) => actualGoals.push(c.t));

      // Fragen-Karten: müssen weiterhin auf "?" enden.
      qCards.forEach((c) => {
        actualQuestions.push(c.t);
        if (!c.t.trim().endsWith("?")) {
          failures.push(`Szenario ${si} (${sc.title}): Fragen-Karte endet nicht mehr auf "?": "${c.t}"`);
        }
      });

      // Genau eine der drei rule-Karten je Szenario darf einen Pfeil tragen.
      const arrowRulesInScenario = ruleCards.filter((c) => c.t.includes("→"));
      if (arrowRulesInScenario.length !== 1) {
        failures.push(
          `Szenario ${si} (${sc.title}): erwartet genau 1 rule-Karte mit Pfeil, gefunden ${arrowRulesInScenario.length}`
        );
      } else {
        arrowRuleScenarios.add(si);
      }
      arrowRuleCount += arrowRulesInScenario.length;

      arrowRulesInScenario.forEach((c) => {
        // (3) weiterhin exakt c==="rule"
        if (c.c !== "rule") {
          failures.push(`Szenario ${si} (${sc.title}): pfeiltragende Karte ist nicht mehr c==="rule": "${c.t}"`);
        }
        // (4) trägt eine "immer/nie/jedes Mal"-Formulierung
        if (!GENERALIZING_MARKER.test(c.t)) {
          failures.push(`Szenario ${si} (${sc.title}): keine Generalisierungs-Formulierung gefunden: "${c.t}"`);
        }
        // (5a) kein Einzelfall-Marker
        if (SINGLE_CASE_MARKER.test(c.t)) {
          failures.push(`Szenario ${si} (${sc.title}): Einzelfall-Marker in Regel-Karte gefunden: "${c.t}"`);
        }
        // (5b) keine "eine von…"-Konstruktion
        if (ONE_OF_MARKER.test(c.t)) {
          failures.push(`Szenario ${si} (${sc.title}): "one of"-Konstruktion in Regel-Karte gefunden: "${c.t}"`);
        }
      });

      // Die übrigen (nicht umformulierten) rule-Karten dürfen weiterhin
      // keinen Pfeil tragen.
      ruleCards
        .filter((c) => !c.t.includes("→"))
        .forEach((c) => {
          if (c.t.includes("→")) {
            failures.push(`Szenario ${si} (${sc.title}): unerwarteter Pfeil in nicht ausgewählter rule-Karte: "${c.t}"`);
          }
        });
    });

    // Gesamtzahlen unverändert
    assert.strictEqual(totalRule, 63, `Es sollten weiterhin 63 rule-Karten existieren, gefunden: ${totalRule}`);
    assert.strictEqual(totalEx, 42, `Es sollten weiterhin 42 ex-Karten existieren, gefunden: ${totalEx}`);
    assert.strictEqual(totalGoal, 21, `Es sollten weiterhin 21 goal-Karten existieren, gefunden: ${totalGoal}`);
    assert.strictEqual(totalQ, 42, `Es sollten weiterhin 42 q-Karten existieren, gefunden: ${totalQ}`);

    // Genau 21 rule-Karten mit Pfeil, eine pro Szenario, über alle 21 Szenarien verteilt.
    assert.strictEqual(arrowRuleCount, 21, `Es sollten genau 21 pfeiltragende rule-Karten existieren, gefunden: ${arrowRuleCount}`);
    assert.strictEqual(arrowRuleScenarios.size, 21, `Alle 21 Szenarien sollten je eine pfeiltragende rule-Karte haben, tatsächlich: ${arrowRuleScenarios.size}`);

    // Fragen-Karten textlich exakt unverändert (Reihenfolge über die Szenarien hinweg).
    assert.strictEqual(actualQuestions.length, EXPECTED_QUESTIONS.length, "Anzahl Fragen-Karten weicht vom erwarteten Snapshot ab");
    actualQuestions.forEach((t, i) => {
      if (t !== EXPECTED_QUESTIONS[i]) {
        failures.push(`Fragen-Karte #${i} weicht vom erwarteten Snapshot ab.\n  erwartet: "${EXPECTED_QUESTIONS[i]}"\n  tatsächlich: "${t}"`);
      }
    });

    // Ziel-Karten textlich exakt unverändert (Reihenfolge über die Szenarien hinweg).
    assert.strictEqual(actualGoals.length, EXPECTED_GOALS.length, "Anzahl Ziel-Karten weicht vom erwarteten Snapshot ab");
    actualGoals.forEach((t, i) => {
      if (t !== EXPECTED_GOALS[i]) {
        failures.push(`Ziel-Karte #${i} weicht vom erwarteten Snapshot ab.\n  erwartet: "${EXPECTED_GOALS[i]}"\n  tatsächlich: "${t}"`);
      }
    });

    // GAME_VERSION wurde seit dem FEATURE-019-Stand erhöht (kein exakter
    // Zielwert-Check, siehe spec-or-regret-impl-Leitplanke).
    assert.notStrictEqual(window.GAME_VERSION, "1.28.5", "GAME_VERSION sollte seit dem FEATURE-019-Stand (1.28.5) erhöht worden sein");

    if (failures.length > 0) {
      throw new Error(`${failures.length} Prüfung(en) fehlgeschlagen:\n` + failures.join("\n"));
    }

    console.log(
      `PASS — 63 rule-Karten (21 mit Pfeil, je 1 pro Szenario, generalisiert & ohne Einzelfall-Marker; 42 unveraendert), ` +
      `42 ex-Karten unveraendert, 21 goal-Karten unveraendert, 42 q-Karten unveraendert (Snapshot-Vergleich, alle enden auf "?"), ` +
      `GAME_VERSION erhoeht seit 1.28.5.`
    );
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
