# FC voice assistant completion

## Guided upgrade — staged, not deployed

The next revision adds guided intake, a microphone with live local waveform, device-side PCM WAV conversion, server-side duration validation, and a configurable GPT-5.4 mini selection workload. The assessment workload and its model remain unchanged. See `ASSISTANT-INTEGRATION.md` for the required connections and release gates. This revision must not be described as live or as complete automatic access to LearnWorlds.

The owner confirmed on 2026-10-25 that only the OpenAI API is connected: there is no current LearnWorlds data or identity API. An unauthenticated read of the library did not expose the protected catalog script, and an explanation page returned 404; the same explanation was visible in the owner's authenticated browser. No session cookies or credentials were copied. A bridge URL alone does not solve this missing source connection.

The refreshed owner-authorized browser snapshot contains 164 title families and 531 course-specific recordings. Thirty recordings across three course routes have an explicitly unconfirmed version (ten titles). They are retained as metadata and excluded from listening-version recommendations; no version was inferred from duration. The owner-confirmed duplicate Energy Blockage Removal (1) remains excluded.

The code for a trusted, reviewed knowledge feed and server-verified identity is ready for integration, not connected. The default on Render is fail-closed production usage: persistent state and a configured session secret are required before provider calls. A deliberate `ASSISTANT_ACCESS_MODE=test` opt-in permits a clearly labelled, ephemeral device test allowance. It does not provide a real per-member daily quota. Do not deploy this revision over the existing test service without completing these choices first.

The existing root voice application now supports a roughly 30-second recording (60-second browser stop), optional file upload, editable transcription, and a separate confirmation before recommendations. Text-only input remains available. Chinese and English interface controls, versions and membership routing are supported.

## Catalog and links

`data/assistant-catalog.json` comes from the owner-authorized 2026-10-17 FC catalog readback, containing 156 distinct title families and 501 course-specific recordings. Each recording retains its actual unit, course, declared version and duration; duration is not used to infer a version. This is an audited snapshot, not automatic synchronization. Membership checks remain in LearnWorlds. Users choose their membership route; the application does not infer eligibility or unlock content. Seventy families have an existing description mapping. Other families link to the protected FC library and actual recordings, without inventing description URLs.

## Processing and limits

The UI separately explains processing and requires consent before uploads/recommendations. Audio is held in memory, transcribed with the existing `gpt-4o-mini-transcribe` (configurable `TRANSCRIPTION_MODEL`), and discarded after the request. The confirmed text is sent to the existing `gpt-5.4-nano`; structured output can select at most three server-curated IDs. The model cannot supply URLs, versions or medical claims. Explanation text is curated. Responses request `store:false`; provider processing policies still apply. Never log request text, audio, provider error objects or credentials.

Requests enforce allowed origin, 2 concurrent provider jobs, 60 requests per ten minutes per running process, 8 MB audio, recognizable audio container signatures, and 2000-character text. The 60-second recording/upload-duration check is client-side; the server byte cap also bounds uploads but is not a complete duration parser. Multi-instance quotas would require shared infrastructure; none is provisioned. Timeouts and no SDK retries prevent runaway requests. AI failure returns honestly labelled catalog matches; transcription failure retains editable text and permits retry.

Urgent wording pauses recommendations. Certain serious health and detox requests prompt clinical assessment instead of audio prescriptions. These conservative word checks are not clinical triage and may flag negated or historical statements. The feature selects general listening content, not disease treatment. No reports or audio history are stored or automatically sent to a therapist.

## Verification and rollout

Run `npm test`: original assessment regressions and new catalog, preference, invented-ID, urgent/clinical, consent, upload, origin and failure cases. Unit tests use mocked provider calls. UI preview provider calls are also mocked and must not be described as real speech recognition or AI verification. Verify actual production-provider calls separately using generated, fictional speech, not customer recordings. A physical microphone permission/recording check requires a person at the device; do not capture ambient private conversation as a test.

Keep FC's AI Assistant page outside normal navigation until hosted checks and owner review are complete. Add microphone delegation to its iframe, plus a direct-open fallback. This work preserves `/assessment/`, its rules, and existing assessment data. No new paid infrastructure or subscription upgrade is needed.
