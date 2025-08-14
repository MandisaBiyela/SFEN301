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
    user_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    module_period_id = db.Column(db.Integer, db.ForeignKey('module_period.period_id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    time = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    status = db.Column(db.String(50), nullable=False, default='Absence')

    # Establish relationship to student
    student = db.relationship('Student', backref=db.backref('attendance_records', lazy=True))
    period = db.relationship('Class_Period', backref=db.backref('attendance_records', lazy=True))

    def __repr__(self):
        return f'<Attendance {self.name} @ {self.time}>'

class Student(db.Model):
    """
    Represents a student in the system.
    """
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    student_number = db.Column(db.String(50), unique=True, nullable=False)
    student_name = db.Column(db.String(100), nullable=False)
    student_surname = db.Column(db.String(100), nullable=False)
    student_email = db.Column(db.String(120), unique=True, nullable=False)
    registered_at = db.Column(db.String(100))
    image_path = db.Column(db.String(200), nullable=True) 

    def __repr__(self):
        return f'<Student {self.student_name} {self.student_surname}>'

class Class_Register(db.Model):
    """
    Represents a class register in the system.
    """
    __tablename__ = 'class_register'
    id = db.Column(db.Integer, primary_key=True)
    student_number = db.Column(db.String(50), unique=True, nullable=False)
    register_id = db.Column(db.String(50), unique=True, nullable=False)
    subject_code = db.Column(db.String(100),db.ForeignKey('subject.subject_code'), nullable=False)
    semester = db.Column(db.String(50), nullable=False)
    year = db.Column(db.String(5), default=lambda: datetime.now().strftime("%Y"))

    def __repr__(self):
        return f'<Class Register {self.student_name} {self.student_surname}>'

class Subject(db.Model):
    """
    Represents a subject in the system.
    """
    __tablename__ = 'subject'
    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(50), unique=True, nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    lecturer_number = db.Column(db.String(50),db.ForeignKey('lecturers.lecturer_number'), nullable=False)

    
    def __repr__(self):
        return f'<Subject {self.subject_code} {self.subject_name}>'

class Class_Period(db.Model):
    """
    Represents a class period in the system.
    """
    __tablename__ = 'class_period'
    id = db.Column(db.Integer, primary_key=True)
    period_id = db.Column(db.String(50), unique=True, nullable=False)
    class_register = db.Column(db.String(50), db.ForeignKey('class_register.register_id'), nullable=False)
    period_time = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    period_venue_id = db.Column(db.Integer, db.ForeignKey('venue.id'), nullable=False)


    def __repr__(self):
        return f'<Class Period {self.period_id}, {self.subject_code}, {self.period_venue}, {self.period_time}>'

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


