import sqlite3
import os
import numpy as np
from deepface import DeepFace

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def compute_embedding(image_path):
    """
    Compute embedding vector from image.
    """
    try:
        embedding = DeepFace.represent(
            img_path=image_path,
            model_name="Facenet512",
            detector_backend="retinaface",
            enforce_detection=False
        )
        return np.array(embedding[0]["embedding"], dtype=np.float32)
    except Exception as e:
        print(f"⚠️ Skipping {image_path}: {e}")
        return None

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Ensure column exists
    try:
        cursor.execute("ALTER TABLE students ADD COLUMN embedding BLOB")
        conn.commit()
        print("✅ Added 'embedding' column to students table.")
    except sqlite3.OperationalError:
        print("ℹ️ 'embedding' column already exists.")

    cursor.execute("SELECT id, student_name, student_surname, image_path FROM students WHERE image_path IS NOT NULL")
    users = cursor.fetchall()

    for user_id, name, surname, image_path in users:
        print(f"Processing {name} {surname}...")

        if not os.path.exists(image_path):
            print(f"❌ Image not found: {image_path}")
            continue

        embedding = compute_embedding(image_path)
        if embedding is not None:
            cursor.execute("UPDATE students SET embedding=? WHERE id=?", (embedding.tobytes(), user_id))
            conn.commit()
            print(f"✅ Stored embedding for {name} {surname}")

    conn.close()
    print("🎉 Migration complete.")

if __name__ == "__main__":
    migrate()
