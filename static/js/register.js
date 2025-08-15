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
                // Clear session/local storage if needed
                window.location.href = 'login.html';
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

    // ===== Module Registers Page Logic =====
    if (document.getElementById('module-table-body')) {
        // Show status message if ?status=saved in URL
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const statusMessageContainer = document.getElementById('status-message-container');
        if (status === 'saved' && statusMessageContainer) {
            statusMessageContainer.style.display = 'block';
            setTimeout(() => {
                statusMessageContainer.style.display = 'none';
            }, 5000);
        }

        const allModules = [
            { code: 'prg301', name: 'Advanced Programming' },
            { code: 'databs', name: 'Database Systems' },
            { code: 'sftwre', name: 'Software Engineering' },
            { code: 'netwk', name: 'Computer Networks' }
        ];

        const moduleTableBody = document.getElementById('module-table-body');
        const moduleSearchInput = document.getElementById('module-search-input');

        function renderModuleTable(modules) {
            moduleTableBody.innerHTML = '';
            modules.forEach(module => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${module.code.toUpperCase()}</td>
                    <td>${module.name}</td>
                `;
                row.addEventListener('click', () => {
                    // Navigate to register_student.html with module code as param
                    window.location.href = `register_student.html?module=${module.code}`;
                });
                moduleTableBody.appendChild(row);
            });
        }

        function searchModules() {
            const query = moduleSearchInput.value.toLowerCase();
            const filteredModules = allModules.filter(module =>
                module.code.toLowerCase().includes(query) || module.name.toLowerCase().includes(query)
            );
            renderModuleTable(filteredModules);
        }

        moduleSearchInput.addEventListener('input', searchModules);
        renderModuleTable(allModules);
    }

    // ===== Student Register Page Logic =====
    if (document.getElementById('student-register-body')) {
        const allStudents = [
            { number: '2211445', name: 'Alice', surname: 'Johnson', modules: ['prg301', 'sftwre'] },
            { number: '2211556', name: 'Bob', surname: 'Williams', modules: ['prg301'] },
            { number: '2211667', name: 'Charlie', surname: 'Brown', modules: ['sftwre', 'databs'] },
            { number: '2211778', name: 'David', surname: 'Jones', modules: ['prg301', 'netwk'] },
            { number: '2211889', name: 'Eve', surname: 'Miller', modules: ['databs'] },
            { number: '2211990', name: 'Frank', surname: 'Davis', modules: ['netwk'] },
        ];

        const allModules = [
            { code: 'prg301', name: 'Advanced Programming' },
            { code: 'databs', name: 'Database Systems' },
            { code: 'sftwre', name: 'Software Engineering' },
            { code: 'netwk', name: 'Computer Networks' }
        ];

        // Get module code from URL param
        const urlParams = new URLSearchParams(window.location.search);
        let moduleToDisplay = urlParams.get('module');

        // Fallback default module if none specified
        if (!moduleToDisplay) {
            moduleToDisplay = 'prg301';
        }

        const registerModuleTitle = document.getElementById('register-module-title');
        const moduleCodeDisplay = document.getElementById('module-code-display');
        const studentRegisterBody = document.getElementById('student-register-body');
        const studentSearchInput = document.getElementById('student-search-input');
        const printButton = document.getElementById('print-register-btn');

        let studentsToDisplay = [];

        if (moduleToDisplay) {
            const selectedModule = allModules.find(mod => mod.code === moduleToDisplay);

            if (selectedModule) {
                registerModuleTitle.textContent = `Register for: ${selectedModule.name}`;
                moduleCodeDisplay.textContent = selectedModule.code.toUpperCase();
                studentsToDisplay = allStudents.filter(student => student.modules.includes(moduleToDisplay));
            } else {
                registerModuleTitle.textContent = `Student Register`;
                moduleCodeDisplay.textContent = 'Module Not Found.';
            }
        } else {
            registerModuleTitle.textContent = `Student Register`;
            moduleCodeDisplay.textContent = 'Please select a module to view its register.';
        }

        function renderStudentTable(students) {
            studentRegisterBody.innerHTML = '';
            if (students.length > 0) {
                students.forEach(student => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${student.number}</td>
                        <td>${student.name}</td>
                        <td>${student.surname}</td>
                    `;
                    studentRegisterBody.appendChild(row);
                });
            } else {
                studentRegisterBody.innerHTML = `<tr><td colspan="3">No students found for this module.</td></tr>`;
            }
        }

        renderStudentTable(studentsToDisplay);

        if (studentSearchInput) {
            studentSearchInput.addEventListener('input', function() {
                const query = this.value.toLowerCase();
                const filteredStudents = studentsToDisplay.filter(student =>
                    student.number.includes(query) ||
                    student.name.toLowerCase().includes(query) ||
                    student.surname.toLowerCase().includes(query)
                );
                renderStudentTable(filteredStudents);
            });
        }

        if (printButton) {
            printButton.addEventListener('click', () => {
                window.print();
            });
        }
    }
});
