# Paid-member access — prepared, not connected

Owner decision,26October2026: monthly complimentary Care Chat is for active
paid FC members only. Free trials do not qualify. The daily guide retains its
separate policy for all signed-in customers.

## Backend enforcement prepared

`FC_CARE_CHAT_ACCESS_MODE=pilot` remains the default and requires the explicit
pilot email-hash roster. `paid` selects a separate private-database eligibility
lookup after Supabase verifies the bearer and canonical email. A browser email,
paid flag, course-page access or successful OTP is never membership proof.
The check runs for each allowance/chat/voice request through verifyMember.
The code-request prefilter awaits that same lookup; false returns the same
generic acknowledgement, without sending mail. Errors stop rather than grant.

The new migration `20261026_care_chat_paid_membership.sql` is PREPARED ONLY,
not applied to Supabase. No actual member records have been copied or imported.
It grants the backend service role only a read RPC. Anonymous/authenticated
clients cannot query the private table or invoke the RPC. There is no public
membership-write endpoint or client self-enrollment.

Rows require authoritative paid-from, paid-until and verified-until timestamps.
At the paid-until/verified-until boundary access stops. Revocations stop access
even during paid coverage. Multiple independent paid subscriptions may qualify;
revoking one must not incorrectly revoke a separate valid subscription.
Scheduled cancellation is not immediate revocation of already paid coverage.
An expired synchronization lease stops stale eligibility; its duration and
reconciliation schedule must be selected once the source is proven.
The schema does not infer a year's access from a single monthly payment.

Email SHA256 hashes are still personal data and can be guessed; keep the table
private. Canonicalization trims and lowercases only. Never strip dots or plus
suffixes or match customer names. Verified email changes require a deliberate
source-account remapping; do not copy an old customer's grant to a new mailbox.

## Trusted source still required

Official sources checked26October2026:

- https://www.learnworlds.com/product/integrations/ states API/Webhooks are
  Learning Center/Corporate features, while Zapier is offered on paid plans.
- https://support.learnworlds.com/support/solutions/articles/12000079609-how-to-connect-your-learnworlds-school-with-zapier
  describes school-ID login and owner/super-admin authorization for Zapier.
- https://support.learnworlds.com/support/solutions/articles/12000040396
  lists Payment Created/Failed, Subscription Updated/Canceled triggers.

This establishes a route worth checking, NOT a working FC connection. Need to
confirm the school's actual plan/integration, Zapier pricing/quotas, permissions,
event fields and authentic backend delivery. Do not create a Zapier account,
accept terms, grant permissions or subscribe without the relevant owner step.
No Zapier connection has been made.

Read-only actual FC annual payment page inspection on26October2026 found
Payex online-banking/e-wallet and a separate card checkout, with staff payment
confirmation instructions. A payment-provider-only approach must cover both
paths and manual activation; do not assume all paid members have a card
subscription. School-owner membership management access is still needed to
identify the authoritative dates and existing records. No payment was made.

Before public launch, prove paid coverage and expiry dates, refunds/revocations,
renewals, existing-member backfill, replay/idempotency, event ordering, failed
sync alerts and periodic reconciliation with fictional fixtures. A payment-created
event may not prove successful capture; a free enrollment cannot qualify.
Use a signed/authenticated source. Never trust an arbitrary incoming email/paid
flag. Payment-provider verification may be an alternative, but actual provider
access and coverage mapping have not been established for this school.

## Remaining launch decisions

Paid-pack checkout stays disabled. How previously purchased packs may be used
after FC membership expires is NOT decided by this change; balances must never
be silently erased. Do not sell packs before that policy and refund flow exist.
The current gate denies all chat access without valid membership in paid mode;
it does not forfeit or modify any stored purchased balance.

Apply and verify the new migration only after selecting the trusted source.
Keep feature flags disabled until source synchronization, real OTP delivery,
two-account isolation and expiry/revocation tests pass. A `ready:true` configured
adapter indicates dependencies are configured, not that real integration passed.
