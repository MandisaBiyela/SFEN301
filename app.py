
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
def admin_dashboard():
    return render_template('admin_dashboard.html')
"""
@app.route('/admin_dashboard.html')
def admin_dashboard():
    return render_template('admin_dashboard.html')
"""
    
if __name__ == '__main__':
    app.run(debug=True, port=5000) 