/**
 * EGARDA - Core Logic
 * Google Auth + Local PIN Biometric Logic
 */

const state = {
    schedules: [],
    unsubscribeDB: null,
    isSubmitting: false,
    currentPinInput: "",
    pinMode: "verify" // 'setup' | 'verify'
};

const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 Jam dalam ms

const quotes = [
    '"Disiplin adalah jembatan antara tujuan dan pencapaian."',
    '"Keamanan adalah tanggung jawab moral, bukan sekadar tugas."',
    '"Kewaspadaan hari ini adalah keselamatan esok hari."',
    '"Tugasmu adalah tameng bagi mereka yang tidak menyadarinya."',
    '"Profesionalisme diukur saat tidak ada yang melihat."',
    '"Fokus pada detail kecil mencegah masalah besar."',
    '"Integritas adalah aset paling berharga dalam pengamanan."',
    '"Loyalitas pada tugas adalah kehormatan."'
];

// --- INIT APP ---
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

// Listener untuk mengunci layar jika ditinggal di background > 1 Jam
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        if (window.fbAuth && window.fbAuth.auth.currentUser) {
            const lastActive = localStorage.getItem('eg_last_active');
            if (lastActive && (Date.now() - parseInt(lastActive)) > TIMEOUT_DURATION) {
                lockAppAuto(); // Kunci jika lebih dari sejam
            }
        }
    } else {
        localStorage.setItem('eg_last_active', Date.now()); // Simpan waktu saat keluar
    }
});


