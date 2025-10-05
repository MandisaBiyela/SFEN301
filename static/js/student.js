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
let faceIdImageUrl = null; // Stores Base64 image data URL

async function startCamera(webcamEl, overlayEl, buttonsEl) {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamEl.srcObject = videoStream;
        webcamEl.parentElement.classList.add('active');
        overlayEl.style.display = 'none';
        webcamEl.style.display = 'block';
        buttonsEl.innerHTML = `<button type="button" id="capture-btn" class="main-btn">Capture Face</button>`;
        document.getElementById('capture-btn').addEventListener('click', () => captureFace(webcamEl, buttonsEl));
    } catch (err) {
        alert("Could not access camera. Please check permissions.");
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
}

function captureFace(webcamEl, buttonsEl) {
    const canvas = document.createElement('canvas');
    canvas.width = webcamEl.videoWidth;
    canvas.height = webcamEl.videoHeight;
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
}


// --- Add Student Page ---
async function initAddStudentPage() {
    const form = document.getElementById('add-student-form');
    const webcamEl = document.getElementById('webcam');
    const overlayEl = document.getElementById('camera-overlay');
    const buttonsEl = document.getElementById('face-id-buttons');
    const moduleBox = document.querySelector('.module-selection-box');
    
    overlayEl.addEventListener('click', () => startCamera(webcamEl, overlayEl, buttonsEl));
    
    const allModules = await fetchAllModules();
    renderModuleCheckboxes(moduleBox, allModules);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentNumber = document.getElementById('student-number').value;

        if (!faceIdImageUrl) {
            if (!confirm("Add student without a Face ID?")) return;
        }

        const studentData = {
            student_number: studentNumber,
            name: document.getElementById('student-name').value,
            surname: document.getElementById('student-surname').value,
            modules: Array.from(document.querySelectorAll('input[name="modules"]:checked')).map(cb => cb.value),
        };
        if (studentData.modules.length == 0) {
            alert('No modules selected!');
            window.location.href = 'student_add.html';
            return;
        }
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
                showStatusMessage(err.error || 'Student added, but Face ID failed.', 'error');
                return;
            }
        }
        window.location.href = 'student.html?status=added';
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

    if (student.has_face_id && student.face_id_image_url) {
        overlayEl.style.display = 'none';
        const preview = document.createElement('img');
        preview.src = `/${student.face_id_image_url}`; // Assumes the URL is relative
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
        const studentData = {
            name: document.getElementById('student-name').value,
            surname: document.getElementById('student-surname').value,
            modules: Array.from(document.querySelectorAll('input[name="modules"]:checked')).map(cb => cb.value)
        };

        if (studentData.modules.length == 0) {
            alert('No modules selected!');
            window.location.href = `student_edit.html?number=${studentNumber}`;
            return;
        }
        const updateResponse = await fetch(`/api/students/${studentNumber}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });

        if (!updateResponse.ok) {
            showStatusMessage('Failed to update student details.', 'error');
            return;
        }

        if (faceIdImageUrl) { // faceIdImageUrl is only set if a new face was captured
            const faceResponse = await registerFace(studentNumber, faceIdImageUrl);
             if (!faceResponse.ok) {
                const err = await faceResponse.json();
                showStatusMessage(err.error || 'Details saved, but Face ID update failed.', 'error');
                return;
            }
        }
        window.location.href = 'student.html?status=edited';
    });
}