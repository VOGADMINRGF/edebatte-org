# Scope boundary

Dieser PR implementiert ausschließlich den providerneutralen Audio-/Caption-Vertrag: reale lokale DE-/EN-Audioinspektion und Normalisierung, revisionsgebundene WebVTT-/SRT-Artefakte, Transcript↔Caption-Integrität, formatabhängige Safe Areas und fokussierte Contract-Tests.

Die lokale `espeak-ng`-Stimme ist nur eine reproduzierbare CI-Fixture und **kein Voxy-Stimm-Canon**. Dieser Slice darf weder Character-, Visual- noch Voice-Canon neu definieren oder einen Human-Final-Stand ersetzen.

Nicht enthalten: Lip-Sync, Viseme-Generierung, externer Upload, Scheduling, Publishing, Auto-Publish oder Selbstfreigabe.
