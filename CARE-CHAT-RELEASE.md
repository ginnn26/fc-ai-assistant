# Care Chat release handover

Current release state: **NOT OPEN TO CUSTOMERS**. Local implementation and mocked
checks are not proof of real delivery, model quality, payment or membership.
See `CARE-CHAT-READINESS.md` for evidence and current blockers.

Staff portal deployed 26 October 2026 via merged PR #13, production fe637cd.
https://fc-ai-assistant.onrender.com/care-admin.html
Owner-approved four-email allowlist and Supabase backend settings are active.
Eight deployed HTTP smoke checks passed; authenticated owner-staff acceptance is
in progress. Customer chat/unified/voice remain disabled. Do not interpret staff
deployment as completion of the customer service or individual staff training.

Owner has accepted manual staff activation/renewal alongside existing FC work.
Use integrations/care-chat/ADMIN-SETUP.md for this alternative to automatic
LearnWorlds expiry sync. Staff portal and sixth migration are prepared locally;
no staff rights or production membership data have been provisioned. Individual
Agnes/Gin/Andrine email approvals, real database acceptance and deployment remain
required. The internal SOP is a training version pending formal activation.

## First release scope

Owner has now explicitly unified the old voice recommendation assistant and
Care Chat into ONE customer service. See integrations/care-chat/UNIFIED-SERVICE.md.
The new `FC_CARE_CHAT_UNIFIED_ENABLED` release gate redirects old entry pages and
blocks every legacy spending route. Unified conversation selects catalog themes
within the same bounded model call, rather than calling a second recommendation
model. The shared member ledger covers voice conversion, dialogue and selection.
Keep this flag false until membership/secret configuration and real-provider
checks are complete; the current live service has not been switched.

Prefer free text chat first. Keep the RM15 pack as an information preview only
until authoritative payment, credit, refund and support handling are connected.
Do not expose a checkout button or accept payment for a preview.

Owner subsequently approved optional voice INPUT with TEXT replies. The new
`FC_CARE_CHAT_VOICE_ENABLED` flag defaults off. Its `/chat/voice-draft` route is
separate from the legacy assistant transcription endpoint. It accepts only bounded
mono PCM WAV captured by AudioWorklet, with actual byte/sample validation and a
60-second ceiling. Verify microphone permission/delegation on FC's embedded page,
record/stop/review/discard flows on actual Android/iOS devices, background cleanup,
and multilingual real ASR before enabling. Conversion and sending each use one
unit from the same ledger; local recording/playback do not. A user must explicitly
convert and then review/send; conversion alone never invokes conversation.

The new route uses `gpt-transcribe`, not a deprecated transcription model. At the
checked USD0.0045/minute estimate, a maximum60-second recording is0.45US cents;
using the documented RM6/USD ×1.2 headroom gives3.24sen, covered by the existing
5sen reservation under those assumptions. Real account availability, billing,
tax/FX and representative speech still need verification. No model fallback or
automatic retry is enabled. Do not equate the prototype140 units to140 complete
voice exchanges: this draft policy permits70 conversion+send pairs
if no other units are used. Final model/cost policy must be presented clearly.

Until the unified release gate is enabled, the existing voice assistant is live
and retains its existing access policy.
Care Chat now always meters its own conversation/voice-draft routes independently.
Enabling FC_CARE_CHAT_ENABLED no longer changes legacy transcription/recommendation.
The separate FC_ASSISTANT_MEMBER_BUDGET_ENABLED flag defaults off; leave it off
until the legacy identity/cost integration has been reviewed. If enabled explicitly,
legacy recommendations require the member wallet and legacy transcription closes
until its own server-side duration/metering integration is complete. Do not claim
the RM7 Care Chat ceiling also caps the existing recommendation assistant.

## Before enabling

1. Confirm real SMTP delivery and a real verification/refresh/logout round trip.
   Keep provider-level OTP limits active. The backend60-second resend guard is
   bounded and process-local, not distributed protection across restarts/instances.
   Brevo ticket #5636055 is open; never include a credential in the ticket.
2. Run `evals/run-care-chat.cjs --run --output <private-result-path>` in an
   authorized private execution environment using an existing provider key in
   environment configuration, not a CLI argument. Without `--run` it is only a
   no-spend plan. Test data is fictional. The comparison has no retries and a
   conservative RM2 reservation ceiling under documented conversion assumptions.
3. Review actual responses case by case for empathy, clarity, repetition,
   uncertainty, invented catalog claims and medical boundaries. The report always
   marks human quality review pending. Passing unit checks is not quality approval.
