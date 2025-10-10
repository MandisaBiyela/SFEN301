document.addEventListener('DOMContentLoaded', function() {
    // Login page functionality
    const adminTab = document.getElementById('adminTab');
    const lecturerTab = document.getElementById('lecturerTab');
    const loginForm = document.getElementById('loginForm');
    const usernameLabel = document.getElementById('username-label');
    const usernameInput = document.getElementById('username');
    /*const forgotPasswordContainer = document.querySelector('.forgot-password-container');*/
    const errorMessageDiv = document.getElementById('login-error'); // For displaying errors

    let userType = 'lecturer'; // Default to lecturer

    function setActiveTab(activeTab, otherTab) {
        activeTab.classList.add('active');
        otherTab.classList.remove('active');
    }

    function updateFormFields(type) {
        if (type === 'admin') {
            usernameLabel.textContent = 'Admin ID';
            usernameInput.placeholder = 'Enter Admin ID Number';
            
        } else if (type === 'lecturer') {
            usernameLabel.textContent = 'Lecturer ID';
            usernameInput.placeholder = 'Enter Lecturer ID Number';
          
        }
    }

    // Set initial state for Lecturer
    if (adminTab && lecturerTab && usernameLabel && usernameInput /*&& forgotPasswordContainer*/) {
        setActiveTab(lecturerTab, adminTab);
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
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            // Clear previous errors
            if (errorMessageDiv) {
                errorMessageDiv.textContent = '';
                errorMessageDiv.style.display = 'none';
            }

            const username = usernameInput.value;
            const password = document.getElementById('password').value;
            const loginButton = loginForm.querySelector('button[type="submit"]');

            // Disable button to prevent multiple submissions
            loginButton.disabled = true;
            loginButton.textContent = 'Logging In...';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_type: userType,
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // Handle server-side errors (e.g., 400, 401, 500)
                    throw new Error(data.error || 'An unknown error occurred.');
                }

                if (data.success) {
                    // Redirect on successful login
                    window.location.href = data.redirect;
                } else {
                    // Fallback for non-error responses that are not a success
                    throw new Error(data.error || 'Login failed. Please try again.');
                }

            } catch (error) {
                // Display the error message on the page
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = error.message;
                    errorMessageDiv.style.display = 'block';
                } else {
                    // Fallback to alert if the error div doesn't exist
                    alert(error.message);
                }
            } finally {
                // Re-enable the button
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
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
                window.location.href = '/'; // Redirect to login page
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

            alert('Your password has been successfully reset. You can now log in with your new password.');
            window.location.href = '/';
        });
    }
});