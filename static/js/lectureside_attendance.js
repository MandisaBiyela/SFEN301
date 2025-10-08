document.addEventListener('DOMContentLoaded', function() {
    let statisticsData = null;

    // DOM Elements
    const loadingDiv = document.getElementById('loading');
    const overviewContainer = document.getElementById('overview-container');
    const modulesContainer = document.getElementById('modules-container');
    const lecturerNameSpan = document.getElementById('lecturer-name');
    const profileBtn = document.querySelector('.profile-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const backButton = document.getElementById('back-button');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const printReportBtn = document.getElementById('print-report-btn');

    // Fetch statistics data
    async function fetchStatistics() {
        try {
            const response = await fetch('/api/lecturer/attendance_statistics');
            
            if (!response.ok) {
                throw new Error('Failed to fetch statistics');
            }

            statisticsData = await response.json();
            renderStatistics();
            
        } catch (error) {
            console.error('Error fetching statistics:', error);
            loadingDiv.innerHTML = '<p class="no-data">Error loading statistics. Please try again.</p>';
        }
    }

    // Render all statistics
    function renderStatistics() {
        if (!statisticsData || statisticsData.statistics.length === 0) {
            loadingDiv.innerHTML = '<p class="no-data">No attendance data available yet.</p>';
            return;
        }

        loadingDiv.style.display = 'none';
        overviewContainer.style.display = 'block';

        // Update lecturer name
        lecturerNameSpan.textContent = `${statisticsData.lecturer_name}'s Modules`;

        // Calculate overview statistics
        let totalStudents = 0;
        let totalPeriods = 0;
        let totalRates = [];

        statisticsData.statistics.forEach(module => {
            totalStudents += module.total_students;
            totalPeriods += module.total_periods;
            if (module.overall_attendance_rate > 0) {
                totalRates.push(module.overall_attendance_rate);
            }
        });

        const avgAttendance = totalRates.length > 0 
            ? (totalRates.reduce((a, b) => a + b, 0) / totalRates.length).toFixed(2)
            : 0;

        // Update overview cards
        document.getElementById('total-modules').textContent = statisticsData.total_modules;
        document.getElementById('total-students-all').textContent = totalStudents;
        document.getElementById('total-periods-all').textContent = totalPeriods;
        document.getElementById('avg-attendance').textContent = `${avgAttendance}%`;

        // Render each module card
        modulesContainer.innerHTML = '';
        statisticsData.statistics.forEach(module => {
            const moduleCard = createModuleCard(module);
            modulesContainer.appendChild(moduleCard);
        });
    }

    // Create module card HTML
    function createModuleCard(module) {
        const card = document.createElement('div');
        card.className = 'module-card';

        // Determine rate badge class
        const rate = module.overall_attendance_rate;
        let rateClass = 'rate-critical';
        if (rate >= 80) rateClass = 'rate-good';
        else if (rate >= 60) rateClass = 'rate-warning';

        card.innerHTML = `
            <div class="module-header">
                <div>
                    <h2 class="module-title">${module.module_name}</h2>
                    <p class="module-code">${module.module_code}</p>
                </div>
                <div class="rate-badge ${rateClass}">
                    ${rate}%
                </div>
            </div>

            <div class="module-stats">
                <div class="stat-item">
                    <div class="stat-value">${module.total_students}</div>
                    <div class="stat-label">Students</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${module.total_periods}</div>
                    <div class="stat-label">Periods</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${module.total_attendance_records}</div>
                    <div class="stat-label">Total Records</div>
                </div>
            </div>

            ${module.recent_attendance.length > 0 ? `
                <div class="recent-periods">
                    <h3 style="color: #2c3e50; margin-bottom: 15px;">Recent Periods</h3>
                    ${module.recent_attendance.map(period => `
                        <div class="period-item">
                            <div class="period-info">
                                <strong>${period.day}</strong> - ${period.time}<br>
                                <small style="color: #7f8c8d;">${period.venue}</small>
                            </div>
                            <div class="period-rate" style="color: ${period.attendance_rate >= 80 ? '#2ecc71' : period.attendance_rate >= 60 ? '#f39c12' : '#e74c3c'}">
                                ${period.attendance_count}/${module.total_students} (${period.attendance_rate}%)
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="no-data">No recent periods available</p>'}

            <div style="margin-top: 20px;">
                <span class="student-list-toggle" data-module="${module.module_code}">
                    View Student Breakdown (${module.student_breakdown.length} students) ▼
                </span>
                <div class="student-breakdown" id="breakdown-${module.module_code}">
                    ${module.student_breakdown.length > 0 ? 
                        module.student_breakdown.map(student => `
                            <div class="student-row ${student.status.toLowerCase()}">
                                <div>
                                    <strong>${student.name}</strong><br>
                                    <small style="color: #7f8c8d;">${student.student_number}</small>
                                </div>
                                <div style="text-align: right;">
                                    <strong>${student.attended}/${student.total_periods}</strong><br>
                                    <small style="color: ${student.attendance_rate >= 80 ? '#2ecc71' : student.attendance_rate >= 60 ? '#f39c12' : '#e74c3c'}">
                                        ${student.attendance_rate}%
                                    </small>
                                </div>
                            </div>
                        `).join('') 
                        : '<p class="no-data">No student data available</p>'
                    }
                </div>
            </div>
        `;

        return card;
    }

    // Toggle student breakdown
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('student-list-toggle')) {
            const moduleCode = e.target.dataset.module;
            const breakdown = document.getElementById(`breakdown-${moduleCode}`);
            
            if (breakdown) {
                breakdown.classList.toggle('show');
                e.target.textContent = breakdown.classList.contains('show')
                    ? e.target.textContent.replace('▼', '▲')
                    : e.target.textContent.replace('▲', '▼');
            }
        }
    });

    // Export to CSV
    function exportToCSV() {
        if (!statisticsData) return;

        let csv = 'Module Code,Module Name,Total Students,Total Periods,Attendance Rate\n';
        
        statisticsData.statistics.forEach(module => {
            csv += `${module.module_code},${module.module_name},${module.total_students},${module.total_periods},${module.overall_attendance_rate}%\n`;
            
            csv += '\nStudent Number,Student Name,Attended Periods,Total Periods,Attendance Rate\n';
            module.student_breakdown.forEach(student => {
                csv += `${student.student_number},${student.name},${student.attended},${student.total_periods},${student.attendance_rate}%\n`;
            });
            csv += '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_statistics_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Print report
    function printReport() {
        if (!statisticsData) return;

        let reportContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px;">
                <h1 style="text-align: center;">Attendance Statistics Report</h1>
                <h2 style="text-align: center;">${statisticsData.lecturer_name}</h2>
                <p style="text-align: center; color: #7f8c8d;">Generated on ${new Date().toLocaleDateString()}</p>
                <hr style="margin: 20px 0;">
        `;

        statisticsData.statistics.forEach(module => {
            reportContent += `
                <div style="margin: 30px 0; page-break-inside: avoid;">
                    <h2 style="color: #2c3e50;">${module.module_name} (${module.module_code})</h2>
                    <div style="display: flex; justify-content: space-around; margin: 20px 0; border: 1px solid #ddd; padding: 15px;">
                        <div style="text-align: center;">
                            <p style="margin: 0; font-weight: bold;">Students</p>
                            <p style="font-size: 1.5em; margin: 5px 0;">${module.total_students}</p>
                        </div>
                        <div style="text-align: center;">
                            <p style="margin: 0; font-weight: bold;">Periods</p>
                            <p style="font-size: 1.5em; margin: 5px 0;">${module.total_periods}</p>
                        </div>
                        <div style="text-align: center;">
                            <p style="margin: 0; font-weight: bold;">Attendance Rate</p>
                            <p style="font-size: 1.5em; margin: 5px 0; color: ${module.overall_attendance_rate >= 80 ? '#2ecc71' : module.overall_attendance_rate >= 60 ? '#f39c12' : '#e74c3c'}">${module.overall_attendance_rate}%</p>
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Student Number</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Student Name</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Attended</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Total</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${module.student_breakdown.map(student => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${student.student_number}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${student.name}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.attended}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.total_periods}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${student.attendance_rate >= 80 ? '#2ecc71' : student.attendance_rate >= 60 ? '#f39c12' : '#e74c3c'}">${student.attendance_rate}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        reportContent += `</div>`;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Attendance Statistics Report</title></head><body>');
        printWindow.document.write(reportContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }

    // Event listeners
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }

    if (printReportBtn) {
        printReportBtn.addEventListener('click', printReport);
    }

    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'lectureside_profile.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = '/';
            }
        });
    }

    // Initialize
    fetchStatistics();
});