from pathlib import Path
import hashlib

path = Path("docs/E150/OpenTasks.md")
text = path.read_text()
marker = "## Historischer Katalog und Evidenz"
if text.count(marker) != 1:
    raise SystemExit("history marker not unique")
head, tail = text.split(marker, 1)
tail_hash = hashlib.sha256((marker + tail).encode()).hexdigest()

old_f3 = '''| VOXY-EU24-MULTILINGUAL-EDITORIAL-01 | codex_ready | P2 | Issue `#969`; EU24 Slices A–E previously completed; Work closeout audit F3 on `main@a4293c05cc6ff417609fe52540b8d68e1d048e33`; F1 closed via PR #1062; F2 closed separately via PR #1074 | **Audit repair F3 only — locale-aware numeric semantic guard:** preserve numeric magnitude and decimal/grouping semantics instead of stripping all non-digits; detect material number drift such as `1,5 km -> 15 km`; treat locale-ambiguous numeric forms fail-closed/review-required; reuse the existing Semantic Translation Guard / Language Variant binding and existing Evidence identity model | `1,5 -> 15` and equivalent percent/currency/unit regressions must trigger review; genuinely equivalent locale decimal/grouping forms remain accepted only when unambiguous; approved translation must be downgraded to review-required on numeric semantic drift; existing multilingual E2E + Web typecheck + Voxy runtime/canon gates green; no second translation engine/store/provider/evidence truth; F4 not authorized |'''
new_f3 = '''| VOXY-EU24-MULTILINGUAL-EDITORIAL-01 | review | P2 | Issue `#969`; EU24 Slices A–E completed; F1 master-freshness repair via PR #1062; Work F3 numeric-semantic repair via PR #1083 / merge `a55ee8f04d45e67ce8074dc0093b54e1891d43a4`; exact-head Web CI, Local Composition Runtime, Visual QA, AAA red-team, Final Canon and Alpha2 adapter green | **Audit repairs consumed:** language-variant master freshness and locale-aware numeric semantic preservation are implemented on the existing multilingual Editorial/Evidence/Render architecture; no executable #969 repair remains from the audited F1/F3 set | Fail-closed `review`, no branch authorization; no second translation/story/evidence/review/render truth, no provider/model activation, upload, scheduling or publish. Further #969 product changes require a new concrete defect and fresh authorization |'''

old_f4 = '''| VOXY-STUDIO-REVIEW-CONSISTENCY-01 | review | P1 | Issue `#977`; Slice A via PR `#1001` abgeschlossen; Slice B via PR `#1011` / Merge `6d8faf300f44f5a721ebfff5e6120d48e5cafdb7` abgeschlossen; Slice C via PR `#1013` / Merge `4575704ec69cb05d7ad866922e3027bbe74a7787` abgeschlossen; Exact-Head Voxy Runtime, Final Canon Lock und Web CI grün | **Final closeout:** keine ausführbare #977-Slice verbleibt. Die bestehende Studio-/Evidence-/Locale-/CI-Architektur ist maßgeblich; neue Arbeit nur bei neuem, konkret belegtem Delta und neuer SSOT-Autorisierung | Task-Preflight ist fail-closed (`review`, `executable=false`, keine Branch-Freigabe); kritische Preview-/Evidence-/Story-/Evidence-Window-Contracts sind im bestehenden Voxy Runtime-Gate verdrahtet; stale Evidence/Gate kann Locale-Approval nicht mehr als current-approved projizieren; keine zweite Queue/SSOT/CI-Pipeline, keine Provider-, Render-, Publish- oder Deployment-Side-Effects |'''
new_f4 = '''| VOXY-STUDIO-REVIEW-CONSISTENCY-01 | codex_ready | P2 | Issue `#977`; Slices A/B/C completed via PRs #1001/#1011/#1013; Work closeout audit F4 on `main@a4293c05cc6ff417609fe52540b8d68e1d048e33`; prior Evidence/Gate projection repair remains authoritative | **Audit repair F4 only — current review/audit truth in locale approval projection:** extend the existing per-draft current-approval projection so a locale counts as current-approved only when Evidence/Gate is current, the canonical review record is still `ready`, and the current `mark_ready` audit identity/actor exactly matches the draft's persisted `renderApproval`; historical approval remains auditable but cannot count as current after `in_review`, `blocked`, `request_changes` or a replaced ready audit | Reuse the existing Review Queue, renderApproval, Locale Matrix and route-loaded authority only; no new review/evidence persistence. Regressions cover ready→in_review/blocked/request_changes, replaced ready-audit/actor, and the delayed mark-in-review interleaving; runtime stays fail-closed; existing Voxy Runtime/Final Canon/Web CI remain green; no provider/render/upload/scheduling/social/publish side effects |'''

for label, old in (("F3", old_f3), ("F4", old_f4)):
    if head.count(old) != 1:
        raise SystemExit(f"expected exactly one {label} row, found {head.count(old)}")
head = head.replace(old_f3, new_f3, 1).replace(old_f4, new_f4, 1)
result = head + marker + tail
if hashlib.sha256((marker + tail).encode()).hexdigest() != tail_hash:
    raise SystemExit("historical tail hash changed")
if result.count(new_f3) != 1 or result.count(new_f4) != 1:
    raise SystemExit("post-replacement row uniqueness failed")
path.write_text(result)
