# FC testimonial points release — 2026-10-28

Member entry: https://fc-ai-assistant.onrender.com/testimonial-rewards/member.html

Staff entry: https://fc-ai-assistant.onrender.com/testimonial-rewards/staff.html

Deployment verification is recorded by the operator after the Render deploy is live and LearnWorlds custom code is saved. Do not infer live status solely from this source file.

Approved rules: 10 points per genuine original verified testimonial; paid active accounts can redeem without renewal; 50 points/one day, 100/Gold Lucky Turtle worth RM99, 150/10ml essential oil worth RM198, 180/Ritual Tea 10 sachets worth RM190, 200/60-minute salt room worth RM190, 300/50ml Energy Cleanse worth RM298, 350/50ml Abundance worth RM298. Customer pays RM9 shipping for shipped physical gifts. Staff confirm stock and arrange fulfilment. Unknown final packaging remains marked illustrative.

The migration adds a private schema and four service-only RPCs; no existing member/payment/check-in rows are modified. Original approved day rewards remain in the old private sheet, manually checked to prevent duplicate awards. No medical narrative, postal address or payment card data is collected by the points form. No Google-review automation is installed.

Tests before deployment: database transaction tests for exact credit, idempotency, cross-member duplicate original, concurrent insufficient balance, refund once, expired eligibility, same-account cancellation, stock/variant validation, fixed shipping, and actual access extension evidence. Local fictional browser flow exercised member claim, staff verification, product selection, point reservation, stock confirmation, shipping payment and fulfilment. No live fixture awards were created.

Operational rollback: remove the new LearnWorlds reward block or disable its entry; set FC_REWARDS_ENABLED=false to disable endpoints if necessary. Retain all live reward records. Do not drop reward tables or restore an old points balance. Existing chat, assessment, check-in, memberships and billing are separate.
