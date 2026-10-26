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

Validation: 206 local checks passed, including archive capacity/long-text tests
and an eligibility-before-editorial-read route check. No paid AI
request, production archive inspection or customer data write occurred during
these tests. This change is local, not deployed. It does **not** establish that
all catalog themes already have complete reviewed descriptions.

Owner scope update: descriptions will be supplemented gradually. Complete
explanations for every theme are **not** a core launch gate. Near-term roadmap
is 300 themes and later 1,000+. The read/search layer accepts up to 2,000 themes
with a 16 MB response ceiling, independent of the existing 7,000-byte model
input ceiling. A 1,000-theme fixture verifies retrieval of a newly added theme.
The currently deployed Google writer still has its earlier archive-size limit;
before that limit is reached, increase/test that separate writer or move to a
paginated storage contract. Do not promise unlimited storage from this change.

Remaining core release gates:

- Check source availability and report description coverage honestly. Missing
  purpose/use descriptions fall back to theme matching, never guessed effects.
- Real provider checks completed on fictional bilingual inputs at the final
  200-token cap. An initial run exposed raw structured text on no-candidate turns
  and missed English conflict matching; six selected-mini retests completed after
  correction, with parsed replies for all six and correct conflict IDs in both
  languages. This is limited sample review, not a claim of universal correctness.
  English synthetic speech (6.25 seconds) was transcribed correctly with the real
  transcription model. Actual member/mobile microphone acceptance is still pending.
- Stable member hashing was saved to the confirmed existing Render service on
  26 October; customer flags remain disabled. Verify paid-date eligibility, member
  isolation and one shared voice/text allowance against the production services.
- Verify first staff/customer end-to-end use, then switch the FC entry only after
  the customer flags can safely be enabled together.

The HMAC configuration save caused Render to deploy already merged documentation
commit `ae58bc2` (same runtime as PR #13). Eight live no-spend smoke checks passed.
The reviewed-content code remains local on its feature branch, not deployed.

The completed one-time local key handoff was replaced by a read-only results
page. No test key is retained, and the results page cannot initiate new AI calls.

Owner authorised private customer acceptance for her confirmed Gmail only.
`FC_CARE_CHAT_LISTENING_ENABLED` permits the integrated conversation in the private
pilot while `FC_CARE_CHAT_UNIFIED_ENABLED=false` preserves the current public
entry and legacy routes. The latter must be enabled at the final unified switch
to close old spending routes. Pilot readiness does not establish a shared cost
cap on the old public assistant.

The RM15 add-on remains informational until verified payment capture and durable
credit delivery are connected. Customer sales materials must reflect this boundary.
