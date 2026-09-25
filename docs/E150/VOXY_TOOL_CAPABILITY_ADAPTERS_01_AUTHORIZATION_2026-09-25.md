# VOXY-TOOL-CAPABILITY-ADAPTERS-01 · Authorization Evidence

Date: 2026-09-25

This document records the bounded governance authorization for the first Voxy/Jarvis tool-capability slice.

## Canonical base

- `main@d7f3884455958d65db0e03bc1bf2e0c78e70dd81`
- existing Personal Voxy consented memory runtime merged via PR #1043
- Shared Conversation contract already represented on main
- Alpha2 Risk/Action Gate, fleet tool permissions, durable run ledger, execution fencing and idempotency remain the only execution/risk authorities

## Authorized first slice

`VOXY-TOOL-CAPABILITY-ADAPTERS-01`

Scope is limited to a typed provider- and app-neutral capability contract plus internal adapter boundary over existing eDebatte domain services. Voxy may produce a candidate action, but may not self-authorize it.

Required chain:

`final user intent -> capability resolve -> canonical domain validation -> Alpha2 risk gate -> preview/review/human approval when required -> fenced/idempotent execution -> typed result -> safe trace`

## Hard boundaries

- no second orchestrator, queue, run ledger, retry system or action authority
- no dynamic/invented endpoints or capability IDs
- no direct database/provider calls from Voxy UI
- no external app autonomy in this slice
- no auto-publish, autonomous voting, political persuasion action, or acting on behalf of the user
- human-only actions cannot be downgraded by tool metadata or agent output
- secrets/tokens/raw prompts/private chain-of-thought never enter tool result or Safe Trace

This authorization document does not itself activate providers, external connectors, production side effects, mail/calendar/browser access or irreversible actions. Task execution still requires the canonical OpenTasks row and a positive repository-owned task preflight.
