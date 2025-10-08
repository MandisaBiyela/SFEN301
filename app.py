from flask import Flask, render_template, request, jsonify, flash, session, redirect, url_for
from functools import wraps
import os
from datetime import datetime
import base64
import numpy as np
import cv2
from deepface import DeepFace
from models import *

app = Flask(__name__)

# --- Database Configuration ---
# Set the path for the SQLite database file
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Optional: to suppress a warning
app.config['SECRET_KEY'] = 'your_super_secret_key' # Required for flashing messages

faces_path = os.path.join(basedir, 'static', 'faces')
os.makedirs(faces_path, exist_ok=True)
app.config['UPLOAD_FOLDER'] = faces_path


# Initialize the database with the app
db.init_app(app)

# --- Function to Create Database Tables ---
@app.before_request
def create_tables():
    # This function will run before the first request to the application.
    # It creates the database tables based on the models defined in models.py
    # The 'app_context' is needed for the database operations to know about the app's configuration.
    with app.app_context():
        db.create_all()

# --- Face Recognition Helper Function (from camera.py) ---
def compute_embedding(image_bytes):
    """
    Decodes image bytes, converts to numpy array, and computes face embedding.
    """
    try:
        # Decode image bytes into an OpenCV image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode image bytes.")
        
        # Use DeepFace to generate the embedding
        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name="SFace",
            detector_backend="ssd",
            enforce_detection=False # Allow it to fail gracefully if no face
        )
        if not embedding_objs or not embedding_objs[0]["facial_area"]["w"] > 0:
            return None
        
        # Extract the embedding vector
        embedding = embedding_objs[0]["embedding"]
        return np.array(embedding, dtype=np.float32)

    except Exception as e:
        print(f"Error in compute_embedding: {e}")
        return None