4. The local Care Chat default is now gpt-5.4-mini. Both models were actually
   available in30owner-triggered provider calls. Mini's shorter replies support
   selection; sleep/fatigue quality still needs review. No zero-error guarantee.
5. Production caps are now7000serialized input bytes and200output tokens,
   reasoning:none. Oldest complete pairs are trimmed from model input, but all
   validated user turns remain in safety checks. The conservative8000input-token
   envelope at current mini rates and RM6/USD x1.2 estimates4.968sen, within5sen.
   This is not exact token counting or a billing guarantee. Confirm final-cap
   completion/truncation behavior and actual cost before enabling. The two live
   comparison runs used the previous600token cap. Internal RM7 stays private.
6. Resolve eligibility separately from mailbox ownership. An explicit backend
   FC_CARE_CHAT_PILOT_EMAIL_HASHES roster is now required for private testing;
   without it the configured budget remains unready. Never use a browser email
   or a public signup as proof of FC membership. Formal paid/trial eligibility
   and expiration/renewal updates require a trusted FC data source, not this
   manual pilot roster. Owner confirmed on26October2026: complimentary monthly
   chat is ONLY for valid paid FC members; free trials are excluded. This business
   decision is not evidence that the FC entitlement connection is implemented.
   Preserve paid-through coverage when cancellation is scheduled at period end;
   do not treat a cancellation notice alone as immediate expiration. Membership
   status, coverage dates, refunds/revocation and renewals need authoritative data.
   Configure backend-only Supabase access and a stable member HMAC secret through
   approved secret settings. Never put the server key/HMAC secret in public JS,
   browser storage, a commit or screenshots. Rotating that HMAC secret changes
   ledger identities; plan a migration rather than silently resetting allowances.
   A separate `FC_CARE_CHAT_ACCESS_MODE=paid` is now implemented locally; it checks
   the service-only `fc_chat_paid_membership` RPC per request. The new fifth
   migration is NOT applied and the trusted FC source is NOT connected. Do not
   enable this mode just because the configured adapter reports ready. Review
   integrations/care-chat/PAID-MEMBERSHIP.md first. FC's annual payment page also
   supports Payex/manual staff confirmation, so card-only sync is insufficient.
7. Confirm all four migrations are applied: initial ledger, allowance status,
   RM7 ceiling and RM15 order price. All four are now applied to the setup project.
   Apply explicitly in other environments. The updated RM7 verification script
   passed against the actual database using fictional fixtures and rollback.
   Public clients must not execute the privileged RPCs.
8. Complete real two-account and cross-device checks: usage/account isolation,
   purchased-vs-included balance, month reset, logout in remembered tabs, expired
   refresh, temporary outages, and ambiguous AI failures. Checking a balance must
   never reserve a send. Browser-provided identity is never authoritative.
9. Verify concurrent HTTP calls against the real durable ledger (not just an
   in-memory test double), and verify startup with missing configuration fails
   closed. Review the current global request/concurrency limits for launch traffic;
   a limit intended for a pilot must not be advertised as production capacity.
10. Deploy with the feature still disabled, verify existing assessment/voice
    behavior, then enable only after the preceding integration gates pass. Do not
    add a formal FC navigation link until customer sign-in and usage are proven.

## Customer acceptance walkthrough

- Enter with the FC email; no new email account or password is required. Separate
  mailbox verification currently does not prove paid FC membership/audio access.
- On sign-in, remaining included/purchased sends load before the composer opens.
  Refresh does not use a send; failed lookup must not show invented balances.
- A starter card prepares a draft and preserves existing writing. It never sends
  automatically. Consent remains explicit and unchecked after logout.
- One submitted message uses one reservation; the AI reply is not a second send.
  Do not promise minutes, unlimited history or cross-device conversation recovery.
- Double-clicks do not create concurrent browser sends. A network failure retains
  the draft and does not automatically retry a paid call. Ambiguous provider calls
  can retain a reservation; do not promise an automatic refund that is not built.
- At exhaustion the composer stops; free listening/check-ins remain available
  according to their separate permissions. The optional pack is not mandatory.
- Language switches translate controls and feedback without changing balances.

## Rollback and incident handling

Keep the last known deployed commit and environment settings before a release.
Do not delete quota/payment tables or rotate the member HMAC secret to undo a UI
release. Preserve the durable ledger; rolling back app code must not recreate
spent allowance. Close the new entry first if identity, balance or cost behavior
is uncertain. Keep the independent legacy assistant budget flag unchanged when rolling back
Care Chat. Record sanitized timestamps/status codes only; never health text,
audio, tokens or raw provider error objects in support logs.
