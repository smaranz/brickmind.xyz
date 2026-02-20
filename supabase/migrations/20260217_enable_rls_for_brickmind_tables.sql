alter table public.chat_message enable row level security;
alter table public.brick_collection enable row level security;
alter table public.saved_build enable row level security;
alter table public.scan_history enable row level security;

revoke all on table public.chat_message from anon;
revoke all on table public.brick_collection from anon;
revoke all on table public.saved_build from anon;
revoke all on table public.scan_history from anon;

grant select, insert, update, delete on table public.chat_message to authenticated;
grant select, insert, update, delete on table public.brick_collection to authenticated;
grant select, insert, update, delete on table public.saved_build to authenticated;
grant select, insert, update, delete on table public.scan_history to authenticated;

drop policy if exists chat_message_select_own on public.chat_message;
drop policy if exists chat_message_insert_own on public.chat_message;
drop policy if exists chat_message_update_own on public.chat_message;
drop policy if exists chat_message_delete_own on public.chat_message;

create policy chat_message_select_own
on public.chat_message
for select
to authenticated
using (auth.uid()::text = user_id);

create policy chat_message_insert_own
on public.chat_message
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy chat_message_update_own
on public.chat_message
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy chat_message_delete_own
on public.chat_message
for delete
to authenticated
using (auth.uid()::text = user_id);

drop policy if exists brick_collection_select_own on public.brick_collection;
drop policy if exists brick_collection_insert_own on public.brick_collection;
drop policy if exists brick_collection_update_own on public.brick_collection;
drop policy if exists brick_collection_delete_own on public.brick_collection;

create policy brick_collection_select_own
on public.brick_collection
for select
to authenticated
using (auth.uid()::text = user_id);

create policy brick_collection_insert_own
on public.brick_collection
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy brick_collection_update_own
on public.brick_collection
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy brick_collection_delete_own
on public.brick_collection
for delete
to authenticated
using (auth.uid()::text = user_id);

drop policy if exists saved_build_select_own on public.saved_build;
drop policy if exists saved_build_insert_own on public.saved_build;
drop policy if exists saved_build_update_own on public.saved_build;
drop policy if exists saved_build_delete_own on public.saved_build;

create policy saved_build_select_own
on public.saved_build
for select
to authenticated
using (auth.uid()::text = user_id);

create policy saved_build_insert_own
on public.saved_build
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy saved_build_update_own
on public.saved_build
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy saved_build_delete_own
on public.saved_build
for delete
to authenticated
using (auth.uid()::text = user_id);

drop policy if exists scan_history_select_own on public.scan_history;
drop policy if exists scan_history_insert_own on public.scan_history;
drop policy if exists scan_history_update_own on public.scan_history;
drop policy if exists scan_history_delete_own on public.scan_history;

create policy scan_history_select_own
on public.scan_history
for select
to authenticated
using (auth.uid()::text = user_id);

create policy scan_history_insert_own
on public.scan_history
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy scan_history_update_own
on public.scan_history
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy scan_history_delete_own
on public.scan_history
for delete
to authenticated
using (auth.uid()::text = user_id);
