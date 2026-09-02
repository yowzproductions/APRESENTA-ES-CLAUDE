-- Anexos passam a poder ser vinculados a uma etapa específica do caso
alter table attachments add column stage text;

-- Bucket de armazenamento para os arquivos anexados por etapa (ex.: laudo
-- de vistoria). Privado — leitura/escrita só para usuários autenticados.
insert into storage.buckets (id, name, public)
values ('case-attachments', 'case-attachments', false)
on conflict (id) do nothing;

create policy "authenticated_upload_case_attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'case-attachments');

create policy "authenticated_read_case_attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'case-attachments');
