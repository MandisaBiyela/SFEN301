import cv2
import os
import sqlite3
from datetime import datetime
from deepface import DeepFace

# Connect to DB
conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# Attendance table (if not exists)
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

# Keep track of already-recognized users for today
recognized_today = set()

# Start webcam
cap = cv2.VideoCapture(0)
print("[INFO] Starting live attendance system...")

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Webcam not available")
        break

    # Save current frame temporarily
    cv2.imwrite("temp.jpg", frame)

    # 🔄 Re-fetch latest registered users from database in case new users are added
    cursor.execute("SELECT id, name, image_path FROM users")
    users = cursor.fetchall()

    for user_id, name, image_path in users:
        if name in recognized_today:
            continue  # Skip if already marked today

        try:
            result = DeepFace.verify(
                img1_path=image_path,
                img2_path="temp.jpg",
                model_name='Facenet512',
                distance_metric='cosine',
                detector_backend='retinaface',  # more accurate than opencv
                enforce_detection=True
            )

            if result["verified"]:
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"✅ {name} recognized at {now}")

                # Save attendance
                cursor.execute("""
                    INSERT INTO attendance (user_id, name, time, status)
                    VALUES (?, ?, ?, ?)
                """, (user_id, name, now, "Present"))
                conn.commit()

                recognized_today.add(name)

                # Show name on webcam feed
                cv2.putText(frame, f"{name} - Present", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)
                break  # Don't keep looping users if one match is found

        except Exception as e:
            print(f"[ERROR] {name}'s image failed: {e}")

    # Show the current webcam feed
    cv2.imshow("Attendance System", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()
conn.close()
