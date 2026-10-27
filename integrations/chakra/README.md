# FC Chakra Reflection

The independent Chinese questionnaire is served from `/chakra/`. The SCORM 2004
package bundles the same UI, scripts and responsive WebP scenes, so the membership
activity does not depend on a Render cold start. Install as a NEW activity; never
replace the existing Daily Wellbeing Guide package.

## Data and consent

`account-store.js` uses LearnWorlds' same-origin `API_1484_11` and the independent
`FC_CHAKRA_V1:` suspend-data prefix. Answers remain in memory until the member
opts in to account saving. The package keeps one draft and at most six reports.
No answers are sent to Render, OpenAI, URL parameters or a new database.
Platform administrators retain the platform's existing access permissions.

Commit success is reported as submission, not proof of remote durability. Verify
exit and reopening the learner activity before claiming account recovery.
Malformed, foreign or stale runtime records fail closed; the original daily
guide's activity and records are never modified. Concurrent editing is discouraged.

## Content

63 reflection items, seven distinct scenes and resource/pressure dimensions.
This is a spiritual-themed self-reflection instrument, not a validated chakra
measurement, diagnostic assessment or treatment prescription. No overall health
score is produced. Missing/NA answers are excluded with minimum coverage rules.

Recommendations use the existing FC catalog checked on 2026-10-17 and a restricted
allowlist of established recordings; unfinished chakra releases are excluded.
Description links and membership-library entry preserve existing playback access.
The member chooses their current needs; recommendations span relevant series.

## Verification

`node --test test/chakra-account.test.cjs`: consent, boundaries, native commit,
restore, malformed/foreign records, retry, stale records and activity-only clear.
The repository regression suite passed 221 tests, with one existing DB integration
test skipped (2026-10-28). Browser checks must separately verify the installed
SCORM activity and a real exit/reopen cycle with synthetic answers.
