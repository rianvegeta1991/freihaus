-- FreiHaus – Datenbankschema v1
-- Grundsatz: Alles ist per Row-Level-Security (RLS) abgesichert. Der Browser darf nur, was hier
-- ausdrücklich erlaubt ist. Kontaktdaten und Hausnummer liegen in einer eigenen Tabelle und
-- kommen nur über reveal_contact() heraus (Login + Rate-Limit).

-- ---------------------------------------------------------------- Typen
create type public.property_type  as enum ('haus', 'wohnung', 'grundstueck');
create type public.listing_status as enum ('draft', 'pending', 'published', 'paused', 'sold', 'expired', 'blocked');
create type public.energy_state   as enum ('vorhanden', 'folgt', 'nicht_erforderlich');
create type public.energy_kind    as enum ('bedarf', 'verbrauch');
create type public.contact_mode   as enum ('nachricht', 'login_email', 'login_telefon');
create type public.report_reason  as enum ('betrug', 'falsche_angaben', 'urheberrecht', 'makler', 'unzulaessig', 'sonstiges');
create type public.report_state   as enum ('offen', 'entschieden');

-- ---------------------------------------------------------------- Profile
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text not null default '' check (char_length(display_name) <= 60),
  phone          text check (phone is null or char_length(phone) between 6 and 25),
  phone_verified boolean not null default false,
  role           text not null default 'user' check (role in ('user', 'admin')),
  trust_level    integer not null default 0 check (trust_level between 0 and 3),
  created_at     timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nutzer dürfen Rolle, Vertrauensstufe und Telefon-Bestätigung nicht selbst ändern.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role           := old.role;
    new.trust_level    := old.trust_level;
    new.phone_verified := old.phone_verified;
    new.created_at     := old.created_at;
    if new.phone is distinct from old.phone then
      new.phone_verified := false;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------- Inserate
create table public.listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  status         public.listing_status not null default 'draft',
  type           public.property_type not null,
  title          text not null check (char_length(title) between 10 and 100),
  description    text not null check (char_length(description) between 50 and 5000),
  postal_code    text not null check (postal_code ~ '^[0-9]{5}$'),
  city           text not null check (char_length(city) between 2 and 80),
  district       text check (district is null or char_length(district) <= 80),
  street         text check (street is null or char_length(street) <= 100),
  lat            double precision check (lat between -90 and 90),
  lon            double precision check (lon between -180 and 180),
  price_eur      integer not null check (price_eur between 1000 and 100000000),
  living_area_m2 numeric(8, 2) check (living_area_m2 > 0 and living_area_m2 <= 100000),
  plot_area_m2   numeric(10, 2) check (plot_area_m2 > 0),
  rooms          numeric(4, 1) check (rooms between 1 and 50),
  year_built     integer check (year_built between 1000 and 2100),
  -- Energieausweis (Pflichtangaben in Anzeigen, § 87 GEG bzw. Nachfolgeregelung – vor Livegang gegenprüfen)
  energy_state   public.energy_state,
  energy_kind    public.energy_kind,
  energy_value   numeric(7, 1) check (energy_value >= 0 and energy_value <= 2000),
  energy_carrier text check (energy_carrier is null or char_length(energy_carrier) between 2 and 60),
  energy_class   text check (energy_class in ('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H')),
  contact_mode   public.contact_mode not null default 'nachricht',
  address_verified boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  published_at   timestamptz,
  expires_at     timestamptz,

  -- Sobald ein Inserat mehr als Entwurf ist, müssen die Pflichtangaben vollständig sein.
  constraint listing_pflichtangaben check (
    status in ('draft', 'blocked')
    or type = 'grundstueck'
    or (
      living_area_m2 is not null
      and energy_state is not null
      and (
        energy_state <> 'vorhanden'
        or (energy_kind is not null and energy_value is not null and energy_carrier is not null
            and energy_class is not null and year_built is not null)
      )
    )
  )
);

