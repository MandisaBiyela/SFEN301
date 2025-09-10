from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
import os
from models import *

app = Flask(__name__)


# --- Database Configuration ---
# Set the path for the SQLite database file
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Optional: to suppress a warning
app.config['SECRET_KEY'] = 'your_super_secret_key' # Required for flashing messages

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



# --- MODULE API ENDPOINTS (NEW & UPDATED) ---

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



if __name__ == '__main__':
    app.run(debug=True, port=5000) 