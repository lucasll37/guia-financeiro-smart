-- Notifications via triggers for account member invites and responses
-- 1) Create trigger to notify invited user on invite creation
create or replace function public.tr_notify_invited_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_account_name text;
begin
  -- Get account name
  select a.name into v_account_name from public.accounts a where a.id = new.account_id;

  -- Insert notification for the invited user (status will be 'pending' by default)
  insert into public.notifications (user_id, type, message, metadata)
  values (
    new.user_id,
    'invite',
    coalesce(format('Você foi convidado para "%s"', v_account_name), 'Você foi convidado para uma conta'),
    jsonb_build_object(
      'account_id', new.account_id,
      'account_name', v_account_name,
      'invite_id', new.id,
      'invited_by', new.invited_by
    )
  );

  return new;
end;
$$;

-- Drop and recreate trigger to avoid duplicates
drop trigger if exists trg_notify_invited_user on public.account_members;
create trigger trg_notify_invited_user
after insert on public.account_members
for each row execute function public.tr_notify_invited_user();

-- 2) Create trigger to notify inviter when invitee responds (accept/reject)
create or replace function public.tr_notify_inviter_on_response()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_account_name text;
begin
  -- Only act when status changes
  if (new.status is distinct from old.status) then
    select a.name into v_account_name from public.accounts a where a.id = new.account_id;

    insert into public.notifications (user_id, type, message, metadata)
    values (
      new.invited_by,
      'invite',
      case when new.status = 'accepted' then
        coalesce(format('Seu convite para "%s" foi aceito', v_account_name), 'Seu convite foi aceito')
      else
        coalesce(format('Seu convite para "%s" foi recusado', v_account_name), 'Seu convite foi recusado')
      end,
      jsonb_build_object(
        'account_id', new.account_id,
        'account_name', v_account_name,
        'responded_by', new.user_id,
        'status', new.status
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_inviter_on_response on public.account_members;
create trigger trg_notify_inviter_on_response
after update of status on public.account_members
for each row execute function public.tr_notify_inviter_on_response();