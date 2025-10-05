document.addEventListener('DOMContentLoaded', function() {
    const venueTableBody = document.getElementById('venue-table-body');
    const venueSearchInput = document.getElementById('venue-search-input');
    const backButton = document.getElementById('back-button');
    const statusMessageContainer = document.getElementById('status-message-container');
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    let allVenues = []; // Store all venues for filtering

    // Display status message if a status parameter is present in the URL
    function showStatusMessage(message, type = 'success') {
        if (statusMessageContainer) {
            const messageClass = type === 'error' ? 'error-message' : 'status-message';
            statusMessageContainer.innerHTML = `<div class="${messageClass}">${message}</div>`;
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

    // Function to fetch venues from API
    async function fetchVenues() {
        try {
            const response = await fetch('/api/venues');
            if (!response.ok) {
                throw new Error('Failed to fetch venues');
            }
            const venues = await response.json();
            allVenues = venues;
            renderVenues(venues);
        } catch (error) {
            console.error('Error fetching venues:', error);
            showStatusMessage('Error loading venues. Please try again.', 'error');
        }
    }

    // Function to render the venue table
    function renderVenues(venues) {
        if (!venueTableBody) return;
        venueTableBody.innerHTML = '';
        
        if (venues.length === 0) {
            venueTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No venues found</td></tr>';
            return;
        }

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

    // Initial load of venues
    fetchVenues();

    // Filter venues based on search input
    if (venueSearchInput) {
        venueSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const filteredVenues = allVenues.filter(venue =>
                venue.name.toLowerCase().includes(query) ||
                venue.block.toLowerCase().includes(query) ||
                venue.campus.toLowerCase().includes(query)
            );
            renderVenues(filteredVenues);
        });
    }

    // Function to delete venue via API
    async function deleteVenue(venueId) {
        try {
            const response = await fetch(`/api/venues/${venueId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete venue');
            }
            
            showStatusMessage('Venue deleted successfully!');
            // Refresh the venue list
            fetchVenues();
        } catch (error) {
            console.error('Error deleting venue:', error);
            showStatusMessage(`Error deleting venue: ${error.message}`, 'error');
        }
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
                // Find the venue name for confirmation
                const venue = allVenues.find(v => v.id == id);
                const venueName = venue ? venue.name : `ID: ${id}`;
                
                if (confirm(`Are you sure you want to delete venue "${venueName}"?`)) {
                    deleteVenue(id);
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

    // Add venue form functionality (for venue_add.html)
    const addVenueForm = document.getElementById('add-venue-form');
    if (addVenueForm) {
        addVenueForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(addVenueForm);
            const venueData = {
                name: formData.get('venue-name'),
                block: formData.get('block'),
                campus: formData.get('campus')
            };

            // Validate required fields
            if (!venueData.name || !venueData.block || !venueData.campus) {
                alert('Please fill in all required fields.');
                return;
            }

            try {
                const response = await fetch('/api/venues', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(venueData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to add venue');
                }

                // Success - redirect to venue list with success message
                window.location.href = 'venue.html?status=saved';
            } catch (error) {
                console.error('Error adding venue:', error);
                alert(`Error adding venue: ${error.message}`);
            }
        });
    }

    // Edit venue form functionality (for venue_edit.html)
    const editVenueForm = document.getElementById('edit-venue-form');
    if (editVenueForm) {
        // Load venue data when page loads
        const urlParams = new URLSearchParams(window.location.search);
        const venueId = urlParams.get('id');
        
        if (venueId) {
            loadVenueForEdit(venueId);
        }

        editVenueForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(editVenueForm);
            const venueData = {
                name: formData.get('venue-name'),
                block: formData.get('block'),
                campus: formData.get('campus')
            };

            // Validate required fields
            if (!venueData.name || !venueData.block || !venueData.campus) {
                alert('Please fill in all required fields.');
                return;
            }

            try {
                const response = await fetch(`/api/venues/${venueId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(venueData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update venue');
                }

                // Success - redirect to venue list with success message
                window.location.href = 'venue.html?status=edited';
            } catch (error) {
                console.error('Error updating venue:', error);
                alert(`Error updating venue: ${error.message}`);
            }
        });
    }

    // Function to load venue data for editing
    async function loadVenueForEdit(venueId) {
        try {
            const response = await fetch(`/api/venues/${venueId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch venue data');
            }
            
            const venue = await response.json();
            
            // Populate form fields
            document.getElementById('venue-id').value = venue.id;
            document.getElementById('venue-name').value = venue.name;
            document.getElementById('block').value = venue.block;
            document.getElementById('campus').value = venue.campus;
        } catch (error) {
            console.error('Error loading venue:', error);
            alert(`Error loading venue: ${error.message}`);
            // Redirect back to venue list if venue not found
            window.location.href = 'venue.html';
        }
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
                window.location.href = '/';
            }
        });
    }
});
