-- ============================================================
-- EHub — Seed data (migration depuis prototype JS)
-- Run AFTER schema.sql in Supabase → SQL Editor
-- ============================================================

-- ── CLASSES ──────────────────────────────────────────────────
insert into classes (id, label, section, annee) values
  ('11111111-0001-0001-0001-000000000001', 'BTS DC1 2024/2025', 'BTS',   '2024/2025'),
  ('11111111-0001-0001-0001-000000000002', 'BTS DC1 2025/2026', 'BTS',   '2025/2026'),
  ('11111111-0001-0001-0001-000000000003', '3CN1 2025/2026',    '3CN',   '2025/2026'),
  ('11111111-0001-0001-0001-000000000004', '3CN2 2025/2026',    '3CN',   '2025/2026'),
  ('11111111-0001-0001-0001-000000000005', '2TPCM1 2025/2026',  '2TPCM', '2025/2026');

-- ── ENTREPRISES ──────────────────────────────────────────────
insert into entreprises (id, nom, classe_id) values
  ('22222222-0002-0002-0002-000000000001', 'DigitalBoost', '11111111-0001-0001-0001-000000000002'),
  ('22222222-0002-0002-0002-000000000002', 'GreenStart',   '11111111-0001-0001-0001-000000000002'),
  ('22222222-0002-0002-0002-000000000003', 'Créa&Co',      '11111111-0001-0001-0001-000000000003'),
  ('22222222-0002-0002-0002-000000000004', 'ShopLocal',    '11111111-0001-0001-0001-000000000004'),
  ('22222222-0002-0002-0002-000000000005', 'TradeSimul',   '11111111-0001-0001-0001-000000000005');

-- ── CHAPITRES ────────────────────────────────────────────────
insert into chapitres (id, titre_fr, titre_en, emoji, description_fr, description_en, ordre, filieres) values
  ('33333333-0001-0001-0001-000000000001', 'Brainstorming',                  'Brainstorming',             '💡', 'Comment développer une idée pour une entreprise', 'How to develop a business idea',            1, array['BTS','3CN','2TPCM']),
  ('33333333-0001-0001-0001-000000000002', 'Marketing',                      'Marketing',                 '📣', 'Stratégies marketing et communication',          'Marketing and communication strategies',    2, array['3CN','2TPCM']),
  ('33333333-0001-0001-0001-000000000003', 'Principes de base de comptabilité','Basic Accounting Principles','🧾','TVA, investissements, charges et résultats',   'VAT, investments, costs and results',       3, array['BTS']),
  ('33333333-0001-0001-0001-000000000004', 'Business Model Canvas',           'Business Model Canvas',     '🗺️','Modéliser son projet en 9 blocs',               'Model your project in 9 building blocks',   4, array['BTS','3CN','2TPCM']),
  ('33333333-0001-0001-0001-000000000005', 'Financement',                    'Financing',                 '💰', 'Sources de financement et coût du capital',      'Funding sources and cost of capital',       5, array['BTS','3CN']),
  ('33333333-0001-0001-0001-000000000006', 'Seuil de rentabilité',           'Break-even Point',          '📈', 'Calculer et analyser le seuil de rentabilité',   'Calculate and analyse the break-even point',6, array['BTS']),
  ('33333333-0001-0001-0001-000000000007', 'Ressources humaines',            'Human Resources',           '👥', 'Gestion du personnel et organisation du travail','Staff management and work organisation',    7, array['2TPCM']);

