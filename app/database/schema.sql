-- Schéma de la base d'exercices (SQLite)
-- Le texte des exercices et corrigés est stocké en LaTeX balisé ($...$ / $$...$$),
-- rendu côté navigateur avec KaTeX.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercise (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS correction (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_correction_exercise ON correction(exercise_id);
