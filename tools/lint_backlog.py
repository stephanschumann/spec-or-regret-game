#!/usr/bin/env python3
"""
lint_backlog.py — Konsistenz-Check für Backlog.md (+ Backlog-Archive.md) VOR jedem
Kanban-Push. Nach dem Vorbild von FotoAlert/tools/lint_backlog.py, aber vereinfacht
auf die 3-Lane-Struktur dieses Projekts (kein 🚦-Board, keine Pipeline-Lanes).

Exit 0 = sauber. Exit 1 = Divergenz gefunden (laut abbrechen, nicht still auflösen).
Prüft:
  E1 doppelte Ticket-IDs (über Backlog.md + Backlog-Archive.md hinweg)
  E2 Status-Feld widerspricht dem Abschnitt, in dem das Ticket steht
     (z. B. Status=Done, aber Ticket steht unter "## 📋 ToDo")
  W1 aktives Ticket (nicht in "## ✅ Done") ohne Status-Feld
"""
import re, sys, os
from collections import Counter

_main = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "Backlog.md")
text = open(_main, encoding="utf-8").read()
_arch = os.path.join(os.path.dirname(os.path.abspath(_main)), "Backlog-Archive.md")
if os.path.exists(_arch):
    text += "\n\n" + open(_arch, encoding="utf-8").read()

lines = text.split("\n")

def status_to_key(s):
    s = (s or "").lower()
    if "done" in s: return "done"
    if "in progress" in s: return "inprogress"
    if "todo" in s or "to do" in s: return "todo"
    return None

def section_to_key(sec):
    s = sec.lower()
    if "done" in s or "✅" in sec: return "done"
    if "in progress" in s or "🔄" in sec: return "inprogress"
    if "todo" in s or "📋" in sec: return "todo"
    return None

ID_RE = re.compile(r'^###\s+(~~)?\s*([A-Z]+-\d+[a-z]?)\s*(?:[·:\-]\s*)?(.*)$')

errors = []; warns = []; ids = []
i = 0; n = len(lines); section = ""
while i < n:
    if lines[i].startswith("## "):
        section = lines[i]
    m = ID_RE.match(lines[i])
    if not m:
        i += 1; continue
    tid = m.group(2); ids.append(tid)
    j = i + 1; body = []
    while j < n and not lines[j].startswith("### ") and not lines[j].startswith("## "):
        body.append(lines[j]); j += 1
    b = "\n".join(body)
    sm = re.search(r'^\|\s*\*\*Status\*\*\s*\|\s*(.*?)\s*\|', b, re.M)
    status = sm.group(1).strip() if sm else ""
    slane = status_to_key(status) if status else None
    seclane = section_to_key(section)

    if slane and seclane and slane != seclane:
        errors.append(f"E2 {tid}: Status='{status}' ({slane}), steht aber im Abschnitt '{section.strip()}' ({seclane})")
    if not status and seclane != "done":
        warns.append(f"W1 {tid}: kein Status-Feld gesetzt, Abschnitt '{section.strip()}' -> Generator nutzt Abschnitt als Fallback")
    i = j

dupes = [k for k, v in Counter(ids).items() if v > 1]
for d in dupes:
    errors.append(f"E1 doppelte ID: {d} ({Counter(ids)[d]}x)")

for e in errors: print("❌", e)
for w in warns: print("⚠️ ", w)
print(f"\n{len(ids)} Tickets · {len(errors)} Fehler · {len(warns)} Warnungen")
sys.exit(1 if errors else 0)
