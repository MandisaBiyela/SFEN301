document.addEventListener('DOMContentLoaded', function() {
    // Back button functionality
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.history.back();
        });
    }

    // Profile and Logout button navigation
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
                // Clear any session/local storage if needed here
                window.location.href = 'login.html';
            }
        });
    }

    // ======= Module Periods Page Logic =======
    const modulePeriodsTableBody = document.getElementById('module-periods-table-body');
    const searchInput = document.getElementById('module-period-search-input');

    // Demo data for module periods
    const allModulesWithPeriods = [
        { code: 'prg301', name: 'Advanced Programming', periods: [{ day: 'Monday', time: '10:00 - 11:45', venue: 'Room 101' }, { day: 'Wednesday', time: '14:00 - 15:45', venue: 'Room 203' }] },
        { code: 'databs', name: 'Database Systems', periods: [{ day: 'Tuesday', time: '08:00 - 09:45', venue: 'Lab B' }, { day: 'Thursday', time: '13:00 - 14:45', venue: 'Room 105' }] },
        { code: 'sftwre', name: 'Software Engineering', periods: [{ day: 'Friday', time: '09:00 - 12:45', venue: 'Room 103' }] },
        { code: 'netwk', name: 'Computer Networks', periods: [] }
    ];

    function renderModulePeriodsTable(modules) {
        if (!modulePeriodsTableBody) return;
        modulePeriodsTableBody.innerHTML = '';
        modules.forEach(module => {
            let periodsContent;
            if (module.periods.length > 0) {
                const periodsHtml = module.periods.map(period => `<li>${period.day}: ${period.time} (${period.venue})</li>`).join('');
                periodsContent = `<ul>${periodsHtml}</ul>`;
            } else {
                periodsContent = '-';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${module.code.toUpperCase()}</td>
                <td>${module.name}</td>
                <td>${periodsContent}</td>
                <td>
                    <button class="image-btn edit-btn">
                        <img src="static/images/Edit.png" alt="Edit" class="action-icon">
                    </button>
                </td>
            `;
            // Edit button navigates to edit page with module code param
            row.querySelector('.edit-btn').addEventListener('click', () => {
                window.location.href = `period_edit.html?code=${module.code}`;
            });
            modulePeriodsTableBody.appendChild(row);
        });
    }

    function searchModulePeriods() {
        if (!searchInput) return;
        const query = searchInput.value.toLowerCase();
        const filteredModules = allModulesWithPeriods.filter(module => 
            module.code.toLowerCase().includes(query) || 
            module.name.toLowerCase().includes(query) ||
            module.periods.some(period => 
                (period.day && period.day.toLowerCase().includes(query)) || 
                (period.time && period.time.toLowerCase().includes(query)) || 
                (period.venue && period.venue.toLowerCase().includes(query))
            )
        );
        renderModulePeriodsTable(filteredModules);
    }

    if (searchInput) {
        searchInput.addEventListener('input', searchModulePeriods);
    }

    renderModulePeriodsTable(allModulesWithPeriods);

    // ======= Edit Module Period Page Logic =======
    const editPeriodForm = document.getElementById('edit-period-form');
    const periodsContainer = document.getElementById('periods-container');
    const addPeriodBtn = document.getElementById('add-period-btn');
    let periodCounter = document.querySelectorAll('.period-entry').length;

    const daysOfTheWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const demoVenues = ['Room 101', 'Room 102', 'Room 103', 'Lab A', 'Lab B', 'Auditorium'];

    function createPeriodTemplate(count, day = '', startTime = '', endTime = '', venue = '') {
        const periodDiv = document.createElement('div');
        periodDiv.className = 'period-entry';
        periodDiv.id = `period-entry-${count}`;

        const removeBtnHtml = count > 1 ? `<button type="button" class="remove-period-btn">Remove Period</button>` : '';

        periodDiv.innerHTML = `
            <hr class="form-divider">
            <div class="period-header">
                <h3 class="period-title">Period ${count}</h3>
                ${removeBtnHtml}
            </div>
            <div class="form-group">
                <label for="day-${count}">Day</label>
                <select id="day-${count}" name="day-${count}" class="period-day-select"></select>
            </div>
            <div class="form-group">
                <label for="time-start-${count}">Start Time</label>
                <input type="time" id="time-start-${count}" name="time-start-${count}" value="${startTime}">
            </div>
            <div class="form-group">
                <label for="time-end-${count}">End Time</label>
                <input type="time" id="time-end-${count}" name="time-end-${count}" value="${endTime}">
            </div>
            <div class="form-group">
                <label for="venue-${count}">Venue</label>
                <select id="venue-${count}" name="venue-${count}" class="period-venue-select"></select>
            </div>
        `;
        return periodDiv;
    }

    function populateSelects() {
        const daySelects = document.querySelectorAll('.period-day-select');
        daySelects.forEach(select => {
            const selectedDay = select.value;
            select.innerHTML = '<option value="">Select a Day</option>';
            daysOfTheWeek.forEach(day => {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = day;
                if (day === selectedDay) option.selected = true;
                select.appendChild(option);
            });
        });

        const venueSelects = document.querySelectorAll('.period-venue-select');
        venueSelects.forEach(select => {
            const selectedVenue = select.value;
            select.innerHTML = '<option value="">Select a Venue</option>';
            demoVenues.forEach(venue => {
                const option = document.createElement('option');
                option.value = venue;
                option.textContent = venue;
                if (venue === selectedVenue) option.selected = true;
                select.appendChild(option);
            });
        });
    }

    function addPeriod() {
        periodCounter++;
        const newPeriodElement = createPeriodTemplate(periodCounter);
        const addBtnContainer = document.querySelector('.add-period-btn-container');
        if (addBtnContainer) {
            periodsContainer.insertBefore(newPeriodElement, addBtnContainer);
        } else {
            periodsContainer.appendChild(newPeriodElement);
        }
        populateSelects();
    }

    if (addPeriodBtn) {
        addPeriodBtn.addEventListener('click', addPeriod);
    }

    // Remove period button via event delegation
    if (periodsContainer) {
        periodsContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-period-btn')) {
                const periodEntry = event.target.closest('.period-entry');
                if (periodEntry) {
                    periodEntry.remove();
                }
            }
        });
    }

    // Helper to convert time string to minutes from midnight
    function parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function checkForConflicts() {
        if (!periodsContainer) return true;
        const periodEntries = document.querySelectorAll('.period-entry');
        const periods = [];

        periodEntries.forEach(entry => {
            const day = entry.querySelector('.period-day-select').value;
            const venue = entry.querySelector('.period-venue-select').value;
            const startTimeStr = entry.querySelector('input[type="time"][name^="time-start"]').value;
            const endTimeStr = entry.querySelector('input[type="time"][name^="time-end"]').value;

            if (day && venue && startTimeStr && endTimeStr) {
                periods.push({
                    day,
                    venue,
                    startTime: parseTime(startTimeStr),
                    endTime: parseTime(endTimeStr),
                    startTimeStr,
                    endTimeStr
                });
            }
        });

        for (let i = 0; i < periods.length; i++) {
            for (let j = i + 1; j < periods.length; j++) {
                const p1 = periods[i];
                const p2 = periods[j];
                if (
                    p1.day === p2.day &&
                    p1.venue === p2.venue &&
                    (p1.startTime < p2.endTime && p1.endTime > p2.startTime)
                ) {
                    alert(`Time conflict detected!\n\nPeriod 1: ${p1.day} at ${p1.venue} from ${p1.startTimeStr} to ${p1.endTimeStr}\nPeriod 2: ${p2.day} at ${p2.venue} from ${p2.startTimeStr} to ${p2.endTimeStr}\n\nPlease adjust the schedule.`);
                    return false;
                }
            }
        }
        return true;
    }

    if (editPeriodForm) {
        editPeriodForm.addEventListener('submit', function(event) {
            event.preventDefault();

            if (!checkForConflicts()) {
                return;
            }

            alert('Form submitted successfully!');
            window.location.href = 'period.html';  // Redirect after successful save
        });
    }

    populateSelects();
});
