async function fetchStudents() {
    const response = await fetch('/api/students');
    if (!response.ok) throw new Error('Failed to fetch students');
    return response.json();
}

async function fetchStudent(studentNumber) {
    const response = await fetch(`/api/students/${studentNumber}`);
    if (!response.ok) return null;
    return response.json();
}

async function fetchAllModules() {
    const response = await fetch('/api/modules');
    if (!response.ok) throw new Error('Failed to fetch modules');
    return response.json();
}

async function deleteStudent(studentNumber) {
    const response = await fetch(`/api/students/${studentNumber}`, { method: 'DELETE' });
    return response.ok;
}

async function registerFace(studentNumber, imageDataUrl) {
    const response = await fetch('/api/register_face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_number: studentNumber, image_data: imageDataUrl })
    });
    return response;
}

async function checkStudentExists(studentNumber) {
    if (!studentNumber || studentNumber.length !== 8) return null;
    
    try {
        const response = await fetch(`/api/students/check/${studentNumber}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error('Error checking student existence:', error);
        return null;
    }
}

// --- Global UI & Navigation ---
function showStatusMessage(message, type = 'success') {
    const container = document.getElementById('status-message-container');
    if (container) {
        container.textContent = message;
        container.className = `status-message-container ${type}`;
        container.style.display = 'block';
        setTimeout(() => { container.style.display = 'none'; }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('back-button')?.addEventListener('click', e => {
        e.preventDefault();
        window.history.back();
    });
    document.querySelector('.logout-btn')?.addEventListener('click', () => {
        if (confirm("Are you sure?")) window.location.href = '/';
    });
    document.querySelector('.profile-btn')?.addEventListener('click', () => {
        window.location.href = 'profile.html';
    });

    // --- Page-Specific Logic ---
    const pagePath = window.location.pathname;
    if (pagePath.includes('student.html')) {
        initStudentListPage();
    } else if (pagePath.includes('student_add.html')) {
        initAddStudentPage();
    } else if (pagePath.includes('student_edit.html')) {
        initEditStudentPage();
    }
});


// --- Student Management (List) Page ---
async function initStudentListPage() {
    const tableBody = document.getElementById('student-table-body');
    const searchInput = document.getElementById('student-search-input');
    let allStudents = [];
    let allModulesInfo = [];

    function renderStudents(studentsToRender) {
        tableBody.innerHTML = '';
        if (studentsToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No students found.</td></tr>';
            return;
        }
        studentsToRender.forEach(student => {
            const faceIdIconUrl = student.has_face_id ? '/static/images/YesFaceID.png' : '/static/images/NoFaceID.png';
            const moduleListHTML = student.modules.map(code => `<li>${code}</li>`).join('');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.student_number}</td>
                <td>${student.name}</td>
                <td>${student.surname}</td>
                <td><img src="${faceIdIconUrl}" alt="Face ID Status" class="face-id-icon"></td>
                <td class="module-list"><ul>${moduleListHTML}</ul></td>
                <td>
                    <a href="student_edit.html?number=${student.student_number}" class="image-btn edit-btn" title="Edit">
                        <img src="/static/images/Edit.png" alt="Edit" class="action-icon">
                    </a>
                    <button class="image-btn delete-btn" data-number="${student.student_number}" title="Delete">
                        <img src="/static/images/Delete.png" alt="Delete" class="action-icon">
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filtered = allStudents.filter(s =>
            s.student_number.toLowerCase().includes(query) ||
            s.name.toLowerCase().includes(query) ||
            s.surname.toLowerCase().includes(query)
        );
        renderStudents(filtered);
    });

    tableBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const studentNumber = deleteBtn.dataset.number;
            if (confirm(`Delete student ${studentNumber}? This is permanent.`)) {
                if (await deleteStudent(studentNumber)) {
                    showStatusMessage('Student deleted successfully.');
                    allStudents = await fetchStudents();
                    renderStudents(allStudents);
                } else {
                    showStatusMessage('Failed to delete student.', 'error');
                }
            }
        }
    });
    
    // Initial load
    allStudents = await fetchStudents();
    renderStudents(allStudents);

    const status = new URLSearchParams(window.location.search).get('status');
    if (status === 'added') showStatusMessage('Student added successfully.');
    if (status === 'edited') showStatusMessage('Student details updated.');
}


// --- Add/Edit Page Common Logic ---
let videoStream;
let faceIdImageUrl = null;
let cameraActive = false;

async function startCamera(webcamEl, overlayEl, buttonsEl) {
    // Prevent multiple simultaneous camera requests
    if (cameraActive) {
        console.log('Camera already starting or active');
        return;
    }

    cameraActive = true;

    try {
        // More robust constraints
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        // Stop existing stream if any
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }

        // Request new stream with error handling
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!videoStream || !videoStream.getVideoTracks().length) {
            throw new Error('No video stream obtained');
        }

        // Set the stream to the video element
        webcamEl.srcObject = videoStream;
        webcamEl.muted = true;

        // Handle video metadata
        const playPromise = webcamEl.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Video is playing
                webcamEl.parentElement.classList.add('active');
                overlayEl.style.display = 'none';
                webcamEl.style.display = 'block';
                buttonsEl.innerHTML = `<button type="button" id="capture-btn" class="main-btn">Capture Face</button>`;
                
                const captureBtn = document.getElementById('capture-btn');
                if (captureBtn) {
                    captureBtn.addEventListener('click', () => captureFace(webcamEl, buttonsEl));
                }
                
                cameraActive = false;
            }).catch(err => {
                console.error('Play promise rejected:', err);
                cameraActive = false;
                stopCamera();
                alert("Could not start video playback. Please try again.");
            });
        }

    } catch (err) {
        cameraActive = false;
        
        console.error('Camera error:', err);

        // Specific error handling
        if (err.name === 'NotAllowedError') {
            alert("Camera permission denied. Please allow camera access in your browser settings and try again.");
        } else if (err.name === 'NotFoundError') {
            alert("No camera found. Please check if your device has a camera.");
        } else if (err.name === 'NotReadableError') {
            alert("Camera is in use by another application. Please close other apps and try again.");
        } else if (err.name === 'OverconstrainedError') {
            // Try again with less specific constraints
            console.log('Retrying with less specific constraints...');
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                
                webcamEl.srcObject = videoStream;
                webcamEl.muted = true;
                
                const playPromise = webcamEl.play();
                playPromise.then(() => {
                    webcamEl.parentElement.classList.add('active');
                    overlayEl.style.display = 'none';
                    webcamEl.style.display = 'block';
                    buttonsEl.innerHTML = `<button type="button" id="capture-btn" class="main-btn">Capture Face</button>`;
                    
                    const captureBtn = document.getElementById('capture-btn');
                    if (captureBtn) {
                        captureBtn.addEventListener('click', () => captureFace(webcamEl, buttonsEl));
                    }
                }).catch(err2 => {
                    console.error('Fallback play failed:', err2);
                    stopCamera();
                    alert("Could not start video. Please refresh and try again.");
                });
            } catch (fallbackErr) {
                console.error('Fallback failed:', fallbackErr);
                alert("Camera access failed. Please refresh the page and try again.");
            }
        } else {
            alert(`Camera error: ${err.message}`);
        }
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => {
            track.stop();
        });
        videoStream = null;
    }
    cameraActive = false;
}

function captureFace(webcamEl, buttonsEl) {
    if (!webcamEl.srcObject) {
        alert("Camera not ready. Please try again.");
        return;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = webcamEl.videoWidth;
        canvas.height = webcamEl.videoHeight;

        if (canvas.width === 0 || canvas.height === 0) {
            alert("Video not ready. Please wait a moment and try again.");
            return;
        }

        const context = canvas.getContext('2d');
        context.drawImage(webcamEl, 0, 0, canvas.width, canvas.height);
        faceIdImageUrl = canvas.toDataURL('image/jpeg');
        
        stopCamera();
        
        webcamEl.style.display = 'none';
        const preview = document.createElement('img');
        preview.src = faceIdImageUrl;
        preview.className = 'face-preview';
        webcamEl.parentElement.querySelector('.face-preview')?.remove();
        webcamEl.parentElement.appendChild(preview);

        buttonsEl.innerHTML = `<button type="button" id="retake-btn" class="secondary-btn">Retake</button>`;
        document.getElementById('retake-btn').addEventListener('click', () => {
            preview.remove();
            faceIdImageUrl = null;
            startCamera(webcamEl, webcamEl.parentElement.querySelector('.camera-overlay'), buttonsEl);
        });
    } catch (err) {
        console.error('Error capturing face:', err);
        alert("Failed to capture image. Please try again.");
    }
}

async function renderModuleCheckboxes(container, allModules, selectedModuleCodes = []) {
    container.innerHTML = '';
    allModules.forEach(module => {
        const isChecked = selectedModuleCodes.includes(module.code) ? 'checked' : '';
        container.innerHTML += `
            <div class="checkbox-group">
                <input type="checkbox" id="module-${module.code}" name="modules" value="${module.code}" ${isChecked}>
                <label for="module-${module.code}">${module.name} (${module.code})</label>
            </div>
        `;
    });
    
    // Add search functionality if search input exists
    const searchInput = document.getElementById('module-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const checkboxGroups = container.querySelectorAll('.checkbox-group');
            
            checkboxGroups.forEach(group => {
                const label = group.querySelector('label').textContent.toLowerCase();
                if (label.includes(searchTerm)) {
                    group.style.display = 'block';
                } else {
                    group.style.display = 'none';
                }
            });
        });
    }
}


// --- Add Student Page ---
async function initAddStudentPage() {
    const form = document.getElementById('add-student-form');
    const webcamEl = document.getElementById('webcam');
    const overlayEl = document.getElementById('camera-overlay');
    const buttonsEl = document.getElementById('face-id-buttons');
    const moduleBox = document.querySelector('.module-selection-box');
    const studentNumberInput = document.getElementById('student-number');
    const submitBtn = form.querySelector('.submit-btn');
    
    overlayEl.addEventListener('click', () => startCamera(webcamEl, overlayEl, buttonsEl));
    
    const allModules = await fetchAllModules();
    renderModuleCheckboxes(moduleBox, allModules);

    // Real-time student number validation
    let validationTimeout;
    let isStudentNumberValid = false;

    function updateSubmitButton() {
        if (submitBtn) {
            submitBtn.disabled = !isStudentNumberValid;
            submitBtn.style.opacity = isStudentNumberValid ? '1' : '0.6';
            submitBtn.style.cursor = isStudentNumberValid ? 'pointer' : 'not-allowed';
        }
    }

    function showValidationMessage(message, type = 'error') {
        const existingMsg = studentNumberInput.parentElement.querySelector('.validation-message');
        if (existingMsg) existingMsg.remove();

        if (message) {
            const msgElement = document.createElement('div');
            msgElement.className = `validation-message ${type}`;
            msgElement.textContent = message;
            msgElement.style.cssText = `
                margin-top: 5px;
                font-size: 12px;
                font-weight: bold;
                color: ${type === 'error' ? '#ff4444' : '#00aa00'};
            `;
            studentNumberInput.parentElement.appendChild(msgElement);
        }
    }

    async function validateStudentNumber(studentNumber) {
        studentNumberInput.style.borderColor = '';
        showValidationMessage('');
        
        if (!studentNumber) {
            isStudentNumberValid = false;
            updateSubmitButton();
            return;
        }

        if (studentNumber.length !== 8 || !/^[0-9]{8}$/.test(studentNumber)) {
            studentNumberInput.style.borderColor = '#ff4444';
            showValidationMessage('Student number must be exactly 8 digits');
            isStudentNumberValid = false;
            updateSubmitButton();
            return;
        }

        showValidationMessage('Checking availability...', 'info');
        
        const exists = await checkStudentExists(studentNumber);
        
        if (exists === true) {
            studentNumberInput.style.borderColor = '#ff4444';
            showValidationMessage('This student number already exists in the system');
            isStudentNumberValid = false;
        } else if (exists === false) {
            studentNumberInput.style.borderColor = '#00aa00';
            showValidationMessage('Student number is available', 'success');
            isStudentNumberValid = true;
        } else {
            studentNumberInput.style.borderColor = '#ffa500';
            showValidationMessage('Unable to verify student number. Please try again.');
            isStudentNumberValid = false;
        }
        
        updateSubmitButton();
    }

    studentNumberInput.addEventListener('input', (e) => {
        const value = e.target.value;
        
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }
        
        validationTimeout = setTimeout(() => {
            validateStudentNumber(value);
        }, 500);
    });

    updateSubmitButton();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const studentNumber = document.getElementById('student-number').value;
        const studentName = document.getElementById('student-name').value;
        const studentSurname = document.getElementById('student-surname').value;
        const selectedModules = Array.from(document.querySelectorAll('input[name="modules"]:checked')).map(cb => cb.value);

        if (!isStudentNumberValid) {
            showStatusMessage('Please enter a valid and available student number.', 'error');
            return;
        }

        if (!studentName.trim()) {
            showStatusMessage('Student name is required.', 'error');
            document.getElementById('student-name').focus();
            return;
        }

        if (!studentSurname.trim()) {
            showStatusMessage('Student surname is required.', 'error');
            document.getElementById('student-surname').focus();
            return;
        }

        if (selectedModules.length === 0) {
            showStatusMessage('Please select at least one module.', 'error');
            return;
        }

        if (!faceIdImageUrl) {
            if (!confirm("Add student without a Face ID? The student won't be able to use face recognition for attendance.")) {
                return;
            }
        }

        submitBtn.disabled = true;
        const originalBtnText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="button-spinner"></span>Adding Student...';

        try {
            const studentData = {
                student_number: studentNumber,
                name: studentName.trim(),
                surname: studentSurname.trim(),
                modules: selectedModules,
            };

            const addResponse = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });

            if (!addResponse.ok) {
                const err = await addResponse.json();
                showStatusMessage(err.error || 'Failed to add student.', 'error');
                return;
            }

            if (faceIdImageUrl) {
                const faceResponse = await registerFace(studentNumber, faceIdImageUrl);
                if (!faceResponse.ok) {
                    const err = await faceResponse.json();
                    showStatusMessage(`Student added successfully, but Face ID registration failed: ${err.error || 'Unknown error'}`, 'warning');
                    setTimeout(() => {
                        window.location.href = 'student.html?status=added';
                    }, 3000);
                    return;
                }
            }

            showStatusMessage('Student added successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'student.html?status=added';
            }, 1500);

        } catch (error) {
            console.error('Error adding student:', error);
            showStatusMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            submitBtn.disabled = !isStudentNumberValid;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}

// --- Edit Student Page ---
async function initEditStudentPage() {
    const form = document.getElementById('edit-student-form');
    const studentNumber = new URLSearchParams(window.location.search).get('number');
    if (!studentNumber) {
        alert('No student number provided!');
        window.location.href = 'student.html';
        return;
    }

    const [student, allModules] = await Promise.all([
        fetchStudent(studentNumber),
        fetchAllModules()
    ]);

    if (!student) {
        alert('Student not found!');
        return;
    }

    document.getElementById('student-number').value = student.student_number;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-surname').value = student.surname;

    const moduleBox = document.querySelector('.module-selection-box');
    renderModuleCheckboxes(moduleBox, allModules, student.modules);

    const webcamEl = document.getElementById('webcam');
    const overlayEl = document.getElementById('camera-overlay');
    const buttonsEl = document.getElementById('face-id-buttons');
    const submitBtn = form.querySelector('.submit-btn');

    if (student.has_face_id && student.face_id_image_url) {
        overlayEl.style.display = 'none';
        const preview = document.createElement('img');
        preview.src = `/${student.face_id_image_url}`;
        preview.className = 'face-preview';
        webcamEl.parentElement.appendChild(preview);
        buttonsEl.innerHTML = `<button type="button" id="retake-btn" class="secondary-btn">Retake Face ID</button>`;
        document.getElementById('retake-btn').addEventListener('click', () => {
            preview.remove();
            startCamera(webcamEl, overlayEl, buttonsEl);
        });
    } else {
        overlayEl.addEventListener('click', () => startCamera(webcamEl, overlayEl, buttonsEl));
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="button-spinner"></span>Saving...';

        const studentData = {
            name: document.getElementById('student-name').value,
            surname: document.getElementById('student-surname').value,
            modules: Array.from(document.querySelectorAll('input[name="modules"]:checked')).map(cb => cb.value)
        };

        if (studentData.modules.length === 0) {
            alert('No modules selected!');
            window.location.href = `student_edit.html?number=${studentNumber}`;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        const updateResponse = await fetch(`/api/students/${studentNumber}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });

        if (!updateResponse.ok) {
            showStatusMessage('Failed to update student details.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        if (faceIdImageUrl) {
            const faceResponse = await registerFace(studentNumber, faceIdImageUrl);
            if (!faceResponse.ok) {
                const err = await faceResponse.json();
                showStatusMessage(err.error || 'Details saved, but Face ID update failed.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }
        }
        window.location.href = 'student.html?status=edited';
    });
}