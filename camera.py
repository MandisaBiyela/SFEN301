import cv2
import os
import sqlite3
import numpy as np
from datetime import datetime
from deepface import DeepFace

# --- Configuration ---
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
FACES_DIR = "faces"
TEMP_FRAME_PATH =  os.path.join(FACES_DIR, "temp_frame.jpg")

# -----------------------------
# Utility Functions
# -----------------------------

def initialize_system():
    """
    Ensures the database and necessary folders exist.
    """
    if not os.path.exists(FACES_DIR):
        os.makedirs(FACES_DIR)
        print(f"Created directory: {FACES_DIR}")

    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}")
        print("Please run the Flask app (app.py) first to create the database and tables.")
        return False
    return True

def compute_embedding(image_path):
    """
    Compute face embedding for the given image using DeepFace.
    """
    embedding = DeepFace.represent(
        img_path=image_path,
        model_name="Facenet512",  # can switch to Facenet or VGG-Face for speed
        detector_backend="retinaface",
        enforce_detection=False
    )
    return np.array(embedding[0]["embedding"], dtype=np.float32)

def cosine_similarity(vec1, vec2):
    """
    Compute cosine similarity between two embeddings.
    """
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

# -----------------------------
# User Registration
# -----------------------------

def register_user():
    """
    Captures a new user's face, saves details to DB with embedding.
    """
    print("\n--- New User Registration ---")
    
    student_number = input("Enter Student Number: ").strip()
    student_name = input("Enter First Name: ").strip()
    student_surname = input("Enter Surname: ").strip()

    if not all([student_number, student_name, student_surname]):
        print("❌ Error: All fields are required. Registration cancelled.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Ensure embedding column exists
    try:
        cursor.execute("ALTER TABLE students ADD COLUMN embedding BLOB")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # column already exists

    cursor.execute("SELECT * FROM students WHERE student_number = ?", (student_number,))
    if cursor.fetchone():
        print(f"⚠️ User with number '{student_number}' is already registered.")
        conn.close()
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Error: Failed to access camera.")
        conn.close()
        return

    print("\n[INFO] Look at the camera and press SPACE to capture your face.")
    print("[INFO] Press ESC to cancel.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Error: Could not read frame from camera.")
            break

        cv2.putText(frame, "Press SPACE to capture, ESC to quit", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.imshow("Register Face", frame)

        key = cv2.waitKey(1) & 0xFF

        if key == 32:  # SPACE
            image_filename = f"{student_number}_{student_name}_{student_surname}.jpg".replace(" ", "_")
            image_path = os.path.join(FACES_DIR, image_filename)
            cv2.imwrite(image_path, frame)
            print(f"✅ Face saved successfully as {image_path}")

            try:    
                embedding = compute_embedding(image_path).tobytes()

                cursor.execute("""
                    INSERT INTO students (student_number, student_name, student_surname, student_email, registered_at, image_path, embedding)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                        student_number,
                        student_name,
                        student_surname,
                        f"{student_number}@dut4life.ac.za",
                        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        image_path,
                        embedding
                    ))
                conn.commit()
                print(f"✅ User '{student_name} {student_surname}' registered in the database.")
            except Exception as e:
                print(f"❌ Error saving to database: {e}")
            break

        elif key == 27:  # ESC
            print("❌ Registration cancelled by user.")
            break

    cap.release()
    cv2.destroyAllWindows()
    conn.close()

# -----------------------------
# Attendance System
# -----------------------------

def run_attendance_system():
    """
    Runs the live face recognition attendance system.
    """
    print("\n--- Live Attendance System ---")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    recognized_today = set()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("[ERROR] Cannot open webcam.")
        return

    print("[INFO] System started. Press 'q' to quit.")

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Webcam not available.")
            break

        frame_count += 1
        if frame_count % 10 != 0:  # process 1 in 10 frames
            cv2.imshow("Attendance System", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue

        cv2.imwrite(TEMP_FRAME_PATH, frame)
        frame_embedding = compute_embedding(TEMP_FRAME_PATH)

        try:
            cursor.execute("SELECT id, student_name, student_surname, image_path, embedding FROM students WHERE embedding IS NOT NULL")
            users = cursor.fetchall()
        except sqlite3.OperationalError:
            print("[ERROR] 'students' table not found. Please run the Flask app first.")
            break

        for user_id,  name, surname, image_path, embedding_blob in users:
            full_name = f"{name} {surname}"

            if full_name in recognized_today or not embedding_blob:
                continue

            db_embedding = np.frombuffer(embedding_blob, dtype=np.float32)
            similarity = cosine_similarity(frame_embedding, db_embedding)

            if similarity > 0.75:  # threshold
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"✅ {full_name} recognized at {now_str}")

                cursor.execute("""
                    INSERT INTO attendance (user_id, name, time, status)
                    VALUES (?, ?, ?, ?)
                """, (user_id, full_name, now_str, "Present"))
                conn.commit()

                recognized_today.add(full_name)
                cv2.putText(frame, f"{full_name} - Present", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                break

        cv2.imshow("Attendance System", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    print("[INFO] Shutting down.")
    cap.release()
    cv2.destroyAllWindows()
    conn.close()
    if os.path.exists(TEMP_FRAME_PATH):
        os.remove(TEMP_FRAME_PATH)

# -----------------------------
# Main Menu
# -----------------------------

def main():
    if not initialize_system():
        return

    while True:
        print("\n--- Attendance System Menu ---")
        print("1. Register a New User")
        print("2. Start Live Attendance")
        print("3. Exit")
        choice = input("Enter your choice (1, 2, or 3): ").strip()

        if choice == '1':
            register_user()
        elif choice == '2':
            run_attendance_system()
        elif choice == '3':
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please enter 1, 2, or 3.")

if __name__ == '__main__':
    main()
