document.addEventListener('DOMContentLoaded', function () {
  const backButton = document.getElementById('back-button');
  const logoutBtn = document.getElementById('logout-btn');

  // Back button: just go back
  backButton.addEventListener('click', function (e) {
    e.preventDefault();
    window.history.back();
  });

  // Logout button: confirm before logout
  logoutBtn.addEventListener('click', function () {
    if (confirm("Are you sure you want to log out?")) {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = 'login.html';
    }
  });

  
});
