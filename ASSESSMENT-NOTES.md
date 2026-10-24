# FC assessment integration

This change adds `/assessment/`, `/assessment/api/config` and `/assessment/api/report` to the existing Node/Express service. It does not alter the voice UI, transcription route, existing chat recommendation route, or their stored knowledge base.

## Report behavior

The original 37 scored question texts are retained, with stable IDs and six distinct domains. The new version uses a two-week recall window and optional background questions. Blood pressure has a “not measured / unsure” option; its domain is marked incomplete rather than given an invented score. There are no overall health scores, population norms or clinical cutoffs. Relative highlights compare rounded scores within this response only.

Reports are created synchronously without a database, report history, emails or automatic therapist delivery. All scores, curated next steps and optional track links come from deterministic server logic. Track links point to existing FC detail pages; playback remains protected by FC membership.

Current urgent symptoms lead to a help screen. Conservative free-text matching pauses the report for clarification; it is not comprehensive medical triage and may flag historical or negated mentions. Reported chest symptoms prompt medical advice and suppress product recommendations. This custom questionnaire is not clinically validated.

## Optional AI

Users must separately opt in. Only fixed domain/question labels, computed scores and selected option labels are sent to OpenAI. Free text, names, contacts, account IDs, IP addresses and raw request objects are excluded. The request uses the existing `OPENAI_API_KEY`, the existing `gpt-5.4-nano` model (or a server-configured `ASSESSMENT_MODEL`), `store:false`, strict structured output, a timeout, no automatic retries and bounded output.

The model can only add a bilingual reflection, an approved everyday next step and a reflective question. It cannot alter scores, links or track selection. Output validation rejects diagnostic/treatment language, numeric claims, URLs and unexpected fields. Invalid output, refusal, timeout, provider failure or exhausted budget leaves the complete rules report available and clearly labelled.

The process-wide AI budget is twenty requests per hour and two concurrent requests. This limits the new feature only. It is an in-memory cap for the current single-instance service, not a shared multi-instance quota. No new infrastructure is provisioned. `ASSESSMENT_AI_ENABLED=false` hides optional AI and disables its provider calls.

Disabling response storage does not mean all provider processing/retention is disabled. The consent copy distinguishes this. General OpenAI data controls: https://developers.openai.com/api/docs/guides/your-data . Responses structured output: https://developers.openai.com/api/docs/guides/structured-outputs .

## Security and deployment

Assessment routes are mounted before the original CORS, body parser and microphone headers, with their own same-origin check, 24 KB body limit, conservative request cap, no-store headers, restrictive CSP and microphone disabled. Framing is limited to self and `https://frequencies-clinic.learnworlds.com`. They do not trust arbitrary `X-Forwarded-For` headers. Depending on Render's proxy connections, visitors may share the conservative per-socket-address cap; confirm actual traffic behavior before increasing limits or adding trusted proxy configuration.

The existing Render service is `srv-d9qugn5bedkc73fpmq40` in workspace `tea-d9qubcqjnfac73e877m0`, using repository `ginnn26/fc-ai-assistant`, branch `main`, Node runtime and Free compute. Auto-deploy is enabled; a push to the deployed branch may start a production deployment. Source baseline: `a12a48ddb2cae64b9551409d31a899e1c5b9a826`.

Test first on the prepared branch. Keep the page labelled internal test until hosted API calls, provider fallback, mobile layout and FC iframe behavior are verified. Do not change LearnWorlds course/CTA/manual-report wording until this flow is live and verified. No existing billing or compute-plan settings need changing for this code integration.

## Verification

Run `npm test` on Node >=20. The suite covers the scoring boundary cases, malformed/partial input, same-origin protection, payload limits, risk branches, explicit AI consent, privacy of the AI payload, bounded provider usage, invalid model output, service failures and original voice-page/health-route regression. AI tests use mocked provider responses; they do not assert that a real remote model call has succeeded.

For local UI work, supply a non-secret test placeholder as `OPENAI_API_KEY`; avoid selecting the AI option unless using a dedicated mock provider. No existing server secret has been copied locally. Launch with `HOST=127.0.0.1 PORT=4319 node app.js` and visit `/assessment/`.
