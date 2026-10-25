# FC Care Chat / FC 暖心聊聊

## Current status — 26 October 2026

First real evaluation COMPLETED after owner personally pasted the dedicated key
into the loopback form and started it.20provider attempts returned20complete
replies and20usage records (10nano,10mini);10additional safety/clinical rows were
rules-only, with no provider call. The run reserved200sen, but usage-based standard
price estimates were USD0.00244225(nano) plusUSD0.0072375(mini). Under the disclosed
RM6/USD plus20%margin assumption, combined estimate is6.96942sen, aboutRM0.07.
This is NOT an invoice or a final monthly allowance extrapolation. Raw evidence
is care-chat-real-model-comparison.json; coding-agent review is separately saved
as care-chat-first-live-review.json in the local output folder.

Real replies exposed quality issues: mini asked a question despite an explicit
listen-only/no-questions request; both sometimes speculated on fatigue/sleep causes
or offered multiple tasks when asked for one. Nano used literalMarkdown and
introduced stronger emotional/physiological assumptions. Neither invented a
requested track/testimonial number in this sample, but feature directions needed
more precision. Current prompt revised for plain text, zero questions when asked,
exactly one requested step, no speculative causes or emotional escalation. These
changes have NOT been retested live. No final model selected or deployed.

Self-harm rule response now differs from physical triage: warm acknowledgement,
trusted-person support and local urgent care for immediate danger, without a
guessed hotline number. Source checked: NHS help-for-suicidal-thoughts page.
Offline tests verify both languages, traditionalChinese trigger and no model
call; this is not comprehensive clinical validation. Provider key was not read
by the agent, logged or saved; the one-run child process has exited.


Owner generated the dedicated test key personally. The agent did not inspect the
secret display. Opened a temporary loopback-only masked handoff at127.0.0.1:3088
(tab115) for owner entry, not a production page. It never logs/saves a key; only
the child evaluation process receives it in memory. Host/Origin/CSRF checks,
bounded input, one-run latch and finite lifetime protect the local form. Verified
foreign Origin403 with stage remaining ready; no provider call. Awaiting owner
paste/start. Evaluation now stops further attempts on401/403/429;9/9 evaluation
checks pass offline. No real AI result or cost report exists yet.


Cost-evaluation follow-up: offline comparison now interleaves candidates, keeps
partial results on budget exhaustion/provider errors, and never labels failed or
incomplete responses as passing AI answers. It records validated usage and
standard-price estimates separately from conservative reservations. Missing usage
is unknown cost, not free; output reasoning is not counted twice and no cached
input discount is assumed. The RM2/20-attempt test ceiling cannot be increased
through test options. An observed reservation overrun stops further calls.
Simulation is labelled simulated-provider-no-real-calls and cannot run with live.
Official model rate pages checked26October; no final customer quota is inferred.
A refreshed30-row no-spend plan was generated with0provider calls. Real provider
quality/billing remain unverified; OPENAI_API_KEY is absent from this process.
Owner said the existing OpenAI account is theirs but the key is not remembered.
Opened the official API-key entry in browser tab114, currently at login, for the
owner; no key created, read or entered. No old key revoked.

Customer allowance wording now calls the monthly inclusion a gift of companionship
and gives a gentle bilingual reminder at1–10remaining units without requiring a
pack. With1unit, the voice panel explains that typing can still send while voice
conversion+send needs2. No extra provider call or spending is triggered by a warning.


Latest actual DB progress: applied both20261026_care_chat_rm7_ceiling.sql and
20261026_care_chat_pack_rm15.sql to Supabase projecthgbwelnvtfrcditofswf using
the authenticated SQL Editor. UI confirmed Success. No rows returned. Ran the
updatedcare_chat_rm7_verify.sql with fictional fixtures and transaction rollback;
actual resultPASS covers permissions, RM7 cap, retained500sen prior usage plus
separate purchased balance, RM15 order acceptance, duplicate payment/request
protection and account isolation. No customer rows were inspected, no payment was
collected and no test balances were retained. This is serial DB verification,
not real concurrent HTTP/webhook or Auth integration. Screenshot:
care-chat-rm7-rm15-db-pass.png in the local output directory. The two migrations
are NOW APPLIED; earlier prepared/not-applied statements below are historical.
Render/app deployment is unchanged and new chat remains unavailable to customers.

