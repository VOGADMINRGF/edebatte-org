# Voxy Canonical Visual Boards

Status: **human-approved canonical visual target**, confirmed again 2026-08-14.

These four boards are the concrete visual source of truth referenced by `../MASTER-LOOK-DECISION_2026-08-04.md`. They are not optional mood references and must not be replaced by a simplified SVG interpretation.

## Canon files

| ID | Repository filename | Role | Pixel size | SHA-256 of human-supplied original |
| --- | --- | --- | --- | --- |
| CANON-01 | `CANON-01-character-development-board.png` | Character development board: desk hero, standing front/3-4 views, expressions, five-finger hand details, broadcast/UI and palette | 1491×1055 | `e58f4f5a6b23d8da6ccd81d979057f1b6f8ce8ae22eeba7032a2fb417a2c8bcc` |
| CANON-02 | `CANON-02-character-overview-board.png` | Character overview board: same canonical character, standing/gesture views, expression range, hand details, broadcast/UI and turquoise/electric-blue style | 1672×941 | `e881e2c0e698f70eeb71ed78a021c5ef6bab8d37d52277e00a08e2f7ed9a8fe7` |
| CANON-03 | `CANON-03-broadcast-layout-teal.png` | Canonical broadcast/editorial composition with topic/date, right-column content cards, lower-third and caption safe zone; turquoise/electric-blue treatment | 1672×941 | `479caf603da577009318beda49b4e0dc61f79c70e6bdb9fed820d448767aaded` |
| CANON-04 | `CANON-04-broadcast-layout-blue.png` | Canonical broadcast/editorial composition with topic/date, right-column content cards, lower-third and caption safe zone; electric-blue treatment | 1672×941 | `8ec3927f2871b210f46468f56a2845811c89dbb971c11bf086de7446ac0efff8` |

## Binding hierarchy

1. These four PNGs are the **visual canon**.
2. `MASTER-LOOK-DECISION_2026-08-04.md` is the textual contract explaining invariants.
3. Later review images may supplement lighting, composition or usage ideas but do **not** replace these four boards.
4. Derived production assets, rigs, SVGs, videos and layouts must demonstrate fidelity to these boards before Human Visual Acceptance.

## Character invariants visible in the canon

- one Voxy character, not multiple reinterpretations;
- white dimensional speech-bubble head with the dark upper-right cap/notch;
- three left-side signal bars;
- black oval eyes, simple brows and friendly mouth with blue tongue/highlight;
- black/blue over-ear headphones;
- dark navy textured blazer over black roll-neck;
- VOG lapel/pin and eDebatte chest/pocket marking as replaceable overlays;
- consistent body proportions in seated, front-standing and 3/4 gesturing views;
- visible hands always have exactly five fingers and preserve the approved soft 3D anatomy;
- premium dark broadcast studio with microphone, desk, waveform and controlled electric-blue/turquoise light;
- Voxy remains a trustworthy moderator rather than a flat mascot or simplified icon.

## Broadcast/layout invariants visible in the canon

- deep navy/black base with electric blue and controlled turquoise;
- waveform behind Voxy, not through text/logo zones;
- clearly separated logo/brand zone;
- topic/date zone in the upper-right;
- structured right-column content zone;
- lower-third headline zone;
- subtitle/closed-caption safe zone;
- clean, evidence-oriented broadcast/editorial hierarchy;
- all production typography remains native/editable and must not copy generated placeholder text from the boards.

## Fail-closed rule

If the exact four PNG files are absent, altered without explicit human approval, or a derived character/layout visibly diverges from them, `humanVisualAcceptance` and `animationEligible` must remain false.

The previously rejected #589 SVG-rig render is technical evidence only and is **not** a visual replacement for this canon.