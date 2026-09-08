-- ============================================================
-- EHub — Supabase Schema v1
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  prenom        text not null,
  initiale      text default '',
  role          text not null default 'eleve'
                check (role in ('eleve','enseignant','enseignant_guest','admin')),
  -- Elèves seulement
  classe_id     uuid references classes(id) on delete set null,
  section       text,
  entreprise_id uuid references entreprises(id) on delete set null,
  created_at    timestamptz default now()
);

-- ── CLASSES ──────────────────────────────────────────────────
create table classes (
  id         uuid primary key default uuid_generate_v4(),
  label      text not null,
  section    text not null check (section in ('BTS','3CN','2TPCM')),
  annee      text not null default '2025/2026',
  created_at timestamptz default now()
);

-- ── ENTREPRISES ──────────────────────────────────────────────
create table entreprises (
  id         uuid primary key default uuid_generate_v4(),
  nom        text not null,
  classe_id  uuid references classes(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── ENSEIGNANT ↔ CLASSES (many-to-many) ──────────────────────
create table enseignant_classes (
  enseignant_id uuid references profiles(id) on delete cascade,
  classe_id     uuid references classes(id) on delete cascade,
  primary key (enseignant_id, classe_id)
);

-- ── ENSEIGNANT ↔ ENTREPRISES (many-to-many) ──────────────────
create table enseignant_entreprises (
  enseignant_id  uuid references profiles(id) on delete cascade,
  entreprise_id  uuid references entreprises(id) on delete cascade,
  primary key (enseignant_id, entreprise_id)
);

-- ── CHAPITRES ────────────────────────────────────────────────
create table chapitres (
  id             uuid primary key default uuid_generate_v4(),
  titre_fr       text not null,
  titre_en       text default '',
  emoji          text default '📖',
  description_fr text default '',
  description_en text default '',
  ordre          integer not null default 0,
  filieres       text[] default array['BTS','3CN','2TPCM'],
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── SECTIONS DE COURS ────────────────────────────────────────
create table sections_cours (
  id         uuid primary key default uuid_generate_v4(),
  chapitre_id uuid not null references chapitres(id) on delete cascade,
  titre_fr   text not null,
  titre_en   text default '',
  type       text not null default 'definition'
             check (type in ('definition','exemple','formule','liste','activite','editeur')),
  contenu    jsonb default '{}',
  ordre      integer not null default 0,
  filieres   text[] default array['BTS','3CN','2TPCM'],
  asset_url  text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── EXERCICES ────────────────────────────────────────────────
create table exercices (
  id          uuid primary key default uuid_generate_v4(),
  section_id  uuid references sections_cours(id) on delete cascade,
  chapitre_id uuid references chapitres(id) on delete cascade,
  titre       text not null,
  type        text not null
              check (type in ('libre','qcm','ordre','glisser_deposer','vrai_faux')),
  enonce      text not null,
  options     jsonb default '[]',   -- choix pour QCM, items pour ordre/glisser
  correction  jsonb not null,       -- réponse(s) correcte(s)
  points      integer default 1,
  ordre       integer default 0,
  filieres    text[] default array['BTS','3CN','2TPCM'],
  created_at  timestamptz default now()
);

-- ── RÉSULTATS EXERCICES ──────────────────────────────────────
create table resultats (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references profiles(id) on delete cascade,
  exercice_id  uuid references exercices(id) on delete cascade,
  reponse      jsonb,
  score        integer default 0,
  max_score    integer default 1,
  created_at   timestamptz default now(),
  unique (user_id, exercice_id)   -- 1 résultat par élève par exercice
);

-- ── MISSIONS ─────────────────────────────────────────────────
create table missions (
  id          uuid primary key default uuid_generate_v4(),
  titre       text not null,
  description text default '',
  deadline    date,
  classe_id   uuid references classes(id) on delete cascade,
  sections    text[] default array[]::text[],
  statut      text default 'new' check (statut in ('new','done')),
  fichier_url text,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);

-- ── RENDUS ───────────────────────────────────────────────────
create table rendus (
  id          uuid primary key default uuid_generate_v4(),
  mission_id  uuid references missions(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  commentaire text,
  fichier_url text,
  created_at  timestamptz default now(),
  unique (mission_id, user_id)
);

-- ── ACTUALITÉS ───────────────────────────────────────────────
create table actualites (
  id             uuid primary key default uuid_generate_v4(),
  titre          text not null,
  description    text default '',
  date_affichee  text default '',
  classe_ids     text[] default array[]::text[],
  ordre          integer default 0,
  created_by     uuid references profiles(id),
  created_at     timestamptz default now()
);

-- ── CALENDRIER ───────────────────────────────────────────────
create table calendrier (
  id         uuid primary key default uuid_generate_v4(),
  jour       integer not null,
  mois       text not null,
  titre      text not null,
  sous_titre text default '',
  tag        text default 'event' check (tag in ('deadline','event','atelier')),
  classe_ids text[] default array[]::text[],
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ── BACKUPS CONTENU ──────────────────────────────────────────
create table content_backups (
  id           uuid primary key default uuid_generate_v4(),
  chapitre_id  uuid references chapitres(id) on delete set null,
  label        text default '',        -- ex: "avant suppression section X"
  snapshot     jsonb not null,         -- copie complète du chapitre + sections
  created_by   uuid references profiles(id),
  created_at   timestamptz default now()
);

-- ── ESPACE ÉQUIPE : MESSAGES ─────────────────────────────────
create table espace_messages (
  id            uuid primary key default uuid_generate_v4(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  contenu       text not null,
  created_at    timestamptz default now()
);

-- ── ESPACE ÉQUIPE : FICHIERS ──────────────────────────────────
create table espace_fichiers (
  id            uuid primary key default uuid_generate_v4(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  nom           text not null,
  chemin        text not null,   -- storage path: "<entreprise_id>/<fichier>"
  taille        integer,
  created_at    timestamptz default now()
);

-- ── INDEXES ──────────────────────────────────────────────────
create index on sections_cours(chapitre_id);
create index on sections_cours(ordre);
create index on chapitres(ordre);
create index on exercices(section_id);
create index on resultats(user_id);
create index on resultats(exercice_id);
create index on rendus(mission_id);
create index on rendus(user_id);
create index on enseignant_classes(enseignant_id);
create index on enseignant_entreprises(enseignant_id);
create index on espace_messages(entreprise_id);
create index on espace_fichiers(entreprise_id);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger chapitres_updated_at
  before update on chapitres
  for each row execute function update_updated_at();

create trigger sections_updated_at
  before update on sections_cours
  for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table profiles            enable row level security;
alter table classes             enable row level security;
alter table entreprises         enable row level security;
alter table enseignant_classes  enable row level security;
alter table enseignant_entreprises enable row level security;
alter table chapitres           enable row level security;
alter table sections_cours      enable row level security;
alter table espace_messages     enable row level security;
alter table espace_fichiers     enable row level security;
alter table exercices           enable row level security;
alter table resultats           enable row level security;
alter table missions            enable row level security;
alter table rendus              enable row level security;
alter table actualites          enable row level security;
alter table calendrier          enable row level security;
alter table content_backups     enable row level security;

-- Lecture publique du contenu pédagogique (cours, exercices)
-- (protégé côté app par le check de connexion)
-- NB : chapitres/sections_cours avaient RLS DÉSACTIVÉ en prod depuis le début du développement
-- (accès direct à l'API Supabase possible pour n'importe qui avec la clé anon, sans passer par
-- l'app). Réactivé le 2026-08-20. À la même occasion, deux policies historiques en doublon —
-- "chapitres_staff_write"/"sections_staff_write", qui testaient le rôle via un
-- `exists (select 1 from profiles ...)` direct au lieu de `my_role()` (le pattern qui causait la
-- récursion RLS documentée plus haut) — ont été supprimées ; "chapitres_edit"/"sections_edit"
-- (my_role(), voir plus bas) suffisent déjà pour l'accès enseignant/admin.
create policy "cours_public_read" on chapitres
  for select using (true);

create policy "sections_public_read" on sections_cours
  for select using (true);

create policy "exercices_public_read" on exercices
  for select using (true);

-- Fonction SECURITY DEFINER : évite la récursion infinie RLS quand une
-- policy doit lire le rôle de l'utilisateur courant dans profiles
-- (une sous-requête directe sur profiles redéclenche la policy elle-même).
create or replace function my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid()
$$;

-- Profils : chacun voit le sien, admin voit tout
create policy "profiles_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_admin" on profiles
  for all using (my_role() = 'admin');

-- Coéquipiers : nécessaire pour afficher prénom/initiale des autres membres
-- de la même entreprise (chat, liste de fichiers de l'Espace Équipe).
create or replace function my_entreprise_id()
returns uuid
language sql
security definer
stable
as $$
  select entreprise_id from profiles where id = auth.uid()
$$;

create policy "profiles_teammates" on profiles
  for select using (my_role() in ('enseignant','admin') or entreprise_id = my_entreprise_id());

-- Enseignants/admin : écriture sur chapitres et sections
create policy "chapitres_edit" on chapitres
  for all using (my_role() in ('enseignant','admin'));

create policy "sections_edit" on sections_cours
  for all using (my_role() in ('enseignant','admin'));

-- Exercices (Sprint 3, 2026-08-20) : lecture publique déjà en place (exercices_public_read),
-- écriture enseignant/admin
create policy "exercices_edit" on exercices
  for all using (my_role() in ('enseignant','admin'));

-- Résultats : élève voit les siens, enseignant voit sa classe
create policy "resultats_own" on resultats
  for select using (auth.uid() = user_id);

create policy "resultats_insert" on resultats
  for insert with check (auth.uid() = user_id);

create policy "resultats_enseignant" on resultats
  for select using (my_role() in ('enseignant','enseignant_guest','admin'));

-- Notation manuelle des réponses libres par l'enseignant (Sprint 3, 2026-08-20)
create policy "resultats_grade_staff" on resultats
  for update using (my_role() in ('enseignant','admin'));

-- Backups : enseignants/admin seulement
create policy "backups_staff" on content_backups
  for all using (my_role() in ('enseignant','admin'));

-- Classes / entreprises : lecture publique, écriture staff
-- (ces tables avaient RLS activé sans AUCUNE policy — verrouillées pour tout le monde,
-- corrigé le 2026-08-03 lors de la construction de l'interface admin)
create policy "classes_read" on classes
  for select using (true);
create policy "classes_write" on classes
  for all using (my_role() = 'admin');

create policy "entreprises_read" on entreprises
  for select using (true);
create policy "entreprises_write" on entreprises
  for all using (my_role() in ('enseignant','admin'));

-- Actualités / calendrier : écriture staff (lecture déjà publique, cf. plus haut)
create policy "actualites_write" on actualites
  for all using (my_role() in ('enseignant','admin'));
create policy "calendrier_write" on calendrier
  for all using (my_role() in ('enseignant','admin'));

-- ── STORAGE : IMAGES DE CONTENU (éditeur TipTap) ─────────────
insert into storage.buckets (id, name, public)
  values ('content-images', 'content-images', true)
  on conflict (id) do nothing;

create policy "content_images_read" on storage.objects
  for select using (bucket_id = 'content-images');

create policy "content_images_write" on storage.objects
  for insert with check (bucket_id = 'content-images' and my_role() in ('enseignant','admin'));

create policy "content_images_update" on storage.objects
  for update using (bucket_id = 'content-images' and my_role() in ('enseignant','admin'));

create policy "content_images_delete" on storage.objects
  for delete using (bucket_id = 'content-images' and my_role() in ('enseignant','admin'));

-- ── ESPACE ÉQUIPE : ACCÈS ─────────────────────────────────────
-- Peut accéder à l'espace d'une entreprise : admin, élève assigné à cette
-- entreprise, ou enseignant lié à cette entreprise via enseignant_entreprises.
create or replace function can_access_entreprise(target_entreprise_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    my_role() = 'admin'
    or exists (select 1 from profiles where id = auth.uid() and entreprise_id = target_entreprise_id)
    or exists (
      select 1 from enseignant_entreprises
      where enseignant_id = auth.uid() and entreprise_id = target_entreprise_id
    )
$$;

create policy "espace_messages_select" on espace_messages
  for select using (can_access_entreprise(entreprise_id));
create policy "espace_messages_insert" on espace_messages
  for insert with check (can_access_entreprise(entreprise_id) and user_id = auth.uid());
create policy "espace_messages_delete" on espace_messages
  for delete using (user_id = auth.uid() or my_role() = 'admin');

create policy "espace_fichiers_select" on espace_fichiers
  for select using (can_access_entreprise(entreprise_id));
create policy "espace_fichiers_insert" on espace_fichiers
  for insert with check (can_access_entreprise(entreprise_id) and user_id = auth.uid());
create policy "espace_fichiers_delete" on espace_fichiers
  for delete using (user_id = auth.uid() or my_role() = 'admin');

-- Storage privé : chemin "<entreprise_id>/<fichier>", accès via can_access_entreprise()
insert into storage.buckets (id, name, public)
  values ('espace-fichiers', 'espace-fichiers', false)
  on conflict (id) do nothing;

create policy "espace_fichiers_storage_select" on storage.objects
  for select using (
    bucket_id = 'espace-fichiers'
    and can_access_entreprise(((storage.foldername(name))[1])::uuid)
  );
create policy "espace_fichiers_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'espace-fichiers'
    and can_access_entreprise(((storage.foldername(name))[1])::uuid)
  );
create policy "espace_fichiers_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'espace-fichiers'
    and (owner = auth.uid() or my_role() = 'admin')
  );

-- Realtime pour le chat (messages instantanés sans rechargement)
do $do$ begin
  alter publication supabase_realtime add table espace_messages;
exception when duplicate_object then null;
end $do$;

-- ── MISSIONS (Sprint 2, 2026-08-19) ───────────────────────────
-- missions/rendus avaient RLS activé sans AUCUNE policy (comme classes/entreprises
-- avant le 2026-08-03) — verrouillés pour tout le monde. Corrigé ici, en même temps
-- qu'une mission peut désormais cibler soit une classe, soit une entreprise.
alter table missions add column if not exists entreprise_id uuid references entreprises(id) on delete cascade;

create or replace function my_classe_id()
returns uuid
language sql
security definer
stable
as $$
  select classe_id from profiles where id = auth.uid()
$$;

-- Missions : lecture pour la classe/entreprise ciblée + staff, écriture staff
create policy "missions_read" on missions
  for select using (
    my_role() in ('enseignant','admin')
    or (classe_id is not null and classe_id = my_classe_id())
    or (entreprise_id is not null and can_access_entreprise(entreprise_id))
  );
create policy "missions_write" on missions
  for all using (my_role() in ('enseignant','admin'));

-- Rendus : élève voit/gère uniquement les siens, staff voit tout
create policy "rendus_select" on rendus
  for select using (auth.uid() = user_id or my_role() in ('enseignant','admin'));
create policy "rendus_insert" on rendus
  for insert with check (auth.uid() = user_id);
create policy "rendus_update" on rendus
  for update using (auth.uid() = user_id);
create policy "rendus_delete" on rendus
  for delete using (auth.uid() = user_id or my_role() in ('enseignant','admin'));

-- Storage privé : chemin "<mission_id>/consigne/<fichier>" (pièce jointe enseignant)
-- ou "<mission_id>/<user_id>/<fichier>" (rendu élève)
insert into storage.buckets (id, name, public)
  values ('missions-fichiers', 'missions-fichiers', false)
  on conflict (id) do nothing;

create policy "missions_fichiers_select" on storage.objects
  for select using (
    bucket_id = 'missions-fichiers'
    and (
      my_role() in ('enseignant','admin')
      or (storage.foldername(name))[2] = 'consigne'
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );
create policy "missions_fichiers_insert" on storage.objects
  for insert with check (
    bucket_id = 'missions-fichiers'
    and (
      ((storage.foldername(name))[2] = 'consigne' and my_role() in ('enseignant','admin'))
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );
create policy "missions_fichiers_delete" on storage.objects
  for delete using (
    bucket_id = 'missions-fichiers'
    and (owner = auth.uid() or my_role() in ('enseignant','admin'))
  );

-- ── HALL OF FAME (2026-08-20) ──────────────────────────────────
-- Présente/honore les meilleures entreprises d'entraînement. Lecture publique (comme les
-- actualités), écriture réservée enseignant/admin.
create table hall_of_fame (
  id          uuid primary key default uuid_generate_v4(),
  titre       text not null,
  description text default '',
  annee       text default '',
  distinction text default '',
  image_url   text,
  fichiers    jsonb default '[]',   -- [{ nom, chemin }] fichiers téléchargeables
  ordre       integer default 0,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);
alter table hall_of_fame enable row level security;

create policy "hof_read" on hall_of_fame
  for select using (true);
create policy "hof_write" on hall_of_fame
  for all using (my_role() in ('enseignant','admin'));

-- Storage public (comme content-images) : image + fichiers téléchargeables par entrée
insert into storage.buckets (id, name, public)
  values ('hall-of-fame', 'hall-of-fame', true)
  on conflict (id) do nothing;

create policy "hof_storage_read" on storage.objects
  for select using (bucket_id = 'hall-of-fame');
create policy "hof_storage_write" on storage.objects
  for insert with check (bucket_id = 'hall-of-fame' and my_role() in ('enseignant','admin'));
create policy "hof_storage_update" on storage.objects
  for update using (bucket_id = 'hall-of-fame' and my_role() in ('enseignant','admin'));
create policy "hof_storage_delete" on storage.objects
  for delete using (bucket_id = 'hall-of-fame' and my_role() in ('enseignant','admin'));

-- ── SELF-REGISTRATION + VALIDATION (2026-08-20) ────────────────
-- Comptes créés par les utilisateurs eux-mêmes (avant : uniquement via l'admin, cf.
-- Edge Function create-user). Chaque inscription publique reste "en_attente" tant qu'un
-- enseignant/admin ne l'a pas validée.
alter table profiles add column if not exists statut text not null default 'actif'
  check (statut in ('en_attente','actif'));
alter table profiles add column if not exists demande_enseignant_id uuid references profiles(id);

-- Garde-fou défense-en-profondeur (le trigger ci-dessous, en SECURITY DEFINER, contourne
-- de toute façon RLS — cette policy protège contre un futur insert client direct)
create policy "profiles_self_insert" on profiles
  for insert with check (
    auth.uid() = id and role in ('eleve','enseignant','enseignant_guest') and statut = 'en_attente'
  );

create policy "profiles_approve_staff" on profiles
  for update using (my_role() in ('enseignant','admin'));

create policy "profiles_reject_staff" on profiles
  for delete using (my_role() in ('enseignant','admin') and statut = 'en_attente');

-- Noms des enseignants visibles publiquement (nécessaire pour le dropdown "enseignant de la
-- classe" sur le formulaire d'inscription, affiché avant connexion)
create policy "profiles_teachers_public" on profiles
  for select using (role in ('enseignant','enseignant_guest'));

-- enseignant_classes avait RLS activé sans AUCUNE policy — verrouillé pour tout le monde
-- (même bug que classes/entreprises/missions/chapitres, corrigés précédemment)
create policy "enseignant_classes_read" on enseignant_classes
  for select using (true);
create policy "enseignant_classes_write" on enseignant_classes
  for all using (my_role() = 'admin');

-- Crée automatiquement le profil "en_attente" à l'inscription publique. SECURITY DEFINER
-- pour contourner RLS (l'utilisateur n'a pas encore de session au moment du trigger si la
-- confirmation email est activée). Le rôle est revalidé ici (jamais 'admin' même si le
-- client envoie autre chose dans les métadonnées) — seule protection réelle contre une
-- auto-élévation de privilège, les métadonnées de signUp() étant entièrement contrôlées
-- par le client.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.raw_user_meta_data->>'signup_source' = 'self' then
    insert into public.profiles (id, prenom, role, classe_id, demande_enseignant_id, statut)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'prenom', ''), split_part(new.email, '@', 1)),
      case when new.raw_user_meta_data->>'role' in ('eleve','enseignant','enseignant_guest')
           then new.raw_user_meta_data->>'role' else 'eleve' end,
      nullif(new.raw_user_meta_data->>'classe_id', '')::uuid,
      nullif(new.raw_user_meta_data->>'demande_enseignant_id', '')::uuid,
      'en_attente'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── DURCHGÄNGIGE FREIGABE-SPERRE (2026-08-22) ──────────────────
-- Vorher war "en_attente" nur ein UI-Gate (App.jsx) — ein technisch versierter gesperrter
-- Nutzer konnte über direkte API-Calls trotzdem schreiben (oder als enseignant/admin lesen/
-- schreiben), solange seine Rolle es sonst erlaubt hätte. Jetzt RLS-seitig durchgesetzt:
create or replace function is_active()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select statut = 'actif' from profiles where id = auth.uid()), false)
$$;

-- my_role() liefert jetzt NULL für gesperrte Accounts — das macht automatisch JEDE Policy
-- der Form "my_role() in (...)" bzw. "my_role() = '...'" für sie unwirksam (NULL ist in SQL
-- weder wahr noch falsch), ohne dass jede einzelne Policy angefasst werden muss. Betrifft u. a.
-- chapitres_edit, sections_edit, exercices_edit, missions_write, resultats_grade_staff,
-- resultats_enseignant, backups_staff, classes_write, entreprises_write, actualites_write,
-- calendrier_write, content_images_*, hof_write, hof_storage_*, profiles_admin,
-- profiles_approve_staff, profiles_reject_staff, enseignant_classes_write.
create or replace function my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid() and statut = 'actif'
$$;

-- can_access_entreprise() : Élève/enseignant-Zweig ebenfalls auf aktive Accounts beschränken
-- (Admin-Zweig ist über my_role() bereits automatisch mit abgedeckt)
create or replace function can_access_entreprise(target_entreprise_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    my_role() = 'admin'
    or (is_active() and exists (select 1 from profiles where id = auth.uid() and entreprise_id = target_entreprise_id))
    or (is_active() and exists (
      select 1 from enseignant_entreprises
      where enseignant_id = auth.uid() and entreprise_id = target_entreprise_id
    ))
$$;

-- Eigen-Schreib-Policies ohne my_role()-Bezug (Élève schreibt für sich selbst) — hier muss
-- is_active() explizit ergänzt werden, da my_role() dort gar nicht verwendet wird.
alter policy "resultats_insert" on resultats with check (auth.uid() = user_id and is_active());
alter policy "rendus_insert" on rendus with check (auth.uid() = user_id and is_active());
alter policy "rendus_update" on rendus using (auth.uid() = user_id and is_active());

drop policy if exists "missions_fichiers_insert" on storage.objects;
create policy "missions_fichiers_insert" on storage.objects
  for insert with check (
    bucket_id = 'missions-fichiers'
    and (
      ((storage.foldername(name))[2] = 'consigne' and my_role() in ('enseignant','admin'))
      or ((storage.foldername(name))[2] = auth.uid()::text and is_active())
    )
  );

-- ── EXERCICES V2 : BLOCS, PARAMÈTRES, NOUVEAUX TYPES, TENTATIVES (2026-08-22) ──
-- resultats bleibt unangetastet (weiterhin exklusiv für 'libre', manuell benotet).
-- Alle auto-korrigierten Typen (die 4 bestehenden + 5 neue) schreiben ab jetzt in ein
-- Append-only Versuchs-Log statt in resultats.

create table exercice_blocks (
  id          uuid primary key default uuid_generate_v4(),
  section_id  uuid references sections_cours(id) on delete cascade,
  chapitre_id uuid references chapitres(id) on delete cascade,
  titre       text not null,
  description jsonb default '{}',   -- { html: '...' }, même forme que sections_cours
  ordre       integer not null default 0,
  filieres    text[] default array['BTS','3CN','2TPCM'],
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index on exercice_blocks(section_id);

alter table exercices add column if not exists block_id uuid references exercice_blocks(id) on delete set null;
alter table exercices add column if not exists parametres jsonb not null default '{}';
alter table exercices add column if not exists updated_at timestamptz default now();
create index on exercices(block_id);

alter table exercices drop constraint exercices_type_check;
alter table exercices add constraint exercices_type_check check (type in (
  'libre','qcm','vrai_faux','ordre','glisser_deposer',
  'choix_unique','reponse_courte','reponse_numerique','categorisation','tableau_calcul'
));

create trigger exercices_updated_at
  before update on exercices for each row execute function update_updated_at();
create trigger exercice_blocks_updated_at
  before update on exercice_blocks for each row execute function update_updated_at();

-- Tentatives : journal append-only, une ligne par tentative (PAS de unique(user,exercice))
create table exercice_tentatives (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  exercice_id  uuid not null references exercices(id) on delete cascade,
  numero       integer not null,           -- calculé par trigger, jamais envoyé par le client
  reponse      jsonb not null,
  correcte     boolean not null,
  score        integer not null default 0,
  max_score    integer not null default 1,
  detail       jsonb default '{}',         -- feedback par champ/item (tableau_calcul, categorisation)
  created_at   timestamptz default now(),
  unique (user_id, exercice_id, numero)
);
create index on exercice_tentatives(user_id, exercice_id);
create index on exercice_tentatives(exercice_id);

create or replace function set_tentative_numero()
returns trigger as $$
begin
  select coalesce(max(numero), 0) + 1 into new.numero
  from exercice_tentatives
  where user_id = new.user_id and exercice_id = new.exercice_id;
  return new;
end;
$$ language plpgsql;

create trigger tentatives_numero
  before insert on exercice_tentatives
  for each row execute function set_tentative_numero();

-- Progression : résumé dénormalisé par (élève, exercice), maintenu par trigger
create table exercice_progression (
  user_id                   uuid not null references profiles(id) on delete cascade,
  exercice_id               uuid not null references exercices(id) on delete cascade,
  tentatives_total          integer not null default 0,
  resolu                    boolean not null default false,
  tentatives_avant_reussite integer,
  dernier_score             integer,
  dernier_max_score         integer,
  premiere_tentative_at     timestamptz,
  derniere_tentative_at     timestamptz,
  primary key (user_id, exercice_id)
);
create index on exercice_progression(exercice_id);

create or replace function upsert_exercice_progression()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into exercice_progression (
    user_id, exercice_id, tentatives_total, resolu, tentatives_avant_reussite,
    dernier_score, dernier_max_score, premiere_tentative_at, derniere_tentative_at
  )
  values (
    new.user_id, new.exercice_id, 1, new.correcte,
    case when new.correcte then new.numero else null end,
    new.score, new.max_score, new.created_at, new.created_at
  )
  on conflict (user_id, exercice_id) do update set
    tentatives_total          = exercice_progression.tentatives_total + 1,
    resolu                    = exercice_progression.resolu or new.correcte,
    tentatives_avant_reussite = coalesce(exercice_progression.tentatives_avant_reussite,
                                          case when new.correcte then new.numero else null end),
    dernier_score             = new.score,
    dernier_max_score         = new.max_score,
    derniere_tentative_at     = new.created_at;
  return new;
end;
$$;

create trigger tentatives_progression_upsert
  after insert on exercice_tentatives
  for each row execute function upsert_exercice_progression();

-- RLS
alter table exercice_blocks      enable row level security;
alter table exercice_tentatives  enable row level security;
alter table exercice_progression enable row level security;

create policy "exercice_blocks_read" on exercice_blocks for select using (true);
create policy "exercice_blocks_edit" on exercice_blocks for all using (my_role() in ('enseignant','admin'));

create policy "tentatives_own_select" on exercice_tentatives
  for select using (auth.uid() = user_id);
create policy "tentatives_own_insert" on exercice_tentatives
  for insert with check (auth.uid() = user_id and is_active());
-- Pas d'update/delete côté élève (historique immuable), pas de policy staff insert/update.

create policy "tentatives_staff_select" on exercice_tentatives
  for select using (
    my_role() = 'admin'
    or (my_role() in ('enseignant','enseignant_guest') and exists (
      select 1 from profiles p
      join enseignant_classes ec on ec.classe_id = p.classe_id
      where p.id = exercice_tentatives.user_id and ec.enseignant_id = auth.uid()
    ))
  );

create policy "progression_own_select" on exercice_progression
  for select using (auth.uid() = user_id);
create policy "progression_staff_select" on exercice_progression
  for select using (
    my_role() = 'admin'
    or (my_role() in ('enseignant','enseignant_guest') and exists (
      select 1 from profiles p
      join enseignant_classes ec on ec.classe_id = p.classe_id
      where p.id = exercice_progression.user_id and ec.enseignant_id = auth.uid()
    ))
  );
-- exercice_progression hat KEINE insert/update-Policy: nur der SECURITY DEFINER-Trigger schreibt.

-- ── ACTUALITÉS / CALENDRIER : PIÈCES JOINTES (2026-08-23) ──────
-- Réutilise le bucket "content-images" existant (public, sans restriction MIME, déjà
-- gouverné par les policies content_images_* : écriture réservée à enseignant/admin).
alter table actualites add column if not exists fichiers jsonb not null default '[]';
alter table calendrier add column if not exists fichiers jsonb not null default '[]';

-- ── SECTIONS DE COURS : BAUSTEINE PRO SEKTION "BLOCS" (2026-08-23) ─────
-- definition/exemple/formule/liste werden zu Bausteinen innerhalb eines neuen
-- Sektionstyps 'blocs' (mehrere Inhaltstypen pro Seite kombinierbar). activite/editeur
-- bleiben unverändert eigene Sektionstypen. Vor dem Lauf wurde für jedes betroffene
-- Kapitel ein Backup über backupChapitre()/content_backups angelegt.
alter table sections_cours drop constraint sections_cours_type_check;

update sections_cours
set type = 'blocs',
    contenu = jsonb_build_object('blocks', jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', type,
        'html', case when type in ('definition','exemple') then coalesce(contenu->>'fr', '') else null end,
        'items', case when type in ('formule','liste') then coalesce(contenu->'fr', '[]'::jsonb) else null end
      )
    ))
where type in ('definition','exemple','formule','liste');

alter table sections_cours add constraint sections_cours_type_check
  check (type in ('blocs','activite','editeur'));

-- ── LYCÉES : VORARBEIT MULTI-LYCÉE (2026-08-23) ─────────────────
-- Un seul lycée existe pour l'instant (LNB). Prépare la structure (classes.lycee_id)
-- et le filtre Actualités/Calendrier par section + lycée, sans isolation RLS pour
-- l'instant — celle-ci ne sera nécessaire que si un 2e lycée utilise réellement la
-- plateforme (cf. discussion).
create table lycees (
  id         uuid primary key default uuid_generate_v4(),
  nom        text not null,
  created_at timestamptz default now()
);
insert into lycees (nom) values ('LNB');

alter table lycees enable row level security;
create policy "lycees_read" on lycees
  for select using (true);
create policy "lycees_write" on lycees
  for all using (my_role() = 'admin');

alter table classes add column if not exists lycee_id uuid references lycees(id) on delete set null;
update classes set lycee_id = (select id from lycees where nom = 'LNB') where lycee_id is null;

-- filieres : même convention que chapitres/sections_cours/exercices (liste explicite,
-- par défaut toutes cochées = visible à toutes les sections).
-- lycee_ids : défaut '{}' au niveau colonne, mais backfillé ci-dessous à "tous les
-- lycées existants" pour que le contenu existant reste visible partout après migration.
alter table actualites add column if not exists filieres text[] not null default array['BTS','3CN','2TPCM'];
alter table actualites add column if not exists lycee_ids uuid[] not null default '{}';
alter table calendrier add column if not exists filieres text[] not null default array['BTS','3CN','2TPCM'];
alter table calendrier add column if not exists lycee_ids uuid[] not null default '{}';

update actualites set lycee_ids = (select array_agg(id) from lycees) where lycee_ids = '{}';
update calendrier set lycee_ids = (select array_agg(id) from lycees) where lycee_ids = '{}';

-- ── PROFILES : LYCÉE À L'INSCRIPTION (2026-08-23) ───────────────
-- Un enseignant/enseignant_guest n'a pas de classe_id unique (il gère plusieurs classes
-- via enseignant_classes) : profiles.lycee_id lui sert de valeur directe. Pour un élève,
-- classes.lycee_id (dérivé de sa classe) reste la source normale — profiles.lycee_id agit
-- comme repli explicite, même principe que profiles.section / classes.section
-- (cf. AuthContext.jsx : lyceeId = profile.lycee_id || profile.classe.lycee_id).
alter table profiles add column if not exists lycee_id uuid references lycees(id) on delete set null;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.raw_user_meta_data->>'signup_source' = 'self' then
    insert into public.profiles (id, prenom, role, classe_id, lycee_id, demande_enseignant_id, statut)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'prenom', ''), split_part(new.email, '@', 1)),
      case when new.raw_user_meta_data->>'role' in ('eleve','enseignant','enseignant_guest')
           then new.raw_user_meta_data->>'role' else 'eleve' end,
      nullif(new.raw_user_meta_data->>'classe_id', '')::uuid,
      nullif(new.raw_user_meta_data->>'lycee_id', '')::uuid,
      nullif(new.raw_user_meta_data->>'demande_enseignant_id', '')::uuid,
      'en_attente'
    );
  end if;
  return new;
end;
$$;

-- ── PARAMÈTRES DU SITE (2026-08-23) ─────────────────────────────
-- Table singleton (une seule ligne) pour le nom/sous-titre affichés en haut à gauche
-- (NavBar.jsx), modifiables par l'admin sans toucher au code.
create table app_settings (
  id         uuid primary key default uuid_generate_v4(),
  nom_site   text not null default 'EHub',
  sous_titre text not null default 'Économie de Gestion',
  updated_at timestamptz default now()
);
insert into app_settings (nom_site, sous_titre) values ('EHub', 'Économie de Gestion');

alter table app_settings enable row level security;
create policy "app_settings_read" on app_settings
  for select using (true);
create policy "app_settings_write" on app_settings
  for all using (my_role() = 'admin');

-- ── ESPACE ÉQUIPE : DOSSIERS (2026-08-23) ───────────────────────
-- Organisation hiérarchique des fichiers par équipe. Le stockage reste plat
-- (chemin toujours "<entreprise_id>/<fichier>", policies storage inchangées) —
-- dossier_id n'est qu'un regroupement logique côté base de données.
create table espace_dossiers (
  id            uuid primary key default uuid_generate_v4(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  parent_id     uuid references espace_dossiers(id) on delete cascade,
  nom           text not null,
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);
create index on espace_dossiers(entreprise_id);
create index on espace_dossiers(parent_id);

alter table espace_fichiers add column if not exists dossier_id uuid references espace_dossiers(id) on delete set null;

alter table espace_dossiers enable row level security;
create policy "espace_dossiers_select" on espace_dossiers
  for select using (can_access_entreprise(entreprise_id));
create policy "espace_dossiers_insert" on espace_dossiers
  for insert with check (can_access_entreprise(entreprise_id) and created_by = auth.uid());
create policy "espace_dossiers_delete" on espace_dossiers
  for delete using (created_by = auth.uid() or my_role() = 'admin');

-- ── INFOS : PAGES D'INFORMATION (JEL, GEN-E, etc.) (2026-08-23) ─
-- Sept sections fixes (identifiées par "cle"), chacune avec un contenu en "blocs"
-- (même format que sections_cours.type='blocs' — texte/définition/exemple/formule/liste).
-- Pas d'exercices ici, donc pas besoin de chapitres/sections imbriquées : une seule table.
create table infos_sections (
  id         uuid primary key default uuid_generate_v4(),
  cle        text unique not null,
  titre      text not null,
  contenu    jsonb not null default '{"blocks": []}',
  updated_at timestamptz default now()
);

insert into infos_sections (cle, titre) values
  ('general', 'Général'),
  ('jel', 'JEL'),
  ('entreprises_entrainement', 'Entreprises d''entraînement'),
  ('mini_entreprises', 'Mini-entreprises'),
  ('startup_program', 'Start-up Program'),
  ('gene', 'GEN-E'),
  ('liens_utiles', 'Liens utiles');

alter table infos_sections enable row level security;
create policy "infos_sections_read" on infos_sections
  for select using (true);
create policy "infos_sections_write" on infos_sections
  for all using (my_role() in ('enseignant','admin'));

-- ── ENTREPRISES : PRÉSENTATION PUBLIQUE (2026-08-23) ────────────
-- Logo, description, catalogue téléchargeable, lien site web — éditable par les élèves
-- membres de l'entreprise eux-mêmes (via can_access_entreprise, même règle que
-- l'espace équipe), pas seulement enseignant/admin, pour qu'ils présentent leur
-- entreprise aux autres classes. Table séparée de "entreprises" (nom/classe_id restent
-- staff-only) pour ne pas avoir à faire de la restriction RLS colonne par colonne.
create table entreprises_profil (
  entreprise_id    uuid primary key references entreprises(id) on delete cascade,
  logo_chemin      text,
  description      text default '',
  catalogue_nom    text,
  catalogue_chemin text,
  site_web         text default '',
  updated_at       timestamptz default now()
);

alter table entreprises_profil enable row level security;
create policy "entreprises_profil_read" on entreprises_profil
  for select using (true);
create policy "entreprises_profil_write" on entreprises_profil
  for all using (can_access_entreprise(entreprise_id));

-- Bucket public dédié (logo/catalogue doivent être visibles par tous, contrairement à
-- espace-fichiers qui est privé à l'équipe) — chemin "<entreprise_id>/<fichier>".
insert into storage.buckets (id, name, public)
  values ('entreprises-assets', 'entreprises-assets', true)
  on conflict (id) do nothing;

create policy "entreprises_assets_read" on storage.objects
  for select using (bucket_id = 'entreprises-assets');
create policy "entreprises_assets_write" on storage.objects
  for insert with check (
    bucket_id = 'entreprises-assets'
    and can_access_entreprise(((storage.foldername(name))[1])::uuid)
  );
create policy "entreprises_assets_update" on storage.objects
  for update using (
    bucket_id = 'entreprises-assets'
    and can_access_entreprise(((storage.foldername(name))[1])::uuid)
  );
create policy "entreprises_assets_delete" on storage.objects
  for delete using (
    bucket_id = 'entreprises-assets'
    and can_access_entreprise(((storage.foldername(name))[1])::uuid)
  );

-- ── PROFILES : EMAIL (2026-08-23) ───────────────────────────────
-- Nécessaire pour la fonctionnalité "listes de diffusion" côté admin — le client
-- n'a pas accès à auth.users (RLS), donc on duplique l'email dans profiles à
-- l'inscription (trigger self-signup) et à la création admin (edge function create-user).
-- Déjà couvert par les policies existantes (profiles_admin, profiles_teammates) : aucune
-- nouvelle policy RLS nécessaire.
alter table profiles add column if not exists email text;
update profiles set email = u.email from auth.users u where u.id = profiles.id and profiles.email is null;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.raw_user_meta_data->>'signup_source' = 'self' then
    insert into public.profiles (id, prenom, role, classe_id, lycee_id, demande_enseignant_id, statut, email)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'prenom', ''), split_part(new.email, '@', 1)),
      case when new.raw_user_meta_data->>'role' in ('eleve','enseignant','enseignant_guest')
           then new.raw_user_meta_data->>'role' else 'eleve' end,
      nullif(new.raw_user_meta_data->>'classe_id', '')::uuid,
      nullif(new.raw_user_meta_data->>'lycee_id', '')::uuid,
      nullif(new.raw_user_meta_data->>'demande_enseignant_id', '')::uuid,
      'en_attente',
      new.email
    );
  end if;
  return new;
end;
$$;

-- ── STORAGE : VIDÉOS DE CONTENU (éditeur TipTap + blocs de section) (2026-08-24) ──
-- Même modèle que "content-images" : bucket public, écriture réservée au staff.
-- Limite de taille + types MIME pour éviter les uploads abusifs (les liens YouTube/Vimeo
-- ne passent pas par ce bucket, seul l'upload de fichier l'utilise).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('content-videos', 'content-videos', true, 209715200, array['video/mp4','video/webm','video/ogg'])
  on conflict (id) do nothing;

create policy "content_videos_read" on storage.objects
  for select using (bucket_id = 'content-videos');

create policy "content_videos_write" on storage.objects
  for insert with check (bucket_id = 'content-videos' and my_role() in ('enseignant','admin'));

create policy "content_videos_update" on storage.objects
  for update using (bucket_id = 'content-videos' and my_role() in ('enseignant','admin'));

create policy "content_videos_delete" on storage.objects
  for delete using (bucket_id = 'content-videos' and my_role() in ('enseignant','admin'));

-- ── EXERCICES : TYPE "JOURNAL" (écriture comptable à trous) (2026-08-26) ──
-- Élève complète un journal (n° de compte, débit, crédit) pour une écriture donnée.
-- Voir src/lib/exerciceCorrection.js pour la correction (comptes + montants, partiel par ligne).
alter table exercices drop constraint exercices_type_check;
alter table exercices add constraint exercices_type_check check (type in (
  'libre','qcm','vrai_faux','ordre','glisser_deposer',
  'choix_unique','reponse_courte','reponse_numerique','categorisation','tableau_calcul','journal'
));

-- ── MATIÈRES & FILIÈRES CONFIGURABLES (2026-09-07) ──────────────
-- Jusqu'ici EHub ne portait qu'UNE seule matière implicite ("Économie de Gestion") et les
-- filières élèves (BTS/3CN/2TPCM) étaient figées en dur (check constraint + 9 endroits dans le
-- frontend). Objectif : l'admin peut désormais créer de nouvelles matières (chacune un espace
-- cloisonné : chapitres/missions/résultats propres, un enseignant doit être explicitement
-- affecté à une matière pour l'éditer) et de nouvelles filières (avec couleur libre), sans
-- toucher au code.

-- MATIÈRES ------------------------------------------------------
create table matieres (
  id         uuid primary key default uuid_generate_v4(),
  nom        text not null,
  emoji      text default '📘',
  ordre      integer not null default 0,
  created_at timestamptz default now()
);
insert into matieres (nom, emoji, ordre) values ('Économie de Gestion', '💼', 0);

alter table matieres enable row level security;
create policy "matieres_read" on matieres for select using (true);
create policy "matieres_write" on matieres for all using (my_role() = 'admin');

-- Enseignant ↔ Matière (many-to-many, même principe que enseignant_classes/enseignant_entreprises).
-- Peut aussi contenir des lignes 'enseignant_guest' (consultation des résultats), pas seulement
-- 'enseignant' (édition) — cf. can_edit_matiere() vs can_view_matiere() plus bas.
create table enseignant_matieres (
  enseignant_id uuid references profiles(id) on delete cascade,
  matiere_id    uuid references matieres(id) on delete cascade,
  primary key (enseignant_id, matiere_id)
);
create index on enseignant_matieres(enseignant_id);

alter table enseignant_matieres enable row level security;
create policy "enseignant_matieres_read" on enseignant_matieres for select using (true);
create policy "enseignant_matieres_write" on enseignant_matieres for all using (my_role() = 'admin');

-- Édition de contenu/missions d'une matière : admin, ou enseignant (pas guest) affecté à celle-ci.
create or replace function can_edit_matiere(target_matiere_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select my_role() = 'admin'
    or (my_role() = 'enseignant' and exists (
      select 1 from enseignant_matieres
      where enseignant_id = auth.uid() and matiere_id = target_matiere_id
    ))
$$;

-- Lecture des résultats d'une matière : admin, ou enseignant/enseignant_guest affecté à celle-ci
-- (même périmètre que resultats_enseignant/tentatives_staff_select avant cette migration, qui
-- laissaient déjà passer enseignant_guest en lecture).
create or replace function can_view_matiere(target_matiere_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select my_role() = 'admin'
    or (my_role() in ('enseignant','enseignant_guest') and exists (
      select 1 from enseignant_matieres
      where enseignant_id = auth.uid() and matiere_id = target_matiere_id
    ))
$$;

-- chapitres/missions rattachés à une matière (pas nullable — tout contenu existant est
-- rattaché à "Économie de Gestion" avant de poser le NOT NULL).
alter table chapitres add column if not exists matiere_id uuid references matieres(id);
update chapitres set matiere_id = (select id from matieres where nom = 'Économie de Gestion')
  where matiere_id is null;
alter table chapitres alter column matiere_id set not null;
create index on chapitres(matiere_id);

alter table missions add column if not exists matiere_id uuid references matieres(id);
update missions set matiere_id = (select id from matieres where nom = 'Économie de Gestion')
  where matiere_id is null;
alter table missions alter column matiere_id set not null;
create index on missions(matiere_id);

-- Policies d'écriture : remplacent "n'importe quel enseignant" par "enseignant affecté à CETTE
-- matière" (sections_cours/exercices/exercice_blocks n'ont pas de matiere_id direct, on remonte
-- via leur chapitre_id).
drop policy "chapitres_edit" on chapitres;
create policy "chapitres_edit" on chapitres
  for all using (can_edit_matiere(matiere_id));

drop policy "sections_edit" on sections_cours;
create policy "sections_edit" on sections_cours
  for all using (
    exists (select 1 from chapitres c where c.id = sections_cours.chapitre_id and can_edit_matiere(c.matiere_id))
  );

drop policy "exercices_edit" on exercices;
create policy "exercices_edit" on exercices
  for all using (
    exists (select 1 from chapitres c where c.id = exercices.chapitre_id and can_edit_matiere(c.matiere_id))
  );

drop policy "exercice_blocks_edit" on exercice_blocks;
create policy "exercice_blocks_edit" on exercice_blocks
  for all using (
    exists (select 1 from chapitres c where c.id = exercice_blocks.chapitre_id and can_edit_matiere(c.matiere_id))
  );

drop policy "missions_write" on missions;
create policy "missions_write" on missions
  for all using (can_edit_matiere(matiere_id));

-- Policies de lecture staff : avant cette migration, N'IMPORTE QUEL enseignant/enseignant_guest
-- voyait les résultats de TOUTES les matières pour les classes qu'il encadre. Désormais limité
-- aux matières auxquelles il est affecté (enseignant_matieres).
drop policy "resultats_enseignant" on resultats;
create policy "resultats_enseignant" on resultats
  for select using (
    my_role() = 'admin'
    or exists (
      select 1 from exercices e join chapitres c on c.id = e.chapitre_id
      where e.id = resultats.exercice_id and can_view_matiere(c.matiere_id)
    )
  );

drop policy "tentatives_staff_select" on exercice_tentatives;
create policy "tentatives_staff_select" on exercice_tentatives
  for select using (
    my_role() = 'admin'
    or (
      exists (
        select 1 from profiles p
        join enseignant_classes ec on ec.classe_id = p.classe_id
        where p.id = exercice_tentatives.user_id and ec.enseignant_id = auth.uid()
      )
      and exists (
        select 1 from exercices e join chapitres c on c.id = e.chapitre_id
        where e.id = exercice_tentatives.exercice_id and can_view_matiere(c.matiere_id)
      )
    )
  );

drop policy "progression_staff_select" on exercice_progression;
create policy "progression_staff_select" on exercice_progression
  for select using (
    my_role() = 'admin'
    or (
      exists (
        select 1 from profiles p
        join enseignant_classes ec on ec.classe_id = p.classe_id
        where p.id = exercice_progression.user_id and ec.enseignant_id = auth.uid()
      )
      and exists (
        select 1 from exercices e join chapitres c on c.id = e.chapitre_id
        where e.id = exercice_progression.exercice_id and can_view_matiere(c.matiere_id)
      )
    )
  );

-- FILIÈRES --------------------------------------------------------
-- Remplace le check constraint figé sur classes.section par une table gérable en admin.
-- "code" reste la valeur stockée telle quelle dans classes.section et dans tous les tableaux
-- filieres text[] existants (chapitres/sections_cours/exercices/exercice_blocks/actualites/
-- calendrier) — pas de migration de ces colonnes, seule la LISTE des codes valides devient
-- dynamique.
create table filieres (
  id         uuid primary key default uuid_generate_v4(),
  code       text unique not null,
  label      text not null,
  couleur    text not null default '#1B2A6B',
  ordre      integer not null default 0,
  created_at timestamptz default now()
);
insert into filieres (code, label, couleur, ordre) values
  ('BTS',   'BTS',   '#F5A623', 0),
  ('3CN',   '3CN',   '#4CAF50', 1),
  ('2TPCM', '2TPCM', '#1B2A6B', 2);

alter table filieres enable row level security;
create policy "filieres_read" on filieres for select using (true);
create policy "filieres_write" on filieres for all using (my_role() = 'admin');

alter table classes drop constraint classes_section_check;
alter table classes add constraint classes_section_fkey foreign key (section) references filieres(code);

-- ── ENSEIGNANT_MATIERES : NIVEAU LECTURE/ÉCRITURE PAR AFFECTATION (2026-09-07) ──
-- Un enseignant peut avoir des classes dans plusieurs sections/matières à la fois ; certains
-- ne doivent avoir qu'un accès lecture sur une matière (ex. suivi de résultats) et écriture
-- sur une autre. Le niveau est donc porté par la ligne enseignant_matieres elle-même, pas par
-- le rôle global du profil. Le rôle 'enseignant_guest' reste un plafond global lecture-seule
-- (can_edit_matiere l'exclut explicitement, quel que soit "niveau") — ce n'est changé qu'en
-- fonction de nouveaux besoins fins pour le rôle 'enseignant'.
alter table enseignant_matieres add column if not exists niveau text not null default 'ecriture'
  check (niveau in ('lecture', 'ecriture'));

create or replace function can_edit_matiere(target_matiere_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select my_role() = 'admin'
    or (my_role() = 'enseignant' and exists (
      select 1 from enseignant_matieres
      where enseignant_id = auth.uid() and matiere_id = target_matiere_id and niveau = 'ecriture'
    ))
$$;

-- can_view_matiere : toute affectation (lecture OU écriture) donne l'accès en lecture —
-- inchangé dans son comportement, recréée ici uniquement pour rester à côté de can_edit_matiere.
create or replace function can_view_matiere(target_matiere_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select my_role() = 'admin'
    or (my_role() in ('enseignant','enseignant_guest') and exists (
      select 1 from enseignant_matieres
      where enseignant_id = auth.uid() and matiere_id = target_matiere_id
    ))
$$;

-- ── PROFILES : SECTIONS ASSIGNÉES POUR LES ENSEIGNANTS (2026-09-07) ─────────
-- Un enseignant peut être scopé à une ou plusieurs filières (ex. ne gère que les classes BTS) :
-- il ne voit alors plus, dans Cours, que les sections de cours taguées pour SES filières — même
-- mécanisme de filtrage que profiles.section pour les élèves, mais multi-valué. Tableau vide
-- (défaut) = aucune restriction, comportement historique inchangé pour tous les comptes
-- enseignant existants. Comme les autres colonnes filieres text[] du projet, ce filtrage est géré
-- côté app (PostgREST expose ces tables en lecture publique) et non par RLS.
alter table profiles add column if not exists filieres text[] not null default '{}';

-- ── SÉCURITÉ : PROFILES_APPROVE_STAFF TROP LARGE (2026-09-07) ──────────────
-- "profiles_approve_staff" (for update using (my_role() in ('enseignant','admin'))) n'avait
-- AUCUNE autre restriction : un enseignant pouvait, via un appel direct à l'API REST (hors de
-- l'app), modifier N'IMPORTE QUEL champ de N'IMPORTE QUEL profil — y compris se nommer
-- lui-même "admin". Remplacée par deux policies précises :
--  1. "profiles_approve_pending" : ne permet plus que la transition en_attente -> actif, sans
--     jamais pouvoir aboutir à role = 'admin' (usage prévu : valider une inscription).
--  2. "profiles_teacher_manage_students" : permet à un enseignant de gérer ses propres élèves
--     (ex. affectation à une entreprise dans ClasseDetail.jsx), limité aux élèves des classes où
--     il est enregistré via enseignant_classes — ce que "profiles_approve_staff" couvrait déjà
--     de facto (sans le vouloir), pour ne pas casser cette fonctionnalité existante.
drop policy "profiles_approve_staff" on profiles;

create policy "profiles_approve_pending" on profiles
  for update using (
    my_role() in ('enseignant','admin') and statut = 'en_attente'
  )
  with check (
    statut = 'actif' and role in ('eleve','enseignant','enseignant_guest')
  );

create policy "profiles_teacher_manage_students" on profiles
  for update using (
    my_role() = 'enseignant' and role = 'eleve'
    and exists (select 1 from enseignant_classes ec where ec.enseignant_id = auth.uid() and ec.classe_id = profiles.classe_id)
  )
  with check (
    role = 'eleve'
    and exists (select 1 from enseignant_classes ec where ec.enseignant_id = auth.uid() and ec.classe_id = profiles.classe_id)
  );

-- ── SÉCURITÉ : FUITE DE DONNÉES VIA "PROFILES_TEACHERS_PUBLIC" (2026-09-07) ─
-- Cette policy (role in ('enseignant','enseignant_guest')) devait seulement permettre
-- l'embed "enseignant:profiles(id, prenom, initiale)" utilisé par SignupModal.jsx (formulaire
-- d'inscription, avant connexion). Problème découvert en testant les policies ci-dessus : une
-- policy RLS restreint les LIGNES visibles, pas les COLONNES — n'importe quel visiteur non
-- connecté pouvait donc appeler l'API REST avec select=* et récupérer la fiche COMPLÈTE de
-- chaque enseignant (email réel, classe_id, lycee_id, filieres, statut...), pas seulement
-- prénom/initiale. Corrigé au niveau colonne (GRANT), sous la RLS : le rôle Postgres "anon"
-- (visiteur non connecté) ne peut plus lire que id/prenom/initiale/role sur profiles, quelle que
-- soit la requête envoyée. Les utilisateurs connectés (rôle "authenticated") ne sont pas
-- affectés — leur accès reste régi par les policies RLS habituelles (profiles_own,
-- profiles_admin, profiles_teammates, etc.).
revoke select on public.profiles from anon;
grant select (id, prenom, initiale, role) on public.profiles to anon;

-- ── CHAPITRES : PLUSIEURS MATIÈRES PAR CHAPITRE (2026-09-07) ────────────────
-- Certains chapitres sont réutilisés tels quels dans plusieurs matières (ex. un chapitre
-- "Bases du calcul commercial" utile à la fois en Économie de Gestion et en Mathématiques).
-- matiere_id (uuid unique) devient matiere_ids (uuid[], même convention que filieres text[]
-- ailleurs dans le projet). can_edit_matiere() est déjà par-matière : un chapitre est éditable
-- dès qu'AU MOINS UNE de ses matières est éditable par l'appelant (logique volontairement
-- permissive — outil interne d'établissement, pas un environnement adversarial : un enseignant
-- peut ainsi rattacher un chapitre partagé à une matière d'un collègue sans lui demander d'agir
-- lui-même, mais ne gagne pas pour autant les droits d'édition sur LE RESTE de cette matière).
-- 1) D'abord supprimer les policies qui référencent encore matiere_id (colonne scalaire),
-- sinon Postgres refuse de la dropper (dépendances) — c'est l'ordre qui a échoué la première
-- fois : DROP COLUMN doit venir APRÈS que plus aucune policy ne s'appuie dessus.
drop policy "chapitres_edit" on chapitres;
drop policy "sections_edit" on sections_cours;
drop policy "exercices_edit" on exercices;
drop policy "exercice_blocks_edit" on exercice_blocks;
drop policy "resultats_enseignant" on resultats;
drop policy "tentatives_staff_select" on exercice_tentatives;
drop policy "progression_staff_select" on exercice_progression;

-- 2) Migrer la colonne
alter table chapitres add column if not exists matiere_ids uuid[] not null default '{}';
update chapitres set matiere_ids = array[matiere_id] where matiere_ids = '{}';
alter table chapitres add constraint chapitres_matiere_ids_not_empty check (array_length(matiere_ids, 1) > 0);
create index on chapitres using gin(matiere_ids);
alter table chapitres drop column matiere_id;

-- 3) Recréer les policies sur matiere_ids (tableau)
create policy "chapitres_edit" on chapitres
  for all using (exists (select 1 from unnest(matiere_ids) as mid where can_edit_matiere(mid)));

create policy "sections_edit" on sections_cours
  for all using (
    exists (
      select 1 from chapitres c, unnest(c.matiere_ids) as mid
      where c.id = sections_cours.chapitre_id and can_edit_matiere(mid)
    )
  );

create policy "exercices_edit" on exercices
  for all using (
    exists (
      select 1 from chapitres c, unnest(c.matiere_ids) as mid
      where c.id = exercices.chapitre_id and can_edit_matiere(mid)
    )
  );

create policy "exercice_blocks_edit" on exercice_blocks
  for all using (
    exists (
      select 1 from chapitres c, unnest(c.matiere_ids) as mid
      where c.id = exercice_blocks.chapitre_id and can_edit_matiere(mid)
    )
  );

create policy "resultats_enseignant" on resultats
  for select using (
    my_role() = 'admin'
    or exists (
      select 1 from exercices e, chapitres c, unnest(c.matiere_ids) as mid
      where e.id = resultats.exercice_id and c.id = e.chapitre_id and can_view_matiere(mid)
    )
  );

create policy "tentatives_staff_select" on exercice_tentatives
  for select using (
    my_role() = 'admin'
    or (
      exists (
        select 1 from profiles p
        join enseignant_classes ec on ec.classe_id = p.classe_id
        where p.id = exercice_tentatives.user_id and ec.enseignant_id = auth.uid()
      )
      and exists (
        select 1 from exercices e, chapitres c, unnest(c.matiere_ids) as mid
        where e.id = exercice_tentatives.exercice_id and c.id = e.chapitre_id and can_view_matiere(mid)
      )
    )
  );

create policy "progression_staff_select" on exercice_progression
  for select using (
    my_role() = 'admin'
    or (
      exists (
        select 1 from profiles p
        join enseignant_classes ec on ec.classe_id = p.classe_id
        where p.id = exercice_progression.user_id and ec.enseignant_id = auth.uid()
      )
      and exists (
        select 1 from exercices e, chapitres c, unnest(c.matiere_ids) as mid
        where e.id = exercice_progression.exercice_id and c.id = e.chapitre_id and can_view_matiere(mid)
      )
    )
  );

-- ── ENTREPRISES : ACCÈS ENSEIGNANT DÉRIVÉ DE SA CLASSE (2026-09-07) ─────────
-- Jusqu'ici un enseignant assigné à une classe (enseignant_classes) n'avait PAS automatiquement
-- accès à l'Espace Équipe des entreprises de cette classe — il fallait une ligne
-- enseignant_entreprises séparée par entreprise, sans UI pour la gérer. Avec beaucoup de classes,
-- ce n'est pas praticable : un enseignant d'une classe doit avoir accès à toutes ses entreprises
-- sans affectation manuelle supplémentaire. enseignant_entreprises reste utilisable en complément
-- (accès ponctuel à une entreprise hors de ses classes).
create or replace function can_access_entreprise(target_entreprise_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    my_role() = 'admin'
    or (is_active() and exists (select 1 from profiles where id = auth.uid() and entreprise_id = target_entreprise_id))
    or (is_active() and exists (
      select 1 from enseignant_entreprises
      where enseignant_id = auth.uid() and entreprise_id = target_entreprise_id
    ))
    or (is_active() and exists (
      select 1 from entreprises e
      join enseignant_classes ec on ec.classe_id = e.classe_id
      where e.id = target_entreprise_id and ec.enseignant_id = auth.uid()
    ))
$$;