Browser response follow-up: a200 response must contain a non-empty bounded text
reply and consistent nonnegative allowance counters before the draft is cleared
or any reply/balance displayed. Invalid responses keep the draft and never
automatically retry a potentially paid operation. Voice allowance updates are
validated too. Literal HTML-like reply text remains textContent, never HTML.
18/18 affected browser checks pass, including malformed-success cases.
Full local regression suite:145/145 passed after these changes.


Email retry follow-up: backend now independently enforces a60-second resend
cooldown per normalized email before invoking the mail provider, including failed
or ambiguous attempts. Case changes, refreshes and simultaneous direct requests
cannot bypass the process-local guard. Its in-memory map holds only short-lived
address digests, prunes expired entries and fails closed at2000 entries rather
than evicting an active cooldown. It stores no message/OTP and makes no additional
provider call. This does NOT replace Supabase/Brevo distributed abuse limits; a
server restart or another instance has a separate map. Verification, refresh and
logout remain available during the resend cooldown. Responses use sanitized429
auth_please_wait plus Retry-After. Full local suite143/143 passed with mocks,
including failed-provider concurrency, address isolation and expiry boundaries.
No real email sent, no support reply checked, no production deployment made.


Microphone visual follow-up: recording UI now has33 locally sound-reactive bars
and a microphone glow driven by RMS energy from existing capture samples. Smaller
1024-frame worklet batches improve response latency without adding a network
request. Silence falls back to4px; stop/discard/logout/error clears the display.
The waveform is a volume visual, not a clinical frequency analysis. Recording
still stays local until explicit conversion; no automatic send or extra AI cost.
Reduced-motion preference disables CSS interpolation/glow expansion. Affected
voice/browser suites22/22 pass using generated samples/fake devices, including
quiet/loud/stop assertions. Browser inspected the visual preview using clearly
labelled synthetic bars; no real microphone permission requested. Real device
QA and live deployment remain pending. Screenshot: care-chat-live-wave-preview.png
in the local output folder.


Latest independent follow-up: separated the legacy assistant budget switch from
Care Chat. With a ready Care Chat wallet, legacy transcription/recommendation
retain their existing access policy; Care Chat conversation and voice-draft still
always reserve the verified member wallet. The new independent legacy switch is
FC_ASSISTANT_MEMBER_BUDGET_ENABLED (default false). Explicitly enabling it keeps
the previous fail-closed legacy behavior. This is NOT a claim that the RM7 chat
ceiling caps all AI used by the existing recommendation assistant. A mounted
regression check covers legacy voice/recommendation with an exhausted chat wallet,
while confirming chat is denied without calling the conversation provider.
Full local suite:140/140 passed using mocks; no provider/email/payment calls.
All changes remain local, not deployed. Real SMTP, account integration, model
quality/cost, microphone/device and payment checks are still outstanding.


Latest pack decision: owner changed the optional sale price to **RM15 per pack**,
retaining500sen internal purchased allowance and the RM7 included monthly ceiling.
Local bilingual preview and authoritative fulfillment validation now require
MYR1500sen. Prior RM10 statements below are historical. The additive order-price
migration is prepared, NOT applied; historical1000sen order rows are preserved,
but new fulfillment rejects an RM10 payment. Checkout remains unavailable;
no payment was collected and no production change was made.