-- ── SECTIONS — BRAINSTORMING ─────────────────────────────────
insert into sections_cours (chapitre_id, titre_fr, titre_en, type, contenu, ordre, filieres) values
(
  '33333333-0001-0001-0001-000000000001',
  'Qu''est-ce que le brainstorming ?', 'What is brainstorming?',
  'definition',
  '{"fr": "Le brainstorming est une technique de créativité collective qui vise à générer un maximum d''idées en un minimum de temps, sans jugement ni censure. C''est le point de départ de tout projet entrepreneurial : avant de choisir une idée, il faut en produire beaucoup.", "en": "Brainstorming is a collective creativity technique that aims to generate as many ideas as possible in a short time, without judgement or censorship."}',
  1, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Les règles d''or', 'The golden rules',
  'liste',
  '{"fr": ["Quantité avant qualité : plus il y a d''idées, mieux c''est", "Pas de critique pendant la phase de génération", "S''appuyer sur les idées des autres (rebondir, associer)", "Toutes les idées sont les bienvenues, même les plus folles", "Un seul sujet à la fois", "Tout noter sans filtre, même ce qui semble évident"], "en": ["Quantity before quality: the more ideas, the better", "No criticism during the generation phase", "Build on others ideas", "All ideas are welcome, even the wildest ones", "One topic at a time", "Write everything down without filtering"]}',
  2, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Exemple concret — DigitalBoost', 'Concrete example — DigitalBoost',
  'exemple',
  '{"fr": "L''équipe de la start-up DigitalBoost réunit ses 4 membres pendant 20 minutes. Question de départ : Comment aider les PME luxembourgeoises à améliorer leur présence en ligne ? En 20 minutes, 35 idées sont générées. Après regroupement en 6 thèmes et évaluation sur grille, l''idée la mieux notée — gestion externalisée des réseaux sociaux — devient le cœur du projet.", "en": "The DigitalBoost startup team brings its 4 members together for 20 minutes. In 20 minutes, 35 ideas are generated. The highest-scoring idea becomes the core of the project."}',
  3, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Méthodes et outils', 'Methods and tools',
  'liste',
  '{"fr": ["Mind Mapping : carte mentale visuelle à partir d''un mot central", "SCAMPER : 7 questions créatives guidées pour transformer une idée existante", "Brainwriting : chaque participant écrit ses idées en silence — évite l''effet de groupe", "Les 5 Pourquoi : remonter à la cause profonde d''un problème", "Dot Voting : 3 gommettes par élève pour prioriser rapidement"], "en": ["Mind Mapping: visual mental map from a central word", "SCAMPER: 7 guided creative questions", "Brainwriting: ideas written in silence", "The 5 Whys: trace back to the root cause", "Dot Voting: 3 stickers per student"]}',
  4, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Le SCAMPER en détail', 'SCAMPER in detail',
  'liste',
  '{"fr": ["S — Substituer : remplacer un élément par autre chose", "C — Combiner : fusionner deux idées ou produits existants", "A — Adapter : s''inspirer d''un concept qui fonctionne ailleurs", "M — Modifier / Magnifier : changer la taille, la forme ou l''usage", "P — Proposer d''autres usages : ce produit peut-il servir à autre chose ?", "E — Éliminer : simplifier en supprimant une étape", "R — Réorganiser / Inverser : inverser la logique du service"], "en": ["S — Substitute", "C — Combine", "A — Adapt", "M — Modify", "P — Put to other uses", "E — Eliminate", "R — Rearrange"]}',
  5, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Comment choisir la bonne idée ?', 'How to choose the right idea?',
  'definition',
  '{"fr": "Après la génération, on passe en mode critique. Une bonne idée répond à un besoin réel, est réalisable avec les ressources disponibles, se distingue de ce qui existe déjà, et enthousiasme l''équipe. La grille d''évaluation permet de comparer les idées sur 5 critères notés de 1 à 5.", "en": "After generation, switch to critical mode. A good idea addresses a real need, is feasible, stands out, and motivates the team."}',
  6, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Grille d''évaluation des idées', 'Idea evaluation grid',
  'liste',
  '{"fr": ["Besoin réel : un problème concret existe-t-il ? (1–5)", "Faisabilité : réalisable avec nos moyens ? (1–5)", "Originalité : se distingue de ce qui existe ? (1–5)", "Rentabilité potentielle : modèle économique envisageable ? (1–5)", "Motivation d''équipe : l''équipe est enthousiaste ? (1–5)", "Total / 25 — ≥20 Prioritaire · 15–19 À explorer · <15 À revoir"], "en": ["Real need (1–5)", "Feasibility (1–5)", "Originality (1–5)", "Revenue potential (1–5)", "Team motivation (1–5)", "Total / 25"]}',
  7, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Activité — BTS Digital Content (JEL / GEN-E)', 'Activity — BTS Digital Content',
  'activite',
  '{"contexte": "Dans le cadre du JEL Startup Programme et de GEN-E, cette activité est la première étape concrète de votre start-up.", "phase_1": {"label": "Phase 1 — En équipe start-up (10 min)", "question_depart": "Quel problème réel voulons-nous résoudre avec notre start-up ?", "consignes": ["Générez un maximum d''idées sans filtre", "Regroupez par thèmes", "Chaque membre sélectionne 1 idée à défendre (4 élèves = 4 idées)"]}, "phase_2": {"label": "Phase 2 — Pitch devant la classe + SCAMPER + vote final", "consignes": ["Chaque membre présente son idée (1 min)", "La classe applique le SCAMPER collectivement", "Dot voting : 3 gommettes par élève", "Objectif : 1 idée retenue par équipe"]}}',
  8, array['BTS']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Activité — 3CN Mini-entreprises', 'Activity — 3CN Mini-enterprises',
  'activite',
  '{"contexte": "Pour votre mini-entreprise, cette activité vous permet de trouver le produit ou service que vous allez vendre.", "phase_1": {"label": "Phase 1 — En équipe mini-entreprise (10 min)", "question_depart": "Quel produit ou service pourrions-nous vendre à l''école ou dans notre entourage ?", "consignes": ["Pensez aux besoins de vos camarades", "Notez toutes vos idées sans filtre", "Chaque membre sélectionne 1 idée à défendre"]}, "phase_2": {"label": "Phase 2 — Présentation au groupe + SCAMPER + vote final", "consignes": ["Chaque membre présente son idée (1 min)", "SCAMPER collectif", "Dot voting : 3 gommettes par élève", "Objectif : 1 idée par mini-entreprise"]}}',
  9, array['3CN']
),
(
  '33333333-0001-0001-0001-000000000001',
  'Activité — 2TPCM Entreprises d''entraînement', 'Activity — 2TPCM Training Companies',
  'activite',
  '{"contexte": "Dans le cadre de l''ENAP, cette activité vous permet de générer et sélectionner une idée d''amélioration.", "phase_1": {"label": "Phase 1 — En équipe département (10 min)", "question_depart": "Comment améliorer notre entreprise d''entraînement ?", "consignes": ["Explorez les pistes : nouveau produit, amélioration de processus", "Notez toutes vos idées", "Chaque membre sélectionne 1 idée"]}, "phase_2": {"label": "Phase 2 — Réunion plénière + SCAMPER + vote final", "consignes": ["Présentation lors d''une réunion d''entreprise simulée", "SCAMPER collectif", "Dot voting : 3 gommettes par élève", "Objectif : 1 idée par ENAP"]}}',
  10, array['2TPCM']
);

