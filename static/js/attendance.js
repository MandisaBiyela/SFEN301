document.addEventListener('DOMContentLoaded', function() {
    // Real data from APIs
    let allStudents = [];
    let allModules = [];
    let allPeriods = [];
    let allAttendance = [];

    const presentImg = 'static/images/Attended.png';
    const notPresentImg = 'static/images/NotAttend.png';

    // Fetch data from APIs
    async function fetchAllData() {
        try {
            const [studentsResponse, modulesResponse, periodsResponse, attendanceResponse] = await Promise.all([
                fetch('/api/students'),
                fetch('/api/modules'),
                fetch('/api/periods'),
                fetch('/api/attendance')
            ]);

            if (!studentsResponse.ok || !modulesResponse.ok || !periodsResponse.ok || !attendanceResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            allStudents = await studentsResponse.json();
            allModules = await modulesResponse.json();
            allPeriods = await periodsResponse.json();
            allAttendance = await attendanceResponse.json();

            // Populate dropdowns
            populateModules();
            populatePeriods();

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error loading data. Please try again.');
        }
    }

    // DOM Elements
    const moduleSelect = document.getElementById('module-select');
    const specificDateInput = document.getElementById('specific-date');
    const periodSelect = document.getElementById('period-select');
    const studentSearchInput = document.getElementById('student-search');
    const attendanceTableBody = document.getElementById('attendance-table-body');
    const totalStudentsSpan = document.getElementById('total-students');
    const totalPresentSpan = document.getElementById('total-present');
    const periodRateSpan = document.getElementById('period-rate');
    const moduleRateSpan = document.getElementById('module-rate');
    const profileBtn = document.querySelector('.profile-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const backButton = document.getElementById('back-button');
    const studentStatsModal = document.getElementById('student-stats-modal');
    const modalCloseBtn = studentStatsModal.querySelector('.close-btn');
    const printAttendanceBtn = document.getElementById('print-attendance-btn');

    // Populate modules dropdown
    function populateModules() {
        if (!moduleSelect) return;
        moduleSelect.innerHTML = '<option value="">Select a Module</option>';
        
        allModules.sort((a, b) => a.name.localeCompare(b.name));
        allModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.code;
            option.textContent = module.name;
            moduleSelect.appendChild(option);
        });
    }

    // Populate periods dropdown based on selected module
    function populatePeriods() {
        if (!periodSelect) return;
        periodSelect.innerHTML = '<option value="">Select a Period</option>';
        
        const selectedModule = moduleSelect.value;
        if (!selectedModule) return;

        // Get periods for the selected module
        const modulePeriods = allPeriods.filter(period => 
            period.module_codes && period.module_codes.includes(selectedModule)
        );

        // Group periods by time and create unique time slots
        const timeSlots = new Set();
        modulePeriods.forEach(period => {
            const startTime = `${period.period_start_time} - ${period.period_end_time}`;
            timeSlots.add(startTime);
        });

        Array.from(timeSlots).sort().forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            periodSelect.appendChild(option);
        });
    }

    // Render attendance data and stats
    function renderAttendance() {
        const selectedModule = moduleSelect.value;
        const selectedDate = specificDateInput.value;
        const selectedPeriod = periodSelect.value;
        const searchQuery = studentSearchInput.value.toLowerCase();

        // Clear table and stats if inputs are missing
        if (!selectedModule || !selectedDate || !selectedPeriod) {
            attendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Please select module, date, and period.</td></tr>';
            totalStudentsSpan.textContent = '0';
            totalPresentSpan.textContent = '0';
            periodRateSpan.textContent = '0%';
            moduleRateSpan.textContent = '0%';
            return;
        }

        // --- Period Attendance Calculation ---

        const moduleStudents = allStudents.filter(student =>
            student.modules && student.modules.includes(selectedModule)
        );
        const totalStudentsCount = moduleStudents.length;
        totalStudentsSpan.textContent = totalStudentsCount;

        const [startTime, endTime] = selectedPeriod.split(' - ');
        const selectedDayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' });

        const relevantPeriodIds = allPeriods
            .filter(p =>
                p.module_codes.includes(selectedModule) &&
                p.period_start_time == startTime &&
                p.period_end_time == endTime &&
                p.day_of_week == selectedDayOfWeek
            )
            .map(p => p.id);

        const periodAttendance = allAttendance.filter(record =>
            record.date == selectedDate && relevantPeriodIds.includes(record.class_period_id)
        );

        const presentStudentsInPeriod = new Set(periodAttendance.map(r => r.user_id)).size;
        const periodRate = totalStudentsCount > 0 ? ((presentStudentsInPeriod / totalStudentsCount) * 100).toFixed(2) : 0;

        totalPresentSpan.textContent = presentStudentsInPeriod;
        periodRateSpan.textContent = `${periodRate}%`;

        // --- Render Table ---
        attendanceTableBody.innerHTML = '';
        const filteredStudents = moduleStudents.filter(student => {
            const fullName = (student.name + ' ' + student.surname).toLowerCase();
            return fullName.includes(searchQuery) || student.student_number.toLowerCase().includes(searchQuery);
        });

        if (filteredStudents.length > 0) {
            filteredStudents.sort((a,b) => a.surname.localeCompare(b.surname)).forEach(student => {
                const isPresent = periodAttendance.some(r => r.user_id == student.student_number);
                const statusImageSrc = isPresent ? presentImg : notPresentImg;
                const statusAlt = isPresent ? 'Present' : 'Absent';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.student_number}</td>
                    <td>${student.name} ${student.surname}</td>
                    <td><img src="${statusImageSrc}" alt="${statusAlt}" class="status-icon"></td>
                    <td><button class="action-btn student-stats-btn" data-student-id="${student.student_number}" data-module-id="${selectedModule}">View Stats</button></td>
                `;
                attendanceTableBody.appendChild(row);
            });
        } else {
            attendanceTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No students found or registered for this module.</td></tr>`;
        }

        // --- Module Attendance Rate Calculation ---
        const modulePeriodIds = allPeriods
            .filter(p => p.module_codes.includes(selectedModule))
            .map(p => p.id);
        
        const moduleAttendanceRecords = allAttendance.filter(r => modulePeriodIds.includes(r.class_period_id));
        
        const uniqueModuleSessions = new Set(moduleAttendanceRecords.map(r => `${r.class_period_id}-${r.date}`));
        const totalModuleSessionsCount = uniqueModuleSessions.size;

        const totalActualAttendance = moduleAttendanceRecords.length;
        const totalPossibleAttendance = totalStudentsCount * totalModuleSessionsCount;

        const moduleRate = totalPossibleAttendance > 0 ? ((totalActualAttendance / totalPossibleAttendance) * 100).toFixed(2) : 0;
        moduleRateSpan.textContent = `${moduleRate}%`;

        document.querySelectorAll('.student-stats-btn').forEach(btn => {
            btn.addEventListener('click', showStudentStats);
        });
    }

    // Show student stats modal
    function showStudentStats(event) {
        const studentId = event.target.dataset.studentId;
        const moduleId = event.target.dataset.moduleId;

        const student = allStudents.find(s => s.student_number ==studentId);
        const module = allModules.find(m => m.code == moduleId);

        if (!student || !module) {
            alert('Student or module not found');
            return;
        }

        const modulePeriodIds = allPeriods
            .filter(p => p.module_codes.includes(moduleId))
            .map(p => p.id);

        const allModuleAttendance = allAttendance.filter(r => modulePeriodIds.includes(r.class_period_id));
        const studentModuleAttendance = allModuleAttendance.filter(r => r.user_id == studentId);
        
        const totalAttendedPeriods = studentModuleAttendance.length;

        const uniqueModuleSessions = new Set(allModuleAttendance.map(r => `${r.class_period_id}-${r.date}`));
        const totalPossiblePeriods = uniqueModuleSessions.size;

        const attendanceRate = totalPossiblePeriods > 0 ? ((totalAttendedPeriods / totalPossiblePeriods) * 100).toFixed(2) : 0;

        document.getElementById('modal-student-name').textContent = `${student.name} ${student.surname}`;
        document.getElementById('modal-module-name').textContent = `Module: ${module.name}`;
        document.getElementById('modal-stats-text').innerHTML = `
            <p>Overall Module Attendance Rate: <strong>${attendanceRate}%</strong></p>
            <p>Periods Attended: <strong>${totalAttendedPeriods}</strong> of <strong>${totalPossiblePeriods}</strong> recorded sessions.</p>
        `;

        studentStatsModal.style.display = 'block';
    }

    // Close modal handlers
    modalCloseBtn.addEventListener('click', () => studentStatsModal.style.display = 'none');
    window.addEventListener('click', event => {
        if (event.target == studentStatsModal) studentStatsModal.style.display = 'none';
    });

    // Print attendance report
    function printAttendanceReport() {
        const selectedModuleText = moduleSelect.options[moduleSelect.selectedIndex].textContent;
        const selectedDate = specificDateInput.value;
        const selectedPeriodText = periodSelect.options[periodSelect.selectedIndex].textContent;
        const totalStudents = totalStudentsSpan.textContent;
        const totalPresent = totalPresentSpan.textContent;
        const periodRate = periodRateSpan.textContent;
        const moduleRate = moduleRateSpan.textContent;
        const tableContent = attendanceTableBody.innerHTML;

        if (!selectedModuleText || !selectedDate || !selectedPeriodText) {
            alert("Please select a module, date, and period before printing.");
            return;
        }

        let reportContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px;">
                <h1 style="text-align: center;">Attendance Report</h1>
                <h2 style="text-align: center;">${selectedModuleText}</h2>
                <p><strong>Date:</strong> ${selectedDate} | <strong>Period:</strong> ${selectedPeriodText}</p>
                <div style="display: flex; justify-content: space-around; margin-top: 20px; border: 1px solid #ddd; padding: 10px;">
                    <div style="text-align: center;">
                        <p style="margin: 0;">Total Students</p>
                        <p style="font-size: 1.5em; font-weight: bold;">${totalStudents}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="margin: 0;">Present (This Period)</p>
                        <p style="font-size: 1.5em; font-weight: bold;">${totalPresent}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="margin: 0;">Period Attendance Rate</p>
                        <p style="font-size: 1.5em; font-weight: bold;">${periodRate}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="margin: 0;">Overall Module Rate</p>
                        <p style="font-size: 1.5em; font-weight: bold;">${moduleRate}</p>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr>
                            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f2f2f2;">Student No.</th>
                            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f2f2f2;">Student Name</th>
                            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f2f2f2;">Present</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendanceTableBody.innerHTML
                            .replace(/<td\b[^>]*>.*?<\/button>\s*<\/td>/g, '') // Remove the actions column
                            .replace(new RegExp(`<img src="${presentImg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}".*?>`, 'g'), 'Yes')
                            .replace(new RegExp(`<img src="${notPresentImg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}".*?>`, 'g'), 'No')}
                    </tbody>
                </table>
            </div>`;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print Attendance Report</title></head><body>');
        printWindow.document.write(reportContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }

    // Event listeners
    if (moduleSelect) moduleSelect.addEventListener('change', () => {
        populatePeriods();
        renderAttendance();
    });
    if (specificDateInput) specificDateInput.addEventListener('change', renderAttendance);
    if (periodSelect) periodSelect.addEventListener('change', renderAttendance);
    if (studentSearchInput) studentSearchInput.addEventListener('input', renderAttendance);
    if (printAttendanceBtn) printAttendanceBtn.addEventListener('click', printAttendanceReport);
    if (backButton) backButton.addEventListener('click', e => {
        e.preventDefault();
        window.history.back();
    });
    if (profileBtn) profileBtn.addEventListener('click', () => window.location.href = 'profile.html');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = '/';
        }
    });

    // Initialize
    fetchAllData().then(() => {
        if (specificDateInput) {
            specificDateInput.value = new Date().toISOString().split('T')[0];
        }
        renderAttendance();
    });
});