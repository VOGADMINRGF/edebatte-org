# C4C0A Implementation Review Checklist

- Contract: `AUTHENTICATED_CREATE_EMAIL_VERIFICATION_RETURN_CONTINUITY_V1`
- Authorization: PR #830
- Preflight: PR #827
- Base: `main@60c627da601c3574251371d3dd6d219dd8887d88`

Review must prove:

- only safe internal navigation intent is persisted;
- token rotation always replaces/clears continuation intent;
- non-Create verification callers cannot inherit stale Create intent;
- canonical `normalizeInternalRedirectPath` is reused at input and confirmation boundaries;
- legacy/missing/unsafe values fall back to `/register/identity`;
- resend preserves a lawful target and clears absent target;
- email-confirm handoff returns identity plus encoded safe `next` only when lawful;
- cross-device behavior does not recreate C3A or any preparation/adoption/draft/recovery authority;
- no new collection/index/cookie/browser storage/API boundary/recovery source is introduced;
- focused tests plus exact-head Web CI pass.

C4C0/C4C remain blocked until post-merge closure. C5-C12 remain unauthorized until their own predecessor gates are closed.
