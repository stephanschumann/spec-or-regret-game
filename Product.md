# Product.md – Spec or Regret

Stand: 23.07.2026. Lebendiges Dokument: wird bei jeder neuen Anforderung, die in Gesprächen zu diesem Projekt auftaucht, fortlaufend ergänzt. Ziel: jederzeit ein vollständiger Überblick über alle funktionalen und nicht-funktionalen Anforderungen an das Produkt „Spec or Regret" (Lernspiel, bis v1.7.0 „Agent Contract") und die begleitende Unterlage.

> Hinweis (22.07.2026): Das Spiel wurde von „Agent Contract" in „Spec or Regret" umbenannt (FEATURE-007, ab v1.8.0). Frühere Erwähnungen von „Agent Contract" in diesem Dokument und in bereits abgeschlossenen Tickets sind historisch korrekt und wurden nicht rückwirkend geändert.
>
> Hinweis (20.07.2026): Diese lokale Datei war seit dem 17.07.2026 nicht mehr aktualisiert worden, obwohl in der Zwischenzeit (in anderen Gesprächsfäden) bereits die Versionen v1.3.0 bis v1.4.2 entstanden und released wurden — nachvollzogen über die Ticket-Historie in der Claude-Projekt-Wissensablage und per `git log` im lokalen Repo bestätigt. Die folgenden Punkte wurden entsprechend nachgezogen.
>
> Verschoben am 20.07.2026 aus dem übergeordneten Ordner `Agentic Engineering Gamification/` in dieses Projektverzeichnis (`agent-contract-game/`), damit Backlog.md und Product.md direkt im selben Projektordner wie der Code liegen.

## Produktüberblick

Ein interaktives Lernspiel, das agiles Vorgehen in der Software-Entwicklung (Anforderungen klären, Rework vermeiden, in konkreten Beispielen statt Bauchgefühl denken) anhand von 21 Corporate-Banking-Szenarien erlebbar macht. Begleitet von einer Präsentationsunterlage, die dieselbe Denkweise für ein größeres Publikum aufbereitet.

