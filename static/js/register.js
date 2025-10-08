document.addEventListener('DOMContentLoaded', function() {
    // ===== Common: Profile and Logout Buttons =====
    const profileBtn = document.querySelector('.profile-btn');
    const logoutBtn = document.querySelector('.logout-btn');

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm('Are you sure you want to log out?')) {
                window.location.href = '/';
            }
        });
    }

    // ===== Common: Back Button =====
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.history.back();
        });
    }

    // ===== API Functions =====
    async function fetchModulesForRegister() {
        try {
            const response = await fetch('/api/modules');
            if (!response.ok) throw new Error('Failed to fetch modules');
            return await response.json();
        } catch (error) {
            console.error('Error fetching modules:', error);
            showStatusMessage('Could not load modules.', 'error');
            return [];
        }
    }

    async function fetchStudentsByModule(moduleCode) {
        try {
            const response = await fetch(`/api/modules/${moduleCode}/students`);
            if (!response.ok) throw new Error('Failed to fetch students');
            return await response.json();
        } catch (error) {
            console.error('Error fetching students for module:', error);
            showStatusMessage('Could not load students for this module.', 'error');
            return [];
        }
    }

    // Helper function to show status messages
    function showStatusMessage(message, type = 'success') {
        const statusMessageContainer = document.getElementById('status-message-container');
        if (statusMessageContainer) {
            const messageElement = statusMessageContainer.querySelector('#status-message') || 
                                 statusMessageContainer.querySelector('p') || 
                                 statusMessageContainer;
            messageElement.textContent = message;
            statusMessageContainer.className = `status-message-container ${type}`;
            statusMessageContainer.style.display = 'block';
            setTimeout(() => {
                statusMessageContainer.style.display = 'none';
            }, 5000);
        }
    }

    // ===== Module Registers Page Logic (register.html) =====
    if (document.getElementById('module-table-body')) {
        const moduleTableBody = document.getElementById('module-table-body');
        const moduleSearchInput = document.getElementById('module-search-input');
        let allModules = [];

        // Show status message if ?status=saved in URL
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        if (status === 'saved') {
            showStatusMessage('Register data saved successfully.');
        }

        async function loadAndRenderModules() {
            try {
                allModules = await fetchModulesForRegister();
                renderModuleTable(allModules);
            } catch (error) {
                console.error('Error loading modules:', error);
                showStatusMessage('Failed to load modules.', 'error');
                moduleTableBody.innerHTML = `<tr><td colspan="2">Error loading modules.</td></tr>`;
            }
        }

        function renderModuleTable(modules) {
            moduleTableBody.innerHTML = '';
            if (modules.length === 0) {
                moduleTableBody.innerHTML = `<tr><td colspan="2" style="text-align: center;">No modules found.</td></tr>`;
                return;
            }
            
            modules.forEach(module => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${module.code ? module.code.toUpperCase() : 'N/A'}</td>
                    <td>${module.name || 'Unknown Module'}</td>
                `;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    if (module.code) {
                        window.location.href = `register_student.html?module=${encodeURIComponent(module.code)}`;
                    }
                });
                moduleTableBody.appendChild(row);
            });
        }

        function searchModules() {
            if (!moduleSearchInput.value) {
                renderModuleTable(allModules);
                return;
            }

            const query = moduleSearchInput.value.toLowerCase().trim();
            const filteredModules = allModules.filter(module =>
                (module.code && module.code.toLowerCase().includes(query)) ||
                (module.name && module.name.toLowerCase().includes(query))
            );
            renderModuleTable(filteredModules);
        }

        // Event listeners
        if (moduleSearchInput) {
            moduleSearchInput.addEventListener('input', searchModules);
        }

        // Initial load
        loadAndRenderModules();
    }

    // ===== Student Register Page Logic (register_student.html) =====
    if (document.getElementById('student-register-body')) {
        const registerModuleTitle = document.getElementById('register-module-title');
        const moduleCodeDisplay = document.getElementById('module-code-display');
        const studentRegisterBody = document.getElementById('student-register-body');
        const studentSearchInput = document.getElementById('student-search-input');
        const printButton = document.getElementById('print-register-btn');

        // Get module code from URL param
        const urlParams = new URLSearchParams(window.location.search);
        const moduleToDisplay = urlParams.get('module');
        let studentsToDisplay = [];
        let selectedModule = null;

        async function loadStudentRegister() {
            if (!moduleToDisplay) {
                registerModuleTitle.textContent = 'Student Register';
                moduleCodeDisplay.textContent = 'No module selected.';
                studentRegisterBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No module selected.</td></tr>`;
                return;
            }

            try {
                // Load module info and students in parallel
                const [modules, students] = await Promise.all([
                    fetchModulesForRegister(),
                    fetchStudentsByModule(moduleToDisplay)
                ]);

                selectedModule = modules.find(mod => mod.code === moduleToDisplay);
                studentsToDisplay = students;

                if (selectedModule) {
                    registerModuleTitle.textContent = `Register for: ${selectedModule.name}`;
                    moduleCodeDisplay.textContent = selectedModule.code.toUpperCase();
                } else {
                    registerModuleTitle.textContent = 'Student Register';
                    moduleCodeDisplay.textContent = `Module: ${moduleToDisplay.toUpperCase()}`;
                    showStatusMessage('Module details not found, but showing students.', 'warning');
                }

                renderStudentTable(studentsToDisplay);

            } catch (error) {
                console.error('Error loading student register:', error);
                registerModuleTitle.textContent = 'Student Register';
                moduleCodeDisplay.textContent = 'Error loading module';
                showStatusMessage('Failed to load student register.', 'error');
                studentRegisterBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">Error loading students.</td></tr>`;
            }
        }

        function renderStudentTable(students) {
            studentRegisterBody.innerHTML = '';
            
            if (!students || students.length === 0) {
                studentRegisterBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No students registered for this module.</td></tr>`;
                return;
            }

            students.forEach((student, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.student_number || 'N/A'}</td>
                    <td>${student.student_name || 'N/A'}</td>
                    <td>${student.student_surname || 'N/A'}</td>
                `;
                
                
                studentRegisterBody.appendChild(row);
            });
        }

        function searchStudents() {
            if (!studentSearchInput.value.trim()) {
                renderStudentTable(studentsToDisplay);
                return;
            }

            const query = studentSearchInput.value.toLowerCase().trim();
            const filteredStudents = studentsToDisplay.filter(student =>
                (student.student_number && student.student_number.toLowerCase().includes(query)) ||
                (student.student_name && student.student_name.toLowerCase().includes(query)) ||
                (student.student_surname && student.student_surname.toLowerCase().includes(query))
            );
            renderStudentTable(filteredStudents);
        }

        // Event listeners
        if (studentSearchInput) {
            studentSearchInput.addEventListener('input', searchStudents);
        }

        if (printButton) {
            printButton.addEventListener('click', () => {
                // Hide non-printable elements before printing
                const nonPrintables = document.querySelectorAll('.back-button-container, .print-button-container, header, footer, .student-register-controls');
                nonPrintables.forEach(el => el.style.display = 'none');
                
                window.print();
                
                // Restore elements after printing
                setTimeout(() => {
                    nonPrintables.forEach(el => el.style.display = '');
                }, 100);
            });
        }

        // Initial load
        loadStudentRegister();
    }
});