create index listings_status_pub_idx on public.listings (status, published_at desc);
create index listings_plz_idx        on public.listings (postal_code) where status = 'published';
create index listings_city_idx       on public.listings (lower(city)) where status = 'published';
create index listings_owner_idx      on public.listings (owner_id);

-- Nicht öffentliche Angaben: Hausnummer und Kontaktdaten
create table public.listing_private (
  listing_id    uuid primary key references public.listings (id) on delete cascade,
  house_no      text check (house_no is null or char_length(house_no) <= 10),
  contact_email text check (contact_email is null or contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  contact_phone text check (contact_phone is null or char_length(contact_phone) between 6 and 25)
);

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique,
  position     integer not null default 0 check (position between 0 and 14),
  alt          text check (alt is null or char_length(alt) <= 200),
  created_at   timestamptz not null default now(),
  unique (listing_id, position)
);

-- Regeln für Statuswechsel, Vertrauensstufen, Fristen
create or replace function public.listings_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid        uuid := auth.uid();
  is_adm     boolean := false;
  trust      integer;
  n          integer;
begin
  if uid is not null then is_adm := public.is_admin(); end if;
  select trust_level into trust from public.profiles where id = new.owner_id;
  trust := coalesce(trust, 0);

  if tg_op = 'INSERT' then
    if uid is not null and not is_adm then
      new.status := 'draft';
      new.published_at := null;
      new.expires_at := null;
      new.address_verified := false;
      if trust < 1 then
        select count(*) into n from public.listings
          where owner_id = new.owner_id and created_at > now() - interval '24 hours';
        if n >= 3 then
          raise exception 'rate_limited: Neue Konten dürfen höchstens 3 Inserate pro 24 Stunden anlegen.';
        end if;
      end if;
    end if;
    return new;
  end if;

  -- UPDATE
  new.updated_at := now();
  if uid is not null and not is_adm then
    new.owner_id         := old.owner_id;
    new.created_at       := old.created_at;
    new.published_at     := old.published_at;
    new.expires_at       := old.expires_at;
    new.address_verified := old.address_verified;

    if new.status <> old.status then
      if not (
           (old.status = 'draft'     and new.status = 'pending')
        or (old.status = 'pending'   and new.status = 'draft')
        or (old.status = 'published' and new.status in ('paused', 'sold'))
        or (old.status = 'paused'    and new.status in ('pending', 'sold'))
        or (old.status = 'expired'   and new.status = 'pending')
      ) then
        raise exception 'status_not_allowed: % -> % ist nicht erlaubt.', old.status, new.status;
      end if;
    end if;
  end if;

  if new.status in ('pending', 'published') and old.status not in ('pending', 'published') then
    select count(*) into n from public.listing_photos where listing_id = new.id;
    if n < 3 then
      raise exception 'photos_missing: Mindestens 3 Fotos sind nötig (vorhanden: %).', n;
    end if;
    -- Vertrauenswürdige Konten werden direkt veröffentlicht, neue Konten erst nach Prüfung.
    if new.status = 'pending' and uid is not null and not is_adm and trust >= 1 then
      new.status := 'published';
    end if;
  end if;

  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(old.published_at, now());
    new.expires_at   := now() + interval '90 days';
    if old.status = 'pending' and (uid is null or is_adm) then
      update public.profiles set trust_level = greatest(trust_level, 1) where id = new.owner_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_guard_trg before insert or update on public.listings
  for each row execute function public.listings_guard();

-- Öffentliches Mini-Profil des Inserenten (nur Vorname-Teil, Mitgliedsdatum, Telefon bestätigt)
create view public.public_profiles as
  select p.id,
         nullif(split_part(p.display_name, ' ', 1), '') as first_name,
         p.created_at as member_since,
         p.phone_verified
    from public.profiles p
   where exists (
     select 1 from public.listings l
      where l.owner_id = p.id and l.status = 'published' and l.expires_at > now()
   );

-- ---------------------------------------------------------------- Nachrichten, Merkliste, Kontaktaufrufe
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 5 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index messages_listing_idx on public.messages (listing_id, created_at desc);