Latest owner decision: RM6–7/member/month is acceptable. Adopt **RM7 maximum**,
with approximately RM6 as an operating target, not a second entitlement/reset.
Local backend ceiling is now700sen. Prepared additive migration
`20261026_care_chat_rm7_ceiling.sql`; NOT applied to the actual database yet.
It preserves existing usage and purchased balances; RM10 packs still add500sen.
Current5sen prototype gives140 shared units, but this is NOT a final customer
promise: final model/reservation and real billing must be verified first.
Previous RM5/100-unit statements below describe earlier versions. No deployment
or real allowance expansion has occurred. The affected chat/voice checks pass
21/21, including cap enforcement, existing500sen usage retention and separate
purchased allowance. Prepared `care_chat_rm7_verify.sql` for a later rollback-only
DB check; that script has NOT been run against Supabase.


Owner-approved voice-input follow-up: new Care Chat now has a local recorder with
AudioWorklet capture, playback/discard, explicit conversion, editable transcript,
and a separate Send step. It never auto-uploads on Stop and never auto-sends a
transcript. Microphone tracks stop immediately on Stop, discard, sign-out,
pagehide/backgrounding or processor failure. Buffered audio is memory-only and
object URLs are revoked on discard/completion. The UI includes explicit audio
processing consent and a 60-second maximum. Real microphone/device QA is pending;
the browser preview did NOT request microphone permission or record real speech.

`/chat/voice-draft` is separately gated by **FC_CARE_CHAT_VOICE_ENABLED=false** by
default and requires the same server-verified member/durable wallet. The server
accepts only exact mono16-bit PCM WAV, derives duration from validated sample
bytes, rejects silence/invalid/over60s uploads BEFORE reserving, then reserves5sen
from the SAME included/purchased wallet before one ASR call. No retries. The new
model is **gpt-transcribe**, following current official guidance; the existing
legacy transcription function/model is unchanged. Sources checked26October:
https://developers.openai.com/api/docs/guides/speech-to-text and
https://developers.openai.com/api/docs/pricing . Old gpt-4o-mini-transcribe is now
marked deprecated; do not reuse its earlier USD0.003/min estimate for this new
route. Current gpt-transcribe estimate isUSD0.0045/min. The maximum60-second
reservation uses documented RM6/USD ×1.2 headroom assumptions, NOT proven billing.

Customer draft policy is explicit: local recording/playback use no units;
conversion uses1unit, reviewed-text Send uses1more, from the same allowance.
The new-voice UI calls these allowance units, not100 free complete voice chats.
With the current nano/5sen prototype,100units allow100 text sends or50 complete
conversion+send pairs, before any purchased units; final model/count decisions
remain pending. Record is disabled below2available units in the normal UI.
Pack preview wording has been updated in both languages. Internal cost never
appears in customer output. No speech playback/TTS or realtime voice is added.

Verification: full suite138/138 passed before the final microphone-stop watchdog;
the affected voice suite6/6 then passed with immediate track-stop, encoder/server
compatibility, auth-change cleanup and processor-error checks. Coverage includes
forged WAV headers/durations, silence, long files, mixed text/voice budget cap,
disabled gate, reserve-before-provider, paid-failure no retry, explicit consent,
worklet60-second bound, and transcript-not-auto-send. Chinese/English browser UI
previews use fictional balance and mocked ASR only. Real ASR accuracy, language
mixes, model availability, real budget concurrency and live billing remain untested.
New code is not deployed; new chat and voice flags must stay off pending gates.

Session recovery follow-up: browser requests now share one in-flight refresh, so
concurrent allowance/chat requests do not rotate the same refresh token twice.
Temporary refresh outages preserve the local session for a later explicit retry;
rejected refresh credentials require verification. A stale failure from a previous
session cannot log out a new verified login. Remembered tabs synchronize saved
session removal/account changes and clear their previous conversation/allowance.
Memory-only tabs do not silently adopt another tab's saved login. Added a release
handover in `CARE-CHAT-RELEASE.md`, including the shared voice-gate effect, model
budget change, real integration tests and rollback without resetting allowances.
The full local suite now passes **131/131**. Also verified two actual browser tabs
against the fictional local provider: opt-in remembered sign-in restored in the
second tab; after a fictional conversation there, signing out in the first tab
removed the second tab's conversation and balance, unchecked consent and disabled
sending. This proves the browser storage-event flow, not real Supabase token
refresh/revocation or cross-device behavior; those real Auth checks remain required.

