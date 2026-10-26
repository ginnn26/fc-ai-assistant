# One FC Care Chat service

Owner decision,26October2026: voice description, compassionate conversation,
clarifying questions and FC listening suggestions are ONE customer function.
No separate recommendation/chat products or separate RM7 allowances.

## Implemented locally

- Existing bounded voice-draft input and text messages use one verified member
  wallet. Conversion reserves one5sen unit; the following chat send reserves one more.
  Customers can explicitly send a finished voice note in one action: the browser
  converts it, then submits the transcript to the same protected conversation
  route. Optional text preview still converts only, with a separate later send.
  Recording and playback are local and free. A failed stage never auto-retries;
  a successful transcript is preserved if the chat stage cannot finish.
  Local recording/playback and allowance reads do not call a paid provider.
- Unified conversation locally narrows the owner-recorded catalog; a single
  bounded model call produces a short reply and zero-to-three catalog IDs.
  It never invokes the old recommendation model as a second paid analysis.
- The assistant can listen or clarify without returning any audio. A no-advice
  request removes listening candidates. Urgent/clinical rules run before AI.
- Returned IDs must be in the supplied candidate set. Cards obtain names,
  exact theme covers, description and recording URLs from the server catalog.
  Player links retain FC's own playback permissions. No audio file is exposed.
- Cards remain in the same conversation, with brief guidance and expandable
  recording versions. Subsequent model history contains role/content only;
  card metadata and URLs are not echoed into model history.
- English/Chinese card controls are localised. Existing chat text is not
  machine-translated when the interface language is changed.

## Deliberate release gate

`FC_CARE_CHAT_UNIFIED_ENABLED` defaults false while the current live service is
unchanged. At the approved unified release, set it true together with the
verified account/ledger and optional voice settings. It redirects the old root
and index.html to care-chat.html, preserving only the supported English flag.
It rejects legacy /chat/, /chat/recommend and /chat/transcribe requests before
any AI call; those URLs cannot bypass the shared allowance. Existing FC embeds
must be verified to land on the unified page. Do not enable this flag alone
before the new service is ready or it will intentionally close the old routes.

## Catalog boundary

The current repository has verified titles, aliases, theme covers and actual
FC links. It does NOT contain complete verified effect/use explanations for
every recording. The model is explicitly told that catalog titles are metadata,
not efficacy evidence; it must not invent mechanisms, testimonials, treatment
claims, EQ improvements, durations or promised changes in another person.
Cards link to the existing full description. This is not an automatic read of
all FC content. The reviewed-content branch now reads published summaries from
the dedicated Google shared-content gateway; it has not been deployed or checked
against that real source yet. Missing descriptions remain unknown. Per the
owner's updated scope, completing every description is not a core launch gate.
The near-term catalog roadmap is 300 themes, then 1,000+; those are capacity
targets, not claims about the number of recordings currently available.

## Validation and remaining gates

Offline tests cover same-conversation Conflict Resolution selection, clarification
without forced recommendations, no-advice, urgent symptoms, invalid catalog IDs,
trusted links, input bounds, shared wallet and blocked old spending routes.
Fictional bilingual browser previews verify inline cards, exact cover assets and
expandable member versions. No real AI replies are produced by those previews.
The full180-check local suite passed. The new `--unified` evaluation route
prepares16fictional cases across the two existing comparison models; by default
it makes no provider calls. A real run remains an explicit private test step.
Structured output follows the official Responses API format:
https://developers.openai.com/api/docs/guides/structured-outputs

Before enabling: complete paid membership source/expiry sync and private backend
configuration; run real model checks at the final200token structured-output cap;
verify actual audio transcription and FC iframe/mobile permission behavior;
confirm real multi-account wallet isolation and the FC page switch. SMTP and
the owner's real code/identity/refresh/logout round trip have already passed.
No additional customer charge or paid plan was introduced. On 26 October 2026
the owner cancelled RM15 paid packs. There is no planned checkout integration;
the customer interface now explains the monthly renewal without an upsell.
