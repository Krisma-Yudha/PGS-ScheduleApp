/**
 * EGARDA - Core Logic
 * Advanced Security: Whitelist Admin + Google Auth + PIN Lock
 */

// --- PENGATURAN ADMIN (GANTI DI SINI) ---
const ALLOWED_ADMINS = [
    "krismayudha836@gmail.com" // Masukkan email utamamu di sini
];

const state = {
    schedules: [],
    unsubscribeDB: null,
    isSubmitting: false,
    currentPinInput: "",
    pinMode: "verify" 
};

const TIMEOUT_DURATION = 60 * 60 * 1000; 

const quotes = [
    '"Disiplin adalah jembatan antara tujuan dan pencapaian."',
    '"Keamanan adalah tanggung jawab moral, bukan sekadar tugas."',
    '"Kewaspadaan hari ini adalah keselamatan esok hari."',
    '"Tugasmu adalah tameng bagi mereka yang tidak menyadarinya."',
    '"Profesionalisme diukur saat tidak ada yang melihat."'
];

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderDate();
    document.getElementById('quote-display').textContent = quotes[Math.floor(Math.random() * quotes.length)];
    
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

function initAuth() {
    window.fbAuth.onAuthStateChanged(window.fbAuth.auth, async (user) => {
        const loader = document.getElementById('global-loader');
        
        if (user) {
            // --- VALIDASI DAFTAR PUTIH (WHITELIST) ---
            if (!ALLOWED_ADMINS.includes(user.email)) {
                showToast('Akses Ditolak: Email tidak terdaftar!', 'error');
                await window.fbAuth.signOut(window.fbAuth.auth);
                showGoogleScreen();
                if (loader) loader.style.opacity = '0';
                return;
            }

            // Jika email lolos validasi, lanjut ke PIN
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
        } else {
            showGoogleScreen();
        }

        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    });
}

function showGoogleScreen() {
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('google-section').style.display = 'block';
    document.getElementById('pin-section').style.display = 'none';
}

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
    } else {
        document.getElementById('pin-title').textContent = "Masukkan PIN";
        document.getElementById('pin-subtitle').textContent = "Sesi terkunci demi keamanan";
    }
    clearPinUI();
}

window.loginGoogle = async () => {
    try {
        const provider = new window.fbAuth.GoogleAuthProvider();
        await window.fbAuth.signInWithPopup(window.fbAuth.auth, provider);
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') showToast('Gagal terhubung dengan Google', 'error');
    }
};

function enterMainApp() {
    localStorage.setItem('eg_last_active', Date.now()); 
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    fetchSchedules();
}

window.lockAppManual = () => {
    localStorage.setItem('eg_last_active', '0'); 
    if (state.unsubscribeDB) { state.unsubscribeDB(); state.unsubscribeDB = null; }
    showPinScreen('verify');
    showToast('Aplikasi Terkunci');
};

window.logoutFromPin = async () => {
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

function evaluatePin() {
    if (state.pinMode === 'setup') {
        localStorage.setItem('eg_user_pin', state.currentPinInput);
        showToast('PIN Berhasil Dibuat!');
        enterMainApp();
    } else {
        const storedPIN = localStorage.getItem('eg_user_pin');
        if (state.currentPinInput === storedPIN) enterMainApp();
        else {
            const authCard = document.getElementById('auth-card');
            authCard.classList.add('shake-error');
            setTimeout(() => authCard.classList.remove('shake-error'), 400);
            showToast('PIN Salah!', 'error');
            clearPinUI();
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

function renderUI() {
    const upcomingContainer = document.getElementById('upcoming-container');
    const allContainer = document.getElementById('all-container');
    upcomingContainer.innerHTML = ''; allContainer.innerHTML = '';
    document.getElementById('total-count').textContent = state.schedules.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    let upcomingCount = 0;
    state.schedules.forEach((item, index) => {
        const cardHTML = generateCard(item, index);
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

function generateCard(item, index) {
    const d = new Date(item.date);
    const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    const shiftInfo = item.shift === 'Pagi' ? 'Pagi (07:00 - 19:00)' : 'Malam (19:00 - 07:00)';
    return `
        <div class="card" style="animation-delay: ${index * 0.05}s">
            <div class="card-top">
                <span class="card-date">${formattedDate}</span>
                <div class="shift-indicator"><span class="dot-shift ${item.shift}"></span><span>${item.shift}</span></div>
            </div>
            <div class="card-unit">${item.unitKerja}</div>
            <div class="card-detail">Ganti: <strong>${item.namaPegawai}</strong></div>
            <div class="card-detail">Jam: ${shiftInfo}</div>
            ${item.catatan ? `<div class="card-notes">"${item.catatan}"</div>` : ''}
            <div class="card-actions">
                <button type="button" class="btn-icon btn-edit" onclick="editItem('${item.id}')">Edit</button>
                <button type="button" class="btn-icon btn-delete" onclick="deleteItem('${item.id}')">Hapus</button>
            </div>
        </div>
    `;
}

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
    state.isSubmitting = true;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    try {
        if (id) await window.fb.updateDoc(window.fb.doc(window.fb.db, "schedules", id), data);
        else await window.fb.addDoc(window.fb.collection(window.fb.db, "schedules"), data);
        closeModal();
    } catch (error) { showToast('Gagal menyimpan!', 'error'); }
    finally { state.isSubmitting = false; btn.disabled = false; }
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
