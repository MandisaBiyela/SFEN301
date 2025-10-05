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
                window.location.href = '/';
            }
        });
    }

    // ======= Module Periods Page Logic =======
    const modulePeriodsTableBody = document.getElementById('module-periods-table-body');
    const searchInput = document.getElementById('module-period-search-input');

    let allModules = [];
    let allPeriods = [];
    let allVenues = [];

    // Fetch data from APIs
    async function fetchData() {
        try {
            // Fetch modules, periods, and venues in parallel
            const [modulesResponse, periodsResponse, venuesResponse] = await Promise.all([
                fetch('/api/modules'),
                fetch('/api/periods'),
                fetch('/api/venues')
            ]);

            if (!modulesResponse.ok || !periodsResponse.ok || !venuesResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            allModules = await modulesResponse.json();
            allPeriods = await periodsResponse.json();
            allVenues = await venuesResponse.json();

            // Group periods by module
            const modulesWithPeriods = allModules.map(module => {
                const modulePeriods = allPeriods.filter(period => 
                    period.module_codes && period.module_codes.includes(module.code)
                );
                
                return {
                    code: module.code,
                    name: module.name,
                    periods: modulePeriods.map(period => ({
                        id: period.id,
                        period_id: period.period_id,
                        day: period.day_of_week,
                        time: `${period.period_start_time} - ${period.period_end_time}`,
                        venue: period.venue_name,
                        venue_id: period.venue_id
                    }))
                };
            });

            renderModulePeriodsTable(modulesWithPeriods);
        } catch (error) {
            console.error('Error fetching data:', error);
            if (modulePeriodsTableBody) {
                modulePeriodsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Error loading data. Please try again.</td></tr>';
            }
        }
    }

    // Helper function to extract day from datetime string
    function extractDayFromTime(timeString) {
        if (!timeString) return 'Unknown';
        const date = new Date(timeString);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    // Helper function to format time range
    function formatTimeRange(startTimeString, endTimeString) {
        if (!startTimeString) return 'Unknown';
        const startDate = new Date(startTimeString);
        const endDate = new Date(endTimeString);
        const startTime = startDate.toTimeString().substring(0, 5);
        const endTime = endDate.toTimeString().substring(0, 5);
        return `${startTime} - ${endTime}`;
    }

    function renderModulePeriodsTable(modules) {
        if (!modulePeriodsTableBody) return;
        modulePeriodsTableBody.innerHTML = '';
        
        if (modules.length === 0) {
            modulePeriodsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No modules found</td></tr>';
            return;
        }

        modules.forEach(module => {
            let periodsContent;
            if (module.periods.length > 0) {
                const periodsHtml = module.periods.map(period => 
                    `<li>${period.day}: ${period.time} (${period.venue})</li>`
                ).join('');
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
                    <button class="image-btn edit-btn" data-module-code="${module.code}">
                        <img src="static/images/Edit.png" alt="Edit" class="action-icon">
                    </button>
                </td>
            `;
            // Edit button navigates to edit page with module code param
            row.querySelector('.edit-btn').addEventListener('click', (e) => {
                const moduleCode = e.target.closest('.edit-btn').dataset.moduleCode;
                window.location.href = `period_edit.html?code=${moduleCode}`;
            });
            modulePeriodsTableBody.appendChild(row);
        });
    }

    function searchModulePeriods() {
        if (!searchInput) return;
        const query = searchInput.value.toLowerCase();
        
        // Re-fetch and filter data
        fetchData().then(() => {
            const modulesWithPeriods = allModules.map(module => {
                const modulePeriods = allPeriods.filter(period => 
                    period.module_codes && period.module_codes.includes(module.code)
                );
                
                return {
                    code: module.code,
                    name: module.name,
                    periods: modulePeriods.map(period => ({
                        id: period.id,
                        period_id: period.period_id,
                        day: extractDayFromTime(period.period_start_time),
                        time: formatTimeRange(period.period_start_time, period.period_end_time),
                        venue: period.venue_name,
                        venue_id: period.venue_id
                    }))
                };
            });

            const filteredModules = modulesWithPeriods.filter(module => 
                module.code.toLowerCase().includes(query) || 
                module.name.toLowerCase().includes(query) ||
                module.periods.some(period => 
                    (period.day && period.day.toLowerCase().includes(query)) || 
                    (period.time && period.time.toLowerCase().includes(query)) || 
                    (period.venue && period.venue.toLowerCase().includes(query))
                )
            );
            renderModulePeriodsTable(filteredModules);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', searchModulePeriods);
    }

    // Initial load
    fetchData();

    // ======= Edit Module Period Page Logic =======
    const editPeriodForm = document.getElementById('edit-period-form');
    const periodsContainer = document.getElementById('periods-container');
    const addPeriodBtn = document.getElementById('add-period-btn');
    const moduleCodeInput = document.getElementById('module-code');
    const moduleNameInput = document.getElementById('module-name');
    
    let periodCounter = document.querySelectorAll('.period-entry').length;
    let currentModuleCode = '';
    let currentModule = null;
    let existingPeriods = [];
    let availableVenues = [];

    const daysOfTheWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Load module and period data when page loads
    async function loadModuleData() {
        const urlParams = new URLSearchParams(window.location.search);
        currentModuleCode = urlParams.get('code');
        
        if (!currentModuleCode) {
            alert('No module code provided');
            window.location.href = 'period.html';
            return;
        }

        try {
            // Fetch module, periods, and venues data
            const [modulesResponse, periodsResponse, venuesResponse] = await Promise.all([
                fetch('/api/modules'),
                fetch('/api/periods'),
                fetch('/api/venues')
            ]);

            if (!modulesResponse.ok || !periodsResponse.ok || !venuesResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const modules = await modulesResponse.json();
            const periods = await periodsResponse.json();
            availableVenues = await venuesResponse.json();

            // Find current module
            currentModule = modules.find(m => m.code === currentModuleCode);
            if (!currentModule) {
                alert('Module not found');
                window.location.href = 'period.html';
                return;
            }

            // Update module info in form
            if (moduleCodeInput) moduleCodeInput.value = currentModule.code;
            if (moduleNameInput) moduleNameInput.value = currentModule.name;

            // Get existing periods for this module
            existingPeriods = periods.filter(period => 
                period.module_codes && period.module_codes.includes(currentModuleCode)
            );

            // Load existing periods into form
            loadExistingPeriods();

        } catch (error) {
            console.error('Error loading module data:', error);
            alert('Error loading module data. Please try again.');
        }
    }

    // Load existing periods into the form
    function loadExistingPeriods() {
        if (existingPeriods.length === 0) {
            // No existing periods, keep the default period entry
            populateSelects();
            return;
        }

        // Clear existing period entries
        const existingEntries = document.querySelectorAll('.period-entry');
        existingEntries.forEach(entry => entry.remove());

        // Add period entries for existing periods
        existingPeriods.forEach((period, index) => {
            const periodStartDate = new Date(period.period_start_time);
            const day = daysOfTheWeek[periodStartDate.getDay()];
            const startTime = periodStartDate.toTimeString().substring(0, 5);
            const endTime = new Date(period.period_end_time).toTimeString().substring(0, 5);

            addPeriodEntry(index + 1, day, period.period_start_time, period.period_end_time, period.venue_id);
        });

        periodCounter = existingPeriods.length;
        populateSelects();
    }

    // Initialize module data when page loads
    if (editPeriodForm) {
        loadModuleData();
    }

    function createPeriodTemplate(count, day = '', startTime = '', endTime = '', venueId = '') {
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

    // Helper function to add period entry with data
    function addPeriodEntry(count, day = '', startTime = '', endTime = '', venueId = '') {
        const newPeriodElement = createPeriodTemplate(count, day, startTime, endTime, venueId);
        const addBtnContainer = document.querySelector('.add-period-btn-container');
        if (addBtnContainer) {
            periodsContainer.insertBefore(newPeriodElement, addBtnContainer);
        } else {
            periodsContainer.appendChild(newPeriodElement);
        }
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
            const selectedVenueId = select.value;
            select.innerHTML = '<option value="">Select a Venue</option>';
            availableVenues.forEach(venue => {
                const option = document.createElement('option');
                option.value = venue.id;
                option.textContent = `${venue.name} (${venue.block}, ${venue.campus})`;
                if (venue.id == selectedVenueId) option.selected = true;
                select.appendChild(option);
            });
        });
    }

    function addPeriod() {
        periodCounter++;
        addPeriodEntry(periodCounter);
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
        editPeriodForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!checkForConflicts()) {
                return;
            }

            try {
                // Get all period entries from the form
                const periodEntries = document.querySelectorAll('.period-entry');
                const periods = [];

                for (let i = 0; i < periodEntries.length; i++) {
                    const entry = periodEntries[i];
                    const day = entry.querySelector('.period-day-select').value;
                    const startTime = entry.querySelector('input[type="time"][name^="time-start"]').value;
                    const endTime = entry.querySelector('input[type="time"][name^="time-end"]').value;
                    const venueId = entry.querySelector('.period-venue-select').value;

                    if (day && startTime && endTime && venueId) {
                        // Create datetime string for the period
                        const dayIndex = daysOfTheWeek.indexOf(day);
                        const [startHours, startMinutes] = startTime.split(':').map(Number);
                        const [endHours, endMinutes] = endTime.split(':').map(Number);

                        // Create a date for this week (Monday = 1, Sunday = 0)
                        const today = new Date();
                        const currentDay = today.getDay();
                        const daysUntilTarget = (dayIndex === 0 ? 7 : dayIndex) - currentDay;
                        const targetStartDate = new Date(today);
                        targetStartDate.setDate(today.getDate() + daysUntilTarget);
                        targetStartDate.setHours(startHours, startMinutes, 0, 0);

                        const targetEndDate = new Date(targetStartDate);
                        targetEndDate.setDate(targetStartDate.getDate());
                        targetEndDate.setHours(endHours, endMinutes, 0, 0);

                        const periodId = `${currentModuleCode}-${day}-${targetStartDate.getHours()}${targetStartDate.getMinutes()}`;
                        
                        periods.push({
                            period_id: periodId,
                            class_register: `${currentModuleCode}-2-${new Date().getFullYear()}`, // Default register ID
                            day_of_week: day,
                            period_start_time: startTime, 
                            period_end_time: endTime,
                            period_venue_id: parseInt(venueId)
                        });
                    }
                }

                // Delete existing periods for this module first
                for (const existingPeriod of existingPeriods) {
                    try {
                        await fetch(`/api/periods/${existingPeriod.period_id}`, {
                            method: 'DELETE'
                        });
                    } catch (error) {
                        console.warn('Could not delete existing period:', error);
                    }
                }

                // Add new periods
                for (const period of periods) {
                    const response = await fetch('/api/periods', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(period)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to save period');
                    }
                }

                alert('Periods saved successfully!');
                window.location.href = 'period.html';
            } catch (error) {
                console.error('Error saving periods:', error);
                alert(`Error saving periods: ${error.message}`);
            }
        });
    }

    populateSelects();
});
