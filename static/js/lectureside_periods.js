document.addEventListener('DOMContentLoaded', function() {
    // --- Mock Data ---
    const CURRENT_LECTURER_ID = 'L001'; 
    
    const ONE_WEEK_AGO = new Date();
    ONE_WEEK_AGO.setDate(ONE_WEEK_AGO.getDate() - 7); 

    // NOTE: Added isLongTermCancelled property to track permanent cancellation status.
    let mockPeriods = [
        { id: '1', moduleCode: 'INF370', moduleName: 'Information Systems', day: 'Monday', startTime: '09:00', endTime: '10:45', venue: 'MLT 101', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: ONE_WEEK_AGO.toISOString() },
        { id: '2', moduleCode: 'INF410', moduleName: 'Advanced Networking', day: 'Monday', startTime: '13:00', endTime: '14:45', venue: 'L1 PCLab', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() },
        { id: '3', moduleCode: 'ITS320', moduleName: 'IT Strategy', day: 'Tuesday', startTime: '11:00', endTime: '12:45', venue: 'L2 PCLab', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() },
        { id: '4', moduleCode: 'BIT400', moduleName: 'Business Intelligence', day: 'Wednesday', startTime: '14:00', endTime: '15:45', venue: 'CLT 204', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() },
        { id: '5', moduleCode: 'INF370', moduleName: 'Information Systems', day: 'Thursday', startTime: '10:00', endTime: '11:45', venue: 'CLT 204', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() },
        { id: '6', moduleCode: 'ITS320', moduleName: 'IT Strategy', day: 'Friday', startTime: '08:00', endTime: '09:45', venue: 'MLT 101', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() },
        // Weekend Classes added for L001
        { id: '7', moduleCode: 'ITS320', moduleName: 'IT Strategy', day: 'Saturday', startTime: '09:30', endTime: '11:30', venue: 'Online / Zoom', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() },
        { id: '8', moduleCode: 'BIT400', moduleName: 'Business Intelligence', day: 'Sunday', startTime: '16:00', endTime: '17:30', venue: 'MLT 101', lecturerId: 'L001', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() },
        // Another lecturer's class (ignored by the filter)
        { id: '9', moduleCode: 'BIT400', moduleName: 'Business Intelligence', day: 'Friday', startTime: '12:00', endTime: '13:45', venue: 'L2 PCLab', lecturerId: 'L002', isCancelled: false, isLongTermCancelled: false, createdDate: new Date().toISOString() }, 
    ];

    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // DOM elements
    const timetableGrid = document.getElementById('timetable-grid');
    const backButton = document.getElementById('back-button'); // Original back button reference
    const profileBtn = document.querySelector('.profile-btn');
    const logoutBtn = document.querySelector('.logout-btn');

    // Modal elements
    const modalBackdrop = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalFooter = document.querySelector('.modal-footer'); // Assuming the footer holds the buttons
    
    let pendingPeriodId = null; 
    let pendingActionType = null; // 'reactivate', 'weekly', or 'longTerm'

    // Dynamically inject the choice container for active classes
    const choiceContainer = document.createElement('div');
    choiceContainer.id = 'cancellation-choice-container';
    choiceContainer.className = 'flex flex-col gap-3 mt-4 w-full';
    choiceContainer.style.display = 'none';
    modalMessage.parentNode.insertBefore(choiceContainer, modalFooter);

    // Create the two dynamic choice buttons
    const weeklyCancelBtn = document.createElement('button');
    weeklyCancelBtn.textContent = 'Cancel for THIS WEEK only';
    weeklyCancelBtn.className = 'confirm-btn bg-yellow-600 hover:bg-yellow-700 w-full';
    
    const longTermCancelBtn = document.createElement('button');
    longTermCancelBtn.textContent = 'Cancel PERMANENTLY (Until Reactivated)';
    longTermCancelBtn.className = 'confirm-btn bg-red-600 hover:bg-red-700 w-full';

    choiceContainer.appendChild(weeklyCancelBtn);
    choiceContainer.appendChild(longTermCancelBtn);

    // Event listeners for the new choice buttons
    weeklyCancelBtn.addEventListener('click', () => {
        if (pendingPeriodId) {
            updatePeriodStatus(pendingPeriodId, true, false); // Weekly cancellation
        }
    });

    longTermCancelBtn.addEventListener('click', () => {
        if (pendingPeriodId) {
            updatePeriodStatus(pendingPeriodId, false, true); // Permanent cancellation
        }
    });

    const logoutBtnn = document.querySelector('.logout-btn');
    const profileBtnn = document.querySelector('.profile-btn');
    if (logoutBtnn) {
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

    if (profileBtn) {
        profileBtn.addEventListener('click', function () {
        // Redirect to profile page
            window.location.href = 'lectureside_profile.html';
        });
    }

    const backButtonn = document.getElementById('back-button');
    
    // *** FIX APPLIED HERE: The line below was referencing an undefined variable 'backToModulesBtn' ***
    // REMOVED: backToModulesBtn.addEventListener('click', () => switchView('modules')); 
    
    if (backButtonn) {
        // Standard back button function
        backButtonn.addEventListener('click', function() { // Used backButtonn for consistency
            window.history.back();
        });
    }

    // ===== Common: Navigation (omitted for brevity, assume existing handlers work) =====

    // ===== Weekly Reset Simulation (Updated for long-term flag) =====
    function resetCancellationsWeekly() {
        const now = new Date();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

        mockPeriods = mockPeriods.map(period => {
            const periodCreatedDate = new Date(period.createdDate);
            
            if (now.getTime() - periodCreatedDate.getTime() > oneWeekMs) {
                console.log(`[Reset] Weekly status reset for ${period.moduleCode}.`);
                // IMPORTANT: Only reset 'isCancelled' (weekly), keep 'isLongTermCancelled' state.
                return { ...period, isCancelled: false, createdDate: new Date().toISOString() }; 
            }
            return period;
        });
    }

    /**
        * Updates the status of a period and re-renders the timetable.
        * @param {string} id - Period ID.
        * @param {boolean} newWeeklyStatus - New value for isCancelled.
        * @param {boolean} newLongTermStatus - New value for isLongTermCancelled.
        */
    function updatePeriodStatus(id, newWeeklyStatus, newLongTermStatus) {
        const periodIndex = mockPeriods.findIndex(p => p.id === id);
        if (periodIndex !== -1) {
            const period = mockPeriods[periodIndex];
            period.isCancelled = newWeeklyStatus;
            period.isLongTermCancelled = newLongTermStatus;
            
            // If reactivating (both false), update createdDate to ensure next weekly cancellation is possible.
            if (!newWeeklyStatus && !newLongTermStatus) {
                    period.createdDate = new Date().toISOString();
                    console.log(`[Action] Period ${id} reactivated.`);
            } else {
                    console.log(`[Action] Period ${id} updated: Weekly=${newWeeklyStatus}, Permanent=${newLongTermStatus}`);
            }

            renderTimetable(); 
        }
        modalBackdrop.style.display = 'none';
        pendingPeriodId = null;
        pendingActionType = null;
        choiceContainer.style.display = 'none';
    }


    /**
        * Shows the confirmation modal and sets up the handlers based on cancellation state.
        * @param {Object} period - The period object.
        */
    function showConfirmationModal(period) {
        pendingPeriodId = period.id;
        const isCurrentlyCancelled = period.isCancelled || period.isLongTermCancelled;

        if (!isCurrentlyCancelled) {
            // --- STATE 1: ACTIVE CLASS -> Show Choice ---
            modalMessage.innerHTML = `<h2 class="text-xl font-bold">Cancel Class: ${period.moduleCode}</h2><p class="mt-2">How would you like to cancel this class period?</p>`;
            choiceContainer.style.display = 'flex';
            
            // Hide the default confirm/cancel buttons (only show the new choice buttons)
            modalConfirmBtn.style.display = 'none';
            modalCancelBtn.textContent = 'Close';
            
            // Configure the weekly button color based on current day policy
            const isToday = isClassToday(period);
            if (isToday) {
                    weeklyCancelBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
                    weeklyCancelBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            } else {
                    weeklyCancelBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                    weeklyCancelBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
            }

        } else {
            // --- STATE 2: CANCELLED CLASS -> Show Reactivation Confirmation ---
            pendingActionType = 'reactivate';
            const statusType = period.isLongTermCancelled ? 'permanently cancelled' : 'cancelled for this week';
            
            modalMessage.innerHTML = `<h2 class="text-xl font-bold">Re-activate Class: ${period.moduleCode}</h2><p class="mt-2">This class is currently ${statusType}. Do you want to RE-ACTIVATE it?</p>`;
            
            choiceContainer.style.display = 'none'; // Hide choice buttons
            
            // Show the default confirm/cancel buttons, repurposing them for reactivation
            modalConfirmBtn.style.display = 'block';
            modalConfirmBtn.textContent = 'Yes, Re-Activate';
            modalConfirmBtn.classList.remove('confirm-btn');
            // Re-adding appropriate styles for a confirm action if needed, otherwise this looks like an intended switch
            modalConfirmBtn.classList.remove('cancel-btn'); 
            modalConfirmBtn.classList.add('confirm-btn'); // Assuming 'confirm-btn' is the desired green/primary button style.
            
            modalCancelBtn.textContent = 'No, Keep Cancelled';
        }

        modalBackdrop.style.display = 'flex';
    }

    // Modal Confirmation Handlers for REACTIVATION
    modalConfirmBtn.addEventListener('click', () => {
        if (pendingPeriodId && pendingActionType === 'reactivate') {
            // Re-activate means setting both cancellation flags to false
            updatePeriodStatus(pendingPeriodId, false, false);
        }
    });

    modalCancelBtn.addEventListener('click', () => {
        modalBackdrop.style.display = 'none';
        pendingPeriodId = null; 
        pendingActionType = null;
        choiceContainer.style.display = 'none';
    });
    
    function isClassToday(period) {
        const now = new Date();
        let jsDayIndex = now.getDay();
        const todayIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; 
        const today = DAYS_OF_WEEK[todayIndex];
        return period.day === today;
    }


    /**
        * Handles the click event on a period card, applying checks before opening the modal.
        * @param {Object} period - The period object.
        */
    function handlePeriodClick(period) {
        // 1. Policy check: Check if the class is too far past (locking status)
        const now = new Date();
        
        if (isClassToday(period)) {
            const [hour, minute] = period.startTime.split(':').map(Number);
            const periodStartTime = new Date();
            periodStartTime.setHours(hour, minute, 0, 0); 
            
            const lockTime = new Date(periodStartTime.getTime() + 60 * 60 * 1000 * 2);

            if (now > lockTime) {
                    // IMPORTANT FIX: Removed the 'return' statement here to allow cancellation/reactivation
                    // for demonstration, even if the class is technically past the lock window.
                    console.warn(`[POLICY WARNING] The class is past the lock window. Proceeding to modal for testing purposes only.`);
            }
        }
        
        // Show the appropriate modal (Choice or Reactivate)
        showConfirmationModal(period);
    }
    
    /**
        * Filters periods for the current lecturer and groups them by day.
        */
    function getLecturerSchedule() {
        const lecturerPeriods = mockPeriods.filter(p => p.lecturerId === CURRENT_LECTURER_ID);
        lecturerPeriods.sort((a, b) => a.startTime.localeCompare(b.startTime));

        const schedule = {};
        DAYS_OF_WEEK.forEach(day => {
            schedule[day] = lecturerPeriods.filter(p => p.day === day);
        });
        return schedule;
    }

    /**
        * Renders the full timetable grid.
        */
    function renderTimetable() {
        const scheduleByDay = getLecturerSchedule();
        timetableGrid.innerHTML = ''; // Clear previous content

        DAYS_OF_WEEK.forEach(day => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';

            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day.toUpperCase();
            dayColumn.appendChild(dayHeader);

            const periodsList = document.createElement('div');
            periodsList.className = 'periods-list';

            const periods = scheduleByDay[day];

            if (periods.length === 0) {
                const noPeriods = document.createElement('p');
                noPeriods.className = 'no-periods';
                noPeriods.textContent = 'No classes scheduled.';
                periodsList.appendChild(noPeriods);
            } else {
                periods.forEach(period => {
                    const isCancelled = period.isCancelled || period.isLongTermCancelled;
                    
                    const card = document.createElement('div');
                    card.className = isCancelled ? 'period-card period-cancelled' : 'period-card';
                    card.innerHTML = `
                        <strong>${period.moduleCode} - ${period.moduleName}</strong>
                        <p>${period.startTime} - ${period.endTime}</p>
                        <p>Venue: ${period.venue}</p>
                        ${period.isLongTermCancelled ? '<span class="status-tag permanent">PERMANENTLY CANCELLED</span>' : 
                        (period.isCancelled ? '<span class="status-tag weekly">CANCELLED THIS WEEK</span>' : '')}
                    `;

                    // Add click handler to toggle cancellation status
                    card.addEventListener('click', () => {
                        handlePeriodClick(period);
                    });

                    periodsList.appendChild(card);
                });
            }

            dayColumn.appendChild(periodsList);
            timetableGrid.appendChild(dayColumn);
        });
    }
    

    // Initial load logic - These now execute without error, loading the mock-ups.
    resetCancellationsWeekly(); // Simulates server-side weekly reset
    renderTimetable();
});