# Theme covers and compact listening cards

This release is based on the currently deployed PR #2 commit, `4d68c2377d83fc214c3c0bef260039b413af54b1`. It changes the recommendation presentation and static image assets only. It does not enable the unfinished PR #3 knowledge store, content manager, membership bridge, usage persistence, model migration, or guided intake.

Every existing production catalog ID has its own exact cover. There are 164 distinct 768 × 512 WebP assets, including eight covers prepared for draft themes; the production catalog and audio registrations are unchanged. Same-theme Intensive, Smooth and BGM choices share their theme's image. Unknown IDs receive no guessed generic image. Small icons have adjacent text labels; large theme photos are decorative. These are generated editorial visuals, not medical evidence or customer photographs.

Recommendation cards show short reasons and usage excerpts when present, with full explanations behind a native collapsed disclosure. Source text and existing protected playback URLs are retained. Care passages, when provided, remain visible. Recommendation options are not a medical treatment sequence.

Validation: 47 tests passed, including the existing assessment and assistant request safeguards, complete production-catalog cover coverage, all 164 unique image hashes, known theme renaming, and three-version mapping. Browser checks on the actual release frontend passed at 1280, 390 and 320 pixels: loaded images, 3:2 ratio, desktop three-column / mobile single-column layout, no horizontal overflow, bilingual switching, disclosures and unchanged protected playback routes. Local browser response fixtures were clearly labelled and did not call an AI provider. Full provider behavior and microphone capture were not revalidated because this release does not change those paths.

The complete PR #3 integration remains separately in draft. Its 74-test result is not the test count for this smaller release.
