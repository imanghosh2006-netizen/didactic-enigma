const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'users.json');

// --- DATABASE HELPERS ---
const db = {
    read: () => {
        try {
            if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(content || '{}');
        } catch (err) {
            console.error("Error reading database:", err);
            return {};
        }
    },
    write: (data) => {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Error writing to database:", err);
        }
    }
};

// --- ROUTES ---

// 1. Login & Registration
app.post('/api/login', (req, res) => {
    const { name, user, pin } = req.body;
    let users = db.read();

    if (!users[user]) {
        users[user] = {
            name: name,
            pin: pin,
            tasks: [],
            subjects: [
                { name: "Math", score: 70 },
                { name: "English", score: 80 }
            ],
            healthLogs: [{ date: "Sun", sleep: 8, mood: 7 }]
        };
        db.write(users);
        return res.json({ success: true, message: "New Twin Created" });
    }

    if (users[user].pin === pin) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Incorrect PIN" });
    }
});

// 2. Fetch User-Specific Data
app.get('/api/data', (req, res) => {
    const username = req.query.user;
    const users = db.read();
    if (users[username]) {
        res.json(users[username]);
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

// 3. Unified Update Route
app.post('/api/update-user', (req, res) => {
    const { username, type, payload } = req.body;
    let users = db.read();
    let user = users[username];

    if (!user) return res.status(404).json({ success: false });

    switch (type) {
        case 'add-task':
            user.tasks.push(payload);
            break;
        case 'delete-task':
            user.tasks = user.tasks.filter(t => t.id !== payload);
            break;
        case 'add-health':
            user.healthLogs.push(payload);
            if (user.healthLogs.length > 14) user.healthLogs.shift(); // Extended to 14 days
            break;
        case 'study':
            const sub = user.subjects.find(s => s.name === payload);
            if (sub) sub.score = Math.min(100, sub.score + 2);
            break;
        case 'add-subject':
            if (!user.subjects.find(s => s.name.toLowerCase() === payload.name.toLowerCase())) {
                user.subjects.push(payload);
            }
            break;
        case 'delete-subject': // NEW: Added ability to remove subjects
            user.subjects = user.subjects.filter(s => s.name !== payload);
            break;
        case 'update-all-grades': // NEW: Added bulk grade update logic
            user.subjects = payload; 
            break;
    }

    db.write(users);
    res.json({ success: true });
});

// This tells the server: "Use the host's assigned port, or 3000 if I'm on my laptop"
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`✅ Digital Twin Server is Live!`);
    console.log(`🚀 Access it at: http://localhost:${PORT}`);
    console.log(`🌍 Hosting Port: ${PORT}`);
    console.log(`-----------------------------------------`);
});