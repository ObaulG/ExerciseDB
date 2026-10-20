-- Schéma PostgreSQL (Supabase) de la base d'exercices.
-- Le texte des exercices et corrigés est stocké en LaTeX compilable tel quel
-- par latex.js (https://latex.js.org) côté navigateur.
-- Une éventuelle image (au plus une par exercice) est déclarée à l'extérieur du
-- code LaTeX, dans la colonne image_url.
-- À exécuter dans le SQL Editor de Supabase, ou automatiquement via db.init_db().

CREATE TABLE IF NOT EXISTS exercise (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    text        TEXT NOT NULL,
    image_url   TEXT,
    type        TEXT,
    niveau      TEXT,
    temps_estime INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exercise ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS correction (
    id          SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correction_exercise ON correction(exercise_id);

-- --- Thèmes : table dédiée + table de liaison many-to-many ---

CREATE TABLE IF NOT EXISTS theme (
    id    SERIAL PRIMARY KEY,
    label TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS exercise_theme (
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    theme_id    INTEGER NOT NULL REFERENCES theme(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_theme_theme ON exercise_theme(theme_id);

-- --- Authentification ---

CREATE TABLE IF NOT EXISTS "user" (
    id            SERIAL PRIMARY KEY,
    pseudo        TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration : ajoute is_admin si la table existait avant l'ajout de la colonne.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Unicité du pseudo insensible à la casse (équivalent de COLLATE NOCASE en SQLite).
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_pseudo_lower ON "user"(LOWER(pseudo));

CREATE TABLE IF NOT EXISTS session (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
