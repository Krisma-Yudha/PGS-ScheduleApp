/**
 * EGARDA - Core Logic
 * Google Auth + Local PIN + Live Progress Tracking + Guest Mode Persistent
 */

const ALLOWED_ADMINS = ["krismayudha836@gmail.com"];
const GUEST_PIN = "123456"; // PIN khusus untuk tamu

const state = {
    schedules: [],
    unsubscribeDB: null,
    isSubmitting: false,
    currentPinInput: "",
    pinMode: "verify",
    progressTimer: null,
    isGuest: false
};

const TIMEOUT_DURATION = 60 * 60 * 1000; 

const quotes = [
    "Keberhasilan adalah milik mereka yang berusaha.",
    "Jadwal tertata, hidup lebih bermakna.",
    "Semangat bertugas, Garda terdepan!",
    "Disiplin adalah kunci kesuksesan.",
    "Fokus pada tujuan, abaikan rintangan."
];

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderDate();
    document.getElementById('quote-display').textContent = quotes[Math.floor(Math.random() * quotes.length)];
    
    const quoteElement = document.getElementById('motivational-text');
    if (quoteElement) {
        quoteElement.innerText = quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#dropdown-container')) {
            const unitList = document.getElementById('unit-list');
            const dropdownContainer = document.getElementById('dropdown-container');
            if(unitList) unitList.classList.remove('show');
            if(dropdownContainer) dropdownContainer.classList.remove('open');
        }
    });

    const waitFirebase = setInterval(() => {
        if (window.fb && window.fbAuth) {
            clearInterval(waitFirebase);
            initAuth();
        }
    }, 100);
});

window.addEventListener('load', () => {
    const loader = document.getElementById('global-loader');
    if(loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                loader.remove();
            }, 800); 
        }, 2000); 
    }
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        if ((window.fbAuth && window.fbAuth.auth.currentUser) || state.isGuest) {
            const lastActive = localStorage.getItem('eg_last_active');
            if (lastActive && (Date.now() - parseInt(lastActive)) > TIMEOUT_DURATION) {
                lockAppAuto(); 
            }
        }
    } else {
        localStorage.setItem('eg_last_active', Date.now()); 
    }
});

function initAuth() {
    window.fbAuth.onAuthStateChanged(window.fbAuth.auth, async (user) => {
        const isGuestMode = localStorage.getItem('eg_guest_mode') === 'true';

        if (user) {
            if (!ALLOWED_ADMINS.includes(user.email)) {
                showToast('Akses Ditolak: Email tidak terdaftar!', 'error');
                await window.fbAuth.signOut(window.fbAuth.auth);
                showGoogleScreen();
                return;
            }

            state.isGuest = false;
            localStorage.removeItem('eg_guest_mode');
            document.body.classList.remove('guest-mode');

            const storedPIN = localStorage.getItem('eg_user_pin');
            const lastActive = localStorage.getItem('eg_last_active');
            const now = Date.now();

            if (!storedPIN) {
                showPinScreen('setup');
            } else if (!lastActive || (now - parseInt(lastActive)) > TIMEOUT_DURATION) {
                showPinScreen('verify');
            } else {
                enterMainApp();
            }
        } else if (isGuestMode) {
            // Jika sebelumnya sudah masuk sebagai tamu
            state.isGuest = true;
            document.body.classList.add('guest-mode');
            const lastActive = localStorage.getItem('eg_last_active');
            const now = Date.now();
            
            if (!lastActive || (now - parseInt(lastActive)) > TIMEOUT_DURATION) {
                showPinScreen('verify_guest');
            } else {
                enterMainApp();
            }
        } else {
            showGoogleScreen();
        }
    });
}

function showGoogleScreen() {
    state.isGuest = false;
    localStorage.removeItem('eg_guest_mode');
    document.body.classList.remove('guest-mode');
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('google-section').style.display = 'block';
    document.getElementById('pin-section').style.display = 'none';
}

window.loginGoogle = async () => {
    try {
        const provider = new window.fbAuth.GoogleAuthProvider();
        await window.fbAuth.signInWithPopup(window.fbAuth.auth, provider);
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') showToast('Gagal terhubung dengan Google', 'error');
    }
};

