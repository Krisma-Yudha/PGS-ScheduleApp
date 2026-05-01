let schedules = [];

// Quotes Acak
const quotes = [
    '"Disiplin adalah jembatan antara tujuan dan pencapaian."',
    '"Keamanan bukan sekadar tugas, melainkan tanggung jawab moral."',
    '"Kewaspadaan hari ini adalah keselamatan esok hari."',
    '"Tugasmu adalah tameng bagi mereka yang tidak menyadarinya."',
    '"Profesionalisme diukur dari apa yang kamu lakukan saat tidak ada yang melihat."',
    '"Fokus pada detail kecil mencegah masalah besar."',
    '"Seorang penjaga yang baik lebih banyak mengamati daripada berbicara."',
    '"Integritas adalah aset paling berharga dalam pengamanan."',
    '"Tidak ada hari yang terlalu aman untuk berhenti waspada."',
    '"Loyalitas pada tugas adalah kehormatan seorang prajurit keamanan."'
];

function init() {
    updateHeaderDate();
    setRandomQuote();
    
    // Close dropdown saat klik di luar area
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.getElementById('unit-list').classList.remove('show');
            document.querySelector('.custom-dropdown').classList.remove('open');
        }
    });

    const waitDB = setInterval(() => {
        if (window.db) {
            clearInterval(waitDB);
            syncRealtime();
        }
    }, 100);
}

function updateHeaderDate() {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('header-date').textContent = new Date().toLocaleDateString('id-ID', options);
}

function setRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    document.getElementById('quote-display').textContent = quotes[randomIndex];
}

