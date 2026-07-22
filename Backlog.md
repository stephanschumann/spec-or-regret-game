# Backlog

> Hinweis: Diese Datei existierte lokal noch nicht und wurde am 20.07.2026 neu angelegt. Die Ticket-Historie bis v1.4.2 (FEATURE-001 bis FEATURE-003, TASK-001) ist bereits in der Claude-Projekt-Wissensablage „Agentic Engineering Gamification" dokumentiert und wird hier nicht dupliziert. Ab jetzt ist diese lokale Datei die laufende Quelle für neue Tickets.
>
> Verschoben am 20.07.2026 aus dem übergeordneten Ordner `Agentic Engineering Gamification/` in dieses Projektverzeichnis (`agent-contract-game/`), damit Backlog.md und Product.md direkt im selben Projektordner wie der Code liegen.

## 🔄 In Progress

### FEATURE-006 Einladungs-Overlay vor dem Startbildschirm

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | In Progress |
| **Erstellt** | 2026-07-22 |
| **In Progress seit** | 2026-07-22 |

**Beschreibung:** Vor dem bisherigen Startbildschirm soll ein kurzes, einladendes Overlay erscheinen (Headline, kurze Erklärung, Spielstart-Button), das man wegklicken kann. Solange das Overlay sichtbar ist, soll der dahinterliegende Startbildschirm-Text nicht sichtbar sein, um nicht abzulenken. Die Anzahl unnötiger Klicks bis zum Spielstart soll dabei möglichst gering bleiben – das Overlay soll den Weg zum Spielstart nicht um einen zusätzlichen Klick-Umweg verlängern.

**User Story:** Als Spielerin/Spieler möchte ich beim ersten Öffnen des Spiels eine kurze Einladung sehen, bevor der eigentliche Startbildschirm erscheint, sodass ich weiß, worum es geht, ohne dass sich der Weg zum eigentlichen Spielstart verlängert.

**Scope:**
Eingeschlossen: Ein neues, wegklickbares Einladungs-Overlay erscheint unmittelbar beim ersten Öffnen des Spiels, bevor der bisherige Startbildschirm (Szenario-Auswahl) zu sehen ist. Solange es sichtbar ist, ist der Startbildschirm dahinter nicht vorhanden – nicht nur optisch verdeckt, sondern schlicht noch nicht aufgebaut. Drei gleichwertige Wege zum Schließen: der Haupt-Button, das im Spiel bereits bekannte ×, und ein Klick auf den abgedunkelten Hintergrund – alle drei führen unmittelbar, ohne weiteren Zwischenschritt, zum bisherigen Startbildschirm. Inhalt: kurze Einladung mit Überschrift, ein bis zwei erklärende Sätze und dem Schließen-Button, im selben visuellen Muster wie die bereits vorhandenen Overlays (Badges, Rework-Log, Rückblick).
Ausgeschlossen: Der Rückweg zur Szenario-Auswahl über „Pick another scenario“ nach einer fertig gespielten Runde bleibt unverändert – dort erscheint die Einladung nicht erneut (sonst würde sie bei jedem neuen Durchlauf in derselben Sitzung stören). Keine Änderung an Spielmechanik, den 21 Szenarien, der Wertung oder den übrigen Bildschirmen. Kein dauerhaftes „schon gesehen“-Merken für Wiederbesuche (passend zur bestehenden Vorgabe, dass nichts dauerhaft im Browser gespeichert wird) – die Einladung erscheint bei jedem neuen Laden der Seite.

**Akzeptanzkriterien:**
- [x] Beim ersten Öffnen des Spiels erscheint zuerst die Einladung; die Szenario-Auswahl (bisheriger Startbildschirm) ist zu diesem Zeitpunkt nicht zu sehen.
- [x] Die Einladung lässt sich auf drei Arten wegklicken: über den Haupt-Button, über das gewohnte × oben rechts, und über einen Klick auf den abgedunkelten Bereich außerhalb der Box – alle drei führen direkt zur Szenario-Auswahl, ohne weitere Zwischenschritte.
- [x] Nach dem Wegklicken sieht die Szenario-Auswahl genauso aus wie bisher vor dieser Änderung (die anzeigende Funktion selbst wurde nicht verändert).
- [x] Nach einer fertig gespielten Runde führt „Pick another scenario“ weiterhin direkt zur Szenario-Auswahl, ohne die Einladung erneut zu zeigen (automatisiert über denselben Code-Pfad geprüft; siehe Testplan-Einschränkung).
- [x] Live per Chrome-Browser-Subagent auf `https://agent-contract-game.web.app/` bestätigt (Desktop, 1498×812): Einladung erscheint sofort, Startbildschirm dahinter nicht sichtbar (nur der abgedunkelte, verschwommene Hintergrund erkennbar), Klick auf „Let's begin" schließt die Einladung und zeigt die Szenario-Auswahl korrekt, `GAME_VERSION` zeigt „v1.7.0", keine Konsolenfehler beim frischen Laden.
- [ ] Auf einem schmalen Bildschirm (Handy-Breite) bleibt die Einladung vollständig lesbar und der Haupt-Button erreichbar, auch wenn der Text dafür gescrollt werden muss. **– noch offen:** Der Chrome-Browser-Subagent konnte die Fensterbreite in dieser Sitzung technisch nicht zuverlässig auf Handy-Breite verkleinern (das Werkzeug meldete Erfolg, der Screenshot blieb aber durchgehend in Desktop-Breite) – Stephan bitten, kurz selbst auf dem Handy draufzuschauen.
- [x] Keine Konsolenfehler beim Öffnen, beim Wegklicken auf jede der drei Arten, und beim anschließenden normalen Spielstart (bis auf die bekannte, unabhängige jsdom-Canvas-Einschränkung, siehe Testplan).

**Fundstellen-Sweep:** Gesucht nach allen Aufrufen der Funktion, die den Startbildschirm aufbaut (`renderPicker(`): 3 Treffer – die Definition selbst, der ursprüngliche Aufruf beim ersten Laden der Seite (ganz am Ende des Skripts), und der Aufruf hinter dem Button „Pick another scenario“ auf der Abschlussseite. Nur der erste (initiale Seitenaufbau) soll die neue Einladung zeigen; der zweite (Rückweg nach einer fertig gespielten Runde) bleibt bewusst unverändert – sonst würde die Einladung bei jedem neuen Durchlauf in derselben Sitzung erneut erscheinen, was der Anforderung „möglichst wenige unnötige Klicks“ widerspricht. Keine weiteren Fundstellen.

**Zustands-Check:** Kein Wartezustand nötig – das Schließen der Einladung und der Aufbau der Szenario-Auswahl passieren ohne Ladezeit oder Netzwerkzugriff. Kein Leerzustand relevant – der Inhalt der Einladung ist immer derselbe feste Text, unabhängig von Spielstand oder Szenario. Fehlerfall: kein neues Fehlerverhalten vorgesehen; sollte einer der drei Schließen-Wege aus einem Programmierfehler nicht reagieren, bliebe das Spiel blockiert – deshalb werden im Testplan alle drei Wege einzeln geprüft, nicht nur einer stellvertretend für alle.