-- ── SECTIONS — BMC ───────────────────────────────────────────
insert into sections_cours (chapitre_id, titre_fr, titre_en, type, contenu, ordre, filieres) values
(
  '33333333-0001-0001-0001-000000000004',
  'Qu''est-ce que le Business Model Canvas ?', 'What is the Business Model Canvas?',
  'definition',
  '{"fr": "Le Business Model Canvas (BMC) est un outil visuel créé par Alexander Osterwalder qui permet de décrire, visualiser et analyser le modèle économique d''une entreprise en 9 blocs sur une seule page.", "en": "The BMC is a visual tool to describe and analyse a business model in 9 building blocks on a single page."}',
  1, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000004',
  'Les 9 blocs du BMC', 'The 9 building blocks',
  'liste',
  '{"fr": ["Segments de clientèle : qui sont vos clients ?", "Proposition de valeur : qu''apportez-vous à vos clients ?", "Canaux : comment atteignez-vous vos clients ?", "Relations clients : quel type de relation entretenez-vous ?", "Sources de revenus : comment gagnez-vous de l''argent ?", "Ressources clés : de quoi avez-vous besoin pour fonctionner ?", "Activités clés : que faites-vous concrètement ?", "Partenaires clés : qui vous aide à créer de la valeur ?", "Structure de coûts : quelles sont vos principales dépenses ?"], "en": ["Customer Segments", "Value Proposition", "Channels", "Customer Relationships", "Revenue Streams", "Key Resources", "Key Activities", "Key Partners", "Cost Structure"]}',
  2, array['BTS','3CN','2TPCM']
),
(
  '33333333-0001-0001-0001-000000000004',
  'Exemple : DigitalBoost', 'Example: DigitalBoost',
  'exemple',
  '{"fr": "Proposition de valeur : gestion des réseaux sociaux clé en main pour PME. Segment : PME luxembourgeoises de 5 à 50 employés. Revenus : abonnements mensuels (150–500 €/mois). Coûts principaux : salaires, logiciels, publicité.", "en": "Value proposition: turnkey social media management for SMEs. Revenue: monthly subscriptions €150–500/month."}',
  3, array['BTS','3CN','2TPCM']
);

-- ── SECTIONS — COMPTABILITÉ ──────────────────────────────────
insert into sections_cours (chapitre_id, titre_fr, titre_en, type, contenu, ordre, filieres) values
(
  '33333333-0001-0001-0001-000000000003',
  'Le système de la TVA', 'The VAT system',
  'definition',
  '{"fr": "La TVA (Taxe sur la Valeur Ajoutée) est un impôt indirect payé par le consommateur final. L''entreprise la collecte pour le compte de l''État. Au Luxembourg, le taux normal est de 17 %.", "en": "VAT is an indirect tax paid by the final consumer. In Luxembourg, the standard rate is 17%."}',
  1, array['BTS']
),
(
  '33333333-0001-0001-0001-000000000003',
  'Formules TVA', 'VAT formulas',
  'formule',
  '{"fr": ["Prix TTC = Prix HT × (1 + taux TVA)", "Prix HT = Prix TTC ÷ (1 + taux TVA)", "TVA = Prix TTC − Prix HT"], "en": ["Price incl. VAT = Price excl. VAT × (1 + VAT rate)", "Price excl. VAT = Price incl. VAT ÷ (1 + VAT rate)", "VAT = Price incl. VAT − Price excl. VAT"]}',
  2, array['BTS']
),
(
  '33333333-0001-0001-0001-000000000003',
  'Investissement vs Dépense', 'Investment vs Expense',
  'definition',
  '{"fr": "Un investissement est l''achat d''un bien durable utilisé sur plusieurs années (ordinateur, véhicule). Il est amorti progressivement. Une dépense est consommée dans l''exercice en cours (loyer, salaire). Cette distinction impacte directement le résultat imposable.", "en": "An investment is a durable asset used over several years. An expense is consumed in the current financial year. This distinction directly impacts taxable profit."}',
  3, array['BTS']
);