// Toast Notifikasi Bouncy
window.showToast = function(message, type = 'success') {
    const oldToast = document.getElementById('app-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = `toast-container ${type === 'error' ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// Logika Warna Tombol Shift
window.setShift = function(shiftValue) {
    document.getElementById('schedule-shift').value = shiftValue;
    const btnPagi = document.getElementById('btn-pagi');
    const btnMalam = document.getElementById('btn-malam');
    
    btnPagi.className = 'shift-btn'; 
    btnMalam.className = 'shift-btn'; 
    
    if (shiftValue === 'Pagi') {
        btnPagi.classList.add('active', 'pagi-active');
    } else {
        btnMalam.classList.add('active', 'malam-active');
    }
};

window.toggleDropdown = function() {
    document.getElementById('unit-list').classList.toggle('show');
    document.querySelector('.custom-dropdown').classList.toggle('open');
};

window.setUnit = function(unitName) {
    document.getElementById('schedule-unit').value = unitName;
    document.getElementById('unit-selected').textContent = unitName;
    document.getElementById('unit-list').classList.remove('show');
    document.querySelector('.custom-dropdown').classList.remove('open');
    document.getElementById('unit-selected').style.color = "var(--text-main)";
};

function syncRealtime() {
    const { collection, query, orderBy, onSnapshot } = window.fb;
    const q = query(collection(window.db, "schedules"), orderBy("date", "desc"));

    onSnapshot(q, (snapshot) => {
        schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUI();
    });
}

function renderUI() {
    const upcomingContainer = document.getElementById('upcoming-container');
    const allContainer = document.getElementById('all-container');
    
    upcomingContainer.innerHTML = '';
    allContainer.innerHTML = '';
    document.getElementById('total-count').textContent = schedules.length + " Total";

    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let upcomingCount = 0;
    let globalIndex = 0; // Untuk mengatur jeda animasi berurutan (cascade)

    schedules.forEach(item => {
        const itemDate = new Date(item.date);
        itemDate.setHours(0,0,0,0);
        
        const cardHTML = createCardHTML(item, globalIndex++);
        
        const divAll = document.createElement('div');
        divAll.innerHTML = cardHTML;
        allContainer.appendChild(divAll.firstElementChild);

        if (itemDate.getTime() === today.getTime() || itemDate.getTime() === tomorrow.getTime()) {
            const divUp = document.createElement('div');
            divUp.innerHTML = cardHTML;
            upcomingContainer.appendChild(divUp.firstElementChild);
            upcomingCount++;
        }
    });

    if (upcomingCount === 0) upcomingContainer.innerHTML = '<div class="empty-state" style="color:var(--text-muted); font-size:0.9rem; padding:12px 0;">Tidak ada jadwal untuk hari ini atau besok.</div>';
    if (schedules.length === 0) allContainer.innerHTML = '<div class="empty-state" style="color:var(--text-muted); font-size:0.9rem; padding:12px 0;">Belum ada jadwal yang tersimpan.</div>';
}

function createCardHTML(item, index) {
    const d = new Date(item.date);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const shiftText = item.shift === 'Pagi' ? 'Pagi (07:00-19:00)' : 'Malam (19:00-07:00)';
    const animDelay = index * 0.05; // Kartu muncul bergantian
    
    return `
        <div class="card" style="animation-delay: ${animDelay}s">
            <div class="card-top">
                <span class="card-date">${dateStr}</span>
                <div class="shift-indicator">
                    <span class="dot ${item.shift}"></span>
                    <span>${item.shift}</span>
                </div>
            </div>
            <div class="card-unit">${item.unitKerja}</div>
            <div class="card-detail"><strong>Ganti:</strong> ${item.namaPegawai}</div>
            <div class="card-detail"><strong>Jam:</strong> ${shiftText}</div>
            ${item.catatan ? `<div class="card-detail" style="margin-top:8px; font-style:italic;">"${item.catatan}"</div>` : ''}
            
            <div class="card-actions">
                <button class="btn-icon btn-edit" onclick="editItem('${item.id}')">Edit</button>
                <button class="btn-icon btn-delete" onclick="deleteItem('${item.id}')">Hapus</button>
            </div>
        </div>
    `;
}

window.editItem = function(id) {
    const item = schedules.find(s => s.id === id);
    if (!item) return;

    document.getElementById('modal-title').textContent = 'Edit Jadwal';
    document.getElementById('btn-submit').textContent = 'Update';
    
    document.getElementById('edit-id').value = item.id;
    document.getElementById('schedule-date').value = item.date;
    document.getElementById('schedule-pegawai').value = item.namaPegawai;
    document.getElementById('schedule-notes').value = item.catatan || '';

    setShift(item.shift);
    setUnit(item.unitKerja);

    document.getElementById('modal-overlay').classList.add('active');
};

document.getElementById('schedule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    const editId = document.getElementById('edit-id').value;
    const shiftVal = document.getElementById('schedule-shift').value;
    const unitVal = document.getElementById('schedule-unit').value;

    if (!unitVal) {
        showToast('Silakan pilih Unit Kerja', 'error');
        btn.disabled = false;
        btn.textContent = editId ? 'Update' : 'Simpan';
        return;
    }

    const payload = {
        date: document.getElementById('schedule-date').value,
        shift: shiftVal,
        unitKerja: unitVal,
        namaPegawai: document.getElementById('schedule-pegawai').value,
        catatan: document.getElementById('schedule-notes').value,
        timestamp: editId ? undefined : new Date().getTime()
    };

    try {
        if (editId) {
            await window.fb.updateDoc(window.fb.doc(window.db, "schedules", editId), payload);
            showToast('Jadwal berhasil diperbarui!');
        } else {
            await window.fb.addDoc(window.fb.collection(window.db, "schedules"), payload);
            showToast('Jadwal baru berhasil disimpan!');
        }
        closeModal();
    } catch (err) {
        showToast('Gagal: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
});

window.deleteItem = async function(id) {
    if (confirm("Hapus jadwal ini?")) {
        try {
            await window.fb.deleteDoc(window.fb.doc(window.db, "schedules", id));
            showToast('Jadwal dihapus!');
        } catch(err) {
            showToast('Gagal menghapus', 'error');
        }
    }
};

window.openModal = function() {
    document.getElementById('schedule-form').reset();
    document.getElementById('edit-id').value = '';
    
    setShift('Pagi');
    document.getElementById('schedule-unit').value = '';
    document.getElementById('unit-selected').textContent = 'Pilih Unit Kerja';
    document.getElementById('unit-selected').style.color = "var(--text-muted)";

    document.getElementById('modal-title').textContent = 'Jadwal Baru';
    document.getElementById('btn-submit').textContent = 'Simpan';
    document.getElementById('modal-overlay').classList.add('active');
};

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.remove('active');
};

init();