**Pre-Mortem:**
- 💀 Einer der drei Schließen-Wege (Haupt-Button, ×, Hintergrund-Klick) funktioniert wegen eines Tippfehlers nicht und blockiert den Zugang zum Spiel → Gegenmaßnahme: alle drei Wege einzeln im Testplan geprüft, nicht nur einer angenommen.
- 💀 „Pick another scenario“ zeigt die Einladung versehentlich erneut und nervt beim wiederholten Spielen in einer Workshop-Sitzung → Gegenmaßnahme: bewusst nur der initiale Aufruf zeigt die Einladung (siehe Fundstellen-Sweep), eigenes Akzeptanzkriterium dafür.
- 💀 Der abgedunkelte, leicht durchscheinende Hintergrund lässt die Szenario-Auswahl doch noch schemenhaft erkennbar wirken, obwohl „nicht sichtbar“ gefordert ist → Gegenmaßnahme: die Szenario-Auswahl wird technisch gar nicht erst aufgebaut, solange die Einladung offen ist – dahinter ist buchstäblich nichts vorhanden, nicht nur optisch verdeckt.
- 💀 Die Versionsanzeige wird nicht erhöht, obwohl sich sichtbares Verhalten ändert → Gegenmaßnahme: eigenes Akzeptanzkriterium in den Implementierungsnotizen, Versionssprung analog zu früheren sichtbaren Funktionen.
- 💀 Auf dem Handy sprengt der Einladungstext die Box, oder der Haupt-Button ist nicht erreichbar → Gegenmaßnahme: eigenes Akzeptanzkriterium für Handy-Breite, bestehendes Scroll-Verhalten der Overlays wird wiederverwendet.

**Optionenvergleich:**

*Option A – Startbildschirm wird erst nach dem Schließen aufgebaut (empfohlen):* Die Einladung erscheint sofort; die Szenario-Auswahl wird technisch erst erzeugt, sobald die Einladung geschlossen wird. Vorteil: „nicht sichtbar“ ist damit wörtlich erfüllt, nicht nur optisch abgedunkelt. Nutzt das bereits vorhandene, bewährte Overlay-Muster praktisch unverändert – sehr kleiner, gut abgegrenzter Eingriff nur an der Stelle, an der das Spiel startet. Kein erkennbarer Nachteil.

*Option B – Startbildschirm wird wie gewohnt sofort aufgebaut, Einladung nur optisch darübergelegt:* Technisch am einfachsten, aber die Szenario-Auswahl liegt dann nur abgedunkelt/verschwommen dahinter statt tatsächlich zu fehlen – erfüllt die Anforderung „nicht sichtbar“ nicht zuverlässig.

✅ **Empfehlung:** Option A – einzige Option, die „nicht sichtbar“ wörtlich erfüllt, und dabei trotzdem minimal-invasiv, weil sie das bestehende Overlay-Muster eins zu eins wiederverwendet.

**Analyse & Planung:**
- [x] Repo-Stand vor Beginn geprüft: HEAD `900dc1f` (v1.6.1), `git status` zeigt nur die erwarteten, unabhängig von diesem Ticket entstandenen Änderungen (Backlog.md/Backlog-Archive.md/tools/ aus TASK-002) – kein zwischenzeitlicher Fremdstand am Spielcode.
- [x] Bestehendes Overlay-Muster am echten Code verifiziert: drei existierende Overlays (Badges, Rework-Log, Rückblick) sind statische `<div class="overlay">…<div class="modal">…</div></div>`-Elemente, standardmäßig unsichtbar (`display:none`), werden per `.show`-Klasse eingeblendet. Ein bereits vorhandener, generischer Mechanismus schließt jedes Overlay sowohl über ein `×` mit `data-close` als auch über einen Klick auf den Hintergrund außerhalb der Box.
- [x] Startbildschirm-Aufbau verifiziert: eine eigene Funktion füllt den Inhaltsbereich der Seite; sie wird aktuell genau einmal beim ersten Laden der Seite aufgerufen (ganz am Ende des Skripts) und ein zweites Mal über „Pick another scenario“ auf der Abschlussseite (siehe Fundstellen-Sweep).
- [x] Implementierungsansatz: neues Overlay nach demselben Muster wie die drei bestehenden anlegen; der ursprüngliche Aufruf beim ersten Laden der Seite wird durch „Einladung anzeigen“ ersetzt; der Startbildschirm wird erst gebaut, wenn die Einladung auf einem der drei Wege geschlossen wird. Der zweite bestehende Aufruf (Rückweg nach einer Runde) bleibt unverändert.
- [x] Aufwand: klein – reine Ergänzung im Boot-Ablauf, keine Berührung der szenario-spezifischen Logik oder der 21 Szenario-Inhalte.

**Testplan:**
- [x] Automatisiert (jsdom, echtes Ausführen der Seite im echten DOM wie bei früheren Tickets): 14 Einzelprüfungen – beim ersten Laden zeigt die Einladung die „show“-Klasse und die Szenario-Auswahl ist noch nicht im Inhaltsbereich vorhanden; danach jeweils einzeln über Haupt-Button, × und Hintergrund-Klick geschlossen und geprüft, dass die Szenario-Auswahl danach korrekt erscheint und die Einladung die „show“-Klasse verloren hat; zusätzlich geprüft, dass ein Klick INNERHALB der Box sie nicht schließt (bestehender genereller Mechanismus). Alle 14 Prüfungen grün.
- [x] Regressionstest: statt eines vollständigen 21-Schritte-Durchlaufs wurde die anzeigende Funktion nach dem ersten Wegklicken ein zweites Mal direkt aufgerufen – genau der Code-Pfad, den „Pick another scenario“ auch nutzt. Die Einladung bekam dabei NICHT die „show“-Klasse zurück, die Szenario-Auswahl erschien direkt. **Einschränkung:** kein vollständiger End-to-End-Durchlauf über die echte Abschlussseite bis zum Klick auf den echten Button – das deckt denselben Code-Pfad ab, aber nicht den kompletten Klickweg dorthin.
- [x] Syntax-Check (`node --check`) fehlerfrei.
- **Begründung Testabdeckung:** Diese Änderung berührt keine der 21 szenario-spezifischen Datenstrukturen und keine geteilte Kategorie-Konstante, sondern ausschließlich den einen, szenario-unabhängigen Einstiegspunkt der Seite. Ein Testdurchlauf deckt daher strukturell alle 21 Szenarien ab, weil die Änderung vor jeder Szenario-Auswahl greift, nicht danach.
- Keine gespeicherte Testsuite aus früheren Tickets im Projekt vorhanden (wie bereits bei BUG-001 vermerkt) – der jsdom-Test für dieses Ticket ist neu.
- **Bekannte, vom Fix unabhängige Testumgebungs-Einschränkung:** jsdom unterstützt `<canvas>` nicht (Konfetti-Effekt) – ohne einen Stub dafür bricht das gesamte Skript beim ersten Laden ab, bevor überhaupt etwas geprüft werden kann. Für den Test wurde `getContext` daher testseitig auf No-op-Methoden gestubbt (reine Testumgebungs-Anpassung, keine Änderung am echten Spielcode) – dieselbe Einschränkung wurde bereits bei BUG-001 dokumentiert.
- [x] Echter Blick im Browser (Desktop) durchgeführt und bestanden (siehe Akzeptanzkriterien). Handy-Breite technisch nicht automatisiert prüfbar – Stephans eigener Blick steht noch aus.

**Scope-Änderungen** *(chronologisches Log):*
*(keine – der zusätzliche Absatz zu Analysis/Cycle/Lead Time im Einladungstext wurde noch vor Implementierungsbeginn während der Textabstimmung ergänzt, nicht nachträglich als Scope-Änderung.)*

**Implementierungsnotizen:**
Umgesetzt in `public/index.html` (Basis: v1.6.1 / Commit `900dc1f`, vor dem Schreiben per `git status`/Datei-Zeitstempel geprüft – kein zwischenzeitlicher Fremdstand). Neues, statisches Overlay `#ovIntro` nach dem bestehenden Muster der drei vorhandenen Overlays (`ovBadges`/`ovRework`/`ovReview`) direkt im HTML ergänzt, mit `class="overlay show"` von Anfang an sichtbar. Der ursprüngliche, einzelne Aufruf der startbildschirm-aufbauenden Funktion beim ersten Laden der Seite wurde entfernt; `#stageHost` bleibt dadurch leer, bis die Einladung geschlossen wird. Eine neue Funktion `startGame()` entfernt die „show“-Klasse und baut danach den Startbildschirm auf; sie ist an drei Stellen verdrahtet: den Haupt-Button, das ×-Element (bewusst ohne das generische `data-close`-Attribut, damit es eigenständig sowohl schließt als auch den Startbildschirm aufbaut) und – nach den bereits bestehenden generischen Overlay-Handlern platziert, damit die eigene Zuweisung die generische überschreibt – einen Klick auf den Hintergrund des neuen Overlays selbst. Der zweite, bestehende Aufruf derselben Aufbau-Funktion (hinter „Pick another scenario“ auf der Abschlussseite) wurde nicht angefasst. `GAME_VERSION` von „1.6.1“ auf „1.7.0“ angehoben (Minor, da eine echte neue sichtbare Funktion, analog FEATURE-004/005). Einladungstext exakt wie mit Stephan abgestimmt (inkl. des ergänzten Absatzes zu Analysis/Cycle/Lead Time).

