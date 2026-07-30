/**
 * tests/FEATURE-019.test.js — "Beispiel-Karten im Mapping-Board eindeutig als
 * Einzelfall formulieren" (Kategorisierungs-Board "A shared picture",
 * renderCategorize, MAP_BUCKETS, Kategorie "ex").
 *
 * Prüft für alle 21 Szenarien, dass jede c==="ex"-Karte
 *   (a) weiterhin einen Pfeil ("→") enthält,
 *   (b) mindestens einen sprachlichen Einzelfall-Marker enthält (nicht nur
 *       generische Formulierung), und
 *   (c) weiterhin exakt c==="ex" ist (keine versehentliche Kategorie-Änderung).
 * Außerdem: Gesamtzahl der ex-Karten bleibt bei 42 (2 pro Szenario x 21).
 *
 * Marker-Vokabular (siehe Vorher/Nachher-Umsetzung FEATURE-019): jede neue
 * Formulierung beginnt entweder mit "One"/"That (one|same)"/"On one day"/
 * "In that (same run|batch)"/"For one ..." oder enthält eine benannte Zahl/
 * Menge (£-Betrag, Prozent, Stückzahl, Wochentag) als Einzelfall-Signal.
 * Ausdrücklich NICHT erlaubt: verallgemeinernde Marker wie "typically",
 * "usually", "in general", "as a rule" — diese würden das Ziel (Einzelfall
 * statt Regel) verfehlen.
 *
 * Ausführen: node tests/FEATURE-019.test.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const INDEX_HTML = path.join(__dirname, "..", "public", "index.html");

// Marker, die eine Karte eindeutig als konkreten Einzelfall kennzeichnen.
const SINGLE_CASE_MARKER = new RegExp(
  [
    "\\bone\\b",
    "\\bthat (one|same)\\b",
    "\\bon one day\\b",
    "\\bin that (same run|batch)\\b",
    "\\bfor one\\b",
    "£[\\d,]+",              // benannter Geldbetrag
    "\\b\\d+%",              // benannter Prozentsatz
    "\\b\\d+\\b",            // benannte Stückzahl/Menge (z.B. 200, 50, 49, 4021)
    "\\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b",
  ].join("|"),
  "i"
);

// Verallgemeinernde Formulierungen, die den Zweck verfehlen würden.
const GENERALIZING_MARKER = /\b(typically|usually|generally|in general|as a rule|normally|often|routinely)\b/i;

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

    let totalEx = 0;
    const failures = [];

    window.SCENARIOS.forEach((sc, si) => {
      assert(Array.isArray(sc.map), `Szenario ${si} (${sc.title}) sollte ein map-Array haben`);
      const exCards = sc.map.filter((c) => c.c === "ex");

      exCards.forEach((c) => {
        totalEx++;

        // (a) Pfeil weiterhin vorhanden
        if (!c.t.includes("→")) {
          failures.push(`Szenario ${si} (${sc.title}): Karte ohne Pfeil: "${c.t}"`);
        }

        // (b) mindestens ein Einzelfall-Marker
        if (!SINGLE_CASE_MARKER.test(c.t)) {
          failures.push(`Szenario ${si} (${sc.title}): kein Einzelfall-Marker gefunden: "${c.t}"`);
        }

        // Zusatzcheck: keine verallgemeinernde Formulierung eingeschlichen
        if (GENERALIZING_MARKER.test(c.t)) {
          failures.push(`Szenario ${si} (${sc.title}): verallgemeinernde Formulierung gefunden: "${c.t}"`);
        }

        // (c) Kategorie weiterhin "ex"
        if (c.c !== "ex") {
          failures.push(`Szenario ${si} (${sc.title}): Kategorie ist nicht mehr "ex": "${c.t}"`);
        }
      });
    });

    assert.strictEqual(totalEx, 42, `Es sollten 42 ex-Karten über alle Szenarien existieren, gefunden: ${totalEx}`);

    if (failures.length > 0) {
      throw new Error(`${failures.length} Prüfung(en) fehlgeschlagen:\n` + failures.join("\n"));
    }

    console.log(`PASS — 42/42 ex-Karten über 21 Szenarien: Pfeil vorhanden, Einzelfall-Marker vorhanden, Kategorie "ex" unveraendert, keine verallgemeinernden Formulierungen.`);
    dom.window.close();
    process.exit(0);
  } catch (err) {
    console.error("FAIL —", err.message);
    dom.window.close();
    process.exit(1);
  }
}

main();
