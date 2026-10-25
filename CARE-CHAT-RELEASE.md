# Care Chat release handover

Current release state: **NOT OPEN TO CUSTOMERS**. Local implementation and mocked
checks are not proof of real delivery, model quality, payment or membership.
See `CARE-CHAT-READINESS.md` for evidence and current blockers.

## First release scope

Prefer free text chat first. Keep the RM10 pack as an information preview only
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
automatic retry is enabled. Do not equate the prior100 TEXT sends to100 complete
voice exchanges: this conservative draft policy permits50 conversion+send pairs
if no other units are used. Final model/cost policy must be presented clearly.

The existing voice assistant is live. `FC_CARE_CHAT_ENABLED=true` currently also
gates legacy recommendation calls and closes transcription pending voice cost
protection. **Do not enable this flag as an isolated text-chat change**: confirm
the existing voice experience, authentication and shared allowance policy first.

## Before enabling

1. Confirm real SMTP delivery and a real verification/refresh/logout round trip.
   Brevo ticket #5636055 is open; never include a credential in the ticket.
2. Run `evals/run-care-chat.cjs --run --output <private-result-path>` in an
   authorized private execution environment using an existing provider key in
   environment configuration, not a CLI argument. Without `--run` it is only a
   no-spend plan. Test data is fictional. The comparison has no retries and a
   conservative RM2 reservation ceiling under documented conversion assumptions.
3. Review actual responses case by case for empathy, clarity, repetition,
   uncertainty, invented catalog claims and medical boundaries. The report always
   marks human quality review pending. Passing unit checks is not quality approval.
4. Choose a supported final model and verify account access. The current default
   nano model is marked Deprecated in the checked official documentation. Mini is
   only a candidate. Do not change the model without its budget recalculation.
5. If choosing mini, update the member reservation and SQL constraint/RPC together
   before enabling: the existing 5-sen reservation cannot cover the documented
   mini worst-case token envelope. Confirm tax/currency headroom and resulting
   customer send counts. Keep the internal RM5 cap out of customer copy.
6. Configure backend-only Supabase access and a stable member HMAC secret through
   approved secret settings. Never put the server key/HMAC secret in public JS,
   browser storage, a commit or screenshots. Rotating that HMAC secret changes
   ledger identities; plan a migration rather than silently resetting allowances.
7. Confirm the two migrations are applied. Both were applied to the setup project;
   apply them explicitly in any other environment. The actual DB verification
   scripts use fictional data and rollback. Public clients must not execute RPCs.
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
is uncertain. Check the impact on existing voice routes before toggling the shared
enable flag. Record sanitized timestamps/status codes only; never health text,
audio, tokens or raw provider error objects in support logs.
