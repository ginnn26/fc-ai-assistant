# One-language FC audio display

28 October 2026: installed in LearnWorlds Site custom code. The member body preserves the existing scripts and updates only the owned listening, catalog, body-area navigation and outline display code. The public body adds the description-language runtime while preserving its existing image tools. Original bodies and the final member installation are backed up in the local `outputs/fc-language-review` folder.

Audio directory, player tools, description pages and testimonial rules share `fc-site-language`. Switching language updates their UI while keeping links, version/category filter values, durations and membership access unchanged. Other open tabs can follow that preference through the storage event. The rewards panel follows the same switch instead of offering a competing switch.

Existing bilingual descriptions remain in the DOM as language-marked spans/blocks; the selected language alone is displayed. No medical claims, testimonial meanings, citation destinations or amounts are rewritten. Original customer posts, audio cover art, videos and their embedded text are not machine-translated. New authored prose should use explicit `data-fc-only="zh"` / `data-fc-only="en"` blocks with equivalent complete content; legacy text separation is a compatibility measure.

Build: run `scripts/build-testimonial-rewards.cjs`, then `scripts/build-fc-language.cjs <preserved-original-member-body.html> <new-installation.html>`. The language builder uses Acorn to scope UI assignment changes and validates all resulting scripts before saving. Acorn 8.19.0 and LinkeDOM 0.18.14 were installed in an isolated local tools folder, not production dependencies. Run the focused language tests with those tools available on NODE_PATH; DOM tests require LinkeDOM.

Verified on the live private directory: all 178 cards displayed with no Chinese title fragments in English mode; every card had a Chinese title after switching back. Verified English/Chinese descriptions and reward language using Abundance and Acne, including Next navigation, citation links, duration metadata and medical-care notices. Also checked category selection, full catalog loading, and unchanged non-display/member-access scripts. No review, payment, reward, order or member expiry was changed in this release.

The points/product redemption work remains a draft, described in `NEXT-STEPS.zh.txt`; this language release does not activate it.
