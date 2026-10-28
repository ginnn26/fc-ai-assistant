# FC testimonial rewards — native audio discussions

Installed on 28 October 2026 by appending `LEARNWORLDS-BODY.html` to the existing **Site custom code → body logged in** slot. The original slot was preserved separately in the operator's local output folder. The installed panel needs no Render request, new login or third-party database.

## Policy and fulfilment

- Each genuine original testimonial, after staff verification, earns one day.
- Maximum 15 days per verified annual membership term, across all audios/versions. Not a calendar-year cap.
- Redeem only after verified paid renewal. Approval is not fulfilment.
- Unlimited comments; no invented daily reward cap, redemption deadline or combined check-in cap.
- No positive sentiment, star rating or improvement requirement. Promotional reuse needs separate permission.
- Native Discuss stays under the original learning activity; existing discussion visibility was inspected and left unchanged.
- The button opens the native composer but never writes/posts a testimonial. The separate request opens the existing administrative WhatsApp with audio title and URL only; the member chooses whether to send.

## Staff ledger

The existing private team membership master has three additional tabs: **Testimonial Reviews**, **Testimonial Redeem**, **Testimonial Guide**. Existing tabs, check-in formulas and permissions were preserved. Formula-ready capacity is rows 6–305. `ledger-formulas.json` contains the first-row formula templates; expand ranges, formulas, table definitions and validation together before adding capacity.

Review inputs A:O, calculations P:V. Record original comment permalink/ID; do not copy health narratives. Staff verify original author, annual-term dates, genuine use and duplicates. A high same-day count is a review flag, not an automatic denial.

Redemption inputs A:D, H, J:R; calculations E:G, I, S:W. Payment reference must match a positive, Verified payment for the same member covering the renewed term. Staff separately verify the annual contract/renewal, particularly for monthly instalments. Duplicate member/term claims and reused payment references block fulfilment. Record the actual access end before this reward to avoid overwriting other verified extensions. Apply the actual change in FC first, then record its resulting date and action evidence. This spreadsheet never modifies membership, billing or Stripe.

## Build and checks

Run `node scripts/build-testimonial-rewards.cjs` after changes; it builds both `embed.js` and the installation from the existing 501-activity catalog. Review policy tests with `node --test test/testimonial-rewards.test.cjs`.

Verified: Chinese/English panel, native composer opening/focus, title and request-link changes after Next, full current regression suite (226 passed, one pre-existing database test skipped). Google Sheets fixture checks covered 20 approved shares capped at 15, pending/duplicate exclusion, missing renewal HOLD, paid renewal ready, wrong extension date HOLD, correct fulfilment evidence, and duplicate annual-term redemption HOLD. Fictional QA sheets were removed; no member reward or public testimonial was created during testing.

The standalone static rules assets are also included for a later ordinary app deployment; the installed LearnWorlds panel already contains the full rules and does not depend on that optional route.

## Rollback

Remove only the appended `FC testimonial rewards v1` block from the logged-in body slot. Preserve preceding code. Retain any real review/fulfilment ledger records if the programme is stopped. Never revert actual awarded membership days by deleting spreadsheet rows.
