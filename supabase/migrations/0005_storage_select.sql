-- FreiHaus – Bildspeicher: Eigene Dateien müssen sich auch löschen lassen.
-- Fund vom 8.11.2026 beim Test gegen das echte Projekt: storage.remove() lieferte keinen Fehler, löschte aber nichts.
-- Ursache (vermutet): Supabase prüft beim Löschen und beim Überschreiben zusätzlich die SELECT-Regel auf storage.objects;
-- ohne sie sieht der angemeldete Nutzer die eigene Datei für diese Operationen nicht.
-- Öffentliches Lesen über die Bild-Adresse braucht keine Regel (der Bucket ist public) und bleibt unverändert.

create policy "fotos_select_eigener_ordner" on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
