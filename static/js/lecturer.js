document.addEventListener('DOMContentLoaded', function() {
    // Changed to let to allow modification (delete)
    let lecturers = [
        {
            number: '001',
            name: 'Jane',
            surname: 'Doe',
            email: 'jane.doe@dut.ac.za',
            modules: ['Software Engineering III', 'Web Systems']
        },
        {
            number: '002',
            name: 'John',
            surname: 'Smith',
            email: 'john.smith@dut.ac.za',
            modules: ['Data Structures & Algorithms']
        },
        {
            number: '003',
            name: 'Sipho',
            surname: 'Dube',
            email: 'sipho.dube@dut.ac.za',
            modules: ['Database Systems', 'Operating Systems']
        },
        {
            number: '004',
            name: 'Thandiwe',
            surname: 'Ncube',
            email: 'thandiwe.ncube@dut.ac.za',
            modules: ['Calculus I']
        }
    ];

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
                row.dataset.number = lecturer.number; // store lecturer number

                row.innerHTML = `
                    <td>${lecturer.number}</td>
                    <td>${lecturer.name}</td>
                    <td>${lecturer.surname}</td>
                    <td>${lecturer.email}</td>
                    <td class="lecturer-modules">
                        <ul class="modules-list">${modulesList}</ul>
                    </td>
                    <td>
                        <a href="lecturer_edit.html?id=${lecturer.number}" class="image-btn edit-btn" title="Edit">
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
                    lecturers = lecturers.filter(lecturer => lecturer.number !== lecturerNumber);
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
                        lecturer.number.toLowerCase().includes(query) ||
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

        // Populate form with lecturer data
        function populateForm(id) {
            const lecturer = lecturers.find(l => l.number === id);
            if (lecturer) {
                document.getElementById('lecturer-number').value = lecturer.number;
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