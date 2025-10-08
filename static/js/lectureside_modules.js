document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const moduleTableBody = document.getElementById('module-table-body');
    const studentTableBody = document.getElementById('student-table-body');
    const moduleListSection = document.getElementById('module-list-section');
    const studentRegisterSection = document.getElementById('student-register-section');
    const dataSearchInput = document.getElementById('data-search-input');
    const currentModuleTitle = document.getElementById('current-module-title');
    const backToModulesBtn = document.getElementById('back-to-modules-btn');
    const printButton = document.getElementById('print-register-btn');
    const backButton = document.getElementById('back-button');
    const logoutBtn = document.querySelector('.logout-btn');

    // State
    let currentView = 'modules';
    let allModules = [];
    let currentModuleCode = null;
    let studentsInModule = [];

    // --- API Data Fetching ---

    /**
     * Fetches modules assigned to the logged-in lecturer from the backend.
     */
    async function fetchLecturerModules() {
        try {
            const response = await fetch('/api/lecturer/modules');
            if (!response.ok) {
                throw new Error('Failed to fetch modules.');
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            showStatusMessage('Error: Could not load modules.', 'error');
            return [];
        }
    }

    /**
     * Fetches students enrolled in a specific module.
     * @param {string} moduleCode
     */
    async function fetchStudentsByModule(moduleCode) {
        try {
            const response = await fetch(`/api/modules/${moduleCode}/students`);
            if (!response.ok) {
                throw new Error('Failed to fetch student register.');
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            showStatusMessage(`Error: Could not load students for ${moduleCode}.`, 'error');
            return [];
        }
    }

    // --- Rendering Functions ---

    function renderModuleTable(modules) {
        moduleTableBody.innerHTML = '';
        if (!modules || modules.length === 0) {
            moduleTableBody.innerHTML = '<tr><td colspan="2">No modules found for your profile.</td></tr>';
            return;
        }
        modules.forEach(module => {
            const row = moduleTableBody.insertRow();
            row.dataset.moduleCode = module.code;
            row.className = 'cursor-pointer hover:bg-gray-700';
            row.innerHTML = `
                <td>${module.code}</td>
                <td>${module.name}</td>
            `;
            row.addEventListener('click', () => handleModuleSelection(module.code, module.name));
        });
    }

    function renderStudentTable(students) {
        studentTableBody.innerHTML = '';
        if (!students || students.length === 0) {
            studentTableBody.innerHTML = '<tr><td colspan="3">No students are currently enrolled in this module.</td></tr>';
            return;
        }
        students.forEach(student => {
            const row = studentTableBody.insertRow();
            row.innerHTML = `
                <td>${student.student_number}</td>
                <td>${student.student_name}</td>
                <td>${student.student_surname}</td>
            `;
        });
    }

    // --- View Management ---

    function switchView(view, moduleName = '') {
        currentView = view;
        if (view === 'students') {
            moduleListSection.style.display = 'none';
            studentRegisterSection.style.display = 'block';
            dataSearchInput.placeholder = 'Search for student number, name, or surname...';
            currentModuleTitle.textContent = `Register for: ${moduleName} (${currentModuleCode})`;
            dataSearchInput.value = '';
            renderStudentTable(studentsInModule);
        } else {
            studentRegisterSection.style.display = 'none';
            moduleListSection.style.display = 'block';
            dataSearchInput.placeholder = 'Search for modules...';
            currentModuleCode = null;
            dataSearchInput.value = '';
            renderModuleTable(allModules);
        }
    }

    async function handleModuleSelection(moduleCode, moduleName) {
        currentModuleCode = moduleCode;
        showStatusMessage(`Loading register for ${moduleCode}...`);
        studentsInModule = await fetchStudentsByModule(moduleCode);
        switchView('students', moduleName);
    }
    
    // --- Event Handlers & Initialization ---

    function handleSearch() {
        const query = dataSearchInput.value.toLowerCase().trim();
        if (currentView === 'modules') {
            const filteredModules = allModules.filter(module =>
                module.code.toLowerCase().includes(query) ||
                module.name.toLowerCase().includes(query)
            );
            renderModuleTable(filteredModules);
        } else if (currentView === 'students') {
            const filteredStudents = studentsInModule.filter(student =>
                student.student_number.toLowerCase().includes(query) ||
                student.student_name.toLowerCase().includes(query) ||
                student.student_surname.toLowerCase().includes(query)
            );
            renderStudentTable(filteredStudents);
        }
    }
    
    async function handleLogout() {
      if (confirm("Are you sure you want to log out?")) {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
      }
    }

    async function initPage() {
        showStatusMessage('Loading your modules...');
        allModules = await fetchLecturerModules();
        renderModuleTable(allModules);

        dataSearchInput.addEventListener('input', handleSearch);
        backToModulesBtn.addEventListener('click', () => switchView('modules'));
        if (backButton) backButton.addEventListener('click', () => window.history.back());
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (printButton) printButton.addEventListener('click', () => window.print());
        
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) profileBtn.addEventListener('click', () => window.location.href = 'lectureside_profile.html');
    }

    function showStatusMessage(message, type = 'success') {
        const container = document.getElementById('status-message-container');
        const statusMessage = document.getElementById('status-message');
        if (!container || !statusMessage) return;
        
        statusMessage.textContent = message;
        container.className = type === 'error' ? 'status-error' : 'status-success';
        container.style.display = 'block';
        setTimeout(() => container.style.display = 'none', 3000);
    }

    initPage();
});