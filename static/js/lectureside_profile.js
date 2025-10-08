document.addEventListener('DOMContentLoaded', function () {
  const backButton = document.getElementById('back-button');
  const logoutBtn = document.getElementById('logout-btn');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  const passwordForm = document.getElementById('password-form');
  
  const profileDetailsSection = document.getElementById('profile-details-section');
  const passwordFormContainer = document.getElementById('password-form-container');
  const passwordMessage = document.getElementById('password-message');

  const profileNameElement = document.getElementById('profile-name');
  const profileEmailElement = document.getElementById('profile-email');

  // Function to load and display profile data
    /**
   * Fetches lecturer data from the server and populates the profile.
   */
  async function loadProfileData() {
    try {
      const response = await fetch('/api/current_user');
      if (!response.ok) throw new Error('Failed to fetch profile data.');
      
      const user = await response.json();
      if (user.logged_in) {
        if (profileNameElement) profileNameElement.textContent = `${user.name} ${user.surname}`;
        if (profileEmailElement) profileEmailElement.textContent = user.email;
      }
    } catch (error) {
      console.error(error);
      if (profileNameElement) profileNameElement.textContent = 'Error Loading Name';
      if (profileEmailElement) profileEmailElement.textContent = 'Could not load email.';
    }
  }

  /**
   * Handles the logout process.
   */
  async function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/';
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

 if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
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
      
      // NOTE: This entire form is a FRONTEND-ONLY DEMONSTRATION.
      // A secure backend endpoint is required to actually change the password.
      
      const oldPassword = document.getElementById('old-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      passwordMessage.className = 'error-message';

      if (!oldPassword || !newPassword || !confirmPassword) {
        passwordMessage.textContent = 'Error: All password fields are required.';
        return;
      }
      if (newPassword !== confirmPassword) {
        passwordMessage.textContent = 'Error: New passwords do not match.';
        return;
      }
      if (newPassword.length < 8) {
        passwordMessage.textContent = 'Error: New password must be at least 8 characters long.';
        return;
      }

      // --- MOCK PASSWORD CHANGE SUCCESS ---
      passwordMessage.textContent = 'DEMO SUCCESS: In a real app, your password would be changed.';
      passwordMessage.className = 'success-message';

      setTimeout(() => {
        showProfileDetails(); // Function to switch back to the main view
      }, 2500); 
    });
  }
  
  
  // Initial load
  loadProfileData();
  showProfileDetails(); // Ensure profile details are shown first
});