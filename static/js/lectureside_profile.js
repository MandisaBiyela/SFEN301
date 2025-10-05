document.addEventListener('DOMContentLoaded', function () {
  const backButton = document.getElementById('back-button');
  const logoutBtn = document.getElementById('logout-btn');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  const passwordForm = document.getElementById('password-form');
  
  const profileDetailsSection = document.getElementById('profile-details-section');
  const passwordFormContainer = document.getElementById('password-form-container');
  const passwordMessage = document.getElementById('password-message');

  // --- Mock Lecturer Data (To be replaced with dynamic data) ---
  const MOCK_LECTURER_DATA = {
    name: "Dr. Lihle Mkhize", 
    email: "MkhizeL@dut.ac.za" 
  };
  // Mock current password for verification (Replace with actual secure check)
  const MOCK_CURRENT_PASSWORD = 'password123'; 
  
  const profileNameElement = document.getElementById('profile-name');
  const profileEmailElement = document.getElementById('profile-email');

  // Function to load and display profile data
  function loadProfileData() {
    if (profileNameElement) {
      profileNameElement.textContent = MOCK_LECTURER_DATA.name;
    }
    if (profileEmailElement) {
      profileEmailElement.textContent = MOCK_LECTURER_DATA.email;
    }
  }

  // --- View Management Functions ---
  function showProfileDetails() {
    profileDetailsSection.style.display = 'block';
    passwordFormContainer.style.display = 'none';
  }

  function showPasswordForm() {
    profileDetailsSection.style.display = 'none';
    passwordFormContainer.style.display = 'block';
    passwordMessage.textContent = ''; // Clear any previous messages
    passwordForm.reset(); // Clear form inputs
  }

  // --- Event Listeners ---

  // Back button
  if (backButton) {
      backButton.addEventListener('click', function (e) {
        e.preventDefault();
        window.history.back();
      });
  }

  // Logout button
  if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (confirm("Are you sure you want to log out?")) {
          sessionStorage.clear();
          localStorage.clear();
          window.location.href = '/'; 
        }
      });
  }

  // Show Password Form button
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', showPasswordForm);
  }

  // Cancel Password Form button
  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', showProfileDetails);
  }

  // Handle Password Form Submission
  if (passwordForm) {
    passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      
      const oldPassword = document.getElementById('old-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      passwordMessage.className = 'error-message'; // Reset class for styling

      // 1. Check Old Password (MOCK CHECK)
      if (oldPassword !== MOCK_CURRENT_PASSWORD) {
        passwordMessage.textContent = 'Error: The old password you entered is incorrect.';
        return;
      }

      // 2. Check New Password vs Confirmation
      if (newPassword !== confirmPassword) {
        passwordMessage.textContent = 'Error: New Password and Confirm New Password do not match.';
        return;
      }
      
      // 3. Check if new password is the same as old one
      if (newPassword === oldPassword) {
        passwordMessage.textContent = 'Error: New password cannot be the same as the old password.';
        return;
      }

      // 4. Basic Complexity Check (Optional, but recommended)
      if (newPassword.length < 8) {
        passwordMessage.textContent = 'Error: Password must be at least 8 characters long.';
        return;
      }

      // --- MOCK PASSWORD CHANGE SUCCESS ---
      // In a real application, you would send an AJAX request here to update the password on the server.
      
      passwordMessage.textContent = 'Success! Your password has been changed.';
      passwordMessage.className = 'success-message'; // Assuming you add this style to your CSS

      // After a short delay, hide the form and show profile details
      setTimeout(() => {
        showProfileDetails();
      }, 2000); 

      // NOTE: You'd update MOCK_CURRENT_PASSWORD here if this were a single-page simulation
    });
  }
  
  // Initial load
  loadProfileData();
  showProfileDetails(); // Ensure profile details are shown first
});