**Release:** Als v1.7.0 released (Commit `385029b`). Erster `git push`-Versuch von Stephan scheiterte zweimal an einem lokalen DNS-Problem auf seinem Mac („Could not resolve host: github.com“), unabhängig von diesem Projekt – nach einem DNS-Cache-Reset (`dscacheutil -flushcache`/`killall -HUP mDNSResponder`) erfolgreich gepusht. Vor dem `git add -A` lag eine verwaiste `.git/index.lock` von mehreren `git status`-Aufrufen während der Analyse im Weg (kein laufender Git-Prozess mehr, gefahrlos entfernt). GitHub Action `firebase-hosting-merge.yml` lief grün durch (36s). Live-Verifikation per eigenständigem Chrome-Browser-Subagenten gegen `agent-contract-game.web.app` (Desktop) erfolgreich – siehe Akzeptanzkriterien/Testplan oben. Handy-Breite konnte der Chrome-Subagent in dieser Sitzung nicht zuverlässig erzwingen (Fenster blieb trotz gemeldetem Erfolg in Desktop-Breite) – Stephans eigener Blick auf dem Handy steht noch aus, bevor das Ticket auf Done gesetzt wird.

### FEATURE-007 Umbenennung des Spiels: „Agent Contract" → „Spec or Regret"

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | In Progress |
| **Erstellt** | 2026-07-22 |
| **In Progress seit** | 2026-07-22 |

**Beschreibung:** Der bisherige Spielname „Agent Contract" wird durch „Spec or Regret" ersetzt – im Spiel selbst, im Kanban-Board/-Artifact und in der lokalen Projekt-Infrastruktur (Ordner, Doku). Für die Teile, die Stephans eigenen Zugang brauchen (GitHub-Repo, kontoseitig verwaltete Skills), bereitet dieses Ticket konkrete Schritte bzw. eine Datei zum Speichern vor, statt sie selbst auszuführen.

**User Story:** Als Stephan möchte ich, dass das Spiel unter einem einprägsameren Namen läuft und dieser Name konsistent überall dort auftaucht, wo bisher „Agent Contract" stand, damit keine veralteten Markennennungen zurückbleiben.

**Scope:**
Eingeschlossen: Sichtbarer Spielname im Spiel selbst (Titel-Tag, Versionsanzeige, Einladungs-Overlay aus FEATURE-006 inkl. des mit Stephan abgestimmten Intro-Texts); Kanban-Vorlage/-Board/-Artifact (Titel, Überschrift, Beschreibung, Drag-Hinweistext); Product.md; lokaler Mac-Projektordner (technischer Name, in Sync mit dem neuen Spielnamen umbenannt). „Spec or Regret" bleibt als Eigenname unübersetzt, falls das Spiel künftig in einer anderen Sprache angeboten wird.
Ausgeschlossen (nicht durch mich ausführbar): Umbenennung des GitHub-Repos `agent-contract-game` (braucht Stephans GitHub-Zugang) sowie Anpassung der Beschreibungstexte der Skills `agent-contract-analyze`/`agent-contract-release` (kontoseitig verwaltet, nur Stephan kann eine gelieferte Skill-Datei tatsächlich speichern) – für beides liegen Stephan konkrete Schritte bzw. eine Datei vor. Die Firebase-Hosting-Technik-URL `agent-contract-game.web.app` bleibt unverändert (rein technischer Bezeichner, für Spielende nicht sichtbar – die echte Adresse ist `learning.stephanschumann.com`; eine Umbenennung würde eine neue Firebase-Hosting-Site erfordern). Technische Bezeichner ohne Nutzersichtbarkeit (Dateinamen, Skript-Aufrufe, die Artifact-ID `agent-contract-kanban`) bleiben ebenfalls unverändert, um keine funktionierenden Verweise zu zerbrechen. Bereits abgeschlossene, historische Ticket-Einträge in Backlog.md/Backlog-Archive.md werden nicht rückwirkend umbenannt.

**Akzeptanzkriterien:**
- [x] Im Spiel taucht „Agent Contract" nirgends mehr auf; „Spec or Regret" erscheint im Titel-Tag, in der Versionsanzeige und als Überschrift des Einladungs-Overlays.
- [x] Der Einladungstext beginnt mit „Spec or Regret" und dem freigegebenen Szenario-Einstieg („Let's take a real world example: …“), die drei Zeit-Begriffe heißen Analysis Time, Cycle Time, Lead Time.
- [x] Kanban-Board und -Artifact zeigen „Spec or Regret Kanban" statt „Agent Contract Kanban" (Vorlage angepasst, Board neu generiert, Artifact aktualisiert).
- [x] Keine Konsolenfehler im Spiel nach der Umbenennung (automatisiert geprüft).
- [x] Lokaler Mac-Ordner heißt `spec-or-regret-game` statt `agent-contract-game` (umbenannt, Git-Repo darin unverändert funktionsfähig geprüft).
- [x] Stephan hat klare, konkrete Schritte für die GitHub-Repo-Umbenennung sowie eine Datei zur Aktualisierung der beiden Skill-Beschreibungen erhalten (Skill-Dateien mit chirurgisch angepassten Ordnerpfaden, GitHub-/Firebase-URLs bewusst unverändert gelassen, siehe Implementierungsnotizen).

**Fundstellen-Sweep:** Case-insensitive nach „Agent Contract"/„agent-contract" im gesamten Projektordner gesucht: `public/index.html` (Titel-Tag, Versionsanzeige-Text, Einladungs-Overlay aus FEATURE-006), `tools/kanban_template.html` (JSON-Metadaten, `<title>`, `<h1>`, Drag-Hinweistext – 5 Treffer), `tools/gen_kanban.py`/`tools/sync_kanban.py` (nur technische Bezeichner: Skript-Aufrufe, Artifact-ID, Ordnername in Kommentaren – bewusst unverändert), `Product.md` (Produktname in Kopfzeile, umbenannt inkl. Hinweis auf die Umbenennung), `Backlog-Archive.md` (ein historischer Treffer als Prosa-Produktname in einem bereits abgeschlossenen Ticket zur Versionsanzeige – bewusst unverändert gelassen, das war zum damaligen Zeitpunkt korrekt), `Backlog.md` selbst (nur technische Bezeichner wie Ordner-/Skill-/Domainnamen in bereits abgeschlossenen Tickets, kein Prosa-Vorkommen). Zusätzlich die beiden kontoseitig verwalteten Skills `agent-contract-analyze`/`agent-contract-release` durchsucht (Produktname in Beschreibung und Überschrift) – siehe Ausschluss oben.

