-- FreiHaus – Bildspeicher (Supabase Storage)
-- Hinweis: Diese Datei ist NICHT lokal getestet (die Test-Datenbank hat kein Storage-Schema).
-- Nach dem Einspielen im echten Projekt prüfen: Fremde Nutzer dürfen nicht in fremde Ordner schreiben.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lesen: öffentlich (der Bucket ist public; Dateinamen sind nicht erratbar, UUIDs)
-- Schreiben/Löschen: nur im eigenen Ordner "<user-id>/..."
create policy "fotos_insert_eigener_ordner" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos_delete_eigener_ordner" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos_update_eigener_ordner" on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
