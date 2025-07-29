import cv2
import os
import sqlite3
from datetime import datetime
from deepface import DeepFace

# Connect to the SQLite database
conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# Create attendance table if not exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    time TEXT,
    status TEXT
)
""")

conn.commit()

# Load all registered users and face paths
cursor.execute("SELECT id, name, image_path FROM users")
users = cursor.fetchall()

if not users:
    print("❌ No registered users found. Run register.py first.")
    exit()

print("[INFO] Starting webcam and face recognition...")

cap = cv2.VideoCapture(0)
recognized_today = set()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    try:
        # Save a temporary image of the current frame
        cv2.imwrite("temp.jpg", frame)

        # Compare against each registered user
        for user_id, name, image_path in users:
            result = DeepFace.verify(img1_path=image_path, img2_path="temp.jpg",model_name='Facenet512',distance_metric='cosine', enforce_detection=True)
            print(result)

            if result["verified"] and name not in recognized_today:
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"✅ {name} recognized at {now}")

                # Record attendance
                cursor.execute("""
                    INSERT INTO attendance (user_id, name, time, status)
                    VALUES (?, ?, ?, ?)
                """, (user_id, name, now, "Present"))
                conn.commit()

                recognized_today.add(name)

                # Display name on screen
                cv2.putText(frame, f"{name} - Present", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)
                break

    except Exception as e:
        print(f"Error: {e}")

    # Show the webcam feed
    cv2.imshow("Attendance System", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()
conn.close()
