
from flask import Flask, render_template, jsonify, request, url_for


app = Flask(__name__)

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

"""
@app.route('/admin_dashboard.html')
def admin_dashboard():
    return render_template('admin_dashboard.html')
"""
@app.route('/profile.html')
def profile():
    return render_template('profile.html')

@app.route('/lecturer.html')
def lecturer():
    return render_template('lecturer.html')

@app.route('/lecturer_add.html')
def lecturer_add():
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