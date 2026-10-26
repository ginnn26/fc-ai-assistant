-- Fictional fixtures only; rollback leaves no member grants or audit records.
begin;
do $$
declare
 h text:=repeat('9',64); h2 text:=repeat('8',64);
 actor uuid:='12345678-1234-4123-8123-123456789012';
 payload jsonb; result jsonb; until_at timestamptz:=now()+interval '35 days';
 request uuid:=gen_random_uuid();
begin
 if exists(select 1 from care_private.operator_memberships where email_hash in(h,h2))
 or exists(select 1 from care_private.paid_memberships where email_hash in(h,h2))
 or exists(select 1 from care_private.operator_payment_refs where reference_hash=repeat('7',64))
 then raise exception 'fixture_collision'; end if;
 if has_schema_privilege('anon','care_private','USAGE')
 or has_schema_privilege('authenticated','care_private','USAGE')
 or has_function_privilege('anon','public.fc_admin_membership_save(uuid,text,jsonb)','EXECUTE')
 or has_function_privilege('authenticated','public.fc_admin_membership_query(text)','EXECUTE')
 or has_function_privilege('authenticated','public.fc_admin_membership_tasks(integer)','EXECUTE')
 or has_function_privilege('anon','public.fc_chat_paid_membership(text)','EXECUTE')
 then raise exception 'public_access_not_blocked'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='care_private' and c.relname in
 ('paid_memberships','operator_memberships','operator_payment_refs','operator_membership_audit')
 and not c.relrowsecurity) then raise exception 'rls_missing'; end if;
 payload:=jsonb_build_object('email_hash',h,'email_hint','f***@example.com',
 'action','activate','expected_version',0,'request_id',request,
 'plan','monthly','paid_from',now()-interval '1 day','paid_until',until_at,
 'reference_hash',repeat('7',64),'reference_hint','FIX001');
 result:=public.fc_admin_membership_save(actor,'Fictional acceptance',payload);
 if result->'member'->>'chat_active'<>'true' then raise exception 'activation_failed'; end if;
 if public.fc_chat_paid_membership(h)->>'eligible'<>'true'
 or public.fc_chat_paid_membership(h2)->>'eligible'<>'false'
 then raise exception 'member_isolation_failed'; end if;
 result:=public.fc_admin_membership_save(actor,'Fictional acceptance',payload);
 if result->>'replayed'<>'true' then raise exception 'retry_not_idempotent'; end if;
 begin
 perform public.fc_admin_membership_save(actor,'Fictional acceptance',payload||jsonb_build_object('request_id',gen_random_uuid(),'expected_version',0,'action','renew'));
 raise exception 'stale_version_accepted';
 exception when raise_exception then
 if sqlerrm<>'revision_conflict' then raise; end if;
 end;
 begin
 perform public.fc_admin_membership_save(actor,'Fictional acceptance',payload||jsonb_build_object('request_id',gen_random_uuid(),'email_hash',h2));
 raise exception 'duplicate_payment_accepted';
 exception when raise_exception then
 if sqlerrm<>'duplicate_payment_reference' then raise; end if;
 end;
 result:=public.fc_admin_membership_save(actor,'Fictional acceptance',jsonb_build_object('email_hash',h,'action','cancel_at_end','expected_version',1,'request_id',gen_random_uuid()));
 if result->'member'->>'state'<>'nonrenewing'
 or (result->'member'->>'paid_until')::timestamptz<>until_at
 or public.fc_chat_paid_membership(h)->>'eligible'<>'true'
 then raise exception 'cancel_did_not_preserve_paid_term'; end if;
 result:=public.fc_admin_membership_save(actor,'Fictional acceptance',jsonb_build_object('email_hash',h,'action','revoke','expected_version',2,'request_id',gen_random_uuid(),'approval_hash',repeat('6',64)));
 if public.fc_chat_paid_membership(h)->>'eligible'<>'false' then raise exception 'revoke_failed'; end if;
 if jsonb_array_length(public.fc_admin_membership_query(h)->'events')<>3
 then raise exception 'audit_failed'; end if;
end;
$$;
select 'PASS: private permissions, RLS, activation, identity isolation, retry, duplicate receipt, version conflict, paid-through cancellation, revoke and audit' as verification;
rollback;