window.loginGuest = () => {
    state.isGuest = true;
    document.body.classList.add('guest-mode');
    showPinScreen('verify_guest');
};

function showPinScreen(mode) {
    state.pinMode = mode;
    state.currentPinInput = "";
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('google-section').style.display = 'none';
    document.getElementById('pin-section').style.display = 'block';
    
    if (mode === 'setup') {
        document.getElementById('pin-title').textContent = "Buat PIN Baru";
        document.getElementById('pin-subtitle').textContent = "Keamanan akses personel";
    } else if (mode === 'verify_guest') {
        document.getElementById('pin-title').textContent = "PIN Tamu";
        document.getElementById('pin-subtitle').textContent = "Masukkan PIN khusus tamu";
    } else {
        document.getElementById('pin-title').textContent = "Masukkan PIN";
        document.getElementById('pin-subtitle').textContent = "Sesi terkunci demi keamanan";
    }
    clearPinUI();
}

function enterMainApp() {
    localStorage.setItem('eg_last_active', Date.now()); 
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    
    const welcomeText = document.getElementById('welcome-text');
    if (state.isGuest) {
        welcomeText.textContent = "Selamat datang, Tamu (Mode Lihat).";
    } else {
        welcomeText.textContent = "Selamat datang Developer! Krisma.";
    }

    fetchSchedules();
    
    if(!state.progressTimer) {
        state.progressTimer = setInterval(() => {
            if(document.getElementById('main-app').style.display === 'flex') {
                renderUI(true); 
            }
        }, 60000);
    }
}

window.lockAppManual = () => {
    localStorage.setItem('eg_last_active', '0'); 
    if (state.unsubscribeDB) { state.unsubscribeDB(); state.unsubscribeDB = null; }
    if (state.progressTimer) { clearInterval(state.progressTimer); state.progressTimer = null; }
    if (state.isGuest) {
        showPinScreen('verify_guest');
    } else {
        showPinScreen('verify');
    }
    showToast('Aplikasi Terkunci');
};

function lockAppAuto() {
    if (state.unsubscribeDB) { state.unsubscribeDB(); state.unsubscribeDB = null; }
    if (state.progressTimer) { clearInterval(state.progressTimer); state.progressTimer = null; }
    if (state.isGuest) {
        showPinScreen('verify_guest');
    } else {
        showPinScreen('verify');
    }
}

window.logoutFromPin = async () => {
    if (state.pinMode === 'verify_guest') {
        localStorage.removeItem('eg_guest_mode');
        localStorage.removeItem('eg_last_active');
        showGoogleScreen();
        return;
    }
    if (confirm("Ingin keluar dan hapus PIN dari perangkat ini?")) {
        localStorage.removeItem('eg_user_pin');
        localStorage.removeItem('eg_last_active');
        await window.fbAuth.signOut(window.fbAuth.auth);
    }
};

window.pressPin = (num) => {
    if (state.currentPinInput.length < 6) {
        state.currentPinInput += num;
        updatePinUI();
        if (state.currentPinInput.length === 6) setTimeout(evaluatePin, 150); 
    }
};

window.deletePin = () => {
    if (state.currentPinInput.length > 0) {
        state.currentPinInput = state.currentPinInput.slice(0, -1);
        updatePinUI();
    }
};

function updatePinUI() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index < state.currentPinInput.length) dot.classList.add('filled');
        else dot.classList.remove('filled');
    });
}

function clearPinUI() {
    state.currentPinInput = "";
    updatePinUI();
}

function triggerPinError(msg) {
    const authCard = document.getElementById('auth-card');
    authCard.classList.add('shake-error');
    setTimeout(() => authCard.classList.remove('shake-error'), 400);
    showToast(msg, 'error');
    clearPinUI();
}

function evaluatePin() {
    if (state.pinMode === 'setup') {
        localStorage.setItem('eg_user_pin', state.currentPinInput);
        showToast('PIN Berhasil Dibuat!');
        enterMainApp();
    } else if (state.pinMode === 'verify_guest') {
        if (state.currentPinInput === GUEST_PIN) {
            // MENYIMPAN SESI TAMU AGAR TIDAK KELUAR SAAT DI-REFRESH
            localStorage.setItem('eg_guest_mode', 'true'); 
            enterMainApp();
        } else {
            triggerPinError('PIN Tamu Salah!');
        }
    } else {
        const storedPIN = localStorage.getItem('eg_user_pin');
        if (state.currentPinInput === storedPIN) {
            enterMainApp();
        } else {
            triggerPinError('PIN Salah!');
        }
    }
}

