# Paid-member access — prepared, not connected

Owner decision,26October2026: monthly complimentary Care Chat is for active
paid FC members only. Free trials do not qualify. The daily guide retains its
separate policy for all signed-in customers.

Owner clarified on26October2026: staff set manually activated members' expiry
dates in FC itself. FC enrollment expiry is therefore the intended authority;
do not introduce a second independent member-expiry list or guess a term from
a payment amount. The actual supported extraction/update channel is unproven.

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

Actual school-admin UI inspected26October2026 after the owner signed in:

- Organization Schools page confirms Pro Trainer.
- Settings > Developers > Webhooks displays a higher-plan/Upgrade notice.
  No toggle, signature or connection was changed or copied.
- Settings > Integrations > Zapier opens without an upgrade gate, but its
  workflow pane asks for Zapier sign-up/login. This is not evidence of an
  existing connection or permission grant. No Zapier login was initiated.
- The owner's authorized test account has a private-library enrollment and
  no recurring plan. This is not proof of paid coverage. No account details,
  permissions, dates, payments or tags were modified.
- Users > All users > user > Products > row three-dot menu > Edit exp. and
  due date is available. The dialog offers new expiration/due-date settings;
  it did not show an authoritative current paid-through date. It was canceled
  without selecting or applying a value. Due dates must never be treated as
  membership expiration. Asked owner how staff currently record manual expiry.

Follow-up read-only inspection: the school's Webhooks page links an official
`user_manually_enrolled_in_product_v2.json` sample under its Asia API assets.
The fictional sample contains version/type/trigger/school_id and data.product
(id/title/type) plus data.user. It does NOT include enrollment paid-through or
expiration dates. This is only the direct-webhook sample, not a tested Zapier
output. It does not prove Zapier lacks expiry fields, nor that manually editing
an expiry triggers User Updated. Both need provider confirmation and a controlled
fictional integration test. Do not grant ongoing paid access from that sample.
No real member event, customer record or credential was sent to Zapier.

Technical inquiry sent to LearnWorlds support after owner explicitly authorized
both the inquiry and the Gmail channel. LearnWorlds acknowledged receipt as
ticket395581 (https://support.learnworlds.com/helpdesk/tickets/395581). No human
technical answer yet. Only school details and the following questions were sent;
no customer records, attachments or credentials:

"Our Frequencies Clinic school uses Pro Trainer. Staff manually enroll some paid
members and set their product enrollment expiration dates in LearnWorlds; others
pay through card subscriptions. We are implementing an external member-only chat
benefit without upgrading the school plan. Please confirm:
1. Which supported Pro Trainer/Zapier trigger or read action returns a specific
user's current course/program enrollment expiration timestamp and status?
2. Does changing an existing learner's expiration date, including manual renewal
or early access removal, emit a Zapier event? Which event and fields?
3. Can existing enrollments be backfilled and reconciled through this supported
integration, including manual grants, without REST API access or Learning Center?
The public manually-enrolled webhook example includes user/product but no expiry.
We need to avoid inferring paid validity from email verification, enrollment alone
or a payment-created event. Please identify the supported route or confirm this
is unavailable on Pro Trainer. We are requesting advice, not a plan upgrade."

Zapier pricing checked at https://zapier.com/pricing : Free advertises100tasks
per month and two-step Zaps. Professional advertises Webhooks and multistep
Zaps. Do not assume the proposed workflow is free or fits the free quota;
actual event volume, fields, destination and plan must be validated first.
No subscription or charge was created.

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
