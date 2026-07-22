#!/usr/bin/env python3
"""
sync_kanban.py — atomarer Kanban-Sync: erst LINTEN, dann GENERIEREN. Bricht laut ab,
wenn Backlog.md inkonsistent ist (statt still die veraltete Quelle zu bevorzugen).
Nach dem Vorbild von FotoAlert/tools/sync_kanban.py.

Aufruf:  python3 agent-contract-game/tools/sync_kanban.py <outputs-dir>
Danach:  Datei per SendUserFile hochladen, dann
         mcp__remote-devices__update_artifact (id: agent-contract-kanban, file_uuid = ...)

Der Push (update_artifact) bleibt der MCP-Call des Agenten — dieser Wrapper stellt nur
sicher, dass NIE generiert/gepusht wird, solange der Lint rot ist.
"""
import sys, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2 or not sys.argv[1].strip():
    print(
        "⛔ Fehlendes Ausgabeverzeichnis-Argument.\n"
        "Aufruf:  python3 sync_kanban.py <outputs-dir>",
        file=sys.stderr,
    )
    sys.exit(2)
out_dir = sys.argv[1]
backlog = os.path.join(HERE, "..", "Backlog.md")

print("→ Lint Backlog.md …")
r = subprocess.run([sys.executable, os.path.join(HERE, "lint_backlog.py"), backlog])
if r.returncode != 0:
    print("\n⛔ Lint rot — KEIN Generieren, KEIN Push. Erst Backlog.md korrigieren.", file=sys.stderr)
    sys.exit(1)
print("✓ Lint sauber. → Generiere …")
r = subprocess.run([sys.executable, os.path.join(HERE, "gen_kanban.py"), out_dir])
if r.returncode != 0:
    sys.exit(r.returncode)
html = os.path.join(out_dir, "agent-contract-kanban.html")
print(f"\n✓ Fertig: {html}")
print("→ Jetzt: SendUserFile + mcp__remote-devices__update_artifact (id: agent-contract-kanban).")
