// Data State
let schedules = JSON.parse(localStorage.getItem('guardSchedules')) || [];
let draftTasks = [];

// DOM Elements
const scheduleContainer = document.getElementById('schedule-container');
const modalOverlay = document.getElementById('modal-overlay');
const scheduleForm = document.getElementById('schedule-form');
const headerDate = document.getElementById('header-date');

// Initialization
function init() {
    setHeaderDate();
    renderSchedules();
}

// Utility: Set Today's Date in Header
function setHeaderDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    headerDate.textContent = new Date().toLocaleDateString('en-US', options);
}

// Utility: Save to LocalStorage
function saveSchedules() {
    localStorage.setItem('guardSchedules', JSON.stringify(schedules));
}

// Utility: Calculate Progress
function getProgress(tasks) {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.done).length;
    return Math.round((completed / tasks.length) * 100);
}

// Render Dashboard
function renderSchedules() {
    scheduleContainer.innerHTML = '';

    if (schedules.length === 0) {
        scheduleContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-tertiary);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width: 64px; height: 64px; margin-bottom: 16px;">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p>No schedules found.<br>Tap + to create one.</p>
            </div>`;
        return;
    }

    // Sort by date (newest first)
    const sortedSchedules = [...schedules].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedSchedules.forEach(schedule => {
        const progress = getProgress(schedule.tasks);
        
        // Format Date string
        const dateObj = new Date(schedule.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-date">${formattedDate}</h3>
                    <div class="card-time">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
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
                <div class="progress-header">
                    <span>Task Completion</span>
                    <span id="progress-text-${schedule.id}">${progress}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" id="progress-fill-${schedule.id}" style="width: ${progress}%"></div>
                </div>
            </div>

            <ul class="task-list">
                ${schedule.tasks.map(task => `
                    <li class="task-item ${task.done ? 'done' : ''}" onclick="toggleTask('${schedule.id}', '${task.id}')">
                        <div class="task-checkbox">
                            <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <span class="task-text">${task.text}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        scheduleContainer.appendChild(card);
    });
}

// Interaction: Toggle Task
function toggleTask(scheduleId, taskId) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const task = schedule.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.done = !task.done;
    saveSchedules();
    
    // Efficient DOM update without full re-render
    renderSchedules(); 
    // Note: For a framework-less approach, full re-render on a small array is fast enough. 
    // A highly optimized version would target specific DOM nodes via ID.
}

// Interaction: Delete Schedule
function deleteSchedule(id) {
    if(confirm("Are you sure you want to delete this schedule?")) {
        schedules = schedules.filter(s => s.id !== id);
        saveSchedules();
        renderSchedules();
    }
}

// Modal Management
function openModal() {
    draftTasks = [];
    document.getElementById('schedule-form').reset();
    document.getElementById('schedule-id').value = '';
    
    // Default date to today
    document.getElementById('schedule-date').valueAsDate = new Date();
    
    renderDraftTasks();
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// Draft Task Management (Inside Modal)
function addDraftTask() {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    
    if (text) {
        draftTasks.push({
            id: 'task_' + Date.now(),
            text: text,
            done: false
        });
        input.value = '';
        renderDraftTasks();
    }
}

function removeDraftTask(id) {
    draftTasks = draftTasks.filter(t => t.id !== id);
    renderDraftTasks();
}

function renderDraftTasks() {
    const list = document.getElementById('draft-task-list');
    list.innerHTML = draftTasks.map(task => `
        <li class="draft-task-item">
            <span>${task.text}</span>
            <button type="button" onclick="removeDraftTask('${task.id}')">&times;</button>
        </li>
    `).join('');
}

// Form Submission
scheduleForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (draftTasks.length === 0) {
        alert("Please add at least one checklist task.");
        return;
    }

    const newSchedule = {
        id: 'sched_' + Date.now(),
        date: document.getElementById('schedule-date').value,
        startTime: document.getElementById('schedule-start').value,
        endTime: document.getElementById('schedule-end').value,
        tasks: [...draftTasks]
    };

    schedules.push(newSchedule);
    saveSchedules();
    closeModal();
    renderSchedules();
});

// Allow adding task via Enter key in input
document.getElementById('new-task-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addDraftTask();
    }
});

// Run Init
init();
