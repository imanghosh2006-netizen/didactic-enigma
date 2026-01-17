// --- 1. SESSION MANAGEMENT ---
const currentUser = localStorage.getItem('twin_user');

if (!currentUser && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
}

function logout() {
    localStorage.removeItem('twin_user');
    window.location.href = 'login.html';
}

// --- 2. THE ENERGY ENGINE ---
function getEnergyAnalysis() {
    const hour = new Date().getHours();
    let multiplier = 1.0;
    let message = "";

    if (hour >= 8 && hour < 12) { multiplier = 1.0; message = "Peak Performance"; }
    else if (hour >= 12 && hour < 16) { multiplier = 0.7; message = "Mid-day Slump"; }
    else if (hour >= 16 && hour < 21) { multiplier = 0.9; message = "Evening Focus"; }
    else { multiplier = 0.5; message = "Rest Mode"; }

    return { multiplier, message };
}

// --- 3. CORE DATA LOADER ---
async function loadTwin() {
    try {
        const response = await fetch(`/api/data?user=${currentUser}`);
        if (!response.ok) throw new Error("User not found");
        const data = await response.json();

        // Update Energy UI
        const analysis = getEnergyAnalysis();
        const lastLog = data.healthLogs[data.healthLogs.length - 1] || { sleep: 8, mood: 7 };
        const baseline = (lastLog.sleep * 10) + lastLog.mood;
        const currentEnergy = Math.round(baseline * analysis.multiplier);
        
        document.getElementById('energy').innerHTML = `
            ${Math.min(currentEnergy, 100)}%
            <div style="font-size: 0.4em; font-weight: normal; color: #a29bfe; margin-top:5px;">
                ${analysis.message}
            </div>
        `;

        document.getElementById('user-name').innerText = data.name;

        // Update Next Task Display
        if(data.tasks.length > 0) {
            const sortedTasks = [...data.tasks].sort((a,b) => new Date(a.date) - new Date(b.date));
            document.getElementById('deadline-display').innerHTML = `
                ${sortedTasks[0].text} <br>
                <span style="font-size:0.7em; color:#ff9f43">${sortedTasks[0].date}</span>
            `;
        } else {
            document.getElementById('deadline-display').innerText = "All Clear!";
        }

        renderTasks(data.tasks);
        renderSubjects(data.subjects);

    } catch (error) {
        console.error("Connection Error:", error);
    }
}

// --- 4. RENDER HELPERS ---
function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    document.getElementById('task-count').innerText = tasks.length;
    list.innerHTML = tasks.map(task => `
        <div class="task-item">
            <span><strong>${task.text}</strong> <small style="color:#888; margin-left:10px;">${task.date}</small></span>
            <button class="task-delete" onclick="updateTwin('delete-task', ${task.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function renderSubjects(subjects) {
    const list = document.getElementById('subject-list');
    const dropdown = document.getElementById('study-subject');
    const editor = document.getElementById('subject-editor-list');
    
    list.innerHTML = '';
    dropdown.innerHTML = '';
    editor.innerHTML = '';

    subjects.forEach(sub => {
        // 1. Dashboard Summary List
        list.innerHTML += `<li>${sub.name}: <strong style="color:#6c5ce7">${sub.score}%</strong></li>`;

        // 2. Study Dropdown
        dropdown.innerHTML += `<option value="${sub.name}">${sub.name}</option>`;

        // 3. Subject Editor (Inputs for manual editing + Delete button)
        const editRow = document.createElement('div');
        editRow.className = 'subject-edit-row';
        editRow.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
        editRow.dataset.name = sub.name;
        editRow.innerHTML = `
            <span style="flex: 2;">${sub.name}</span>
            <input type="number" class="grade-input edit-score" value="${sub.score}" style="width: 70px; margin-right: 10px;">
            <button onclick="deleteSubject('${sub.name}')" class="task-delete" style="color: #ff5555;">
                <i class="fas fa-times-circle"></i>
            </button>
        `;
        editor.appendChild(editRow);
    });
}

// --- 5. UNIFIED UPDATE ENGINE ---
async function updateTwin(type, payload) {
    try {
        await fetch('/api/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                type: type,
                payload: payload
            })
        });
        loadTwin(); 
    } catch (err) {
        console.error("Update failed:", err);
    }
}

// --- 6. EVENT HANDLERS ---
function addTask() {
    const text = document.getElementById('new-task-text').value;
    const date = document.getElementById('new-task-date').value;
    if(!text || !date) return alert("Please enter task and date");
    updateTwin('add-task', { id: Date.now(), text, date });
    document.getElementById('new-task-text').value = '';
}

function addHealthLog() {
    const sleep = document.getElementById('sleep-input').value;
    const mood = document.getElementById('mood-input').value;
    if(!sleep) return alert("Enter sleep hours");
    const date = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    updateTwin('add-health', { date, sleep: parseFloat(sleep), mood: parseInt(mood) });
}

function startStudySession() {
    const subject = document.getElementById('study-subject').value;
    if(!subject) return alert("Add a subject first!");
    updateTwin('study', subject);
}

// NEW: Add Subject Handler
function addSubject() {
    const name = document.getElementById('new-subject-name').value;
    const score = document.getElementById('new-subject-score').value;
    if(!name || !score) return alert("Enter subject name and score");
    updateTwin('add-subject', { name: name, score: parseInt(score) });
    document.getElementById('new-subject-name').value = '';
    document.getElementById('new-subject-score').value = '';
}

// NEW: Save All Grades Handler
function saveGrades() {
    const rows = document.querySelectorAll('.subject-edit-row');
    const updates = Array.from(rows).map(row => ({
        name: row.dataset.name,
        score: parseInt(row.querySelector('.edit-score').value)
    }));
    updateTwin('update-all-grades', updates);
}

// NEW: Delete Subject Handler
function deleteSubject(name) {
    if(confirm(`Are you sure you want to delete ${name}?`)) {
        updateTwin('delete-subject', name);
    }
}

// --- 7. INITIALIZE ---
loadTwin();
setInterval(loadTwin, 60000);