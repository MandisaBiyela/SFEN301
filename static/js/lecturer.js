function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

async function fetchLecturers() {
    try {
        const response = await fetch('/api/lecturers');
        if (!response.ok) throw new Error('Failed to fetch lecturers');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lecturers:', error);
        return [];
    }
}

function createLecturerRow(lecturer) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${lecturer.lecturer_number}</td>
        <td>${lecturer.name}</td>
        <td>${lecturer.surname}</td>
        <td>${lecturer.email}</td>
        <td>${(lecturer.modules || []).join(', ') || 'No modules assigned'}</td>
        <td class="action-buttons">
            <a href="lecturer_edit.html?id=${lecturer.lecturer_number}" class="edit-btn image-btn">
                <img src="static/images/Edit.png" alt="Edit" class="action-icon" />
            </a>
            <button class="delete-btn image-btn" data-id="${lecturer.lecturer_number}">
                <img src="static/images/Delete.png" alt="Delete" class="action-icon" />
            </button>
        </td>
    `;
    return row;
}

async function updateLecturerTable() {
    const tableBody = document.getElementById('lecturer-table-body');
    if (!tableBody) return;

    const lecturers = await fetchLecturers();
    tableBody.innerHTML = ''; // Clear existing rows

    lecturers.forEach(lecturer => {
        tableBody.appendChild(createLecturerRow(lecturer));
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    // Initial load of the lecturer table
    var lecturers = await fetchLecturers();
    console.log(lecturers);
    // Handle form submission
    const addLecturerForm = document.getElementById('add-lecturer-form');
    if (addLecturerForm) {
        addLecturerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);

            try {
                const response = await fetch('/lecturer_add.html', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showNotification(result.message, 'success');
                    // Update the lecturer table immediately
                    await updateLecturerTable();
                    // Clear the form
                    this.reset();
                } else {
                    showNotification(result.error || 'Error adding lecturer', 'error');
                }
            } catch (error) {
                showNotification('Error adding lecturer. Please try again.', 'error');
                console.error('Error:', error);
            }
        });
    }

    // Search functionality
    const searchInput = document.getElementById('lecturer-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchText = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#lecturer-table-body tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchText) ? '' : 'none';
            });
        });
    }

    // Initial table load
    updateLecturerTable();

    // PROFILE BUTTON
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'profile.html';  // Change as needed
        });
    }

    // LOGOUT BUTTON
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const confirmed = confirm('Are you sure you want to logout?');
            if (confirmed) {
                window.location.href = 'login.html';  // Change as needed
            }
        });
    }

    // BACK BUTTON
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    }

    // Status message functionality (all pages that have the container)
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const statusMessageContainer = document.getElementById('status-message-container');
    if (status === 'saved' && statusMessageContainer) {
        statusMessageContainer.style.display = 'block';
        setTimeout(() => {
            statusMessageContainer.style.display = 'none';
        }, 5000);
    }

    // If on lecturer management page
    if (document.getElementById('lecturer-table-body')) {
        const lecturerTableBody = document.getElementById('lecturer-table-body');
        const lecturerSearchInput = document.getElementById('lecturer-search-input');
        
        // Render lecturers in table
        function renderLecturersTable(lecturerArray) {
            lecturerTableBody.innerHTML = '';
            lecturerArray.forEach(lecturer => {
                const modulesList = lecturer.modules.map(module => `<li>${module}</li>`).join('');
                const row = document.createElement('tr');
                row.dataset.number = lecturer.lecturer_number; // store lecturer number

                row.innerHTML = `
                    <td>${lecturer.lecturer_number}</td>
                    <td>${lecturer.name}</td>
                    <td>${lecturer.surname}</td>
                    <td>${lecturer.email}</td>
                    <td class="lecturer-modules">
                        <ul class="modules-list">${modulesList}</ul>
                    </td>
                    <td>
                        <a href="lecturer_edit.html?id=${lecturer.lecturer_number}" class="image-btn edit-btn" title="Edit">
                            <img src="static/images/Edit.png" alt="Edit" class="action-icon">
                        </a>
                        <button class="image-btn delete-btn" title="Delete">
                            <img src="static/images/Delete.png" alt="Delete" class="action-icon">
                        </button>
                    </td>
                `;
                lecturerTableBody.appendChild(row);
            });
        }
        
        // Event delegation for delete buttons
        lecturerTableBody.addEventListener('click', function(event) {
            if (event.target.closest('.delete-btn')) {
                const row = event.target.closest('tr');
                const lecturerNumber = row.dataset.number;
                if (confirm(`Are you sure you want to delete lecturer ${lecturerNumber}?`)) {
                    // Remove lecturer from array
                    lecturers = lecturers.filter(lecturer => lecturer.lecturer_number !== lecturerNumber);
                    // TO-DO: send a request to the server to delete the lecturer
                    // await deleteLecturer(lecturerNumber);
                    // Re-render the table
                    renderLecturersTable(lecturers);
                }
            }
        });

        // Search functionality
        if (lecturerSearchInput) {
            lecturerSearchInput.addEventListener('input', function(e) {
                const query = e.target.value.toLowerCase();
                const filteredLecturers = lecturers.filter(lecturer => {
                    const lecturerModulesString = lecturer.modules.join(' ').toLowerCase();
                    return (
                        lecturer.lecturer_number.toLowerCase().includes(query) ||
                        lecturer.name.toLowerCase().includes(query) ||
                        lecturer.surname.toLowerCase().includes(query) ||
                        lecturer.email.toLowerCase().includes(query) ||
                        lecturerModulesString.includes(query)
                    );
                });
                renderLecturersTable(filteredLecturers);
            });
        }

        renderLecturersTable(lecturers);
    } 

    // If on edit lecturer page
    else if (document.getElementById('edit-lecturer-form')) {

        const form = document.getElementById('edit-lecturer-form');
        const urlParams = new URLSearchParams(window.location.search);
        const lecturerId = urlParams.get('id');
        console.log(lecturerId)

        // Populate form with lecturer data
        function populateForm(id) {
            const lecturer = lecturers.find(l => l.lecturer_number == id);

            if (lecturer) {
                console.log(lecturer);
                document.getElementById('lecturer-number').value = lecturer.lecturer_number;
                document.getElementById('lecturer-name').value = lecturer.name;
                document.getElementById('lecturer-surname').value = lecturer.surname;
                document.getElementById('lecturer-email').value = lecturer.email;
            }
        }

        if (lecturerId) {
            populateForm(lecturerId);
        }

        // form.addEventListener('submit', function(e) {
        //     e.preventDefault();
        //     // Here you could update your lecturers array or send to backend
        //     // For now just simulate save and redirect
        //     window.location.href = 'lecturer.html?status=saved';
        // });
    }

    // // If on add lecturer page
    // const addLecturerForm = document.getElementById('add-lecturer-form');
    // if (addLecturerForm) {
    //     addLecturerForm.addEventListener('submit', function(e) {
    //         e.preventDefault();
    //         // Here you could add to your lecturers array or send to backend
    //         // For now just simulate save and redirect
    //         window.location.href = 'lecturer.html?status=saved';
    //     });
    // }
});