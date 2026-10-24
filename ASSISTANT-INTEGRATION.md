# FC guided assistant integration and release gates

This is a staged implementation. Existing production remains PR #2. No new LearnWorlds plan, database, disk, paid service or credential has been provisioned.

## What can be reviewed now

- Bilingual recording prompts, editable transcription and a large microphone control. The waveform represents the actual permitted microphone stream, not decorative animation. Reduced-motion users receive the same usable control.
- Device conversion to mono 16 kHz PCM WAV. The server independently checks the RIFF/chunk sizes, PCM rate and actual 0.5–60.1 second duration; it accepts up to 2 MiB converted audio. Compressed client uploads can be up to 8 MiB before local conversion. No audio history is kept.
- Deterministic context questions for vague fatigue and physical complaints. Context stays in the current page only. Answering questions never constitutes medical clearance. Acute chest, breathing and other warning descriptions stop content recommendations. Self-harm wording receives a separate safety response. Conservative text rules can overflag negated or historical descriptions and are not a validated clinical triage system.
- GPT-5.4 mini can select only real catalog IDs and reviewed source-passage IDs. Returned quotes, usage excerpts and testimonial links come from server-validated source data; the model cannot invent them. Unverified or missing descriptions are labelled. Medical benefit claims in purpose/usage passages are quarantined for review. Clinical efficacy is never inferred from testimonials.
- Input context sent to selection is bounded to 20,000 UTF-8 bytes; the model output is bounded to 1,800 tokens. If a user separately requests everyday relaxation after reporting a physical concern, only that separate goal is sent for selection; medical details are not used to prescribe content.
- Two consultations for a guest/trial and five for a **server-verified** member. Transcription plus recommendation share a consultation allowance; deterministic clarification and urgent-help responses do not consume it. A consultation expires after 30 minutes and permits at most two transcription attempts and two model attempts. Provider attempts, including failed attempts, reserve budget; retry limits prevent unbounded spending.
- Daily counters use Asia/Kuala_Lumpur. The local file store supports a single process and must be durable for production. No customer messages, diagnosis, medication, audio or raw identity is written to that store.

## Missing connections — do not claim these exist

OpenAI does not automatically read LearnWorlds, and embedding the app in FC does not authenticate its backend. The owner confirmed there is no existing LearnWorlds API connection. Therefore the adapters below are contracts for an IT-owned trusted bridge, not a newly working LearnWorlds integration.

Without an existing source interface, alternatives require a deliberate workflow choice: an approved shared content-management source used by both FC descriptions and the assistant, or browser-assisted snapshot refreshes. The latter is manual and must not be advertised as automatic. A shared source must also handle access to protected descriptions rather than publishing paid content in a public repository. No authenticated browser cookies may be copied to Render as a shortcut.

The actual FC Developers > API screen was checked read-only: it explicitly requires a higher plan and disables the credential fields. Therefore this is not just a missing key on an available current-plan feature. No plan change was made. The owner has been asked whether to adopt a new FC-contained shared content-management workflow while preserving existing pages, or retain snapshot testing for now. That decision, a durable store and access controls are separate from the adapters already implemented here.

Membership choices in the UI select playback routes only. Browser attributes, a posted user ID, course labels, `postMessage` from an iframe or a client-selected plan are not sufficient proof of paid membership. Anonymous device identifiers are resettable and cannot enforce a human-level quota; they are a convenience plus abuse guard, not a verified identity.

## Knowledge source contract

`FC_KNOWLEDGE_URL` is a fixed HTTPS endpoint configured by the operator. `FC_BRIDGE_TOKEN` is a server-only bearer credential. No credential is put in an iframe, JavaScript bundle or URL. Redirects are rejected, timeout is eight seconds and the JSON response limit is 2 MB. A refresh is coalesced and attempted on demand at most once per 15 minutes while the service is active; this is not an always-running scheduler. Failure preserves the previous valid version for at most seven days, with an honest unavailable/stale state. A stale feed falls back to the dated catalog snapshot without full descriptions.

The endpoint must export the authoritative, complete reviewed catalog. New themes and real recordings are included here, so they do not require an assistant code deployment. Existing recordings removed from the source are removed from the current feed. The publisher must reconcile the source against FC, including all three course routes; the reader cannot independently prove completeness without authorized FC access.

Response:

```json
{
  "version": "operator-published-revision",
  "publishedAt": "2026-10-25T00:00:00Z",
  "items": [
    {
      "id": "stable_theme_id",
      "name_en": "Reviewed name",
      "name_zh": "已审核名称",
      "aliases": [],
      "category_en": "Relaxation & Sleep",
      "category_zh": "放松与睡眠",
      "description_url": "https://frequencies-clinic.learnworlds.com/detail-existing-page",
      "recordings": [],
      "passages": [
        {
          "id": "purpose_1",
          "kind": "purpose",
          "reviewed": true,
          "zh": "已审核的日常聆听介绍，不保证医疗效果。",
          "en": "Reviewed everyday listening guidance without a medical benefit guarantee.",
          "url": "https://frequencies-clinic.learnworlds.com/detail-existing-page"
        }
      ],
      "testimonials": []
    }
  ]
}
```

