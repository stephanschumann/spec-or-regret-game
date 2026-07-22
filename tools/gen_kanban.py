#!/usr/bin/env python3
"""
gen_kanban.py — erzeugt das spec-or-regret-kanban Artifact-HTML deterministisch aus
Backlog.md (+ Backlog-Archive.md, falls vorhanden).

Nach dem Vorbild von FotoAlert/tools/gen_kanban.py, aber angepasst an dieses Projekt:
  - nur 3 Lanes (ToDo / In Progress / Done), keine mehrstufige Pipeline
  - Ticket-Überschriften ohne Trennzeichen: "### ID Titel" (FotoAlert nutzt "### ID · Titel")
  - Tickettypen: Feature / BugFix / Task (siehe book-of-work-Skill)

Kanonische Lane-Quelle ist das `Status`-Feld des Tickets. Reihenfolge der Auflösung:
  1) Status-Feld vorhanden -> dessen Lane (die einzige hand-editierte Wahrheit)
  2) sonst: Abschnitts-Überschrift (## ✅ Done / ## 🔄 In Progress / ## 📋 ToDo)
  3) sonst -> todo

Workflow (analog FotoAlert, Memory feedback_kanban_sync):
  1. In Backlog.md nur das Status-Feld des Tickets setzen
  2. python3 spec-or-regret-game/tools/sync_kanban.py <out>  -> schreibt <out>/spec-or-regret-kanban.html
  3. mcp__remote-devices__update_artifact (id: spec-or-regret-kanban, file_uuid = per SendUserFile hochgeladene Datei)
"""
import sys, os, re, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
BACKLOG  = os.path.join(HERE, "..", "Backlog.md")
ARCHIVE  = os.path.join(HERE, "..", "Backlog-Archive.md")
TEMPLATE = os.path.join(HERE, "kanban_template.html")

def read_backlog():
    """Backlog.md + (falls vorhanden) Backlog-Archive.md zusammen lesen.
    Ältere Done-Tickets (bis v1.4.2) liegen im Archiv; der Generator braucht beide
    für die vollständige Done-Spalte."""
    t = open(BACKLOG, encoding="utf-8").read()
    if os.path.exists(ARCHIVE):
        t += "\n\n" + open(ARCHIVE, encoding="utf-8").read()
    return t

LANE_KEYS = ["todo", "inprogress", "done"]

def status_to_key(status):
    s = (status or "").lower()
    if "done" in s:          return "done"
    if "in progress" in s:   return "inprogress"
    if "todo" in s or "to do" in s: return "todo"
    return None  # unbekannt/leer -> Section-Fallback greift

# ID-Zeile hier OHNE Pflicht-Trennzeichen zwischen ID und Titel (Abweichung zu FotoAlert):
# "### BUG-001 Titel" ebenso gültig wie "### BUG-001 · Titel" oder "### BUG-001: Titel"
ID_RE = re.compile(r'^###\s+(~~)?\s*([A-Z]+-\d+[a-z]?)\s*(?:[·:\-]\s*)?(.*)$')

def parse_backlog(text):
    lines = text.split("\n")
    tickets = []
    i = 0; n = len(lines); section = ""
    while i < n:
        if lines[i].startswith("## "):
            section = lines[i]
        m = ID_RE.match(lines[i])
        if not m:
            i += 1; continue
        struck = bool(m.group(1)); tid = m.group(2); title = m.group(3).strip()
        title = re.sub(r'~~\s*$', '', title).strip()
        j = i + 1; body_lines = []
        while j < n and not lines[j].startswith("### ") and not lines[j].startswith("## "):
            body_lines.append(lines[j]); j += 1
        body = "\n".join(body_lines).strip("\n")

        def field(label):
            mm = re.search(r'^\|\s*\*\*' + re.escape(label) + r'\*\*\s*\|\s*(.*?)\s*\|', body, re.M)
            return mm.group(1).strip() if mm else ""

        typ = field("Typ"); prio = field("Priorität"); status = field("Status")
        created = field("Erstellt"); started = field("In Progress seit"); done_at = field("Fertiggestellt")

        sec_l = section.lower()
        lane = status_to_key(status)
        if lane is None:
            if "erledigt" in sec_l or "done" in sec_l or "✅" in section or struck:
                lane = "done"
            elif "in progress" in sec_l or "🔄" in section:
                lane = "inprogress"
            else:
                lane = "todo"

        tickets.append({
            "id": tid, "title": title, "type": typ, "priority": prio, "lane": lane,
            "created": created, "started": started, "done_at": done_at, "body": body,
        })
        i = j
    return tickets

def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print(
            "⛔ Fehlendes Ausgabeverzeichnis-Argument.\n"
            "Aufruf:  python3 gen_kanban.py <outputs-dir>\n"
            "Bitte einen expliziten Output-Pfad angeben (nie ins Arbeitsverzeichnis schreiben) —\n"
            "nutze stattdessen sync_kanban.py <outputs-dir>.",
            file=sys.stderr,
        )
        sys.exit(2)
    out_dir = sys.argv[1]
    text = read_backlog()
    tickets = parse_backlog(text)
    template = open(TEMPLATE, encoding="utf-8").read()
    stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    tickets_json = json.dumps(tickets, ensure_ascii=False)
    # Sicherheitsnetz: Tickets duerfen Text wie "<script>...</script>" enthalten.
    # Ohne Escaping beendet der HTML-Parser das umschliessende <script>-Tag vorzeitig.
    tickets_json = tickets_json.replace("</", "<\\/")
    html = template.replace("__TICKETS_JSON__", tickets_json).replace("__STAMP__", stamp)
    out_path = os.path.join(out_dir, "spec-or-regret-kanban.html")
    open(out_path, "w", encoding="utf-8").write(html)
    from collections import Counter
    c = Counter(t["lane"] for t in tickets)
    print("Tickets gesamt:", len(tickets), file=sys.stderr)
    for k in LANE_KEYS:
        if c.get(k):
            ids = [t["id"] for t in tickets if t["lane"] == k]
            print(f"  {k:12s} {c[k]:3d}  {', '.join(ids)}", file=sys.stderr)
    print("HTML geschrieben:", out_path, file=sys.stderr)

if __name__ == "__main__":
    main()