function fetchSchedules() {
    const collRef = window.fb.collection(window.fb.db, "schedules");
    const q = window.fb.query(collRef, window.fb.orderBy("date", "desc"));
    state.unsubscribeDB = window.fb.onSnapshot(q, (snapshot) => {
        state.schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUI();
    });
}

function renderUI(noAnimate = false) {
    const upcomingContainer = document.getElementById('upcoming-container');
    const allContainer = document.getElementById('all-container');
    upcomingContainer.innerHTML = ''; allContainer.innerHTML = '';
    document.getElementById('total-count').textContent = state.schedules.length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    let upcomingCount = 0;
    
    const sortedSchedules = [...state.schedules].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        
        const isPastA = dateA < today;
        const isPastB = dateB < today;
        
        if (isPastA !== isPastB) return isPastA ? 1 : -1; 
        
        if (!isPastA && !isPastB) return dateA - dateB; 
        else return dateB - dateA;
    });

    sortedSchedules.forEach((item, index) => {
        const cardHTML = generateCard(item, index, noAnimate);
        
        const elAll = document.createElement('div');
        elAll.innerHTML = cardHTML;
        allContainer.appendChild(elAll.firstElementChild);
        
        if (item.date === todayStr || item.date === tomorrowStr) {
            const elUp = document.createElement('div');
            elUp.innerHTML = cardHTML;
            upcomingContainer.appendChild(elUp.firstElementChild);
            upcomingCount++;
        }
    });
    
    if (upcomingCount === 0) upcomingContainer.innerHTML = '<div class="empty-state">Tidak ada jadwal untuk hari ini atau besok.</div>';
}

function generateCard(item, index, noAnimate) {
    const d = new Date(item.date);
    const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    const shiftInfo = item.shift === 'Pagi' ? 'Pagi (07:00 - 19:00)' : 'Malam (19:00 - 07:00)';
    
    const animStyle = noAnimate ? 'animation: none;' : `animation-delay: ${index * 0.05}s;`;

    const now = new Date();
    const dateParts = item.date.split('-'); 
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    
    const start = new Date(year, month, day, item.shift === 'Pagi' ? 7 : 19, 0, 0);
    const end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
    
    let statusHTML = '';
    
    if (item.isCompleted) {
        statusHTML = `<span class="status-text selesai">✓ Sudah terlaksana</span>`;
    } else if (now < start) {
        statusHTML = `<span class="status-text belum">Belum</span>`;
    } else {
        let progress = ((now - start) / (end - start)) * 100;
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;
        
        if (progress < 100) {
            statusHTML = `
                <span class="status-text berlangsung">Sedang Berlangsung</span>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${progress}%; background-color: var(--dot-pagi);"></div>
                </div>
            `;
        } else {
            statusHTML = `
                <span class="status-text" style="color: var(--success); font-weight: 700; display: block; margin-bottom: 4px;">Waktu Habis</span>
                <div class="progress-track">
                    <div class="progress-fill" style="width: 100%; background-color: var(--success);"></div>
                </div>
                <label class="check-complete">
                    <input type="checkbox" onchange="markAsCompleted('${item.id}')"> Konfirmasi Selesai
                </label>
            `;
        }
    }

    return `
        <div class="card" style="${animStyle}">
            <div class="card-top">
                <span class="card-date">${formattedDate}</span>
                <div class="shift-indicator"><span class="dot-shift ${item.shift}"></span><span>${item.shift}</span></div>
            </div>
            <div class="card-unit">${item.unitKerja}</div>
            <div class="card-detail">Ganti: <strong>${item.namaPegawai}</strong></div>
            <div class="card-detail">Jam: ${shiftInfo}</div>
            ${item.catatan ? `<div class="card-notes">"${item.catatan}"</div>` : ''}
            
            <div class="card-bottom">
                <div class="card-status">${statusHTML}</div>
                <div class="card-actions">
                    <button type="button" class="btn-icon btn-edit" onclick="editItem('${item.id}')">Edit</button>
                    <button type="button" class="btn-icon btn-delete" onclick="deleteItem('${item.id}')">Hapus</button>
                </div>
            </div>
        </div>
    `;
}