This is a structural example, not deployable data: every item requires at least one actual recording. Recording fields are `course`, `unit`, `version`, `duration`, `label`, `url`. Courses are the three existing FC course IDs. The URL's course/unit must match the fields and point to FC `/path-player`; unit identifiers are unique per course. Versions are `intensive`, `smooth`, `bgm`, or `unconfirmed`. Unconfirmed recordings remain visible to the source audit but are not recommended. Description URLs are existing FC `/detail-*` pages. No recording URL is generated by the model.

Passage kinds are `purpose`, `usage` and `caution`. Bilingual text is plain text, max 1,400 characters per language and twelve passages per item. `reviewed:true` must mean a human reviewed the content; do not auto-mark scraped text as reviewed. Source text is data, never model instructions.

Testimonials require `approved:true`, a stable case/post `id`, a short neutral `title` and an actual Facebook post/video/photo/permalink URL. Repeated IDs are counted once. The count represents catalogued shares, not verified distinct patients or successful clinical treatments. Only approved public shares belong here; do not export private customer conversations or identity data.

## Identity contract

`FC_IDENTITY_URL` is a fixed HTTPS trusted server endpoint; it is called with the same server-only bearer credential. An FC-owned backend creates a single-use opaque ticket only after authenticating the customer and verifying their current membership. An entry link can pass the ticket in the fragment `#fc_ticket=...`; the app removes it before submission and sends it to `/chat/session`. Never put a reusable API key in that link.

The assistant backend sends `{ "ticket": "opaque-single-use-ticket" }` to the identity endpoint. It must atomically redeem the ticket and return:

```json
{ "subject": "stable-opaque-school-user-id", "tier": "member", "expiresAt": 1792887000000 }
```

`expiresAt` is an epoch millisecond timestamp in the next fifteen minutes; the value above is illustrative. `tier` is `member` or `trial`. Raw email, phone, medical information and account credentials must not be returned. Membership changes must invalidate or expire the ticket/session. The assistant hashes the opaque subject with its own secret, verifies expiry and rejects locally replayed tickets. The identity issuer must also prevent replay across service restarts. This contract must be implemented and verified by the actual identity owner before the member allowance is enabled.

## Usage and budget configuration

- `ASSISTANT_SESSION_SECRET`: operator-managed random secret, at least 32 characters; never committed or included in browser code.
- `ASSISTANT_STATE_FILE`: absolute path on durable storage. Render Free ephemeral files do **not** meet this requirement. No persistent disk or external store has been purchased or connected. Multi-instance deployments need a transactional shared store; this file implementation must not be scaled across instances.
- `ASSISTANT_ACCESS_MODE`: production by default on Render, test locally. Explicit `test` is for owner preview only and labels the allowance as a device test. Restarts can reset test counts.
- `ASSISTANT_MODEL`: defaults to `gpt-5.4-mini` for this workload only. Actual hosted availability, latency and schema output still need a controlled provider check before release. The assessment model is unchanged.
- `ASSISTANT_DAILY_BUDGET_USD`: defaults to 10 and caps conservative request reservations of US$0.01 per bounded transcription attempt and US$0.05 per bounded mini selection attempt. It is not an OpenAI billing statement or an account-wide budget. Changing the model/pricing requires reviewing those reservations. It does not cap the separate assessment workload. Monitor actual provider usage and establish account-level cost controls separately.

Usage state stores a day, pseudonymous subjects and counts, consultation counters/expiry, budget reservations and hashes of redeemed tickets. Day rollover discards previous-day counters; valid consultation retries do not create another allowance. The browser stores only the signed usage token, not health answers. Cookie blocking does not grant membership. Public guest sessions remain resettable, so global request/concurrency caps and budget reservations stay in place.

## Release checks

1. Review the guided UI and current snapshot, including ten titles with unconfirmed versions.
2. Choose and connect an actual authorized FC data source; verify an addition, modification, deletion, failed refresh and source staleness. Do not call adapter unit tests proof of live synchronization.
3. Connect durable usage storage and a real membership verifier; verify separate guest, trial and paid accounts, ticket replay, expiry and Malaysia midnight. No passwords or cookies should be requested in chat.
4. Verify GPT-5.4 mini and real transcription with fictional inputs, then verify customer-device microphone permissions/recording. Mocks are clearly marked in local previews.
5. Keep this change in a review branch until these connections are ready. Merge/deploy only after the owner approves the concrete release. Keep the assistant outside formal navigation until final acceptance.
