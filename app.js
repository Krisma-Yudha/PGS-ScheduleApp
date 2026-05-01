let schedules = JSON.parse(localStorage.getItem("schedules")) || [];

function save() {
  localStorage.setItem("schedules", JSON.stringify(schedules));
}

function addSchedule() {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  const newSchedule = {
    id: Date.now().toString(),
    date,
    start,
    end,
    status: "pending",
    tasks: [
      { id: "1", text: "Patroli", done: false },
      { id: "2", text: "Cek pintu", done: false },
      { id: "3", text: "Monitor CCTV", done: false }
    ]
  };

  schedules.push(newSchedule);
  save();
  render();
}

function toggleTask(scheduleId, taskId) {
  const schedule = schedules.find(s => s.id === scheduleId);
  const task = schedule.tasks.find(t => t.id === taskId);
  task.done = !task.done;

  save();
  render();
}

function deleteSchedule(id) {
  schedules = schedules.filter(s => s.id !== id);
  save();
  render();
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  schedules.forEach(s => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${s.date} (${s.start} - ${s.end})</h3>
      ${s.tasks.map(t => `
        <div onclick="toggleTask('${s.id}', '${t.id}')" class="${t.done ? 'done' : ''}">
          ✔ ${t.text}
        </div>
      `).join("")}
      <br>
      <button onclick="deleteSchedule('${s.id}')">Hapus</button>
    `;

    list.appendChild(div);
  });
}

render();