-- ---------------------------------------------------------------------------
-- Dynaamiq OS — Schema
--
-- Führendes System für Kunden, Belege und Buchungen. Der Browser hält ab hier
-- nur noch eine Arbeitskopie; die Wahrheit steht in diesen Tabellen.
--
-- Zwei Entwurfsentscheidungen, die man beim Lesen sofort sieht:
--
-- 1. Die Fachdaten liegen als `data jsonb`, nicht als hundert Spalten. Die
--    Anwendung serialisiert ohnehin ganze Datensätze, die Typen in lib/types.ts
--    wachsen wöchentlich, und jede Feldumbenennung wäre sonst eine Migration.
--    Was für Fristen, Sortierung und Eindeutigkeit gebraucht wird, steht
--    zusätzlich als echte Spalte daneben — dort, wo eine Prüfung hinschaut.
--
-- 2. Rechnungen werden nicht überschrieben. Eine versendete Rechnung wandert
--    als unveränderlicher Abzug nach `invoice_records`, jede weitere Änderung
--    in `audit_journal`. Beide Tabellen sind ausschließlich anfügbar — das
--    erzwingt nicht die Anwendung, sondern die Datenbank.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- Arbeitsbestand — je Sammlung eine Tabelle gleichen Zuschnitts
-- --------------------------------------------------------------------------

create table if not exists public.records (
  id          text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  collection  text        not null,
  data        jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, collection, id),
  constraint records_collection_known check (collection in (
    'customers','deals','projects','tasks','invoices','quotes','contracts',
    'templates','emails','transactions','activities','onboardings'
  ))
);

create index if not exists records_user_collection_idx
  on public.records (user_id, collection, updated_at desc);

-- Firmeneinstellungen: genau eine Zeile je Nutzer.
create table if not exists public.settings (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  data        jsonb       not null,
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Festschreibung — der Beleg, wie er das Haus verlassen hat
--
-- Beim Versand wird die Rechnung hier eingefroren. Ab diesem Moment ist nicht
-- mehr der Arbeitsdatensatz die Wahrheit, sondern diese Zeile. Korrekturen
-- laufen ausschließlich über Storno und Neuausstellung.
-- --------------------------------------------------------------------------

create table if not exists public.invoice_records (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  invoice_id   text        not null,
  number       text        not null,
  issue_date   date        not null,
  service_date date,
  customer     jsonb       not null,  -- Anschrift zum Zeitpunkt des Versands
  items        jsonb       not null,
  totals       jsonb       not null,  -- netto, Steuer je Satz, brutto
  document     jsonb       not null,  -- vollständiger Datensatz, wie gedruckt
  pdf_sha256   text,                  -- Prüfsumme des archivierten PDFs
  frozen_at    timestamptz not null default now(),
  -- Eine Rechnungsnummer darf genau einmal festgeschrieben werden. Das ist die
  -- Stelle, an der ein doppelt vergebener Nummernkreis auffliegt — nicht erst
  -- bei der Prüfung.
  constraint invoice_records_number_once unique (user_id, number)
);

create index if not exists invoice_records_user_issue_idx
  on public.invoice_records (user_id, issue_date desc);

-- --------------------------------------------------------------------------
-- Änderungsjournal — fortlaufend, verkettet, nur anfügbar
--
-- Jeder Eintrag trägt die Prüfsumme seines Vorgängers. Wer einen Eintrag
-- entfernt oder verändert, zerreißt die Kette; die Anwendung prüft sie beim
-- Start und meldet die Fundstelle. Das ist der Unterschied zwischen „man
-- könnte etwas ändern" und „eine Änderung bliebe unbemerkt" — und genau
-- Letzteres verlangen die GoBD.
-- --------------------------------------------------------------------------

create table if not exists public.audit_journal (
  seq         bigint      generated always as identity,
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  at          timestamptz not null default now(),
  actor       text        not null,          -- angemeldete Kennung
  action      text        not null,          -- 'freeze' | 'update' | 'cancel' | 'delete' | 'restore'
  collection  text        not null,
  record_id   text        not null,
  summary     text        not null,          -- ein Satz in Klartext, für die Prüfung lesbar
  before      jsonb,
  after       jsonb,
  prev_hash   text        not null,
  hash        text        not null
);

create index if not exists audit_journal_user_seq_idx
  on public.audit_journal (user_id, seq desc);

-- Die Verkettung setzt die Datenbank, nicht der Client. Ein manipulierter
-- Client kann damit keinen Eintrag einhängen, der auf einen erfundenen
-- Vorgänger zeigt.
create or replace function public.audit_journal_chain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_hash text;
begin
  select j.hash into last_hash
    from public.audit_journal j
   where j.user_id = new.user_id
   order by j.seq desc
   limit 1;

  new.prev_hash := coalesce(last_hash, repeat('0', 64));
  new.at        := now();
  new.hash      := encode(digest(
      new.prev_hash
      || new.user_id::text
      || new.at::text
      || new.action
      || new.collection
      || new.record_id
      || coalesce(new.before::text, '')
      || coalesce(new.after::text,  ''),
    'sha256'), 'hex');
  return new;
end;
$$;

drop trigger if exists audit_journal_chain_trg on public.audit_journal;
create trigger audit_journal_chain_trg
  before insert on public.audit_journal
  for each row execute function public.audit_journal_chain();

-- --------------------------------------------------------------------------
-- Zugriff
-- --------------------------------------------------------------------------

alter table public.records         enable row level security;
alter table public.settings        enable row level security;
alter table public.invoice_records enable row level security;
alter table public.audit_journal   enable row level security;

-- Arbeitsbestand: der eigene Bestand, vollständig beweglich.
create policy records_own on public.records
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy settings_own on public.settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Festgeschriebene Belege und Journal: lesen und anfügen. Für UPDATE und
-- DELETE gibt es bewusst keine Richtlinie — ohne Richtlinie verweigert
-- Postgres den Zugriff. Zusätzlich werden die Rechte entzogen, damit auch eine
-- versehentlich später ergänzte Richtlinie nichts aufreißt.
create policy invoice_records_read on public.invoice_records
  for select to authenticated using (user_id = auth.uid());
create policy invoice_records_append on public.invoice_records
  for insert to authenticated with check (user_id = auth.uid());

create policy audit_journal_read on public.audit_journal
  for select to authenticated using (user_id = auth.uid());
create policy audit_journal_append on public.audit_journal
  for insert to authenticated with check (user_id = auth.uid());

revoke update, delete on public.invoice_records from authenticated, anon;
revoke update, delete on public.audit_journal   from authenticated, anon;
