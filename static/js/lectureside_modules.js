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
    let allAttendanceData = [];
    let allPeriods = [];

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

    /**
     * Fetches all attendance records
     */
    async function fetchAllAttendance() {
        try {
            const response = await fetch('/api/attendance');
            if (!response.ok) {
                throw new Error('Failed to fetch attendance.');
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    /**
     * Fetches all periods for the lecturer
     */
    async function fetchLecturerPeriods() {
        try {
            const response = await fetch('/api/lecturer/periods');
            if (!response.ok) {
                throw new Error('Failed to fetch periods.');
            }
            return await response.json();
        } catch (error) {
            console.error(error);
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
            studentTableBody.innerHTML = '<tr><td colspan="4">No students are currently enrolled in this module.</td></tr>';
            return;
        }
        students.forEach(student => {
            const row = studentTableBody.insertRow();
            const attendanceStats = getStudentAttendanceStats(student.student_number);
            
            row.innerHTML = `
                <td>${student.student_number}</td>
                <td>${student.student_name}</td>
                <td>${student.student_surname}</td>
                <td>
                    <button class="action-btn" onclick="viewStudentAttendanceStats('${student.student_number}', '${student.student_name}', '${student.student_surname}')">
                        View Stats
                    </button>
                </td>
            `;
        });
    }

    /**
     * Get attendance stats for a student in the current module
     */
    function getStudentAttendanceStats(studentNumber) {
        const modulePeriods = allPeriods.filter(p => p.module_code == currentModuleCode);
        const studentAttendance = allAttendanceData.filter(a => 
            a.user_id == studentNumber &&
            allPeriods.some(p => p.id == a.class_period_id && p.module_code == currentModuleCode)
        );

        const totalPeriods = modulePeriods.length;
        const attendedPeriods = studentAttendance.length;
        const rate = totalPeriods > 0 ? ((attendedPeriods / totalPeriods) * 100).toFixed(2) : 0;

        return {
            totalPeriods,
            attendedPeriods,
            rate,
            status: rate >= 80 ? 'Good' : rate >= 60 ? 'Warning' : 'Critical'
        };
    }

    // --- Modal Functions ---

    window.viewStudentAttendanceStats = function(studentNumber, firstName, lastName) {
        const modal = document.getElementById('student-stats-modal') || createStatsModal();
        const modulePeriods = allPeriods.filter(p => p.module_code == currentModuleCode);
        const currentModule = allModules.find(m => m.code == currentModuleCode);
        
        const studentAttendance = allAttendanceData.filter(a => 
            a.user_id == studentNumber &&
            allPeriods.some(p => p.id == a.class_period_id && p.module_code == currentModuleCode)
        );

        const totalPeriods = modulePeriods.length;
        const attendedPeriods = studentAttendance.length;
        const rate = totalPeriods > 0 ? ((attendedPeriods / totalPeriods) * 100).toFixed(2) : 0;

        const statusColor = rate >= 80 ? '#2ecc71' : rate >= 60 ? '#f39c12' : '#e74c3c';
        const statusText = rate >= 80 ? '✓ Good' : rate >= 60 ? '⚠ Warning' : '✗ Critical';

        // Build attendance details
        let attendanceDetails = '<div style="margin-top: 20px;"><h3>Period-by-Period Breakdown:</h3>';
        
        if (modulePeriods.length === 0) {
            attendanceDetails += '<p>No periods scheduled for this module.</p>';
        } else {
            attendanceDetails += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
            attendanceDetails += `
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">
                        Period
                    </th>
                    <th style="border: 1px solid #ddd; padding: 8px;">
                        Day
                    </th>
                    <th style="border: 1px solid #ddd; padding: 8px;">
                        Time
                    </th>
                    <th style="border: 1px solid #ddd; padding: 8px;">
                        Status
                    </th>
                </tr>
            </thead>`;
            attendanceDetails += '<tbody>';

            modulePeriods.forEach(period => {
                const isAttended = studentAttendance.some(a => a.class_period_id == period.id);
                const statusBadge = isAttended ? '<span style="color: #2ecc71; font-weight: bold;">✓ Present</span>' : '<span style="color: #e74c3c; font-weight: bold;">✗ Absent</span>';
                
                attendanceDetails += `<tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${period.period_id}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${period.day_of_week}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${period.period_start_time} - ${period.period_end_time}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${statusBadge}</td>
                </tr>`;
            });

            attendanceDetails += '</tbody></table>';
        }

        attendanceDetails += '</div>';

        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <span class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">&times;</span>
            <h2>${firstName} ${lastName}</h2>
            <h3>${currentModule?.name || 'Module'} (${currentModuleCode})</h3>
            <div style="margin-top: 20px; padding: 20px; background: #274767ff; border-radius: 8px;">
                <p><strong>Student Number:</strong> ${studentNumber}</p>
                <p><strong>Total Periods:</strong> ${totalPeriods}</p>
                <p><strong>Periods Attended:</strong> ${attendedPeriods}</p>
                <p><strong>Attendance Rate:</strong> <span style="color: ${statusColor}; font-weight: bold; font-size: 18px;">${rate}%</span></p>
                <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
            </div>
            
        `;
        /*modalContent.innerHTML += attendanceDetails;*/

        modal.style.display = 'block';

        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    };

    function createStatsModal() {
        const modal = document.createElement('div');
        modal.id = 'student-stats-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
            font-family: Arial, sans-serif;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background-color: #070618ff;
            margin: 5% auto;
            padding: 30px;
            border: 1px solid #888;
            width: 90%;
            max-width: 800px;
            border-radius: 8px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        return modal;
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
                String(student.student_number).toLowerCase().includes(query) ||
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
        showStatusMessage('Loading your modules and attendance data...');
        
        // Fetch all required data
        allModules = await fetchLecturerModules();
        allAttendanceData = await fetchAllAttendance();
        allPeriods = await fetchLecturerPeriods();
        
        renderModuleTable(allModules);

        dataSearchInput.addEventListener('input', handleSearch);
        backToModulesBtn.addEventListener('click', () => switchView('modules'));
        if (backButton) backButton.addEventListener('click', () => window.history.back());
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (printButton){
            const actionHeader = document.getElementById('action-header');

            printButton.addEventListener('click', () => {
                const actionButtons = document.querySelectorAll('td .action-btn');
                actionButtons.forEach(btn => btn.style.display = 'none');
                if (actionHeader) actionHeader.style.display = 'none';
                window.print();
                if (actionHeader) actionHeader.style.display = 'block';
                actionButtons.forEach(btn => btn.style.display = 'block');
            });
        } 
        
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) profileBtn.addEventListener('click', () => window.location.href = 'lectureside_profile.html');
        
        showStatusMessage('Ready to view modules and attendance');
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