create or replace function public.messages_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer; trust integer; max_n integer;
begin
  select trust_level into trust from public.profiles where id = new.sender_id;
  select count(*) into n from public.messages
    where sender_id = new.sender_id and created_at > now() - interval '24 hours';
  max_n := case when coalesce(trust, 0) < 1 then 10 else 30 end;
  if n >= max_n then
    raise exception 'rate_limited: Zu viele Nachrichten in 24 Stunden.';
  end if;
  return new;
end;
$$;
create trigger messages_guard_trg before insert on public.messages
  for each row execute function public.messages_guard();

create table public.saved_listings (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.contact_views (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewed_at  timestamptz not null default now()
);
create index contact_views_user_idx on public.contact_views (user_id, viewed_at desc);

-- ---------------------------------------------------------------- Meldungen und Moderation (DSA Art. 16/17)
create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings (id) on delete cascade,
  reporter_id    uuid references public.profiles (id) on delete set null,
  reporter_name  text check (reporter_name is null or char_length(reporter_name) <= 100),
  reporter_email text check (reporter_email is null or reporter_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  reason         public.report_reason not null,
  details        text not null check (char_length(details) between 10 and 2000),
  state          public.report_state not null default 'offen',
  decision       text check (decision is null or char_length(decision) <= 2000),
  created_at     timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     uuid references public.profiles (id) on delete set null
);
create index reports_open_idx on public.reports (state, created_at);

create table public.moderation_log (
  id          bigint generated always as identity primary key,
  listing_id  uuid references public.listings (id) on delete set null,
  user_id     uuid references public.profiles (id) on delete set null,   -- betroffener Inserent
  action      text not null check (action in ('freigeben', 'sperren', 'zurueckweisen')),
  reason_code text not null check (reason_code in ('freigabe', 'betrug', 'falsche_angaben', 'urheberrecht', 'makler', 'unzulaessig', 'sonstiges')),
  reason_text text not null check (char_length(reason_text) <= 2000),
  report_id   uuid references public.reports (id) on delete set null,
  actor       uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Moderation läuft immer über diese Funktion: Statuswechsel + Begründung (Art. 17) in einem Schritt.
create or replace function public.moderate_listing(
  p_listing uuid, p_action text, p_reason_code text, p_reason_text text, p_report uuid default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid; new_status public.listing_status;
begin
  if not public.is_admin() then
    raise exception 'forbidden: Nur für Moderatoren.';
  end if;
  new_status := case p_action
    when 'freigeben'     then 'published'
    when 'sperren'       then 'blocked'
    when 'zurueckweisen' then 'draft'
  end;
  if new_status is null then raise exception 'invalid_action'; end if;
  if p_action <> 'freigeben' and char_length(coalesce(p_reason_text, '')) < 10 then
    raise exception 'reason_required: Eine Begründung ist Pflicht (DSA Art. 17).';
  end if;
  update public.listings set status = new_status where id = p_listing returning owner_id into owner;
  if owner is null then raise exception 'not_found'; end if;
  insert into public.moderation_log (listing_id, user_id, action, reason_code, reason_text, report_id, actor)
    values (p_listing, owner, p_action, p_reason_code, coalesce(p_reason_text, ''), p_report, auth.uid());
  if p_report is not null then
    update public.reports set state = 'entschieden', decision = left(p_reason_text, 2000),
           decided_at = now(), decided_by = auth.uid() where id = p_report;
  end if;
end;
$$;

-- Kontaktdaten: nur eingeloggt, höchstens 30 Aufrufe pro 24 Stunden, nur bei veröffentlichten Inseraten.
-- Die Hausnummer bekommt nur der Inserent selbst (über die Tabelle), nie diese Funktion.
create or replace function public.reveal_contact(p_listing uuid)
returns table (mode public.contact_mode, email text, phone text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); n integer; l public.listings; p public.listing_private;
begin
  if uid is null then raise exception 'login_required: Bitte melden Sie sich an.'; end if;
  select * into l from public.listings
    where id = p_listing and status = 'published' and expires_at > now();
  if not found then raise exception 'not_found'; end if;
  select count(*) into n from public.contact_views
    where user_id = uid and viewed_at > now() - interval '24 hours';
  if n >= 30 then raise exception 'rate_limited: Zu viele Kontaktaufrufe in 24 Stunden.'; end if;
  insert into public.contact_views (user_id, listing_id) values (uid, p_listing);
  select * into p from public.listing_private where listing_id = p_listing;
  return query select l.contact_mode,
                      case when l.contact_mode in ('login_email', 'login_telefon') then p.contact_email end,
                      case when l.contact_mode = 'login_telefon' then p.contact_phone end;
end;
$$;

-- ---------------------------------------------------------------- Rechte und RLS
alter table public.profiles        enable row level security;
alter table public.listings        enable row level security;
alter table public.listing_private enable row level security;
alter table public.listing_photos  enable row level security;
alter table public.messages        enable row level security;
alter table public.saved_listings  enable row level security;
alter table public.contact_views   enable row level security;
alter table public.reports         enable row level security;
alter table public.moderation_log  enable row level security;

-- Grundsatz: erst alles entziehen, dann gezielt vergeben.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

grant select on public.listings, public.listing_photos, public.public_profiles to anon, authenticated;
grant insert, update, delete on public.listings, public.listing_photos to authenticated;
grant select, insert, update on public.listing_private to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant select, insert, delete on public.saved_listings to authenticated;
grant select on public.contact_views to authenticated;
grant insert on public.reports to anon, authenticated;
grant select, update on public.reports to authenticated;
grant select on public.moderation_log to authenticated;

grant execute on function public.is_admin()                                  to anon, authenticated;
grant execute on function public.reveal_contact(uuid)                        to authenticated;
grant execute on function public.moderate_listing(uuid, text, text, text, uuid) to authenticated;

-- Profile
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Inserate: öffentlich nur veröffentlicht und nicht abgelaufen
create policy listings_select on public.listings for select to anon, authenticated
  using (
    (status = 'published' and expires_at > now())
    or owner_id = auth.uid()
    or public.is_admin()
  );
create policy listings_insert on public.listings for insert to authenticated
  with check (owner_id = auth.uid() or public.is_admin());
create policy listings_update on public.listings for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy listings_delete on public.listings for delete to authenticated
  using ((owner_id = auth.uid() and status in ('draft', 'pending')) or public.is_admin());

-- Private Angaben: nur Inserent und Moderation
create policy lp_select on public.listing_private for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())));
create policy lp_insert on public.listing_private for insert to authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy lp_update on public.listing_private for update to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

