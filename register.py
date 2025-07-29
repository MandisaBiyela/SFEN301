import cv2
import os
import sqlite3
from datetime import datetime

# Create folder to save face images
if not os.path.exists("faces"):
    os.makedirs("faces")

# Connect to SQLite (auto-creates database if not exists)
conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# Create table for users
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    image_path TEXT,
    registered_at TEXT
)
""")
conn.commit()

# Get user's name
name = input("Enter the person's name to register: ").strip()

if not name:
    print("❌ Name cannot be empty.")
    exit()

# Check if already registered
cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
if cursor.fetchone():
    print(f"⚠️ '{name}' is already registered.")
    exit()

# Start webcam
cap = cv2.VideoCapture(0)
print("[INFO] Press SPACE to capture face...")

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Failed to access camera.")
        break

    # Show frame
    cv2.imshow("Register Face", frame)

    # Press SPACE to capture
    key = cv2.waitKey(1)
    if key == 32:  # SPACE
        face_path = f"faces/{name}.jpg"
        cv2.imwrite(face_path, frame)
        print(f"✅ Face saved as {face_path}")
        
        # Save to database
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("INSERT INTO users (name, image_path, registered_at) VALUES (?, ?, ?)", 
                       (name, face_path, now))
        conn.commit()
        break

    elif key == 27:  # ESC
        print("❌ Registration cancelled.")
        break

# Clean up
cap.release()
cv2.destroyAllWindows()
conn.close()
