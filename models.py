from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize the SQLAlchemy extension
db = SQLAlchemy()

class Lecturer(db.Model):
    """
    Represents a lecturer in the system.
    """
    __tablename__ = 'lecturers'
    id = db.Column(db.Integer, primary_key=True)
    lecturer_number = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    surname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<Lecturer {self.name} {self.surname}>'

class Attendance(db.Model):
    """
    Represents an attendance record for a user.
    """
    __tablename__ = 'attendance'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('students.student_number'), nullable=False)
    class_period_id = db.Column(db.Integer, db.ForeignKey('class_period.id'))
    name = db.Column(db.String(100), nullable=False)
    time = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    status = db.Column(db.String(50), nullable=False, default='Absence')

    # Relationships
    student = db.relationship('Student', backref=db.backref('attendance_records', lazy=True))
    class_period = db.relationship('Class_Period', backref=db.backref('attendance_records', lazy=True))

    def __repr__(self):
        return f'<Attendance {self.name} @ {self.time}>'

class Student(db.Model):
    """
    Represents a student in the system.
    """
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    student_number = db.Column(db.String(8), unique=True, nullable=False, index=True)
    student_name = db.Column(db.String(100), nullable=False)
    student_surname = db.Column(db.String(100), nullable=False)
    student_email = db.Column(db.String(120), unique=True, nullable=False)
    registered_at = db.Column(db.String(100))
    image_path = db.Column(db.String(200), nullable=True)
    embedding = db.Column(db.LargeBinary, nullable=True)  # NEW: store face embedding

    def __repr__(self):
        return f'<Student {self.student_name} {self.student_surname}>'

class Class_Register(db.Model):
    """
    Represents a class register in the system.
    """
    __tablename__ = 'class_register'
    id = db.Column(db.Integer, primary_key=True)
    student_number = db.Column(db.String(50), db.ForeignKey('students.student_number'), nullable=False)
    register_id = db.Column(db.String(50), unique=True, nullable=False)
    subject_code = db.Column(db.String(100), db.ForeignKey('module.module_code'), nullable=False)
    semester = db.Column(db.String(50), nullable=False)
    year = db.Column(db.String(5), default=lambda: datetime.now().strftime("%Y"))

    # Relationships
    student = db.relationship('Student', backref=db.backref('class_registrations', lazy=True))
    module = db.relationship('Module', backref=db.backref('class_registrations', lazy=True))

    def __repr__(self):
        return f'<Class Register {self.register_id}>'

class Module(db.Model):
    """
    Represents a module in the system.
    """
    __tablename__ = 'module'
    id = db.Column(db.Integer, primary_key=True)
    module_code = db.Column(db.String(50), unique=True, nullable=False)
    module_name = db.Column(db.String(100), nullable=False)
    lecturer_number = db.Column(db.String(50), db.ForeignKey('lecturers.lecturer_number'), nullable=False)

    # Relationship to lecturer
    lecturer = db.relationship('Lecturer', backref=db.backref('modules', lazy=True))

    def __repr__(self):
        return f'<Module {self.module_code} {self.module_name}>'

class Class_Period(db.Model):
    """
    Represents a class period in the system.
    """
    __tablename__ = 'class_period'
    id = db.Column(db.Integer, primary_key=True)
    period_id = db.Column(db.String(50), unique=True, nullable=False)
    class_register = db.Column(db.String(50), db.ForeignKey('class_register.register_id'), nullable=False)
    period_start_time = db.Column(db.String(100), nullable=False)
    period_end_time = db.Column(db.String(100), nullable=False)
    period_venue_id = db.Column(db.Integer, db.ForeignKey('venue.id'), nullable=False)

    # Relationships
    register = db.relationship('Class_Register', backref=db.backref('class_periods', lazy=True))
    venue = db.relationship('Venue', backref=db.backref('class_periods', lazy=True))

    def __repr__(self):
        return f'<Class Period {self.period_id} at {self.period_time}>'

class Venue(db.Model):
    """
    Represents a Venue in the system.
    """
    __tablename__ = 'venue'
    id = db.Column(db.Integer, primary_key=True)
    venue_name = db.Column(db.String(50), unique=True, nullable=False)
    venue_block = db.Column(db.String(50), nullable=False)
    venue_campus = db.Column(db.String(120), nullable=False)

    def __repr__(self):
        return f'<Venue {self.venue_block}, {self.venue_campus}, {self.venue_name}>'