-- Fotos: sichtbar, wenn das Inserat sichtbar ist (die Unterabfrage unterliegt selbst der RLS)
create policy photos_select on public.listing_photos for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy photos_write on public.listing_photos for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())));

-- Nachrichten: schreiben an veröffentlichte Inserate (nicht an eigene), lesen Absender/Inserent/Moderation
create policy msg_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.listings l
                 where l.id = listing_id and l.status = 'published' and l.owner_id <> auth.uid())
  );
create policy msg_select on public.messages for select to authenticated
  using (
    sender_id = auth.uid()
    or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
    or public.is_admin()
  );
create policy msg_update on public.messages for update to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

-- Merkliste
create policy saved_all on public.saved_listings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Kontaktaufrufe: nur Moderation liest
create policy cv_select on public.contact_views for select to authenticated using (public.is_admin());

-- Meldungen: jeder darf melden (auch ohne Konto), nur Moderation liest und entscheidet
create policy reports_insert on public.reports for insert to anon, authenticated
  with check (state = 'offen' and decision is null and decided_by is null
              and (reporter_id is null or reporter_id = auth.uid()));
create policy reports_select on public.reports for select to authenticated using (public.is_admin());
create policy reports_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Moderationslog: Moderation sieht alles, Inserenten sehen die Begründungen zu ihren eigenen Inseraten
create policy ml_select on public.moderation_log for select to authenticated
  using (public.is_admin() or user_id = auth.uid());