window.markAsCompleted = async (id) => {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
    });

    try {
        await window.fb.updateDoc(window.fb.doc(window.fb.db, "schedules", id), {
            isCompleted: true,
            completedAt: window.fb.serverTimestamp()
        });
        showToast('Tugas ditandai selesai! Kerja bagus.');
    } catch (e) {
        showToast('Gagal update status', 'error');
    }
};

document.getElementById('schedule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.isSubmitting) return;
    const id = document.getElementById('edit-id').value;
    const data = {
        date: document.getElementById('schedule-date').value,
        shift: document.getElementById('schedule-shift').value,
        unitKerja: document.getElementById('schedule-unit').value,
        namaPegawai: document.getElementById('schedule-pegawai').value.trim(),
        catatan: document.getElementById('schedule-notes').value.trim()
    };
    if (!data.date || !data.unitKerja || !data.namaPegawai) return showToast('Lengkapi data!', 'error');
    
    if (id) {
        data.isCompleted = false; 
    } else {
        data.isCompleted = false;
    }

    state.isSubmitting = true;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    try {
        if (id) {
            await window.fb.updateDoc(window.fb.doc(window.fb.db, "schedules", id), data);
            showToast('Jadwal berhasil diperbarui!');
        } else {
            await window.fb.addDoc(window.fb.collection(window.fb.db, "schedules"), data);
            showToast('Jadwal baru berhasil ditambahkan!');
        }
        closeModal();
    } catch (error) { 
        showToast('Gagal menyimpan!', 'error'); 
    } finally { 
        state.isSubmitting = false; 
        btn.disabled = false; 
    }
});

window.editItem = (id) => {
    const item = state.schedules.find(s => s.id === id);
    if (!item) return;
    document.getElementById('edit-id').value = item.id;
    document.getElementById('schedule-date').value = item.date;
    document.getElementById('schedule-pegawai').value = item.namaPegawai;
    document.getElementById('schedule-notes').value = item.catatan || '';
    setShift(item.shift); setUnit(item.unitKerja);
    document.getElementById('modal-title').textContent = 'Edit Jadwal';
    document.getElementById('modal-overlay').classList.add('active');
};

window.deleteItem = async (id) => {
    if (confirm("Hapus jadwal ini?")) {
        try { await window.fb.deleteDoc(window.fb.doc(window.fb.db, "schedules", id)); showToast('Dihapus'); }
        catch(err) { showToast('Gagal hapus', 'error'); }
    }
};

window.setShift = (val) => {
    document.getElementById('schedule-shift').value = val;
    document.getElementById('btn-pagi').className = val === 'Pagi' ? 'shift-btn active pagi-active' : 'shift-btn';
    document.getElementById('btn-malam').className = val === 'Malam' ? 'shift-btn active malam-active' : 'shift-btn';
};

window.toggleDropdown = () => {
    document.getElementById('unit-list').classList.toggle('show');
    document.getElementById('dropdown-container').classList.toggle('open');
};

window.setUnit = (val) => {
    document.getElementById('schedule-unit').value = val;
    const selectedText = document.getElementById('unit-selected');
    selectedText.textContent = val; selectedText.classList.add('has-value');
    document.getElementById('unit-list').classList.remove('show');
    document.getElementById('dropdown-container').classList.remove('open');
};

window.openModal = () => {
    document.getElementById('schedule-form').reset();
    document.getElementById('edit-id').value = '';
    setShift('Pagi');
    const selectedText = document.getElementById('unit-selected');
    selectedText.textContent = 'Pilih Unit Kerja'; selectedText.classList.remove('has-value');
    document.getElementById('modal-title').textContent = 'Jadwal Baru';
    document.getElementById('modal-overlay').classList.add('active');
};

window.closeModal = () => document.getElementById('modal-overlay').classList.remove('active');

function updateHeaderDate() {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('header-date').textContent = new Intl.DateTimeFormat('id-ID', options).format(new Date());
}

window.showToast = (msg, type = 'success') => {
    document.querySelectorAll('.toast-container').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = `toast-container ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3500);
};