Seit FEATURE-008 (22.07.2026, Vertical Slice; Ticket-Nummer am 23.07.2026 richtiggestellt, siehe Hinweis in Backlog.md) gibt es zusätzlich einen zweiten, gleichwertigen Spielmodus ohne KI-Agent: dieselbe Kernlektion, erzählt über ein menschliches Team in einem zeitlich begrenzten Refinement statt über die Zusammenarbeit mit einem Agenten. Über acht Testrunden am 22./23.07.2026 verfeinert (siehe Änderungsprotokoll).

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
- Nach dem Einladungs-Overlay wählt man zunächst den Spielmodus über eine gemeinsame Moduswahl-Seite (zwei gleichwertige Kacheln, je mit atmosphärischer Kurzbeschreibung und einem standardmäßig eingeklappten „What's different here?"-Detailbereich): „Collaborate with Agents" (bestehender Modus, unverändert) oder „Work as a Team" (neu). (Seit v1.10.0, FEATURE-008.)
- Im neuen Modus „Work as a Team" klärt ein rein menschliches Team – ohne KI-Agent – dieselbe Art von Anforderung in einem Refinement: eine zufällig fehlende Rolle pro Durchlauf (meist Product Owner), ein Beispiel-Mapping-Board mit einem sichtbar ablaufenden Meeting-Timer, der den Übergang zwingend erzwingt, eine Business-Value-Entscheidung, eine Gherkin-Präzisierungsübung, eine offene Frage mit „jetzt klären oder später"-Wahl, Pre-Mortem und Out-of-Scope-Auswahl, eine Definition-of-Ready-Checkliste mit verdeckten Wahrheitswerten (pauschal abhaken vs. ehrlich prüfen) und eine simulierte Chat-Unterbrechung während der Umsetzung für alles, was im Meeting nicht geklärt wurde. Aktuell als Vertical Slice für ein Szenario umgesetzt („Second approver for large payments"); die übrigen 20 Szenarien folgen in späteren Tickets. (Seit v1.10.0, FEATURE-008; über v1.11.0–v1.16.0 verfeinert, siehe Änderungsprotokoll.)
- Karten im Beispiel-Mapping-Board lassen sich, solange der Schritt aktiv ist, jederzeit über ein sichtbares ↩-Icon direkt an der Karte neu zuordnen — im selben Bedienmuster wie die Zuordnungsaufgabe im Agent-Modus. Jeder bereits gespielte Schritt (nicht nur die badge-vergebenden) lässt sich über eine feste Navigationsleiste am unteren Bildschirmrand ansehen, reine Ansicht ohne Änderungsmöglichkeit. (Seit v1.12.0–v1.14.0, FEATURE-008.)
- Eine unehrlich getroffene Wahl an jeder der sechs möglichen Stellen (Business Value raten, offene Frage vertagen, vage Verhaltensbeschreibung stehen lassen, unsortiertes Mapping-Board, fehlende Rolle, falsch abgehakte DoR-Punkte) bekommt keine kostenlose Analysezeit-Gutschrift und keinen Badge, sondern taucht als real bezifferte, benannte Nacharbeit während der Umsetzung wieder auf. (Seit v1.11.0, mit Nachbesserung in v1.15.0, FEATURE-008.)
- Lange, sich von selbst abspielende Bau-Sequenzen (Übergabe an den Agenten im Agent-Modus, „Start Development" im Team-Modus) lassen den Bildschirm dort stehen, wo er ist, statt automatisch ans Ende zu springen, damit sich der Ablauf chronologisch von oben nach unten mitverfolgen lässt. Gewöhnliche, kurze Schritte scrollen weiterhin automatisch zur Rückmeldung. (Seit v1.16.0, FEATURE-008.)
- Die Abschlussauswertung des Team-Modus zeigt dieselbe Drei-Balken-Darstellung wie der bestehende Modus (inklusive einer im Vertical Slice zunächst fehlerhaften, seit v1.11.0 korrigierten Grundkosten-Anzeige fürs Bauen im Idealweg), ergänzt um eine eigene, gesondert ausgewiesene Rework-Kategorie „DoR was just paperwork" für Punkte, die abgehakt, aber tatsächlich nicht erfüllt waren. (Seit v1.10.0, FEATURE-008.)

## Nicht-funktionale Anforderungen

- Technische Umsetzung als einzelne, in sich geschlossene Datei ohne eigenen Server im Hintergrund (rein clientseitig, läuft direkt im Browser).
- Neue Szenarien müssen sich ergänzen lassen, ohne die zugrundeliegende Spiel-Engine anzufassen (Trennung von Inhalt und Mechanik).
- Qualitätssicherung: alle Szenarien werden automatisiert durchgespielt und müssen fehlerfrei laufen, ohne technische Fehlermeldungen im Hintergrund.
- Sprache und Ton durchgängig in einfacher Alltagssprache, ohne erkennbare "richtige Lösung" vorab – die Lektion wird immer erst erlebt und danach im Nachgespräch benannt, nie vorher als Ansage.
- Inhaltliche Leitplanke: Kernbotschaft ist das Vermeiden von Nacharbeit durch vorheriges Klären – nicht ein Zurück zu starren, unflexiblen Abläufen.
- Hosting-Vorgabe: kostenloses Hosting bedeutet, dass der Quellcode öffentlich einsehbar sein muss; das wird bewusst in Kauf genommen (Alternative mit nicht-öffentlicher Sichtbarkeit wäre möglich, aber mit Mehraufwand verbunden).
- Die Verwaltung der Domain bleibt getrennt vom Hosting des Spiels; nur eine Weiterleitung verbindet beides.
- Sollte das Spiel künftig Ergebnisse dauerhaft speichern müssen, reicht die aktuelle Hosting-Lösung nicht mehr aus – dann ist ein Wechsel auf eine Lösung mit Serverfunktion nötig.
- Seit FEATURE-008 gibt es eine erste, dauerhaft im Repo aufbewahrte jsdom-Testbasis (`tests/*.test.js`, inzwischen neun eigenständige Testdateien) mit Pflicht-Regressionslauf vor jeder Auslieferung — vorher gab es dafür keine automatisierte Testabdeckung. Interaktions- und Layout-Änderungen werden zusätzlich per Playwright mit echten Maus-Events gegen den echten, gerenderten Chromium-Browser verifiziert, nicht nur über jsdom.

## Offene Punkte / Annahmen

- Zwei inhaltliche Platzhalter in der Präsentationsunterlage sind noch von Stephan zu füllen (ein Vorher/Nachher-Beispiel, eine Erklärung zur Bewertungslogik einer bestimmten Vergleichsrolle).
- Rückmeldung von Stephan zu Tiefe, Schwierigkeitsgrad und den Grenzfall-Übungen nach eigenem Testspiel steht noch aus.
- Annahme: Die Domain wird direkt bei Squarespace verwaltet (nicht bei einem separaten Anbieter, der nur auf Squarespace verweist).
- Facilitator-Hinweistexte für den neuen Team-Modus fehlen noch (bewusst aus dem FEATURE-008-Scope ausgeschlossen, eigenes Folgeticket).
- Meeting-Timer im Team-Modus gilt aktuell nur für den Beispiel-Mapping-Schritt, nicht über mehrere Schritte hinweg (bewusste Vereinfachung für den Vertical Slice, siehe FEATURE-008-Optionenvergleich).
- „The fast start" (Vergleichszeile im Team-Modus-Abschluss) ist aktuell eine feste, szenario-unabhängige Zahl statt eines nachvollziehbaren, an Scrum-Schätzpraxis angelehnten Werts — siehe FEATURE-010 (ToDo).
- Die übrigen 20 Banking-Szenarien im Team-Modus fehlen noch (bewusst aus dem FEATURE-008-Vertical-Slice-Scope ausgeschlossen, eigenes Folgeticket).

## Änderungsprotokoll

- 17.07.2026: Erstanlage, abgeleitet aus dem bestehenden Projektstand (`agent-contract-training.md`, `learning-subdomain-hosting-anleitung.md`).
- 17.07.2026: v1.3.0 – Versuchungsmomente optisch neutralisiert, dynamische Reflexionsfrage statt festem Merksatz.
- 17.07.2026: v1.3.1 – dauerhafte Versionsanzeige (FEATURE-001).
- 18.07.2026: v1.4.0/v1.4.1 – Touch-Alternative zu Drag & Drop bei den Zuordnungsaufgaben, Kategorie-Erklärung im Touch-Modus (FEATURE-002, TASK-001).
- 18.07.2026: v1.4.2 – Lead Time bereits auf dem Startbildschirm erklärt (FEATURE-003).
- 20.07.2026: v1.5.0 – Rückblick auf frühere Spielschritte über die Badge-Icons der Abschlussseite, rein zur Ansicht (FEATURE-004). Diese lokale Datei wurde bei dieser Gelegenheit auf den aktuellen Stand nachgezogen (siehe Hinweis oben).
- 20.07.2026: v1.6.0 – derselbe Rückblick zusätzlich jederzeit während des laufenden Spiels über den Badge-Zähler in der Kopfzeile verfügbar, ohne den gerade bearbeiteten Schritt zu stören (FEATURE-005).
- 20.07.2026: Backlog.md und Product.md aus dem übergeordneten Ordner `Agentic Engineering Gamification/` hierher in den Projektordner `agent-contract-game/` verschoben (Stephans Wunsch: beide Dateien im selben Projektordner wie der Code).
- 22.07.2026: v1.10.0 – Neuer Spielmodus „Work as a Team" als Vertical Slice (ein Szenario) plus neue Moduswahl-Seite, ohne jede Änderung am bestehenden „Collaborate with Agents"-Modus (FEATURE-008, ursprünglich unter dieser Nummer analysiert). Erste dauerhafte jsdom-Testbasis im Repo angelegt.
- 22.07.2026: Testrunde 1 – eine genommene Abkürzung (Map-Timeout, vage Gherkin-Formulierung) hatte fälschlich trotzdem die kostenlose Analysezeit-Gutschrift und den Badge bekommen; behoben (`noCredit`-Mechanismus).
- 22.07.2026: Testrunde 2 – ein „undefined" im gerenderten Team-Modus-Text sowie ungleich hohe/ausgerichtete Moduswahl-Karten behoben.
- 23.07.2026: v1.11.0 (Testrunde 3) – der Idealweg zeigte fälschlich 0 Tage Umsetzungszeit; komplettes Redesign des Konsequenzmodells (fester Grundpreis fürs Bauen, granulare Mapping-Konsequenz, rollenspezifische Konsequenz für jede der vier möglichen fehlenden Rollen, DoR-Falschangaben als eigene, explizit benannte Audit-Konsequenz).
- 23.07.2026: v1.12.0 (Testrunde 4) – feste Navigationsleiste zum Zurückblicken; Kategorie-Zuordnung im Mapping-Board während des aktiven Schritts revidierbar; höherer Textkontrast bei Spielanweisungen; Button-Umbenennung „Start Development"; Zurückblick zeigt alle gespielten Schritte statt nur badge-vergebende.
- 23.07.2026: v1.13.0 (Testrunde 5) – die Kartenzuordnung im Mapping-Board funktionierte über den sichtbaren Slot (statt nur die verblasste Bank-Originalkarte) weiterhin nicht; behoben.
- 23.07.2026: v1.14.0 (Testrunde 6) – sichtbares ↩-Put-back-Icon an der Karte ergänzt (Bedienmuster wie im Agent-Modus); „Next"-Button im Zurückblick-Overlay führt am letzten ansehbaren Schritt zurück zur laufenden Seite statt in eine Sackgasse.
- 23.07.2026: v1.15.0/v1.15.1 (Testrunde 7) – die kostenlose Analysezeit-Gutschrift wurde bei beiden Weggabelungs-Typen (Business Value raten, Frage vertagen) unabhängig von der getroffenen Wahl vergeben; jetzt an die ehrliche Wahl gekoppelt. Redundant gewordene „Look back"-Kachel im Kopfbereich entfernt.
- 23.07.2026: v1.16.0 (Testrunde 8) – die beiden langen, sich selbst abspielenden Bau-Sequenzen (Agent-Übergabe, „Start Development") sprangen automatisch ans Seitenende statt den Bildschirm chronologisch mitverfolgbar zu lassen; behoben. FEATURE-008 als vollständiges Done-Ticket in Backlog.md nachdokumentiert (war zuvor nur im Gespräch/Code nachvollziehbar); Ticket-Nummer von FEATURE-009 auf FEATURE-008 richtiggestellt (die Nummer FEATURE-009 gehört jetzt der Szenario-Gruppierungs-Idee); neue Idee „realistische Fast-Start-Schätzung" als FEATURE-010 im Backlog festgehalten.
- 23.07.2026: Übergeordneter Mac-Projektordner von `Agentic Engineering Gamification/` in `Spec or Regret/` umbenannt (weiterhin mit dem Unterordner `spec-or-regret-game/` als eigentlichem Code-/Repo-Ordner darin). Ab sofort maßgeblicher Pfad; „Agentic Engineering Gamification" nicht mehr verwenden. Dokumenttitel dieser Datei entsprechend auf „Spec or Regret" nachgezogen.
