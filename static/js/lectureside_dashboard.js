document.addEventListener('DOMContentLoaded', function () {
  const logoutBtn = document.querySelector('.logout-btn');
  const profileBtn = document.querySelector('.profile-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      const confirmLogout = confirm("Are you sure you want to log out?");
      if (confirmLogout) {
        // Clear session/local storage if used
        sessionStorage.clear();
        localStorage.clear();

        // Redirect to login page
        window.location.href = '/';
      }
      // else do nothing if user cancels
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', function () {
      // Redirect to profile page
      window.location.href = 'lectureside_profile.html';
    });
  }

  
});
