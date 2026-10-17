"""Crée un utilisateur admin dans la base de données.

Usage :
    python scripts/create_admin.py
    python scripts/create_admin.py --pseudo admin --password mon_mot_de_passe

Le mot de passe est haché avec PBKDF2-SHA256 (sel aléatoire + 100 000 itérations),
au format attendu par app.auth.verify_password. L'utilisateur est inséré
directement en base avec is_admin = TRUE.
"""

import argparse
import sys
from pathlib import Path

# Permet d'exécuter le script depuis la racine du projet ou depuis scripts/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.auth import hash_password
from app.database import db


def main() -> None:
    parser = argparse.ArgumentParser(description="Créer un utilisateur admin.")
    parser.add_argument("--pseudo", required=True, help="Pseudo de l'admin.")
    parser.add_argument("--password", required=True, help="Mot de passe (en clair).")
    args = parser.parse_args()
    print("----------")
    if len(args.pseudo) < 3:
        print("Erreur : le pseudo doit faire au moins 3 caractères.")
        sys.exit(1)
    if len(args.password) < 6:
        print("Erreur : le mot de passe doit faire au moins 6 caractères.")
        sys.exit(1)

    password_hash = hash_password(args.password)
    print("hashed: ", password_hash)
    try:
        with db.get_connection() as conn:
            row = conn.execute(
                'INSERT INTO "user" (pseudo, password_hash, is_admin) '
                "VALUES (%s, %s, TRUE) RETURNING id",
                (args.pseudo, password_hash),
            ).fetchone()
        print(f"Admin créé : pseudo={args.pseudo}, id={row['id']}")
    except db.UniqueViolation:
        print(f"Erreur : le pseudo « {args.pseudo} » existe déjà.")
        sys.exit(1)


if __name__ == "__main__":
    main()
