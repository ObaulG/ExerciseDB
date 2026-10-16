# Assistant Maths — ExerciseDB (refonte)

Site FastAPI d'assistance aux étudiants en mathématiques, avec un agent LLM
(AtomicAgents + Mistral) capable d'évaluer les réponses à des problèmes de maths.
Interface rétro années 2000 (fenêtres type Windows 98), templates Jinja2.

## Base de données

Deux backends sont supportés :

- **PostgreSQL (Supabase)** — utilisé si la variable `DATABASE_URL` est définie.
  Le schéma (`app/database/schema_postgres.sql`) est appliqué automatiquement au
  démarrage (`db.init_db()`), ou peut être exécuté manuellement dans le SQL
  Editor de Supabase.
- **SQLite** — repli local si `DATABASE_URL` est absente (fichier `exercises.db`).

### Configuration Supabase

1. Dans le tableau de bord Supabase, ouvrez
   **Project Settings → Database → Connection string → URI** et copiez l'URI
   (mode session ou transaction pooler).
2. Exportez-la dans l'environnement avant de lancer le serveur :

   ```bash
   export DATABASE_URL="postgresql://postgres.xxx:MotDePasse@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
   ```

   Ne committez jamais cette chaîne : elle contient votre mot de passe. En
   production, utilisez les variables d'environnement de votre hébergeur.

## Lancer en local

```bash
pip install -r requirements.txt
export MISTRAL_API_KEY="votre_cle_mistral"   # obligatoire pour l'évaluateur
uvicorn app.main:app --reload
```

Ouvrir http://127.0.0.1:8000/

## Configuration

| Variable           | Rôle                                                      | Défaut                 |
|--------------------|-----------------------------------------------------------|------------------------|
| `MISTRAL_API_KEY`  | Clé API Mistral (lue côté serveur, jamais commitée)       | —                      |
| `MISTRAL_MODEL`    | Modèle utilisé par l'agent                                | `mistral-small-latest` |
| `DATABASE_URL`     | URI PostgreSQL (Supabase). Vide = SQLite local            | —                      |

## API

- `GET /` — page de chat (évaluateur de réponses)
- `GET /exercises` — page d'import d'exercices
- `GET /profile` — profil étudiant
- `GET /health` — état du service
- `POST /api/evaluate` — évalue une réponse : `{ "problem": "...", "student_answer": "..." }`
  - Réponse : `{ is_correct, score (0-10), feedback, corrected_solution }`
  - `503` si `MISTRAL_API_KEY` absente, `502` si erreur LLM
- `GET/POST /api/exercises` — lister / créer un exercice (avec corrigés)
- `GET /api/exercises/{id}` — détail d'un exercice
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

## Tests

```bash
python -m pytest tests/ -q
```