**Analyse & Planung:**
- [x] Repo-Stand vor Beginn geprüft: HEAD weiterhin `385029b` (v1.7.0), `git status` zeigte nur die aus FEATURE-006 bereits bekannten, noch nicht committeten Änderungen – kein zwischenzeitlicher Fremdstand.
- [x] Entscheidung „nur Produktname, keine technischen Bezeichner": Datei-/Ordnernamen, Skript-Aufrufe, Artifact-IDs und die Firebase-Technik-URL sind interne Bezeichner ohne Nutzersichtbarkeit – deren Änderung hätte reales Risiko (kaputte Skript-Aufrufe, verwaiste Artifact-Referenzen), ohne dass Spielende davon etwas sehen. Umbenannt wird daher nur, was Nutzer/Team tatsächlich als Namen wahrnehmen.
- [x] Versionssprung: `GAME_VERSION` von 1.7.0 auf **1.8.0** angehoben (Minor, da sichtbare Namensänderung im laufenden Spiel, analog FEATURE-004/005/006).

**Testplan:**
- [x] Automatisiert (jsdom, echtes Ausführen der Seite im echten DOM): die 14 bestehenden Prüfungen aus FEATURE-006 erneut grün (Overlay-Verhalten unverändert) plus 6 neue gezielte Prüfungen – Versionsanzeige zeigt „Spec or Regret v1.8.0", Titel-Tag korrekt, Overlay-Überschrift ist „Spec or Regret", Einladungstext beginnt mit dem freigegebenen Szenario-Satz, die drei Zeit-Begriffe sind großgeschrieben, explizit geprüft, dass „Agent Contract" nirgends mehr im Overlay-Text vorkommt. 19/19 Prüfungen grün, keine Konsolenfehler.
- [x] Kanban-Board nach Neugenerierung inhaltlich geprüft (Lint sauber, „Spec or Regret" 4× vorhanden, kein „Agent Contract" mehr im generierten Board).
- [ ] Echter Blick im Browser (Desktop) auf die neue Einladung nach dem Release steht noch aus (analog zu FEATURE-006).

**Implementierungsnotizen:**
Umgesetzt in `public/index.html` (Basis: v1.7.0 / Commit `385029b`): Titel-Tag, Versionsanzeige-Text und das komplette Einladungs-Overlay (`#ovIntro`, aus FEATURE-006) auf „Spec or Regret" + den mit Stephan abgestimmten Intro-Text umgestellt. `GAME_VERSION` auf „1.8.0" angehoben. In `tools/kanban_template.html` alle 5 Vorkommen von „Agent Contract" auf „Spec or Regret" umgestellt (JSON-Metadaten, Titel, Überschrift, Drag-Hinweistext inkl. Ordnername-Referenz im Hinweistext, dort vorsorglich bereits auf `spec-or-regret-game` umgestellt). Kanban neu generiert (Lint sauber, 9 Tickets) und als Artifact gepusht. `Product.md` auf den neuen Produktnamen abgeglichen, mit Hinweis auf die Umbenennung und Verweis, dass ältere Erwähnungen historisch korrekt bleiben. Lokaler Projektordner per `mv` von `agent-contract-game` auf `spec-or-regret-game` umbenannt (vorher geprüft: kein Fund von `agent-contract-game` in `.github/workflows/*` oder `firebase.json` – nur in `.firebaserc` als Firebase-**Projekt-ID**, ein technischer, praktisch nicht umbenennbarer Bezeichner, siehe Scope-Ausschluss); Git-Repo im umbenannten Ordner funktionsfähig geprüft (`git status`/`git remote -v` unverändert korrekt). Die beiden kontoseitig verwalteten Skills `agent-contract-analyze`/`agent-contract-release` wurden NICHT direkt im Sandbox-Dateisystem verändert (persistiert dort nicht) – stattdessen chirurgisch angepasste Kopien als SKILL.md an Stephan geliefert: Produktname in Titel/Beschreibung auf „Spec or Regret" umgestellt (mit Hinweis „bis v1.7.0 Agent Contract"), lokale Ordnerpfade auf `spec-or-regret-game` aktualisiert – GitHub-Repo-URLs und die Firebase-`.web.app`-Adresse bewusst unverändert gelassen, da diese technisch noch `agent-contract-game` heißen. Stephan muss die beiden Dateien selbst über „Save skill" speichern, damit sie wirksam werden.

**Offene, nur von Stephan ausführbare Schritte (siehe Chat-Nachricht):** (1) GitHub-Repo `agent-contract-game` umbenennen (optional, eigener GitHub-Zugang nötig) – danach `git remote set-url origin` im umbenannten lokalen Ordner aktualisieren; (2) die beiden gelieferten Skill-Dateien per „Save skill" speichern; (3) die lokalen Änderungen committen und pushen (`.git/index.lock` vorher entfernen, siehe Chat-Nachricht) – erst danach ist v1.8.0 live.

## 📋 ToDo

## ✅ Done

### TASK-002 Kanban-Board und Sync-Verfahren einrichten (nach FotoAlert-Vorbild)

| Feld | Wert |
|------|------|
| **Typ** | Task |
| **Priorität** | Mittel |
| **Status** | Done |
| **Erstellt** | 2026-07-21 |
| **In Progress seit** | 2026-07-21 13:58 |
| **Fertiggestellt** | 2026-07-21 |

**Beschreibung:** Stephan möchte für dieses Projekt dasselbe Kanban-Board-und-Sync-Verfahren wie bei FotoAlert etablieren: ein visuelles Board, das automatisch aus Backlog.md generiert wird, statt von Hand gepflegt zu werden.

**User Story:** Als Stephan möchte ich den Ticket-Stand dieses Projekts als Kanban-Board sehen, das sich bei jeder Statusänderung automatisch und ohne manuelles Zutun aktualisiert, sodass ich hier denselben verlässlichen Überblick habe wie bei FotoAlert.

**Scope:**
Eingeschlossen: neues `Backlog-Archive.md` (Kopie der historischen, bereits abgeschlossenen Tickets aus der Claude-Projekt-Wissensablage) im Projektordner anlegen; Generator-Skripte (`tools/gen_kanban.py`, `tools/lint_backlog.py`, `tools/sync_kanban.py`) und eine Kanban-HTML-Vorlage (`tools/kanban_template.html`) nach FotoAlert-Vorbild anlegen, angepasst an die drei Lanes (ToDo/In Progress/Done) dieses Projekts und an das hier tatsächlich verwendete Ticket-Überschriften-Format (kein Trennzeichen zwischen ID und Titel); erstes Kanban-Board generieren und als persistiertes Cowork-Artifact veröffentlichen; `agent-contract-analyze`-Skill (Schritt 5) so aktualisieren, dass er auf den jetzt vorhandenen Generator verweist statt „kein Generator vorhanden" zu behaupten.
Ausgeschlossen: keine Änderung an Spiel-Code (`public/index.html`); keine Änderung an der FotoAlert-Pipeline selbst (nur als Vorlage gelesen); kein mehrstufiges Pipeline-Board (Inbox/Ready for Analysis/…) — bewusst beim einfachen 3-Lane-Modell dieses Projekts geblieben.

**Akzeptanzkriterien:**
- [x] Ein Kanban-Board mit den drei Spalten ToDo/In Progress/Done ist als eigenständiges, wiederkehrend nutzbares Artifact sichtbar und zeigt den tatsächlichen Stand aus Backlog.md + Backlog-Archive.md.
- [x] Jede Ticket-Karte zeigt ID, Titel, Typ- und Prioritäts-Kennzeichnung (Feature/BugFix/Task-Farbe, Hoch/Mittel/Niedrig-Farbe).
- [x] Eine Karte lässt sich per Klick öffnen und zeigt den vollständigen Ticket-Inhalt.
- [x] Ein Generator-Lauf erzeugt das Board direkt und automatisch aus dem aktuellen Dateiinhalt, ohne dass irgendwo Ticket-Daten von Hand ins Board übertragen werden.
- [x] Der Ablauf ist im `agent-contract-analyze`-Skill so dokumentiert, dass er beim nächsten Ticket-Statuswechsel ohne Rückfrage angewendet werden kann.

