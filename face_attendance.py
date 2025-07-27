import cv2
import face_recognition
import sqlite3
import os
import numpy as np
from datetime import datetime

# Setup folders
FACES_DIR = "faces"
os.makedirs(FACES_DIR, exist_ok=True)

# Connect to SQLite
conn = sqlite3.connect("face_data.db")
c = conn.cursor()

# Create tables if not exist
c.execute('''CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_path TEXT NOT NULL,
    face_encoding BLOB NOT NULL
)''')

c.execute('''CREATE TABLE IF NOT EXISTS attendance (
    user_id INTEGER,
    name TEXT,
    date TEXT,
    PRIMARY KEY (user_id, date)
)''')
conn.commit()

# Convert face_encoding list to BLOB
def encode_face(face_encoding):
    return np.array(face_encoding).tobytes()

# Decode BLOB to face_encoding list
def decode_face(blob):
    return np.frombuffer(blob, dtype=np.float64)

# Register a new face
def register_face():
    cam = cv2.VideoCapture(0)
    print("Press 's' to capture and register a new face.")

    while True:
        ret, frame = cam.read()
        cv2.imshow("Register - Press 's' to Save, 'q' to Quit", frame)

        key = cv2.waitKey(1)
        if key == ord('s'):
            name = input("Enter name: ").strip()
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb)
            if len(face_locations) != 1:
                print("❌ Please ensure only ONE face is visible.")
                continue

            face_encoding = face_recognition.face_encodings(rgb, face_locations)[0]
            image_path = os.path.join(FACES_DIR, f"{name}.jpg")
            cv2.imwrite(image_path, frame)

            c.execute("INSERT INTO users (name, image_path, face_encoding) VALUES (?, ?, ?)",
                      (name, image_path, encode_face(face_encoding)))
            conn.commit()
            print(f"✅ Registered {name}")
            break

        elif key == ord('q'):
            break

    cam.release()
    cv2.destroyAllWindows()

# Load known faces from DB
def load_known_faces():
    c.execute("SELECT id, name, face_encoding FROM users")
    users = c.fetchall()

    ids = []
    names = []
    encodings = []

    for uid, name, blob in users:
        ids.append(uid)
        names.append(name)
        encodings.append(decode_face(blob))
    return ids, names, encodings

# Real-time recognition
def recognize_faces():
    ids, names, encodings = load_known_faces()
    video_capture = cv2.VideoCapture(0)

    today = datetime.now().strftime("%Y-%m-%d")
    attendance_set = set()

    while True:
        ret, frame = video_capture.read()
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = small_frame[:, :, ::-1]

        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces(encodings, face_encoding)
            name = "Unknown"

            if True in matches:
                idx = matches.index(True)
                uid = ids[idx]
                name = names[idx]

                if uid not in attendance_set:
                    c.execute("INSERT OR IGNORE INTO attendance (user_id, name, date) VALUES (?, ?, ?)",
                              (uid, name, today))
                    conn.commit()
                    attendance_set.add(uid)
                    print(f"🟢 Marked present: {name}")

        # Display
        for (top, right, bottom, left), name in zip(face_locations, [name]*len(face_locations)):
            top *= 4; right *= 4; bottom *= 4; left *= 4
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 255, 0), cv2.FILLED)
            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.75, (255, 255, 255), 1)

        cv2.imshow("Live Attendance - Press 'q' to Quit", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()

# === Main Menu ===
print("\n📷 FACE RECOGNITION SYSTEM")
print("1. Register new face")
print("2. Start real-time recognition")
choice = input("Choose (1/2): ").strip()

if choice == '1':
    register_face()
elif choice == '2':
    recognize_faces()
else:
    print("❌ Invalid choice")
