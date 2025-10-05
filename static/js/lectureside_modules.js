document.addEventListener('DOMContentLoaded', function() {
    
    // =================================================================
    // MOCK DATA FOR LECTURER DEMO
    // =================================================================
    const MOCK_MODULES = [
        { code: 'PRT301S', name: 'Software Practical 3', lecturer: 'Nozipho Mbonambi' },
        { code: 'ADS301S', name: 'Advanced Data Structures', lecturer: 'Nozipho Mbonambi' },
        { code: 'WEB301S', name: 'Web Application Development', lecturer: 'Nozipho Mbonambi' },
        { code: 'INF301S', name: 'Information Management', lecturer: 'John Doe' }, // Module not taught by this lecturer (should not appear)
    ];

    const MOCK_STUDENTS = {
        'PRT301S': [
            { student_number: '2210001', name: 'Sipho', surname: 'Zulu' },
            { student_number: '2210002', name: 'Lindiwe', surname: 'Mkhize' },
            { student_number: '2210003', name: 'Thabo', surname: 'Dlamini' },
            { student_number: '2210004', name: 'Nomusa', surname: 'Ngcobo' }
        ],
        'ADS301S': [
            { student_number: '2210005', name: 'Ayanda', surname: 'Cele' },
            { student_number: '2210006', name: 'Sibusiso', surname: 'Ndlovu' },
            { student_number: '2210007', name: 'Zinhle', surname: 'Shezi' }
        ],
        'WEB301S': [
            { student_number: '2210008', name: 'Bongani', surname: 'Gwala' },
            { student_number: '2210009', name: 'Precious', surname: 'Khoza' },
            { student_number: '2210010', name: 'Xolani', surname: 'Sibiya' },
            { student_number: '2210001', name: 'Sipho', surname: 'Zulu' } // Shared student
        ]
    };

    // =================================================================
    // DOM Elements and State
    // =================================================================
    const moduleTableBody = document.getElementById('module-table-body');
    const studentTableBody = document.getElementById('student-table-body');
    const moduleListSection = document.getElementById('module-list-section');
    const studentRegisterSection = document.getElementById('student-register-section');
    const dataSearchInput = document.getElementById('data-search-input');
    const currentModuleTitle = document.getElementById('current-module-title');
    const backToModulesBtn = document.getElementById('back-to-modules-btn');
    const printButton = document.getElementById('print-register-btn');
    const backButton = document.getElementById('back-button');
    

    let currentView = 'modules'; // 'modules' or 'students'
    let allModules = [];
    let currentModuleCode = null;
    let studentsInModule = [];
    
    // Hardcoded lecturer name for filtering mock data
    const LECTURER_NAME = 'Nozipho Mbonambi';

    // =================================================================
    // Utility Functions
    // =================================================================

    /**
     * Shows a temporary status message to the user.
     * @param {string} message 
     * @param {string} type - 'success' or 'error' (currently only one style is used)
     */
    function showStatusMessage(message, type = 'success') {
        const statusMessageContainer = document.getElementById('status-message-container');
        const statusMessage = document.getElementById('status-message');
        
        statusMessage.textContent = message;
        statusMessageContainer.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            statusMessageContainer.style.display = 'none';
        }, 3000);
    }

    
  
    // =================================================================
    // Mock Data Fetching (Replaces API calls for demo)
    // =================================================================

    async function fetchLecturerModules() {
        // Filter modules to only show those taught by the current lecturer
        return MOCK_MODULES.filter(m => m.lecturer === LECTURER_NAME);
    }

    async function fetchStudentsByModule(moduleCode) {
        // Returns the mock student list for the given module code
        return MOCK_STUDENTS[moduleCode] || [];
    }

    // =================================================================
    // Rendering Functions
    // =================================================================

    /**
     * Renders the list of modules into the module table.
     * @param {Array<Object>} modules 
     */
    function renderModuleTable(modules) {
        moduleTableBody.innerHTML = '';
        if (modules.length === 0) {
            moduleTableBody.innerHTML = '<tr><td colspan="2">No modules found.</td></tr>';
            return;
        }

        modules.forEach(module => {
            const row = moduleTableBody.insertRow();
            row.dataset.moduleCode = module.code;
            row.innerHTML = `
                <td>${module.code}</td>
                <td>${module.name}</td>
            `;
            // Add click listener to view the register
            row.addEventListener('click', () => handleModuleSelection(module.code, module.name));
        });
    }

    /**
     * Renders the list of students into the student register table.
     * @param {Array<Object>} students 
     */
    function renderStudentTable(students) {
        studentTableBody.innerHTML = '';
        if (students.length === 0) {
            studentTableBody.innerHTML = '<tr><td colspan="3">No students are currently enrolled in this module.</td></tr>';
            return;
        }

        students.forEach(student => {
            const row = studentTableBody.insertRow();
            row.innerHTML = `
                <td>${student.student_number}</td>
                <td>${student.name}</td>
                <td>${student.surname}</td>
            `;
        });
    }

    // =================================================================
    // View Management
    // =================================================================

    /**
     * Switches the UI between the Module List and the Student Register.
     * @param {string} view - 'modules' or 'students'
     * @param {string} moduleName - Name of the selected module
     */
    function switchView(view, moduleName = '') {
        currentView = view;
        if (view === 'students') {
            moduleListSection.style.display = 'none';
            studentRegisterSection.style.display = 'block';
            dataSearchInput.placeholder = 'Search for student number, name, or surname...';
            currentModuleTitle.textContent = `Register for: ${moduleName} (${currentModuleCode})`;
            dataSearchInput.value = ''; // Clear search bar
            renderStudentTable(studentsInModule);

        } else { // 'modules'
            studentRegisterSection.style.display = 'none';
            moduleListSection.style.display = 'block';
            dataSearchInput.placeholder = 'Search for modules...';
            currentModuleCode = null; // Clear state
            dataSearchInput.value = ''; // Clear search bar
            renderModuleTable(allModules);
        }
    }

    /**
     * Handles the selection of a module from the list.
     * @param {string} moduleCode 
     * @param {string} moduleName 
     */
    async function handleModuleSelection(moduleCode, moduleName) {
        currentModuleCode = moduleCode;
        // Fetch and store students for the selected module
        studentsInModule = await fetchStudentsByModule(moduleCode); 
        
        switchView('students', moduleName);
    }
    
    // =================================================================
    // Event Handlers & Initialization
    // =================================================================

    /**
     * Handles filtering the list based on the current view (Modules or Students).
     */
    function handleSearch() {
        const query = dataSearchInput.value.toLowerCase().trim();
        
        if (currentView === 'modules') {
            // Filter modules
            const filteredModules = allModules.filter(module =>
                module.code.toLowerCase().includes(query) ||
                module.name.toLowerCase().includes(query)
            );
            renderModuleTable(filteredModules);
            
        } else if (currentView === 'students') {
            // Filter students
            const filteredStudents = studentsInModule.filter(student =>
                student.student_number.toLowerCase().includes(query) ||
                student.name.toLowerCase().includes(query) ||
                student.surname.toLowerCase().includes(query)
            );
            renderStudentTable(filteredStudents);
        }
    }


    /**
     * Initializes the page, loads modules, and sets up event listeners.
     */
    async function initPage() {
        // 1. Load Modules
        allModules = await fetchLecturerModules();
        renderModuleTable(allModules);

        // 2. Set up Event Listeners
        dataSearchInput.addEventListener('input', handleSearch);
        
        backToModulesBtn.addEventListener('click', () => switchView('modules'));
        
        if (backButton) {
            // Standard back button function
            backButton.addEventListener('click', function() {
                window.history.back();
            });
        }
        
        // Profile and Logout buttons
        const profileBtn = document.querySelector('.profile-btn');
        const logoutBtn = document.querySelector('.logout-btn');

        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                window.location.href = 'lectureside_profile.html';
            });
        }

         if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      const confirmLogout = confirm("Are you sure you want to log out?");
      if (confirmLogout) {
        // Clear session/local storage if used
        sessionStorage.clear();
        localStorage.clear();

        // Redirect to login page
        window.location.href = '/';
      }
      // else do nothing if user cancels
    });
  }

        // Print functionality
        if (printButton) {
            printButton.addEventListener('click', () => {
                window.print();
            });
        }
    }

    initPage();
});
