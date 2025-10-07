// --- Configuration ---
let recognitionInterval = null; // To hold the setInterval ID
let isProcessing = false; // Flag to prevent multiple simultaneous API calls
const CAPTURE_INTERVAL_MS = 3000; // Capture and send a frame every 3 seconds

// --- DOM Elements ---
const videoFeed = document.getElementById('video-feed');
const statusMessage = document.getElementById('status-message');
const attendanceLog = document.getElementById('attendance-log');
const backButton = document.getElementById('back-button');
const profileBtn = document.getElementById('profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const dutLogoLink = document.getElementById('dut-logo-link');
const modalBox = document.getElementById('modal-box');
const modalText = document.getElementById('modal-text');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalNoBtn = document.getElementById('modal-no-btn');

// Create a canvas element in memory to capture frames
const canvas = document.createElement('canvas');

// --- Utility Functions ---

/**
 * Displays a custom modal box.
 * @param {string} message - The message to display.
 */
function showModal(message) {
    modalText.textContent = message;
    modalBox.classList.remove('hidden');
    if (message.includes('Are you sure you want to log out?')) {
        modalCloseBtn.style.display = 'inline-block';
        modalNoBtn.style.display = 'inline-block';
    } else {
        modalCloseBtn.style.display = 'inline-block';
        modalNoBtn.style.display = 'none';
    }
}

/** Hides the custom modal box. */
function hideModal() {
    modalBox.classList.add('hidden');
}

/**
 * Updates the status overlay message.
 * @param {string} message - The message to display.
 * @param {string} type - 'initial', 'present', 'unidentifiable', 'already-present', 'error'.
 */
function updateStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'message-text ' + type + '-message';
}

/**
 * Adds an entry to the attendance log.
 * @param {string} entry - The log text.
 * @param {string} type - 'success', 'warning', 'error'.
 */
function logAttendance(entry, type) {
    const li = document.createElement('li');
    li.textContent = entry;

    const colorMap = {
        success: '#3ca087', // Green
        warning: '#f39c12', // Yellow/Orange
        error: '#e74c3c'    // Red
    };
    li.style.color = colorMap[type] || '#f4f4f4'; // Default to white

    if (attendanceLog.firstChild) {
        attendanceLog.insertBefore(li, attendanceLog.firstChild);
    } else {
        attendanceLog.appendChild(li);
    }
    
    while (attendanceLog.children.length > 15) {
        attendanceLog.removeChild(attendanceLog.lastChild);
    }
}

// --- Core Attendance Logic ---

/**
 * Captures a frame from the video, sends it to the backend, and handles the response.
 */
async function processFrameForAttendance() {
    if (isProcessing) {
        return; // Don't send a new request if one is already in flight
    }
    isProcessing = true;

    // 1. Capture frame from video to canvas
    canvas.width = videoFeed.videoWidth;
    canvas.height = videoFeed.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);

    // 2. Get image data as Base64 string
    const imageDataUrl = canvas.toDataURL('image/jpeg');

    try {
        // 3. Send image data to the backend API
        const response = await fetch('/api/mark_attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image_data: imageDataUrl }),
        })

        const result = await response.json();
        console.log('Server response:', result); // Log the result here
        // 4. Process the response from the backend
        switch (result.status) {
            case 'present':
                updateStatus(`Welcome, ${result.student_name}! Marked present.`, 'present');
                logAttendance(`✅ ${result.student_name} (${result.student_id}) marked present.`, 'success');
                break;
            case 'already_present':
                updateStatus(`${result.student_name} is already marked present.`, 'already-present');
                logAttendance(`⚠️ ${result.student_name} (${result.student_id}) already present.`, 'warning');
                break;
            case 'unidentifiable':
                updateStatus(`${result.message}`, 'unidentifiable');
                break;
            case 'no_active_period':
                updateStatus(result.message, 'error');
                logAttendance(`❌ System paused: ${result.message}`, 'error');
                // Stop the loop if there's no active class
                if (recognitionInterval) clearInterval(recognitionInterval); 
                break;
            default:
                 updateStatus('An unknown response was received.', 'error');
                 break;
        }

    } catch (error) {
        console.error('Error sending frame for recognition:', error);
        updateStatus('Connection error. Could not reach server.', 'error');
        logAttendance('❌ Network or Server Error.', 'error');
        // Stop the loop on connection error to prevent spamming
        if (recognitionInterval) clearInterval(recognitionInterval); 
    } finally {
        // 5. Reset status and allow the next API call
        setTimeout(() => {
            if (videoFeed.srcObject) { // Only reset if camera is still active
                updateStatus('Awaiting Facial Presence...', 'initial');
            }
            isProcessing = false;
        }, 2000); // Display result for 2 seconds before resetting
    }
}

// --- Initialization and Event Listeners ---
/**
 * Stops the camera and the recognition interval.
 */
function stopCameraAndLoop() {
    if (recognitionInterval) {
        clearInterval(recognitionInterval);
        recognitionInterval = null;
    }
    if (videoFeed.srcObject) {
        videoFeed.srcObject.getTracks().forEach(track => track.stop());
        videoFeed.srcObject = null;
    }
}

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
            logAttendance('System initialized. Starting face scan...', 'success');

            // Start the recognition loop
            if (!recognitionInterval) {
                recognitionInterval = setInterval(processFrameForAttendance, CAPTURE_INTERVAL_MS);
            }
        };
    } catch (err) {
        console.error('Error accessing the camera: ', err);
        updateStatus('CAMERA ERROR: Please allow camera access and refresh.', 'error');
        logAttendance('❌ Failed to access camera. Check browser permissions.', 'error');
    }
}

// Start initialization on page load
window.onload = initializeCamera;

// Stop camera when the user navigates away from the page
window.onbeforeunload = stopCameraAndLoop;

// Event listeners for header/navigation buttons
backButton.addEventListener('click', () => {
    stopCameraAndLoop();
    window.history.back();
});

profileBtn.addEventListener('click', () => {
    stopCameraAndLoop();
    window.location.href = 'lectureside_profile.html';
});

if (dutLogoLink) {
    dutLogoLink.addEventListener('click', (e) => {
        stopCameraAndLoop();
        window.location.href = 'lectureside_dashboard.html';
    });
}

logoutBtn.addEventListener('click', () => {
    showModal('Are you sure you want to log out?');
});

modalCloseBtn.addEventListener('click', () => {
    if (modalText.textContent.includes('Are you sure you want to log out?')) {
        stopCameraAndLoop();
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/'; 
    }
    hideModal();
});

if (modalNoBtn) {
    modalNoBtn.addEventListener('click', () => {
        hideModal();
    });
}