Further independent work: implemented authenticated read-only `/chat/allowance`, a server-derived HMAC identity lookup and backend-only `fc_chat_allowance` RPC. Applied **`migrations/20261026_care_chat_allowance_status.sql`** to the actual Supabase project; UI confirmed Success. Ran **`migrations/care_chat_allowance_status_verify.sql`** using fictional fixtures and transaction rollback. Actual DB result: **PASS: private read-only allowance; repeated queries do not create rows or use sends**. Verified anonymous/authenticated roles cannot execute the RPC, fresh-account queries create no rows and repeated existing-account queries leave usage/wallet/reservations unchanged. The privileged backend verifies identity before calling it; client account IDs are ignored. No real customer data was queried in this verification.

UI now looks up actual remaining free/purchased sends on sign-in and supports a no-charge refresh. Sending stays disabled while the lookup is unresolved or fails; old-account responses arriving after sign-out are discarded. Added three bilingual starting cards (tired / tense / need to talk) with consistent SVG icons and soft FC colors. A card prepares a draft only and never overwrites existing writing or submits automatically. English query-string entry and the pack-details return link retain language. All previews use **fictional balances**, not customer credits or confirmed payments.

Validation for this follow-up: full suite124/124 passed; after one additional mounted read-endpoint test, affected suites24/24 passed (**125 distinct tests covered**). Browser verified fictional sign-in, balance display, repeated refresh unchanged, starter draft without sending, and Chinese/English mobile layouts. At375px content width there is no horizontal overflow. Real Auth-to-ledger HTTP integration still needs backend credentials and the mail fix. New UI/server changes remain local and have NOT been deployed. The database-only read function is applied; the overall Care Chat feature remains unreleased.

Latest follow-up: read Brevo's reply on ticket #5636055. It is explicitly an AI-generated support response, stating the account is validated and transactional sending active; it does not verify the saved credential. A controlled owner-mailbox send at **26 October 00:25:20 Malaysia / 25 October 16:25:20 UTC** still returned HTTP500, `Error sending confirmation email`. The latest detailed SMTP log then visible was **25 October 23:58:30 Malaysia**, code535; do not misattribute that older SMTP log to the new attempt. Submitted these facts in the SAME ticket and requested a human agent. Confirmed new comment is present and ticket status Open. No keys/passwords/OTPs disclosed.

Owner approved clearer free-use counts and more natural conversation. Local `/chat/features` now exposes included TEXT sends and reset timezone, never internal sen/cost values. Before first use, UI explains the count and that only the customer's send counts; remaining-use display follows responses. Current nano reservation still implies **100 sends/month**, NOT a final promise for an upgraded model.

Conversation prompt now avoids mandatory questions on every turn, repetitive stock empathy, forced slang, guessing confusing statements, human impersonation, exclusive emotional dependence, and invented FC tracks/testimonial counts. It expressly says this conversation has no verified FC catalog attached. Do not claim the chat already reads all FC information.

Prepared **15 fictional cases × 2 models = 30 comparison entries**, including disorganized/repetitive expression, listening-only requests, contradictory context, unsupported beliefs, dependency, invented catalog claims, instruction attacks, urgent symptoms and medication questions. `evals/run-care-chat.cjs` defaults to **plan-only with ZERO model calls**; the generated plan is not a model quality result. Candidate `gpt-5.4-mini` is server-only and allowlisted for controlled comparison; default model remains nano. Local full suite now **116/116 passed**. No real-model evaluation has been run: this environment has no API credential; the existing Render FREE instance's Shell is explicitly unavailable without a paid upgrade. No paid upgrade was selected and no secret was extracted. A safe execution path using the existing provider account is still needed before the real comparison.

