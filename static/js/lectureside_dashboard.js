document.addEventListener('DOMContentLoaded', async function () {
  const logoutBtn = document.querySelector('.logout-btn');
  const profileBtn = document.querySelector('.profile-btn');
  const welcomeMessage = document.getElementById('welcome-message'); // Assumes an element with this ID exists

  /**
   * Fetches the current user's data and updates the UI.
   */
  async function loadUserData() {
    try {
      const response = await fetch('/api/current_user');
      if (!response.ok) {
        throw new Error('Could not fetch user data.');
      }
      const user = await response.json();

      if (user.logged_in && welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${user.name} ${user.surname}`;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      if (welcomeMessage) {
        welcomeMessage.textContent = 'Welcome, Lecturer';
      }
    }
  }
  
  /**
   * Logs the user out by calling the backend API.
   */
  async function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
      try {
        const response = await fetch('/api/logout', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
          // Clear any local session info and redirect
          window.location.href = '/'; 
        } else {
          alert('Logout failed. Please try again.');
        }
      } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if API call fails
        window.location.href = '/';
      }
    }
  }

  // --- Event Listeners ---
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', function () {
      window.location.href = 'lectureside_profile.html';
    });
  }

  // --- Initial Load ---
  loadUserData();
});