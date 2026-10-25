-- PREPARED ONLY. Requires a trusted membership synchronization process before
-- enabling paid mode. No customer data, public ingestion or self-enrollment.
begin;
create table care_private.paid_memberships (
  source text not null check (source in ('learnworlds', 'payment_provider', 'operator_verified')),
  source_record text not null check (length(source_record) between 1 and 256),
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  paid_from timestamptz not null,
  paid_until timestamptz not null,
  verified_until timestamptz not null,
  revoked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (source, source_record),
  check (paid_until > paid_from)
);
create index on care_private.paid_memberships(email_hash);
alter table care_private.paid_memberships enable row level security;
revoke all on care_private.paid_memberships from public, anon, authenticated;

-- Dates are authoritative coverage, not estimated from an email or a payment
-- amount. A scheduled cancellation keeps existing paid-through coverage.
-- verified_until must be renewed by trusted reconciliation. A broken sync must
-- not leave a stale grant active indefinitely. Trials have no qualifying row.
create or replace function public.fc_chat_paid_membership(p_email_hash text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_membership_query';
  end if;
  return jsonb_build_object('eligible', exists (
    select 1 from care_private.paid_memberships
    where email_hash = p_email_hash and not revoked
      and paid_from <= current_timestamp and current_timestamp < paid_until
      and current_timestamp < verified_until
  ));
end;
$$;
revoke all on function public.fc_chat_paid_membership(text) from public, anon, authenticated;
grant execute on function public.fc_chat_paid_membership(text) to service_role;
commit;