**Analyse & Planung:**
- [x] FotoAlert-Vorlage am echten Code gelesen (nicht geraten): `gen_kanban.py`, `sync_kanban.py`, `kanban_template.html`, `lint_backlog.py` im Ordner `Foto Location Guide/FotoAlert/tools/` sowie die Skills `book-of-work` und `fotoalert-orchestrator`.
- [x] Abweichung zum hiesigen Projekt festgestellt: FotoAlert nutzt 9 Lanes (Inbox…Excluded) und ID-Überschriften mit Trennzeichen (`### ID · Titel`); dieses Projekt nutzt laut `book-of-work`-Skill und den beiden echten Backlog-Dateien nur 3 Lanes (ToDo/In Progress/Done) und Überschriften ohne Trennzeichen (`### ID Titel`) — Generator entsprechend angepasst statt die FotoAlert-Regex unverändert zu übernehmen.
- [x] Zwei-Quellen-Situation verstanden: aktuelle/laufende Tickets stehen lokal in `Backlog.md`, die Tickets bis v1.4.2 stehen in der Claude-Projekt-Wissensablage (`claude/Backlog.md`) — analog zu FotoAlerts `BACKLOG.md` + `BACKLOG-ARCHIVE.md`-Trennung wird Letztere als lokale `Backlog-Archive.md`-Kopie angelegt, damit der Generator wie bei FotoAlert rein lokal und deterministisch arbeitet.

**Testplan:**
- [x] Generator lokal mit dem echten aktuellen `Backlog.md` + `Backlog-Archive.md` ausgeführt, Output-HTML per Read-Tool gegengelesen (Ticket-Anzahl und Lane-Verteilung stimmen mit den Quelldateien überein: 8 Tickets, korrekt nach Lane sortiert).
- [x] `lint_backlog.py` lief sauber durch (0 Fehler, 0 Warnungen).
- [x] Artifact im Cowork-Bereich von Stephan selbst geöffnet und bestätigt.

**Scope-Änderungen** *(chronologisches Log):*
*(leer bei Erstellung)*

