-- FreiHaus – Mietinserate
-- Ein Inserat ist entweder ein Kauf- oder ein Mietangebot. Bei Miete bedeutet price_eur die
-- monatliche Nettokaltmiete. Die Prüfungen laufen wie beim Kauf in der Datenbank.

create type public.offer_kind as enum ('kauf', 'miete');

alter table public.listings
  add column offer            public.offer_kind not null default 'kauf',
  add column service_costs_eur integer check (service_costs_eur is null or service_costs_eur between 0 and 10000),
  add column deposit_eur       integer check (deposit_eur is null or deposit_eur between 0 and 300000),
  add column available_from    date,
  add column furnished         boolean not null default false;

-- Der alte Preisrahmen galt nur für Kaufpreise.
alter table public.listings drop constraint if exists listings_price_eur_check;
alter table public.listings add constraint listing_preis check (
  (offer = 'kauf'  and price_eur between 1000 and 100000000)
  or (offer = 'miete' and price_eur between 50 and 100000)
);

-- Miete gibt es nur für Häuser und Wohnungen. Die Kaution ist auf drei Nettokaltmieten begrenzt (§ 551 BGB).
alter table public.listings add constraint listing_miete check (
  offer = 'kauf'
  or (type <> 'grundstueck' and (deposit_eur is null or deposit_eur <= 3 * price_eur))
);

-- Mietfelder gehören nur zu Mietinseraten.
alter table public.listings add constraint listing_kauf_ohne_mietfelder check (
  offer = 'miete'
  or (service_costs_eur is null and deposit_eur is null and available_from is null and furnished = false)
);

create index listings_offer_idx on public.listings (offer) where status = 'published';
