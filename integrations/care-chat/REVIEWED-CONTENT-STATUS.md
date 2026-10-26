# Reviewed listening descriptions — 26 October 2026

Local implementation connects the unified conversation to the existing dedicated
Google Apps Script archive using `FC_DRIVE_GATEWAY_URL` and
`FC_DRIVE_GATEWAY_TOKEN`. It sends only an authenticated archive-read request,
never conversation text, member identifiers or scores. Only published summaries
enter matching and the bounded, single-call conversation context. Drafts and
long-form articles are excluded. Selected cards use published purpose and usage
text where available; otherwise they retain explicit metadata-only wording.

The source validates revision, reviewed passages, permitted playback courses and
exact FC recording URLs. Reads are coalesced and cached for 15 minutes. After
expiry, an unavailable or invalid source falls back to metadata instead of
presenting stale summaries as current. Rollbacks are rejected. Known themes
retain their existing FC description links until a shared public reader is
released in this codebase.

Validation: 201 local checks passed, including six new archive tests. No paid AI
request, production archive inspection or customer data write occurred during
these tests. This change is local, not deployed. It does **not** establish that
all catalog themes already have complete reviewed descriptions.

Remaining core release gates:

- Inspect the real dedicated source and report reviewed-description coverage;
  fill missing content from authorized FC sources rather than guessing effects.
- Run the final structured chat policy and real voice transcription with fictional
  inputs inside the previously approved test budget; test actual mobile recording.
- Configure stable member hashing and verify paid-date eligibility, member
  isolation and one shared voice/text allowance against the production services.
- Verify first staff/customer end-to-end use, then switch the FC entry only after
  the customer flags can safely be enabled together.

The RM15 add-on remains informational until verified payment capture and durable
credit delivery are connected. Customer sales materials must reflect this boundary.
