# Product.md – Agentic Engineering Gamification

Stand: 22.07.2026. Lebendiges Dokument: wird bei jeder neuen Anforderung, die in Gesprächen zu diesem Projekt auftaucht, fortlaufend ergänzt. Ziel: jederzeit ein vollständiger Überblick über alle funktionalen und nicht-funktionalen Anforderungen an das Produkt „Spec or Regret" (Lernspiel, bis v1.7.0 „Agent Contract") und die begleitende Unterlage.

> Hinweis (22.07.2026): Das Spiel wurde von „Agent Contract" in „Spec or Regret" umbenannt (FEATURE-007, ab v1.8.0). Frühere Erwähnungen von „Agent Contract" in diesem Dokument und in bereits abgeschlossenen Tickets sind historisch korrekt und wurden nicht rückwirkend geändert.
>
> Hinweis (20.07.2026): Diese lokale Datei war seit dem 17.07.2026 nicht mehr aktualisiert worden, obwohl in der Zwischenzeit (in anderen Gesprächsfäden) bereits die Versionen v1.3.0 bis v1.4.2 entstanden und released wurden — nachvollzogen über die Ticket-Historie in der Claude-Projekt-Wissensablage und per `git log` im lokalen Repo bestätigt. Die folgenden Punkte wurden entsprechend nachgezogen.
>
> Verschoben am 20.07.2026 aus dem übergeordneten Ordner `Agentic Engineering Gamification/` in dieses Projektverzeichnis (`agent-contract-game/`), damit Backlog.md und Product.md direkt im selben Projektordner wie der Code liegen.

## Produktüberblick

Ein interaktives Lernspiel, das agiles Vorgehen in der Software-Entwicklung (Anforderungen klären, Rework vermeiden, in konkreten Beispielen statt Bauchgefühl denken) anhand von 21 Corporate-Banking-Szenarien erlebbar macht. Begleitet von einer Präsentationsunterlage, die dieselbe Denkweise für ein größeres Publikum aufbereitet.

## Funktionale Anforderungen

- Startbildschirm bietet 21 Corporate-Banking-Szenarien zur Auswahl an, alternativ eine Zufallsauswahl ("Surprise us").
- Zu jedem Szenario gibt es eine Verhaltens-Übung im Given/When/Then-Stil (mit "Und"-Erweiterung), aufgeteilt in drei Blöcke: Normalfall, Fehlerfall und ein echter Grenzfall, der sich aus den Regeln des jeweiligen Szenarios ableitet.
- Zwei-Uhren-Mechanik: Die Zeit für sorgfältiges Klären einer Anforderung zählt nicht negativ; nur die eigentliche Umsetzungszeit ist die Wertung. Wer zu früh mit der Umsetzung startet, ohne vorher zu klären, bekommt Nacharbeit aufgebrummt, die die Umsetzungszeit verschlechtert.
- Ablauf: erzwungener Schnellstart (führt zu Fehlschlägen und schlechter Wertung) → Neustart mit zurückgesetzter Wertung → sauberer Durchlauf mit Klärung vorab → zwei Versuchungsmomente, bei denen Abkürzungen möglich sind (aber bestraft werden) → gemeinsame Vereinbarung, was "fertig zum Start" bedeutet → Abschlussauswertung.
- Abschlussauswertung zeigt die Gesamt-Wartezeit (Klärung + Umsetzung) als drei übereinandergestapelte Balken: überstürzter Weg, eigener gespielter Weg, erreichbarer Idealweg – plus eine separate Zeile nur für die reine Umsetzungszeit.
- Antwortoptionen werden bei jedem Durchlauf neu gemischt, damit sich keine Musterlösung durch Position einprägt.
- Die beiden Versuchungsmomente (offene Fragen überspringen; Slicing überspringen) geben vor der Entscheidung keinerlei Hinweis, welche Wahl die bessere ist. Nach einer genommenen Abkürzung spiegelt das Spiel die tatsächlich im Szenario übersprungene offene Frage bzw. den übersprungenen Schnitt als offene, nicht wertende Frage zurück statt eines festen Merksatzes. (Seit v1.3.0.)
- Die beiden Zuordnungsaufgaben erkennen automatisch, ob per Finger oder per Maus/Trackpad bedient wird: auf Finger-Geräten direkt antippbare Kategorie-Knöpfe statt Ziehen, inkl. kurzer Erklärung der Kategorien im Touch-Modus; die Auswertungslogik ist für beide Bedienarten identisch. (Seit v1.4.0/v1.4.1.)
- Auf dem Startbildschirm wird vor den beiden Uhren-Karten erklärt, dass die eigentlich relevante Größe die Lead Time ist (die ganze Reise vom Bedarf bis in Nutzerhand) — mit demselben Kernsatz, der im Finale wieder auftaucht. (Seit v1.4.2.)
- Am unteren Bildschirmrand ist auf jedem Bildschirm dauerhaft eine dezente Versionsangabe sichtbar. (Seit v1.3.1.)
- Zu jedem bereits abgeschlossenen Schritt mit Badge lässt sich eine reine Ansicht des jeweils letzten Bildschirms dieses Schritts öffnen — inklusive der eigenen getroffenen Auswahl und der Agenten-Rückmeldung, ohne dass dort etwas verändert werden kann. Zwei gleichwertige Einstiege: über die Badge-Icons ganz unten auf der Abschlussseite (v1.5.0, FEATURE-004), und zusätzlich jederzeit während eines laufenden Spiels über den Badge-Zähler in der Kopfzeile → „Your badges“-Liste (v1.6.0, FEATURE-005). Ein bereits halb bearbeiteter, noch nicht abgeschickter Schritt bleibt beim Schließen des Rückblicks unverändert erhalten.
- Begleitende Präsentationsunterlage (aktuell 37 Folien) mit denselben Kernbotschaften für ein Publikum, das nicht selbst spielt; enthält an zwei Stellen noch offene Platzhalter, die Stephan mit eigenen Beispielen füllt.
- Das Spiel muss browserbasiert unter der Adresse `learning.stephanschumann.com` erreichbar sein.

