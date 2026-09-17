# LIVE-TRUTH-GATE-01

Stand: 2026-09-17
Repo: `VOGADMINRGF/edebatte-org`

## Ziel

Die oeffentliche Event-/Live-Flaeche darf nur Faehigkeiten und Zustaende behaupten, die zur Laufzeit wirklich belegt sind.

Verbindliche Regeln:

- Entwurf ist nie automatisch ein angekuendigtes Event.
- `Live` beschreibt den Eventstatus; `Livestream` nur einen tatsaechlich vorhandenen Player.
- `Replay` wird nur mit tatsaechlich vorhandenem Video-/Replay-Asset behauptet.
- Medienstatus, Eventstatus und Beteiligungsstatus bleiben getrennte Wahrheiten.
- Nicht oeffentliche oder noch nicht freigegebene Beteiligungsdaten duerfen nicht in der Public Projection erscheinen.
- Keine automatische Publikation aus Stream-Input.
- QR/Share nur fuer bewusst freigegebene oeffentliche Kontexte.
- Die mobile Navigation darf den Reifegrad nicht ueberzeichnen; bis zur vollstaendigen E2E-Freigabe heisst die Flaeche `Events`.

## Release Gate

Vor Rueckbenennung auf `Live` muessen mindestens belegt sein:

1. bewusst freigegebenes Event erscheint oeffentlich,
2. Entwuerfe bleiben unsichtbar,
3. Eventstatus ist korrekt,
4. Playerstatus ist korrekt,
5. Replay wird nur bei realem Replay angezeigt,
6. oeffentliche Beteiligung ist fail-closed und review-first,
7. Public Projection zeigt ausschliesslich erlaubte Sichtbarkeitszustaende,
8. QR/Link oeffnet exakt denselben freigegebenen Kontext,
9. iPhone-Human-Smoke fuer Event -> Beteiligung -> Review -> Ergebnis-/Folgepfad ist erfolgreich,
10. keine Auto-Publish-, Auto-Poll- oder Fake-Video-Behauptung.
