# Private Daily Guide pilot

The existing public assistant and navigation are unchanged. The daily guide is an opt-in self-report calendar launched from a private LearnWorlds SCORM 2004 activity. It uses the existing member login and native suspend storage; no private records are sent to Render or OpenAI. Render serves only the public UI and catalog. All daily scores, calendar/trends and playback accounting use zero AI calls.

The six optional scales measure perceived difficulty, higher = more difficulty. Missing days are not filled, sleep is reviewed the following day, and changes are not proof of audio treatment effects. Native account storage requires explicit consent. School administrators retain their existing platform data permissions.

The selected, protected FC member player is embedded in the guide. Actual media advancement plus elapsed wall time are counted; opening a page, pausing, seeking or encountering login/denial do not count. Manual entries are separately labelled. Audio played outside this guide is not automatically recorded. Browser suspension may undercount.

Small saves submit synchronously; large records are compressed and capped at 60,000 characters. API acceptance is labelled submitted, not proof of server durability. The save-and-leave action drains pending updates, commits and ends the native session before navigating. Forced closure, real device recovery and simultaneous edits need verification.

The installed stable shell loads the fixed public `release.json` entry and has a packaged fallback. Future UI fixes can be published without replacing the SCORM ZIP. **Do not replace the package after real records exist:** LearnWorlds warns that non-graded SCORM updates reset learner progress. Native suspend storage is bounded, not an unlimited database.

Validation: 62 tests passed on this release, including original assistant/assessment safeguards, date/score validation, sleep separation, native save failure boundaries and actual media counting. A synthetic baseline and a short Grounding playback entry restored on school re-entry. An earlier quick exit lost the latest after-score; this remains a real-member release gate rather than a claimed success. The owner account alone is enrolled in the private pilot without payment records or notification emails.

Before public launch: owner-member save/exit and rapid closure, second authorized account isolation, real second-device recovery, offline/retry, loop/song changes, update preservation, retention/export/deletion. Do not enable a public navigation link until these pass. Use one record-editing device at a time until concurrent-edit behavior is resolved.

Official platform guidance: https://support.learnworlds.com/support/solutions/articles/12000052986-how-to-upload-scorm-files-and-html5-packages-to-your-courses
