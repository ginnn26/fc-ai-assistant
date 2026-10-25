# Private Daily Guide pilot

The existing public assistant and navigation are unchanged. The daily guide is an opt-in self-report calendar launched from a private LearnWorlds SCORM 2004 activity. It uses the existing member login and native suspend storage; no private records are sent to Render or OpenAI. Render serves only the public UI and catalog. All daily scores, calendar/trends and playback accounting use zero AI calls.

The six optional scales measure perceived difficulty, higher = more difficulty. Missing days are not filled, sleep is reviewed the following day, and changes are not proof of audio treatment effects. Native account storage requires explicit consent. School administrators retain their existing platform data permissions.

The selected, protected FC member player is embedded in the guide. Actual media advancement plus elapsed wall time are counted; opening a page, pausing, seeking or encountering login/denial do not count. Manual entries are separately labelled. Audio played outside this guide is not automatically recorded. Browser suspension may undercount.

Small saves submit synchronously; large records are compressed and capped at 60,000 characters. API acceptance is labelled submitted, not proof of server durability. The save-and-leave action drains pending updates, commits and ends the native session before navigating. Forced closure, real device recovery and simultaneous edits need verification.

The installed stable shell loads the fixed public `release.json` entry and has a packaged fallback. Future UI fixes can be published without replacing the SCORM ZIP. **Do not replace the package after real records exist:** LearnWorlds warns that non-graded SCORM updates reset learner progress. Native suspend storage is bounded, not an unlimited database.

Validation: 62 tests passed on this release, including original assistant/assessment safeguards, date/score validation, sleep separation, native save failure boundaries and actual media counting. A synthetic baseline and a short Grounding playback entry restored on school re-entry. An earlier quick exit lost the latest after-score; this remains a real-member release gate rather than a claimed success. The owner account alone is enrolled in the private pilot without payment records or notification emails.

Owner test on 25 October: score 3 disappeared after the owner used save-and-leave, returned to the member homepage, and re-entered. This is a failed release gate. A separate administrator-context test restored synthetic score 2, so the owner's failure has not yet been reproduced in the available administrator browser session.

Save recovery patch: idle checkpoints no longer replay successful historical payloads, unchanged saves are skipped, failed submissions remain retryable, and suspend-data readback plus the suspend-exit response are checked. This removes a demonstrated stale-page overwrite risk in the application; it does not prove that risk caused the owner's failure or provide cross-device concurrency control. SCORM termination itself is still managed by the LMS. Full local regression: 65 tests pass. Real-member persistence is still unverified after the patch.

Before public launch: owner-member save/exit and rapid closure, second authorized account isolation, real second-device recovery, offline/retry, loop/song changes, update preservation, retention/export/deletion. Do not enable a public navigation link until these pass. Use one record-editing device at a time until concurrent-edit behavior is resolved.

Official platform guidance: https://support.learnworlds.com/support/solutions/articles/12000052986-how-to-upload-scorm-files-and-html5-packages-to-your-courses

## Member feedback and presentation update — 25 October

After PR #8, the owner reports that the earlier test record is available from both phone and computer. This confirms recovery in that member's tested sessions; second-account isolation and other release gates still need independent verification.

The presentation update adds full Chinese/English switching, a dated empty chart with real score axes and no invented series, readable UTF-8 HTML reports with an in-page preview and browser print/PDF option, and a collapsed privacy section. Technical pilot/OpenAI text is removed from the primary customer view; the required storage consent remains. Three feature tags have distinct muted colours, and Chinese listening headings keep whole phrases together at narrow widths.

The previously prepared welcoming design is included: one star per recorded day, derived from existing records, with optional keepsake badges at 1/3/7/14/30 days. Missed days never reset the collection and better symptom scores do not earn extra stars. Demo data and demo gifts remain separate. No new private fields, service, storage schema or AI calls are introduced. Keep the installed SCORM package intact; this is a public UI asset update, not a package replacement.

Validation: 72 local tests pass, including empty/missing graph data, readable report labels, report escaping, language labels and reward rules, plus the original backend and native saving tests. Browser checks cover both languages, a fictional score persisting through local reload, language changes retaining the same scores, report preview, and 390/320px layouts. A generated download click has no observed local file in the in-app browser; do not claim host-file delivery or PDF printing verified until checked in a normal browser. Actual member save/playback should receive a post-deploy smoke test before public navigation.
