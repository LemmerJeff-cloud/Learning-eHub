# Anleitung für KI-generierte Kursinhalte – EHub

Dieses Dokument einer KI (ChatGPT, Claude, etc.) zusammen mit dem eigentlichen Auftrag
(„Erstelle den Kursinhalt zum Thema XY für BTS/3CN/2TPCM") anhängen. Es beschreibt exakt,
in welcher Struktur die KI ihre Antwort liefern soll, damit der Inhalt danach ohne
Umformatierung in EHub übernommen werden kann.

**Wichtig für die KI:** Antworte ausschließlich mit einem JSON-Objekt nach dem unten
beschriebenen Schema (in einem einzigen Code-Block). Kein Fließtext davor oder danach,
außer wenn explizit Rückfragen nötig sind.

---

## 1. Grundstruktur der Plattform

```
Kapitel (chapitre)
 └─ Sektion (section)         [hat einen von 3 Typen: blocs / activite / editeur]
     ├─ blocs   → Liste von Inhaltsbausteinen (Text, Définition, Exemple, Formule, Liste)
     ├─ activite → mehrstufige Übungsaktivität (Kontext + Phasen mit Konsignes)
     └─ editeur → freier Rich-Text (Überschriften, Tabellen möglich)
     └─ Übungen (exercice)    [gehören zu einer Sektion, 10 mögliche Typen, automatisch
                                oder manuell korrigiert]
```

- Ein Kapitel enthält mehrere Sektionen.
- Eine Sektion enthält ENTWEDER Bausteine (`blocs`) ODER eine Aktivität (`activite`) ODER
  freien Text (`editeur`) — nie mehrmals gemischt.
- Interaktive Übungen (`exercice`) hängen an einer Sektion, unabhängig von deren Typ.
  Pro Sektion sind beliebig viele Übungen möglich, auch keine.
- Sprache: **alles auf Französisch** (Feldnamen wie `titre_fr` sind auf Deutsch benannt,
  der Inhalt ist es nicht). Zielgruppe: Schüler der Sektionen BTS, 3CN, 2TPCM
  („Économie de Gestion" – Wirtschaftsfächer). Ton: lehrbuchartig, klar, mit konkreten
  Beispielen aus der Unternehmenspraxis.

---

## 2. Ausgabeschema (JSON)

```json
{
  "chapitre": {
    "titre_fr": "string – Titel des Kapitels",
    "emoji": "ein einzelnes Emoji, thematisch passend",
    "description_fr": "string – 1-2 Sätze Kurzbeschreibung",
    "filieres": ["BTS", "3CN", "2TPCM"],
    "sections": [ /* siehe Abschnitt 3 */ ]
  }
}
```

- `filieres`: nur die Sektionen eintragen, für die das Kapitel gilt. Im Zweifel alle drei
  angeben (Standard = für alle sichtbar).
- Reihenfolge der Elemente in den Arrays = Anzeigereihenfolge (keine separate `ordre`-Zahl
  nötig, das übernehme ich beim Einpflegen).
- Keine IDs generieren (`id`, `chapitre_id`, `section_id` etc.) — die vergibt die Datenbank
  automatisch.

---

## 3. Sektionen

Jede Sektion in `chapitre.sections[]`:

```json
{
  "titre_fr": "string – Titel der Sektion",
  "type": "blocs | activite | editeur",
  "filieres": ["BTS", "3CN", "2TPCM"],
  "contenu": { /* Form abhängig von type, siehe unten */ },
  "exercices": [ /* optional, siehe Abschnitt 4 */ ]
}
```

### 3.1 Typ `blocs` — Bausteine

`contenu = { "blocks": [ <baustein>, ... ] }`. Jeder Baustein hat einen `type`:

| type | Feld | Beschreibung |
|---|---|---|
| `texte` | `html` | Normaler Fließtext, kein Rahmen |
| `definition` | `html` | Wird in einer hervorgehobenen „Définition"-Box angezeigt |
| `exemple` | `html` | Wird in einer hervorgehobenen „Exemple"-Box angezeigt |
| `formule` | `items` (string[]) | Eine oder mehrere Formeln, je ein Eintrag pro Zeile |
| `liste` | `items` (string[]) | Aufzählungspunkte |
| `video` | `src`, `provider` | Eingebettetes Video (YouTube/Vimeo-Link oder hochgeladene Datei) |

Für `html`-Felder nur einfaches HTML verwenden: `<p>`, `<strong>`, `<em>`, `<ul><li>`,
`<ol><li>`. Keine Überschriften, Tabellen oder Bilder in `blocs`-Feldern (dafür ist der Typ
`editeur` gedacht, siehe 3.3).

**Zum `video`-Baustein:** Die KI kennt keine echten, funktionierenden Videolinks — sie soll
daher **keine `video`-Bausteine erzeugen**. Stattdessen an der passenden Stelle im
`texte`-Baustein einen Hinweis wie `<p><em>[Vidéo à insérer ici : …]</em></p>` einfügen
(kurz beschreiben, was für ein Video dort inhaltlich passen würde). Das Video selbst wird
danach manuell im Editor über den Button „Vidéo" ergänzt (Link einfügen oder Datei
hochladen).

Beispiel:
```json
{
  "titre_fr": "Les coûts fixes et variables",
  "type": "blocs",
  "filieres": ["BTS", "3CN", "2TPCM"],
  "contenu": {
    "blocks": [
      { "type": "texte", "html": "<p>Toute entreprise supporte deux grandes catégories de coûts.</p>" },
      { "type": "definition", "html": "<p>Le <strong>coût fixe (CF)</strong> ne varie pas avec le niveau de production.</p>" },
      { "type": "definition", "html": "<p>Le <strong>coût variable (CV)</strong> évolue proportionnellement à la production.</p>" },
      { "type": "exemple", "html": "<p>Le loyer d'un atelier est un coût fixe : il est dû même si la production est nulle.</p>" },
      { "type": "formule", "items": ["CT = CF + CV", "CM = CT / Q"] },
      { "type": "liste", "items": ["Le CF est indépendant de Q", "Le CV augmente avec Q", "Le CT est la somme des deux"] }
    ]
  }
}
```

### 3.2 Typ `activite` — mehrstufige Aktivität

```json
{
  "titre_fr": "Étude de cas : l'entreprise Delta",
  "type": "activite",
  "filieres": ["BTS", "3CN", "2TPCM"],
  "contenu": {
    "contexte": "<p>HTML – Situation, die den Fällen zugrunde liegt (optional).</p>",
    "phases": [
      {
        "label": "Découverte",
        "question_depart": "<p>HTML, optional – einleitende Frage</p>",
        "consignes": ["Erste Aufgabe/Anweisung", "Zweite Aufgabe/Anweisung"]
      },
      {
        "label": "Analyse",
        "question_depart": "",
        "consignes": ["..."]
      }
    ]
  }
}
```
`label` kurz halten (z. B. Découverte, Analyse, Mise en pratique, Synthèse). `consignes`
sind knappe, direkte Handlungsanweisungen an die Schüler (keine ganzen Absätze).

### 3.3 Typ `editeur` — freier Rich-Text

```json
{
  "titre_fr": "Synthèse du chapitre",
  "type": "editeur",
  "filieres": ["BTS", "3CN", "2TPCM"],
  "contenu": { "html": "<h3>...</h3><p>...</p><table>...</table>" }
}
```
Hier sind auch Überschriften und Tabellen erlaubt, falls für den Inhalt sinnvoll (z. B.
Vergleichstabellen, Zusammenfassungen). Auch hier gilt: keine Videos einbetten (siehe
Hinweis zum `video`-Baustein oben) — stattdessen einen Platzhaltertext `<p><em>[Vidéo à
insérer ici : …]</em></p>` an der passenden Stelle einfügen.

---

## 4. Interaktive Übungen (`exercices`)

Jede Übung im `exercices[]`-Array einer Sektion:

```json
{
  "titre": "string – interner Titel, für Schüler nicht sichtbar als Überschrift",
  "type": "einer der 11 Typen unten",
  "enonce": "<p>HTML – die eigentliche Fragestellung</p>",
  "points": <integer>,
  "options": { /* Form abhängig von type */ },
  "correction": { /* Form abhängig von type */ },
  "parametres": {
    "explication": "<p>HTML – wird nach Beantwortung mit der Lösung gezeigt (empfohlen, immer ausfüllen)</p>",
    "feedback_faux": "<p>HTML, optional – sofortiges Feedback bei falscher Antwort</p>",
    "hint": "<p>HTML, optional – Hinweis nach einem Fehlversuch</p>"
  }
}
```

`parametres.explication` bitte bei **jeder** Übung ausfüllen (kurze Begründung, warum die
Lösung richtig ist) — das ist der wichtigste Lernmoment für die Schüler. `hint` und
`feedback_faux` sind optional, aber bei anspruchsvolleren Übungen empfehlenswert.

Für `type: "libre"` (manuell korrigiert) entfällt `parametres` (leer lassen).

### Die 11 Übungstypen

**`qcm`** – Mehrfachauswahl (mehrere richtige Antworten möglich)
```json
{ "type": "qcm",
  "enonce": "<p>Quels éléments suivants sont des coûts fixes ?</p>",
  "options": ["Loyer", "Matières premières", "Assurance", "Électricité de production"],
  "correction": [0, 2],
  "points": 2 }
```
`options`: Liste der Antwortmöglichkeiten. `correction`: Indizes (ab 0) der richtigen.

**`choix_unique`** – Einfachauswahl (genau eine richtige Antwort)
```json
{ "type": "choix_unique",
  "enonce": "<p>Quelle est la bonne formule du coût moyen ?</p>",
  "options": ["CM = CT/Q", "CM = CT×Q", "CM = CF/CV"],
  "correction": { "index": 0 },
  "points": 1 }
```

**`vrai_faux`** – Wahr/Falsch
```json
{ "type": "vrai_faux",
  "enonce": "<p>Le coût total augmente toujours avec la quantité produite.</p>",
  "options": [],
  "correction": true,
  "points": 1 }
```

**`reponse_courte`** – kurze Textantwort (Freitext, mit Alternativen)
```json
{ "type": "reponse_courte",
  "enonce": "<p>Comment appelle-t-on la perte de valeur d'un bien avec le temps ?</p>",
  "options": [],
  "correction": { "reponses": ["amortissement", "amortissements"], "case_sensible": false, "ignorer_espaces": true },
  "points": 1 }
```
`reponses`: alle akzeptierten Schreibweisen (inkl. Plural/Singular-Varianten sinnvoll).

**`reponse_numerique`** – Zahlenwert mit Toleranz
```json
{ "type": "reponse_numerique",
  "enonce": "<p>Une entreprise a un CT de 5000€ pour 400 unités. Calculez le coût moyen (en €).</p>",
  "options": [],
  "correction": { "valeur": 12.5, "tolerance": 0.1, "unite": "€" },
  "points": 1 }
```
`valeur` als normale JSON-Zahl (Punkt als Dezimaltrennzeichen im JSON selbst — das ist
unabhängig davon, dass Schüler mit Komma eingeben dürfen, das übernimmt die Plattform).

**`ordre`** – Reihenfolge herstellen
```json
{ "type": "ordre",
  "enonce": "<p>Classez les étapes du calcul du coût de revient.</p>",
  "options": ["Coût d'achat", "Coût de production", "Coût de revient", "Prix de vente"],
  "correction": ["Coût d'achat", "Coût de production", "Coût de revient", "Prix de vente"],
  "points": 1 }
```
`options` und `correction` sind identisch (die richtige Reihenfolge); die Plattform mischt
sie für den Schüler automatisch.

**`glisser_deposer`** – Zuordnung/Paare (im Admin „Association" genannt)
```json
{ "type": "glisser_deposer",
  "enonce": "<p>Associez chaque sigle à sa définition.</p>",
  "options": [
    { "gauche": "CF", "droite": "Coût fixe" },
    { "gauche": "CV", "droite": "Coût variable" }
  ],
  "correction": [
    { "gauche": "CF", "droite": "Coût fixe" },
    { "gauche": "CV", "droite": "Coût variable" }
  ],
  "points": 1 }
```
`options` und `correction` identisch aufbauen (die richtigen Paare).

**`categorisation`** – Elemente in Kategorien einordnen
```json
{ "type": "categorisation",
  "enonce": "<p>Classez chaque charge selon sa nature.</p>",
  "options": {
    "items": [
      { "id": "i1", "label": "Loyer" },
      { "id": "i2", "label": "Matières premières" }
    ],
    "categories": [
      { "id": "c1", "label": "Coût fixe" },
      { "id": "c2", "label": "Coût variable" }
    ]
  },
  "correction": { "placements": { "i1": "c1", "i2": "c2" } },
  "points": 2 }
```
`id`-Werte innerhalb der Übung frei wählbar (z. B. `i1`, `c1`), müssen nur innerhalb der
Übung eindeutig und mit `correction.placements` konsistent sein.

**`tableau_calcul`** – Rechentabelle mit mehreren Feldern (Teilpunkte pro Feld)
```json
{ "type": "tableau_calcul",
  "enonce": "<p>Complétez le tableau des coûts.</p>",
  "options": { "champs": [
    { "id": "f1", "label": "Coût total", "type": "nombre", "tolerance": 0.5, "unite": "€", "points": 2 },
    { "id": "f2", "label": "Coût moyen", "type": "nombre", "tolerance": 0.1, "unite": "€", "points": 1 }
  ] },
  "correction": { "champs": { "f1": { "valeur": 1200 }, "f2": { "valeur": 12 } } },
  "points": 3 }
```
`points` auf Übungsebene = Summe der `champs[].points` (bitte konsistent angeben).
`type` pro Feld ist `"nombre"` oder `"texte"`.

**`journal`** – Journal comptable (Buchungssatz) zum Ausfüllen: Schüler tragen pro Zeile
Konto, Débit und Crédit ein (Buchhaltung, für BTS/3CN besonders relevant)
```json
{ "type": "journal",
  "enonce": "<p>Le 5 mars, l'entreprise achète des fournitures de bureau pour 300€ à crédit (facture non réglée). Enregistrez l'écriture.</p>",
  "options": {
    "comptes": [
      { "numero": "606", "libelle": "Achats non stockés" },
      { "numero": "512", "libelle": "Banque" }
    ],
    "tolerance": 0,
    "lignes": [ { "id": "l1", "points": 1 }, { "id": "l2", "points": 1 } ]
  },
  "correction": { "lignes": {
    "l1": { "compte": "606", "libelle": "Achats non stockés", "debit": 300, "credit": 0 },
    "l2": { "compte": "512", "libelle": "Banque", "debit": 0, "credit": 300 }
  } },
  "points": 2 }
```
- `options.comptes`: das für die Übung relevante Plan-comptable-Auszug (wird dem Schüler als
  Auswahlliste angezeigt — ohne Tippfehler-Risiko). Bei leerem `comptes`-Array tippt der
  Schüler die Kontonummer frei ein.
- `options.lignes`: eine Zeile pro Buchungssatzposition (üblich: 1 Zeile Débit + 1 Zeile
  Crédit, bei komplexeren Sätzen auch mehr). Jede Zeile hat eine `id` (frei wählbar, z. B.
  `l1`, `l2`, …) und `points`.
- `correction.lignes`: pro Zeilen-`id` das erwartete `compte`, `libelle` (nur informativ,
  wird NICHT bewertet) sowie `debit`/`credit` (der jeweils andere Wert ist `0`).
- `points` auf Übungsebene = Summe der `lignes[].points`.
- Bewertet werden ausschließlich Konto + Débit/Crédit-Betrag, nicht der Libellé-Wortlaut.
  Reihenfolge der Zeilen ist fix (Zeile 1 der Lösung entspricht Zeile 1 im Formular) — bei
  mehreren Débit- oder mehreren Crédit-Zeilen also eine sinnvolle, eindeutige Reihenfolge
  wählen (z. B. Débit-Zeile(n) zuerst, dann Crédit-Zeile(n)).

**`libre`** – freie Antwort, manuell korrigiert (kein `parametres`, `correction` ist nur
ein Referenztext für die Lehrkraft, wird Schülern nicht angezeigt)
```json
{ "type": "libre",
  "enonce": "<p>Expliquez en 5 lignes la différence entre coût fixe et coût variable, avec un exemple.</p>",
  "options": [],
  "correction": "Éléments attendus : définitions correctes des deux notions, un exemple pertinent, mention de la proportionnalité du CV.",
  "points": 3 }
```

---

## 5. Pädagogische Hinweise für die KI

- Pro Kapitel 3–8 Sektionen, thematisch klar abgegrenzt.
- Innerhalb einer `blocs`-Sektion: mit `texte` (Einleitung) beginnen, dann
  `definition`/`exemple` abwechselnd, `formule`/`liste` wo passend. Nicht mehr als
  ca. 6–8 Bausteine pro Sektion (Übersichtlichkeit).
- Pro Sektion 2–5 Übungen, Typen mischen (nicht nur QCM). Schwierigkeit leicht steigend.
  vrai_faux/qcm/choix_unique eignen sich für schnelle Verständnischecks direkt nach einer
  Définition; reponse_numerique/tableau_calcul für Rechenanwendungen; categorisation/
  glisser_deposer/ordre für Struktur-/Prozessverständnis; journal für Buchhaltungs-Kapitel
  (Comptabilité, écritures) — dort besonders naheliegend; libre für Transferfragen am Ende
  eines Kapitels.
- Realistische, aber einfache Zahlen bei Rechenübungen verwenden (keine krummen Dezimalzahlen
  ohne pädagogischen Grund).
- `explication` immer so schreiben, dass sie auch ohne Rückfrage beim Lehrer verständlich ist.

---

## 6. Workflow

1. Dieses Dokument + Themenauftrag an die KI geben.
2. Die KI liefert das JSON gemäß obigem Schema (ein Kapitel pro Antwort empfohlen, bei
   langen Kapiteln notfalls sektionsweise).
3. Das JSON hier in den Chat mit Claude Code einfügen — Claude übernimmt es direkt in
   EHub (Datenbank bzw. Admin-Oberfläche), ohne dass die Struktur von Hand nachgebaut
   werden muss.
