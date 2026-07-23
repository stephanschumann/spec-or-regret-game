# Gate-Status — Schritt-Validierung pro Ticket (Spec or Regret)

**Zweck:** verhindern, dass kritische Workflow-Schritte stillschweigend übersprungen werden.
Nicht das Modell „erinnert sich", sondern ein deterministisches Skript (`tools/gate_check.py`)
prüft am Ticket nach, ob die Vorstufen ihre Nachweise hinterlassen haben.

Vorbild ist FotoAlerts `docs/gate-status-konvention.md` (SPEC-W4 Baustein D, WS-014) — hier auf
die schlankere Spec-or-Regret-Pipeline zugeschnitten: Analyse → Implementierung (inkl. Tests +
Regression, siehe `spec-or-regret-impl`) → Release (`spec-or-regret-release`) → Retro. Kein
eigenes Refactor-, Verifikations- oder Product-Gate — die gibt es in diesem Prozess nicht.

## Die sechs Gates

| Gate | Bedeutung | Wird gesetzt von |
|------|-----------|-------------------|
| Spec (Analyse) | Freigegebene Spec inkl. Akzeptanzkriterien, Pre-Mortem | `spec-or-regret-analyze` |
| Tests definiert | Testdatei `tests/<ticket-id>.test.js` angelegt | `spec-or-regret-impl` |
| Implementierung | Code geschrieben, Tests grün | `spec-or-regret-impl` |
| Test bestanden (inkl. Regression) | Pflicht-Regressionslauf gegen alle bestehenden `tests/*.test.js` durchgeführt | `spec-or-regret-impl` |
| Release/Deploy | Deployt (Git-Push auf `main` löst Firebase-Hosting-Deploy aus) — oder bewusst „kein Deploy nötig" | `spec-or-regret-release` |
| Retro / Lernen | `retrospective`-Skill gelaufen | `retrospective` |

**Besonderheit gegenüber Flow Game:** Es gibt keinen eigenen Vor-Implementierungs-Testschritt wie
`flow-game-bdd`. „Tests definiert" und „Implementierung" entstehen im selben `spec-or-regret-impl`-
Durchlauf — beide Gates werden dann in der Regel zusammen gesetzt, nicht nacheinander von zwei
verschiedenen Skills.

## Zwei Wege, ein Gate zu setzen

**1. Tabelle** (aus Kompatibilitätsgründen von `gate_check.py` erkannt, in der Praxis eher
unüblich):

```markdown
**Gate-Status:** <!-- maschinell geprüft · nur via Skills oder durch Stephan ändern -->
| Gate | Status | Nachweis / Begründung |
|------|--------|-----------------------|
| Spec | ⬜ | — |
| Tests definiert | ⬜ | — |
| Implementierung | ⬜ | — |
| Test bestanden | ⬜ | — |
| Release | ⬜ | — |
```

**2. Freistehende Marker-Zeile** (der erwartbar übliche Weg — nur für Retro und Release):

```markdown
**Retro:** ✅ 2026-07-22 — Regel X ergänzt, Memory aktualisiert
**Release:** ✅ 2026-07-22 — deployt auf learning.stephanschumann.com, Health-Check grün
```

Für Spec/Tests/Implementierung/Test bestanden gibt es aktuell keinen Freitext-Marker in
`gate_check.py` — dafür die Tabellenform nutzen, oder bei Bedarf später ergänzen lassen, sobald
sich in der Praxis ein wiederkehrendes Prosa-Muster zeigt.

## Drei Zustände je Gate

- **✅ erledigt** — Nachweis liegt vor.
- **⬜ offen** — kein Nachweis. Blockiert jeden nachgelagerten Schritt.
- **⤼ übersprungen** — von Stephan bewusst freigegeben. **Nur gültig**, wenn die
  Nachweis-/Begründungsspalte dem Format `Stephan JJJJ-MM-TT: <Grund>` entspricht. Ohne diese
  Zuschreibung gilt ein ⤼ als **ungültig (= rot)** — das Modell kann sich nicht selbst freigeben.

## Reihenfolge / welche Vorstufen ein Schritt verlangt

| Bevor dieser Schritt startet | müssen erledigt/übersprungen sein |
|-------------------------------|-----------------------------------|
| Implementierung | Spec · Tests definiert |
| Test ausführen | Spec · Tests · Implementierung |
| Release | Spec · Tests · Implementierung · Test bestanden |
| Done | alle oben + Release |
| Retro | alle oben + Release |

## Aufruf

```
python3 tools/gate_check.py <TICKET-ID> --phase <impl|test|release|done|retro>
python3 tools/gate_check.py <TICKET-ID> --all      # nur Status zeigen, kein Gating
```

Exit 0 = grün (Schritt darf starten). Exit 1 = rot (blockieren, fehlenden Schritt anstoßen).

## Bekannter Stand (2026-07-22)

Bislang enthält noch kein reales Spec-or-Regret-Ticket einen Gate-Status-Block — das Skript ist
neu (WS-014 Phase 2). Für neue Tickets ab jetzt gilt: Retro-/Release-Marker im Ticket festhalten,
sobald sie durchlaufen sind, damit `gate_check.py` sie erkennt.
