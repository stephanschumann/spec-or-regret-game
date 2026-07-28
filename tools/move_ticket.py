#!/usr/bin/env python3
"""
move_ticket.py — verschiebt ein Ticket in Backlog.md programmatisch zwischen den
Lanes ToDo / In Progress / Done (book-of-work-Format, Spec or Regret).

Usage:
    python3 tools/move_ticket.py Backlog.md <TICKET-ID> <todo|inprogress|done> [--date YYYY-MM-DD] [--dry-run]

Setzt die Logik aus dem book-of-work-Skill um (Abschnitt "Lane-Verschiebungen in
der Backlog-Datei"): Blockgrenze ist ausschließlich eine Ticket-ID-Überschrift
(`### FEATURE-<Nr>` / `### BUG-<Nr>` / `### TASK-<Nr>`), Text-Anker-Pflicht vor
jeder Ersetzung, kein doppeltes Setzen bereits vorhandener Datumsfelder.

Nach jedem Lauf gegen die echte Backlog.md zusätzlich `tools/lint_backlog.py`
laufen lassen (0 Fehler, unveränderte Ticketzahl erwartet) — dieses Skript prüft
nur die Struktur des eigenen Umzugs, nicht die gesamte Datei.
"""
import argparse
import datetime
import re
import sys

LANE_MARKER = {"todo": "📋 ToDo", "inprogress": "🔄 In Progress", "done": "✅ Done"}
STATUS_LABEL = {"todo": "ToDo", "inprogress": "In Progress", "done": "Done"}
TICKET_HEAD = re.compile(r'^### (FEATURE|BUG|TASK)-\d+\b', re.M)
LANE_HEAD = re.compile(r'^## .*$', re.M)


class MoveError(Exception):
    """Signalisiert einen Struktur-/Anker-Fehler — Aufrufer darf dann nichts schreiben."""


def find_lane_of(content: str, pos: int) -> str:
    """Liefert die Lane-Überschriftszeile, die unmittelbar vor Position pos steht."""
    heads = list(LANE_HEAD.finditer(content[:pos]))
    if not heads:
        raise MoveError("Keine Lane-Überschrift vor dem Ticket gefunden")
    return heads[-1].group(0)


