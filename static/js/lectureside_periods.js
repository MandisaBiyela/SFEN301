document.addEventListener('DOMContentLoaded', function() {

    let allPeriods = []; // This will hold the data from the API
    
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click',handleLogout);
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', function () {
        // Redirect to profile page
            window.location.href = 'lectureside_profile.html';
        });
    }
    // Standard back button function
    if (backButton) backButton.addEventListener('click', () => window.history.back());
 

    // --- API Data Fetching ---
    /**
     * Fetches the lecturer's periods from the backend.
     */
    async function fetchLecturerPeriods() {
        try {
            const response = await fetch('/api/lecturer/periods');
            if (!response.ok) {
                throw new Error('Could not load timetable from server.');
            }
            const periods = await response.json();
            // Add client-side state for cancellation simulation
            return periods.map(p => ({
                ...p,
                isCancelled: false,
                isLongTermCancelled: false
            }));
        } catch (error) {
            console.error('Error fetching periods:', error);
            timetableGrid.innerHTML = `<p class="text-red-500 p-4">${error.message}</p>`;
            return [];
        }
    }

    // --- Core Logic ---

    /**
     * NOTE: This function is a CLIENT-SIDE SIMULATION.
     * Changes are NOT saved to the database and will reset on page refresh.
     * A backend endpoint is required for persistence.
     */
    function updatePeriodStatus(id, newWeeklyStatus, newLongTermStatus) {
        const periodIndex = allPeriods.findIndex(p => p.id.toString() === id.toString());
        if (periodIndex !== -1) {
            const period = allPeriods[periodIndex];
            period.isCancelled = newWeeklyStatus;
            period.isLongTermCancelled = newLongTermStatus;
            
            console.log(`[SIMULATION] Period ${id} updated: Weekly=${newWeeklyStatus}, Permanent=${newLongTermStatus}`);
            renderTimetable();
        }
        modalBackdrop.style.display = 'none';
        pendingPeriodId = null;
        pendingActionType = null;
        choiceContainer.style.display = 'none';
    }

    /**
     * Renders the full timetable grid from the `allPeriods` state variable.
     */
    function renderTimetable() {
        // Group periods by day
        const scheduleByDay = {};
        DAYS_OF_WEEK.forEach(day => {
            scheduleByDay[day] = allPeriods
                .filter(p => p.day_of_week === day)
                .sort((a, b) => a.period_start_time.localeCompare(b.period_start_time));
        });

        timetableGrid.innerHTML = ''; // Clear previous content
        DAYS_OF_WEEK.forEach(day => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.innerHTML = `<div class="day-header">${day.toUpperCase()}</div>`;
            
            const periodsList = document.createElement('div');
            periodsList.className = 'periods-list';

            const periods = scheduleByDay[day];

            if (periods.length === 0) {
                periodsList.innerHTML = '<p class="no-periods">No classes scheduled.</p>';
            } else {
                periods.forEach(period => {
                    const isCancelled = period.isCancelled || period.isLongTermCancelled;
                    const card = document.createElement('div');
                    card.className = isCancelled ? 'period-card period-cancelled' : 'period-card';
                    card.innerHTML = `
                        <strong>${period.module_code} - ${period.module_name}</strong>
                        <p>${period.period_start_time} - ${period.period_end_time}</p>
                        <p>Venue: ${period.venue_name}</p>
                        ${period.isLongTermCancelled ? '<span class="status-tag permanent">PERMANENTLY CANCELLED</span>' : 
                        (period.isCancelled ? '<span class="status-tag weekly">CANCELLED THIS WEEK</span>' : '')}
                    `;
                    // card.addEventListener('click', () => handlePeriodClick(period));
                    periodsList.appendChild(card);
                });
            }
            dayColumn.appendChild(periodsList);
            timetableGrid.appendChild(dayColumn);
        });
    }

    // --- Event Handlers and Initialization ---

    async function handleLogout() {
      if (confirm("Are you sure you want to log out?")) {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
      }
    }
    
    async function initPage() {
        allPeriods = await fetchLecturerPeriods();
        renderTimetable();
    }

    /**
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
        */

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
    
    
    // Initialize the page
    initPage();
    // resetCancellationsWeekly(); // Simulates server-side weekly reset
});