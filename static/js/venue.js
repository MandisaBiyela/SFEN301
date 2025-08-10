document.addEventListener('DOMContentLoaded', function() {
    // Dummy Data for demonstration purposes
    const dummyVenues = [
        { id: 1, name: 'B504', block: 'S2', campus: 'Steve Biko Campus' },
        { id: 2, name: 'L402', block: 'S7', campus: 'Steve Biko Campus' },
        { id: 3, name: 'C101', block: 'Block C', campus: 'Ritson Campus' },
        { id: 4, name: 'T101', block: 'T-Block', campus: 'ML Sultan Campus' },
        { id: 5, name: 'L205', block: 'L-Block', campus: 'City Campus' }
    ];

    const venueTableBody = document.getElementById('venue-table-body');
    const venueSearchInput = document.getElementById('venue-search-input');
    const backButton = document.getElementById('back-button');
    const statusMessageContainer = document.getElementById('status-message-container');
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    // Display status message if a status parameter is present in the URL
    function showStatusMessage(message) {
        if (statusMessageContainer) {
            statusMessageContainer.innerHTML = `<div class="status-message-container">${message}</div>`;
        }
    }

    if (status) {
        if (status === 'saved') {
            showStatusMessage('New venue has been added successfully!');
        } else if (status === 'deleted') {
            showStatusMessage('Venue has been deleted successfully!');
        } else if (status === 'edited') {
            showStatusMessage('Venue has been updated successfully!');
        }
    }

    // Function to render the venue table
    function renderVenues(venues) {
        if (!venueTableBody) return;
        venueTableBody.innerHTML = '';
        venues.forEach(venue => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${venue.name}</td>
                <td>${venue.block}</td>
                <td>${venue.campus}</td>
                <td>
                    <button class="image-btn edit-btn" data-id="${venue.id}">
                        <img src="static/images/Edit.png" alt="Edit" class="action-icon">
                    </button>
                    <button class="image-btn delete-btn" data-id="${venue.id}">
                        <img src="static/images/Delete.png" alt="Delete" class="action-icon">
                    </button>
                </td>
            `;
            venueTableBody.appendChild(row);
        });
    }

    // Initial render of the table
    renderVenues(dummyVenues);

    // Filter venues based on search input
    if (venueSearchInput) {
        venueSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const filteredVenues = dummyVenues.filter(venue =>
                venue.name.toLowerCase().includes(query) ||
                venue.block.toLowerCase().includes(query) ||
                venue.campus.toLowerCase().includes(query)
            );
            renderVenues(filteredVenues);
        });
    }

    // Handle Edit and Delete button clicks using event delegation
    if (venueTableBody) {
        venueTableBody.addEventListener('click', function(e) {
            const button = e.target.closest('.image-btn');
            if (!button) return;

            const id = button.dataset.id;
            if (button.classList.contains('edit-btn')) {
                // Redirect to venue_edit.html with id param
                window.location.href = `venue_edit.html?id=${id}`;
            } else if (button.classList.contains('delete-btn')) {
                if (confirm(`Are you sure you want to delete venue with ID: ${id}?`)) {
                    // Simulate deletion and redirect with status
                    window.location.href = 'venue.html?status=deleted';
                }
            }
        });
    }

    // Back button functionality
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    }

    // Profile and Logout button handling
    const profileBtn = document.querySelector('.profile-btn');
    const logoutBtn = document.querySelector('.logout-btn');

    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'profile.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                // You can clear session/local storage here if needed
                window.location.href = 'login.html';
            }
        });
    }
});
