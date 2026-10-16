-- Schéma PostgreSQL (Supabase) de la base d'exercices.
-- Le texte des exercices et corrigés est stocké en LaTeX balisé ($...$ / $$...$$),
-- rendu côté navigateur avec KaTeX.
-- À exécuter dans le SQL Editor de Supabase, ou automatiquement via db.init_db().

CREATE TABLE IF NOT EXISTS exercise (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS correction (
    id          SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correction_exercise ON correction(exercise_id);

CREATE TABLE IF NOT EXISTS "user" (
    id            SERIAL PRIMARY KEY,
    pseudo        TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unicité du pseudo insensible à la casse (équivalent de COLLATE NOCASE en SQLite).
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_pseudo_lower ON "user"(LOWER(pseudo));

CREATE TABLE IF NOT EXISTS session (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
