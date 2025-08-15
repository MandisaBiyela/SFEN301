import cv2
import os
import sqlite3
from datetime import datetime
from deepface import DeepFace

# --- Configuration --- nh 
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
FACES_DIR = "faces"
TEMP_FRAME_PATH = "temp_frame.jpg"

def initialize_system():
    """
    Ensures the database and necessary folders exist.
    """
    # Create a folder to save face images if it doesn't exist
    if not os.path.exists(FACES_DIR):
        os.makedirs(FACES_DIR)
        print(f"Created directory: {FACES_DIR}")

    # Check if the database exists
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}")
        print("Please run the Flask app (app.py) first to create the database and tables.")
        return False
    return True

def register_user():
    """
    Captures a new user's face and saves their details to the database.
    """
    print("\n--- New User Registration ---")
    
    # Get user details from input
    student_number = input("Enter Student Number: ").strip()
    student_name = input("Enter First Name: ").strip()
    student_surname = input("Enter Surname: ").strip()

    if not all([student_number, student_name, student_surname]):
        print("❌ Error: All fields are required. Registration cancelled.")
        return

    # Connect to the database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if the user number is already registered
    cursor.execute("SELECT * FROM Students WHERE student_number = ?", (student_number,))
    if cursor.fetchone():
        print(f"⚠️ User with number '{student_number}' is already registered.")
        conn.close()
        return

    # Start webcam
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

        # Display instructions on the frame
        cv2.putText(frame, "Press SPACE to capture, ESC to quit", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.imshow("Register Face", frame)

        key = cv2.waitKey(1) & 0xFF

        # --- Capture Image on SPACE ---
        if key == 32: # SPACE key
            # Define the path to save the image
            image_filename = f"{student_number}_{student_name}_{student_surname}.jpg".replace(" ", "_")
            image_path = os.path.join(FACES_DIR, image_filename)
            
            # Save the captured frame
            cv2.imwrite(image_path, frame)
            print(f"✅ Face saved successfully as {image_path}")

            # Save user details to the database
            try:
                # We use the 'lecturers' table for all users for simplicity
                cursor.execute("""
                    INSERT INTO lecturers (lecturer_number, name, surname, email, image_path)
                    VALUES (?, ?, ?, ?, ?)
                """, (student_number, student_name, student_surname, f"{student_name}.{student_surname}@school.com", image_path))
                conn.commit()
                print(f"✅ User '{student_name} {student_surname}' registered in the database.")
            except Exception as e:
                print(f"❌ Error saving to database: {e}")
            
            break # Exit loop after capture

        # --- Cancel on ESC ---
        elif key == 27: # ESC key
            print("❌ Registration cancelled by user.")
            break
            
    # Clean up
    cap.release()
    cv2.destroyAllWindows()
    conn.close()


def run_attendance_system():
    """
    Initializes the webcam and runs the face recognition process
    to mark attendance in the database.
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

    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Webcam not available.")
            break

        # Save current frame temporarily for DeepFace
        cv2.imwrite(TEMP_FRAME_PATH, frame)

        try:
            cursor.execute("SELECT id, name, surname, image_path FROM lecturers WHERE image_path IS NOT NULL")
            users = cursor.fetchall()
        except sqlite3.OperationalError:
            print("[ERROR] 'lecturers' table not found. Please run the Flask app first.")
            break

        for user_id, name, surname, image_path in users:
            full_name = f"{name} {surname}"
            
            if full_name in recognized_today or not os.path.exists(image_path):
                continue

            try:
                result = DeepFace.verify(
                    img1_path=image_path,
                    img2_path=TEMP_FRAME_PATH,
                    model_name='Facenet512',
                    distance_metric='cosine',
                    detector_backend='retinaface',
                    enforce_detection=False
                )

                if result["verified"]:
                    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    print(f"✅ {full_name} recognized at {now_str}")

                    cursor.execute("""
                        INSERT INTO attendance (user_id, name, time, status)
                        VALUES (?, ?, ?, ?)
                    """, (user_id, full_name, now_str, "Present"))
                    conn.commit()

                    recognized_today.add(full_name)
                    cv2.putText(frame, f"{full_name} - Present", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                    break 

            except Exception:
                pass

        cv2.imshow("Attendance System", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Cleanup
    print("[INFO] Shutting down.")
    cap.release()
    cv2.destroyAllWindows()
    conn.close()
    if os.path.exists(TEMP_FRAME_PATH):
        os.remove(TEMP_FRAME_PATH)

def main():
    """
    Main function to display a menu to the user.
    """
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
