from flask import *
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
    try:
        # Query the database to get all lecturers, ordered by name
        all_lecturers = Lecturer.query.order_by(Lecturer.name).all()
        return render_template('lecturer.html', lecturers=all_lecturers)
    except Exception as e:
        # Log the error and show an error message
        print(f"Error fetching lecturers: {e}")
        flash('Error fetching lecturer data from the database.', 'error')
        return render_template('lecturer.html', lecturers=[])

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
            flash('All fields are required!', 'error')
            return redirect(url_for('lecturer_add'))

        # Check if lecturer or email already exists
        if Lecturer.query.filter_by(lecturer_number=lecturer_number).first():
            flash('A lecturer with this number already exists.', 'warning')
            return redirect(url_for('lecturer_add'))
        
        if Lecturer.query.filter_by(email=email).first():
            flash('This email address is already registered.', 'warning')
            return redirect(url_for('lecturer_add'))

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
            flash(f'Lecturer {name} {surname} added successfully!', 'success')
            return redirect(url_for('lecturer'))
        except Exception as e:
            db.session.rollback()
            print(f"Error adding lecturer: {e}")
            flash('An error occurred while adding the lecturer.', 'error')
            return redirect(url_for('lecturer_add'))

    # For a GET request, just show the form
    return render_template('lecturer_add.html')

@app.route('/lecturer_edit.html')
def lecturer_edit():
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




if __name__ == '__main__':
    app.run(debug=True, port=5000) 