document.addEventListener('DOMContentLoaded', function() {
    let allModules = [];
    let allPeriods = [];
    let allAttendanceData = [];
    let currentModuleCode = null;
    let currentDate = null;

    // DOM Elements
    const moduleSelect = document.getElementById('module-select');
    const specificDateInput = document.getElementById('specific-date');
    const periodSelect = document.getElementById('period-select');
    const studentSearchInput = document.getElementById('student-search');
    const attendanceTableBody = document.getElementById('attendance-table-body');
    const profileBtn = document.querySelector('.profile-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const backButton = document.getElementById('back-button');
    const printBtn = document.getElementById('print-attendance-btn');

    // Fetch lecturer's modules
    async function fetchModules() {
        try {
            const response = await fetch('/api/lecturer/modules');
            if (!response.ok) throw new Error('Failed to fetch modules');
            
            allModules = await response.json();
            populateModuleSelect();
        } catch (error) {
            console.error('Error fetching modules:', error);
            moduleSelect.innerHTML = '<option>Error loading modules</option>';
        }
    }

    // Fetch attendance data
    async function fetchAttendanceData() {
        try {
            const response = await fetch('/api/attendance');
            if (!response.ok) throw new Error('Failed to fetch attendance');
            
            allAttendanceData = await response.json();
        } catch (error) {
            console.error('Error fetching attendance:', error);
        }
    }

    // Populate module dropdown
    function populateModuleSelect() {
        moduleSelect.innerHTML = '<option value="">Select a module...</option>';
        
        allModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.code;
            option.textContent = `${module.name} (${module.code})`;
            moduleSelect.appendChild(option);
        });
    }

    // When module is selected, populate periods and students
    moduleSelect.addEventListener('change', async function() {
        currentModuleCode = this.value;
        if (!currentModuleCode) {
            periodSelect.innerHTML = '<option value="">Select a period...</option>';
            attendanceTableBody.innerHTML = '';
            return;
        }

        await populatePeriods();
        updateStats();
    });

    // Populate periods based on selected module
    async function populatePeriods() {
        try {
            // Get all periods for the lecturer
            const response = await fetch('/api/lecturer/periods');
            if (!response.ok) throw new Error('Failed to fetch periods');
            
            allPeriods = await response.json();

            // Filter periods for selected module
            const modulePeriods = allPeriods.filter(p => p.module_code == currentModuleCode);
            
            periodSelect.innerHTML = '<option value="">All Periods</option>';
            
            if (modulePeriods.length === 0) {
                periodSelect.innerHTML += '<option disabled>No periods for this module</option>';
                return;
            }

            // Group periods by day and time
            const periodMap = {};
            modulePeriods.forEach(period => {
                const key = `${period.day_of_week} ${period.period_start_time}-${period.period_end_time}`;
                if (!periodMap[key]) {
                    periodMap[key] = period;
                }
            });

            Object.keys(periodMap).forEach(key => {
                const option = document.createElement('option');
                option.value = periodMap[key].id;
                option.textContent = key;
                periodSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error populating periods:', error);
            periodSelect.innerHTML = '<option>Error loading periods</option>';
        }
    }

    // When date is selected, update display
    specificDateInput.addEventListener('change', function() {
        currentDate = this.value;
        updateStats();
        displayAttendanceTable();
    });

    // When period is selected, update display
    periodSelect.addEventListener('change', function() {
        updateStats();
        displayAttendanceTable();
    });

    // Update statistics cards
    function updateStats() {
        if (!currentModuleCode) return;

        // Get students for this module
        const moduleStudents = getStudentsForModule(currentModuleCode);
        const totalStudents = moduleStudents.length;

        // Get attendance records
        let attendanceRecords = allAttendanceData.filter(a => 
            a.class_period_id && 
            allPeriods.some(p => p.id == a.class_period_id && p.module_code == currentModuleCode)
        );

        // Filter by date if selected
        if (currentDate) {
            attendanceRecords = attendanceRecords.filter(a => a.date == currentDate);
        }

        // Filter by period if selected
        const selectedPeriodId = periodSelect.value;
        if (selectedPeriodId) {
            attendanceRecords = attendanceRecords.filter(a => a.class_period_id == selectedPeriodId);
        }

        const presentCount = attendanceRecords.length;
        const periodRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(2) : 0;

        // Calculate module rate (all attendance for this module)
        const moduleAttendance = allAttendanceData.filter(a =>
            a.class_period_id &&
            allPeriods.some(p => p.id == a.class_period_id && p.module_code == currentModuleCode)
        );

        const allModulePeriods = allPeriods.filter(p => p.module_code == currentModuleCode);
        const maxAttendance = totalStudents * allModulePeriods.length;
        const moduleRate = maxAttendance > 0 ? ((moduleAttendance.length / maxAttendance) * 100).toFixed(2) : 0;

        // Update DOM
        document.getElementById('total-students').textContent = totalStudents;
        document.getElementById('total-present').textContent = presentCount;
        document.getElementById('period-rate').textContent = `${periodRate}%`;
        document.getElementById('module-rate').textContent = `${moduleRate}%`;
    }

    // Get students for a module
    function getStudentsForModule(moduleCode) {
        const attendanceSet = new Set();
        allAttendanceData.forEach(a => {
            if (allPeriods.some(p => p.id == a.class_period_id && p.module_code == moduleCode)) {
                attendanceSet.add(a.user_id);
            }
        });
        return Array.from(attendanceSet);
    }

    // Display attendance table
    function displayAttendanceTable() {
        if (!currentModuleCode) {
            attendanceTableBody.innerHTML = '<tr><td colspan="4">Select a module to view attendance</td></tr>';
            return;
        }

        const searchQuery = studentSearchInput.value.toLowerCase();
        
        // Get students for this module
        const students = getStudentsForModule(currentModuleCode);

        // Get attendance records for filtering
        let attendanceRecords = allAttendanceData.filter(a =>
            a.class_period_id &&
            allPeriods.some(p => p.id == a.class_period_id && p.module_code == currentModuleCode)
        );

        // Filter by date if selected
        if (currentDate) {
            attendanceRecords = attendanceRecords.filter(a => a.date == currentDate);
        }

        // Filter by period if selected
        const selectedPeriodId = periodSelect.value;
        if (selectedPeriodId) {
            attendanceRecords = attendanceRecords.filter(a => a.class_period_id == selectedPeriodId);
        }

        const presentStudents = new Set(attendanceRecords.map(a => a.user_id));

        // Filter by search query
        let filteredStudents = students.filter(studentId =>
            attendanceRecords.some(a => a.user_id == studentId && 
                (String(a.user_id).toLowerCase().includes(searchQuery) || 
                 (a.name && a.name.toLowerCase().includes(searchQuery))))
        );

        attendanceTableBody.innerHTML = '';

        if (filteredStudents.length === 0) {
            attendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No attendance records found</td></tr>';
            return;
        }

        filteredStudents.forEach(studentId => {
            const attendanceRecord = attendanceRecords.find(a => a.user_id == studentId);
            if (attendanceRecord) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${attendanceRecord.user_id}</td>
                    <td>${attendanceRecord.name}</td>
                    <td><span class="status-badge present">✓ Present</span></td>
                    <td>
                        <button class="action-btn" onclick="viewStudentStats('${studentId}', '${attendanceRecord.name}')">
                            View Stats
                        </button>
                    </td>
                `;
                attendanceTableBody.appendChild(row);
            }
        });
    }

    // Search functionality
    studentSearchInput.addEventListener('input', function() {
        displayAttendanceTable();
    });

    // View student statistics modal
    window.viewStudentStats = function(studentId, studentName) {
        const modal = document.getElementById('student-stats-modal');
        const closeBtn = modal.querySelector('.close-btn');
        
        document.getElementById('modal-student-name').textContent =  `(${studentId}) ` + studentName;
        
        const moduleAttendance = allAttendanceData.filter(a =>
            a.user_id == studentId &&
            a.class_period_id &&
            allPeriods.some(p => p.id == a.class_period_id && p.module_code == currentModuleCode)
        );

        const modulePeriodsCount = allPeriods.filter(p => p.module_code == currentModuleCode).length;
        const attendanceRate = modulePeriodsCount > 0 ? 
            ((moduleAttendance.length / modulePeriodsCount) * 100).toFixed(2) : 0;

        const statsText = `
            <p><strong>Module:</strong> ${allModules.find(m => m.code == currentModuleCode)?.name || 'N/A'}</p>
            <p><strong>Total Periods:</strong> ${modulePeriodsCount}</p>
            <p><strong>Attended:</strong> ${moduleAttendance.length}</p>
            <p><strong>Attendance Rate:</strong> ${attendanceRate}%</p>
            <p><strong>Status:</strong> ${attendanceRate >= 80 ? '✓ Good' : attendanceRate >= 60 ? '⚠ Warning' : '✗ Critical'}</p>
        `;

        document.getElementById('modal-stats-text').innerHTML = statsText;
        modal.style.display = 'block';

        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });

        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };

    // Print attendance
    printBtn.addEventListener('click', function() {
        if (!currentModuleCode) {
            alert('Please select a module first');
            return;
        }

        const module = allModules.find(m => m.code == currentModuleCode);
        const dateStr = currentDate || new Date().toLocaleDateString();
        
        const printContent = `
            <html>
            <head>
                <title>Attendance Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { text-align: center; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>Attendance Report</h1>
                <p><strong>Module:</strong> ${module?.name} (${module?.code})</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Student No.</th>
                            <th>Student Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(document.querySelectorAll('#attendance-table-body tr')).map(row => {
                            const cells = row.querySelectorAll('td');
                            return `
                                <tr>
                                    <td>${cells[0].textContent}</td>
                                    <td>${cells[1].textContent}</td>
                                    <td>${cells[2].textContent}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    });

    // Profile button
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'lectureside_profile.html';
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                fetch('/api/logout', { method: 'POST' }).then(() => {
                    window.location.href = '/';
                });
            }
        });
    }

    // Back button
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    }

    // Initialize
    fetchModules();
    fetchAttendanceData();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    specificDateInput.value = today;
});