**Implementierungsnotizen:**
Umgesetzt im Ordner `agent-contract-game/` auf Stephans Mac (per Geräte-Zugriff, `expectedMtimeMs`-Guard beim Zurückschreiben, kein Konflikt). Neue Dateien: `Backlog-Archive.md` (lokale Kopie der Tickets bis v1.4.2 aus der Claude-Projekt-Wissensablage) sowie `tools/gen_kanban.py`, `tools/lint_backlog.py`, `tools/sync_kanban.py`, `tools/kanban_template.html` — 1:1 nach dem Vorbild von `Foto Location Guide/FotoAlert/tools/` gebaut, aber angepasst: 3 Lanes statt 9, Ticket-Typen Feature/BugFix/Task statt Bug/User Story/Task, und ID-Regex ohne Pflicht-Trennzeichen (`### ID Titel` statt `### ID · Titel`), weil dieses Projekt dieses Format tatsächlich verwendet. Sortierung im Board wie im `book-of-work`-Skill vorgegeben: ToDo nach Priorität dann Erstelldatum, In Progress nach Startdatum (neueste zuerst), Done nach Abschlussdatum (neueste zuerst). Artifact `agent-contract-kanban` initial erzeugt und per `mcp__remote-devices__update_artifact` veröffentlicht. `agent-contract-analyze`-Skill (Schritt 5 + neuer Abschnitt „Kanban-Sync") aktualisiert und als `.skill`-Datei an Stephan übergeben.

**Bestätigt:** Stephan hat das Board in seiner Cowork-Ansicht geprüft und bestätigt („Done").

---

### BUG-001 Fehlermeldung bei der zweiten Zuordnungsaufgabe passt nicht zu deren Kategorien

| Feld | Wert |
|------|------|
| **Typ** | BugFix |
| **Priorität** | Mittel |
| **Status** | Done |
| **Erstellt** | 2026-07-21 |
| **In Progress seit** | 2026-07-21 |
| **Fertiggestellt** | 2026-07-21 |

**Beschreibung:** Ein Nutzer meldete per Screenshot, dass Meldungen des Agenten manchmal nicht zum gerade gespielten Schritt zu passen scheinen, sondern zu einem früheren. Prüfung ergab: Im Spiel gibt es zwei Zuordnungsaufgaben mit unterschiedlichen Kategorien (erste: Goal/Rule/Example/Open question; zweite, „Settle it before going on": Answered/bewusst offen gelassen/Blockiert). Beide teilen sich denselben Fehlertext, wenn eine Karte falsch einsortiert wurde — dieser Text ist aber fest auf die Kategorien der ERSTEN Aufgabe formuliert („what's a rule, what's just an example, what's still an open question"). Landet ein Spieler in der zweiten Aufgabe und sortiert falsch, bekommt er trotzdem diesen Text mit Kategorien, die dort gar nicht vorkommen — das wirkt wie eine Meldung aus einem früheren Schritt.

**User Story:** Als Spielerin/Spieler möchte ich bei einem Sortierfehler eine Rückmeldung bekommen, die zu den tatsächlich in diesem Schritt verfügbaren Kategorien passt, sodass ich nicht verwirrt werde und weiß, wonach ich wirklich suchen soll.

**Scope:**
Eingeschlossen: Die feste Fehlermeldung im Klick-Handler des „Hand it to the agent"-Buttons (Funktion `renderCategorize`, `public/index.html`) wird so umgebaut, dass sie die Kategorie-Namen dynamisch aus den tatsächlichen Kategorien des jeweils aktuellen Schritts (`st.buckets`) zusammensetzt, statt fest „rule/example/open question" zu nennen. Betrifft beide Zuordnungsaufgaben (erste: Goal/Rule/Example/Open question; zweite „Settle it before going on": Answered/Deliberately limited/Blocked).
Ausgeschlossen: die Erfolgsmeldung (bereits korrekt szenario-/schrittspezifisch über `st.successReaction`); Layout, Sortierlogik selbst, Kategorie-Zähler, sonstige Texte.

**Akzeptanzkriterien:**
- [x] Sortiert man in der ERSTEN Zuordnungsaufgabe eine Karte falsch, nennt die Fehlermeldung weiterhin die dortigen Kategorien (Goal/Rule/Example/Open question).
- [x] Sortiert man in der ZWEITEN Zuordnungsaufgabe („Settle it before going on") eine Karte falsch, nennt die Fehlermeldung die dortigen Kategorien (Answered/Deliberately limited/Blocked) statt der Begriffe der ersten Aufgabe.
- [x] Die Anzahl falsch einsortierter Karten wird weiterhin korrekt genannt.
- [x] Keine Konsolenfehler *(mit einer bekannten, vom Fix unabhängigen Einschränkung — siehe Testplan)*.
- [ ] Bestehende Tests aus FEATURE-004/005 erneut ausgeführt — **nicht möglich**: im Projekt liegt keine gespeicherte Testdatei aus diesen Tickets, nur die Beschreibung im Backlog. Stattdessen wurde die komplette Seite inkl. Startbildschirm real ausgeführt und beide betroffenen Zuordnungsschritte über echte Klick-Handler durchgespielt (siehe Testplan) — das deckt dieselbe Funktion ab, ist aber kein Wiederholen der historischen Testläufe selbst.

**Analyse & Planung:**
- [x] Ursache bereits lokalisiert (durch vorherige Analyse mit Subagent, am realen Live-Code auf GitHub verifiziert, danach am lokalen Git-Klon per Grep bestätigt): `public/index.html`, Funktion `renderCategorize(st)`, `else`-Zweig des `document.getElementById("check").onclick`-Handlers — der Text ist dort als fester String verdrahtet.
- [x] Kategorie-Namen sind bereits pro Schritt vorhanden: `st.buckets` (Array mit `.label`) wird schon für die Kästen selbst verwendet (`bucketsHTML`) — dieselbe Quelle kann für den Fehlertext genutzt werden, keine neue Datenstruktur nötig.
- [x] Geplanter Ansatz: aus `st.buckets.map(b=>b.label)` einen sprachlich sauberen Aufzählungstext bauen (Komma-getrennt, letztes Element mit „or") und in die bestehende Fehlermeldung einsetzen statt der festen Begriffe.
- [x] Risiko: bei nur 3 statt 4 Kategorien (zweite Aufgabe) muss die Aufzählungslogik auch mit 3 Elementen korrekt funktionieren — wird im Test geprüft.

**Testplan:**
- [x] Automatisiert (jsdom, echtes Ausführen der App im echten DOM wie in FEATURE-004/005): die komplette Seite wurde geladen und ausgeführt, dann `renderCategorize` für die erste Aufgabe (Goal/Rule/Example/Open question) über die echten Klick-Handler bedient, eine Karte bewusst falsch einsortiert — Fehlermeldung nennt korrekt „Goal, Rule, Example or Open question" und die Anzahl falscher Karten (1).
- [x] Automatisiert: dieselbe Funktion für die zweite Aufgabe („Settle it before going on", Answered/Deliberately limited/Blocked) durchgespielt, eine Karte bewusst falsch einsortiert — Fehlermeldung nennt korrekt „Answered, Deliberately limited or Blocked", enthält NICHT mehr „rule"/„example"/„open question", und die Anzahl falscher Karten stimmt.
- [x] Syntax-Check (`node --check`) fehlerfrei.
- [ ] Regressionstest gegen gespeicherte FEATURE-004/005-Tests: nicht möglich, da keine Testdatei aus diesen Tickets im Projekt abgelegt wurde (siehe Akzeptanzkriterien). Ersatzweise wurde der volle Seitenaufbau (Startbildschirm, Konfetti-Initialisierung, beide Zuordnungsschritte) fehlerfrei durchlaufen.
- **Bekannte, vom Fix unabhängige Testumgebungs-Einschränkung:** Beim ersten Laden der Seite in der jsdom-Testumgebung meldet die Konsole einen Fehler zur Canvas-Konfetti-Animation (`getContext` von `<canvas>` wird von jsdom ohne Zusatzpaket nicht unterstützt). Das betrifft ausschließlich die optische Konfetti-Anzeige beim Seitenstart, nicht die hier geänderte Sortier-Logik, und ist vermutlich auch bei den früheren Tickets FEATURE-004/005 in derselben Testumgebung aufgetreten (nicht durch dieses Ticket verursacht). Ein echter Blick im Browser zeigt keinen Konsolenfehler, da echte Browser `<canvas>` unterstützen — das ist aber wie bei FEATURE-004/005 noch nicht separat verifiziert (kein `file://`-Zugriff in dieser Sitzung).

**Scope-Änderungen** *(chronologisches Log):*
*(leer bei Erstellung)*

**Implementierungsnotizen:**
Umgesetzt in `public/index.html` (lokaler Git-Klon, Basis v1.6.0 / Commit `08da401`, vor dem Schreiben per `git log`/`git status` verifiziert — sauberer Stand, kein zwischenzeitlicher Fremdstand). In `renderCategorize(st)`, im `else`-Zweig des `check`-Button-Handlers, wurde der fest verdrahtete Text „what's a rule, what's just an example, what's still an open question" ersetzt durch einen dynamisch aus `st.buckets.map(b=>b.label)` gebauten Aufzählungstext (Komma-getrennt, letztes Element mit „or"): „Look again — is it really ‹Kategorie1, Kategorie2 or Kategorie3/4›? — and re-sort." Dieselbe Datenquelle (`st.buckets`), die schon für die sichtbaren Kategorie-Kästen verwendet wird, liefert damit auch den Fehlertext — für beide Zuordnungsaufgaben automatisch korrekt, keine Sonderfall-Unterscheidung nötig. Die Erfolgsmeldung (`st.successReaction`) war bereits vorher korrekt und wurde nicht angefasst.

**Release:** Als v1.6.1 released (Commit `900dc1f`), GitHub Action grün (42s, `firebase-hosting-merge.yml`, `build_and_deploy` erfolgreich). Stephan hat die Live-Seite selbst geprüft und die Fehlermeldung bei der zweiten Zuordnungsaufgabe als korrekt bestätigt („test positiv"). Bestätigt und auf Done gesetzt.

### FEATURE-005 Rückblick auch während des laufenden Spiels

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | Done |
| **Erstellt** | 2026-07-20 |
| **In Progress seit** | 2026-07-20 |
| **Fertiggestellt** | 2026-07-20 |

**Beschreibung:** Direkte Erweiterung von FEATURE-004. Der Rückblick auf frühere, bereits abgeschlossene Schritte soll nicht nur auf der Abschlussseite, sondern auch während eines laufenden Spiels möglich sein — ohne den aktuell in Bearbeitung befindlichen Schritt zu stören oder zurückzusetzen.

**User Story:** Als Spielerin/Spieler möchte ich mitten im Spiel (z. B. auf Schritt 4) nachsehen können, was ich bei einem früheren Schritt (z. B. Schritt 1) ausgewählt hatte, sodass ich mich daran erinnern kann, ohne das Spiel neu zu starten — und danach genau dort weitermachen, wo ich war.

**Scope:**
Eingeschlossen: Die bereits während des Spiels sichtbare Kopfzeile zeigt einen Badge-Zähler (🏅-Chip), der beim Anklicken die vorhandene „Your badges"-Liste öffnet. Jeder Eintrag in dieser Liste wird zusätzlich anklickbar und öffnet denselben Rückblick wie auf der Abschlussseite (gleicher Inhalt, gleiche Ansichts-Variante). Technische Umstellung: Der Rückblick wird als eigenes Overlay (wie die bestehenden „Your badges"/„Rework log"-Fenster) über den aktuellen Bildschirm gelegt statt ihn zu ersetzen — dadurch bleibt der gerade in Bearbeitung befindliche Schritt beim Schließen exakt so erhalten, wie er war (nichts wird zurückgesetzt). Die Abschlussseite nutzt danach denselben Mechanismus (kein separater Rückweg über „renderFinale()" mehr nötig).
Ausgeschlossen: kein Zugriff auf den allerersten Schnellstart-Schritt und den Rewind-Übergangsbildschirm (weiterhin ohne Badge); keine Bearbeitung der früheren Auswahl; kein neuer, zusätzlicher UI-Button — es wird bewusst der bereits vorhandene Badge-Zähler in der Kopfzeile wiederverwendet.

**Akzeptanzkriterien:**
- [x] Während eines laufenden Spiels lässt sich über den Badge-Zähler in der Kopfzeile die Liste der bisher verdienten Badges öffnen (wie bisher).
- [x] Jeder Eintrag in dieser Liste ist zusätzlich anklickbar und zeigt darauf den letzten Bildschirm des jeweiligen Schritts inkl. eigener Auswahl — read-only wie auf der Abschlussseite.
- [x] Nach dem Schließen des Rückblicks ist der Schritt, an dem gerade gespielt wurde, unverändert vorhanden — insbesondere ein bereits halb ausgefüllter, noch nicht abgeschickter Schritt (automatisiert geprüft: eine bereits zugeordnete Karte blieb zugeordnet, der Fortschrittszähler war unverändert, derselbe DOM-Slot blieb bestehen; das Spiel ließ sich danach normal zu Ende spielen).
- [x] Dasselbe funktioniert weiterhin unverändert von der Abschlussseite aus (Regressionstest zu FEATURE-004: alle bisherigen automatisierten Prüfungen erneut fehlerfrei, jetzt gegen die Overlay-Variante).
- [x] Keine Konsolenfehler.

**Analyse & Planung:**
- [x] Risiko der naheliegenden Lösung erkannt: Ein Zurück-Weg, der den aktuellen Schritt über `render()` neu aufbaut, würde bei einem bereits halb bearbeiteten Schritt (z. B. teilweise zugeordnete Karten) den Fortschritt auf diesem Schritt löschen, weil jede Render-Funktion ihren Zuordnungs-Zustand neu und leer aufbaut.
- [x] Gewählter Ansatz: Der Rückblick wird nicht mehr in `#stageHost` hineingerendert, sondern in einem eigenen, bereits im Code vorhandenen Overlay-Muster (`.overlay`/`.modal`, wie „Your badges"/„Rework log") über den unangetasteten aktuellen Bildschirm gelegt. Schließen entfernt nur die `.show`-Klasse — der aktuelle Bildschirm darunter wurde nie verändert.
- [x] Wiederverwendung statt neuer UI: der bestehende Badge-Zähler in der Kopfzeile (`#badgeChip`) ist schon auf jedem Bildschirm sichtbar und öffnet bereits eine Liste der Badges — diese Liste wird nur um Klickbarkeit ergänzt.
- [x] Aufwand: klein, da FEATURE-004 die Datengrundlage (`S.history`, `S.badges[].i`) bereits liefert.

**Testplan:**
- [x] Automatisiert (jsdom): Spiel bis Schritt 4 gespielt, dort bewusst gestoppt, eine Karte zugeordnet (Rest offen gelassen), Badge-Zähler geöffnet, Eintrag für Schritt 2 angeklickt, Inhalt geprüft, Rückblick geschlossen, geprüft dass die eine zugeordnete Karte, der Fortschrittszähler und der DOM-Slot exakt erhalten blieben, danach Schritt 4 normal fertig gespielt.
- [x] Regressionstest: alle drei Abschlussseiten-Durchläufe aus FEATURE-004 (Maus/Touch/Versuchung) erneut ausgeführt — funktionieren unverändert mit der neuen Overlay-Umsetzung, alle 7 Badges je einzeln geprüft.
- [x] Syntax-Check (`node --check`) fehlerfrei.
- [ ] Echter visueller Blick im Browser steht wie bei FEATURE-004 noch aus (gleiche technische Einschränkung: kein `file://`-Zugriff für den Chrome-Test dieser Sitzung).

**Scope-Änderungen** *(chronologisches Log):*
*(leer bei Erstellung)*

**Implementierungsnotizen:**
Umgesetzt in `public/index.html`, direkt auf v1.5.0 aufsetzend (`git log`/`git status` vor Beginn geprüft, kein zwischenzeitlicher Stand). `openReview(i)` ersetzt nicht mehr `host.innerHTML`, sondern befüllt ein neues, dem bestehenden Overlay-Muster folgendes Fenster (`#ovReview`, wie „Your badges“/„Rework log“) und zeigt es per `.show`-Klasse an — der eigentliche Spielbildschirm in `#stageHost` wird dabei nie berührt, daher bleibt ein halb bearbeiteter Schritt beim Schließen exakt erhalten. Schließen läuft über den bereits vorhandenen generischen `[data-close]`-/Klick-außerhalb-Mechanismus, kein eigener Rückweg-Button mehr nötig (dadurch entfällt auch der Konfetti-Nebeneffekt von FEATURE-004). Der bestehende Badge-Zähler in der Kopfzeile (`#badgeChip`) — vorher nur eine reine Liste — bekommt pro Eintrag zusätzlich `data-i` und einen Klick-Handler, der die Badge-Liste schließt und direkt `openReview(i)` öffnet; dieselbe Funktion bedient jetzt sowohl die Abschlussseite als auch das laufende Spiel.

**Technische Randnotiz (kein Nutzer-Effekt, aber für später dokumentiert):** Der zuletzt angesehene Rückblick-Schnappschuss bleibt bis zum nächsten Öffnen unsichtbar im DOM von `#reviewBody` liegen (Overlay ist nur per CSS `display:none` versteckt, nicht entfernt). Da gespeicherte Schnappschüsse dieselben Element-IDs/-Klassen wie der echte, aktuelle Bildschirm verwenden können (z. B. `id="check"`, `.bucket`), wurde geprüft, dass dadurch kein echtes Fehlverhalten entsteht: `#stageHost` steht im HTML vor den Overlays, wodurch ungezielte `document.getElementById(...)`-Zugriffe im echten Spielcode immer zuerst das echte, aktuelle Element treffen; zusätzlich ist der Schnappschuss durch `pointer-events:none` und das unsichtbare, geschlossene Overlay für echte Klicks ohnehin nicht erreichbar. Im automatisierten Test musste deshalb bewusst auf `#stageHost` eingegrenzt werden, um nicht versehentlich Elemente aus dem liegen gebliebenen alten Schnappschuss mitzuzählen.

**Release:** Als v1.6.0 released (Commit `08da401`), GitHub Action grün (37s). Stephan hat live geprüft — Badge-Zähler mitten im Spiel öffnen und einen früheren Schritt anklicken funktioniert wie vorgesehen. Bestätigt und auf Done gesetzt.

### FEATURE-004 Rückblick auf frühere Spielschritte über die Abschlussseite

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | Done |
| **Erstellt** | 2026-07-20 |
| **In Progress seit** | 2026-07-20 |
| **Fertiggestellt** | 2026-07-20 |

**Beschreibung:** Von der Abschlussseite aus soll man über die dort ganz unten gezeigten Badge-Icons zu den jeweils letzten Bildschirmen der schon abgeschlossenen Spielschritte zurückspringen können — rein zur Ansicht (was wurde gezeigt, was wurde ausgewählt), ohne dass dort etwas verändert werden kann. Von dort führt ein Button zurück zur Abschlussseite.

**User Story:** Als Spielerin/Spieler möchte ich mir nach dem Durchspielen nochmal ansehen können, was ich bei einem bestimmten Schritt gesehen und ausgewählt hatte, sodass ich Details nachvollziehen kann, ohne das Spiel neu spielen zu müssen.

**Scope:**
Eingeschlossen: die Badge-Icons im Bereich ganz unten auf der Abschlussseite (ein Icon pro abgeschlossenem Schritt mit Badge, aktuell 7) werden anklickbar; ein Klick zeigt den letzten Bildschirm dieses Schritts (inkl. Agenten-Reaktion und Debrief-Text) in einer reinen Ansichts-Variante — keine Buttons darin funktionieren. Ein eigener „← Zurück zu den Ergebnissen"-Button führt zurück zur Abschlussseite.
Ausgeschlossen: kein Zugriff auf Schritte ohne Badge (der erzwungene Schnellstart und der Rewind-Übergangsbildschirm haben keins); keine Rückkehr-Möglichkeit mitten im laufenden Spiel (nur von der Abschlussseite aus); keine Bearbeitung oder Neubewertung der früheren Auswahl; keine dauerhafte Speicherung über das Schließen des Browser-Tabs hinaus (bestehende Vorgabe: rein clientseitig, nichts wird gespeichert).

**Akzeptanzkriterien:**
- [x] Auf der Abschlussseite ist an jedem der Badge-Icons erkennbar, dass ein Klick möglich ist (Mauszeiger wird zur Hand, Icon hebt sich beim Überfahren leicht an; zusätzlich Hinweiszeile „Tap a badge to look back at that step“ direkt darüber).
- [x] Ein Klick auf ein Badge-Icon zeigt den Bildschirm, wie er unmittelbar vor dem Weiterklicken zum nächsten Schritt aussah — inklusive der eigenen getroffenen Auswahl und der Rückmeldung des Agenten (automatisiert für alle 7 Schritte geprüft).
- [x] In dieser Ansicht lässt sich nichts anklicken oder verändern (automatisiert geprüft: alle Buttons im gespeicherten Bildschirm haben keine aktive Funktion mehr; zusätzlich per CSS Klicks/Berührungen technisch unterbunden).
- [x] Es ist klar erkennbar, dass man sich in einer reinen Rückblick-Ansicht befindet (Hinweiszeile oben: „🔍 Looking back at: … — view only, nothing here can be changed.“).
- [x] Ein Button führt zuverlässig zurück zur Abschlussseite, die dort unverändert wieder korrekt angezeigt wird (automatisiert geprüft: Abschlussseite vor und nach dem Rückblick byte-identisch).
- [x] Das Verhalten funktioniert für jeden der sieben Badge-Schritte einzeln geprüft.
- [x] Keine Konsolenfehler beim Öffnen und Schließen der Rückblick-Ansicht.
- [ ] Auf schmalem Bildschirm (Handy-Breite) bleibt die Rückblick-Ansicht nutzbar — automatisiert nicht abschließend prüfbar (siehe Testplan), Stephans eigener Blick auf dem Handy steht noch aus.

**Analyse & Planung:**
- [x] Aktuellen Zustand verstanden: Das Spiel rendert pro Schritt den kompletten Bildschirm neu in `#stageHost` (`host.innerHTML`), es gibt bisher keine Historie früherer Bildschirme — nur laufende Summen (`S.analysis`, `S.cycle`, `S.badges`, `S.rework`).
- [x] Betroffene Stellen identifiziert: `go(n)` (Schrittwechsel), `completeStep` (Badge-Vergabe), `renderFinale` (Badge-Icons ganz unten, aktuell nicht anklickbar).
- [x] Implementierungsansatz: `S.history` als neues Array einführen. In `go(n)` wird vor dem Wechsel des Schritts (`S.i=n`) der aktuelle `host.innerHTML` unter dem bisherigen `S.i` abgelegt — das erfasst automatisch für jeden Schritttyp (categorize/build/select/fork/reveal) den exakt letzten gezeigten Zustand, ohne jede Render-Funktion einzeln anzufassen. Beim Badge-Vergeben in `completeStep` wird zusätzlich der Schrittindex mitgespeichert (`S.badges` bekommt ein `i`-Feld), damit ein Icon weiß, welchen History-Eintrag es öffnen soll. Klick auf ein Badge-Icon ersetzt `host.innerHTML` durch den gespeicherten Schnappschuss, umhüllt von einer Hinweiszeile und einem „Zurück"-Button; der Schnappschuss selbst bekommt `pointer-events:none`, damit darin nichts anklickbar ist. Der Zurück-Button ruft einfach erneut `renderFinale()` auf (keine eigene Wiederherstellung nötig, dadurch bleiben alle Handler korrekt verknüpft).
- [x] Risiken benannt: Der allererste `go(0)`-Aufruf beim Start eines neuen Durchlaufs würde kurz einen „falschen" History-Eintrag (den alten Startbildschirm) unter Index 0 ablegen — das wird aber beim Verlassen von Schritt 0 automatisch mit dem echten Inhalt überschrieben, bevor er je sichtbar würde (Schritt 0 hat ohnehin kein Badge und ist über die Abschlussseite nicht erreichbar). Der Zurück-Button löst über `renderFinale()` erneut den Konfetti-Effekt aus — bewusst in Kauf genommen (kein Fehler, eher ein kleines Wiedersehens-Feuerwerk).
- [x] Aufwand: klein bis mittel, reine Frontend-Logik in `public/index.html`.

**Testplan:**
- [x] Automatisiert (jsdom, echtes Ausführen der App-Logik im echten DOM, kein optischer Screenshot-Vergleich): drei vollständige Durchläufe — Maus-Modus mit diszipliniertem Weg, Touch-Modus (Antippen statt Ziehen) mit diszipliniertem Weg, Maus-Modus mit genommener Abkürzung an einem Versuchungsmoment. In jedem Durchlauf wurden alle 7 Badges einzeln angeklickt, der jeweils korrekte gespeicherte Bildschirm inkl. eigener Auswahl und Debrief geprüft, die technische Wirkungslosigkeit aller darin enthaltenen Buttons geprüft, die Rückkehr zur unveränderten Abschlussseite geprüft (Byte-Vergleich vorher/nachher) und auf JS-Fehler geprüft. Ergebnis: alle 3 Durchläufe × alle Prüfungen fehlerfrei bestanden (0 Fails, 0 JS-Fehler).
- [x] Syntax-Check des eingebetteten Skripts (`node --check`) fehlerfrei.
- [ ] Echter visueller Blick im Browser (Desktop + Handy-Breite) steht noch aus — der Chrome-Zugriff dieser Session kann `file://`-Seiten aus Sicherheitsgründen nicht steuern (Erweiterung hat dafür keine Berechtigung), und ein lokaler Server auf Stephans Mac lässt sich aus dieser Sitzung heraus nicht starten. Ein lokaler Python-Http-Server in meiner eigenen Cloud-Sandbox wäre für Stephans echten Browser nicht erreichbar (anderes Netzwerk). Deshalb bittet dieses Ticket Stephan um einen kurzen eigenen Blick vor dem Release.
- [ ] Bestehende Tests aktualisiert: keine vorhandene automatisierte Testsuite im Projekt gefunden — die jsdom-Prüfung oben ist neu und deckt zusätzlich den kompletten bisherigen Spielablauf (alle Schritttypen, Touch- und Maus-Modus, beide Versuchungs-Ausgänge) ab, nicht nur das neue Feature.

**Scope-Änderungen** *(chronologisches Log):*
- 2026-07-20: Versionsnummer von 1.4.2 auf **1.5.0** angehoben (Minor statt Patch, da eine echte neue, sichtbare Spielfunktion und nicht nur eine Textänderung) — analog zum Vorgehen bei FEATURE-001/003.

**Implementierungsnotizen:**
Umgesetzt in `public/index.html` (lokaler Git-Klon `~/Claude/Projects/Agentic Engineering Gamification/agent-contract-game`, Basis: v1.4.2 / Commit `151cb67`, vor dem Schreiben per `git log`/`git status` verifiziert — kein zwischenzeitlicher unabhängiger Stand). Neues `S.history`-Array wird generisch in `go(n)` befüllt (Schnappschuss des kompletten `host.innerHTML` des verlassenen Schritts, bevor der Index wechselt) — deckt automatisch alle Schritttypen ab, ohne jede Render-Funktion einzeln anfassen zu müssen. `S.badges`-Einträge tragen jetzt zusätzlich den Schrittindex (`i`). Auf der Abschlussseite sind die Badge-Icons jetzt anklickbar (`data-i`-Attribut, Cursor/Hover-Stil) und öffnen über `openReview(i)` den gespeicherten Bildschirm, umhüllt von einer Hinweiszeile und einem „← Back to results“-Button; der gespeicherte Bereich bekommt die CSS-Klasse `.reviewMode` mit `pointer-events:none`, wodurch technisch nichts darin anklickbar ist (zusätzlich zur Tatsache, dass beim Neuaufbau aus dem HTML-String ohnehin keine JS-Klick-Handler mehr existieren). Der Zurück-Button ruft einfach erneut `renderFinale()` auf statt den alten Zustand händisch wiederherzustellen — dadurch bleiben alle Handler korrekt verknüpft, als kleiner Nebeneffekt löst das erneut den Konfetti-Effekt aus (bewusst in Kauf genommen).

Der „For facilitators“-Button auf dem Startbildschirm wurde entgegen der ursprünglichen Vermutung NICHT verändert: eine Prüfung im Code ergab, dass er bereits funktioniert und einen echten Moderations-Hinweiskasten aufklappt — Stephan hat das nach kurzer Rückfrage bestätigt und möchte ihn unverändert behalten.

**Bestätigt:** Stephan hat den GitHub-Actions-Lauf (grün, `86886dc`) und die Live-Seite selbst geprüft — Badge-Klick und „Back to results" funktionieren wie vorgesehen. Direkt im Anschluss kam der Wunsch auf, den Rückblick auch während des laufenden Spiels verfügbar zu machen — das ist bewusst nicht Teil dieses Tickets (das war von Anfang an auf die Abschlussseite begrenzt), sondern wird als eigenes Ticket FEATURE-005 weitergeführt.

---
