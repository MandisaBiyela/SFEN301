
async function fetchModules() {
    try {
        const response = await fetch('/api/modules');
        if (!response.ok) throw new Error('Failed to fetch modules');
        return await response.json();
    } catch (error) {
        console.error('Error fetching modules:', error);
        return [];
    }
}

async function fetchModuleById(moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}`);
        if (!response.ok) throw new Error('Failed to fetch module');
        return await response.json();
    } catch (error) {
        console.error(`Error fetching module ${moduleId}:`, error);
        return null;
    }
}

async function fetchLecturers() {
    try {
        const response = await fetch('/api/lecturers');
        if (!response.ok) throw new Error('Failed to fetch lecturers');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lecturers:', error);
        showStatusMessage('Could not load lecturers.', 'error');
        return [];
    }
}

async function fetchLecturerById(lecturerId) {
    try {
        const response = await fetch(`/api/lecturers/${lecturerId}`);
        if (!response.ok) throw new Error('Failed to fetch lecturer');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lecturer:', error);
        showStatusMessage('Could not load lecturer.', 'error');
        return null;
    }
}

async function deleteModule(moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete module');
        return true;
    } catch (error) {
        console.error('Error deleting module:', error);
        showStatusMessage('Error deleting module.', 'error');
        return false;
    }
}

// Helper function to show a status message/notification
function showStatusMessage(message, type = 'success') {
    const messageContainer = document.getElementById('status-message-container');
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.className = `status-message-container ${type}`; // Add type for styling
        messageContainer.style.display = 'block';
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }
}


document.addEventListener('DOMContentLoaded', async function() {

    // --- Common Page Logic (Buttons) ---
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
    document.querySelector('.logout-btn')?.addEventListener('click', () => {
        if (confirm("Are you sure you want to log out?")) window.location.href = '/';
    });
    document.querySelector('.profile-btn')?.addEventListener('click', () => {
        window.location.href = 'profile.html';
    });


    // --- Module Management Page Logic ---
    if (document.getElementById('module-list')) {
        const moduleListBody = document.getElementById('module-list');
        const moduleSearchInput = document.getElementById('module-search-input');
        let allModules = []; // Cache for searching

        async function renderModuleTable() {
            allModules = await fetchModules();
            const query = moduleSearchInput.value.toLowerCase();
            const filteredModules = allModules.filter(module =>
                module.code.toLowerCase().includes(query) ||
                module.name.toLowerCase().includes(query) ||
                module.lecturer.toLowerCase().includes(query)
            );

            moduleListBody.innerHTML = '';
            if (filteredModules.length === 0) {
                moduleListBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No modules found.</td></tr>';
                return;
            }

            filteredModules.forEach(async module => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${module.code}</td>
                    <td>${module.name}</td>
                    <td>${(await fetchLecturerById(module.lecturer))?.email}</td>
                    <td>
                        <a href="module_edit.html?id=${module.code}" class="image-btn edit-btn" title="Edit">
                            <img src="/static/images/Edit.png" alt="Edit" class="action-icon">
                        </a>
                        <button class="image-btn delete-btn" data-id="${module.code}" title="Delete">
                            <img src="/static/images/Delete.png" alt="Delete" class="action-icon">
                        </button>
                    </td>
                `;
                moduleListBody.appendChild(row);
            });
        }

        // Event delegation for delete buttons
        moduleListBody.addEventListener('click', async (event) => {
            const deleteButton = event.target.closest('.delete-btn');
            if (deleteButton) {
                const moduleId = deleteButton.dataset.id;
                if (confirm(`Are you sure you want to delete this module?`)) {
                    const success = await deleteModule(moduleId);
                    if (success) {
                        showStatusMessage('Module has been successfully deleted.');
                        renderModuleTable(); // Re-render the table
                    }
                }
            }
        });

        moduleSearchInput.addEventListener('input', renderModuleTable);

        // Initial table load and status messages
        renderModuleTable();
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        if (status === 'added') showStatusMessage('Module has been successfully added.');
        if (status === 'edited') showStatusMessage('Module details have been successfully updated.');
    }


    // --- Add Module Page Logic ---
    if (document.getElementById('add-module-form')) {
        const addModuleForm = document.getElementById('add-module-form');
        const lecturerSelect = document.getElementById('lecturer');

        // Populate lecturer dropdown
        const lecturers = await fetchLecturers();
        lecturers.sort((a, b) => a.name.localeCompare(b.name));
        lecturers.forEach(async lecturer => {
            const option = new Option(`${(await fetchLecturerById(lecturer.lecturer_number))?.email}`, lecturer.lecturer_number);
            lecturerSelect.add(option);
        });

        addModuleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const moduleData = {
                code: document.getElementById('module-code').value.trim(),
                name: document.getElementById('module-name').value.trim(),
                lecturer_number: lecturerSelect.value
            };

            const response = await fetch('/api/modules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(moduleData)
            });

            if (response.ok) {
                window.location.href = 'module.html?status=added';
            } else {
                const result = await response.json();
                showStatusMessage(result.error || 'Error adding module.', 'error');
            }
        });
    }


    // --- Edit Module Page Logic ---
    if (document.getElementById('edit-module-form')) {
        const editModuleForm = document.getElementById('edit-module-form');
        const params = new URLSearchParams(window.location.search);
        const moduleId = params.get('id');

        if (!moduleId) {
            showStatusMessage('No module ID provided for editing.', 'error');
            return;
        }

        // Fetch both module and lecturer data in parallel
        const [moduleToEdit, lecturers] = await Promise.all([
            fetchModuleById(moduleId),
            fetchLecturers()
        ]);

        if (moduleToEdit) {
            // Populate form fields
            document.getElementById('module-code').value = moduleToEdit.code;
            document.getElementById('module-name').value = moduleToEdit.name;

            // Populate lecturer dropdown
            const lecturerSelect = document.getElementById('lecturer');
            lecturers.sort((a, b) => a.name.localeCompare(b.name));
            lecturers.forEach(async lecturer => {
                const option = new Option(`${(await fetchLecturerById(lecturer.lecturer_number))?.email}`, lecturer.lecturer_number);
                lecturerSelect.add(option);
            });
            // Set the correct lecturer as selected
            lecturerSelect.value = moduleToEdit.lecturer_number;

            // Handle form submission
            editModuleForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const updatedData = {
                    code: document.getElementById('module-code').value.trim(),
                    name: document.getElementById('module-name').value.trim(),
                    lecturer_number: lecturerSelect.value
                };

                const response = await fetch(`/api/modules/${moduleId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    window.location.href = 'module.html?status=edited';
                } else {
                    const result = await response.json();
                    showStatusMessage(result.error || 'Error updating module.', 'error');
                }
            });
        } else {
            showStatusMessage('Could not find module to edit.', 'error');
        }
    }
});