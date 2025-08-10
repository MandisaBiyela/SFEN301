document.addEventListener('DOMContentLoaded', function() {
    // Dummy Data - In a real application, this would come from a server API or localStorage
    let dummyLecturers = JSON.parse(localStorage.getItem('dummyLecturers')) || [
        { id: 1, name: 'Dr. John Doe', email: 'john.doe.lecturer@example.com' },
        { id: 2, name: 'Prof. Jane Smith', email: 'jane.smith.lecturer@example.com' },
        { id: 3, name: 'Mr. Sipho Ndlovu', email: 'sipho.ndlovu.lecturer@example.com' },
    ];

    let dummyModules = JSON.parse(localStorage.getItem('dummyModules')) || [
        { id: 1, code: 'SFEN301', name: 'Software Engineering III', lecturer: 'Dr. John Doe' },
        { id: 2, code: 'WEBSYS', name: 'Web Systems', lecturer: 'Prof. Jane Smith' },
        { id: 3, code: 'DATASTR', name: 'Data Structures & Algorithms', lecturer: 'Mr. Sipho Ndlovu' },
        { id: 4, code: 'INFOSYS', name: 'Information Systems', lecturer: 'Dr. John Doe' },
    ];

    // Update localStorage "database"
    function updateLocalStorage() {
        localStorage.setItem('dummyModules', JSON.stringify(dummyModules));
        localStorage.setItem('dummyLecturers', JSON.stringify(dummyLecturers));
    }

    // Back button functionality
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            const currentPage = window.location.pathname;
            if (currentPage.includes('module_add.html') || currentPage.includes('module_edit.html')) {
                window.location.href = 'module.html';
            } else {
                window.location.href = 'admin_dashboard.html';
            }
        });
    }

    // Logout button functionality
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            const confirmLogout = confirm("Are you sure you want to log out?");
            if (confirmLogout) {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // Profile button functionality
    const profileBtn = document.querySelector('.profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function () {
            window.location.href = 'profile.html';
        });
    }

    // Helper function to show a status message
    function showStatusMessage(message) {
        const messageContainer = document.getElementById('status-message-container');
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.style.display = 'block';
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 5000);
        }
    }

    // --- Module Management Page Logic ---
    const moduleList = document.getElementById('module-list');
    if (moduleList) {
        const moduleSearchInput = document.getElementById('module-search-input');

        function renderModuleTable(modulesToRender) {
            moduleList.innerHTML = '';
            if (modulesToRender.length === 0) {
                moduleList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No modules found.</td></tr>';
                return;
            }

            modulesToRender.forEach(module => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${module.code}</td>
                    <td>${module.name}</td>
                    <td>${module.lecturer}</td>
                    <td>
                        <a href="module_edit.html?id=${module.id}" class="image-btn edit-btn">
                            <img src="/static/images/Edit.png" alt="Edit" class="action-icon">
                        </a>
                        <button class="image-btn delete-btn" data-id="${module.id}">
                            <img src="/static/images/Delete.png" alt="Delete" class="action-icon">
                        </button>
                    </td>
                `;
                moduleList.appendChild(row);
            });
            // Attach event listeners to the new delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const moduleId = this.dataset.id;
                    if (confirm(`Are you sure you want to delete module with ID ${moduleId}?`)) {
                        dummyModules = dummyModules.filter(module => module.id != moduleId);
                        updateLocalStorage();
                        window.location.href = 'module.html?status=deleted';
                    }
                });
            });
        }

        function filterModules() {
            const query = moduleSearchInput.value.toLowerCase();
            const filteredModules = dummyModules.filter(module =>
                module.code.toLowerCase().includes(query) ||
                module.name.toLowerCase().includes(query) ||
                module.lecturer.toLowerCase().includes(query)
            );
            renderModuleTable(filteredModules);
        }

        moduleSearchInput.addEventListener('input', filterModules);
        renderModuleTable(dummyModules);

        // Show status messages based on URL params
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        if (status) {
            let message = '';
            if (status === 'added') message = 'Module has been successfully added.';
            else if (status === 'edited') message = 'Module details have been successfully updated.';
            else if (status === 'deleted') message = 'Module has been successfully deleted.';
            if (message) showStatusMessage(message);
        }
    }

    // --- Add Module Page Logic ---
    const addModuleForm = document.getElementById('add-module-form');
    if (addModuleForm) {
        const moduleCodeInput = document.getElementById('module-code');
        const moduleNameInput = document.getElementById('module-name');
        const lecturerSelect = document.getElementById('lecturer');

        // Sort lecturers alphabetically and populate dropdown
        dummyLecturers.sort((a, b) => a.name.localeCompare(b.name));
        dummyLecturers.forEach(lecturer => {
            const option = document.createElement('option');
            option.value = lecturer.name;
            option.textContent = lecturer.name;
            lecturerSelect.appendChild(option);
        });

        addModuleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newModule = {
                id: dummyModules.length > 0 ? Math.max(...dummyModules.map(m => m.id)) + 1 : 1,
                code: moduleCodeInput.value.trim(),
                name: moduleNameInput.value.trim(),
                lecturer: lecturerSelect.value
            };
            dummyModules.push(newModule);
            updateLocalStorage();
            console.log('Added new module:', newModule);
            // Redirects to module.html with a success message
            window.location.href = 'module.html?status=added';
        });
    }

    // --- Edit Module Page Logic ---
    const editModuleForm = document.getElementById('edit-module-form');
    if (editModuleForm) {
        const params = new URLSearchParams(window.location.search);
        const moduleId = params.get('id');
        const moduleToEdit = dummyModules.find(m => m.id == moduleId);

        if (moduleToEdit) {
            document.getElementById('module-code').value = moduleToEdit.code;
            document.getElementById('module-name').value = moduleToEdit.name;

            const lecturerSelect = document.getElementById('lecturer');
            // Clear existing options and repopulate dropdown
            lecturerSelect.innerHTML = '';
            dummyLecturers.sort((a, b) => a.name.localeCompare(b.name));
            dummyLecturers.forEach(lecturer => {
                const option = document.createElement('option');
                option.value = lecturer.name;
                option.textContent = lecturer.name;
                lecturerSelect.appendChild(option);
            });
            // Set the value after populating the options
            lecturerSelect.value = moduleToEdit.lecturer;

            editModuleForm.addEventListener('submit', function(e) {
                e.preventDefault();
                moduleToEdit.code = document.getElementById('module-code').value.trim();
                moduleToEdit.name = document.getElementById('module-name').value.trim();
                moduleToEdit.lecturer = document.getElementById('lecturer').value;
                updateLocalStorage();
                window.location.href = 'module.html?status=edited';
            });
        } else {
            console.error('Module not found for editing.');
        }
    }
});