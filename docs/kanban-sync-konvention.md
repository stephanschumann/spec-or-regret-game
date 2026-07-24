# Kanban-Sync-Konvention (spec-or-regret-kanban)

Seit 2026-07-23 gilt fuer dieses Projekt:

## Automatischer Teil (git-Hook, laeuft ohne Claude-Sitzung)
`.git/hooks/post-commit` prueft nach JEDEM Commit, ob `Backlog.md` oder
`Backlog-Archive.md` geaendert wurde (neues Ticket, geloeschtes Ticket,
Statuswechsel). Falls ja: `tools/sync_kanban.py` laeuft automatisch
(Lint -> Generieren), das frische HTML liegt danach in
`tools/_kanban_out/spec-or-regret-kanban.html`, und `tools/_kanban_out/.sync_state`
wird auf `pending` gesetzt (mit Commit-Hash + Zeitstempel).

## Manueller Teil (kann nur eine aktive Claude-Sitzung, kein Hook)
Der Hook kann das Live-Artifact NICHT selbst aktualisieren (kein API-Zugriff
aus der Mac-VM). Deshalb: **jede Claude-Sitzung, die in diesem Repo arbeitet,
prueft `tools/_kanban_out/.sync_state` zu Beginn** (bzw. direkt nachdem sie
selbst einen Backlog-aendernden Commit gemacht hat). Steht dort `pending`,
MUSS im selben Antwort-Turn nachgeholt werden:
1. `tools/_kanban_out/spec-or-regret-kanban.html` per `device_stage_files` holen
2. `SendUserFile`
3. `mcp__remote-devices__update_artifact` (id: `spec-or-regret-kanban`, file_uuid = ...)
4. `tools/_kanban_out/.sync_state` auf `pushed` setzen (Commit-Hash + Zeitstempel)

Das gilt AUCH wenn Stephan nicht danach fragt - das ist der ganze Punkt der
Automatisierung (Entscheidung Stephan, 2026-07-23).
