-- Messagerie privée créateur <-> membre, distincte des tickets d'assistance.
-- Migration additive : aucune table ni donnée existante n'est supprimée.

create table if not exists public.private_conversations (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references public.communities(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  archived_by_creator boolean not null default false,
  archived_by_member boolean not null default false,
  constraint private_conversations_distinct_participants check (creator_id <> member_id),
  constraint private_conversations_unique_pair unique (community_id, creator_id, member_id)
);

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.private_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_at timestamptz
);

create index if not exists private_conversations_creator_idx
  on public.private_conversations (creator_id, last_message_at desc nulls last);
create index if not exists private_conversations_member_idx
  on public.private_conversations (member_id, last_message_at desc nulls last);
create index if not exists private_messages_conversation_created_idx
  on public.private_messages (conversation_id, created_at asc);

create or replace function public.private_messaging_is_authorized_pair(
  p_community_id text,
  p_creator_id uuid,
  p_member_id uuid
) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.communities c
    where c.id = p_community_id
      and c.owner_id = p_creator_id
      and (
        auth.uid() = p_creator_id
        or (
          auth.uid() = p_member_id
          and exists (
            select 1 from public.community_members cm
            where cm.community_id = p_community_id
              and cm.member_id = p_member_id
          )
        )
      )
  );
$$;

create or replace function public.touch_private_conversation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.private_conversations
     set updated_at = new.created_at,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists private_messages_touch_conversation on public.private_messages;
create trigger private_messages_touch_conversation
after insert on public.private_messages
for each row execute function public.touch_private_conversation();

alter table public.private_conversations enable row level security;
alter table public.private_messages enable row level security;

drop policy if exists private_conversations_select_participant on public.private_conversations;
create policy private_conversations_select_participant
on public.private_conversations for select to authenticated
using (auth.uid() = creator_id or auth.uid() = member_id);

drop policy if exists private_conversations_insert_authorized on public.private_conversations;
create policy private_conversations_insert_authorized
on public.private_conversations for insert to authenticated
with check (public.private_messaging_is_authorized_pair(community_id, creator_id, member_id));

drop policy if exists private_conversations_update_participant on public.private_conversations;
create policy private_conversations_update_participant
on public.private_conversations for update to authenticated
using (auth.uid() = creator_id or auth.uid() = member_id)
with check (auth.uid() = creator_id or auth.uid() = member_id);

drop policy if exists private_messages_select_participant on public.private_messages;
create policy private_messages_select_participant
on public.private_messages for select to authenticated
using (exists (
  select 1 from public.private_conversations c
  where c.id = conversation_id
    and (c.creator_id = auth.uid() or c.member_id = auth.uid())
));

drop policy if exists private_messages_insert_participant on public.private_messages;
create policy private_messages_insert_participant
on public.private_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.private_conversations c
    where c.id = conversation_id
      and (c.creator_id = auth.uid() or c.member_id = auth.uid())
  )
);

drop policy if exists private_messages_update_recipient on public.private_messages;
create policy private_messages_update_recipient
on public.private_messages for update to authenticated
using (exists (
  select 1 from public.private_conversations c
  where c.id = conversation_id
    and (c.creator_id = auth.uid() or c.member_id = auth.uid())
))
with check (exists (
  select 1 from public.private_conversations c
  where c.id = conversation_id
    and (c.creator_id = auth.uid() or c.member_id = auth.uid())
));

-- Realtime est ajouté uniquement si la publication existe et si les tables n'y sont pas déjà.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'private_conversations') then
      alter publication supabase_realtime add table public.private_conversations;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'private_messages') then
      alter publication supabase_realtime add table public.private_messages;
    end if;
  end if;
end $$;
