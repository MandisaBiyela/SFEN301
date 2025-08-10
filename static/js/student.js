document.addEventListener('DOMContentLoaded', function() {
    // Dummy Data to simulate a database for students and modules
    let dummyStudents = JSON.parse(localStorage.getItem('dummyStudents')) || [
        {
            id: 1,
            studentNumber: '2211445',
            name: 'Alice',
            surname: 'Johnson',
            faceIdVerified: true,
            faceIdImage: 'https://i.imgur.com/g05Fz7H.png',
            modules: ['sfen301', 'websys']
        },
        {
            id: 2,
            studentNumber: '2211556',
            name: 'Bob',
            surname: 'Williams',
            faceIdVerified: false,
            faceIdImage: null,
            modules: ['websys']
        },
        {
            id: 3,
            studentNumber: '2211667',
            name: 'Charlie',
            surname: 'Brown',
            faceIdVerified: true,
            faceIdImage: 'https://i.imgur.com/T0b4717.png',
            modules: ['sfen301', 'compnet']
        },
        {
            id: 4,
            studentNumber: '2211778',
            name: 'Diana',
            surname: 'Prince',
            faceIdVerified: true,
            faceIdImage: null,
            modules: ['compnet', 'prg201']
        },
        {
            id: 5,
            studentNumber: '2211889',
            name: 'Eve',
            surname: 'Adams',
            faceIdVerified: false,
            faceIdImage: null,
            modules: ['websys', 'compnet']
        }
    ];

    const allModules = [
        { value: 'sfen301', name: 'Software Engineering III' },
        { value: 'websys', name: 'Web Systems' },
        { value: 'datastr', name: 'Data Structures & Algorithms' },
        { value: 'infosys', name: 'Information Systems' },
        { value: 'compnet', name: 'Computer Networks' },
        { value: 'prg101', name: 'Programming I' },
        { value: 'prg201', name: 'Programming II' },
        { value: 'dbs101', name: 'Databases I' }
    ];

    // Update localStorage "database"
    function updateLocalStorage() {
        localStorage.setItem('dummyStudents', JSON.stringify(dummyStudents));
    }

    // --- Global Navigation and UI Functions ---
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            const currentPage = window.location.pathname;
            if (currentPage.includes('student_add.html') || currentPage.includes('student_edit.html')) {
                window.location.href = 'student.html';
            } else {
                window.location.href = 'admin_dashboard.html';
            }
        });
    }

    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            const confirmLogout = confirm("Are you sure you want to log out?");
            if (confirmLogout) {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    const profileBtn = document.querySelector('.profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function () {
            window.location.href = 'profile.html';
        });
    }

    function showStatusMessage(message) {
        const messageContainer = document.getElementById('status-message-container');
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.style.display = 'block';
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 5000);
        }
    }

    // --- Module Checkbox Rendering Logic ---
    const moduleSelectionBox = document.querySelector('.module-selection-box');
    const moduleSearchInput = document.getElementById('module-search');

    function renderModules(modulesToRender, selectedModules = []) {
        if (moduleSelectionBox) {
            moduleSelectionBox.innerHTML = '';
            modulesToRender.forEach(module => {
                const isChecked = selectedModules.includes(module.value) ? 'checked' : '';
                const checkboxGroup = document.createElement('div');
                checkboxGroup.classList.add('checkbox-group');
                checkboxGroup.innerHTML = `
                    <input type="checkbox" id="module-${module.value}" name="modules" value="${module.value}" ${isChecked}>
                    <label for="module-${module.value}">${module.name}</label>
                `;
                moduleSelectionBox.appendChild(checkboxGroup);
            });
        }
    }

    if (moduleSearchInput) {
        moduleSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const filteredModules = allModules.filter(module =>
                module.name.toLowerCase().includes(query)
            );
            renderModules(filteredModules);
        });
    }

    // --- Face ID Registration Logic ---
    const cameraBox = document.getElementById('camera-box');
    const cameraOverlay = document.getElementById('camera-overlay');
    const webcamVideo = document.getElementById('webcam');
    const faceIdButtonsContainer = document.getElementById('face-id-buttons');
    let videoStream;
    let faceIdRegistered = false;
    let faceIdImageUrl = null;

    async function startCamera() {
        try {
            const constraints = { video: true };
            videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            webcamVideo.srcObject = videoStream;
            cameraBox.classList.add('active');
            cameraOverlay.style.display = 'none';
            webcamVideo.style.display = 'block';
            faceIdButtonsContainer.innerHTML = `
                <button type="button" id="take-and-register-btn" class="main-btn">Take and Register Face ID</button>
            `;
            document.getElementById('take-and-register-btn').addEventListener('click', takeAndRegisterFaceID);
        } catch (err) {
            console.error("Error accessing the camera: ", err);
            alert("Could not access camera. Please check your permissions.");
        }
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            webcamVideo.srcObject = null;
        }
    }

    function takeAndRegisterFaceID() {
        if (!videoStream) {
            alert('Please start the camera first.');
            return;
        }

        const studentNumber = document.getElementById('student-number').value;
        if (!studentNumber) {
            alert('Please enter a student number before registering Face ID.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = webcamVideo.videoWidth;
        canvas.height = webcamVideo.videoHeight;
        const context = canvas.getContext('2d');
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
        faceIdImageUrl = canvas.toDataURL('image/jpeg');

        const capturedImage = document.createElement('img');
        capturedImage.src = faceIdImageUrl;
        capturedImage.style.width = '100%';
        capturedImage.style.height = '100%';
        capturedImage.style.objectFit = 'cover';
        capturedImage.id = 'captured-preview';
        
        stopCamera();
        
        // Hide the video and append the captured image
        webcamVideo.style.display = 'none';
        cameraBox.appendChild(capturedImage);
        cameraBox.classList.remove('active');

        faceIdRegistered = true;

        faceIdButtonsContainer.innerHTML = `
            <button type="button" id="retake-id-btn" class="secondary-btn">Retake Face ID</button>
        `;
        document.getElementById('retake-id-btn').addEventListener('click', retakeFaceID);
    }

    function retakeFaceID() {
        const capturedPreview = document.getElementById('captured-preview');
        if (capturedPreview) {
            capturedPreview.remove();
        }
        
        faceIdButtonsContainer.innerHTML = '';
        
        // This will now properly restart the camera and show the video feed
        startCamera();
        
        faceIdRegistered = false;
        faceIdImageUrl = null;
    }

    function displayInitialPreview(imageUrl) {
        // Ensure the camera elements are not visible
        if (cameraOverlay) cameraOverlay.style.display = 'none';
        if (webcamVideo) webcamVideo.style.display = 'none';

        const capturedImage = document.createElement('img');
        capturedImage.src = imageUrl;
        capturedImage.style.width = '100%';
        capturedImage.style.height = '100%';
        capturedImage.style.objectFit = 'cover';
        capturedImage.id = 'captured-preview';
        cameraBox.appendChild(capturedImage);
        
        faceIdButtonsContainer.innerHTML = `
            <button type="button" id="retake-id-btn" class="secondary-btn">Retake Face ID</button>
        `;
        document.getElementById('retake-id-btn').addEventListener('click', retakeFaceID);
    }

    // --- Student Management Page Logic ---
    const studentTableBody = document.getElementById('student-table-body');
    if (studentTableBody) {
        const studentSearchInput = document.getElementById('student-search-input');

        function renderStudents(studentsToRender) {
            studentTableBody.innerHTML = '';
            if (studentsToRender.length === 0) {
                studentTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No students found.</td></tr>';
                return;
            }
            studentsToRender.forEach(student => {
                const moduleNames = student.modules.map(moduleValue => {
                    const module = allModules.find(m => m.value === moduleValue);
                    return module ? module.name : moduleValue;
                });
                const moduleListHTML = moduleNames.map(name => `<li>${name}</li>`).join('');
                const faceIdIconUrl = student.faceIdVerified ? '/static/images/YesFaceID.png' : '/static/images/NoFaceID.png';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.studentNumber}</td>
                    <td>${student.name}</td>
                    <td>${student.surname}</td>
                    <td><img src="${faceIdIconUrl}" alt="Face ID Status" class="face-id-icon" loading="lazy"></td>
                    <td class="module-list"><ul>${moduleListHTML}</ul></td>
                    <td>
                        <a href="student_edit.html?id=${student.id}" class="image-btn edit-btn">
                            <img src="/static/images/Edit.png" alt="Edit" class="action-icon">
                        </a>
                        <button class="image-btn delete-btn" data-id="${student.id}">
                            <img src="/static/images/Delete.png" alt="Delete" class="action-icon">
                        </button>
                    </td>
                `;
                studentTableBody.appendChild(row);
            });
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const studentId = this.dataset.id;
                    if (confirm(`Are you sure you want to delete student with ID ${studentId}?`)) {
                        dummyStudents = dummyStudents.filter(student => student.id != studentId);
                        updateLocalStorage();
                        window.location.href = 'student.html?status=deleted';
                    }
                });
            });
        }

        function filterStudents() {
            const query = studentSearchInput.value.toLowerCase();
            const filteredStudents = dummyStudents.filter(student =>
                student.studentNumber.toLowerCase().includes(query) ||
                student.name.toLowerCase().includes(query) ||
                student.surname.toLowerCase().includes(query)
            );
            renderStudents(filteredStudents);
        }

        studentSearchInput.addEventListener('input', filterStudents);
        renderStudents(dummyStudents);

        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        if (status) {
            let message = '';
            if (status === 'added') message = 'Student has been successfully added.';
            else if (status === 'edited') message = 'Student details have been successfully updated.';
            else if (status === 'deleted') message = 'Student has been successfully deleted.';
            if (message) showStatusMessage(message);
        }
    }

    // --- Add New Student Page Logic ---
    const addStudentForm = document.getElementById('add-student-form');
    if (addStudentForm) {
        if (cameraOverlay) {
            cameraOverlay.addEventListener('click', startCamera);
        }

        // Initial render of all modules for the add page
        renderModules(allModules);

        addStudentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const studentNumber = document.getElementById('student-number').value.trim();
            const studentName = document.getElementById('student-name').value.trim();
            const studentSurname = document.getElementById('student-surname').value.trim();
            const selectedModules = Array.from(document.querySelectorAll('input[name="modules"]:checked')).map(cb => cb.value);
            
            // Check if Face ID is registered
            if (!faceIdRegistered) {
                // If not, show a confirmation dialog
                const confirmAdd = confirm(`Are you sure you want to add student ${studentNumber} without a Face ID?`);
                if (!confirmAdd) {
                    // User chose to cancel, so we stop the form submission
                    return; 
                }
            }

            const newStudent = {
                id: dummyStudents.length > 0 ? Math.max(...dummyStudents.map(s => s.id)) + 1 : 1,
                studentNumber: studentNumber,
                name: studentName,
                surname: studentSurname,
                faceIdVerified: faceIdRegistered,
                faceIdImage: faceIdImageUrl,
                modules: selectedModules
            };
            
            dummyStudents.push(newStudent);
            updateLocalStorage();
            window.location.href = 'student.html?status=added';
        });
    }

    // --- Edit Student Page Logic ---
    const editStudentForm = document.getElementById('edit-student-form');
    if (editStudentForm) {
        const params = new URLSearchParams(window.location.search);
        const studentId = parseInt(params.get('id'));
        const studentToEdit = dummyStudents.find(s => s.id === studentId);

        if (studentToEdit) {
            document.getElementById('student-number').value = studentToEdit.studentNumber;
            document.getElementById('student-name').value = studentToEdit.name;
            document.getElementById('student-surname').value = studentToEdit.surname;
            
            renderModules(allModules, studentToEdit.modules);
            
            if (studentToEdit.faceIdVerified && studentToEdit.faceIdImage) {
                displayInitialPreview(studentToEdit.faceIdImage);
                faceIdRegistered = true;
                faceIdImageUrl = studentToEdit.faceIdImage;
            } else {
                if (cameraOverlay) {
                    cameraOverlay.addEventListener('click', startCamera);
                }
            }
            
            editStudentForm.addEventListener('submit', function(e) {
                e.preventDefault();

                if (!faceIdRegistered) {
                    alert('Please register a Face ID before saving.');
                    return;
                }

                studentToEdit.studentNumber = document.getElementById('student-number').value.trim();
                studentToEdit.name = document.getElementById('student-name').value.trim();
                studentToEdit.surname = document.getElementById('student-surname').value.trim();
                studentToEdit.faceIdVerified = faceIdRegistered;
                studentToEdit.faceIdImage = faceIdImageUrl;
                studentToEdit.modules = Array.from(document.querySelectorAll('input[name="modules"]:checked')).map(cb => cb.value);

                updateLocalStorage();
                window.location.href = 'student.html?status=edited';
            });
        } else {
            console.error('Student not found for editing.');
            alert('Student not found! Redirecting to student list.');
            window.location.href = 'student.html';
        }
    }
});