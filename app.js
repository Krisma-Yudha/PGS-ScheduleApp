let schedules = [];
let draftTasks = [];

// Tunggu Firebase siap sebelum ambil data
function init() {
    setHeaderDate();
    const checkDB = setInterval(() => {
        if (window.db) {
            clearInterval(checkDB);
            syncData();
        }
    }, 100);
}

function setHeaderDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('header-date').textContent = new Date().toLocaleDateString('id-ID', options);
}

// REALTIME SYNC: Data otomatis muncul/update jika ada perubahan di cloud
function syncData() {
    const { collection, onSnapshot, query, orderBy } = window.fbMethods;
    const q = query(collection(window.db, "schedules"), orderBy("date", "desc"));
    
    onSnapshot(q, (snapshot) => {
        schedules = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderSchedules();
    });
}

function renderSchedules() {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    if (schedules.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-tertiary);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width: 64px; height: 64px; margin-bottom: 16px;">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p>Belum ada jadwal online.<br>Tap + untuk membuat.</p>
            </div>`;
        return;
    }

    schedules.forEach(schedule => {
        const completed = schedule.tasks.filter(t => t.done).length;
        const progress = schedule.tasks.length > 0 ? Math.round((completed / schedule.tasks.length) * 100) : 0;

        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-date">${schedule.date}</h3>
                    <div class="card-time">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        ${schedule.startTime} - ${schedule.endTime}
                    </div>
                </div>
                <div class="card-actions">
                    <button onclick="deleteSchedule('${schedule.id}')" aria-label="Delete Schedule">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
            <div class="progress-wrapper">
                <div class="progress-header"><span>Progres Tugas</span> <span>${progress}%</span></div>
                <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
            </div>
            <ul class="task-list">
                ${schedule.tasks.map((task, index) => `
                    <li class="task-item ${task.done ? 'done' : ''}" onclick="toggleTask('${schedule.id}', ${index})">
                        <div class="task-checkbox"><svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <span class="task-text">${task.text}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        container.appendChild(card);
    });
}

// SIMPAN KE FIREBASE
document.getElementById('schedule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (draftTasks.length === 0) return alert("Silakan tambah setidaknya satu checklist tugas.");

    const saveBtn = document.querySelector('.btn-primary[type="submit"]');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "Menyimpan...";
    saveBtn.disabled = true;

    const newSchedule = {
        date: document.getElementById('schedule-date').value,
        startTime: document.getElementById('schedule-start').value,
        endTime: document.getElementById('schedule-end').value,
        tasks: [...draftTasks]
    };

    try {
        await window.fbMethods.addDoc(window.fbMethods.collection(window.db, "schedules"), newSchedule);
        closeModal();
    } catch (err) {
        alert("Gagal menyimpan data: " + err.message);
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
});

// UPDATE CHECKLIST DI FIREBASE
async function toggleTask(scheduleId, taskIndex) {
    const schedule = schedules.find(s => s.id === scheduleId);
    schedule.tasks[taskIndex].done = !schedule.tasks[taskIndex].done;

    const docRef = window.fbMethods.doc(window.db, "schedules", scheduleId);
    await window.fbMethods.updateDoc(docRef, { tasks: schedule.tasks });
}

// HAPUS DARI FIREBASE
async function deleteSchedule(id) {
    if (confirm("Yakin ingin menghapus jadwal ini? Data akan hilang dari semua perangkat.")) {
        await window.fbMethods.deleteDoc(window.fbMethods.doc(window.db, "schedules", id));
    }
}

// FUNGSI MODAL & DRAFT TUGAS
function openModal() { 
    draftTasks = []; 
    document.getElementById('schedule-form').reset();
    document.getElementById('schedule-date').valueAsDate = new Date();
    renderDraftTasks(); 
    document.getElementById('modal-overlay').classList.add('active'); 
}

function closeModal() { 
    document.getElementById('modal-overlay').classList.remove('active'); 
}

function addDraftTask() {
    const input = document.getElementById('new-task-input');
    if (input.value.trim()) {
        draftTasks.push({ text: input.value.trim(), done: false });
        input.value = '';
        renderDraftTasks();
    }
}

function removeDraftTask(index) {
    draftTasks.splice(index, 1);
    renderDraftTasks();
}

function renderDraftTasks() {
    document.getElementById('draft-task-list').innerHTML = draftTasks.map((t, i) => `
        <li class="draft-task-item">
            <span>${t.text}</span>
            <button type="button" onclick="removeDraftTask(${i})" style="color: var(--danger-color); background: none; border: none; font-size: 1.2rem;">&times;</button>
        </li>
    `).join('');
}

document.getElementById('new-task-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addDraftTask();
    }
});

init();