## Nicht-funktionale Anforderungen

- Technische Umsetzung als einzelne, in sich geschlossene Datei ohne eigenen Server im Hintergrund (rein clientseitig, läuft direkt im Browser).
- Neue Szenarien müssen sich ergänzen lassen, ohne die zugrundeliegende Spiel-Engine anzufassen (Trennung von Inhalt und Mechanik).
- Qualitätssicherung: alle Szenarien werden automatisiert durchgespielt und müssen fehlerfrei laufen, ohne technische Fehlermeldungen im Hintergrund.
- Sprache und Ton durchgängig in einfacher Alltagssprache, ohne erkennbare "richtige Lösung" vorab – die Lektion wird immer erst erlebt und danach im Nachgespräch benannt, nie vorher als Ansage.
- Inhaltliche Leitplanke: Kernbotschaft ist das Vermeiden von Nacharbeit durch vorheriges Klären – nicht ein Zurück zu starren, unflexiblen Abläufen.
- Hosting-Vorgabe: kostenloses Hosting bedeutet, dass der Quellcode öffentlich einsehbar sein muss; das wird bewusst in Kauf genommen (Alternative mit nicht-öffentlicher Sichtbarkeit wäre möglich, aber mit Mehraufwand verbunden).
- Die Verwaltung der Domain bleibt getrennt vom Hosting des Spiels; nur eine Weiterleitung verbindet beides.
- Sollte das Spiel künftig Ergebnisse dauerhaft speichern müssen, reicht die aktuelle Hosting-Lösung nicht mehr aus – dann ist ein Wechsel auf eine Lösung mit Serverfunktion nötig.

## Offene Punkte / Annahmen

- Zwei inhaltliche Platzhalter in der Präsentationsunterlage sind noch von Stephan zu füllen (ein Vorher/Nachher-Beispiel, eine Erklärung zur Bewertungslogik einer bestimmten Vergleichsrolle).
- Rückmeldung von Stephan zu Tiefe, Schwierigkeitsgrad und den Grenzfall-Übungen nach eigenem Testspiel steht noch aus.
- Annahme: Die Domain wird direkt bei Squarespace verwaltet (nicht bei einem separaten Anbieter, der nur auf Squarespace verweist).

## Änderungsprotokoll

- 17.07.2026: Erstanlage, abgeleitet aus dem bestehenden Projektstand (`agent-contract-training.md`, `learning-subdomain-hosting-anleitung.md`).
- 17.07.2026: v1.3.0 – Versuchungsmomente optisch neutralisiert, dynamische Reflexionsfrage statt festem Merksatz.
- 17.07.2026: v1.3.1 – dauerhafte Versionsanzeige (FEATURE-001).
- 18.07.2026: v1.4.0/v1.4.1 – Touch-Alternative zu Drag & Drop bei den Zuordnungsaufgaben, Kategorie-Erklärung im Touch-Modus (FEATURE-002, TASK-001).
- 18.07.2026: v1.4.2 – Lead Time bereits auf dem Startbildschirm erklärt (FEATURE-003).
- 20.07.2026: v1.5.0 – Rückblick auf frühere Spielschritte über die Badge-Icons der Abschlussseite, rein zur Ansicht (FEATURE-004). Diese lokale Datei wurde bei dieser Gelegenheit auf den aktuellen Stand nachgezogen (siehe Hinweis oben).
- 20.07.2026: v1.6.0 – derselbe Rückblick zusätzlich jederzeit während des laufenden Spiels über den Badge-Zähler in der Kopfzeile verfügbar, ohne den gerade bearbeiteten Schritt zu stören (FEATURE-005).
- 20.07.2026: Backlog.md und Product.md aus dem übergeordneten Ordner `Agentic Engineering Gamification/` hierher in den Projektordner `agent-contract-game/` verschoben (Stephans Wunsch: beide Dateien im selben Projektordner wie der Code).