// --- AUTHENTICATION & PIN LOGIC ---
function initAuth() {
    window.fbAuth.onAuthStateChanged(window.fbAuth.auth, (user) => {
        const loader = document.getElementById('global-loader');
        
        if (user) {
            // Cek apakah PIN sudah pernah di set di perangkat ini
            const storedPIN = localStorage.getItem('eg_user_pin');
            const lastActive = localStorage.getItem('eg_last_active');
            const now = Date.now();

            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('main-app').style.display = 'none';

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
    clearPinUI();
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
        document.getElementById('pin-subtitle').textContent = "Buat 6 angka untuk akses cepat";
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

function lockAppAuto() {
    if (state.unsubscribeDB) { state.unsubscribeDB(); state.unsubscribeDB = null; }
    showPinScreen('verify');
}

window.logoutFromPin = async () => {
    if (confirm("Ingin keluar dan hapus PIN dari perangkat ini?")) {
        localStorage.removeItem('eg_user_pin');
        localStorage.removeItem('eg_last_active');
        await window.fbAuth.signOut(window.fbAuth.auth);
    }
};

// --- KEYPAD LOGIC ---
window.pressPin = (num) => {
    if (state.currentPinInput.length < 6) {
        state.currentPinInput += num;
        updatePinUI();

        if (state.currentPinInput.length === 6) {
            setTimeout(evaluatePin, 150); 
        }
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
        if (index < state.currentPinInput.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
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
        if (state.currentPinInput === storedPIN) {
            enterMainApp();
        } else {
            const authCard = document.getElementById('auth-card');
            authCard.classList.add('shake-error');
            setTimeout(() => authCard.classList.remove('shake-error'), 400);
            
            showToast('PIN Salah!', 'error');
            clearPinUI();
        }
    }
}


// --- DATABASE & UI REALTIME ---
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
    
    upcomingContainer.innerHTML = '';
    allContainer.innerHTML = '';
    document.getElementById('total-count').textContent = state.schedules.length;

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
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
    if (state.schedules.length === 0) allContainer.innerHTML = '<div class="empty-state">Belum ada data jadwal operasional.</div>';
}

function generateCard(item, index) {
    const d = new Date(item.date);
    const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    const shiftInfo = item.shift === 'Pagi' ? 'Pagi (07:00 - 19:00)' : 'Malam (19:00 - 07:00)';
    const delay = index * 0.05; 
    
    return `
        <div class="card" style="animation-delay: ${delay}s">
            <div class="card-top">
                <span class="card-date">${formattedDate}</span>
                <div class="shift-indicator">
                    <span class="dot-shift ${item.shift}"></span>
                    <span>${item.shift}</span>
                </div>
            </div>
            <div class="card-unit">${item.unitKerja}</div>
            <div class="card-detail">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Ganti: <strong>${item.namaPegawai}</strong>
            </div>
            <div class="card-detail">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Jam: ${shiftInfo}
            </div>
            ${item.catatan ? `<div class="card-notes">"${item.catatan}"</div>` : ''}
            
            <div class="card-actions">
                <button type="button" class="btn-icon btn-edit" onclick="editItem('${item.id}')">Edit</button>
                <button type="button" class="btn-icon btn-delete" onclick="deleteItem('${item.id}')">Hapus</button>
            </div>
        </div>
    `;
}

// --- FORM ACTIONS ---
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

    if (!data.date || !data.unitKerja || !data.namaPegawai) {
        return showToast('Pastikan Tanggal, Unit, dan Nama terisi!', 'error');
    }

    state.isSubmitting = true;
    const btn = document.getElementById('btn-submit');
    const originalText = btn.textContent;
    btn.textContent = 'Memproses...';
    btn.disabled = true;

    try {
        if (id) {
            data.updatedAt = window.fb.serverTimestamp();
            await window.fb.updateDoc(window.fb.doc(window.fb.db, "schedules", id), data);
            showToast('Jadwal diperbarui!');
        } else {
            data.createdAt = window.fb.serverTimestamp();
            await window.fb.addDoc(window.fb.collection(window.fb.db, "schedules"), data);
            showToast('Jadwal baru tersimpan!');
        }
        closeModal();
    } catch (error) {
        console.error(error);
        showToast('Gagal menyimpan data!', 'error');
    } finally {
        state.isSubmitting = false;
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

window.editItem = (id) => {
    const item = state.schedules.find(s => s.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('schedule-date').value = item.date;
    document.getElementById('schedule-pegawai').value = item.namaPegawai;
    document.getElementById('schedule-notes').value = item.catatan || '';
    
    setShift(item.shift);
    setUnit(item.unitKerja);

    document.getElementById('modal-title').textContent = 'Edit Jadwal';
    document.getElementById('btn-submit').textContent = 'Update Data';
    document.getElementById('modal-overlay').classList.add('active');
};

// PERBAIKAN: Fungsi hapus sekarang mengarah ke window.fb.db dengan benar
window.deleteItem = async (id) => {
    if (confirm("Hapus jadwal ini secara permanen?")) {
        try {
            await window.fb.deleteDoc(window.fb.doc(window.fb.db, "schedules", id));
            showToast('Jadwal telah dihapus');
        } catch(err) {
            console.error("Gagal Hapus:", err);
            showToast('Gagal menghapus jadwal', 'error');
        }
    }
};

window.setShift = (val) => {
    document.getElementById('schedule-shift').value = val;
    document.getElementById('btn-pagi').className = 'shift-btn';
    document.getElementById('btn-malam').className = 'shift-btn';
    if (val === 'Pagi') document.getElementById('btn-pagi').classList.add('active', 'pagi-active');
    else document.getElementById('btn-malam').classList.add('active', 'malam-active');
};

window.toggleDropdown = () => {
    document.getElementById('unit-list').classList.toggle('show');
    document.getElementById('dropdown-container').classList.toggle('open');
};

window.setUnit = (val) => {
    document.getElementById('schedule-unit').value = val;
    const selectedText = document.getElementById('unit-selected');
    selectedText.textContent = val;
    selectedText.classList.add('has-value');
    document.getElementById('unit-list').classList.remove('show');
    document.getElementById('dropdown-container').classList.remove('open');
};

window.openModal = () => {
    document.getElementById('schedule-form').reset();
    document.getElementById('edit-id').value = '';
    setShift('Pagi');
    document.getElementById('schedule-unit').value = '';
    const selectedText = document.getElementById('unit-selected');
    selectedText.textContent = 'Pilih Unit Kerja';
    selectedText.classList.remove('has-value');
    
    document.getElementById('modal-title').textContent = 'Jadwal Baru';
    document.getElementById('btn-submit').textContent = 'Simpan Data';
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
    const icon = type === 'success' 
        ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    
    toast.innerHTML = `${icon} <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3500);
};
