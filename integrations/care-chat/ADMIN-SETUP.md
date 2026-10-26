# Manual staff membership operations

Owner approved a manual additional workflow on26October2026. Active paid
coverage is confirmed by staff, rather than automatically read from LearnWorlds.
First intended operators: Agnes, Gin and Andrine; Andrine is the main responsible
person. Their individual login emails are pending. Names are not authorization.

## Prepared locally

Staff UI: `/care-admin.html`. API: `/care-admin/*`.
All operations are disabled without explicit configuration. Use separate
staff-only Supabase email verification, server-verified canonical identities and
the backend `FC_CARE_ADMIN_STAFF_EMAIL_HASHES` allowlist, never browser role flags.
Require confirmed nonanonymous Auth users and a recent sign-in (within2hours).
The browser retains the access token only in tab memory, never a refresh token
or remembered local storage. It clears state on sign-out/pagehide and signs out
after20minutes of inactivity. Each private request rechecks staff authorization.

`FC_CARE_ADMIN_STAFF_LABELS` maps SHA256 canonical-email hashes to approved staff
display names. The allowlist is access control; the labels are audit display.
No staff, customer or secret identifiers belong in a committed config example.
Keep the server key and stable member HMAC secret backend-only. Actual staff
access must be reviewed/approved with the owner before enabling it.

Apply the two prepared migrations in dependency order only after review:
1. `20261026_care_chat_paid_membership.sql` (fifth migration).
2. `20261026_care_chat_operator_admin.sql` (sixth migration).

They are NOT applied to the real Supabase project yet. The first four ledger
migrations already passed separate real-database fixture checks. Local PGlite
tests applied all six into an ephemeral database using fictional data; that does
not substitute for actual Supabase permissions/concurrency acceptance.

Enable staff operations with `FC_CARE_ADMIN_ENABLED=true` only after its keys,
staff emails and approved labels are configured and checked. Use
`FC_CARE_CHAT_ACCESS_MODE=paid` for the member gate after real manual grants
have been verified. Keep the customer unified/voice release gated separately.
Do not grant pilot access to the public or assume staff names match FC members.

## Authority and dates

One current operator membership per canonical email, plus append-only audit and
unique hashed payment references. Start day is Malaysia local midnight; the
last-use date is inclusive, stored as the next local midnight (exclusive).
Staff must confirm real paid dates, not infer them from payment amounts, a total
annual contract length or course access. Monthly paid-through coverage must be
renewed after each confirmed payment, even if the overall contract is a year.

The `operator_verified` paid-membership row uses its confirmed paid_until also
as verified_until. This is a manually attested paid term, not an automatically
refreshed external-source lease. Staff cancellation/refund/exception handling is
still necessary. No automatic deduction/renewal cancellation is sent to FC or
any payment platform. The operator must handle those systems separately.

Expiry is enforced on each eligibility lookup, with no cron dependency. Scheduled
cancellation preserves the paid end date. Early revoke and mistaken-revoke
restore require an approval reference; restore cannot revive an expired term.
Renewing an active membership cannot shorten its paid end or move the start into
the future. Date correction is a separate auditable action. No operation changes
wallet balances, usage, purchased credits or customer chat history.

FC audio status is a staff attestation, not a LearnWorlds API check. The task
list flags disagreement with current chat eligibility and members within7days
of expiry, with50rows/page and total/next-page indicators. It cannot identify
unregistered members, unseen failed payments or incorrect staff attestations;
daily payment checks and weekly three-way reconciliation remain essential.

## Integrity and privacy

Staff identity supplies the audit actor server-side. Writes use a per-member
version check and transactional request ID to avoid lost updates and ambiguous
retries. Duplicate payment references cannot activate another member or grant
another term. Correction can reuse its own member's prior reference, with audit.
The private tables and all admin RPCs deny anon/authenticated callers; only the
server service role can access them. No public ingestion, batch export or
delete endpoint exists. The UI displays masked addresses in task lists, uses
full-email exact search, and shows the latest30audit entries; older audit remains
private. No health text, OTP or credential is stored in the operator tables.

## Acceptance before use

- Owner approves each of the three email/name mappings and access scope.
- Real SMTP and individual staff login/denial checks; no shared login.
- Real Supabase RLS/RPC and two-operator concurrent-update checks.
- Fictional/test-account activation, expiry, cancel, renew, approval restore,
  duplicate receipt and timeout/retry checks against the deployment.
- Existing active paid member onboarding and FC-date reconciliation.
- Review final staff SOP against the deployed page, add the actual URL and
  effective date, then train operators. Do not use localhost for real members.

Staff SOP source: `STAFF-SOP.md`. Printable training PDF is kept in the owner's
private output folder; it is marked pending formal activation/acceptance.