-- ── SECTIONS — SEUIL DE RENTABILITÉ ──────────────────────────
insert into sections_cours (chapitre_id, titre_fr, titre_en, type, contenu, ordre, filieres) values
(
  '33333333-0001-0001-0001-000000000006',
  'Notion de seuil de rentabilité', 'Break-even concept',
  'definition',
  '{"fr": "Le seuil de rentabilité (SR) est le chiffre d''affaires minimum que l''entreprise doit atteindre pour couvrir toutes ses charges et ne réaliser ni bénéfice ni perte. En dessous : perte. Au-dessus : bénéfice.", "en": "The break-even point is the minimum revenue to cover all costs — below: loss, above: profit."}',
  1, array['BTS']
),
(
  '33333333-0001-0001-0001-000000000006',
  'Méthode 1 — Marge sur coûts variables', 'Method 1 — Contribution margin',
  'formule',
  '{"fr": ["Marge sur CV = Chiffre d''affaires − Charges variables", "Taux de marge = Marge sur CV ÷ CA × 100", "SR = Charges fixes ÷ Taux de marge"], "en": ["Contribution margin = Revenue − Variable costs", "Contribution rate = Contribution margin ÷ Revenue × 100", "BEP = Fixed costs ÷ Contribution rate"]}',
  2, array['BTS']
),
(
  '33333333-0001-0001-0001-000000000006',
  'Méthode 2 — En nombre d''unités', 'Method 2 — In units',
  'formule',
  '{"fr": ["SR en unités = Charges fixes ÷ (Prix unitaire − Coût variable unitaire)"], "en": ["BEP in units = Fixed costs ÷ (Unit price − Unit variable cost)"]}',
  3, array['BTS']
),
(
  '33333333-0001-0001-0001-000000000006',
  'Exemple — Événement networking', 'Example — Networking event',
  'exemple',
  '{"fr": "Charges fixes : 1 200 € (salle, sono, animateur). Prix du billet : 25 €. Coût variable par participant : 5 € (collation). Marge par billet : 20 €. Seuil de rentabilité : 1 200 ÷ 20 = 60 participants minimum.", "en": "Fixed costs: €1,200. Ticket: €25. Variable cost: €5. Margin: €20. Break-even: 60 participants."}',
  4, array['BTS']
);

-- ── ACTUALITÉS ───────────────────────────────────────────────
insert into actualites (titre, description, date_affichee, classe_ids, ordre) values
  ('Concours National des Mini-Entreprises 2025', 'Inscriptions ouvertes jusqu''au 15 juin.', '12 mai 2025',
   array['11111111-0001-0001-0001-000000000002','11111111-0001-0001-0001-000000000003','11111111-0001-0001-0001-000000000004','11111111-0001-0001-0001-000000000005'], 1),
  ('Nouveau template : Business Plan disponible', 'Un modèle mis à jour est disponible dans la boîte à outils.', '8 mai 2025',
   array['11111111-0001-0001-0001-000000000002'], 2),
  ('Retour sur le Bootcamp Start-up', 'Revivez les moments forts du bootcamp annuel.', '3 mai 2025',
   array['11111111-0001-0001-0001-000000000001','11111111-0001-0001-0001-000000000002'], 3);

-- ── CALENDRIER ───────────────────────────────────────────────
insert into calendrier (jour, mois, titre, sous_titre, tag, classe_ids) values
  (24, 'mai',  'Rendu Business Plan', 'Mini-Entreprise',           'deadline', array['11111111-0001-0001-0001-000000000003','11111111-0001-0001-0001-000000000004']),
  (27, 'mai',  'Workshop Pitch Deck', 'Start-up · 14h–16h',        'atelier',  array['11111111-0001-0001-0001-000000000002']),
  (2,  'juin', 'Soutenance Finale',   'Entreprise d''entraînement', 'event',    array['11111111-0001-0001-0001-000000000005']),
  (10, 'juin', 'Remise des prix JEL', 'BTS & 3CN',                  'event',    array['11111111-0001-0001-0001-000000000002','11111111-0001-0001-0001-000000000003','11111111-0001-0001-0001-000000000004']);
