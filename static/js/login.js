document.addEventListener('DOMContentLoaded', function() {
    // Login page functionality
    const adminTab = document.getElementById('adminTab');
    const lecturerTab = document.getElementById('lecturerTab');
    const loginForm = document.getElementById('loginForm');
    const usernameLabel = document.getElementById('username-label');
    const usernameInput = document.getElementById('username');
    const forgotPasswordContainer = document.querySelector('.forgot-password-container');
    // forgotPasswordLink no longer needs alert, so no event listener for it here

    let userType = 'admin'; // Default to admin

    function setActiveTab(activeTab, otherTab) {
        activeTab.classList.add('active');
        otherTab.classList.remove('active');
    }

    function updateFormFields(type) {
        if (type === 'admin') {
            usernameLabel.textContent = 'Admin ID';
            usernameInput.placeholder = 'Enter Admin ID Number';
            forgotPasswordContainer.style.display = 'none';
        } else if (type === 'lecturer') {
            usernameLabel.textContent = 'Lecturer ID';
            usernameInput.placeholder = 'Enter Lecturer ID Number';
            forgotPasswordContainer.style.display = 'block';
        }
    }

    // Set initial state for Admin
    if (adminTab && lecturerTab && usernameLabel && usernameInput && forgotPasswordContainer) {
        updateFormFields(userType);

        adminTab.addEventListener('click', function() {
            setActiveTab(adminTab, lecturerTab);
            userType = 'admin';
            updateFormFields(userType);
        });

        lecturerTab.addEventListener('click', function() {
            setActiveTab(lecturerTab, adminTab);
            userType = 'lecturer';
            updateFormFields(userType);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const username = usernameInput.value;
            const password = document.getElementById('password').value;

            // Dummy credentials for demonstration
            const adminCredentials = { username: 'admin', password: 'password123' };
            const lecturerCredentials = { username: 'lecturer', password: 'password123' };

            if (userType === 'admin') {
                if (username === adminCredentials.username && password === adminCredentials.password) {
                    alert('Admin login successful!');
                    window.location.href = 'admin_dashboard.html';
                } else {
                    alert('Invalid Admin ID or password.');
                }
            } else if (userType === 'lecturer') {
                if (username === lecturerCredentials.username && password === lecturerCredentials.password) {
                    alert('Lecturer login successful!');
                    window.location.href = 'lecturer_dashboard.html';
                } else {
                    alert('Invalid Lecturer ID or password.');
                }
            }
        });
    }

    // Forgot Password page functionality
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const lecturerId = document.getElementById('lecturer-id').value.trim();

            if (lecturerId) {
                alert('Reset Link Sent, check your email inbox for the link to reset your password.');
                // Redirect to login page after alert
                window.location.href = 'login.html';
            } else {
                alert('Please enter your Lecturer ID.');
            }
        });
    }

    // New Password page functionality
    const newPasswordForm = document.getElementById('newPasswordForm');

    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                alert('Passwords do not match. Please try again.');
                return;
            }

            if (newPassword.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }

            // In a real app, send new password + token securely to server here

            alert('Your password has been successfully reset. You can now log in with your new password.');
            window.location.href = 'login.html';
        });
    }
});
