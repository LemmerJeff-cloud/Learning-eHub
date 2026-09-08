# EHub — Setup Guide

## 1. Prérequis
- Node.js 18+ (https://nodejs.org)
- Git (https://git-scm.com)
- Un compte GitHub

## 2. Installation locale

```bash
# Cloner ou dézipper le projet
cd ehub

# Installer les dépendances
npm install

# Démarrer en développement
npm run dev
```

L'app sera accessible sur http://localhost:5173

## 3. Configuration Supabase (déjà configuré)

Le fichier `.env` contient déjà vos clés Supabase.
**Ne commitez jamais ce fichier sur GitHub public.**

Ajoutez `.env` à votre `.gitignore` :
```
.env
.env.local
```

## 4. Initialiser la base de données

Dans Supabase → SQL Editor :
1. Exécutez `supabase/schema.sql` (créer les tables)
2. Exécutez `supabase/seed.sql` (données initiales)

## 5. Créer le premier compte admin

Dans Supabase → Authentication → Users → "Invite user" :
- Email : votre email
- Puis dans SQL Editor :
```sql
insert into profiles (id, prenom, initiale, role)
values ('UUID-DE-VOTRE-USER', 'Votre prénom', 'P', 'admin');
```
(Remplacez UUID-DE-VOTRE-USER par l'UUID affiché dans Authentication → Users)

## 6. Déploiement GitHub Pages

```bash
# Installer gh-pages (déjà dans package.json)
npm install

# Configurer vite.config.js : changer base en '/ehub/'
# Puis déployer :
npm run deploy
```

## 7. Variables d'environnement pour GitHub Actions

Dans GitHub → Settings → Secrets and variables → Actions :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Structure du projet

```
ehub/
├── src/
│   ├── lib/
│   │   ├── supabase.js      # Client Supabase
│   │   └── AuthContext.jsx  # Auth & profil utilisateur
│   ├── components/
│   │   ├── NavBar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── LoginModal.jsx
│   │   └── Toast.jsx
│   ├── pages/
│   │   ├── PageAccueil.jsx
│   │   ├── PageCours.jsx    # ✅ Sprint 1 complet
│   │   ├── PageMissions.jsx # Sprint 2
│   │   ├── PageEspace.jsx   # Sprint 2
│   │   ├── PageEntreprises.jsx # Sprint 2
│   │   └── PageAdmin.jsx    # Sprint 2
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   ├── schema.sql           # Toutes les tables
│   └── seed.sql             # Données initiales (chapitres, sections, etc.)
├── .env                     # Clés Supabase (ne pas commiter)
├── index.html
├── package.json
└── vite.config.js
```

## Sprint roadmap

- ✅ **Sprint 1** — Fondations React + Supabase + Auth + Cours
- 🔜 **Sprint 2** — Mode édition TipTap + Missions + Admin + Espace équipe
- 🔜 **Sprint 3** — Exercices interactifs + résultats
- 🔜 **Sprint 4** — Backup, export, migration école
