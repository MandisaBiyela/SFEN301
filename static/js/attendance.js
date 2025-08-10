document.addEventListener('DOMContentLoaded', function() {
    // Dummy Data
    const dummyStudents = [
        { id: 1, studentNumber: '2211445', name: 'Alice', surname: 'Johnson', faceIdVerified: true, modules: ['sfen301', 'websys'] },
        { id: 2, studentNumber: '2211556', name: 'Bob', surname: 'Williams', faceIdVerified: false, modules: ['websys'] },
        { id: 3, studentNumber: '2211667', name: 'Charlie', surname: 'Brown', faceIdVerified: true, modules: ['sfen301', 'compnet'] },
        { id: 4, studentNumber: '2211778', name: 'Diana', surname: 'Prince', faceIdVerified: true, modules: ['sfen301', 'websys'] }
    ];

    const allModules = [
        { value: 'sfen301', name: 'Software Engineering III' },
        { value: 'websys', name: 'Web Systems' },
        { value: 'datastr', name: 'Data Structures & Algorithms' },
        { value: 'infosys', name: 'Information Systems' },
        { value: 'compnet', name: 'Computer Networks' },
        { value: 'prg101', name: 'Programming I' },
        { value: 'prg201', name: 'Programming II' },
        { value: 'dbs101', name: 'Databases I' }
    ];
    
    const modulePeriods = ['09:00', '11:00', '13:00', '15:00'];
    const cancelledPeriods = new Set(['2025-08-01-13:00', '2025-08-03-09:00']);

    const dummyAttendance = [
        { studentId: 1, module: 'websys', date: '2025-08-01', time: '09:00' },
        { studentId: 2, module: 'websys', date: '2025-08-01', time: '09:02' },
        { studentId: 4, module: 'websys', date: '2025-08-01', time: '09:03' },
        { studentId: 1, module: 'websys', date: '2025-08-01', time: '11:00' },
        { studentId: 2, module: 'websys', date: '2025-08-01', time: '11:05' },
        { studentId: 3, module: 'sfen301', date: '2025-08-01', time: '11:05' },
        { studentId: 1, module: 'sfen301', date: '2025-08-01', time: '11:00' },
        { studentId: 4, module: 'sfen301', date: '2025-08-02', time: '11:15' },
        { studentId: 2, module: 'websys', date: '2025-08-02', time: '09:10' },
        { studentId: 4, module: 'websys', date: '2025-08-02', time: '09:15' }
    ];

    const presentImg = 'static/images/Attended.png';
    const notPresentImg = 'static/images/NotAttend.png';

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

    // Helper to add minutes to HH:MM string
    function addMinutes(time, minsToAdd) {
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes + minsToAdd, 0);
        return date.toTimeString().substring(0, 5);
    }

    // Populate modules dropdown
    function populateModules() {
        allModules.sort((a, b) => a.name.localeCompare(b.name));
        allModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.value;
            option.textContent = module.name;
            moduleSelect.appendChild(option);
        });
    }

    // Populate periods dropdown
    function populatePeriods() {
        modulePeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = `${period} - ${addMinutes(period, 60)}`;
            periodSelect.appendChild(option);
        });
    }

    // Render attendance data and stats
    function renderAttendance() {
        const selectedModule = moduleSelect.value;
        const selectedDate = specificDateInput.value;
        const selectedPeriod = periodSelect.value;
        const searchQuery = studentSearchInput.value.toLowerCase();

        const periodKey = `${selectedDate}-${selectedPeriod}`;
        const moduleStudents = dummyStudents.filter(s => s.modules.includes(selectedModule));
        const totalStudentsCount = moduleStudents.length;

        if (cancelledPeriods.has(periodKey)) {
            attendanceTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">This period was cancelled.</td></tr>`;
            totalStudentsSpan.textContent = totalStudentsCount;
            totalPresentSpan.textContent = '0';
            periodRateSpan.textContent = '0%';
        } else {
            const periodAttendance = dummyAttendance.filter(r =>
                r.module === selectedModule &&
                r.date === selectedDate &&
                r.time.startsWith(selectedPeriod)
            );

            const presentStudentsInPeriod = new Set(periodAttendance.map(r => r.studentId)).size;
            const periodRate = totalStudentsCount > 0 ? ((presentStudentsInPeriod / totalStudentsCount) * 100).toFixed(2) : 0;

            totalStudentsSpan.textContent = totalStudentsCount;
            totalPresentSpan.textContent = presentStudentsInPeriod;
            periodRateSpan.textContent = `${periodRate}%`;

            attendanceTableBody.innerHTML = '';

            const filteredStudents = moduleStudents.filter(student => {
                const fullName = (student.name + ' ' + student.surname).toLowerCase();
                return fullName.includes(searchQuery) || student.studentNumber.toLowerCase().includes(searchQuery);
            });

            if (filteredStudents.length > 0) {
                filteredStudents.forEach(student => {
                    const isPresent = periodAttendance.some(r => r.studentId === student.id);
                    const statusImageSrc = isPresent ? presentImg : notPresentImg;
                    const statusAlt = isPresent ? 'Present' : 'Absent';

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${student.studentNumber}</td>
                        <td>${student.name} ${student.surname}</td>
                        <td><img src="${statusImageSrc}" alt="${statusAlt}" class="status-icon"></td>
                        <td><button class="action-btn student-stats-btn" data-student-id="${student.id}" data-module-id="${selectedModule}">View Stats</button></td>
                    `;
                    attendanceTableBody.appendChild(row);
                });
            } else {
                attendanceTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No students found or registered for this module.</td></tr>`;
            }
        }

        // Module Attendance Rate calculation
        const moduleAttendanceRecords = dummyAttendance.filter(r => {
            const recPeriodKey = `${r.date}-${r.time.substring(0, 5)}`;
            return r.module === selectedModule && !cancelledPeriods.has(recPeriodKey);
        });

        const uniqueSessions = new Set(moduleAttendanceRecords.map(r => `${r.date}-${r.time.substring(0,5)}`)).size;
        const totalPossibleAttendance = totalStudentsCount * uniqueSessions;
        const totalActualAttendance = new Set(moduleAttendanceRecords.map(r => `${r.studentId}-${r.date}-${r.time.substring(0,5)}`)).size;
        const moduleRate = totalPossibleAttendance > 0 ? ((totalActualAttendance / totalPossibleAttendance) * 100).toFixed(2) : 0;

        moduleRateSpan.textContent = `${moduleRate}%`;

        // Add click handlers for "View Stats" buttons
        document.querySelectorAll('.student-stats-btn').forEach(btn => {
            btn.addEventListener('click', showStudentStats);
        });
    }

    // Show student stats modal
    function showStudentStats(event) {
        const studentId = parseInt(event.target.dataset.studentId, 10);
        const moduleId = event.target.dataset.moduleId;

        const student = dummyStudents.find(s => s.id === studentId);
        const module = allModules.find(m => m.value === moduleId);

        const studentAttendanceRecords = dummyAttendance.filter(r => {
            const recPeriodKey = `${r.date}-${r.time.substring(0, 5)}`;
            return r.studentId === studentId && r.module === moduleId && !cancelledPeriods.has(recPeriodKey);
        });

        const totalAttendedPeriods = new Set(studentAttendanceRecords.map(r => `${r.date}-${r.time.substring(0,5)}`)).size;

        const allModuleRecords = dummyAttendance.filter(r => {
            const recPeriodKey = `${r.date}-${r.time.substring(0, 5)}`;
            return r.module === moduleId && !cancelledPeriods.has(recPeriodKey);
        });

        const totalPossiblePeriods = new Set(allModuleRecords.map(r => `${r.date}-${r.time.substring(0,5)}`)).size;

        const attendanceRate = totalPossiblePeriods > 0 ? ((totalAttendedPeriods / totalPossiblePeriods) * 100).toFixed(2) : 0;

        document.getElementById('modal-student-name').textContent = `${student.name} ${student.surname}`;
        document.getElementById('modal-module-name').textContent = `Module: ${module.name}`;
        document.getElementById('modal-stats-text').innerHTML = `
            <p>Total Module Attendance Rate: <strong>${attendanceRate}%</strong></p>
            <p>Total Periods Attended: <strong>${totalAttendedPeriods}</strong></p>
        `;

        studentStatsModal.style.display = 'block';
    }

    // Close modal handlers
    modalCloseBtn.addEventListener('click', () => {
        studentStatsModal.style.display = 'none';
    });

    window.addEventListener('click', event => {
        if (event.target === studentStatsModal) {
            studentStatsModal.style.display = 'none';
        }
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

        const isCancelled = tableContent.includes('This period was cancelled');

        let reportContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px;">
                <h1 style="text-align: center;">Attendance Report</h1>
                <h2 style="text-align: center;">${selectedModuleText}</h2>
                <p><strong>Date:</strong> ${selectedDate} | <strong>Period:</strong> ${selectedPeriodText}</p>
        `;

        if (isCancelled) {
            reportContent += `
                <div style="text-align: center; font-size: 1.2em; font-weight: bold; margin-top: 30px;">
                    This period was cancelled.
                </div>
            `;
        } else {
            reportContent += `
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
                        <p style="margin: 0;">Module Attendance Rate</p>
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
                            .replace(/<button.*?<\/button>/g, '')
                            .replace(new RegExp(`<img src="${presentImg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}".*?>`, 'g'), 'Yes')
                            .replace(new RegExp(`<img src="${notPresentImg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}".*?>`, 'g'), 'No')}
                    </tbody>
                </table>
            `;
        }

        reportContent += `</div>`;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print Attendance Report</title></head><body>');
        printWindow.document.write(reportContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }

    // Event listeners for filtering
    moduleSelect.addEventListener('change', renderAttendance);
    specificDateInput.addEventListener('change', renderAttendance);
    periodSelect.addEventListener('change', renderAttendance);
    studentSearchInput.addEventListener('input', renderAttendance);
    printAttendanceBtn.addEventListener('click', printAttendanceReport);

    // Back button navigates back in history
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    }

    // Profile button navigation
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    // Logout button with confirm and redirect + clear storage
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // Initialize dropdowns and render
    populateModules();
    populatePeriods();

    // Set default values
    moduleSelect.value = 'websys';
    specificDateInput.value = '2025-08-01';
    periodSelect.value = '09:00';

    renderAttendance();
});
