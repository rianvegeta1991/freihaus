-- FreiHaus: Kontaktformular (zweiter Kontaktweg im Impressum, § 5 DDG / DSA Art. 12).
-- Wird NACH 0001_schema.sql eingespielt. Jeder darf schreiben (auch ohne Konto), nur die Moderation liest.

create type public.contact_topic as enum ('frage', 'hinweis', 'datenschutz', 'sonstiges');

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  email      text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200),
  topic      public.contact_topic not null default 'frage',
  body       text not null check (char_length(btrim(body)) between 10 and 3000),
  state      public.report_state not null default 'offen',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null
);
create index contact_messages_open_idx on public.contact_messages (state, created_at);

-- Flut-Bremse ohne IP-Speicherung: je Absenderadresse höchstens 3 Nachrichten am Tag,
-- insgesamt höchstens 40 pro Stunde. Läuft als Definer, weil Besucher die Tabelle nicht lesen dürfen.
create or replace function public.contact_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.email := lower(btrim(new.email));
  new.name  := btrim(new.name);
  new.body  := btrim(new.body);
  if (select count(*) from public.contact_messages
       where email = new.email and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limited: Von dieser Adresse sind heute schon mehrere Nachrichten eingegangen. Bitte versuchen Sie es morgen erneut.';
  end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'rate_limited: Gerade gehen sehr viele Nachrichten ein. Bitte versuchen Sie es später erneut.';
  end if;
  return new;
end;
$$;
create trigger contact_messages_guard before insert on public.contact_messages
  for each row execute function public.contact_guard();

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
revoke all on function public.contact_guard() from anon, authenticated, public;
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;

create policy contact_insert on public.contact_messages for insert to anon, authenticated
  with check (state = 'offen' and decided_at is null and decided_by is null);
create policy contact_select on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
