# Backlog-Archiv (Tickets bis v1.4.2)

> Synchronisierte Kopie aus der Claude-Projekt-Wissensablage „Agentic Engineering Gamification" (Dokument `claude/Backlog.md`, Stand 2026-07-21). Diese Datei ist die **archivierte** Historie — alle Tickets hier sind bereits abgeschlossen (Done) und werden nicht mehr bearbeitet. Neue Tickets entstehen ausschließlich in `Backlog.md` im selben Ordner. Diese Archiv-Kopie existiert, damit der lokale Kanban-Generator (`tools/gen_kanban.py`) — wie bei FotoAlerts `BACKLOG.md` + `BACKLOG-ARCHIVE.md` — rein lokal und ohne Cloud-Zugriff ein vollständiges Board inklusive der älteren Done-Tickets erzeugen kann. Bei Abweichungen zur Quelle in der Projekt-Wissensablage gilt Letztere als eigentliche Quelle.

## ✅ Done

### FEATURE-003 Lead Time bereits auf dem Startbildschirm erklären

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | Done |
| **Erstellt** | 2026-07-18 |
| **In Progress seit** | 2026-07-18 |
| **Fertiggestellt** | 2026-07-18 |

**Beschreibung:** Lead Time (Analyse-Zeit + Cycle Time, vom Bedarf bis in Nutzerhand) taucht bisher nur im Finale auf. Auf dem Startbildschirm werden aktuell nur die beiden Uhren „Analysis time“ und „Cycle time“ als zwei gleichrangige Karten erklärt – ohne dass klar wird, dass die eigentlich für User/Stakeholder relevante Größe die Summe aus beidem (Lead Time) ist. Ziel: den Startbildschirm so ergänzen, dass von Anfang an klar ist, dass nicht Cycle Time allein, sondern die für User/Stakeholder relevante Lead Time optimiert werden soll. Das schließt am Ende den Kreis, wenn im Finale die Lead Time in den drei gestapelten Balken wieder auftaucht.

**User Story:** Als Spielerin/Spieler möchte ich von Anfang an verstehen, dass das eigentliche Ziel die für User und Stakeholder relevante Lead Time ist (nicht nur eine niedrige Cycle Time), sodass die Botschaft des Finales keine Überraschung ist, sondern ein bewusst vorbereiteter Rückbezug.

**Release:** Als Version v1.4.2 released und als `versioning/agent-contract-1.4.2.html` im Projekt abgelegt. Live von Stephan bestätigt.

---

### FEATURE-002 Mobile Alternative zu Drag & Drop bei den Zuordnungsaufgaben

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | Done |
| **Erstellt** | 2026-07-18 |
| **In Progress seit** | 2026-07-18 |
| **Fertiggestellt** | 2026-07-18 |

**Beschreibung:** Die beiden Zuordnungsaufgaben im Spiel setzen auf Ziehen mit der Maus. Auf dem Handy ist Ziehen unzuverlässig bedienbar. Das Spiel erkennt jetzt selbst, ob es auf einem Gerät mit Finger-Bedienung oder mit Maus/Trackpad läuft, und bietet auf Finger-Geräten eine Zuordnung per direktem Antippen an statt Ziehen zu verlangen.

**User Story:** Als Spielerin/Spieler auf dem Handy möchte ich Karten den Kategorien direkt per Antippen zuordnen können, sodass ich die Zuordnungsaufgabe genauso zuverlässig lösen kann wie am Rechner.

**Release:** Als Version v1.4.0 released (Commit `9bbac5e`) und als `versioning/agent-contract-1.4.0.html` im Projekt abgelegt. Live von Stephan auf dem Handy bestätigt.

---

### TASK-001 Anleitungstext geräteunabhängig, Kategorie-Erklärung im Touch-Modus (v1.4.1)

| Feld | Wert |
|------|------|
| **Typ** | Task |
| **Priorität** | Niedrig |
| **Status** | Done |
| **Erstellt** | 2026-07-18 |
| **Fertiggestellt** | 2026-07-18 |

**Beschreibung:** Direkte Nachbesserung an FEATURE-002. Im Touch-Modus wird zusätzlich eine kurze Erklärung der Kategorien angezeigt (eigenes `legend`-Element, nur im Touch-Modus). Zusätzlich wurde der Anleitungstext oberhalb der Zuordnungsaufgaben geräteunabhängig überarbeitet.

**Implementierungsnotizen:** Als Version v1.4.1 released (Commit `99cefa6`) und als `versioning/agent-contract-1.4.1.html` im Projekt abgelegt.

---

### FEATURE-001 Versionsanzeige im Spiel

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Niedrig |
| **Status** | Done |
| **Erstellt** | 2026-07-17 |
| **In Progress seit** | 2026-07-17 16:05 |
| **Fertiggestellt** | 2026-07-17 |

**Beschreibung:** Am unteren Rand des Spiels „Agent Contract“ ist dauerhaft eine kleine Versionsangabe sichtbar, damit Stephan auf einen Blick erkennt, welche Version gerade geöffnet bzw. live ist. Gilt ab v1.3.1 für alle künftigen Releases.

**User Story:** Als Stephan (Betreiber/Facilitator des Spiels), möchte ich beim Öffnen des Spiels sofort sehen, welche Version gerade läuft, sodass ich nicht im Code nachsehen muss, um zu wissen, ob eine neue Version live ist.

**Implementierungsnotizen:** Umgesetzt als eigenständiges, statisches `#versionTag`-Element. Versionsnummer aus einer einzigen Konstante (`GAME_VERSION`). Als Patch-Version geführt (1.3.0 → 1.3.1).

---

*(Hinweis: Diese Archiv-Kopie enthält die Kernfelder jedes Tickets für die Kanban-Ansicht. Die vollständigen Details inkl. aller Akzeptanzkriterien, Analyse- und Testplan-Abschnitte stehen unverändert im Original-Dokument `claude/Backlog.md` in der Claude-Projekt-Wissensablage „Agentic Engineering Gamification".)*
