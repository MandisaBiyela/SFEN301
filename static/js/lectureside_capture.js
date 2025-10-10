// --- Configuration ---
let recognitionInterval = null;
let isProcessing = false;
const CAPTURE_INTERVAL_MS = 3000;
let cameraInitialized = false;
let cameraInitializing = false;

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

const canvas = document.createElement('canvas');

// --- Utility Functions ---

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

function hideModal() {
    modalBox.classList.add('hidden');
}

function updateStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'message-text ' + type + '-message';
}

function logAttendance(entry, type) {
    const li = document.createElement('li');
    li.textContent = entry;

    const colorMap = {
        success: '#3ca087',
        warning: '#f39c12',
        error: '#e74c3c'
    };
    li.style.color = colorMap[type] || '#f4f4f4';

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

async function processFrameForAttendance() {
    if (isProcessing || !cameraInitialized) {
        return;
    }
    isProcessing = true;

    try {
        // Check if video is playing
        if (videoFeed.paused || videoFeed.ended) {
            isProcessing = false;
            return;
        }

        // Capture frame
        canvas.width = videoFeed.videoWidth;
        canvas.height = videoFeed.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL('image/jpeg');

        const response = await fetch('/api/mark_attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image_data: imageDataUrl }),
        });

        const result = await response.json();
        console.log('Server response:', result);

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
        if (recognitionInterval) clearInterval(recognitionInterval);
    } finally {
        setTimeout(() => {
            if (videoFeed.srcObject && cameraInitialized) {
                updateStatus('Awaiting Facial Presence...', 'initial');
            }
            isProcessing = false;
        }, 2000);
    }
}

// --- Camera Initialization ---

function stopCameraAndLoop() {
    if (recognitionInterval) {
        clearInterval(recognitionInterval);
        recognitionInterval = null;
    }

    if (videoFeed && videoFeed.srcObject) {
        try {
            videoFeed.srcObject.getTracks().forEach(track => {
                track.stop();
            });
            videoFeed.srcObject = null;
        } catch (e) {
            console.error('Error stopping camera:', e);
        }
    }

    cameraInitialized = false;
    cameraInitializing = false;
}

async function initializeCamera() {
    // Prevent multiple simultaneous initialization attempts
    if (cameraInitializing || cameraInitialized) {
        return;
    }

    cameraInitializing = true;
    updateStatus('Requesting camera access...', 'initial');

    try {
        // Use a more robust approach to get user media
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Verify stream has video tracks
        if (!stream.getVideoTracks().length) {
            throw new Error('No video tracks in stream');
        }

        // Set up the video element
        videoFeed.srcObject = stream;
        
        // Wait for metadata to load before playing
        videoFeed.onloadedmetadata = () => {
            videoFeed.play().then(() => {
                cameraInitialized = true;
                cameraInitializing = false;
                updateStatus('Awaiting Facial Presence...', 'initial');
                logAttendance('✅ System initialized. Starting face scan...', 'success');

                // Start recognition loop only after video is confirmed to be playing
                if (!recognitionInterval && cameraInitialized) {
                    recognitionInterval = setInterval(processFrameForAttendance, CAPTURE_INTERVAL_MS);
                }
            }).catch(err => {
                console.error('Error playing video:', err);
                cameraInitialized = false;
                cameraInitializing = false;
                updateStatus('ERROR: Failed to start video. Please refresh the page.', 'error');
                logAttendance('❌ Failed to start video playback.', 'error');
            });
        };

        // Handle stream errors
        videoFeed.onerror = (err) => {
            console.error('Video element error:', err);
            cameraInitialized = false;
            cameraInitializing = false;
            updateStatus('ERROR: Video playback error. Please refresh.', 'error');
        };

    } catch (err) {
        cameraInitialized = false;
        cameraInitializing = false;
        
        console.error('Error accessing camera:', err);

        // Provide specific error messages
        if (err.name === 'NotAllowedError') {
            updateStatus('CAMERA PERMISSION DENIED: Please allow camera access in your browser settings.', 'error');
            logAttendance('❌ Camera permission denied. Check browser settings.', 'error');
        } else if (err.name === 'NotFoundError') {
            updateStatus('CAMERA NOT FOUND: No camera detected on your device.', 'error');
            logAttendance('❌ No camera device found.', 'error');
        } else if (err.name === 'NotReadableError') {
            updateStatus('CAMERA ERROR: Camera is in use by another application.', 'error');
            logAttendance('❌ Camera is unavailable (may be in use).', 'error');
        } else {
            updateStatus('CAMERA ERROR: ' + err.message, 'error');
            logAttendance('❌ Camera initialization failed: ' + err.message, 'error');
        }

        // Retry after a delay
        setTimeout(() => {
            if (!cameraInitialized && !cameraInitializing) {
                console.log('Retrying camera initialization...');
                initializeCamera();
            }
        }, 3000);
    }
}

// --- Event Listeners ---

window.addEventListener('load', () => {
    // Give the page a moment to fully load before requesting permissions
    setTimeout(initializeCamera, 500);
});

window.addEventListener('beforeunload', stopCameraAndLoop);

window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause recording when tab is hidden
        if (recognitionInterval) {
            clearInterval(recognitionInterval);
            recognitionInterval = null;
        }
    } else {
        // Resume when tab becomes visible
        if (cameraInitialized && !recognitionInterval) {
            recognitionInterval = setInterval(processFrameForAttendance, CAPTURE_INTERVAL_MS);
        }
    }
});

// Navigation buttons
if (backButton) {
    backButton.addEventListener('click', () => {
        stopCameraAndLoop();
        window.history.back();
    });
}

if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        stopCameraAndLoop();
        window.location.href = 'lectureside_profile.html';
    });
}

if (dutLogoLink) {
    dutLogoLink.addEventListener('click', (e) => {
        e.preventDefault();
        stopCameraAndLoop();
        window.location.href = 'lectureside_dashboard.html';
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        showModal('Are you sure you want to log out?');
    });
}

if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', async () => {
        if (modalText.textContent.includes('Are you sure you want to log out?')) {
            stopCameraAndLoop();
            try {
                await fetch('/api/logout', { method: 'POST' });
            } catch (error) {
                console.error('API logout call failed, redirecting anyway.', error);
            } finally {
                window.location.href = '/';
            }
        } else {
            hideModal();
        }
    });
}

if (modalNoBtn) {
    modalNoBtn.addEventListener('click', () => {
        hideModal();
    });
}