#!/usr/bin/env python3
"""
gate_check.py — deterministischer Schritt-Check VOR jedem Workflow-Schritt.

Prüft am Ticket (Gate-Status-Block, siehe docs/gate-status-konvention.md), ob die
Vorstufen erledigt oder von Stephan gültig übersprungen sind. Vorbild: lint_backlog.py.

Spec or Regret hat eine schlankere Pipeline als FotoAlert: Analyse → Implementierung
(inkl. Tests + Regression) → Release. Kein eigenes Refactor-, Verifikations- oder
Product-Gate.

Aufruf:
  python3 tools/gate_check.py <TICKET-ID> --phase <impl|test|release|done|retro>
  python3 tools/gate_check.py <TICKET-ID> --all      # nur Status zeigen, kein Gating

Exit 0 = grün (Schritt darf starten).  Exit 1 = rot (blockieren, fehlenden Schritt anstoßen).
"""
import sys, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
BACKLOG = os.path.join(HERE, "..", "Backlog.md")
ARCHIVE = os.path.join(HERE, "..", "Backlog-Archive.md")

GATE_ORDER = ["spec", "tests", "impl", "test_pass", "release", "retro"]
LABEL_TO_KEY = [
    ("spec", "spec"), ("tests definiert", "tests"), ("test bestanden", "test_pass"),
    ("implementierung", "impl"), ("release", "release"), ("tests", "tests"),
]
GATE_LABEL = {"spec": "Spec (Analyse)", "tests": "Tests definiert", "impl": "Implementierung",
              "test_pass": "Test bestanden (inkl. Regression)", "release": "Release/Deploy",
              "retro": "Retro / Lernen"}
GATE_SKILL = {"spec": "spec-or-regret-analyze", "tests": "spec-or-regret-impl",
              "impl": "spec-or-regret-impl", "test_pass": "spec-or-regret-impl (Regressionslauf)",
              "release": "spec-or-regret-release", "retro": "retrospective"}
REQUIRES = {
    "impl":    ["spec", "tests"],
    "test":    ["spec", "tests", "impl"],
    "release": ["spec", "tests", "impl", "test_pass"],
    "done":    ["spec", "tests", "impl", "test_pass", "release"],
    "retro":   ["spec", "tests", "impl", "test_pass", "release"],
}

ID_RE = re.compile(r'^###\s+(~~)?\s*([A-Z]+-\d+[a-z]?)\b')
WAIVER_RE = re.compile(r'Stephan\s+\d{4}-\d{2}-\d{2}\s*:')
STANDALONE_RE = re.compile(
    r'^\*\*(Retro(?:\s*/\s*Lernen)?|Release):\*\*\s*(✅|⬜|⤼)\s*(.*)$'
)
STANDALONE_KEY = {"retro": "retro", "retro / lernen": "retro", "release": "release"}


def read_all():
    t = open(BACKLOG, encoding="utf-8").read()
    if os.path.exists(ARCHIVE):
        t += "\n\n" + open(ARCHIVE, encoding="utf-8").read()
    return t


def find_ticket_body(text, tid):
    lines = text.split("\n")
    n = len(lines)
    for i in range(n):
        m = ID_RE.match(lines[i])
        if m and m.group(2) == tid:
            j = i + 1
            while j < n and not ID_RE.match(lines[j]) and not lines[j].startswith("## "):
                j += 1
            return "\n".join(lines[i + 1:j])
    return None


def label_to_key(label):
    # Exakter Vergleich (nicht Substring!): Backlog.md-Kopfzeilentabellen
    # (Feld/Wert, z. B. "Spec freigegeben am | 2026-07-21") enthalten Zellen,
    # die den Wortbestandteil "spec" etc. enthalten, aber KEIN Gate-Status-
    # Block-Eintrag sind. Ein Substring-Check ("spec" in "spec freigegeben am")
    # wuerde das faelschlich als Gate-Eintrag lesen und den "kein Gate-Status-
    # Block gefunden"-Hinweis unterdruecken (real gefunden in der parallelen
    # Flow-Game-Generalisierung, WS-014 Phase 2, 2026-07-22).
    l = label.strip().rstrip(":").lower()
    for frag, key in LABEL_TO_KEY:
        if l == frag:
            return key
    return None


def parse_gate_status(body):
    result = {}
    for ln in body.split("\n"):
        stripped = ln.strip()
        if stripped.startswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) < 2:
                continue
            key = label_to_key(cells[0])
            if not key:
                continue
            status_cell = cells[1]
            nachweis = cells[2] if len(cells) >= 3 else ""
        else:
            m = STANDALONE_RE.match(stripped)
            if not m:
                continue
            key = STANDALONE_KEY.get(m.group(1).lower())
            if not key:
                continue
            status_cell = m.group(2)
            nachweis = m.group(3)
        if "✅" in status_cell:
            tok = "done"
        elif "⤼" in status_cell or "übersprung" in status_cell.lower():
            tok = "waived" if WAIVER_RE.search(nachweis) else "waived_invalid"
        else:
            tok = "open"
        result[key] = (tok, nachweis)
    return result


def main():
    if len(sys.argv) < 2:
        print("Aufruf: gate_check.py <TICKET-ID> --phase <impl|test|release|done|retro> | --all", file=sys.stderr)
        sys.exit(2)
    tid = sys.argv[1]
    phase = None
    show_all = "--all" in sys.argv
    if "--phase" in sys.argv:
        phase = sys.argv[sys.argv.index("--phase") + 1]

    body = find_ticket_body(read_all(), tid)
    if body is None:
        print("❌ Ticket %s nicht gefunden (Backlog.md + Archive)." % tid)
        sys.exit(1)

    gates = parse_gate_status(body)
    icon = {"done": "✅", "open": "⬜", "waived": "⤼", "waived_invalid": "⚠️ungültig⤼"}

    print("Gate-Status für %s:" % tid)
    if not gates:
        print("  ⛔ Kein Gate-Status-Block gefunden — bitte gemäß docs/gate-status-konvention.md anlegen.")
    for k in GATE_ORDER:
        tok, nw = gates.get(k, ("open", ""))
        print("  %-30s %s  %s" % (GATE_LABEL[k], icon[tok], nw[:60]))

    if show_all or not phase:
        sys.exit(0)

    required = REQUIRES.get(phase)
    if required is None:
        print("\nUnbekannte Phase '%s'. Erlaubt: %s" % (phase, ", ".join(REQUIRES)), file=sys.stderr)
        sys.exit(2)

    missing = []
    for k in required:
        tok = gates.get(k, ("open", ""))[0]
        if tok not in ("done", "waived"):
            missing.append(k)

    print("\nZielphase: %s — verlangt: %s" % (phase, ", ".join(GATE_LABEL[k] for k in required)))
    if not missing:
        print("✅ GRÜN — alle Vorstufen erledigt/übersprungen. Schritt darf starten.")
        sys.exit(0)

    print("⛔ ROT — blockieren. Fehlende Vorstufe(n), zuerst anstoßen:")
    for k in missing:
        print("   • %-30s → nachholen via %s" % (GATE_LABEL[k], GATE_SKILL[k]))
    print("\nFehlende Schritte automatisch im Subagenten nachholen (Stephans Vorgabe),")
    print("außer der Schritt verlangt eine Stephan-Entscheidung (Weg-Gate/Release) → dann fragen.")
    sys.exit(1)


if __name__ == "__main__":
    main()