The optional live evaluator (`--run`) requires an environment credential, uses only fictional data, store:false, no retries, reasoning:none, at most 20 provider attempts and a conservative RM2 test reservation budget. At official standard rates checked 26 October (mini input USD0.75/M, output USD4.50/M), a 13k-input-token envelope plus600 output tokens is USD0.01245; with explicit RM6/USD ×1.2 conversion/fee headroom, this is8.964sen. Thus its comparison reservation is10sen/call. **The existing 5sen member reservation is NOT sufficient for that mini worst-case envelope.** Selecting mini for customers requires revised reservation arithmetic, migration of the DB's fixed5sen constraint/RPC, revised free/paid send counts, and validation before the enable flag can be switched on. Current SQL and customer budget have deliberately NOT been silently changed. Source: https://developers.openai.com/api/docs/models/gpt-5.4-mini . All conversion assumptions must be revalidated against actual billing before launch.

Unreleased. Supabase SMTP is enabled and the owner saved its credential, but actual mail delivery still fails. Brevo support ticket [#5636055](https://help.brevo.com/hc/en-us/requests/5636055) is submitted and awaiting response. Earlier paragraphs below are chronological setup notes, not the current connection status. Render configuration, real cross-account login/ledger checks, voice metering and payment checkout remain incomplete.

Independent follow-up completed locally: depleted allowance disables sending and opens an optional RM10 pack information card; clearing chat cannot reset it. Errors translate on language switch, preserve unsent drafts and never silently retry paid calls. Expired server sessions return to verification. Login requests cannot overlap, successful code requests have a 60-second convenience resend cooldown, and a verification completing after sign-out cannot restore that session. The provider still enforces real rate limits; the browser cooldown is not a security boundary. Rejected verification codes are distinguished from provider outages without exposing raw errors.

Added bilingual `/care-chat-pack.html` information preview: voluntary purchase, no autocharges, same verified account, monthly included allowance first, purchased allowance carries over, successful provider-confirmed credit only, failed-request usage disclosure and no audio membership entitlement. Checkout is absent and this is NOT final sale-ready legal/payment terms: specific send entitlement, payment provider, support contact, refund process and reconciliation must be finalized before enabling purchases.

Verification: full suite **112/112 passed** before the final sanitized verification-code classification; after that change the affected browser/Auth suites passed **13/13**, including one additional test (**113 total distinct tests covered**). Actual local browser checked fictional login, last-send exhaustion, disabled composer and pack link. Chinese/English pack previews inspected at 390×844 without horizontal overflow. No real email, payment or model call was used. Changes are local and no PR, deployment or customer navigation was changed in this follow-up.

Owner decision, 25 October 2026: **RM5 per customer per calendar month**, not USD1.50 and not a shared FC-wide budget. Reset uses Asia/Kuala_Lumpur. Existing listening and check-ins are separate.

Login decision, 25 October 2026: prefer reusing the existing FC session; owner authorizes same-email verification as a fallback if seamless reuse cannot be established. No new customer email address and no extra customer password. A remembered session is an objective, not a promise of never verifying again: a new device, cleared storage, expired or revoked session can require verification.

Research: LearnWorlds official plan comparison puts REST API, Advanced Multiple SSO and LTI 1.3 outside Starter/Pro Trainer. Custom-code USER variables can display a logged-in user's email/ID but do not give the external backend verifiable proof of that identity. No supported secure session reuse has been established for this school without upgrading. Do not transfer LearnWorlds passwords, expose its session cookies/tokens or invent a server-signed identity from client variables.

Managed authentication/storage service setup: owner signed in to Supabase with GitHub and completed the sign-in authorization. Created the **Frequencies Clinic** organization on **Free — USD0/month**, organization ID `ujdvuhpeotwnjnsbytpu`. The owner set the database password and created **FC Care Chat**, project `hgbwelnvtfrcditofswf`, region **Southeast Asia (Singapore)**. Project overview displays **Healthy**. Automatic table exposure was disabled and automatic RLS enabled before creation. No password has been generated, read or recorded by the agent.

Applied `migrations/20261025_care_chat_ledger.sql` through the authenticated project SQL editor; result: **Success. No rows returned.** Private schema has five protected tables, no anon/authenticated access, and two service-role-only transactional RPC functions. Ran `migrations/care_chat_ledger_verify.sql` in the actual database using synthetic fixtures and rollback. Result: **PASS: permissions, RM5 cap, paid allowance, payment/request deduplication, member isolation**. This is a serial transactional database check; concurrent production webhook/HTTP tests still remain. No customer records or synthetic balances were retained. No payment provider is connected, and ledger rows alone do not prove payment.

Local integration tests: **100 passed** after adding Supabase server-side identity lookup, durable RPC adapter, legacy-route bypass protection and purchased-allowance response handling. Render environment keys are NOT connected, the new code is NOT deployed, and the Care Chat enable flag remains off. SMTP is currently off in the project, so customer OTP delivery is not ready.

Supabase's default mail sender is for non-production and restricted recipients; a production SMTP sender must also be configured before inviting real FC customers. Do not describe the built-in sender as a free production email service. Do not enable a paid plan or create ongoing charges without the owner's authorization.

Email provider decision: owner confirmed existing FC notices are sent by LearnWorlds using its managed noreply address, not a separately controlled SMTP service. Owner authorized **Brevo Free**, completed account registration and asked the agent to finish onboarding. Submitted organization name **Frequencies Clinic**, the public FC website and the business address the owner explicitly provided for the Brevo organization profile. Selected **Free**, verified by dashboard showing **300 left out of 300**; no card/paid plan was selected. The dashboard requires phone verification before sending messages or creating API keys. The phone-verification dialog is open for the owner; no SMS code has been requested/read/entered by the agent. No password or sending key has been generated/read. Brevo sending approval/sender verification and Supabase SMTP connection remain pending. Prepared bilingual code email template: `integrations/care-chat/login-code-email.html` using Supabase's `{{ .Token }}` variable; not yet applied or sent.

Further setup: owner completed phone verification (observed **Phone number verified**) and personally generated **FC Care Chat OTP**, active with expiry **25 October 2027**. The full-key result dialog had been closed; only the masked suffix was visible. No matching full key was available from the copied clipboard value; unrelated clipboard content was not retained or printed. Asked the owner to copy their saved key or confirm it was not saved; do not attempt to extract a masked key from hidden page state. Brevo lists an existing **Frequencies Clinic** sender as **Verified** using the owner's signup email; it also notes that a freemail domain is not recommended. Supabase SMTP form has the verified sender, `smtp-relay.brevo.com`, port `587` and the observed SMTP login filled in. Password remains blank and **Save changes has not been clicked**. SMTP enablement is only an unsaved draft. No new verification email, OTP or customer message has been sent. Full connection/delivery remains unverified.

Latest state (25 October 2026): owner directly pasted a credential into Supabase and saved. Reloaded SMTP configuration shows enabled and an existing hidden stored password. Saved and previewed both **Magic link or OTP** and **Confirm sign up** templates using `login-code-email.html`; each uses `{{ .Token }}`, not a magic-link URL. Subjects are branded FC Care Chat in Chinese/English. One owner-mailbox OTP test through the public Auth endpoint at 11:58:15 UTC returned HTTP500. The filtered actual Auth error log for `/otp` reports **535 "5.7.8 Authentication failed"**. Do not report delivery or SMTP authentication as successful. Re-entering the known SMTP username caused no form change; it was already the expected value. Host/port are the expected Brevo values. No hidden saved password was read or changed by the agent. Owner was asked to re-paste the complete SMTP key directly into Password (or say that the full key was not saved); do not generate a replacement credential without the required owner hand-off. The provider and database connections are still not released to Care Chat.

Additional independent progress while awaiting the owner: implemented the same-origin email OTP request/verify/refresh/logout API adapter and a bilingual login form. Remembered-device session storage is an explicit unchecked opt-in; conversation text and OTPs are never written to storage. Server-side Auth user verification still protects paid calls. Browser logout clears the current conversation, email/code fields and OpenAI consent; provider local-session revocation is attempted. Recent context is bounded automatically rather than forcing a reset after three exchanges. Production remains disabled. **106 local tests pass**. Used a separate localhost-only fixture server to exercise login, a labelled fictional chat reply and logout; no real email or model calls occurred in this UI check. Found and fixed the browser GET `/chat/features` Origin-header issue; provider POST endpoints retain origin checks. Real OTP delivery/sign-in and real member-ledger/API integration are still unverified.

Customer flow: open Care Chat from FC; if the Care Chat session is valid, enter directly. Otherwise enter the same FC email and the emailed one-time code. Server verification establishes the Care Chat identity; a verified mailbox alone does NOT prove paid FC membership or grant audio access. Because reliable FC account matching is not yet available, do not claim paid-member eligibility has been verified. Use a stable auth subject for cross-device monthly allowance and purchased balances; never an arbitrary posted email.

Research sources checked 25 October 2026:
- https://www.learnworlds.com/plans/
- https://support.learnworlds.com/support/solutions/articles/12000089616
- https://learnworlds.freshdesk.com/support/solutions/articles/12000082908-how-to-add-custom-code-in-your-learnworlds-school
- https://supabase.com/docs/guides/auth/auth-smtp

Additional owner decision: optional **RM10 chat top-up**, with **RM5 maximum additional internal AI-cost allowance** per purchased package. This is not RM5 profit: payment fees, taxes, hosting and other operating costs have not been deducted. No automatic purchase or subscription price change. Customer-facing name: 聊天加额包 / Extra Chat Pack. Customer-facing wording must not expose the internal cost allowance.

## Optional paid continuation — prepared, not available for sale

- Show an optional RM10 purchase after the included monthly allowance is exhausted. Waiting for next month's included allowance remains available. Ordinary listening/check-ins are unaffected.
- Every successfully paid package adds a separate purchased allowance. Recommended policy: use the monthly included allowance first, keep unused purchased allowance across month resets, and never reset paid balance with the calendar. This carryover policy is a proposed implementation choice, not yet published terms.
- Do not promise a fixed number of messages or minutes until model/voice reservations are final. Do not call this unlimited chat.
- A browser redirect, screenshot, client-supplied email or `paid=true` flag cannot add credit. `createCareChatTopups` requires authoritative provider payment verification and a server-created order belonging to a verified member.
- The provider adapter must check signature, merchant account, captured MYR1000 payment and immutable server order ID. Pending/failed/refunded/wrong-currency/wrong-amount payments do not grant a package. Never store card data in this app.
- `creditOnce` must atomically enforce uniqueness for BOTH payment reference and order, increase the correct member wallet once, and mark the order credited. Retries and concurrent webhook deliveries must be idempotent. The mock tests verify calling behavior; they do not prove a real database or payment gateway is connected.
- Before release: connect verified member login, a private transactional store, hosted checkout and verified webhooks; integrate purchased balances with the same reserve-before-provider ledger; handle refunds/chargebacks, failed fulfillment reconciliation and receipts. Confirm actual payment-provider fees before stating margins. No payment gateway or charge has been created in this change.

## Prepared locally, not released

Friendly bilingual name; short conversational text interface at `/care-chat.html`; bounded recent context; medical escalation before model calls; existing GPT-5.4 nano Responses integration. No server-side conversation persistence. Browser history is memory-only and clearing it does not reset the member allowance.

`/chat/conversation` is deliberately unavailable in the default production configuration. An injected verified-member adapter and durable transactional budget store are mandatory. The existing recording/recommendation flow is unchanged and **does not yet have the requested member-monthly cost protection**. Do not advertise that all AI use is capped.

## Required integration before opening chat

1. A trusted stable member subject verified server-side. Never accept an email, membership choice, localStorage identifier or browser-reported SCORM identity as proof. Existing LearnWorlds SCORM score saving does not provide backend identity verification. The owner asked to investigate reuse of FC login before considering a separate login.
2. Connect the provisioned durable transactional allowance store to Render using server-only configuration. `reserve({member, month, amountSen, limitSen, requestId})` atomically compares and increments and returns `{accepted, usedSen, paidRemainingSen}`. No app-memory or ephemeral Render filesystem fallback. Fail closed on timeout, corruption or unavailable storage. All instances must share the same store. Do not put customer health or chat records into the editorial Google Drive connector.
3. The local budget enable flag now also gates both legacy recommendation aliases. Transcription is deliberately disabled under that flag until SERVER-side duration validation and voice reservations are ready; browser metadata and file size do not establish billable duration. Existing live code is unchanged and not capped yet. Do not enable the new flag without first completing browser authentication and either integrating voice metering or clearly offering text-only chat.
4. Integrate the browser with the chosen server-verified session mechanism. Cross-origin iframe cookies and auth need real multi-account/cross-device testing. No auth system has been connected by this change.

## Conservative allowance, not an invoice

Text prototype reserves **5 sen before each model attempt**, leaving the reservation in place after timeouts or ambiguous provider errors. RM5 permits at most 100 such attempts. This is deliberately conservative; it is not a statement that OpenAI charges 5 sen per message. There is no retry inside the model client. Urgent and medical replies are deterministic but currently still consume the conservative reservation after authentication.

The text model is fixed to GPT-5.4 nano, with at most 12,000 UTF-8 bytes of complete input and 600 output tokens. Official rates checked 25 October 2026: USD0.20 per million input tokens and USD1.25 per million output tokens. A deliberately loose 13,000-input-token envelope plus 600 output tokens costs USD0.00335, excluding any billing tax or exchange charges. The 5-sen reservation leaves a substantial conversion margin at RM6/USD; **this is a budgeting assumption, not a live exchange rate or a guaranteed billing exchange ceiling**. Revalidate provider prices, token envelope, currency conversion and applicable taxes before enabling. Do not use a different model without recalculating reservations.

Actual monthly billed MYR needs conservative conversion/fee policy and reconciliation. Fixed USD estimates such as “1,000 messages cost USD1.50” are not guarantees. Voice charges require a separate proven reservation and must share the same RM5 allowance. Do not enable this prototype as a complete RM5 cap until those production gates pass.

Sources: https://developers.openai.com/api/docs/models/gpt-5.4-nano and https://developers.openai.com/api/docs/guides/terraform/rate-limits-and-spend . Spend notification thresholds alone do not implement the per-member application cap.

25 October SMTP follow-up: Owner re-entered and saved the existing SMTP credential. Controlled OTP retry at 15:54:30 UTC returned HTTP 500 (not accepted); detailed new log is not visible yet. Existing 23:27 Malaysia log confirms 535 5.7.8 authentication failed. Brevo key still Active, last-used blank, username/host/port match visible setup, no SMTP IP blocking. Transactional wizard waits for its first log; this does not establish an activation defect. Prepared a sanitized support draft locally; no support request sent. Do not ask owner to repeat identical credential entry without new evidence. Chat remains unreleased.

26 October owner authorized contacting Brevo support. Submitted ticket #5636055 at https://help.brevo.com/hc/en-us/requests/5636055; success notification and Open status verified. Included SMTP connection settings, active key NAME only, error code and timestamps; no key value, password, OTP or customer data. Awaiting provider response; delivery and chat release remain blocked. No automatic monitoring scheduled.
