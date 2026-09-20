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

-- ── SÉCURITÉ : CONTENU DE COURS ENTIÈREMENT PUBLIC (2026-09-08) ─────────────
-- chapitres/sections_cours/exercices/exercice_blocks avaient une lecture "using (true)" —
-- littéralement n'importe qui, sans compte, pouvait lire tout le contenu pédagogique via l'API
-- Supabase (l'anon key est de toute façon visible dans le bundle JS déployé). Le commentaire
-- d'origine ("protégé côté app par le check de connexion") ne protégeait que l'interface, pas la
-- donnée. Restreint maintenant aux comptes actifs (is_active()) — aucun changement de
-- comportement pour un utilisateur normal de l'app, qui est de toute façon connecté.
-- Noms réels vérifiés via pg_policies (divergent de la création d'origine plus haut dans ce
-- fichier — "cours_public_read"/"sections_public_read"/"exercices_public_read" — probablement
-- renommées depuis via le dashboard Supabase sans que ce fichier ne soit mis à jour) :
-- cours_read / sections_read / exercices_read / exercice_blocks_read.
drop policy "cours_read" on chapitres;
create policy "cours_authenticated_read" on chapitres
  for select using (is_active());

drop policy "sections_read" on sections_cours;
create policy "sections_authenticated_read" on sections_cours
  for select using (is_active());

drop policy "exercices_read" on exercices;
create policy "exercices_authenticated_read" on exercices
  for select using (is_active());

drop policy "exercice_blocks_read" on exercice_blocks;
create policy "exercice_blocks_authenticated_read" on exercice_blocks
  for select using (is_active());

-- ── CALENDRIER : LIEU, HORAIRES, RÉSERVATION ENSEIGNANTS (2026-09-15) ───────
alter table calendrier add column if not exists lieu text not null default '';
alter table calendrier add column if not exists horaire_debut time;
alter table calendrier add column if not exists horaire_fin time;
alter table calendrier add column if not exists enseignants_only boolean not null default false;

-- jour_fin/mois_fin : null = événement d'un seul jour (comportement historique) ; renseignés
-- ensemble = période s'étendant de (jour, mois) à (jour_fin, mois_fin).
alter table calendrier add column if not exists jour_fin integer;
alter table calendrier add column if not exists mois_fin text;

-- ── INFOS : CONTENU DES 7 ONGLETS (JEL / ENTRA / GEN-E) (2026-09-15) ────────
-- Textes rédigés à partir des informations publiques de jonk-entrepreneuren.lu.
-- Logos/images non inclus ici (pas de type de bloc "image" dans le modèle actuel) —
-- à ajouter manuellement en mode édition si besoin.
update infos_sections set contenu = '{"blocks":[{"id":"b001","type":"texte","html":"<p><strong>Bienvenue dans l''espace Infos</strong></p>\n<p>Cette section rassemble toutes les informations pratiques sur les programmes entrepreneuriaux proposés dans le cadre de vos cours : qui organise quoi, à qui s''adresse chaque programme, et où trouver plus de détails. Que vous suiviez une mini-entreprise, une entreprise d''entraînement ou le Start-up Program, vous trouverez ici le contexte général et les liens utiles pour la suite de l''année.</p>"}]}'::jsonb, updated_at = now() where cle = 'general';
update infos_sections set contenu = '{"blocks":[{"id":"b002","type":"texte","html":"<p><strong>Jonk Entrepreneuren Luxembourg (JEL)</strong></p>\n<p>JEL est l''association luxembourgeoise qui coordonne l''ensemble des programmes d''éducation entrepreneuriale proposés dans les écoles du pays, de l''enseignement secondaire à l''enseignement supérieur. Sa mission : donner aux jeunes la confiance, les compétences et l''esprit d''initiative nécessaires pour créer, innover et prendre des responsabilités. JEL organise notamment les Mini-Entreprises, les Entreprises d''Entraînement et le Start-up Program, et représente le Luxembourg au niveau européen (réseau Junior Achievement Europe / JA Europe).</p>\n<p><a href=\"https://jonk-entrepreneuren.lu/fr/\" target=\"_blank\" rel=\"noreferrer\">jonk-entrepreneuren.lu</a></p>"}]}'::jsonb, updated_at = now() where cle = 'jel';
update infos_sections set contenu = '{"blocks":[{"id":"b003","type":"texte","html":"<p><strong>Les Entreprises d''Entraînement (EE)</strong></p>\n<p>Une entreprise d''entraînement simule le fonctionnement complet d''une vraie entreprise — administration, ressources humaines, achats, stocks, ventes, comptabilité — sans les risques financiers réels : clients, fournisseurs et banques sont simulés au sein d''un réseau national coordonné par la CLEE (Centrale Luxembourgeoise des Entreprises d''Entraînement, un service de JEL). Ce réseau est lui-même connecté au réseau international PEN Worldwide, qui regroupe plus de 7 500 entreprises d''entraînement dans une quarantaine de pays. Le programme s''adresse aux élèves de 16 à 19 ans en formation professionnelle (filière commerce), et rythme l''année scolaire d''évènements comme le Festival Winterlights, la Foire des EE et la Finale nationale.</p>\n<p><a href=\"https://jonk-entrepreneuren.lu/fr/program/entreprises-dentrainement/\" target=\"_blank\" rel=\"noreferrer\">Programme Entreprises d''Entraînement — JEL</a></p>"}]}'::jsonb, updated_at = now() where cle = 'entreprises_entrainement';
update infos_sections set contenu = '{"blocks":[{"id":"b004","type":"texte","html":"<p><strong>Les Mini-Entreprises</strong></p>\n<p>Pendant une année scolaire complète, chaque équipe d''élèves crée et gère sa propre mini-entreprise réelle : choix du produit ou service, création, vente, comptabilité, jusqu''à la clôture en fin d''année. L''enseignant accompagne comme coach plutôt que comme professeur classique, et des professionnels extérieurs interviennent ponctuellement pour conseiller les équipes. Ce programme s''adresse aux élèves de 15 à 19 ans de l''enseignement secondaire général et classique. Les meilleures équipes peuvent se qualifier pour la finale nationale (Mini-Companies Final), avec une possibilité de représenter le Luxembourg au niveau international.</p>\n<p><a href=\"https://jonk-entrepreneuren.lu/en/program/the-mini-companies/\" target=\"_blank\" rel=\"noreferrer\">Programme Mini-Entreprises — JEL</a></p>"}]}'::jsonb, updated_at = now() where cle = 'mini_entreprises';
update infos_sections set contenu = '{"blocks":[{"id":"b005","type":"texte","html":"<p><strong>Le Start-up Program (Young Enterprise Project)</strong></p>\n<p>Destiné aux étudiants de l''enseignement supérieur (19-30 ans), ce programme accompagne des équipes de 2 à 6 personnes dans le développement d''une véritable idée de start-up : étude de faisabilité, construction du modèle économique, création d''un prototype, puis présentation devant un jury d''investisseurs potentiels. Des professionnels du secteur interviennent comme coaches tout au long du parcours. Les meilleures équipes peuvent représenter le Luxembourg à la finale européenne GEN-E.</p>\n<p><a href=\"https://jonk-entrepreneuren.lu/en/program/young-enterprise-project-2\" target=\"_blank\" rel=\"noreferrer\">Startup Programme — JEL</a></p>"}]}'::jsonb, updated_at = now() where cle = 'startup_program';
update infos_sections set contenu = '{"blocks":[{"id":"b006","type":"texte","html":"<p><strong>GEN-E — le festival européen des jeunes entrepreneurs</strong></p>\n<p>GEN-E (Generation Entrepreneurs) est le plus grand festival européen dédié aux jeunes entrepreneurs, organisé chaque année dans un pays différent par le réseau Junior Achievement Europe. Il rassemble les meilleures équipes de start-ups étudiantes de toute l''Europe pour des présentations, des concours et des rencontres avec des investisseurs et entrepreneurs confirmés. Le Luxembourg, via JEL, a été sélectionné pour organiser l''édition GEN-E 2027 — une belle occasion de mettre en lumière les jeunes entrepreneurs luxembourgeois sur la scène européenne.</p>\n<p><a href=\"https://jonk-entrepreneuren.lu/en/jonk-entrepreneuren-luxembourg-selected-to-host-gen-e-2027-europes-largest-youth-entrepreneurship-festival-2/\" target=\"_blank\" rel=\"noreferrer\">Luxembourg sélectionné pour organiser Gen-E 2027 — JEL</a></p>"}]}'::jsonb, updated_at = now() where cle = 'gene';
update infos_sections set contenu = '{"blocks":[{"id":"b007","type":"texte","html":"<ul>\n<li><a href=\"https://jonk-entrepreneuren.lu/fr/\" target=\"_blank\" rel=\"noreferrer\">jonk-entrepreneuren.lu</a> — Site officiel de JEL — actualités, tous les programmes</li>\n<li><a href=\"https://jonk-entrepreneuren.lu/en/program/the-mini-companies/\" target=\"_blank\" rel=\"noreferrer\">Programme Mini-Entreprises</a> — Détails du programme Mini-Entreprises</li>\n<li><a href=\"https://jonk-entrepreneuren.lu/fr/program/entreprises-dentrainement/\" target=\"_blank\" rel=\"noreferrer\">Programme Entreprises d''Entraînement</a> — Détails du programme ENTRA</li>\n<li><a href=\"https://jonk-entrepreneuren.lu/en/program/young-enterprise-project-2\" target=\"_blank\" rel=\"noreferrer\">Startup Programme</a> — Détails du Start-up Program (YEP)</li>\n<li><a href=\"https://jonk-entrepreneuren.lu/en/jonk-entrepreneuren-luxembourg-selected-to-host-gen-e-2027-europes-largest-youth-entrepreneurship-festival-2/\" target=\"_blank\" rel=\"noreferrer\">Gen-E 2027 au Luxembourg</a> — Actualité sur l''organisation de Gen-E 2027</li>\n<li><a href=\"https://guichet.public.lu\" target=\"_blank\" rel=\"noreferrer\">Guichet.lu — créer une entreprise</a> — Démarches réelles de création d''entreprise au Luxembourg (référence pour ACENT)</li>\n</ul>"}]}'::jsonb, updated_at = now() where cle = 'liens_utiles';

-- ── CALENDRIER : ENTRÉES ENTRA 2026-2027 (2026-09-15) ───────────────────────
-- Extraites du tableau transmis par Jeff (confirmé le 15/09/2026). 3 entrées volontairement
-- omises car dates encore approximatives/à confirmer côté CLEE : "Kick-off Session CLEE"
-- (planning pas encore publié), "Activité SuperDrecksKëscht" et "Audits CLEE" (mois
-- approximatifs) — à ajouter via l'admin dès que les dates exactes seront connues.
-- lycee_ids laissé vide (= visible dans les deux lycées) ; LTEtt/LTC sont des lieux physiques,
-- pas des lycées de la plateforme (seuls LNB et ECG existent dans la table lycees).
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (16, 'SEP', 'Rentrée 2026 — Début du programme (2TPCM)', '', 'event', array['2TPCM'], '', null, null, false, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (18, 'SEP', 'Rentrée 2026 — BTS', '', 'event', array['BTS'], '', null, null, false, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (24, 'SEP', 'Kick-off titulaires', 'Réunion de lancement', 'event', array['2TPCM','BTS'], 'En ligne', '16:00', '17:30', true, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (30, 'SEP', 'Formation titulaires', 'Formation de base, ouverte à tous les titulaires (nouveaux et anciens)', 'atelier', array['2TPCM','BTS'], '', '14:00', '17:00', true, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (6, 'OCT', 'Formation BOB50 — titulaires (session 1)', 'Formation au logiciel de comptabilité BOB50', 'atelier', array['2TPCM','BTS'], 'Ettelbruck', '15:00', '18:00', true, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (8, 'OCT', 'Formation BOB50 — titulaires (session 2)', 'Formation au logiciel de comptabilité BOB50', 'atelier', array['2TPCM','BTS'], 'Ettelbruck', '15:00', '18:00', true, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (30, 'NOV', 'Winterlights Festival', 'Promotions spéciales de Noël par les entreprises', 'event', array['2TPCM','BTS'], '', null, null, false, 18, 'DÉC');
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (8, 'DÉC', 'Journée de formation élèves — LTEtt', 'Techniques de vente, service à la clientèle, pitching, marketing & réseaux sociaux', 'atelier', array['2TPCM','BTS'], 'LTEtt (Lycée Technique d''Ettelbruck)', null, null, false, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (10, 'DÉC', 'Journée de formation élèves — LTC', 'Techniques de vente, service à la clientèle, pitching, marketing & réseaux sociaux', 'atelier', array['2TPCM','BTS'], 'LTC', null, null, false, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (29, 'JAN', 'Deadline — dossier Foire des EE', 'Envoi du dossier de participation à la Foire', 'deadline', array['2TPCM','BTS'], '', null, null, false, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (18, 'FÉV', 'Foire des Entreprises d''Entraînement 2027', 'Foire en présentiel avec toutes les entreprises du réseau', 'event', array['2TPCM','BTS'], 'Forum Geesseknäppchen', null, null, false, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (23, 'AVR', 'Deadline — rating final', 'Envoi de tous les documents pour le concours Meilleure Gestion Quotidienne', 'deadline', array['2TPCM','BTS'], '', null, null, false, null, null);
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (26, 'AVR', 'Communication du rating final', 'Communication des notes et des finalistes de l''année', 'event', array['2TPCM','BTS'], '', null, null, false, 30, 'AVR');
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (17, 'MAI', 'Finale nationale des EE', 'Présentations finales des finalistes et remise des prix (Meilleure Présentation, Concours MGQ, Meilleure EE de l''année)', 'event', array['2TPCM','BTS'], '', null, null, false, 21, 'MAI');
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (24, 'MAI', 'Stage d''apprentissage — 2TPCM', '', 'event', array['2TPCM'], '', null, null, false, 2, 'JUIL');
insert into calendrier (jour, mois, titre, sous_titre, tag, filieres, lieu, horaire_debut, horaire_fin, enseignants_only, jour_fin, mois_fin) values (8, 'FÉV', 'Stage — BTS B1DiCo (1ère année)', '', 'event', array['BTS'], '', null, null, false, 5, 'MAR');

-- ── STORAGE : FICHIERS DE CONTENU (bloc "fichier" de l'éditeur de section) (2026-09-16) ──
-- Même modèle que "content-images"/"content-videos" : bucket public, écriture réservée
-- au staff. Pas de restriction de type MIME (PDF, Word, Excel, zip, etc. doivent tous
-- pouvoir être déposés) ; limite de taille alignée sur "content-videos".
insert into storage.buckets (id, name, public, file_size_limit)
  values ('content-files', 'content-files', true, 209715200)
  on conflict (id) do nothing;

create policy "content_files_read" on storage.objects
  for select using (bucket_id = 'content-files');

create policy "content_files_write" on storage.objects
  for insert with check (bucket_id = 'content-files' and my_role() in ('enseignant','admin'));

create policy "content_files_update" on storage.objects
  for update using (bucket_id = 'content-files' and my_role() in ('enseignant','admin'));

create policy "content_files_delete" on storage.objects
  for delete using (bucket_id = 'content-files' and my_role() in ('enseignant','admin'));

-- ── COURS BTS B1DiCo-ECOGEST : IMPORT DES 7 CHAPITRES (2026-09-16) ──────────────
-- Contenu livré par livraison_BTS_ECOGEST.zip (voir docs/anleitung-kursinhalt-ki.md pour le
-- format source). 7 chapitres, 24 sections, 56 exercices, matiere_ids = B1DiCo - ECOGEST.
-- ── IMPORT COURS BTS B1DiCo-ECOGEST (7 chapitres, généré depuis EHub_livraison_BTS_ECOGEST.zip) ──
begin;

-- Chapitre 1/7 : Startup Programme : de l'idée au modèle économique
insert into chapitres (id, titre_fr, emoji, description_fr, filieres, matiere_ids, ordre) values (
  '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Startup Programme : de l''idée au modèle économique', '🚀', 'Comprenez ce qu''est une start-up, formulez votre proposition de valeur et construisez le Business Model Canvas de votre projet — les fondations avant de chiffrer quoi que ce soit.',
  array['BTS'], array['29a8e347-0610-4180-b86c-e8715c44fd25']::uuid[], 0
);

  -- Section 1 : Qu'est-ce qu'une start-up ? (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '58631890-1165-495f-9aef-7eeaa24804a6', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Qu''est-ce qu''une start-up ?', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Le Startup Programme (JEL/GEN-E) vous demande de transformer une idée en projet entrepreneurial cohérent. Avant de chiffrer quoi que ce soit, il faut comprendre précisément ce qu''est une start-up, et ce qui la distingue d''une entreprise « classique ».</p>"},{"type":"definition","html":"<p>Une <strong>start-up</strong> est une jeune entreprise qui cherche à développer une solution innovante dans un contexte d''incertitude. Elle ne se distingue donc pas uniquement par son âge : elle cherche surtout un <strong>modèle économique reproductible</strong>, capable de grandir rapidement, souvent en s''appuyant sur le numérique.</p>"},{"type":"liste","items":["Innovation : une nouvelle solution, ou une nouvelle manière de répondre à un besoin existant","Incertitude : au départ, le marché et la réaction réelle des clients ne sont pas encore connus","Scalabilité : la possibilité d''augmenter fortement l''activité sans augmenter les coûts dans les mêmes proportions","Recherche d''un modèle économique viable : comprendre qui paie, combien, et pour quelle valeur"]},{"type":"exemple","html":"<p><strong>Airbnb</strong> illustre bien cette logique. L''entreprise n''a pas inventé l''hébergement touristique : elle a construit une plateforme numérique permettant à des particuliers de proposer un logement à des voyageurs. La valeur ne vient pas des logements eux-mêmes, mais de la mise en relation, de la simplicité de réservation et de la confiance créée par la plateforme — ce qui lui a permis de grandir dans le monde entier sans posséder un seul hôtel.</p>"}]}'::jsonb, 0, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'e600c0f3-663c-4043-86db-969f8dfbb3e7', '58631890-1165-495f-9aef-7eeaa24804a6', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'QCM — caractéristiques d''une start-up', 'qcm', '<p>Parmi les caractéristiques suivantes, lesquelles définissent une start-up ?</p>',
    '["Elle a nécessairement moins de 2 ans d''existence","Elle recherche un modèle économique reproductible et capable de grandir rapidement","Elle évolue dans un contexte d''incertitude","Elle possède obligatoirement ses propres infrastructures physiques"]'::jsonb, '[1,2]'::jsonb, 2, 0, '{"explication":"<p>Une start-up n''est pas définie par son âge exact ni par la possession d''infrastructures physiques (Airbnb ne possède aucun hôtel). Ce qui la caractérise, c''est la recherche d''un modèle économique reproductible à forte croissance, dans un contexte d''incertitude.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'fff14cac-d58f-42c1-a1b4-e9aedad40701', '58631890-1165-495f-9aef-7eeaa24804a6', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Vrai/Faux — âge d''une start-up', 'vrai_faux', '<p>Une entreprise n''est une start-up que si elle existe depuis moins d''un an.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : l''âge n''est pas le critère déterminant. Une entreprise reste une start-up tant qu''elle cherche encore son modèle économique viable et reproductible, même après plusieurs années.</p>","feedback_faux":"<p>Relisez la définition ci-dessus : quel est le critère central, à côté de l''âge ?</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '2fb3c5eb-0609-4464-ba07-abc7a3afbc90', '58631890-1165-495f-9aef-7eeaa24804a6', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Réponse courte — scalabilité', 'reponse_courte', '<p>Quel terme désigne la possibilité, pour une entreprise, d''augmenter fortement son activité sans augmenter ses coûts dans les mêmes proportions ?</p>',
    '[]'::jsonb, '{"reponses":["scalabilité","la scalabilité","scalabilite"],"case_sensible":false,"ignorer_espaces":true}'::jsonb, 1, 2, '{"explication":"<p>Il s''agit de la scalabilité : une application ou une plateforme numérique peut souvent servir un nombre croissant d''utilisateurs sans que les coûts augmentent dans les mêmes proportions.</p>"}'::jsonb
  );

  -- Section 2 : La proposition de valeur (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'f24f96e8-f3c4-4af5-a939-edd0b85e8f19', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'La proposition de valeur', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>La <strong>proposition de valeur</strong> est le cœur de tout projet de start-up. Elle répond à une question simple mais essentielle : pourquoi un client choisirait-il votre offre plutôt que celle d''un concurrent ?</p>"},{"type":"definition","html":"<p>La proposition de valeur relie un <strong>problème concret</strong>, une <strong>cible</strong> et une <strong>solution</strong>. Une bonne proposition de valeur ne se contente pas de décrire les caractéristiques techniques du produit : elle exprime le bénéfice réellement obtenu par le client (gain de temps, économie, confort, image...).</p>"},{"type":"formule","items":["Nous aidons [cible] à [résoudre un problème] grâce à [solution / avantage distinctif]"]},{"type":"exemple","html":"<p><strong>Spotify</strong> a rendu l''accès à un vaste catalogue musical immédiat et simple, avec un modèle freemium : pour l''utilisateur, la valeur ne réside pas dans l''application elle-même, mais dans l''accès à la musique, la personnalisation et la possibilité d''écouter sur différents appareils. <strong>Deliveroo</strong>, de son côté, connecte des livreurs indépendants et des restaurants locaux pour apporter un plat chez le client rapidement : la valeur perçue est le gain de temps et le confort.</p>"},{"type":"texte","html":"<p>Une bonne proposition de valeur doit rester <strong>simple</strong> (compréhensible en une phrase), <strong>pertinente</strong> (liée à un vrai besoin) et <strong>distinctive</strong> (différente de ce qui existe déjà sur le marché).</p>"}]}'::jsonb, 1, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'eb70b864-a84e-4008-af55-bb2e2b9a0ffd', 'f24f96e8-f3c4-4af5-a939-edd0b85e8f19', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Catégorisation — qualités d''une proposition de valeur', 'categorisation', '<p>Pour chaque exemple ci-dessous, identifiez à quelle qualité attendue d''une proposition de valeur il correspond.</p>',
    '{"items":[{"id":"i1","label":"\"Voyager comme un habitant, partout dans le monde\" — compréhensible en une seule phrase"},{"id":"i2","label":"La solution répond à un vrai problème rencontré par la cible visée"},{"id":"i3","label":"L''offre se différencie clairement des solutions déjà présentes sur le marché"}],"categories":[{"id":"c1","label":"Simple"},{"id":"c2","label":"Pertinente"},{"id":"c3","label":"Distinctive"}]}'::jsonb, '{"placements":{"i1":"c1","i2":"c2","i3":"c3"}}'::jsonb, 3, 0, '{"explication":"<p>Une proposition de valeur efficace est simple (une phrase claire), pertinente (liée à un vrai besoin de la cible) et distinctive (différente des offres concurrentes).</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'a105ae16-4a51-45d3-9f16-98296083c429', 'f24f96e8-f3c4-4af5-a939-edd0b85e8f19', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Libre — votre proposition de valeur', 'libre', '<p>À partir de votre propre idée de start-up numérique (Startup Programme), formulez votre proposition de valeur en une phrase, selon la structure : « Nous aidons [cible] à [résoudre un problème] grâce à [solution] ». Identifiez ensuite le principal concurrent ou la principale alternative existante.</p>',
    '[]'::jsonb, '"Éléments attendus : une cible précise (pas « tout le monde »), un problème concret et réel, une solution qui y répond directement, et l''identification honnête d''au moins une alternative ou un concurrent existant."'::jsonb, 3, 1, '{}'::jsonb
  );

  -- Section 3 : Le Business Model Canvas (BMC) (editeur)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'e846a0db-fe74-4d5e-92cb-84bf607aeb67', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Le Business Model Canvas (BMC)', 'editeur',
    '{"html":"<p>Le <strong>Business Model Canvas</strong> (BMC) est une représentation du modèle économique d''un projet sur une seule page. Dans le cadre du Startup Programme, il est particulièrement important : c''est souvent lui qui permet au jury de comprendre rapidement comment votre projet crée, délivre et capte de la valeur.</p>\n<p>Le BMC se compose de 9 blocs, qui doivent rester cohérents entre eux : une excellente idée sans clients identifiés, sans revenus crédibles ou avec des coûts irréalistes ne constitue pas encore un modèle économique viable.</p>\n<table>\n<tr><th>Bloc</th><th>Question clé</th><th>Exemple : Spotify</th></tr>\n<tr><td>Segments de clients</td><td>À qui créons-nous de la valeur ?</td><td>Auditeurs gratuits/premium, annonceurs</td></tr>\n<tr><td>Proposition de valeur</td><td>Quel problème résolvons-nous ?</td><td>Accès simple et personnalisé à un vaste catalogue audio</td></tr>\n<tr><td>Canaux</td><td>Comment atteignons-nous les clients ?</td><td>Applications, site web, partenariats, stores</td></tr>\n<tr><td>Relations clients</td><td>Comment attirer et fidéliser ?</td><td>Personnalisation, playlists, recommandations</td></tr>\n<tr><td>Sources de revenus</td><td>Qui paie, et pour quoi ?</td><td>Abonnements Premium et publicité</td></tr>\n<tr><td>Ressources clés</td><td>De quoi avons-nous besoin ?</td><td>Technologie, catalogue/licences, données, marque</td></tr>\n<tr><td>Activités clés</td><td>Que faut-il savoir faire ?</td><td>Développer la plateforme, recommander, négocier les droits</td></tr>\n<tr><td>Partenaires clés</td><td>Qui est indispensable ?</td><td>Labels, artistes, distributeurs, partenaires technologiques</td></tr>\n<tr><td>Structure de coûts</td><td>Quels sont les coûts majeurs ?</td><td>Licences/droits, personnel, technologie, marketing</td></tr>\n</table>\n<p><strong>Méthode conseillée :</strong> commencez par les segments de clients et la proposition de valeur, puis réfléchissez aux canaux et aux relations. Déterminez ensuite les sources de revenus. Enfin seulement, identifiez les ressources, activités, partenaires et coûts nécessaires pour rendre la promesse réalisable.</p>\n<p>Le BMC n''est pas un document figé : c''est une base de travail évolutive, à modifier dès que des enquêtes, des tests ou des calculs montrent qu''une hypothèse n''est pas réaliste.</p>\n<p><em>[Vidéo à insérer ici : courte présentation animée des 9 blocs du Business Model Canvas, avec un exemple d''entreprise connue rempli à l''écran]</em></p>"}'::jsonb, 2, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '902fe093-5983-4f2c-875c-9c62feea6f48', 'e846a0db-fe74-4d5e-92cb-84bf607aeb67', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Catégorisation — le BMC de Spotify', 'categorisation', '<p>Le Business Model Canvas de Spotify comprend, entre autres, les éléments suivants. Associez chacun au bloc du BMC auquel il appartient.</p>',
    '{"items":[{"id":"i1","label":"Auditeurs gratuits/premium, annonceurs"},{"id":"i2","label":"Accès simple et personnalisé à un vaste catalogue audio"},{"id":"i3","label":"Applications, site web, partenariats, stores"},{"id":"i4","label":"Abonnements Premium et publicité"}],"categories":[{"id":"c1","label":"Segments de clients"},{"id":"c2","label":"Proposition de valeur"},{"id":"c3","label":"Canaux"},{"id":"c4","label":"Sources de revenus"}]}'::jsonb, '{"placements":{"i1":"c1","i2":"c2","i3":"c3","i4":"c4"}}'::jsonb, 4, 0, '{"explication":"<p>Les auditeurs et annonceurs sont les segments de clients ; l''accès simple et personnalisé est la proposition de valeur ; les applications et partenariats sont les canaux qui permettent d''atteindre les clients ; les abonnements et la publicité sont les sources de revenus.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '83332eda-e9f9-443d-b186-e3d20a3077ad', 'e846a0db-fe74-4d5e-92cb-84bf607aeb67', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Vrai/Faux — évolution du BMC', 'vrai_faux', '<p>Une fois rempli, le Business Model Canvas d''un projet ne doit plus jamais être modifié.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : le BMC est une base de travail évolutive. Il doit être révisé chaque fois qu''une enquête terrain, un test ou un calcul montre qu''une hypothèse de départ n''était pas réaliste.</p>","feedback_faux":"<p>Relisez la dernière remarque de la section ci-dessus.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '68d72df6-09f6-44dd-9907-6d3e5260d193', 'e846a0db-fe74-4d5e-92cb-84bf607aeb67', '76ba535e-8c1c-46ca-a31d-cc5d58482571', 'Libre — votre Business Model Canvas', 'libre', '<p>Complétez les 9 blocs du Business Model Canvas pour votre propre projet de start-up numérique (Startup Programme). Commencez par la proposition de valeur et les segments de clients, terminez par la structure de coûts.</p>',
    '[]'::jsonb, '"Éléments attendus : les 9 blocs sont renseignés de façon cohérente entre eux (les revenus doivent correspondre à ce que les segments de clients sont prêts à payer, les coûts doivent correspondre aux ressources et activités identifiées). Chaque affirmation importante doit pouvoir être expliquée ou justifiée par l''équipe."'::jsonb, 4, 2, '{}'::jsonb
  );


-- Chapitre 2/7 : Planification financière
insert into chapitres (id, titre_fr, emoji, description_fr, filieres, matiere_ids, ordre) values (
  '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Planification financière', '💶', 'Choisissez vos sources de financement, calculez le coût d''un emprunt à annuités constantes, distinguez charge et investissement, et maîtrisez la marge commerciale — les bases chiffrées de votre business plan.',
  array['BTS'], array['29a8e347-0610-4180-b86c-e8715c44fd25']::uuid[], 1
);

  -- Section 1 : Les sources de financement (editeur)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'ef0d00a2-96d2-427b-97c4-51bfbdfe5f40', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Les sources de financement', 'editeur',
    '{"html":"<p>Avant même de vendre son premier produit, une start-up doit financer ses besoins de départ : matériel, développement d''un site ou d''une application, campagne de communication... Le choix de la source de financement n''est jamais neutre : il influence le risque pris par les fondateurs, le coût du financement et parfois le contrôle qu''ils gardent sur leur propre entreprise.</p>\n<p>On distingue traditionnellement le financement <strong>interne</strong> (apporté par les fondateurs eux-mêmes) et le financement <strong>externe</strong> (apporté par des acteurs extérieurs à l''entreprise).</p>\n<table>\n<tr><th>Source</th><th>Principe</th><th>Conséquence pour l''entreprise</th></tr>\n<tr><td>Apport personnel</td><td>Les fondateurs investissent leurs propres économies</td><td>Pas d''intérêts à payer, mais l''argent personnel des fondateurs est exposé au risque ; souvent exigé par les banques avant d''accorder un prêt</td></tr>\n<tr><td>Emprunt bancaire</td><td>Une banque prête un capital, à rembourser avec des intérêts</td><td>Remboursements réguliers (capital + intérêts) ; aucune part de l''entreprise n''est cédée</td></tr>\n<tr><td>Aides et subventions</td><td>Soutien public, souvent ciblé sur l''innovation ou les jeunes entreprises</td><td>Réduit le besoin de financement, mais soumis à des conditions d''éligibilité (ex. au Luxembourg : Fit4Start, Luxinnovation, SNCI Start-up Support)</td></tr>\n<tr><td>Crowdfunding (financement participatif)</td><td>De nombreuses personnes financent le projet via une plateforme (ex. Kickstarter, Ulule)</td><td>Permet aussi de tester l''intérêt du public avant le lancement</td></tr>\n<tr><td>Business angels / capital-risque</td><td>Un investisseur apporte des fonds contre une part du capital de l''entreprise</td><td>Pas de remboursement classique, mais dilution du capital et partage du contrôle ; l''investisseur apporte souvent aussi son réseau et ses conseils</td></tr>\n</table>\n<p>Dans le cadre du Startup Programme, le choix des sources de financement doit être justifié dans le business plan : un jury voudra comprendre pourquoi vous avez choisi tel montage plutôt qu''un autre, et ce que cela implique pour votre entreprise.</p>"}'::jsonb, 0, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '90f49430-0282-4ebb-b069-a357a6cdda08', 'ef0d00a2-96d2-427b-97c4-51bfbdfe5f40', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Catégorisation — financement interne ou externe', 'categorisation', '<p>Classez chaque source de financement selon qu''elle est interne (apportée par les fondateurs) ou externe (apportée par un acteur extérieur).</p>',
    '{"items":[{"id":"i1","label":"Apport personnel des fondateurs"},{"id":"i2","label":"Emprunt bancaire"},{"id":"i3","label":"Subvention Luxinnovation"},{"id":"i4","label":"Investissement d''un business angel"}],"categories":[{"id":"c1","label":"Financement interne"},{"id":"c2","label":"Financement externe"}]}'::jsonb, '{"placements":{"i1":"c1","i2":"c2","i3":"c2","i4":"c2"}}'::jsonb, 4, 0, '{"explication":"<p>Seul l''apport personnel des fondateurs est un financement interne : toutes les autres sources proviennent d''un acteur extérieur à l''entreprise (banque, État, investisseur).</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'e6a27ebb-8b47-4953-9044-192b5b6c83f1', 'ef0d00a2-96d2-427b-97c4-51bfbdfe5f40', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'QCM — business angels et capital-risque', 'qcm', '<p>Quels éléments décrivent correctement le financement par business angel ou capital-risque ?</p>',
    '["L''investisseur reçoit une part du capital de l''entreprise","L''entreprise doit rembourser le capital chaque mois comme pour un prêt","L''investisseur apporte souvent aussi son réseau et ses conseils","Ce type de financement ne dilue jamais le contrôle des fondateurs"]'::jsonb, '[0,2]'::jsonb, 2, 1, '{"explication":"<p>Un business angel ou un fonds de capital-risque investit en échange d''une part du capital (dilution du contrôle des fondateurs), sans remboursement classique comme pour un prêt ; il apporte souvent aussi son réseau et son expérience.</p>"}'::jsonb
  );

  -- Section 2 : Le coût d'un emprunt : les annuités constantes (editeur)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'cf7b116a-3b27-416e-9760-95b7956505e0', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Le coût d''un emprunt : les annuités constantes', 'editeur',
    '{"html":"<p>Lorsqu''une start-up finance un investissement important par un emprunt bancaire, elle rembourse généralement celui-ci par <strong>annuités constantes</strong> : elle verse le même montant total à chaque période (souvent chaque année), du début à la fin du prêt.</p>\n<p>Ce montant constant, appelé <strong>annuité</strong>, se décompose pourtant chaque année différemment en deux parties :</p>\n<ul>\n<li>les <strong>intérêts</strong>, qui rémunèrent la banque pour le service rendu — ils sont calculés sur le capital restant dû, donc ils diminuent au fil du temps ;</li>\n<li>l''<strong>amortissement du capital</strong>, c''est-à-dire la part de l''annuité qui rembourse réellement le capital emprunté — elle augmente donc au fil du temps, puisque l''annuité totale reste fixe.</li>\n</ul>\n<p><em>Attention au vocabulaire :</em> ce mot « amortissement » désigne ici le remboursement progressif d''un capital emprunté. C''est un sens différent de l''amortissement d''un investissement (la répartition de son coût sur plusieurs années), vu dans la section suivante — les deux notions ne doivent pas être confondues, même si elles partagent le même nom.</p>\n<h4>Formule de l''annuité constante</h4>\n<p>A = C × [ i / (1 − (1+i)<sup>-n</sup>) ]</p>\n<p>où A = annuité (montant versé à chaque période), C = capital emprunté, i = taux d''intérêt par période, n = nombre de périodes.</p>\n<h4>Exemple chiffré</h4>\n<p>Une start-up emprunte 10 000 € sur 3 ans, à un taux fixe de 5 % par an. Le calcul donne une annuité d''environ <strong>3 672,09 €</strong> par an. Le tableau d''amortissement (au sens du remboursement du prêt) détaille l''évolution de chaque part :</p>\n<table>\n<tr><th>Année</th><th>Capital début</th><th>Intérêts (5 %)</th><th>Amortissement du capital</th><th>Annuité</th><th>Capital restant dû</th></tr>\n<tr><td>1</td><td>10 000,00 €</td><td>500,00 €</td><td>3 172,09 €</td><td>3 672,09 €</td><td>6 827,91 €</td></tr>\n<tr><td>2</td><td>6 827,91 €</td><td>341,40 €</td><td>3 330,69 €</td><td>3 672,09 €</td><td>3 497,22 €</td></tr>\n<tr><td>3</td><td>3 497,22 €</td><td>174,86 €</td><td>3 497,22 €</td><td>3 672,09 €</td><td>0,00 €</td></tr>\n</table>\n<p>On observe bien que les intérêts diminuent chaque année (174,86 € en année 3, contre 500,00 € en année 1) alors que la part de capital remboursé augmente (3 497,22 € en année 3, contre 3 172,09 € en année 1), pour un total identique à chaque fois : 3 672,09 €.</p>\n<p>Pour le business plan, cette distinction est essentielle : <strong>seuls les intérêts constituent une charge</strong> qui réduit le résultat de l''entreprise. Le remboursement du capital n''est pas une charge : il diminue simplement la dette et la trésorerie disponible.</p>\n<h4>Fonctions Excel utiles</h4>\n<p>Ces fonctions calculent automatiquement l''annuité, sans avoir à taper la formule mathématique :</p>\n<table>\n<tr><th>Calcul</th><th>Français</th><th>English</th><th>Deutsch</th></tr>\n<tr><td>Annuité</td><td>=VPM(taux;nb_périodes;-capital)</td><td>=PMT(rate,nper,-pv)</td><td>=RMZ(zins;zzr;-bw)</td></tr>\n<tr><td>Part d''intérêts d''une période</td><td>=INTPER</td><td>=IPMT</td><td>=ZINSZ</td></tr>\n<tr><td>Part de capital d''une période</td><td>=PRINCPER</td><td>=PPMT</td><td>=KAPZ</td></tr>\n</table>\n<p>Le nom exact de certaines fonctions peut varier selon la langue et la version d''Excel installée ; l''essentiel est de comprendre la logique du tableau, que vous pourrez toujours reconstruire manuellement si besoin.</p>\n<p><em>[Vidéo à insérer ici : animation ou tutoriel expliquant visuellement la décomposition d''une annuité constante en intérêts et amortissement du capital, avec un exemple à l''écran]</em></p>"}'::jsonb, 1, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '145eb5b2-81ed-4599-904a-a70ba08815a0', 'cf7b116a-3b27-416e-9760-95b7956505e0', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Tableau de calcul — emprunt à annuités constantes', 'tableau_calcul', '<p>Une start-up emprunte 12 000 € sur 4 ans à un taux fixe de 4 %, remboursé par annuités constantes. Calculez l''annuité annuelle, puis le total des intérêts payés sur toute la durée du prêt.</p>',
    '{"champs":[{"id":"f1","label":"Annuité annuelle","type":"nombre","tolerance":0.5,"unite":"€","points":2},{"id":"f2","label":"Total des intérêts sur 4 ans","type":"nombre","tolerance":1,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":3305.88},"f2":{"valeur":1223.52}}}'::jsonb, 4, 0, '{"explication":"<p>Annuité = 12 000 × [0,04 / (1 − 1,04<sup>-4</sup>)] ≈ 3 305,88 €. Sur 4 ans, le total remboursé est de 4 × 3 305,88 = 13 223,52 €, dont 12 000 € de capital et donc 1 223,52 € d''intérêts au total.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'dea56068-ebaf-41d3-8ce1-968108148e9b', 'cf7b116a-3b27-416e-9760-95b7956505e0', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Vrai/Faux — évolution des intérêts', 'vrai_faux', '<p>Dans un emprunt à annuités constantes, la part des intérêts augmente chaque année.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : c''est l''inverse. Les intérêts sont calculés sur le capital restant dû, qui diminue au fil du remboursement — la part d''intérêts diminue donc chaque année, tandis que la part d''amortissement du capital augmente.</p>","feedback_faux":"<p>Réfléchissez à ce sur quoi les intérêts sont calculés : le capital restant dû augmente-t-il ou diminue-t-il au fil du temps ?</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '6d4c2106-3f6f-49e9-9fcd-e6ca080067a0', 'cf7b116a-3b27-416e-9760-95b7956505e0', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Choix unique — charge liée à l''emprunt', 'choix_unique', '<p>Dans le résultat d''une entreprise, quel élément d''une annuité de remboursement constitue une charge ?</p>',
    '["Uniquement les intérêts","Uniquement l''amortissement du capital","L''annuité entière (intérêts + capital)","Aucun des deux : un emprunt n''a jamais d''impact sur le résultat"]'::jsonb, '{"index":0}'::jsonb, 1, 2, '{"explication":"<p>Seuls les intérêts sont une charge qui réduit le résultat. Le remboursement du capital emprunté diminue la dette et la trésorerie, mais n''est pas une charge comptable.</p>"}'::jsonb
  );

  -- Section 3 : Investissement, charge et amortissement (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '676062da-9d4a-4674-8a82-a248c21f7f01', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Investissement, charge et amortissement', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Toutes les dépenses d''une entreprise ne sont pas de même nature. Savoir distinguer une <strong>charge</strong> d''un <strong>investissement</strong> est indispensable pour construire un plan financier réaliste.</p>"},{"type":"definition","html":"<p>Une <strong>charge</strong> correspond à une ressource consommée dans le fonctionnement courant de l''entreprise, sur une courte période : publicité, abonnement logiciel, électricité, fournitures. Son coût est imputé entièrement à l''année où elle est engagée.</p>"},{"type":"definition","html":"<p>Un <strong>investissement</strong> correspond à un bien ou un droit durable, utilisé pendant plusieurs exercices (ordinateur, caméra, site web...). Pour refléter correctement le résultat de chaque année, son coût n''est pas imputé en une seule fois : il est réparti sur sa durée d''utilisation. Cette répartition s''appelle l''<strong>amortissement</strong>.</p>"},{"type":"exemple","html":"<p>Une start-up achète un ordinateur à 1 500 € HT, utilisé pendant 3 ans. Elle l''amortit linéairement, c''est-à-dire par parts égales : 1 500 / 3 = <strong>500 € d''amortissement par an</strong>. L''entreprise a bien payé 1 500 € d''un coup à l''achat, mais le résultat de chaque année ne supporte que 500 € : c''est précisément ce qui explique que le résultat comptable et la trésorerie ne soient jamais tout à fait identiques.</p>"},{"type":"definition","html":"<p><strong>Particularité fiscale luxembourgeoise — les biens de faible valeur :</strong> même un bien destiné à être utilisé pendant plusieurs années peut être passé intégralement en charge de l''année d''achat, à condition que son prix d''acquisition HT ne dépasse pas <strong>870 €</strong> par bien (seuil fixé par l''administration fiscale luxembourgeoise ; à vérifier chaque année, car il peut évoluer) et que l''entreprise en soit à la fois propriétaire et utilisatrice.</p>"},{"type":"exemple","html":"<p>Un stabilisateur pour caméra à 650 € HT, bien qu''utilisé pendant plusieurs années, peut être passé intégralement en charge de l''année d''achat, car son prix est inférieur à 870 €. À l''inverse, une caméra professionnelle à 2 200 € HT dépasse ce seuil : elle doit, elle, être amortie sur sa durée d''utilisation.</p>"},{"type":"liste","items":["Matériel informatique : environ 3 ans","Logiciels et développements immobilisés : 3 à 5 ans","Matériel audiovisuel (caméra, éclairage...) : 3 à 5 ans","Mobilier de bureau : 5 à 10 ans","Véhicule : environ 5 ans"]},{"type":"texte","html":"<p>Ces durées sont des repères pédagogiques indicatifs : dans la réalité, la durée retenue doit refléter la durée probable d''utilisation du bien, ainsi que les règles applicables à l''entreprise.</p>"}]}'::jsonb, 2, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'b1e3dd32-46e2-4399-bdd0-c47a6da27a19', '676062da-9d4a-4674-8a82-a248c21f7f01', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Catégorisation — charge ou investissement', 'categorisation', '<p>Classez chaque dépense selon qu''il s''agit d''une charge ou d''un investissement (amorti).</p>',
    '{"items":[{"id":"i1","label":"Achat d''un ordinateur portable (1 300 € HT)"},{"id":"i2","label":"Abonnement mensuel à Adobe Creative Cloud"},{"id":"i3","label":"Campagne publicitaire Instagram"},{"id":"i4","label":"Achat d''une caméra professionnelle (2 200 € HT)"},{"id":"i5","label":"Achat de mobilier de bureau (1 800 € HT)"},{"id":"i6","label":"Achat d''un stabilisateur vidéo (650 € HT), utilisé pendant plusieurs années"}],"categories":[{"id":"c1","label":"Charge"},{"id":"c2","label":"Investissement (amorti)"}]}'::jsonb, '{"placements":{"i1":"c2","i2":"c1","i3":"c1","i4":"c2","i5":"c2","i6":"c1"}}'::jsonb, 6, 0, '{"explication":"<p>Un ordinateur (1 300 €), une caméra professionnelle (2 200 €) et du mobilier (1 800 €) dépassent le seuil de 870 € HT : ce sont des investissements, amortis dans le temps. Un abonnement mensuel et une campagne publicitaire ponctuelle sont des charges consommées immédiatement. Le stabilisateur vidéo, bien qu''utilisé sur plusieurs années, reste une charge : à 650 € HT, il est sous le seuil des biens de faible valeur (870 €) et peut donc être passé intégralement en charge de l''année d''achat.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '146c86f7-0543-42ec-a1c4-4ebda37e4468', '676062da-9d4a-4674-8a82-a248c21f7f01', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Vrai/Faux — seuil des biens de faible valeur', 'vrai_faux', '<p>Au Luxembourg, un bien destiné à être utilisé pendant plusieurs années doit toujours être amorti, quel que soit son prix d''achat.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : si le prix d''acquisition HT du bien ne dépasse pas 870 € (bien de faible valeur, dont l''entreprise est à la fois propriétaire et utilisatrice), il peut être passé intégralement en charge de l''année d''achat, même s''il sert plusieurs années.</p>","feedback_faux":"<p>Relisez la règle des biens de faible valeur ci-dessus : à partir de quel prix un bien doit-il obligatoirement être amorti ?</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '393a9d66-5ffc-48a6-8461-b3bda0a027b9', '676062da-9d4a-4674-8a82-a248c21f7f01', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Réponse numérique — amortissement linéaire', 'reponse_numerique', '<p>Une entreprise achète un drone professionnel à 2 400 € HT, qu''elle prévoit d''utiliser pendant 4 ans. Quel est le montant de l''amortissement linéaire annuel ?</p>',
    '[]'::jsonb, '{"valeur":600,"tolerance":0,"unite":"€"}'::jsonb, 2, 2, '{"explication":"<p>Amortissement annuel = Valeur du bien / Durée d''utilisation = 2 400 / 4 = 600 € par an.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'f52daa83-8045-4881-bfe3-36ed0907fd04', '676062da-9d4a-4674-8a82-a248c21f7f01', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Réponse numérique — amortissement imputé à un événement', 'reponse_numerique', '<p>Une agence événementielle possède du matériel audiovisuel d''une valeur de 18 000 € HT, amorti en bloc sur 5 ans (soit 60 mois, décompte par mois entiers). Ce matériel est immobilisé pendant 4 jours pour un événement (on considère un mois de 30 jours). Quel est le coût d''amortissement à imputer à cet événement ?</p>',
    '[]'::jsonb, '{"valeur":40,"tolerance":1,"unite":"€"}'::jsonb, 3, 3, '{"explication":"<p>Amortissement mensuel = 18 000 / 60 = 300 € par mois, soit 300 / 30 = 10 € par jour. Sur 4 jours, le coût imputable à l''événement est de 10 × 4 = 40 €.</p>"}'::jsonb
  );

  -- Section 4 : Marge commerciale et taux de marge (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'f93ed324-371c-4788-861c-b77d26558bb3', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Marge commerciale et taux de marge', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Pour une activité d''achat-revente, la <strong>marge commerciale</strong> mesure ce que l''entreprise conserve entre le prix auquel elle vend un produit et le prix auquel elle l''a acheté. C''est cette marge qui doit ensuite couvrir les autres charges de l''entreprise (loyer, personnel, communication...) avant de dégager un bénéfice.</p>"},{"type":"definition","html":"<p>La <strong>marge commerciale</strong> est la différence entre le prix de vente hors taxes et le coût d''achat hors taxes d''un produit. Le <strong>taux de marge</strong> exprime cette marge en pourcentage du coût d''achat.</p>"},{"type":"formule","items":["Marge commerciale = Prix de vente HT − Coût d''achat HT","Taux de marge = (Marge commerciale / Coût d''achat HT) × 100"]},{"type":"exemple","html":"<p>Un produit acheté 80 € HT et revendu 120 € HT génère une marge commerciale de 120 − 80 = <strong>40 €</strong>. Le taux de marge est alors de 40 / 80 = <strong>50 %</strong> : pour chaque euro dépensé à l''achat, l''entreprise dégage 0,50 € de marge.</p>"},{"type":"texte","html":"<p><strong>Attention à ne pas confondre</strong> le taux de marge (rapporté au coût d''achat) avec le <strong>taux de marque</strong>, une notion voisine mais différente qui rapporte la marge au prix de vente et non au coût d''achat. Dans ce cours, seul le taux de marge est utilisé.</p>"}]}'::jsonb, 3, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '212b68ca-fd74-4d06-8b86-08c71c457ec7', 'f93ed324-371c-4788-861c-b77d26558bb3', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Tableau de calcul — marge commerciale et taux de marge', 'tableau_calcul', '<p>Un service numérique est acheté (coût de revient) 48 € HT et revendu 75 € HT. L''entreprise en vend 400 exemplaires par mois. Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Marge commerciale unitaire","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Taux de marge","type":"nombre","tolerance":0.1,"unite":"%","points":2},{"id":"f3","label":"Marge commerciale totale (400 unités)","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":27},"f2":{"valeur":56.25},"f3":{"valeur":10800}}}'::jsonb, 5, 0, '{"explication":"<p>Marge unitaire = 75 − 48 = 27 €. Taux de marge = (27 / 48) × 100 = 56,25 %. Marge totale = 27 × 400 = 10 800 €.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'ea86537f-d578-4fd4-beeb-51b52eb27bcd', 'f93ed324-371c-4788-861c-b77d26558bb3', '1fee8131-253a-4241-ab33-bd13b6c93eb6', 'Vrai/Faux — taux de marge vs taux de marque', 'vrai_faux', '<p>Le taux de marge et le taux de marque désignent exactement le même calcul.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : le taux de marge rapporte la marge au coût d''achat, tandis que le taux de marque la rapporte au prix de vente. Les deux calculs donnent des résultats différents pour les mêmes chiffres.</p>","feedback_faux":"<p>Relisez la définition du taux de marge ci-dessus : à quoi la marge est-elle rapportée ?</p>"}'::jsonb
  );


-- Chapitre 3/7 : Principes comptables de base utiles au business plan
insert into chapitres (id, titre_fr, emoji, description_fr, filieres, matiere_ids, ordre) values (
  '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Principes comptables de base utiles au business plan', '🧾', 'TVA neutre pour l''entreprise, réductions de prix (RRR, escompte), et distinction entre résultat, cash-flow et trésorerie — les bases comptables indispensables pour chiffrer un business plan sans avoir de cours de comptabilité.',
  array['BTS'], array['29a8e347-0610-4180-b86c-e8715c44fd25']::uuid[], 2
);

  -- Section 1 : La TVA : un impôt neutre pour l'entreprise (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '40efc832-0fca-4785-a691-0e42df28d259', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'La TVA : un impôt neutre pour l''entreprise', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>La <strong>Taxe sur la Valeur Ajoutée (TVA)</strong> est un impôt sur la consommation, payé au final par le client, et non par l''entreprise. Pour une entreprise assujettie qui a le droit à déduction, la TVA est en principe <strong>neutre</strong> : elle n''influence ni le résultat, ni la rentabilité.</p>"},{"type":"definition","html":"<p>L''entreprise agit comme <strong>collecteur d''impôt</strong> pour l''État : elle collecte la TVA sur ses ventes (<strong>TVA collectée</strong>), récupère la TVA payée sur ses achats (<strong>TVA déductible</strong>), et reverse à l''État uniquement la différence entre les deux.</p>"},{"type":"exemple","html":"<p>Une prestation est vendue 1 000 € HT avec 17 % de TVA : le client paie 1 170 € TTC, mais le chiffre d''affaires de l''entreprise n''est que de 1 000 €. Si l''entreprise achète au même moment un bien pour 800 € HT (+ 136 € de TVA), elle a collecté 170 € et dispose de 136 € de TVA déductible. Le solde à reverser à l''État est de 170 − 136 = <strong>34 €</strong>.</p>"},{"type":"definition","html":"<p>Il arrive qu''une jeune entreprise, en particulier au démarrage, paie plus de TVA sur ses achats qu''elle n''en collecte sur ses ventes : elle dispose alors d''un <strong>crédit de TVA</strong>. Selon les règles applicables, ce crédit peut être reporté sur les périodes suivantes ou faire l''objet d''une demande de remboursement.</p>"},{"type":"exemple","html":"<p>TVA collectée : 500 €. TVA déductible : 1 200 €. L''entreprise dispose d''un crédit de TVA de 1 200 − 500 = <strong>700 €</strong>, que l''État lui doit. Ce remboursement constitue une entrée de trésorerie, mais <strong>jamais un produit</strong> (un revenu) : c''est la récupération d''une taxe déjà payée.</p>"},{"type":"liste","items":["17 % — taux normal : nombreux biens et services courants, prestations numériques","14 % — taux intermédiaire : certaines catégories prévues par la législation","8 % — taux réduit : certaines catégories spécifiques","3 % — taux super-réduit : notamment certains biens essentiels, livres et presse"]},{"type":"texte","html":"<p>Pour le business plan, retenez surtout ceci : le <strong>chiffre d''affaires prévisionnel</strong> et les <strong>charges</strong> du compte de résultat s''expriment normalement <strong>hors taxes (HT)</strong>, puisque la TVA n''appartient jamais à l''entreprise. Le plan de trésorerie, lui, doit suivre les montants réellement encaissés et décaissés, donc souvent en TTC.</p>"}]}'::jsonb, 0, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'a3ebb2be-a9a4-403f-83dd-8037d07bb857', '40efc832-0fca-4785-a691-0e42df28d259', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Tableau de calcul — TVA collectée, déductible, à reverser', 'tableau_calcul', '<p>Une start-up facture une prestation de 2 500 € HT (TVA 17 %) et achète, la même période, du matériel pour 1 000 € HT (TVA 17 %). Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"TVA collectée","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"TVA déductible","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f3","label":"TVA à reverser à l''État","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":425},"f2":{"valeur":170},"f3":{"valeur":255}}}'::jsonb, 4, 0, '{"explication":"<p>TVA collectée = 2 500 × 17 % = 425 €. TVA déductible = 1 000 × 17 % = 170 €. TVA à reverser = 425 − 170 = 255 €.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'd73deb7a-c988-4006-89a5-b35918cb8f55', '40efc832-0fca-4785-a691-0e42df28d259', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Vrai/Faux — TVA et chiffre d''affaires', 'vrai_faux', '<p>La TVA collectée auprès des clients fait partie du chiffre d''affaires de l''entreprise.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : la TVA collectée n''appartient pas à l''entreprise, elle est simplement encaissée pour le compte de l''État puis reversée (après déduction de la TVA déjà payée aux fournisseurs). Le chiffre d''affaires se raisonne toujours hors taxes.</p>","feedback_faux":"<p>Qui, au final, reçoit l''argent de la TVA collectée ?</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '82c04396-fe44-41c4-8d80-6f3c7a06d56e', '40efc832-0fca-4785-a691-0e42df28d259', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Choix unique — remboursement de crédit de TVA', 'choix_unique', '<p>Une entreprise reçoit de l''administration fiscale le remboursement d''un crédit de TVA de 700 €. Comment ce montant doit-il être traité dans le business plan ?</p>',
    '["Comme un produit (revenu) de 700 €","Comme une entrée de trésorerie, mais pas comme un produit","Comme une charge financière","Il ne doit apparaître nulle part, ni en résultat ni en trésorerie"]'::jsonb, '{"index":1}'::jsonb, 2, 2, '{"explication":"<p>Le remboursement d''un crédit de TVA est une entrée d''argent réelle (trésorerie), mais ce n''est jamais un produit : il s''agit simplement de la récupération d''une taxe que l''entreprise avait déjà payée à ses fournisseurs.</p>"}'::jsonb
  );

  -- Section 2 : Les réductions de prix : RRR et escompte (editeur)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '12a013cf-48cf-4a8f-a0d8-419eb35c3553', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Les réductions de prix : RRR et escompte', 'editeur',
    '{"html":"<p>Dans la pratique commerciale, une entreprise accorde parfois des réductions de prix à ses clients. Ces réductions diminuent le prix net facturé, mais elles n''ont <strong>pas d''impact particulier sur le résultat</strong> dès lors qu''elles sont correctement intégrées au chiffre d''affaires net retenu dans le business plan.</p>\n<table>\n<tr><th>Type de réduction</th><th>Signification</th><th>Moment d''application</th></tr>\n<tr><td>Rabais</td><td>Réduction exceptionnelle accordée (défaut, erreur, geste commercial)</td><td>Avant ou après la facturation</td></tr>\n<tr><td>Remise</td><td>Réduction habituelle liée au volume ou à la fidélité du client</td><td>Dès la facture</td></tr>\n<tr><td>Ristourne</td><td>Réduction calculée sur le total des achats d''une période</td><td>Après la facturation, en fin de période</td></tr>\n<tr><td>Escompte</td><td>Réduction financière accordée en contrepartie d''un paiement anticipé</td><td>Au moment du règlement</td></tr>\n</table>\n<p>Les trois premières (rabais, remise, ristourne) sont regroupées sous le sigle <strong>RRR</strong>. L''escompte, lui, est de nature différente : ce n''est pas une réduction commerciale mais une réduction <strong>financière</strong>, liée à la rapidité du paiement.</p>\n<h4>Exemple chiffré : du prix brut au prix TTC</h4>\n<table>\n<tr><th>Étape</th><th>Calcul</th><th>Montant</th></tr>\n<tr><td>Prix brut HT</td><td>—</td><td>1 000,00 €</td></tr>\n<tr><td>− Remise 10 %</td><td>1 000 × 10 %</td><td>−100,00 €</td></tr>\n<tr><td>= Net commercial</td><td>—</td><td>900,00 €</td></tr>\n<tr><td>− Escompte 2 %</td><td>900 × 2 %</td><td>−18,00 €</td></tr>\n<tr><td>= Net financier HT</td><td>—</td><td>882,00 €</td></tr>\n</table>\n<p><strong>Remarque importante :</strong> les RRR et l''escompte sont déjà intégrés dans ce prix net HT. Le business plan doit donc toujours raisonner à partir de ce prix net réaliste, et non du prix catalogue brut : si un rabais de 10 % est accordé systématiquement, la prévision de chiffre d''affaires doit partir directement du prix net.</p>"}'::jsonb, 1, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '3d5a8220-16c5-4f5d-90bd-c57a0e2a0187', '12a013cf-48cf-4a8f-a0d8-419eb35c3553', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Tableau de calcul — du prix brut au prix TTC', 'tableau_calcul', '<p>Un développeur facture une prestation à 2 000 € HT (prix brut). Il accorde une remise commerciale de 15 %, et le client paie comptant ce qui donne droit à un escompte de 3 %. Le taux de TVA applicable est 17 %. Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Net commercial (après remise)","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Net financier HT (après escompte)","type":"nombre","tolerance":0.5,"unite":"€","points":2},{"id":"f3","label":"Prix TTC","type":"nombre","tolerance":0.5,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":1700},"f2":{"valeur":1649},"f3":{"valeur":1929.33}}}'::jsonb, 5, 0, '{"explication":"<p>Net commercial = 2 000 × (1 − 15 %) = 1 700 €. Net financier HT = 1 700 × (1 − 3 %) = 1 649 €. TVA = 1 649 × 17 % = 280,33 €. Prix TTC = 1 649 + 280,33 = 1 929,33 €.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '51c9c2b0-58d3-4097-98a0-387a19aedd5a', '12a013cf-48cf-4a8f-a0d8-419eb35c3553', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Association — types de réductions', 'glisser_deposer', '<p>Associez chaque type de réduction à sa description.</p>',
    '[{"gauche":"Remise","droite":"Réduction habituelle liée au volume ou à la fidélité"},{"gauche":"Ristourne","droite":"Réduction calculée sur le total des achats d''une période"},{"gauche":"Escompte","droite":"Réduction accordée pour un paiement anticipé"}]'::jsonb, '[{"gauche":"Remise","droite":"Réduction habituelle liée au volume ou à la fidélité"},{"gauche":"Ristourne","droite":"Réduction calculée sur le total des achats d''une période"},{"gauche":"Escompte","droite":"Réduction accordée pour un paiement anticipé"}]'::jsonb, 3, 1, '{"explication":"<p>La remise est habituelle et liée au volume ou à la fidélité ; la ristourne se calcule après coup sur le cumul d''une période ; l''escompte, de nature financière, récompense un paiement rapide.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '65844f8a-d93f-4b4f-83c3-4cd2198f566d', '12a013cf-48cf-4a8f-a0d8-419eb35c3553', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Vrai/Faux — remise et prévision de chiffre d''affaires', 'vrai_faux', '<p>Si une entreprise accorde systématiquement une remise de 10 %, le business plan doit prévoir le chiffre d''affaires à partir du prix catalogue brut, puis soustraire la remise chaque mois séparément.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 2, '{"explication":"<p>Faux : dans un business plan réaliste, on part directement du prix net déjà réduit (le prix réellement facturé), et non du prix catalogue brut. Compter la remise une seconde fois reviendrait à la déduire deux fois.</p>","feedback_faux":"<p>Relisez la remarque importante à la fin de la section : de quel prix faut-il partir pour prévoir le chiffre d''affaires ?</p>"}'::jsonb
  );

  -- Section 3 : Résultat, cash-flow et trésorerie (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '3cce2f61-1a43-483e-9ce7-8f45d79fbc6e', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Résultat, cash-flow et trésorerie', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Deux notions sont souvent confondues alors qu''elles mesurent des choses différentes : le <strong>résultat</strong>, qui mesure la performance économique, et la <strong>trésorerie</strong>, qui mesure l''argent réellement disponible sur les comptes.</p>"},{"type":"definition","html":"<p>Le <strong>résultat</strong> est la différence entre les produits et les charges d''une période : Résultat = Produits − Charges. Il mesure la rentabilité théorique de l''activité, mais certaines charges (comme l''amortissement) ne correspondent à aucune sortie d''argent immédiate.</p>"},{"type":"definition","html":"<p>Le <strong>cash-flow</strong> (flux de trésorerie) mesure la capacité réelle de l''entreprise à générer de la liquidité. Dans une approche simplifiée, on l''obtient en réintégrant au résultat les charges qui n''ont donné lieu à aucune sortie d''argent, et en tenant compte des produits pas encore encaissés : Cash-flow ≈ Résultat + Charges non décaissées (ex. amortissements) − Produits non encaissés.</p>"},{"type":"exemple","html":"<p>Une entreprise réalise un résultat de 5 000 €, dont 2 000 € d''amortissement (une charge non décaissée). Son cash-flow s''approche donc de 5 000 + 2 000 = <strong>7 000 €</strong> : l''entreprise dispose réellement de plus de trésorerie que son résultat comptable ne le laisse penser. Attention cependant à ne pas confondre ce calcul simplifié avec le solde bancaire réel : un investissement, un remboursement d''emprunt ou un décalage de paiement clients modifient aussi la trésorerie.</p>"},{"type":"texte","html":"<p>Cette distinction explique pourquoi une entreprise peut être <strong>rentable sur le papier mais manquer de liquidités</strong> (si ses clients paient très tard), ou au contraire disposer de beaucoup de trésorerie sans être encore rentable (grâce à un emprunt ou un apport récent).</p>"}]}'::jsonb, 2, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '5045ef85-454f-41cd-9145-18367e048876', '3cce2f61-1a43-483e-9ce7-8f45d79fbc6e', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Réponse numérique — calcul du cash-flow', 'reponse_numerique', '<p>Une entreprise réalise un résultat comptable de 12 000 €. Elle a enregistré 4 000 € d''amortissement (charge non décaissée) et une créance client de 1 000 € pas encore encaissée. Calculez le cash-flow.</p>',
    '[]'::jsonb, '{"valeur":15000,"tolerance":0,"unite":"€"}'::jsonb, 2, 0, '{"explication":"<p>Cash-flow ≈ Résultat + Charges non décaissées − Produits non encaissés = 12 000 + 4 000 − 1 000 = 15 000 €.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '32f2cfd0-ed3c-4070-960b-932aaccead31', '3cce2f61-1a43-483e-9ce7-8f45d79fbc6e', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Catégorisation — impact sur le résultat ou sur la trésorerie', 'categorisation', '<p>Classez chaque opération selon qu''elle affecte le résultat de l''entreprise, ou seulement sa trésorerie.</p>',
    '{"items":[{"id":"i1","label":"Achat comptant d''un ordinateur destiné à être amorti"},{"id":"i2","label":"Dotation annuelle à l''amortissement de cet ordinateur"},{"id":"i3","label":"Remboursement du capital d''un emprunt"},{"id":"i4","label":"Paiement des intérêts d''un emprunt"}],"categories":[{"id":"c1","label":"Affecte le résultat (charge)"},{"id":"c2","label":"N''affecte pas le résultat (seulement la trésorerie)"}]}'::jsonb, '{"placements":{"i1":"c2","i2":"c1","i3":"c2","i4":"c1"}}'::jsonb, 4, 1, '{"explication":"<p>L''achat d''un investissement et le remboursement du capital d''un emprunt sont des sorties de trésorerie mais pas des charges. L''amortissement (répartition du coût de l''investissement dans le temps) et les intérêts de l''emprunt sont, eux, de véritables charges qui réduisent le résultat.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'eacff279-7e0e-47f9-8fe7-1b30cd0b1202', '3cce2f61-1a43-483e-9ce7-8f45d79fbc6e', '209300d3-2c35-4a46-9a1d-f96b0687f9d7', 'Vrai/Faux — rentabilité et trésorerie', 'vrai_faux', '<p>Une entreprise rentable (résultat positif) dispose toujours d''assez de trésorerie pour payer ses factures.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 2, '{"explication":"<p>Faux : le résultat et la trésorerie sont deux notions différentes. Une entreprise peut être rentable sur le papier tout en manquant de liquidités, par exemple si ses clients paient très tardivement ou si elle vient de réaliser un investissement important.</p>","feedback_faux":"<p>Une vente facturée aujourd''hui mais payée dans 30 jours affecte-t-elle le résultat et la trésorerie au même moment ?</p>"}'::jsonb
  );


-- Chapitre 4/7 : Productivité et rentabilité
insert into chapitres (id, titre_fr, emoji, description_fr, filieres, matiere_ids, ordre) values (
  '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Productivité et rentabilité', '📈', 'Mesurez la productivité, séparez charges variables et fixes, calculez le résultat différentiel, le seuil de rentabilité et la marge de sécurité de votre projet.',
  array['BTS'], array['29a8e347-0610-4180-b86c-e8715c44fd25']::uuid[], 3
);

  -- Section 1 : Productivité : notion et calcul (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '543bfcab-b472-41a3-aa03-cc202c91aecc', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Productivité : notion et calcul', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>La <strong>productivité</strong> mesure l''efficacité avec laquelle une organisation transforme des ressources en production. Elle peut se calculer en unités physiques, en chiffre d''affaires ou en valeur ajoutée, selon l''objectif de l''analyse.</p>"},{"type":"formule","items":["Productivité = Production / Quantité de ressources utilisées"]},{"type":"exemple","html":"<p>Une agence digitale réalise 40 sites web avec 4 salariés, soit 10 sites par salarié. L''année suivante, elle réalise 48 sites avec le même effectif : la productivité passe à 12 sites par salarié, soit une progression de <strong>20 %</strong>. Cette amélioration peut venir de meilleurs outils, de l''automatisation, de la formation, ou d''une meilleure organisation.</p>"},{"type":"texte","html":"<p>Une hausse de productivité peut profiter à l''entreprise (baisse du coût unitaire, hausse de la capacité), aux salariés (meilleures conditions ou rémunérations) et aux clients (prix, délais ou services améliorés). Elle ne doit toutefois jamais être recherchée au détriment de la qualité ou des conditions de travail.</p>"}]}'::jsonb, 0, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '6b2107a3-fa05-45d2-9c55-4f4782f9d5b9', '543bfcab-b472-41a3-aa03-cc202c91aecc', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Tableau de calcul — évolution de la productivité', 'tableau_calcul', '<p>Une équipe de 6 monteurs vidéo produit 300 vidéos par an. L''année suivante, l''équipe passe à 7 monteurs et produit 385 vidéos. Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Productivité année 1 (vidéos/monteur)","type":"nombre","tolerance":0,"unite":"","points":1},{"id":"f2","label":"Productivité année 2 (vidéos/monteur)","type":"nombre","tolerance":0,"unite":"","points":1},{"id":"f3","label":"Évolution de la productivité","type":"nombre","tolerance":0.5,"unite":"%","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":50},"f2":{"valeur":55},"f3":{"valeur":10}}}'::jsonb, 4, 0, '{"explication":"<p>Productivité année 1 = 300 / 6 = 50 vidéos par monteur. Productivité année 2 = 385 / 7 = 55 vidéos par monteur. Évolution = (55 − 50) / 50 × 100 = 10 %.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '91915ce7-73b8-4625-9734-0619dd27786f', '543bfcab-b472-41a3-aa03-cc202c91aecc', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'QCM — bénéficiaires d''une hausse de productivité', 'qcm', '<p>Une hausse de productivité peut profiter à...</p>',
    '["L''entreprise, par une baisse du coût unitaire ou une hausse de sa capacité","Les salariés, par de meilleures conditions ou rémunérations","Les clients, par des prix, délais ou services améliorés","Personne : la productivité n''a d''effet que sur les actionnaires"]'::jsonb, '[0,1,2]'::jsonb, 3, 1, '{"explication":"<p>Une hausse de productivité peut bénéficier à la fois à l''entreprise (coûts, capacité), aux salariés (conditions, rémunération) et aux clients (prix, délais, qualité de service) — à condition qu''elle ne se fasse pas au détriment de la qualité ou des conditions de travail.</p>"}'::jsonb
  );

  -- Section 2 : Charges variables, charges fixes et résultat différentiel (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'afe9b03f-60c2-4b53-98d7-9c07b61f25be', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Charges variables, charges fixes et résultat différentiel', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Pour analyser la rentabilité d''une activité, on sépare les charges selon leur comportement face au niveau d''activité.</p>"},{"type":"definition","html":"<p>Les <strong>charges variables (CV)</strong> évoluent avec le niveau d''activité : matières premières consommées, commissions sur ventes, ou certains frais directement liés à chaque unité vendue ou produite.</p>"},{"type":"definition","html":"<p>Les <strong>charges fixes (CF)</strong> ne dépendent pas directement du nombre d''unités vendues à court terme : loyer, certains abonnements, salaires fixes. Une charge n''est pas fixe « pour toujours » : elle est considérée comme fixe dans une plage d''activité et une période données.</p>"},{"type":"formule","items":["Marge sur coût variable (MCV) = Chiffre d''affaires (CA) − Charges variables (CV)","Résultat différentiel = MCV − Charges fixes (CF)","Taux de MCV = (MCV / CA) × 100"]},{"type":"exemple","html":"<p>Une entreprise réalise un chiffre d''affaires de 120 000 €, avec 60 000 € de charges variables et 45 000 € de charges fixes. MCV = 120 000 − 60 000 = 60 000 €, soit un taux de MCV de 60 000 / 120 000 = <strong>50 %</strong>. Résultat différentiel = 60 000 − 45 000 = <strong>15 000 €</strong> : chaque euro de chiffre d''affaires apporte donc, en moyenne, 0,50 € à la couverture des charges fixes puis au bénéfice.</p>"}]}'::jsonb, 1, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '6a8c8371-cb57-487b-8f4a-79d9c6c05338', 'afe9b03f-60c2-4b53-98d7-9c07b61f25be', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Catégorisation — charges fixes ou variables', 'categorisation', '<p>Classez chaque charge d''une agence événementielle selon sa nature.</p>',
    '{"items":[{"id":"i1","label":"Location de la salle pour l''événement"},{"id":"i2","label":"Repas par participant"},{"id":"i3","label":"Commission de billetterie par billet vendu"},{"id":"i4","label":"Frais de communication de l''événement"}],"categories":[{"id":"c1","label":"Charge fixe"},{"id":"c2","label":"Charge variable"}]}'::jsonb, '{"placements":{"i1":"c1","i2":"c2","i3":"c2","i4":"c1"}}'::jsonb, 4, 0, '{"explication":"<p>La location de salle et la communication sont engagées quel que soit le nombre de participants : ce sont des charges fixes. Le repas par participant et la commission par billet vendu augmentent avec le nombre de participants : ce sont des charges variables.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'a62aac42-0b58-43df-bea7-8f313996b1b4', 'afe9b03f-60c2-4b53-98d7-9c07b61f25be', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Tableau de calcul — résultat différentiel', 'tableau_calcul', '<p>Une entreprise de design graphique réalise un chiffre d''affaires de 80 000 €. Ses charges variables sont de 40 000 € et ses charges fixes de 35 000 €. Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Marge sur coût variable (MCV)","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Taux de MCV","type":"nombre","tolerance":0.1,"unite":"%","points":1},{"id":"f3","label":"Résultat différentiel","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":40000},"f2":{"valeur":50},"f3":{"valeur":5000}}}'::jsonb, 4, 1, '{"explication":"<p>MCV = 80 000 − 40 000 = 40 000 €. Taux de MCV = 40 000 / 80 000 × 100 = 50 %. Résultat différentiel = 40 000 − 35 000 = 5 000 €.</p>"}'::jsonb
  );

  -- Section 3 : Le seuil de rentabilité (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '9cc314bf-0c71-469c-9052-0d89dc9b8b94', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Le seuil de rentabilité', 'blocs',
    '{"blocks":[{"type":"definition","html":"<p>Le <strong>seuil de rentabilité (SR)</strong> est le niveau d''activité pour lequel le résultat différentiel est nul : à ce niveau, la marge sur coût variable couvre exactement les charges fixes. En dessous, l''entreprise est en perte ; au-dessus, elle dégage un bénéfice.</p>"},{"type":"formule","items":["Seuil de rentabilité en € = Charges fixes / Taux de MCV","MCV unitaire = Prix de vente unitaire − Coût variable unitaire","Seuil de rentabilité en quantité = Charges fixes / MCV unitaire"]},{"type":"exemple","html":"<p>Un événement vend des billets 40 € HT. Le coût variable par participant est de 10 € et les charges fixes s''élèvent à 12 000 €. La MCV unitaire est de 40 − 10 = 30 €. Il faut donc 12 000 / 30 = <strong>400 participants</strong> pour atteindre l''équilibre — cette méthode en quantité est particulièrement utile pour un événement ou un service vendu à l''unité.</p>"},{"type":"texte","html":"<p>Avec 45 000 € de charges fixes et un taux de MCV de 50 %, le seuil de rentabilité en euros serait de 45 000 / 0,50 = 90 000 € de chiffre d''affaires.</p>"}]}'::jsonb, 2, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '057c54a2-27ea-4761-a25d-3fd1d137ed21', '9cc314bf-0c71-469c-9052-0d89dc9b8b94', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Tableau de calcul — seuil de rentabilité (LuxCandles)', 'tableau_calcul', '<p>L''entreprise LuxCandles vend des bougies parfumées à 18,90 € HT pièce. Le coût variable unitaire (matières premières, emballage, main-d''œuvre, énergie) est estimé à 7,90 € par bougie. Les charges fixes mensuelles (loyer, salaires administratifs, amortissement, assurance) s''élèvent à 6 600 €. L''entreprise vend en moyenne 800 bougies par mois. Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Chiffre d''affaires mensuel (CA)","type":"nombre","tolerance":1,"unite":"€","points":1},{"id":"f2","label":"Marge sur coût variable (MCV) mensuelle","type":"nombre","tolerance":1,"unite":"€","points":2},{"id":"f3","label":"Résultat mensuel","type":"nombre","tolerance":1,"unite":"€","points":2},{"id":"f4","label":"Seuil de rentabilité (en nombre de bougies)","type":"nombre","tolerance":1,"unite":"bougies","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":15120},"f2":{"valeur":8800},"f3":{"valeur":2200},"f4":{"valeur":600}}}'::jsonb, 7, 0, '{"explication":"<p>CA = 800 × 18,90 = 15 120 €. MCV unitaire = 18,90 − 7,90 = 11,00 €, donc MCV mensuelle = 800 × 11,00 = 8 800 €. Résultat = 8 800 − 6 600 = 2 200 €. Seuil de rentabilité en quantité = 6 600 / 11,00 = 600 bougies par mois (soit un CA seuil de 600 × 18,90 = 11 340 €). L''entreprise, avec 800 bougies vendues, dépasse donc largement son seuil de rentabilité.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '9eab589d-dba6-437a-800a-5043d9845b41', '9cc314bf-0c71-469c-9052-0d89dc9b8b94', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Vrai/Faux — effet des charges fixes sur le SR', 'vrai_faux', '<p>Si une entreprise réduit ses charges fixes sans rien changer d''autre, son seuil de rentabilité diminue.</p>',
    '[]'::jsonb, 'true'::jsonb, 1, 1, '{"explication":"<p>Vrai : le seuil de rentabilité (Charges fixes / Taux de MCV) diminue mécaniquement lorsque les charges fixes diminuent, puisqu''il faut alors moins de chiffre d''affaires pour les couvrir.</p>","feedback_faux":"<p>Relisez la formule du seuil de rentabilité : les charges fixes sont au numérateur.</p>"}'::jsonb
  );

  -- Section 4 : La marge de sécurité (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '2ec7ce3d-6848-44c4-afba-f5ba3607be4e', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'La marge de sécurité', 'blocs',
    '{"blocks":[{"type":"definition","html":"<p>La <strong>marge de sécurité</strong> mesure de combien le chiffre d''affaires réel ou prévu dépasse le seuil de rentabilité. C''est un indicateur du risque de l''activité : plus elle est élevée, plus le projet dispose d''un coussin face à une baisse des ventes.</p>"},{"type":"formule","items":["Marge de sécurité = CA prévu − Seuil de rentabilité","Taux de marge de sécurité = (Marge de sécurité / CA prévu) × 100"]},{"type":"exemple","html":"<p>Si le CA prévu est de 150 000 € et le seuil de rentabilité de 120 000 €, la marge de sécurité est de 150 000 − 120 000 = <strong>30 000 €</strong>, soit 30 000 / 150 000 = <strong>20 %</strong> du CA. Cela signifie que le chiffre d''affaires pourrait diminuer d''environ 20 % avant que l''entreprise n''atteigne son seuil de rentabilité.</p>"}]}'::jsonb, 3, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'd61dd80d-5938-4b37-998f-f3cb85d8bbff', '2ec7ce3d-6848-44c4-afba-f5ba3607be4e', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Tableau de calcul — marge de sécurité', 'tableau_calcul', '<p>Une start-up prévoit un chiffre d''affaires de 200 000 € pour un seuil de rentabilité de 160 000 €. Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Marge de sécurité","type":"nombre","tolerance":0,"unite":"€","points":2},{"id":"f2","label":"Taux de marge de sécurité","type":"nombre","tolerance":0.1,"unite":"%","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":40000},"f2":{"valeur":20}}}'::jsonb, 4, 0, '{"explication":"<p>Marge de sécurité = 200 000 − 160 000 = 40 000 €. Taux de marge de sécurité = 40 000 / 200 000 × 100 = 20 %.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '360004df-6211-441a-973f-4033f5b65f47', '2ec7ce3d-6848-44c4-afba-f5ba3607be4e', '72836191-c0a4-46ea-bb24-9f6cf5977226', 'Choix unique — solidité face au risque', 'choix_unique', '<p>Entre deux projets ayant le même chiffre d''affaires prévu, lequel est le plus solide face à une baisse imprévue des ventes ?</p>',
    '["Celui qui a le taux de marge de sécurité le plus faible","Celui qui a le taux de marge de sécurité le plus élevé","Le taux de marge de sécurité n''a aucun rapport avec la solidité du projet","Celui qui a le seuil de rentabilité le plus élevé"]'::jsonb, '{"index":1}'::jsonb, 2, 1, '{"explication":"<p>Un taux de marge de sécurité élevé signifie que le chiffre d''affaires peut baisser fortement avant d''atteindre le seuil de rentabilité : le projet est donc plus solide face à une baisse imprévue des ventes.</p>"}'::jsonb
  );


-- Chapitre 5/7 : Coût du personnel et charges patronales
insert into chapitres (id, titre_fr, emoji, description_fr, filieres, matiere_ids, ordre) values (
  '83d710a0-a522-471b-b999-81a22d03857a', 'Coût du personnel et charges patronales', '🧑‍💼', 'Distinguez salaire brut, salaire net et coût employeur, et intégrez correctement le coût réel du personnel dans le budget prévisionnel de votre projet.',
  array['BTS'], array['29a8e347-0610-4180-b86c-e8715c44fd25']::uuid[], 4
);

  -- Section 1 : Le coût réel du personnel pour l'employeur (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'a240db12-9912-44cd-9c09-e2f179fe1027', '83d710a0-a522-471b-b999-81a22d03857a', 'Le coût réel du personnel pour l''employeur', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Dans un business plan, se contenter d''inscrire le salaire brut d''un futur salarié <strong>sous-estime</strong> son coût réel pour l''entreprise. En plus du salaire brut, l''employeur supporte différentes cotisations et charges patronales, qui doivent être budgétées séparément.</p>"},{"type":"definition","html":"<p>Le <strong>salaire brut</strong> est la rémunération convenue dans le contrat de travail, avant toute retenue. Les <strong>charges patronales</strong> sont les cotisations que l''employeur verse en plus de ce salaire brut (assurance sociale, autres contributions). Leur somme forme le <strong>coût employeur</strong> : ce que l''entreprise dépense réellement pour ce poste.</p>"},{"type":"formule","items":["Coût employeur ≈ Salaire brut + Charges patronales"]},{"type":"exemple","html":"<p>Si le salaire brut mensuel est de 4 000 € et que l''hypothèse de charges patronales retenue dans un exercice est de 13 %, le coût mensuel estimé pour l''employeur est de 4 000 × 1,13 = <strong>4 520 €</strong>. Sur douze mois, cela représente 54 240 €.</p>"},{"type":"texte","html":"<p><strong>Important :</strong> le taux exact de charges patronales dépend du statut du salarié et des règles en vigueur l''année considérée. Dans un exercice de business plan, utilisez toujours le taux fourni par votre enseignant ou les taux officiels actualisés — ne mémorisez jamais un pourcentage unique comme une vérité universelle et durable.</p>"}]}'::jsonb, 0, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '60936948-1be5-4618-a496-fb66dda2655e', 'a240db12-9912-44cd-9c09-e2f179fe1027', '83d710a0-a522-471b-b999-81a22d03857a', 'Tableau de calcul — coût employeur', 'tableau_calcul', '<p>Un poste est proposé avec un salaire brut mensuel de 3 500 €. L''hypothèse de charges patronales retenue pour cet exercice est de 12 %. Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Coût employeur mensuel","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Coût employeur annuel (12 mois)","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":3920},"f2":{"valeur":47040}}}'::jsonb, 3, 0, '{"explication":"<p>Coût employeur mensuel = 3 500 × 1,12 = 3 920 €. Coût employeur annuel = 3 920 × 12 = 47 040 €.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'd99dfc9a-8549-4b6b-b791-f9d6043be485', 'a240db12-9912-44cd-9c09-e2f179fe1027', '83d710a0-a522-471b-b999-81a22d03857a', 'Vrai/Faux — coût réel d''un salarié', 'vrai_faux', '<p>Le coût réel d''un salarié pour l''employeur se limite au salaire brut inscrit dans le contrat.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : au salaire brut s''ajoutent les charges patronales, versées en plus par l''employeur. C''est la somme des deux qui constitue le coût réel du poste pour l''entreprise, à intégrer dans le business plan.</p>","feedback_faux":"<p>Relisez la définition du coût employeur ci-dessus.</p>"}'::jsonb
  );

  -- Section 2 : Salaire brut, salaire net et coût employeur (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '2c1a6f70-a54c-4a21-bbf0-b539dbaa7e3e', '83d710a0-a522-471b-b999-81a22d03857a', 'Salaire brut, salaire net et coût employeur', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Trois montants différents circulent autour d''un même salaire, et il est facile de les confondre. Chacun sert à un usage précis.</p>"},{"type":"liste","items":["Le salaire brut : le montant de référence inscrit au contrat, avant toute retenue — sert de base au calcul des cotisations.","Le salaire net : ce que le salarié reçoit réellement sur son compte, après déduction des cotisations salariales et de l''impôt — toujours inférieur au brut.","Le coût employeur : ce que l''entreprise dépense réellement pour ce poste (salaire brut + charges patronales) — toujours supérieur au brut, et le seul montant pertinent pour un budget prévisionnel."]},{"type":"exemple","html":"<p>Pour un même poste, on peut ainsi avoir trois montants différents autour du même contrat : un salaire net d''environ 2 900 € perçu par le salarié, un salaire brut de 4 000 € servant de référence au contrat, et un coût employeur de 4 520 € réellement dépensé par l''entreprise. Les trois désignent la même relation de travail, vue sous trois angles différents.</p>"}]}'::jsonb, 1, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '8d84b134-6bbe-4026-abfc-ed4f0b0c5f52', '2c1a6f70-a54c-4a21-bbf0-b539dbaa7e3e', '83d710a0-a522-471b-b999-81a22d03857a', 'Catégorisation — brut, net, coût employeur', 'categorisation', '<p>Associez chaque description au montant qu''elle désigne.</p>',
    '{"items":[{"id":"i1","label":"Montant effectivement versé sur le compte bancaire du salarié"},{"id":"i2","label":"Montant de référence inscrit dans le contrat de travail"},{"id":"i3","label":"Montant à intégrer dans les charges fixes du budget prévisionnel de l''entreprise"}],"categories":[{"id":"c1","label":"Salaire net"},{"id":"c2","label":"Salaire brut"},{"id":"c3","label":"Coût employeur"}]}'::jsonb, '{"placements":{"i1":"c1","i2":"c2","i3":"c3"}}'::jsonb, 3, 0, '{"explication":"<p>Le salaire net est ce que le salarié perçoit réellement. Le salaire brut est le montant de référence du contrat. Le coût employeur, le plus élevé des trois, est celui qui doit figurer dans le budget prévisionnel de l''entreprise.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '1d21e3fb-557c-4163-8551-a8251bae7b8d', '2c1a6f70-a54c-4a21-bbf0-b539dbaa7e3e', '83d710a0-a522-471b-b999-81a22d03857a', 'Vrai/Faux — comparaison brut/net', 'vrai_faux', '<p>Le salaire net est toujours supérieur au salaire brut.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : c''est l''inverse. Le salaire net, versé au salarié après déduction des cotisations salariales et de l''impôt, est toujours inférieur au salaire brut.</p>","feedback_faux":"<p>Le salaire net est calculé après des déductions à partir du brut : peut-il donc lui être supérieur ?</p>"}'::jsonb
  );

  -- Section 3 : Intégrer le coût du personnel dans le budget (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '69ddf3c3-56ab-4b05-81a0-23a0d3abf24e', '83d710a0-a522-471b-b999-81a22d03857a', 'Intégrer le coût du personnel dans le budget', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Dans le plan financier prévisionnel d''une start-up, le coût du personnel doit être budgété à hauteur du <strong>coût employeur</strong>, poste par poste, puis intégré aux charges fixes (ou parfois variables, si la rémunération dépend directement du volume d''activité, comme une commission).</p>"},{"type":"exemple","html":"<p>Pour une équipe de 3 postes avec des salaires bruts mensuels de 3 200 €, 3 800 € et 4 500 €, il faut d''abord calculer le coût employeur de chaque poste (ou du total des postes) avant de l''intégrer au budget — jamais les salaires bruts seuls, qui sous-estimeraient les charges réelles.</p>"}]}'::jsonb, 2, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '87633b1f-f72f-4fc9-acb3-451a294c443b', '69ddf3c3-56ab-4b05-81a0-23a0d3abf24e', '83d710a0-a522-471b-b999-81a22d03857a', 'Tableau de calcul — budget personnel d''une équipe', 'tableau_calcul', '<p>Une équipe compte 3 postes avec des salaires bruts mensuels de 3 200 €, 3 800 € et 4 500 €. L''hypothèse de charges patronales retenue est de 14 %. Complétez le tableau du coût total de l''équipe.</p>',
    '{"champs":[{"id":"f1","label":"Total des salaires bruts mensuels","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Coût employeur mensuel total","type":"nombre","tolerance":0,"unite":"€","points":2},{"id":"f3","label":"Coût employeur annuel total (12 mois)","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":11500},"f2":{"valeur":13110},"f3":{"valeur":157320}}}'::jsonb, 5, 0, '{"explication":"<p>Total des salaires bruts = 3 200 + 3 800 + 4 500 = 11 500 €. Coût employeur mensuel = 11 500 × 1,14 = 13 110 €. Coût employeur annuel = 13 110 × 12 = 157 320 €. C''est ce dernier montant qui doit figurer dans les charges fixes annuelles du business plan.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '5b530dae-3f10-45ec-aea6-405f5bf03fc5', '69ddf3c3-56ab-4b05-81a0-23a0d3abf24e', '83d710a0-a522-471b-b999-81a22d03857a', 'Libre — budget personnel de votre projet', 'libre', '<p>Pour votre propre projet de start-up (Startup Programme), listez les postes que vous prévoyez d''embaucher (même à temps partiel ou de façon hypothétique), avec un salaire brut mensuel estimé pour chacun. Calculez le coût employeur annuel total de l''équipe, à l''aide du taux de charges patronales fourni par votre enseignant.</p>',
    '[]'::jsonb, '"Éléments attendus : une liste de postes réalistes par rapport au projet, des salaires bruts cohérents avec le marché, et un calcul correct du coût employeur (brut + charges patronales) intégré ensuite aux charges fixes du plan financier prévisionnel."'::jsonb, 3, 1, '{}'::jsonb
  );


-- Chapitre 6/7 : Budget et prévisions sur plusieurs exercices
insert into chapitres (id, titre_fr, emoji, description_fr, filieres, matiere_ids, ordre) values (
  'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Budget et prévisions sur plusieurs exercices', '📅', 'Construisez un budget prévisionnel réaliste, projetez votre activité sur plusieurs années, et testez sa solidité par des scénarios et une analyse de sensibilité.',
  array['BTS'], array['29a8e347-0610-4180-b86c-e8715c44fd25']::uuid[], 5
);

  -- Section 1 : Le budget prévisionnel (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '51664a6a-8568-44bc-bb86-862567011a9d', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Le budget prévisionnel', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Un <strong>budget</strong> traduit un projet en recettes et dépenses prévues. Il sert à anticiper les besoins financiers, à fixer des objectifs, puis à vérifier, une fois l''activité réalisée, les écarts entre prévisions et réalisations.</p>"},{"type":"definition","html":"<p>Construire un budget ne consiste pas seulement à vérifier que les recettes prévues dépassent les dépenses. Il faut aussi tester <strong>combien</strong> d''unités vendues (ou de participants) sont nécessaires pour atteindre l''équilibre, et anticiper ce qui se passerait si les ventes réelles étaient inférieures aux prévisions.</p>"},{"type":"exemple","html":"<p>Pour un événement, un budget distingue toujours les coûts engagés quel que soit le nombre de participants (location de salle, communication) des coûts qui augmentent avec ce nombre (repas, commission de billetterie) — c''est exactement la distinction charges fixes / charges variables déjà vue au chapitre précédent, appliquée ici à la construction d''un budget complet, recettes comprises.</p>"}]}'::jsonb, 0, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '04e3c04e-c974-4932-8f78-0e5e7a73e2ef', '51664a6a-8568-44bc-bb86-862567011a9d', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Catégorisation — budget d''un événement', 'categorisation', '<p>Classez chaque poste du budget d''un événement selon sa nature.</p>',
    '{"items":[{"id":"i1","label":"Location de la salle"},{"id":"i2","label":"Repas ou boisson par participant"},{"id":"i3","label":"Recettes de billetterie"},{"id":"i4","label":"Sponsoring d''une marque partenaire"}],"categories":[{"id":"c1","label":"Charge fixe"},{"id":"c2","label":"Charge variable"},{"id":"c3","label":"Recette liée au nombre de participants"},{"id":"c4","label":"Recette indépendante du nombre de participants"}]}'::jsonb, '{"placements":{"i1":"c1","i2":"c2","i3":"c3","i4":"c4"}}'::jsonb, 4, 0, '{"explication":"<p>La location de salle est engagée quel que soit le nombre de participants : charge fixe. Le repas par participant augmente avec leur nombre : charge variable. La billetterie dépend directement du nombre de participants : recette variable. Le sponsoring, négocié à l''avance, ne dépend généralement pas du nombre de participants : recette indépendante du volume.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'f12e0112-27b6-46b0-802b-43e75d651633', '51664a6a-8568-44bc-bb86-862567011a9d', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Vrai/Faux — rôle du budget', 'vrai_faux', '<p>Un bon budget se limite à vérifier que le total des recettes prévues dépasse le total des dépenses prévues.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : il faut aussi déterminer combien d''unités vendues (ou de participants) sont nécessaires pour atteindre l''équilibre, et anticiper l''effet d''une baisse des ventes par rapport aux prévisions.</p>","feedback_faux":"<p>Relisez la définition ci-dessus : que faut-il tester en plus de la simple comparaison recettes/dépenses ?</p>"}'::jsonb
  );

  -- Section 2 : Prévisions financières pluriannuelles (editeur)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '6df1e0a2-197a-40d5-af72-6e369d207815', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Prévisions financières pluriannuelles', 'editeur',
    '{"html":"<p>Le business plan prévisionnel sur plusieurs années permet de montrer comment le projet pourrait évoluer. Il ne s''agit pas de prédire exactement l''avenir, mais de rendre les hypothèses <strong>transparentes et cohérentes</strong> d''une année à l''autre. Une prévision utile indique notamment le volume de ventes, le prix moyen, le chiffre d''affaires, les charges variables, la MCV, les charges de personnel, les autres charges fixes, les amortissements, les intérêts, et le résultat.</p>\n<h4>Exemple filé sur 3 ans : une plateforme d''abonnement</h4>\n<p>Une start-up numérique facture un abonnement 15 € HT par mois (180 € par an et par abonné), pour un coût variable de 5 € par mois et par abonné (60 € par an). Voici comment son plan prévisionnel se construit, année après année :</p>\n<table>\n<tr><th>Poste</th><th>Année 1</th><th>Année 2</th><th>Année 3</th></tr>\n<tr><td>Nombre d''abonnés (moyenne annuelle)</td><td>200</td><td>350</td><td>500</td></tr>\n<tr><td>Chiffre d''affaires (CA)</td><td>36 000 €</td><td>?</td><td>90 000 €</td></tr>\n<tr><td>Charges variables (CV)</td><td>12 000 €</td><td>?</td><td>30 000 €</td></tr>\n<tr><td>Marge sur coût variable (MCV)</td><td>24 000 €</td><td>?</td><td>60 000 €</td></tr>\n<tr><td>Charges de personnel</td><td>15 000 €</td><td>15 000 €</td><td>20 000 € (recrutement)</td></tr>\n<tr><td>Autres charges fixes</td><td>6 000 €</td><td>6 000 €</td><td>7 000 €</td></tr>\n<tr><td>Amortissements</td><td>2 000 €</td><td>2 000 €</td><td>2 000 €</td></tr>\n<tr><td>Intérêts (emprunt en cours de remboursement)</td><td>1 000 €</td><td>800 €</td><td>600 €</td></tr>\n<tr><td>Résultat prévisionnel</td><td>0 €</td><td>?</td><td>30 400 €</td></tr>\n</table>\n<p>On observe que l''entreprise atteint tout juste l''équilibre en année 1 (résultat nul), avant de devenir nettement bénéficiaire en année 3, portée par la croissance du nombre d''abonnés — tout en absorbant un coût de personnel supplémentaire lié à un recrutement. Les intérêts diminuent, eux, au fil du remboursement de l''emprunt (voir le chapitre sur la planification financière).</p>"}'::jsonb, 1, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'd4ca427f-4b61-4185-b112-ba4752daf060', '6df1e0a2-197a-40d5-af72-6e369d207815', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Tableau de calcul — compléter l''année 2', 'tableau_calcul', '<p>À partir du tableau ci-dessus, complétez les valeurs manquantes de l''<strong>année 2</strong> (350 abonnés, mêmes hypothèses de prix et de coût variable unitaire que les années 1 et 3).</p>',
    '{"champs":[{"id":"f1","label":"Chiffre d''affaires (CA) — année 2","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Charges variables (CV) — année 2","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f3","label":"Marge sur coût variable (MCV) — année 2","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f4","label":"Résultat prévisionnel — année 2","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":63000},"f2":{"valeur":21000},"f3":{"valeur":42000},"f4":{"valeur":18200}}}'::jsonb, 5, 0, '{"explication":"<p>CA = 350 × 180 = 63 000 €. CV = 350 × 60 = 21 000 €. MCV = 63 000 − 21 000 = 42 000 €. Résultat = 42 000 − 15 000 (personnel) − 6 000 (autres CF) − 2 000 (amortissements) − 800 (intérêts) = 18 200 €.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'd4f80b2b-ecbf-4c76-b70b-cc870fcd1782', '6df1e0a2-197a-40d5-af72-6e369d207815', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Vrai/Faux — objectif d''une prévision pluriannuelle', 'vrai_faux', '<p>Une prévision financière pluriannuelle a pour but de prédire exactement le chiffre d''affaires futur de l''entreprise.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : une prévision pluriannuelle vise à rendre les hypothèses transparentes et cohérentes d''une année à l''autre, pas à prédire l''avenir avec certitude. C''est précisément pour cette raison que l''on teste ensuite plusieurs scénarios (voir section suivante).</p>","feedback_faux":"<p>Relisez la première phrase de cette section.</p>"}'::jsonb
  );

  -- Section 3 : Scénarios et analyse de sensibilité (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '89d6054b-341d-4c57-84a1-a3cdbb46f459', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Scénarios et analyse de sensibilité', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Une prévision unique donne une fausse impression de certitude. Il est préférable de tester au moins un <strong>scénario réaliste</strong>, un <strong>scénario prudent</strong> et un <strong>scénario favorable</strong>, pour montrer que le projet reste viable même si tout ne se passe pas exactement comme prévu.</p>"},{"type":"definition","html":"<p>L''<strong>analyse de sensibilité</strong> consiste à modifier une seule hypothèse à la fois (par exemple −10 % de ventes, ou +10 % de coûts) afin de mesurer précisément son effet sur le résultat et la marge de sécurité. Elle permet d''identifier les hypothèses les plus « fragiles » du projet.</p>"},{"type":"exemple","html":"<p>Reprenons le scénario central de l''année 3 de l''exemple précédent (500 abonnés, résultat de 30 400 €). Si le nombre d''abonnés est finalement inférieur de 10 % à la prévision, le chiffre d''affaires et les charges variables baissent tous les deux de 10 % (ils dépendent tous deux du volume), mais les charges fixes, elles, restent inchangées : le résultat baisse alors à 24 400 €. Le projet reste rentable, ce qui montre sa solidité face à ce risque.</p>"}]}'::jsonb, 2, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '68558d4e-c16a-4a68-9505-6761ca5c0b1a', '89d6054b-341d-4c57-84a1-a3cdbb46f459', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Tableau de calcul — scénario prudent (−10 % de ventes)', 'tableau_calcul', '<p>Reprenez le scénario central de l''année 3 (500 abonnés : CA 90 000 €, CV 30 000 €, charges de personnel 20 000 €, autres charges fixes 7 000 €, amortissements 2 000 €, intérêts 600 €). Simulez un scénario prudent avec 10 % de ventes en moins (le CA et les charges variables baissent tous les deux de 10 %, les charges fixes ne changent pas). Complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Chiffre d''affaires réduit de 10 %","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Charges variables réduites de 10 %","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f3","label":"Résultat du scénario prudent","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":81000},"f2":{"valeur":27000},"f3":{"valeur":24400}}}'::jsonb, 4, 0, '{"explication":"<p>CA réduit = 90 000 × 0,90 = 81 000 €. CV réduites = 30 000 × 0,90 = 27 000 €. MCV = 81 000 − 27 000 = 54 000 €. Résultat = 54 000 − 20 000 − 7 000 − 2 000 − 600 = 24 400 €. Le résultat baisse mais reste largement positif : le projet résiste bien à une baisse de 10 % des ventes.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '1c37f6e4-424f-45fd-be3e-485535fd71e7', '89d6054b-341d-4c57-84a1-a3cdbb46f459', 'ddcbd9e9-abc1-4731-adf0-973ab9e0d2e4', 'Choix unique — méthode de l''analyse de sensibilité', 'choix_unique', '<p>Dans une analyse de sensibilité, comment procède-t-on ?</p>',
    '["On modifie toutes les hypothèses en même temps pour voir le pire des cas","On modifie une seule hypothèse à la fois, pour isoler son effet précis sur le résultat","On ignore les charges fixes, qui ne varient jamais","On ne teste que des scénarios favorables, pour rassurer les investisseurs"]'::jsonb, '{"index":1}'::jsonb, 2, 1, '{"explication":"<p>L''analyse de sensibilité modifie une hypothèse à la fois (par exemple les ventes, ou un coût), afin de mesurer précisément l''effet de cette hypothèse isolée sur le résultat — modifier tout en même temps empêcherait d''identifier quelle hypothèse est la plus sensible.</p>"}'::jsonb
  );


-- Chapitre 7/7 : Cas final : business plan financier d'une start-up numérique
insert into chapitres (id, titre_fr, emoji, description_fr, filieres, matiere_ids, ordre) values (
  '28065df7-728c-4911-a41d-d192c472542d', 'Cas final : business plan financier d''une start-up numérique', '🎯', 'Synthétisez tous les outils du cours dans l''étude financière complète de votre projet Startup Programme : financement, rentabilité, prévisions et scénarios, jusqu''à la présentation devant le jury.',
  array['BTS'], array['29a8e347-0610-4180-b86c-e8715c44fd25']::uuid[], 6
);

  -- Section 1 : Le cas final : ce qui est attendu (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '7dacab4c-f1da-4da2-8b15-c9b72b8a0dc7', '28065df7-728c-4911-a41d-d192c472542d', 'Le cas final : ce qui est attendu', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>L''objectif de ce cas final est de démontrer, avec des hypothèses cohérentes, si le modèle économique de <strong>votre propre projet</strong> du Startup Programme peut devenir viable. Lorsqu''une donnée n''est pas encore connue avec certitude, faites une hypothèse raisonnable et indiquez-la explicitement : mieux vaut une hypothèse assumée qu''un chiffre inventé sans justification.</p>"},{"type":"liste","items":["Présenter le projet, le segment de clients et la proposition de valeur","Finaliser le Business Model Canvas","Déterminer les investissements initiaux et les charges de démarrage","Choisir et justifier les sources de financement","Construire, si nécessaire, le tableau d''un emprunt à annuités constantes (intérêts et remboursement du capital)","Estimer les prix, volumes, coûts variables, charges fixes et coûts de personnel","Construire le résultat différentiel et calculer le taux de MCV","Calculer le seuil de rentabilité (en euros et, si possible, en unités)","Calculer et interpréter la marge de sécurité","Construire une prévision sur trois ans","Expliquer la différence entre résultat et trésorerie, et traiter correctement la TVA","Tester au moins un scénario défavorable (analyse de sensibilité)"]},{"type":"texte","html":"<p>Lors de la <strong>présentation orale</strong> (5 à 7 minutes, dans le cadre du Startup Programme / GEN-E), le jury doit pouvoir identifier rapidement : le problème résolu, la solution, la cible, la logique de revenus, les principaux coûts, le niveau de ventes nécessaire pour être rentable, et les principaux risques du projet. Un business plan réussi ne se limite pas à des chiffres : il montre une compréhension claire de la logique économique.</p>"}]}'::jsonb, 0, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'e9521d4d-f9a5-44f9-8f33-b826145caa4d', '7dacab4c-f1da-4da2-8b15-c9b72b8a0dc7', '28065df7-728c-4911-a41d-d192c472542d', 'QCM — attentes de la présentation orale', 'qcm', '<p>Que doit pouvoir identifier rapidement le jury lors de votre présentation orale ?</p>',
    '["Le problème résolu et la solution apportée","Le niveau de ventes nécessaire pour être rentable","La liste complète de toutes les formules utilisées dans le tableur Excel","Les principaux risques du projet"]'::jsonb, '[0,1,3]'::jsonb, 3, 0, '{"explication":"<p>Le jury doit comprendre, en quelques minutes, la logique du projet (problème, solution, cible, revenus, coûts, seuil de rentabilité, risques) — pas suivre le détail technique de chaque formule du tableur, qui reste un outil de travail, pas le sujet de la présentation.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'be0b1a49-fcac-464d-9392-9e4dd7bfccbe', '7dacab4c-f1da-4da2-8b15-c9b72b8a0dc7', '28065df7-728c-4911-a41d-d192c472542d', 'Vrai/Faux — données incertaines', 'vrai_faux', '<p>Lorsqu''une donnée n''est pas encore connue avec certitude, il vaut mieux l''ignorer complètement dans le business plan plutôt que de faire une hypothèse.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : il faut faire une hypothèse raisonnable et l''indiquer explicitement. Un business plan qui ignore une donnée importante est moins crédible qu''un business plan qui assume clairement ses hypothèses.</p>","feedback_faux":"<p>Relisez la première phrase de cette section : que faire d''une donnée encore incertaine ?</p>"}'::jsonb
  );

  -- Section 2 : Étude de cas type : SkillUp, plateforme d'apprentissage en ligne (editeur)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '671c5e47-8f10-4c4d-82c9-bfb161158044', '28065df7-728c-4911-a41d-d192c472542d', 'Étude de cas type : SkillUp, plateforme d''apprentissage en ligne', 'editeur',
    '{"html":"<p>Avant de construire votre propre dossier, voici un cas type entièrement chiffré, qui mobilise tous les outils vus dans ce cours.</p>\n<h4>Les données de départ</h4>\n<table>\n<tr><th>Élément</th><th>Valeur</th></tr>\n<tr><td>Prix de vente d''un abonnement mensuel</td><td>20 € HT / mois</td></tr>\n<tr><td>Coût variable par abonnement (hébergement, support, licences)</td><td>8 € / mois</td></tr>\n<tr><td>Charges fixes mensuelles</td><td>7 200 €</td></tr>\n<tr><td>Investissement initial</td><td>15 000 € (financé à 70 % par emprunt à 4 % sur 3 ans, 30 % par apport personnel)</td></tr>\n<tr><td>TVA</td><td>17 % (à exclure des calculs de rentabilité, qui raisonnent en HT)</td></tr>\n</table>\n<h4>1. Seuil de rentabilité mensuel</h4>\n<p>MCV unitaire = 20 − 8 = 12 €. Seuil de rentabilité en unités = 7 200 / 12 = <strong>600 abonnements</strong> par mois, soit 600 × 20 = <strong>12 000 €</strong> de chiffre d''affaires mensuel. L''entreprise doit donc vendre 600 abonnements par mois pour couvrir toutes ses charges ; au-delà, elle commence à réaliser un bénéfice.</p>\n<h4>2. Résultat différentiel annuel, avec 1 200 abonnés actifs</h4>\n<table>\n<tr><th>Indicateur</th><th>Calcul</th><th>Montant</th></tr>\n<tr><td>Chiffre d''affaires (CA)</td><td>1 200 × 20 × 12</td><td>288 000 €</td></tr>\n<tr><td>Charges variables (CV)</td><td>1 200 × 8 × 12</td><td>115 200 €</td></tr>\n<tr><td>Marge sur coût variable (MCV)</td><td>CA − CV</td><td>172 800 €</td></tr>\n<tr><td>Charges fixes annuelles</td><td>7 200 × 12</td><td>86 400 €</td></tr>\n<tr><td>Résultat différentiel</td><td>MCV − CF</td><td>86 400 €</td></tr>\n</table>\n<p>Taux de MCV = 172 800 / 288 000 × 100 = <strong>60 %</strong> : pour chaque euro vendu, 0,60 € reste disponible pour couvrir les charges fixes puis dégager un bénéfice.</p>\n<h4>3. Seuil de rentabilité et marge de sécurité annuels</h4>\n<p>Seuil de rentabilité annuel = 86 400 / 0,60 = <strong>144 000 €</strong>. Marge de sécurité = 288 000 − 144 000 = <strong>144 000 €</strong>, soit un taux de marge de sécurité de 50 %. L''entreprise pourrait perdre jusqu''à la moitié de son chiffre d''affaires avant d''atteindre son seuil de rentabilité : c''est une situation très favorable.</p>\n<h4>4. Plan de financement initial</h4>\n<table>\n<tr><th>Élément</th><th>Montant</th><th>Commentaire</th></tr>\n<tr><td>Investissement total</td><td>15 000 €</td><td>Ordinateurs, licences, site web</td></tr>\n<tr><td>Apport personnel</td><td>4 500 €</td><td>30 %</td></tr>\n<tr><td>Emprunt bancaire</td><td>10 500 €</td><td>70 %, sur 3 ans à 4 %</td></tr>\n<tr><td>TVA déductible (17 %)</td><td>2 550 €</td><td>Récupérable sur la première année</td></tr>\n<tr><td>Coût total TTC</td><td>17 550 €</td><td>—</td></tr>\n</table>\n<p>Le remboursement de l''emprunt (voir le chapitre sur la planification financière) devra ensuite être intégré dans le plan de trésorerie prévisionnel de l''entreprise, en distinguant bien la part d''intérêts (une charge) de la part de capital remboursé (qui n''en est pas une).</p>\n<h4>Barème indicatif de ce type de cas</h4>\n<table>\n<tr><th>Critère</th><th>Description</th><th>Barème</th></tr>\n<tr><td>Structure du dossier</td><td>Clarté, cohérence, logique des tableaux</td><td>/5</td></tr>\n<tr><td>Exactitude des calculs</td><td>SR, MCV, résultat, cash-flow</td><td>/5</td></tr>\n<tr><td>Analyse et interprétation</td><td>Lecture correcte des résultats, argumentation</td><td>/5</td></tr>\n<tr><td>Présentation orale</td><td>Dynamisme, clarté, respect du temps</td><td>/3</td></tr>\n<tr><td>Travail d''équipe</td><td>Répartition, implication, autonomie</td><td>/2</td></tr>\n<tr><td>Total</td><td>—</td><td>/20</td></tr>\n</table>"}'::jsonb, 1, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'd851f0b1-65bf-4b6c-8bc4-e6ca8e3a2f23', '671c5e47-8f10-4c4d-82c9-bfb161158044', '28065df7-728c-4911-a41d-d192c472542d', 'Tableau de calcul — SkillUp avec 900 abonnés', 'tableau_calcul', '<p>Reprenez les mêmes hypothèses que SkillUp (prix 20 € HT/mois, coût variable 8 €/mois, charges fixes 7 200 €/mois), mais avec seulement <strong>900 abonnés actifs</strong> au lieu de 1 200. Complétez le tableau annuel.</p>',
    '{"champs":[{"id":"f1","label":"Chiffre d''affaires annuel","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f2","label":"Marge sur coût variable (MCV) annuelle","type":"nombre","tolerance":0,"unite":"€","points":1},{"id":"f3","label":"Résultat différentiel annuel","type":"nombre","tolerance":0,"unite":"€","points":2},{"id":"f4","label":"Marge de sécurité","type":"nombre","tolerance":0,"unite":"€","points":2}]}'::jsonb, '{"champs":{"f1":{"valeur":216000},"f2":{"valeur":129600},"f3":{"valeur":43200},"f4":{"valeur":72000}}}'::jsonb, 6, 0, '{"explication":"<p>CA = 900 × 20 × 12 = 216 000 €. CV = 900 × 8 × 12 = 86 400 €. MCV = 216 000 − 86 400 = 129 600 €. Résultat = 129 600 − 86 400 (CF annuelles) = 43 200 €. Le seuil de rentabilité annuel reste 144 000 € (il ne dépend pas du nombre d''abonnés, seulement des charges fixes et du taux de MCV, qui restent inchangés). Marge de sécurité = 216 000 − 144 000 = 72 000 €.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '5310445e-538e-4b3b-a475-bb72eb7d68d4', '671c5e47-8f10-4c4d-82c9-bfb161158044', '28065df7-728c-4911-a41d-d192c472542d', 'Vrai/Faux — seuil de rentabilité et nombre d''abonnés', 'vrai_faux', '<p>Dans l''exemple SkillUp, le seuil de rentabilité annuel change si le nombre réel d''abonnés change.</p>',
    '[]'::jsonb, 'false'::jsonb, 1, 1, '{"explication":"<p>Faux : le seuil de rentabilité dépend des charges fixes et du taux de MCV (lui-même déterminé par le prix et le coût variable unitaire), pas du nombre d''abonnés réellement atteint. C''est justement pour cela qu''il sert de repère fixe auquel comparer différents scénarios de ventes.</p>","feedback_faux":"<p>De quoi dépend la formule du seuil de rentabilité (Charges fixes / Taux de MCV) ?</p>"}'::jsonb
  );

  -- Section 3 : Cas pratique : organiser un événement rentable (blocs)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    'bb09debe-d763-43b0-b7db-ad69f04b12f2', '28065df7-728c-4911-a41d-d192c472542d', 'Cas pratique : organiser un événement rentable', 'blocs',
    '{"blocks":[{"type":"texte","html":"<p>Les mêmes outils s''appliquent à l''organisation d''un événement ponctuel — un cas fréquent dans les épreuves ECOGEST. Une agence événementielle doit fixer un prix par participant qui couvre tous les coûts <strong>et</strong> dégage une marge bénéficiaire cible.</p>"},{"type":"exemple","html":"<p><strong>Contexte :</strong> une agence organise une soirée pour 250 invités. Le traiteur (repas et boissons) revient à 22 € HT par invité (coût variable). Les coûts fixes de la soirée (location de salle, décoration, assurance, amortissement du matériel audiovisuel utilisé ce soir-là) s''élèvent à 4 500 €. La direction exige un bénéfice égal à 30 % du coût total de l''événement.</p>"},{"type":"formule","items":["Coût total = (Coût variable unitaire × nombre d''invités) + Charges fixes de l''événement","Prix de vente unitaire = (Coût total × (1 + taux de marge cible)) / nombre d''invités"]}]}'::jsonb, 2, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'fe4c5a16-4684-4662-b2e9-0dc853a7c7f6', 'bb09debe-d763-43b0-b7db-ad69f04b12f2', '28065df7-728c-4911-a41d-d192c472542d', 'Tableau de calcul — fixer le prix d''un événement', 'tableau_calcul', '<p>À partir du contexte ci-dessus (250 invités, coût variable 22 € HT/invité, charges fixes 4 500 €, bénéfice cible de 30 % du coût total), complétez le tableau.</p>',
    '{"champs":[{"id":"f1","label":"Coût total de l''événement","type":"nombre","tolerance":0,"unite":"€","points":2},{"id":"f2","label":"Prix de vente à proposer par invité","type":"nombre","tolerance":0.5,"unite":"€","points":3}]}'::jsonb, '{"champs":{"f1":{"valeur":10000},"f2":{"valeur":52}}}'::jsonb, 5, 0, '{"explication":"<p>Coût total = (22 × 250) + 4 500 = 5 500 + 4 500 = 10 000 €. Pour un bénéfice de 30 % du coût total, il faut facturer 10 000 × 1,30 = 13 000 € au total, soit 13 000 / 250 = 52 € par invité.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    'a269281e-1e06-4671-adf5-02fe7fdd415b', 'bb09debe-d763-43b0-b7db-ad69f04b12f2', '28065df7-728c-4911-a41d-d192c472542d', 'Réponse numérique — seuil de rentabilité d''un événement', 'reponse_numerique', '<p>Avec un prix de vente de 52 € par invité (voir exercice précédent), quel est le seuil de rentabilité de cet événement, exprimé en nombre d''invités ?</p>',
    '[]'::jsonb, '{"valeur":150,"tolerance":1,"unite":"invités"}'::jsonb, 2, 1, '{"explication":"<p>MCV unitaire = 52 − 22 = 30 €. Seuil de rentabilité = Charges fixes / MCV unitaire = 4 500 / 30 = 150 invités : en dessous de ce nombre, l''événement serait déficitaire.</p>"}'::jsonb
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '716d558e-f1a1-4d8f-b8f5-c5b5ccfe8457', 'bb09debe-d763-43b0-b7db-ad69f04b12f2', '28065df7-728c-4911-a41d-d192c472542d', 'QCM — risque financier d''un événement gratuit', 'qcm', '<p>Une commune organise un événement gratuit à l''entrée, entièrement financé par les ventes de nourriture et de boissons sur place. Le nombre de visiteurs varie fortement selon la météo. Quels risques cela fait-il peser sur l''équilibre financier de l''événement ?</p>',
    '["Les recettes dépendent presque entièrement d''un facteur incertain (la météo)","Les charges fixes engagées (location de scène, cachets des artistes, sécurité) restent dues même si peu de visiteurs viennent","Aucun risque : la gratuité de l''entrée élimine tout risque financier","Une bonne météo garantit à elle seule un résultat positif"]'::jsonb, '[0,1]'::jsonb, 2, 2, '{"explication":"<p>Lorsque les recettes dépendent uniquement d''un volume de ventes incertain (ici lié à la météo) alors que d''importantes charges fixes sont déjà engagées, l''équilibre financier de l''événement est fragile : une mauvaise fréquentation ne réduit pas les charges fixes, mais réduit fortement les recettes.</p>"}'::jsonb
  );

  -- Section 4 : Activité notée : votre business plan financier complet (activite)
  insert into sections_cours (id, chapitre_id, titre_fr, type, contenu, ordre, filieres) values (
    '82fc648b-faf2-4043-8f6e-2b2828b57312', '28065df7-728c-4911-a41d-d192c472542d', 'Activité notée : votre business plan financier complet', 'activite',
    '{"contexte":"<p><strong>Délivrable noté — synthèse finale du cours ECOGEST.</strong> Vous allez maintenant construire l''étude financière complète de votre propre projet de start-up (Startup Programme / GEN-E), en mobilisant tous les outils vus dans ce cours.</p>","phases":[{"label":"Cadrage du projet","question_depart":"","consignes":["Présentez votre projet, votre segment de clients et votre proposition de valeur","Finalisez votre Business Model Canvas"]},{"label":"Financement et investissement","question_depart":"","consignes":["Déterminez vos investissements initiaux et vos charges de démarrage","Choisissez et justifiez vos sources de financement (apport, emprunt, subvention, autre)","Si vous recourez à un emprunt, construisez le tableau à annuités constantes (intérêts et capital)"]},{"label":"Rentabilité","question_depart":"","consignes":["Estimez vos prix, volumes de ventes, coûts variables, charges fixes et coûts de personnel (coût employeur, pas seulement le salaire brut)","Construisez votre résultat différentiel et calculez votre taux de MCV","Calculez votre seuil de rentabilité (en euros et, si possible, en unités) et votre marge de sécurité"]},{"label":"Prévisions et robustesse","question_depart":"","consignes":["Construisez une prévision financière sur trois ans, avec des hypothèses explicites","Expliquez la différence entre votre résultat et votre trésorerie, et traitez correctement la TVA dans vos tableaux","Testez au moins un scénario défavorable (analyse de sensibilité) et commentez la solidité de votre projet"]},{"label":"Présentation","question_depart":"","consignes":["Préparez une présentation orale de 5 à 7 minutes pour le jury du Startup Programme / GEN-E","Assurez-vous que chaque membre de l''équipe peut expliquer et défendre n''importe quelle partie du dossier financier"]}]}'::jsonb, 3, array['BTS']
  );
  insert into exercices (id, section_id, chapitre_id, titre, type, enonce, options, correction, points, ordre, parametres) values (
    '5b64f7f9-ea1e-4241-b74a-b0852f86e51c', '82fc648b-faf2-4043-8f6e-2b2828b57312', '28065df7-728c-4911-a41d-d192c472542d', 'Libre — dossier financier complet et présentation', 'libre', '<p>Déposez votre dossier financier complet (résultat différentiel, seuil de rentabilité, marge de sécurité, plan de financement, prévision sur 3 ans, scénario défavorable) et préparez votre présentation orale.</p>',
    '[]'::jsonb, '"Éléments attendus : cohérence d''ensemble entre les blocs du BMC et les chiffres du dossier financier ; calculs exacts (SR, MCV, résultat, cash-flow) ; hypothèses explicites et raisonnables lorsque des données ne sont pas connues ; au moins un scénario défavorable testé et commenté ; capacité de toute l''équipe à défendre le dossier à l''oral."'::jsonb, 5, 0, '{}'::jsonb
  );


commit;

-- ── RÉVÉLATION DE CONTENU PAR CLASSE : MASQUAGE PROGRESSIF (2026-09-20) ──────
-- Permet à un enseignant de cacher certains blocs de contenu (contenu.blocks[] des
-- sections_cours de type 'blocs', marqués {"masquable": true} dans leur JSON) pour
-- forcer une recherche des élèves avant révélation, granularité par CLASSE (pas
-- filière) et bloc par bloc. Table volontairement "creuse" : l'absence de ligne pour
-- un couple (classe, bloc) signifie "caché" ; le re-masquage supprime la ligne (pas
-- d'historique demandé pour la v1). Les exercices interactifs (exercices/ExerciceRunner)
-- ne sont PAS concernés par ce mécanisme.
create table revele_etat (
  id         uuid primary key default uuid_generate_v4(),
  classe_id  uuid not null references classes(id) on delete cascade,
  section_id uuid not null references sections_cours(id) on delete cascade,
  bloc_id    uuid not null, -- id du bloc dans sections_cours.contenu.blocks[] (jsonb, pas de FK possible)
  revele_par uuid references profiles(id) on delete set null,
  revele_le  timestamptz not null default now(),
  unique (classe_id, bloc_id)
);
create index on revele_etat(section_id);
alter table revele_etat enable row level security;

-- Lecture : le staff voit tout (utile pour prévisualiser d'autres classes) ; un élève
-- ne voit que les lignes de sa propre classe.
create policy "revele_etat_read" on revele_etat
  for select using (
    my_role() in ('admin','enseignant','enseignant_guest')
    or (my_role() = 'eleve' and exists (
      select 1 from profiles p where p.id = auth.uid() and p.classe_id = revele_etat.classe_id
    ))
  );

-- Écriture : admin, ou enseignant à la fois rattaché à cette classe (enseignant_classes)
-- ET habilité en écriture sur la matière de la section (can_edit_matiere), même garde-fou
-- que chapitres_edit/sections_edit plus haut.
create policy "revele_etat_write" on revele_etat
  for all using (
    my_role() = 'admin'
    or (
      my_role() = 'enseignant'
      and exists (select 1 from enseignant_classes ec where ec.enseignant_id = auth.uid() and ec.classe_id = revele_etat.classe_id)
      and exists (
        select 1 from sections_cours sc, chapitres c, unnest(c.matiere_ids) mid
        where sc.id = revele_etat.section_id and c.id = sc.chapitre_id and can_edit_matiere(mid)
      )
    )
  );