# --- Authentication Decorator ---
def login_required(f):
    """
    Decorator to protect routes that require lecturer authentication.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'lecturer_number' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


#Login Page as the first page//////////////////////////////////////////////////

@app.route('/')
def login():
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    """
    API endpoint to handle lecturer login
    """
    try:
        data = request.get_json()
        user_type = data.get('user_type')
        username = data.get('username')
        password = data.get('password')

        if not all([user_type, username, password]):
            return jsonify({'error': 'All fields are required'}), 400

        if user_type == 'admin':
            # Admin login (hardcoded for now - you should improve this)
            if username == 'admin' and password == 'password123':
                session['user_type'] = 'admin'
                session['username'] = username
                return jsonify({
                    'success': True,
                    'redirect': '/admin_dashboard.html',
                    'message': 'Admin login successful'
                }), 200
            else:
                return jsonify({'error': 'Invalid Admin ID or password'}), 401

        elif user_type == 'lecturer':
            # Lecturer login - verify against database
            lecturer = Lecturer.query.filter_by(lecturer_number=username).first()
            
            if not lecturer:
                return jsonify({'error': 'Invalid Lecturer ID or password'}), 401
            
            # For now, using a simple password check
            # In production, you should hash passwords and store them securely
            # For demo purposes, we'll accept 'password123' for all lecturers
            if password != 'password123':
                return jsonify({'error': 'Invalid Lecturer ID or password'}), 401
            
            # Set session data
            session['user_type'] = 'lecturer'
            session['lecturer_number'] = lecturer.lecturer_number
            session['lecturer_name'] = lecturer.name
            session['lecturer_surname'] = lecturer.surname
            session['lecturer_email'] = lecturer.email
            
            return jsonify({
                'success': True,
                'redirect': '/lectureside_dashboard.html',
                'message': f'Welcome, {lecturer.name} {lecturer.surname}',
                'lecturer': {
                    'lecturer_number': lecturer.lecturer_number,
                    'name': lecturer.name,
                    'surname': lecturer.surname,
                    'email': lecturer.email
                }
            }), 200

        return jsonify({'error': 'Invalid user type'}), 400

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'An error occurred during login'}), 500

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """
    API endpoint to handle logout
    """
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@app.route('/api/current_user', methods=['GET'])
def get_current_user():
    """
    API endpoint to get current logged-in user information
    """
    if 'lecturer_number' in session:
        return jsonify({
            'logged_in': True,
            'user_type': 'lecturer',
            'lecturer_number': session['lecturer_number'],
            'name': session.get('lecturer_name'),
            'surname': session.get('lecturer_surname'),
            'email': session.get('lecturer_email')
        }), 200
    elif 'user_type' in session and session['user_type'] == 'admin':
        return jsonify({
            'logged_in': True,
            'user_type': 'admin',
            'username': session.get('username')
        }), 200
    else:
        return jsonify({'logged_in': False}), 200

@app.route('/forgot_password.html')
def forgot_password():
    return render_template('forgot_password.html')

@app.route('/new_password.html')
def new_password():
    return render_template('new_password.html')

#LECTURE SIDE STARTS HERE BAAFETHU///////////////////////////////////////////////////////////////////////////

@app.route('/lectureside_attendance.html')
@login_required
def lectureside_attendance():
    return render_template('lectureside_attendance.html')

@app.route('/lectureside_capture.html')
@login_required
def lectureside_capture():
    return render_template('lectureside_capture.html')


@app.route('/lectureside_dashboard.html')
@login_required
def lectureside_dashboard():
    return render_template('lectureside_dashboard.html')

@app.route('/lectureside_modules.html')
@login_required
def lectureside_modules():
    return render_template('lectureside_modules.html')

@app.route('/lectureside_periods.html')
@login_required
def lectureside_periods():
    return render_template('lectureside_periods.html')

@app.route('/lectureside_profile.html')
@login_required
def lectureside_profile():
    return render_template('lectureside_profile.html')

@app.route('/lectureside_statistics.html')
@login_required
def lectureside_statistics():
    return render_template('lectureside_statistics.html')

#LECTURE SIDE ENDS HERE BAFETHU//////////////////////////////////////////////////////////////////////////



#Incase i want to check the Admin Dashboard as the first page

@app.route('/admin_dashboard.html')
def admin_dashboard():
    return render_template('admin_dashboard.html')

@app.route('/profile.html')
def profile():
    return render_template('profile.html')

@app.route('/lecturer.html')
def lecturer():
    """
    Displays the list of all lecturers from the database.
    """
    return render_template('lecturer.html')

@app.route('/lecturer_add.html', methods=['GET', 'POST'])
def lecturer_add():
    """
    Handles adding a new lecturer to the database.
    GET: Displays the form.
    POST: Processes the form data and saves it.
    """
    if request.method == 'POST':
        # Get data from the form (no lecturer_number, it's auto-generated)
        name = request.form.get('lecturer-name')
        surname = request.form.get('lecturer-surname')
        email = request.form.get('lecturer-email')

        # Basic validation
        if not all([name, surname, email]):
            return jsonify({'error': 'All fields are required!'}), 400

        # Generate a unique lecturer_number (e.g., use max id + 1 or UUID)
        # Here, we'll use a simple increment based on the max id
        last_lecturer = Lecturer.query.order_by(Lecturer.id.desc()).first()
        next_number = 1000 if not last_lecturer else int(last_lecturer.lecturer_number) + 1 if last_lecturer.lecturer_number.isdigit() else last_lecturer.id + 1
        lecturer_number = str(next_number)

        # Use model validation for uniqueness
        errors = Lecturer.validate_unique(lecturer_number, email)
        if errors:
            return jsonify({'error': ' '.join(errors)}), 400

        # Create a new Lecturer object
        new_lecturer = Lecturer(
            lecturer_number=lecturer_number,
            name=name,
            surname=surname,
            email=email
        )

        # Add to the database session and commit
        try:
            db.session.add(new_lecturer)
            db.session.commit()
            return jsonify({
                'message': f'Lecturer {name} {surname} added successfully!',
                'lecturer': {
                    'lecturer_number': lecturer_number,
                    'name': name,
                    'surname': surname,
                    'email': email
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error adding lecturer: {e}")
            return jsonify({'error': 'An error occurred while adding the lecturer.'}), 500

    # For a GET request, just show the form
    return render_template('lecturer_add.html')

@app.route('/lecturer_edit.html', methods=['GET', 'POST'])
def lecturer_edit():
    if request.method == 'POST':
        # Get data from the form
        lecturer_number = request.form.get('lecturer-number')
        name = request.form.get('lecturer-name')
        surname = request.form.get('lecturer-surname')
        email = request.form.get('lecturer-email')

        # Basic validation
        if not all([lecturer_number, name, surname, email]):
            return jsonify({'error': 'All fields are required!'}), 400

        lecturer_to_update = Lecturer.query.filter_by(lecturer_number=lecturer_number).first()

        # Check if the lecturer exists
        if lecturer_to_update:
            # Modify the attributes of the lecturer object
            lecturer_to_update.name = name
            lecturer_to_update.surname = surname
            lecturer_to_update.email = email

            try:
                db.session.commit()
                return jsonify({
                    'message': f'Record for {lecturer_number} updated successfully!',
                    'lecturer': {
                        'lecturer_number': lecturer_number,
                        'name': name,
                        'surname': surname,
                        'email': email
                    }
                }), 200
            except Exception as e:
                db.session.rollback()
                print(f"Error updating lecturer: {e}")
                return jsonify({'error': 'An error occurred while updating the lecturer.'}), 500
        else:
            return jsonify({'error': 'Lecturer not found.'}), 404

    return render_template('lecturer_edit.html')

@app.route('/module.html')
def module():
    return render_template('module.html')

@app.route('/module_edit.html')
def module_edit():
    return render_template('module_edit.html')

@app.route('/module_add.html')
def module_add():
    return render_template('module_add.html')

@app.route('/student.html')
def student():
    return render_template('student.html')

@app.route('/student_add.html')
def student_add():
    return render_template('student_add.html')

@app.route('/student_edit.html')
def student_edit():
    return render_template('student_edit.html')

@app.route('/venue.html')
def venue():
    return render_template('venue.html')

@app.route('/venue_add.html')
def venue_add():
    return render_template('venue_add.html')

@app.route('/venue_edit.html')
def venue_edit():
    return render_template('venue_edit.html')

@app.route('/period.html')
def period():
    return render_template('period.html')

@app.route('/period_edit.html')
def period_edit():
    return render_template('period_edit.html')

@app.route('/register.html')
def register():
    return render_template('register.html')

@app.route('/register_student.html')
def register_student():
    return render_template('register_student.html')

@app.route('/attendance.html')
def attendance():
    return render_template('attendance.html')

# --- LECTURER-SPECIFIC API ENDPOINTS ---

@app.route('/api/lecturer/modules', methods=['GET'])
@login_required
def get_lecturer_modules():
    """
    API endpoint to get modules for the currently logged-in lecturer.
    """
    try:
        lecturer_number = session.get('lecturer_number')
        if not lecturer_number:
            return jsonify({'error': 'Authentication required'}), 401

        modules = Module.query.filter_by(lecturer_number=lecturer_number).order_by(Module.module_name).all()
        
        module_list = []
        for m in modules:
            # Count students registered for this module
            class_registers = Class_Register.query.all()
            student_count = 0
            for register in class_registers:
                if register.subject_code:
                    module_codes = [code.strip() for code in register.subject_code.split(',')]
                    if m.module_code in module_codes:
                        student_count += 1
            
            module_list.append({
                'lecturer': m.lecturer_number,
                'name': m.module_name,
                'code': m.module_code,
                'student_count': student_count
            })
        
        return jsonify(module_list)

    except Exception as e:
        print(f"Error fetching lecturer modules: {e}")
        return jsonify({'error': 'Error fetching module data'}), 500

@app.route('/api/lecturer/periods', methods=['GET'])
@login_required
def get_lecturer_periods():
    """
    API endpoint to get class periods for the currently logged-in lecturer.
    """
    try:
        lecturer_number = session.get('lecturer_number')
        if not lecturer_number:
            return jsonify({'error': 'Authentication required'}), 401

        # 1. Get the module codes for the logged-in lecturer
        lecturer_module_codes = [m.module_code for m in Module.query.filter_by(lecturer_number=lecturer_number).all()]
        if not lecturer_module_codes:
            return jsonify([]) # Return empty list if lecturer has no modules

        # 2. Get all class periods and filter them in Python
        all_periods = Class_Period.query.order_by(Class_Period.day_of_week, Class_Period.period_start_time).all()
        lecturer_periods = []
        
        for p in all_periods:
            register = p.register  # Use the relationship to get the register
            if register and register.subject_code:
                # Check if any of the period's modules are taught by this lecturer
                period_module_codes = [code.strip() for code in register.subject_code.split(',')]
                if any(code in lecturer_module_codes for code in period_module_codes):
                    venue = p.venue
                    module = register.module # Use relationship
                    lecturer_periods.append({
                        'id': p.id,
                        'period_id': p.period_id,
                        'module_code': module.module_code if module else 'N/A',
                        'module_name': module.module_name if module else 'N/A',
                        'period_start_time': p.period_start_time,
                        'period_end_time': p.period_end_time,
                        'day_of_week': p.day_of_week,
                        'venue_name': venue.venue_name if venue else 'Unknown',
                    })
        
        return jsonify(lecturer_periods)

    except Exception as e:
        print(f"Error fetching lecturer periods: {e}")
        return jsonify({'error': 'Error fetching period data'}), 500

@app.route('/api/lecturer/attendance_statistics', methods=['GET'])
@login_required
def get_lecturer_attendance_statistics():
    """
    API endpoint to get comprehensive attendance statistics for all modules 
    taught by the currently logged-in lecturer.
    """
    try:
        lecturer_number = session.get('lecturer_number')
        if not lecturer_number:
            return jsonify({'error': 'Authentication required'}), 401

        # Get all modules taught by this lecturer
        lecturer_modules = Module.query.filter_by(lecturer_number=lecturer_number).all()
        
        statistics = []
        
        for module in lecturer_modules:
            # Get all students registered for this module
            class_registers = Class_Register.query.filter_by(subject_code=module.module_code).all()
            registered_students = set([reg.student_number for reg in class_registers])
            total_students = len(registered_students)
            
            # Get all class periods for this module
            module_periods = Class_Period.query.join(Class_Register).filter(
                Class_Register.subject_code == module.module_code
            ).all()
            
            total_periods = len(module_periods)
            
            # Calculate attendance statistics
            total_possible_attendance = total_students * total_periods
            
            # Get all attendance records for this module's periods
            period_ids = [p.id for p in module_periods]
            attendance_records = Attendance.query.filter(
                Attendance.class_period_id.in_(period_ids)
            ).all()
            
            total_actual_attendance = len(attendance_records)
            
            # Calculate overall attendance rate
            overall_rate = 0
            if total_possible_attendance > 0:
                overall_rate = (total_actual_attendance / total_possible_attendance) * 100
            
            # Get recent attendance trends (last 5 periods)
            recent_periods = sorted(module_periods, 
                                   key=lambda p: (p.day_of_week, p.period_start_time), 
                                   reverse=True)[:5]
            
            recent_attendance = []
            for period in recent_periods:
                period_attendance_count = Attendance.query.filter_by(
                    class_period_id=period.id
                ).count()
                
                period_rate = 0
                if total_students > 0:
                    period_rate = (period_attendance_count / total_students) * 100
                
                recent_attendance.append({
                    'period_id': period.period_id,
                    'day': period.day_of_week,
                    'time': f"{period.period_start_time} - {period.period_end_time}",
                    'venue': period.venue.venue_name if period.venue else 'Unknown',
                    'attendance_count': period_attendance_count,
                    'attendance_rate': round(period_rate, 2)
                })
            
            # Get student attendance breakdown
            student_breakdown = []
            for student_number in registered_students:
                student = Student.query.filter_by(student_number=student_number).first()
                if student:
                    student_attendance = Attendance.query.filter(
                        Attendance.user_id == student_number,
                        Attendance.class_period_id.in_(period_ids)
                    ).count()
                    
                    student_rate = 0
                    if total_periods > 0:
                        student_rate = (student_attendance / total_periods) * 100
                    
                    student_breakdown.append({
                        'student_number': student_number,
                        'name': f"{student.student_name} {student.student_surname}",
                        'attended': student_attendance,
                        'total_periods': total_periods,
                        'attendance_rate': round(student_rate, 2),
                        'status': 'Good' if student_rate >= 80 else 'Warning' if student_rate >= 60 else 'Critical'
                    })
            
            # Sort students by attendance rate (lowest first for attention)
            student_breakdown.sort(key=lambda x: x['attendance_rate'])
            
            statistics.append({
                'module_code': module.module_code,
                'module_name': module.module_name,
                'total_students': total_students,
                'total_periods': total_periods,
                'overall_attendance_rate': round(overall_rate, 2),
                'total_attendance_records': total_actual_attendance,
                'recent_attendance': recent_attendance,
                'student_breakdown': student_breakdown
            })
        
        return jsonify({
            'lecturer_name': f"{session.get('lecturer_name')} {session.get('lecturer_surname')}",
            'total_modules': len(lecturer_modules),
            'statistics': statistics
        })
        
    except Exception as e:
        print(f"Error fetching lecturer statistics: {e}")
        return jsonify({'error': 'Error fetching statistics'}), 500

@app.route('/api/lecturer/module_statistics/<module_code>', methods=['GET'])
@login_required
def get_module_detailed_statistics(module_code):
    """
    API endpoint to get detailed statistics for a specific module.
    """
    try:
        lecturer_number = session.get('lecturer_number')
        if not lecturer_number:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Verify lecturer teaches this module
        module = Module.query.filter_by(
            module_code=module_code, 
            lecturer_number=lecturer_number
        ).first()
        
        if not module:
            return jsonify({'error': 'Module not found or access denied'}), 404
        
        # Get all students registered for this module
        class_registers = Class_Register.query.filter_by(subject_code=module_code).all()
        registered_students = [reg.student_number for reg in class_registers]
        
        # Get all periods for this module
        module_periods = Class_Period.query.join(Class_Register).filter(
            Class_Register.subject_code == module_code
        ).all()
        
        # Detailed period-by-period breakdown
        period_details = []
        for period in module_periods:
            attendance_records = Attendance.query.filter_by(
                class_period_id=period.id
            ).all()
            
            present_students = [a.user_id for a in attendance_records]
            absent_students = [s for s in registered_students if s not in present_students]
            
            period_details.append({
                'period_id': period.period_id,
                'day': period.day_of_week,
                'time': f"{period.period_start_time} - {period.period_end_time}",
                'venue': period.venue.venue_name if period.venue else 'Unknown',
                'total_students': len(registered_students),
                'present_count': len(present_students),
                'absent_count': len(absent_students),
                'attendance_rate': round((len(present_students) / len(registered_students) * 100), 2) if registered_students else 0,
                'present_students': present_students,
                'absent_students': absent_students
            })
        
        # Sort by day and time
        day_order = {'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7}
        period_details.sort(key=lambda x: (day_order.get(x['day'], 8), x['time']))
        
        # Calculate weekly pattern
        weekly_pattern = {}
        for period in period_details:
            day = period['day']
            if day not in weekly_pattern:
                weekly_pattern[day] = {'total_periods': 0, 'avg_rate': 0, 'rates': []}
            weekly_pattern[day]['total_periods'] += 1
            weekly_pattern[day]['rates'].append(period['attendance_rate'])
        
        for day, data in weekly_pattern.items():
            data['avg_rate'] = round(sum(data['rates']) / len(data['rates']), 2) if data['rates'] else 0
            del data['rates']
        
        return jsonify({
            'module_code': module.module_code,
            'module_name': module.module_name,
            'total_students': len(registered_students),
            'total_periods': len(module_periods),
            'period_details': period_details,
            'weekly_pattern': weekly_pattern
        })
        
    except Exception as e:
        print(f"Error fetching module statistics: {e}")
        return jsonify({'error': 'Error fetching module statistics'}), 500


# --- LECTURER API ENDPOINTS ---

@app.route('/api/lecturers')
def get_lecturers():
    """
    API endpoint to get all lecturers as JSON
    """
    try:
        lecturers = Lecturer.query.order_by(Lecturer.lecturer_number).all()
        return jsonify([{
            'lecturer_number': l.lecturer_number,
            'name': l.name,
            'surname': l.surname,
            'email': l.email,
            'modules': [m.module_code for m in Module.query.filter_by(lecturer_number=l.lecturer_number).limit(5)]
        } for l in lecturers])
    except Exception as e:
        print(f"Error fetching lecturers: {e}")
        return jsonify({'error': 'Error fetching lecturer data'}), 500

@app.route('/api/lecturers/<lecturer_number>', methods = ['DELETE'])
def delete_lecturer(lecturer_number):
    try:
        lecturer_to_delete = Lecturer.query.filter_by(lecturer_number=lecturer_number).first()
        if lecturer_to_delete:
            db.session.delete(lecturer_to_delete)
            db.session.commit()
            print(f"Successfully deleted lecturer")
            return jsonify({'success': 'Successfully deleted lecturer'}), 500
        else:
            print(f"Lecturer {lecturer_number} doesn't exist")
            return jsonify({'error': 'Error fetching lecturer data'}), 500
    except Exception as e:
        print(f"Error fetching lecturers: {e}")
        return jsonify({'error': 'Error deleting lecturer data'}), 500

@app.route('/api/lecturers/<lecturer_number>')
def get_lecturer_by_id(lecturer_number):
    lecturer = Lecturer.query.filter_by(lecturer_number=lecturer_number).first()
    if lecturer:
        return jsonify({
            'lecturer_number': lecturer.lecturer_number,
            'name': lecturer.name,
            'surname': lecturer.surname,
            'email': lecturer.email,
            'modules': [m.module_code for m in Module.query.filter_by(lecturer_number=lecturer.lecturer_number).limit(5)]
        })
    return jsonify({'error': 'Lecturer not found'}), 404
    
# --- MODULE API ENDPOINTS ---

@app.route('/api/modules')
def get_modules():
    """
    API endpoint to get all modules as JSON
    """
    try:
        modules = Module.query.order_by(Module.module_name).all()
        
        return jsonify([{
            'lecturer': m.lecturer_number,
            'name': m.module_name,
            'code': m.module_code
        } for m in modules])
    except Exception as e:
        print(f"Error fetching lecturers: {e}")
        return jsonify({'error': 'Error fetching lecturer data'}), 500

@app.route('/api/modules/<module_id>', methods=['GET'])
def get_module(module_id):
    """ API endpoint to get a single module by its ID. """
    try:
        module = Module.query.filter_by(module_code = module_id).first()
        if module:
            return jsonify({
                'id': module.id,
                'code': module.module_code,
                'name': module.module_name,
                'lecturer_number': module.lecturer_number
            })
        return jsonify({'error': 'Module not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error fetching module: {e}'}), 500

@app.route('/api/modules', methods=['POST'])
def add_module():
    """ API endpoint to add a new module. """
    data = request.get_json()
    module_code = data.get('code')
    module_name = data.get('name')
    lecturer_number = data.get('lecturer_number')

    if not all([module_code, module_name, lecturer_number]):
        return jsonify({'error': 'Module code, name, and lecturer are required'}), 400
    if Module.query.filter_by(module_code=module_code).first():
        return jsonify({'error': f'Module with code {module_code} already exists'}), 409

    new_module = Module(module_code=module_code, module_name=module_name, lecturer_number=lecturer_number)
    try:
        db.session.add(new_module)
        db.session.commit()
        return jsonify({'message': 'Module added successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {e}'}), 500

@app.route('/api/modules/<module_id>', methods=['PUT'])
def update_module(module_id):
    """ API endpoint to update an existing module. """
    module_to_update = Module.query.filter_by(module_code = module_id).first()
    if not module_to_update:
        return jsonify({'error': 'Module not found'}), 404

    data = request.get_json()
    module_to_update.module_code = data.get('code', module_to_update.module_code)
    module_to_update.module_name = data.get('name', module_to_update.module_name)
    module_to_update.lecturer_number = data.get('lecturer_number', module_to_update.lecturer_number)

    try:
        db.session.commit()
        return jsonify({'message': 'Module updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {e}'}), 500

@app.route('/api/modules/<module_id>', methods=['DELETE'])
def delete_module(module_id):
    """ API endpoint to delete a module. """
    module_to_delete = Module.query.filter_by(module_code = module_id).first()
    if not module_to_delete:
        return jsonify({'error': 'Module not found'}), 404

    try:
        db.session.delete(module_to_delete)
        db.session.commit()
        return jsonify({'message': 'Module deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {e}'}), 500

# --- VENUE API ENDPOINTS ---

@app.route('/api/venues', methods=['GET'])
def get_venues():
    """
    API endpoint to get all venues as JSON
    """
    try:
        venues = Venue.query.order_by(Venue.venue_name).all()
        return jsonify([{
            'id': v.id,
            'name': v.venue_name,
            'block': v.venue_block,
            'campus': v.venue_campus
        } for v in venues])
    except Exception as e:
        print(f"Error fetching venues: {e}")
        return jsonify({'error': 'Error fetching venue data'}), 500

@app.route('/api/venues/<venue_id>', methods=['GET'])
def get_venue(venue_id):
    """ API endpoint to get a single venue by its ID. """
    try:
        venue = Venue.query.filter_by(id=venue_id).first()
        if venue:
            return jsonify({
                'id': venue.id,
                'name': venue.venue_name,
                'block': venue.venue_block,
                'campus': venue.venue_campus
            })
        return jsonify({'error': 'Venue not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error fetching venue: {e}'}), 500

@app.route('/api/venues', methods=['POST'])
def add_venue():
    """ API endpoint to add a new venue. """
    try:
        data = request.get_json()
        venue_name = data.get('name')
        venue_block = data.get('block')
        venue_campus = data.get('campus')

        # Validate required fields
        if not all([venue_name, venue_block, venue_campus]):
            return jsonify({'error': 'Venue name, block, and campus are required'}), 400

        # Check if venue name already exists
        if Venue.query.filter_by(venue_name=venue_name).first():
            return jsonify({'error': f'Venue with name {venue_name} already exists'}), 409

        new_venue = Venue(
            venue_name=venue_name,
            venue_block=venue_block,
            venue_campus=venue_campus
        )
        
        db.session.add(new_venue)
        db.session.commit()
        return jsonify({'message': 'Venue added successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding venue: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/venues/<venue_id>', methods=['PUT'])
def update_venue(venue_id):
    """ API endpoint to update an existing venue. """
    try:
        venue = Venue.query.filter_by(id=venue_id).first()
        if not venue:
            return jsonify({'error': 'Venue not found'}), 404

        data = request.get_json()
        venue_name = data.get('name')
        venue_block = data.get('block')
        venue_campus = data.get('campus')

        # Check if new venue name conflicts with existing venues (excluding current venue)
        if venue_name and venue_name != venue.venue_name:
            if Venue.query.filter(Venue.venue_name == venue_name, Venue.id != venue_id).first():
                return jsonify({'error': f'Venue with name {venue_name} already exists'}), 409

        # Update venue fields
        if venue_name:
            venue.venue_name = venue_name
        if venue_block:
            venue.venue_block = venue_block
        if venue_campus:
            venue.venue_campus = venue_campus

        db.session.commit()
        return jsonify({'message': 'Venue updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating venue: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/venues/<venue_id>', methods=['DELETE'])
def delete_venue(venue_id):
    """ API endpoint to delete a venue. """
    try:
        venue = Venue.query.filter_by(id=venue_id).first()
        if not venue:
            return jsonify({'error': 'Venue not found'}), 404

        # Check if venue is being used in class periods
        class_periods = Class_Period.query.filter_by(period_venue_id=venue_id).count()
        if class_periods > 0:
            return jsonify({'error': f'Cannot delete venue. It is being used in {class_periods} class period(s)'}), 400

        db.session.delete(venue)
        db.session.commit()
        return jsonify({'message': 'Venue deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting venue: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

# --- CLASS PERIOD API ENDPOINTS ---

@app.route('/api/periods', methods=['GET'])
def get_periods():
    """
    API endpoint to get all class periods as JSON
    """
    try:
        periods = Class_Period.query.order_by(Class_Period.day_of_week, Class_Period.period_start_time).all()
        period_list = []
        for p in periods:
            # Get register and venue information
            register = Class_Register.query.filter_by(register_id=p.class_register).first()
            venue = Venue.query.filter_by(id=p.period_venue_id).first()
            
            period_list.append({
                'id': p.id,
                'period_id': p.period_id,
                'class_register': p.class_register,
                'period_start_time': p.period_start_time,
                'period_end_time': p.period_end_time,
                'day_of_week': p.day_of_week,
                'venue_id': p.period_venue_id,
                'venue_name': venue.venue_name if venue else 'Unknown',
                'venue_block': venue.venue_block if venue else '',
                'venue_campus': venue.venue_campus if venue else '',
                'student_number': register.student_number if register else '',
                'module_codes': register.subject_code.split(',') if register and register.subject_code else []
            })
        return jsonify(period_list)
    except Exception as e:
        print(f"Error fetching periods: {e}")
        return jsonify({'error': 'Error fetching period data'}), 500

@app.route('/api/periods', methods=['POST'])
def add_period():
    """ API endpoint to add a new class period. """
    try:
        data = request.get_json()
        period_id = data.get('period_id')
        class_register = data.get('class_register')
        period_start_time = data.get('period_start_time')
        period_end_time = data.get('period_end_time')
        day_of_week = data.get('day_of_week')
        period_venue_id = data.get('period_venue_id')

        # Validate required fields
        if not all([period_id, class_register, period_venue_id]):
            return jsonify({'error': 'Period ID, class register, and venue are required'}), 400
        
        # Check if period times are in order
        format = "%H:%M"
        s_time = datetime.strptime(period_start_time, format).time()
        e_time = datetime.strptime(period_end_time, format).time()

        if s_time >= e_time:
            return jsonify({'error': f'Start time: {period_start_time} should be strictly before the end time: {period_end_time}'}), 400

        # Check if period ID already exists
        if Class_Period.query.filter_by(period_id=period_id).first():
            return jsonify({'message': 'No changes made'}), 201

        # Verify venue exists
        if not Venue.query.filter_by(id=period_venue_id).first():
            return jsonify({'error': f'Venue with ID {period_venue_id} does not exist'}), 400

        new_period = Class_Period(
            period_id=period_id,
            class_register=class_register,
            period_start_time=period_start_time,
            day_of_week=day_of_week,
            period_end_time=period_end_time,
            period_venue_id=period_venue_id
        )
        
        db.session.add(new_period)
        db.session.commit()
        return jsonify({'message': 'Class period added successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding period: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/periods/<period_id>', methods=['DELETE'])
def delete_period(period_id):
    """ API endpoint to delete a class period. """
    try:
        period = Class_Period.query.filter_by(period_id=period_id).first()
        if not period:
            return jsonify({'error': 'Period not found'}), 404

        # Check if period has attendance records
        attendance_count = Attendance.query.filter_by(class_period_id=period.id).count()
        if attendance_count > 0:
            return jsonify({'error': f'Cannot delete period. It has {attendance_count} attendance record(s)'}), 400

        db.session.delete(period)
        db.session.commit()
        return jsonify({'message': 'Period deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting period: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500


# --- REGISTER API ENDPOINTS ---

@app.route('/api/modules/<module_code>/students', methods=['GET'])
def get_students_by_module(module_code):
    """
    API endpoint to get all students registered for a specific module
    """
    try:
        # First verify the module exists
        module = Module.query.filter_by(module_code=module_code).first()
        if not module:
            return jsonify({'error': 'Module not found'}), 404

        # Find all class registers that contain this module code
        # Since subject_code can contain comma-separated values, we need to handle that
        class_registers = Class_Register.query.all()
        student_numbers = []
        
        for register in class_registers:
            if register.subject_code:
                # Split comma-separated module codes and check if our module is in there
                module_codes = [code.strip() for code in register.subject_code.split(',')]
                if module_code in module_codes:
                    student_numbers.append(register.student_number)
        
        # Get unique student numbers (in case a student appears in multiple registers)
        unique_student_numbers = list(set(student_numbers))
        
        # Fetch student details for these student numbers
        students = Student.query.filter(Student.student_number.in_(unique_student_numbers)).order_by(Student.student_surname, Student.student_name).all()
        
        # Return student data
        return jsonify([{
            'student_number': s.student_number,
            'student_name': s.student_name,
            'student_surname': s.student_surname,
            'student_email': s.student_email,
            'has_face_id': s.embedding is not None
        } for s in students])
        
    except Exception as e:
        print(f"Error fetching students for module {module_code}: {e}")
        return jsonify({'error': 'Error fetching student data'}), 500

@app.route('/api/registers', methods=['GET'])
def get_all_registers():
    """
    API endpoint to get all class registers with student and module information
    """
    try:
        registers = Class_Register.query.order_by(Class_Register.register_id).all()
        register_list = []
        
        for register in registers:
            # Get student information
            student = Student.query.filter_by(student_number=register.student_number).first()
            
            # Parse module codes (handle comma-separated values)
            module_codes = []
            module_names = []
            if register.subject_code:
                codes = [code.strip() for code in register.subject_code.split(',')]
                for code in codes:
                    module = Module.query.filter_by(module_code=code).first()
                    if module:
                        module_codes.append(code)
                        module_names.append(module.module_name)
                    else:
                        module_codes.append(code)
                        module_names.append(f"Unknown Module ({code})")
            
            register_list.append({
                'id': register.id,
                'register_id': register.register_id,
                'student_number': register.student_number,
                'student_name': f"{student.student_name} {student.student_surname}" if student else "Unknown Student",
                'module_codes': module_codes,
                'module_names': module_names,
                'semester': register.semester,
                'year': register.year
            })
        
        return jsonify(register_list)
        
    except Exception as e:
        print(f"Error fetching registers: {e}")
        return jsonify({'error': 'Error fetching register data'}), 500

@app.route('/api/modules/<module_code>/register/summary', methods=['GET'])
def get_module_register_summary(module_code):
    """
    API endpoint to get a summary of a module's register including stats
    """
    try:
        # Verify module exists
        module = Module.query.filter_by(module_code=module_code).first()
        if not module:
            return jsonify({'error': 'Module not found'}), 404

        # Get lecturer information
        lecturer = Lecturer.query.filter_by(lecturer_number=module.lecturer_number).first()
        
        # Count students registered for this module
        class_registers = Class_Register.query.all()
        total_students = 0
        students_with_face_id = 0
        
        for register in class_registers:
            if register.subject_code:
                module_codes = [code.strip() for code in register.subject_code.split(',')]
                if module_code in module_codes:
                    total_students += 1
                    student = Student.query.filter_by(student_number=register.student_number).first()
                    if student and student.embedding:
                        students_with_face_id += 1
        
        # Get recent attendance for this module (if any class periods exist)
        recent_attendance = []
        class_periods = Class_Period.query.join(Class_Register).filter(
            Class_Register.subject_code.contains(module_code)
        ).order_by(Class_Period.period_start_time.desc()).limit(5).all()
        
        for period in class_periods:
            attendance_count = Attendance.query.filter_by(class_period_id=period.id).count()
            recent_attendance.append({
                'period_id': period.period_id,
                'date': period.period_start_time,
                'attendance_count': attendance_count
            })
        
        return jsonify({
            'module': {
                'code': module.module_code,
                'name': module.module_name,
                'lecturer_name': f"{lecturer.name} {lecturer.surname}" if lecturer else "Unknown Lecturer"
            },
            'statistics': {
                'total_students': total_students,
                'students_with_face_id': students_with_face_id,
                'students_without_face_id': total_students - students_with_face_id
            },
            'recent_attendance': recent_attendance
        })
        
    except Exception as e:
        print(f"Error fetching module register summary: {e}")
        return jsonify({'error': 'Error fetching summary data'}), 500

# --- CLASS REGISTER MANAGEMENT ENDPOINTS ---

@app.route('/api/register_students', methods=['GET'])
def get_student_register():
    """
    Fetches the mapping of students to modules (class registers).
    """
    try:
        register_entries = Class_Register.query.all()
        result = []
        for entry in register_entries:
            result.append({
                'student_number': entry.student_number,
                'register_id': entry.register_id # This is the module code
            })
        return jsonify(result)
    except Exception as e:
        print(f"Error fetching student register data: {e}")
        return jsonify({'error': 'Error fetching student register data'}), 500

@app.route('/api/registers', methods=['POST'])
def add_class_register():
    """
    API endpoint to add a new class register entry
    """
    try:
        data = request.get_json()
        student_number = data.get('student_number')
        module_codes = data.get('module_codes', [])  # List of module codes
        semester = data.get('semester', '1')
        
        if not student_number or not module_codes:
            return jsonify({'error': 'Student number and module codes are required'}), 400
        
        # Verify student exists
        student = Student.query.filter_by(student_number=student_number).first()
        if not student:
            return jsonify({'error': f'Student {student_number} not found'}), 404
        
        # Verify all modules exist
        for code in module_codes:
            module = Module.query.filter_by(module_code=code).first()
            if not module:
                return jsonify({'error': f'Module {code} not found'}), 404
        
        # Create register ID
        year = datetime.now().strftime('%Y')
        register_id = f"{student_number}-{semester}-{year}"
        
        # Check if register already exists
        existing_register = Class_Register.query.filter_by(register_id=register_id).first()
        if existing_register:
            # Update existing register
            existing_register.subject_code = ','.join(module_codes)
            message = 'Class register updated successfully'
        else:
            # Create new register
            new_register = Class_Register(
                student_number=student_number,
                register_id=register_id,
                subject_code=','.join(module_codes),
                semester=semester,
                year=year
            )
            db.session.add(new_register)
            message = 'Class register created successfully'
        
        db.session.commit()
        return jsonify({'message': message}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding class register: {e}")
        return jsonify({'error': 'Database error occurred'}), 500

@app.route('/api/registers/<register_id>', methods=['DELETE'])
def delete_class_register(register_id):
    """
    API endpoint to delete a class register
    """
    try:
        register = Class_Register.query.filter_by(register_id=register_id).first()
        if not register:
            return jsonify({'error': 'Register not found'}), 404
        
        # Check if there are any class periods using this register
        class_periods = Class_Period.query.filter_by(class_register=register_id).count()
        if class_periods > 0:
            return jsonify({'error': f'Cannot delete register. It is being used in {class_periods} class period(s)'}), 400
        
        db.session.delete(register)
        db.session.commit()
        return jsonify({'message': 'Register deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting register: {e}")
        return jsonify({'error': 'Database error occurred'}), 500

# --- ATTENDANCE API ENDPOINTS ---

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    """
    API endpoint to get attendance records with filtering options
    """
    try:
        # Get query parameters for filtering
        student_number = request.args.get('student_number')
        class_period_id = request.args.get('class_period_id')
        module_code = request.args.get('module_code')
        period_id = request.args.get('period_id')
        date_str = request.args.get('date') # YYYY-MM-DD
        
        query = Attendance.query
        
        # Apply filters
        if student_number:
            query = query.filter_by(user_id=student_number)
        if class_period_id:
            query = query.filter_by(class_period_id=class_period_id)
        if module_code or period_id:
            query = query.join(Class_Period)
            if period_id and period_id != 'all':
                # Filter by specific period ID (e.g. MON1000)
                query = query.filter(Class_Period.period_id == period_id)
            elif module_code and module_code != 'all':
                # Filter by module code (which is the class_register ID)
                query = query.join(Class_Period.register).filter(Class_Register.register_id == module_code)

        # 1. Filter by specific date
        if date_str:
            query = query.filter(Attendance.date == date_str)
    
        attendance_records = query.order_by(Attendance.date.desc(), Attendance.time.asc()).all()
        
        attendance_list = []
        for a in attendance_records:
            # Get student and period information
            period = Class_Period.query.filter_by(id=a.class_period_id).first() if a.class_period_id else None
            
            attendance_list.append({
                'id': a.id,
                'user_id': a.user_id,
                'class_period_id': a.class_period_id,
                'name': a.name,
                'time': a.time,
                'date': a.date, 
                'status': a.status,
                'venue_name': period.venue.venue_name if period and period.venue else None
            })
        
        return jsonify(attendance_list)
    except Exception as e:
        print(f"Error fetching attendance: {e}")
        return jsonify({'error': 'Error fetching attendance data'}), 500


@app.route('/api/attendance', methods=['POST'])
def add_attendance():
    """ API endpoint to add a new attendance record. """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        class_period_id = data.get('class_period_id')
        name = data.get('name')
        status = data.get('status', 'Present')

        # Validate required fields
        if not all([user_id, name]):
            return jsonify({'error': 'User ID and name are required'}), 400

        # Verify student exists
        if not Student.query.filter_by(student_number=user_id).first():
            return jsonify({'error': f'Student with number {user_id} does not exist'}), 400

        # Verify period exists if provided
        if class_period_id and not Class_Period.query.filter_by(id=class_period_id).first():
            return jsonify({'error': f'Class period with ID {class_period_id} does not exist'}), 400

        new_attendance = Attendance(
            user_id=user_id,
            class_period_id=class_period_id,
            name=name,
            status=status
        )
        
        db.session.add(new_attendance)
        db.session.commit()
        return jsonify({'message': 'Attendance record added successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding attendance: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/attendance/<attendance_id>', methods=['PUT'])
def update_attendance(attendance_id):
    """ API endpoint to update an attendance record. """
    try:
        attendance = Attendance.query.filter_by(id=attendance_id).first()
        if not attendance:
            return jsonify({'error': 'Attendance record not found'}), 404

        data = request.get_json()
        attendance.status = data.get('status', attendance.status)
        attendance.name = data.get('name', attendance.name)

        db.session.commit()
        return jsonify({'message': 'Attendance record updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating attendance: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/attendance/<attendance_id>', methods=['DELETE'])
def delete_attendance(attendance_id):
    """ API endpoint to delete an attendance record. """
    try:
        attendance = Attendance.query.filter_by(id=attendance_id).first()
        if not attendance:
            return jsonify({'error': 'Attendance record not found'}), 404

        db.session.delete(attendance)
        db.session.commit()
        return jsonify({'message': 'Attendance record deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting attendance: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

# --- STUDENT API ENDPOINTS ---

@app.route('/api/students/check/<student_number>', methods=['GET'])
def check_student_exists(student_number):
    """ API to check if a student number already exists. """
    try:
        exists = Student.query.filter_by(student_number=student_number).first() is not None
        return jsonify({'exists': exists}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    """ API to get a list of all students and their registered modules. """
    try:
        students = Student.query.order_by(Student.student_surname).all()
        student_list = []
        for s in students:
            # Find all modules this student is registered for
            registrations = Class_Register.query.filter_by(student_number=s.student_number).all()
            # Handle comma-separated module codes
            module_codes = []
            for reg in registrations:
                if reg.subject_code:
                    # Split comma-separated modules and add to list
                    modules = reg.subject_code.split(',')
                    module_codes.extend(modules)
            student_list.append({
                'id': s.id,
                'student_number': s.student_number,
                'name': s.student_name,
                'surname': s.student_surname,
                'has_face_id': s.embedding is not None,
                'modules': module_codes
            })
        return jsonify(student_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/<student_number>', methods=['GET'])
def get_student(student_number):
    """ API to get details for a single student. """
    try:
        student = Student.query.filter_by(student_number=student_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        registrations = Class_Register.query.filter_by(student_number=student_number).all()
        subject_code = [reg.subject_code for reg in registrations]

        return jsonify({
            'id': student.id,
            'student_number': student.student_number,
            'name': student.student_name,
            'surname': student.student_surname,
            'has_face_id': student.embedding is not None,
            'face_id_image_url': student.image_path, # URL to the saved face image
            'modules': subject_code
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students', methods=['POST'])
def add_student():
    """ API to add a new student record (without face ID). """
    try:
        data = request.get_json()
        
        # Validate required fields
        student_number = data.get('student_number')
        student_name = data.get('name')
        student_surname = data.get('surname')
        
        if not student_number:
            return jsonify({'error': 'Student number is required'}), 400
        if not student_name:
            return jsonify({'error': 'Student name is required'}), 400
        if not student_surname:
            return jsonify({'error': 'Student surname is required'}), 400
            
        # Check if student already exists
        if Student.query.filter_by(student_number=student_number).first():
            return jsonify({'error': 'Student number already exists'}), 409

        # Auto-generate email
        student_email = f"{student_number}@dut4life.ac.za"
        
        # Check if email already exists (shouldn't happen with auto-generation, but just in case)
        if Student.query.filter_by(student_email=student_email).first():
            return jsonify({'error': 'Email already exists'}), 409

        new_student = Student(
            student_number=student_number,
            student_name=student_name,
            student_surname=student_surname,
            student_email=student_email,
            registered_at=datetime.now().strftime("%d/%m/%Y, %H:%M:%S") 
        )
        db.session.add(new_student)

        # Handle module registrations
        module_codes = data.get('modules', [])
        if module_codes:
            # Verify all modules exist before registering student
            for code in module_codes:
                if not Module.query.filter_by(module_code=code).first():
                    db.session.rollback()
                    return jsonify({'error': f'Module {code} does not exist'}), 400
            
                # Create a single registration record
                semester = '2'
                # Create a unique register ID
                register_id = f"{code}-{semester}-{datetime.now().strftime('%Y')}"
                
                # Check if register_id already exists
                # location = Class_Register.query.filter_by(register_id=register_id).first()
                # if location.student_number == student_number:
                #     continue
                
                new_register = Class_Register(
                    student_number=student_number,
                    register_id=register_id,
                    subject_code=code,
                    semester=semester
                )
                db.session.add(new_register)

        db.session.commit()
        return jsonify({'message': 'Student added successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding student: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/students/<student_number>', methods=['PUT'])
def update_student(student_number):
    """ API to update a student's details and module registrations. """
    student = Student.query.filter_by(student_number=student_number).first_or_404()
    data = request.get_json()

    student.student_name = data.get('name', student.student_name)
    student.student_surname = data.get('surname', student.student_surname)

    # Update module registrations: delete old ones, add new ones.
    Class_Register.query.filter_by(student_number=student_number).delete()
    module_codes = data.get('modules', [])
    if module_codes:
            # Verify all modules exist before registering student
            for code in module_codes:
                if not Module.query.filter_by(module_code=code).first():
                    db.session.rollback()
                    return jsonify({'error': f'Module {code} does not exist'}), 400
            
                # Create a single registration record
                semester = '2'
                # Create a unique register ID
                register_id = f"{code}-{semester}-{datetime.now().strftime('%Y')}"
            
                new_register = Class_Register(
                    student_number=student_number,
                    register_id=register_id,
                    subject_code=code,
                    semester=semester
                )
                db.session.add(new_register)

    try:
        db.session.commit()
        return jsonify({'message': 'Student updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/<student_number>', methods=['DELETE'])
def delete_student(student_number):
    """ API to delete a student and all their related records. """
    student = Student.query.filter_by(student_number=student_number).first_or_404()

    # Delete related records first to maintain data integrity
    Attendance.query.filter_by(user_id=student.student_number).delete()
    Class_Register.query.filter_by(student_number=student_number).delete()

    db.session.delete(student)
    try:
        db.session.commit()
        # Optionally delete the student's face image file
        if student.image_path and os.path.exists(os.path.join(basedir, student.image_path)):
            os.remove(os.path.join(basedir, student.image_path))
        return jsonify({'message': 'Student deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/register_face', methods=['POST'])
def register_face():
    """
    API to handle face registration. Receives image data from the browser,
    computes embedding, and saves it to the database.
    """
    data = request.get_json()
    student_number = data.get('student_number')
    image_data_url = data.get('image_data') # This is a Base64 Data URL

    if not all([student_number, image_data_url]):
        return jsonify({'error': 'Student number and image data are required'}), 400

    student = Student.query.filter_by(student_number=student_number).first_or_404()

    try:
        # Decode the Base64 image data
        header, encoded = image_data_url.split(',', 1)
        image_bytes = base64.b64decode(encoded)

        # Compute the embedding
        embedding = compute_embedding(image_bytes)
        if embedding is None:
            return jsonify({'error': 'No face detected or image is unclear. Please try again.'}), 400

        # Save the raw image file to the server
        image_filename = f"{student_number}.jpg"
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        with open(image_path, "wb") as f:
            f.write(image_bytes)

        # Update the student record in the database
        student.embedding = embedding.tobytes()
        student.image_path = f"static/faces/{image_filename}" # Store the relative path
        db.session.commit()

        return jsonify({'message': 'Face ID registered successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Face registration error: {e}")
        return jsonify({'error': 'An internal error occurred during face registration.'}), 500

# --- ATTENDANCE CAPTURE API ---

def cosine_similarity(vec1, vec2):
    """ Helper to compute cosine similarity between two embeddings. """
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def is_period_active_now():
    """
    Checks if a class period is active for the currently logged-in lecturer.
    Returns the active Class_Period object or None.
    """
    # 1. Ensure a lecturer is logged in
    lecturer_id = session.get('lecturer_number')
    if not lecturer_id:
        return None

    now = datetime.now()
    day_name = now.strftime('%A')
    current_time_str = now.strftime('%H:%M')
    
    # 2. Build the query with necessary JOINS
    active_period = Class_Period.query.join(
        Class_Register, Class_Period.class_register == Class_Register.register_id
    ).join(
        Module, Class_Register.subject_code == Module.module_code
    ).filter(
        # Filter by time and day
        Class_Period.day_of_week == day_name,
        Class_Period.period_start_time <= current_time_str,
        Class_Period.period_end_time > current_time_str,
        # Crucially, filter by the logged-in lecturer's ID
        Module.lecturer_number == lecturer_id
    ).first()
    
    return active_period

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    """
    Receives a video frame, identifies a student, and marks attendance.
    """
    # 1. Check if a class period is currently active
    active_period = is_period_active_now()
    if not active_period:
        return jsonify({
            'status': 'no_active_period',
            'message': 'No class is currently active.'
        }), 400

    # 2. Get image data from the request
    data = request.get_json()
    if not data or 'image_data' not in data:
        return jsonify({'error': 'No image data provided'}), 400
    
    try:
        # Decode the Base64 image
        header, encoded = data['image_data'].split(',', 1)
        image_bytes = base64.b64decode(encoded)
    
        # 3. Compute embedding for the face in the frame
        frame_embedding = compute_embedding(image_bytes)

        # Add a check to ensure an embedding was successfully created
        if frame_embedding is None:
            return jsonify({'status': 'unidentifiable', 'message': 'Could not process the image or no face was detected.'})


    except Exception as e:
        print(f"[ERROR] Face detection/embedding failed: {e}")
        return jsonify({'status': 'unidentifiable', 'message': 'Could not process the image.'})
    
    # 4. Find students registered for the active period's module
    register_id = active_period.register.register_id
    module_code = active_period.register.subject_code

    # Find all students registered for this specific module
    registered_students = db.session.query(Student).join(Class_Register).filter(
        Class_Register.subject_code == module_code
    ).all()
    
    # 5. Compare frame embedding with registered students' embeddings
    match_found = False
    for student in registered_students:
        if student.embedding:
            db_embedding = np.frombuffer(student.embedding, dtype=np.float32)
            similarity = cosine_similarity(frame_embedding, db_embedding)

            if similarity > 0.70: # Confidence threshold
                
                # 6. Check if already marked present today for this period
                today_date = datetime.now().strftime("%Y-%m-%d")
                existing_record = Attendance.query.filter_by(
                    user_id=student.student_number,
                    class_period_id=active_period.id,
                    date=today_date
                ).first()
                
                full_name = f"{student.student_name} {student.student_surname}"

                if existing_record:
                    return jsonify({
                        'status': 'already_present',
                        'student_name': full_name,
                        'student_id': student.student_number
                    })
                

                # 7. Insert new attendance record
                now_time = datetime.now().strftime("%H:%M:%S")
                new_attendance = Attendance(
                    user_id=student.student_number,
                    class_period_id=active_period.id,
                    name=full_name,
                    time=now_time,
                    date=today_date,
                    status="Present"
                )
                db.session.add(new_attendance)
                db.session.commit()
                
                return jsonify({
                    'status': 'present',
                    'student_name': full_name,
                    'student_id': student.student_number
                })

    
    return jsonify({'status': 'unidentifiable', 'message': 'Face does not match any registered student.'})

if __name__ == '__main__':
    app.run(debug=True, port=5000) 