# Team demo chat eligibility

The owner requested chat access for the FC management team on 26 October 2026
so they can demonstrate the service. This is separate from paid-customer
membership and from staff operator permissions.

- In paid access mode, `FC_CARE_CHAT_DEMO_EMAIL_HASHES` accepts up to 30
  comma-separated SHA-256 hashes of trimmed, lowercase verified email addresses.
  Configure the approved roster only in the backend environment; do not commit
  personal addresses or their hashes to the repository.
- A team account must still sign in through verified, non-anonymous Supabase
  Auth. Client email fields or claims cannot grant eligibility.
- Team accounts use the same durable wallet, member identifier, monthly cap,
  voice costs, and request limits as other eligible accounts. Demo status does
  not reset an existing wallet or provide unlimited use.
- Do not fabricate paid enrollment rows, receipts or expiry dates for staff.
  Removing a demo hash returns the account to the normal paid-membership check.
- This setting does not add anyone to the staff admin roster, expose other
  customer records, or change LearnWorlds audio permissions.
- Keep the normal release flags closed until the roster and paid rollout are
  ready. This code change alone does not open customer chat.

Staff SOP addendum: Agnes, Gin and Andrine retain their previously approved
operator accounts. Sense and Scott receive chat demonstration eligibility only.
Resolve similar names or additional email addresses with the owner before
adding them. Maintain the real roster in FC's private operational records.