def move_ticket_block(content: str, ticket_id: str, target_status: str, date_str: str):
    """
    Verschiebt den Ticketblock ticket_id in die Ziel-Lane target_status, aktualisiert
    Status- und Datumsfeld. Gibt (neuer_content, alte_lane_zeile, block_text) zurück.
    Wirft MoveError bei nicht gefundener/mehrfach gefundener ID oder Struktur-Fehlern —
    in dem Fall wurde nichts verändert.
    """
    if target_status not in STATUS_LABEL:
        raise MoveError(f"Unbekannter Zielstatus: {target_status!r} (erlaubt: {list(STATUS_LABEL)})")

    # 1) Ticket-Überschrift eindeutig finden — NUR "### <ID>", keine Ticket-interne
    #    "### "-Unterüberschrift (z. B. "### Option A" im Optionenvergleich)
    head_re = re.compile(rf'^### {re.escape(ticket_id)}\b.*$', re.M)
    matches = list(head_re.finditer(content))
    if not matches:
        raise MoveError(f"Ticket {ticket_id} nicht in der Datei gefunden")
    if len(matches) > 1:
        raise MoveError(f"Ticket {ticket_id} mehrfach gefunden ({len(matches)}x) — Datei prüfen")
    m = matches[0]
    if content.count(m.group(0)) != 1:
        raise MoveError(f"Anker nicht eindeutig: {m.group(0)!r}")
    start = m.start()

    # 2) Blockende: nächste Ticket-ID-Überschrift ODER nächste Lane-Überschrift ODER Dateiende
    tail = content[m.end():]
    candidates = [p.start() for p in (TICKET_HEAD.search(tail), LANE_HEAD.search(tail)) if p]
    end_rel = min(candidates) if candidates else len(tail)
    end = m.end() + end_rel
    block = content[start:end]

    old_lane = find_lane_of(content, start)

    # 3) Status-Feld setzen
    block, n = re.subn(r'(\|\s*\*\*Status\*\*\s*\|\s*).*?(\s*\|)',
                        rf'\g<1>{STATUS_LABEL[target_status]}\g<2>', block, count=1)
    if n != 1:
        raise MoveError(f"Status-Feld in {ticket_id} nicht gefunden")

    # 4) Lane-Datumsfeld setzen — bestehendes gleichnamiges Feld aktualisieren statt doppelt anlegen
    if target_status in ("inprogress", "done"):
        field = "In Progress seit" if target_status == "inprogress" else "Done seit"
        field_re = re.compile(rf'\|\s*\*\*{re.escape(field)}\*\*\s*\|.*?\|')
        if field_re.search(block):
            block = field_re.sub(f'| **{field}** | {date_str} |', block, count=1)
        else:
            block = re.sub(r'(\|\s*\*\*Status\*\*\s*\|.*?\|\n)',
                            rf'\g<1>| **{field}** | {date_str} |\n', block, count=1)

    # 5) Block ausschneiden, an den Anfang der Ziel-Lane einfügen (Konvention: neueste zuerst)
    rest = content[:start] + content[end:]
    marker = LANE_MARKER[target_status]
    tm = re.search(rf'^## .*{re.escape(marker)}.*$', rest, re.M)
    if not tm:
        raise MoveError(f"Ziel-Lane '{marker}' nicht in der Datei gefunden")
    insert_at = tm.end() + 1
    after = rest[insert_at:].lstrip("\n")
    result = rest[:insert_at] + "\n" + block.strip("\n") + "\n\n" + after

    # 6) Struktur-Check: Ticketzahl vor/nach gleich, jede Lane genau einmal
    before = len(TICKET_HEAD.findall(content))
    after_count = len(TICKET_HEAD.findall(result))
    if before != after_count:
        raise MoveError(f"Ticketzahl geändert: {before} -> {after_count} — Abbruch, nichts geschrieben")
    for mk in LANE_MARKER.values():
        if len(re.findall(rf'^## .*{re.escape(mk)}.*$', result, re.M)) != 1:
            raise MoveError(f"Lane '{mk}' kommt nicht genau einmal vor — Abbruch, nichts geschrieben")

    return result, old_lane, block


def main():
    ap = argparse.ArgumentParser(description="Verschiebt ein Ticket zwischen Lanes in Backlog.md")
    ap.add_argument("backlog_file", help="Pfad zu Backlog.md")
    ap.add_argument("ticket_id", help="z. B. TASK-004, FEATURE-017, BUG-006")
    ap.add_argument("target", choices=["todo", "inprogress", "done"], help="Ziel-Lane")
    ap.add_argument("--date", default=datetime.date.today().isoformat(),
                     help="Datum für das Lane-Datumsfeld (YYYY-MM-DD), Default: heute")
    ap.add_argument("--dry-run", action="store_true",
                     help="Nur den geplanten Struktur-Diff ausgeben, nichts schreiben")
    args = ap.parse_args()

    try:
        content = open(args.backlog_file, encoding="utf-8").read()
    except OSError as e:
        print(f"❌ Konnte {args.backlog_file} nicht lesen: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        result, old_lane, _block = move_ticket_block(content, args.ticket_id, args.target, args.date)
    except MoveError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(1)

    before = len(TICKET_HEAD.findall(content))
    after = len(TICKET_HEAD.findall(result))
    new_lane_marker = LANE_MARKER[args.target]

    if args.dry_run:
        print(f"[dry-run] {args.ticket_id}: '{old_lane.strip()}' → '{new_lane_marker}'")
        print(f"[dry-run] Ticketzahl vor/nach: {before} / {after} (unverändert: {before == after})")
        print("[dry-run] Nichts geschrieben.")
        return

    with open(args.backlog_file, "w", encoding="utf-8") as f:
        f.write(result)

    print(f"✅ {args.ticket_id} verschoben: '{old_lane.strip()}' → '{new_lane_marker}'")
    print(f"   Ticketzahl vor/nach: {before} / {after}")


if __name__ == "__main__":
    main()
