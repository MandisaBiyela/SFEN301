from flask import Flask, render_template, request, jsonify, flash
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
            model_name="Facenet512",
            detector_backend="retinaface",
            enforce_detection=True # Ensure a face is found
        )
        # Extract the embedding vector
        embedding = embedding_objs[0]["embedding"]
        return np.array(embedding, dtype=np.float32)

    except Exception as e:
        print(f"Error in compute_embedding: {e}")
        # This will often fail if DeepFace can't find a face in the image.
        # The `enforce_detection=True` is important for this.
        return None


#Incase i want to check the login as the first page
""""
@app.route('/')
def login():
    return render_template('login.html')
"""

@app.route('/login.html')
def login():
    return render_template('login.html')

@app.route('/forgot_password.html')
def forgot_password():
    return render_template('forgot_password.html')

@app.route('/new_password.html')
def new_password():
    return render_template('new_password.html')


#Incase i want to check the Admin Dashboard as the first page
@app.route('/')
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
        # Get data from the form
        lecturer_number = request.form.get('lecturer-number')
        name = request.form.get('lecturer-name')
        surname = request.form.get('lecturer-surname')
        email = request.form.get('lecturer-email')

        # Basic validation
        if not all([lecturer_number, name, surname, email]):
            return jsonify({'error': 'All fields are required!'}), 400

        # Check if lecturer or email already exists
        if Lecturer.query.filter_by(lecturer_number=lecturer_number).first():
            return jsonify({'error': 'A lecturer with this number already exists.'}), 400
        
        if Lecturer.query.filter_by(email=email).first():
            return jsonify({'error': 'This email address is already registered.'}), 400

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

            # Commit the changes to the database
            db.session.commit()
            print("Record updated successfully!")
            flash(f"Record for {lecturer_number} updated successfully!")
            # return render_template('lecturer.html')
        else:
            print("Lecturer not found.")

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
        periods = Class_Period.query.order_by(Class_Period.period_start_time).all()
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
        period_venue_id = data.get('period_venue_id')

        # Validate required fields
        if not all([period_id, class_register, period_venue_id]):
            return jsonify({'error': 'Period ID, class register, and venue are required'}), 400

        # Check if period ID already exists
        if Class_Period.query.filter_by(period_id=period_id).first():
            return jsonify({'error': f'Period with ID {period_id} already exists'}), 409

        # Verify venue exists
        if not Venue.query.filter_by(id=period_venue_id).first():
            return jsonify({'error': f'Venue with ID {period_venue_id} does not exist'}), 400

        new_period = Class_Period(
            period_id=period_id,
            class_register=class_register,
            period_start_time=period_start_time,
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
        date = request.args.get('date')
        
        query = Attendance.query
        
        # Apply filters
        if student_number:
            query = query.filter_by(user_id=student_number)
        if class_period_id:
            query = query.filter_by(class_period_id=class_period_id)
        if date:
            query = query.filter(Attendance.time.like(f'{date}%'))
        
        attendance_records = query.order_by(Attendance.time.desc()).all()
        
        attendance_list = []
        for a in attendance_records:
            # Get student and period information
            student = Student.query.filter_by(student_number=a.user_id).first()
            period = Class_Period.query.filter_by(id=a.class_period_id).first() if a.class_period_id else None
            
            attendance_list.append({
                'id': a.id,
                'user_id': a.user_id,
                'class_period_id': a.class_period_id,
                'name': a.name,
                'time': a.time,
                'status': a.status,
                'student_name': f"{student.student_name} {student.student_surname}" if student else 'Unknown',
                'period_id': period.period_id if period else None,
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
        module_codes = [reg.module_code for reg in registrations]

        return jsonify({
            'id': student.id,
            'student_number': student.student_number,
            'name': student.student_name,
            'surname': student.student_surname,
            'has_face_id': student.embedding is not None,
            'face_id_image_url': student.image_path, # URL to the saved face image
            'modules': module_codes
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
        # Create a single registration record with all modules
        semester = '2'
        register_id = f"{student_number}-{semester}-{datetime.now().strftime('%Y')}"
        
        # Check if register_id already exists
        if Class_Register.query.filter_by(register_id=register_id).first():
            register_id = f"{student_number}-{semester}-{datetime.now().strftime('%Y')}-{datetime.now().strftime('%H%M%S')}"
        
        # Store all module codes as comma-separated string
        modules_string = ','.join(module_codes)
        
        new_register = Class_Register(
            student_number=student_number,
            register_id=register_id,
            subject_code=modules_string,
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



if __name__ == '__main__':
    app.run(debug=True, port=5000) 