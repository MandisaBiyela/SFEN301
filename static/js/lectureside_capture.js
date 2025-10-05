// --- Configuration ---
const MOCK_STUDENT_IDS = ['22383677', '19045123', '20199876', '18005555'];
// Set to track students already marked present
const attendanceRecords = new Set();
let recognitionLoopInterval = null;

// --- DOM Elements ---
const videoFeed = document.getElementById('video-feed');
const statusMessage = document.getElementById('status-message');
const attendanceLog = document.getElementById('attendance-log');
const backButton = document.getElementById('back-button');
const profileBtn = document.getElementById('profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const dutLogoLink = document.getElementById('dut-logo-link'); // NEW: For the pressable logo

const modalBox = document.getElementById('modal-box');
const modalText = document.getElementById('modal-text');
const modalCloseBtn = document.getElementById('modal-close-btn'); // This is the 'Yes' button
const modalNoBtn = document.getElementById('modal-no-btn'); // The 'No' button

// --- Utility Functions ---

/**
 * Displays a custom modal box instead of using the native alert/confirm.
 * @param {string} message - The message to display.
 */
function showModal(message) {
    modalText.textContent = message;
    modalBox.classList.remove('hidden');
    // Ensure both buttons are visible when modal is shown for a confirmation prompt
    if (message.includes('Are you sure you want to log out?')) {
        modalCloseBtn.style.display = 'inline-block';
        modalNoBtn.style.display = 'inline-block';
    } else {
        // For simple notification modals (like the profile link one), only show Yes/Close
        modalCloseBtn.style.display = 'inline-block';
        modalNoBtn.style.display = 'none';
    }
}

/**
 * Hides the custom modal box.
 */
function hideModal() {
    modalBox.classList.add('hidden');
}


/**
 * Updates the status overlay message.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('initial', 'present', 'unidentifiable', 'already-present').
 */
function updateStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'message-text ' + type + '-message';
}

/**
 * Adds an entry to the attendance log.
 * @param {string} entry - The log text.
 * @param {boolean} success - True if attendance was marked, false otherwise.
 */
function logAttendance(entry, success) {
    const li = document.createElement('li');
    li.textContent = entry;
    li.style.color = success ? '#3ca087' : '#e74c3c';
    
    // Prepend the new log entry
    if (attendanceLog.firstChild) {
        attendanceLog.insertBefore(li, attendanceLog.firstChild);
    } else {
        attendanceLog.appendChild(li);
    }
    
    // Keep log limited to 10 entries for cleanliness
    while (attendanceLog.children.length > 10) {
        attendanceLog.removeChild(attendanceLog.lastChild);
    }
}


/**
 * --- MOCK FACIAL RECOGNITION LOGIC ---
 * This function simulates calling a facial recognition API.
 * It randomly returns a recognized ID or null (unidentified).
 */
function mockFacialRecognition() {
    // 10% chance of no face or unidentified
    const chance = Math.random();
    if (chance < 0.1) {
        return null; // Face unidentifiable
    }

    // 90% chance of recognizing a random student
    const randomIndex = Math.floor(Math.random() * MOCK_STUDENT_IDS.length);
    return MOCK_STUDENT_IDS[randomIndex];
}


/**
 * Main attendance marking loop logic.
 */
function runAttendanceCheck() {
    const recognizedId = mockFacialRecognition();

    if (recognizedId) {
        if (attendanceRecords.has(recognizedId)) {
            // Case 1: Already marked present
            updateStatus(`Student ${recognizedId}: You have already been marked present`, 'already-present');
            logAttendance(`⚠️ ${recognizedId} tried checking in again.`, false);
        } else {
            // Case 2: New student recognized and marked present
            attendanceRecords.add(recognizedId);
            updateStatus(`Student ${recognizedId} marked present`, 'present');
            logAttendance(`✅ ${recognizedId} marked present.`, true);
        }
    } else {
        // Case 3: Face unidentifiable or not present
        updateStatus('Face unidentifiable, please try again.', 'unidentifiable');
    }

    // After processing, reset the status back to 'Awaiting' after a short delay
    setTimeout(() => {
        updateStatus('Awaiting Facial Presence...', 'initial');
    }, 2500); // Display the result for 2.5 seconds
}


// --- Initialization and Event Listeners ---

/**
 * Initializes the camera stream and starts the recognition loop.
 */
async function initializeCamera() {
    updateStatus('Requesting camera access...', 'initial');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoFeed.srcObject = stream;
        
        videoFeed.onloadedmetadata = () => {
            videoFeed.play();
            updateStatus('Awaiting Facial Presence...', 'initial');

            // Start the mock recognition loop only after video is playing
            if (!recognitionLoopInterval) {
                // Check every 3 seconds for a face
                recognitionLoopInterval = setInterval(runAttendanceCheck, 3000); 
            }
        };
    } catch (err) {
        console.error('Error accessing the camera: ', err);
        updateStatus('CAMERA ERROR: Please allow camera access and refresh.', 'unidentifiable');
    }
}

// Start initialization on page load
window.onload = initializeCamera;


// Event listeners for header buttons
backButton.addEventListener('click', () => {
    // Stop the loop and the stream before navigating back
    clearInterval(recognitionLoopInterval);
    if (videoFeed.srcObject) {
        videoFeed.srcObject.getTracks().forEach(track => track.stop());
    }
    // Mock navigation back (in a real app, this would redirect)
    window.history.back();
});

profileBtn.addEventListener('click', () => {
    // REDIRECTION: Profile button takes user to lectureside_profile.html
    clearInterval(recognitionLoopInterval);
    if (videoFeed.srcObject) {
        videoFeed.srcObject.getTracks().forEach(track => track.stop());
    }
    window.location.href = 'lectureside_profile.html';
});

logoutBtn.addEventListener('click', () => {
    // Confirmation prompt (shows both Yes/No buttons via showModal logic)
    showModal('Are you sure you want to log out?');
});

// Event listener for the DUT Logo link (if it's in the DOM, which we ensure in HTML update)
if (dutLogoLink) {
    dutLogoLink.addEventListener('click', (e) => {
        // Stop camera and loop before navigation
        clearInterval(recognitionLoopInterval);
        if (videoFeed.srcObject) {
            videoFeed.srcObject.getTracks().forEach(track => track.stop());
        }
        // REDIRECTION: DUT logo takes user to lectureside_dashboard.html
        window.location.href = 'lectureside_dashboard.html';
    });
}


// Event listener for the modal 'Yes' button (Logout Confirmation)
modalCloseBtn.addEventListener('click', () => {
    if (modalText.textContent.includes('Are you sure you want to log out?')) {
        // Stop camera and loop
        clearInterval(recognitionLoopInterval);
        if (videoFeed.srcObject) {
            videoFeed.srcObject.getTracks().forEach(track => track.stop());
        }
        // REDIRECTION: Logout Yes button takes user to the root login page
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/'; 
    }
    hideModal();
});

// Event listener for the modal 'No' button
if (modalNoBtn) {
    modalNoBtn.addEventListener('click', () => {
        // Simply hide the modal and stay on the current page
        hideModal();
    });
}
