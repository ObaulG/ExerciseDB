# Assistant Maths — ExerciseDB (refonte)

Site FastAPI d'assistance aux étudiants en mathématiques, avec un agent LLM
(AtomicAgents + Mistral) capable d'évaluer les réponses à des problèmes de maths.
Interface rétro années 2000 (fenêtres type Windows 98), templates Jinja2.

## Lancer en local

```bash
pip install -r requirements.txt
export MISTRAL_API_KEY="votre_cle_mistral"   # obligatoire pour l'évaluateur
uvicorn app.main:app --reload
```

Ouvrir http://127.0.0.1:8000/

## Configuration

| Variable           | Rôle                                      | Défaut                |
|--------------------|-------------------------------------------|-----------------------|
| `MISTRAL_API_KEY`  | Clé API Mistral (lue côté serveur, jamais commitée) | —          |
| `MISTRAL_MODEL`   | Modèle utilisé par l'agent                | `mistral-small-latest`|

## API

- `GET /` — page de chat (évaluateur de réponses)
- `GET /health` — état du service
- `POST /api/evaluate` — évalue une réponse : `{ "problem": "...", "student_answer": "..." }`
  - Réponse : `{ is_correct, score (0-10), feedback, corrected_solution }`
  - `503` si `MISTRAL_API_KEY` absente, `502` si erreur LLM

## Tests

```bash
python -m pytest tests/ -q
```
