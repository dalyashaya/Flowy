const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

const db = new sqlite3.Database('./database.db');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'flowy-secret',
    resave: false,
    saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    // db.run(`
    //     CREATE TABLE IF NOT EXISTS habits (
    //         id INTEGER PRIMARY KEY AUTOINCREMENT,
    //         user_id INTEGER,
    //         name TEXT,
    //         created_at TEXT
    //     )
    // `);

    // db.run(`
    //     CREATE TABLE IF NOT EXISTS habit_logs (
    //         id INTEGER PRIMARY KEY AUTOINCREMENT,
    //         habit_id INTEGER,
    //         date TEXT
    //     )
    // `);

    db.run(`
        CREATE TABLE IF NOT EXISTS gratitude_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date TEXT,
            content TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            text TEXT,
            reminder_date TEXT,
            reminder_time TEXT,
            color TEXT,
            created_at TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS water_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            cups INTEGER,
            date TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS meal_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date TEXT,
            breakfast INTEGER DEFAULT 0,
            lunch INTEGER DEFAULT 0,
            dinner INTEGER DEFAULT 0,
            snack INTEGER DEFAULT 0,
            notes TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sleep_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            hours REAL,
            quality TEXT,
            date TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS meditation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            minutes INTEGER,
            date TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            content TEXT,
            date TEXT
        )
    `);
});

// PROTECTED DASHBOARD
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }

    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// REGISTER
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);

    db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hash],
        (err) => {
            if (err) return res.send('User already exists');
            res.send('Registered successfully');
        }
    );
});

// LOGIN
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (!user) return res.send('User not found');

        if (!bcrypt.compareSync(password, user.password)) {
            return res.send('Wrong password');
        }

        req.session.userId = user.id;
        res.redirect('/dashboard');
    });
});

// ADD HABIT
app.post('/add-habit', (req, res) => {
    if (!req.session.userId) return res.send('Not logged in');

    const { name } = req.body;

    db.run(
        'INSERT INTO habits (user_id, name, created_at) VALUES (?, ?, ?)',
        [req.session.userId, name, new Date().toISOString()],
        () => res.send('Habit added')
    );
});

// GET TODAY'S GRATITUDE
app.get('/api/gratitude', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ content: '' });
    }

    const today = new Date().toISOString().split('T')[0];

    db.get(
        'SELECT content FROM gratitude_logs WHERE user_id = ? AND date = ?',
        [req.session.userId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({ content: '' });
            }

            res.json({ content: row ? row.content : '' });
        }
    );
});

// SAVE TODAY'S GRATITUDE
app.post('/api/gratitude', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const { content } = req.body;
    const today = new Date().toISOString().split('T')[0];

    db.get(
        'SELECT id FROM gratitude_logs WHERE user_id = ? AND date = ?',
        [req.session.userId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                db.run(
                    'UPDATE gratitude_logs SET content = ? WHERE id = ?',
                    [content || '', row.id],
                    function (updateErr) {
                        if (updateErr) {
                            return res.status(500).json({ error: 'Failed to update gratitude' });
                        }

                        res.json({ success: true });
                    }
                );
            } else {
                db.run(
                    'INSERT INTO gratitude_logs (user_id, date, content) VALUES (?, ?, ?)',
                    [req.session.userId, today, content || ''],
                    function (insertErr) {
                        if (insertErr) {
                            return res.status(500).json({ error: 'Failed to save gratitude' });
                        }

                        res.json({ success: true });
                    }
                );
            }
        }
    );
});

app.get('/api/reminders', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json([]);
    }

    db.all(
        `SELECT * FROM reminders
         WHERE user_id = ?
         ORDER BY reminder_date ASC, reminder_time ASC, id ASC`,
        [req.session.userId],
        (err, rows) => {
            if (err) {
                console.log('GET reminders error:', err.message);
                return res.status(500).json([]);
            }
            res.json(rows || []);
        }
    );
});

app.post('/api/reminders', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    console.log('REQ BODY:', req.body);

    const { text, reminder_date, reminder_time, color } = req.body;
    const allowedColors = ['blush', 'lavender', 'sky', 'peach', 'sage', 'butter'];

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Reminder text is required' });
    }

    if (!reminder_date) {
        return res.status(400).json({ error: 'Reminder date is required' });
    }

    if (!reminder_time) {
        return res.status(400).json({ error: 'Reminder time is required' });
    }

    if (!allowedColors.includes(color)) {
        return res.status(400).json({ error: 'Invalid color' });
    }

    db.run(
        `INSERT INTO reminders
         (user_id, text, reminder_date, reminder_time, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            req.session.userId,
            text.trim(),
            reminder_date,
            reminder_time,
            color,
            new Date().toISOString()
        ],
        function (err) {
            if (err) {
                console.log('POST reminder error:', err.message);
                return res.status(500).json({ error: 'Failed to add reminder' });
            }

            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/reminders/:id', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    db.run(
        'DELETE FROM reminders WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.userId],
        function (err) {
            if (err) {
                console.log('DELETE reminder error:', err.message);
                return res.status(500).json({ error: 'Failed to delete reminder' });
            }

            res.json({ success: true });
        }
    );
});

//GREETING
app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ username: null });
    }

    db.get(
        'SELECT username FROM users WHERE id = ?',
        [req.session.userId],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ username: null });
            }

            res.json({ username: user.username });
        }
    );
});

// ADD REMINDER
app.post('/api/reminders', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Reminder text is required' });
    }

    db.run(
        'INSERT INTO reminders (user_id, text, date) VALUES (?, ?, ?)',
        [req.session.userId, text.trim(), new Date().toISOString()],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to add reminder' });
            }

            res.json({
                id: this.lastID,
                success: true
            });
        }
    );
});

// DELETE REMINDER
app.delete('/api/reminders/:id', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const reminderId = req.params.id;

    db.run(
        'DELETE FROM reminders WHERE id = ? AND user_id = ?',
        [reminderId, req.session.userId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete reminder' });
            }

            res.json({ success: true });
        }
    );
});

// GET WATER FOR TODAY
app.get('/api/water', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ cups: 0 });
    }

    const today = new Date().toISOString().split('T')[0];

    db.get(
        'SELECT cups FROM water_logs WHERE user_id = ? AND date = ?',
        [req.session.userId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({ cups: 0 });
            }

            res.json({ cups: row ? row.cups : 0 });
        }
    );
});

// SAVE WATER FOR TODAY
app.post('/api/water', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const { cups } = req.body;
    const today = new Date().toISOString().split('T')[0];

    if (typeof cups !== 'number' || cups < 0 || cups > 8) {
        return res.status(400).json({ error: 'Invalid water amount' });
    }

    db.get(
        'SELECT id FROM water_logs WHERE user_id = ? AND date = ?',
        [req.session.userId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                db.run(
                    'UPDATE water_logs SET cups = ? WHERE id = ?',
                    [cups, row.id],
                    function (updateErr) {
                        if (updateErr) {
                            return res.status(500).json({ error: 'Failed to update water' });
                        }

                        res.json({ success: true });
                    }
                );
            } else {
                db.run(
                    'INSERT INTO water_logs (user_id, cups, date) VALUES (?, ?, ?)',
                    [req.session.userId, cups, today],
                    function (insertErr) {
                        if (insertErr) {
                            return res.status(500).json({ error: 'Failed to save water' });
                        }

                        res.json({ success: true });
                    }
                );
            }
        }
    );
});

// GET TODAY'S MEALS
app.get('/api/meals', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({});
    }

    const today = new Date().toISOString().split('T')[0];

    db.get(
        'SELECT * FROM meal_logs WHERE user_id = ? AND date = ?',
        [req.session.userId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({});
            }

            res.json(row || {
                breakfast: 0,
                lunch: 0,
                dinner: 0,
                snack: 0,
                notes: ''
            });
        }
    );
});

// SAVE TODAY'S MEALS
app.post('/api/meals', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const { breakfast, lunch, dinner, snack, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];

    db.get(
        'SELECT id FROM meal_logs WHERE user_id = ? AND date = ?',
        [req.session.userId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                db.run(
                    `UPDATE meal_logs
                     SET breakfast = ?, lunch = ?, dinner = ?, snack = ?, notes = ?
                     WHERE id = ?`,
                    [
                        breakfast ? 1 : 0,
                        lunch ? 1 : 0,
                        dinner ? 1 : 0,
                        snack ? 1 : 0,
                        notes || '',
                        row.id
                    ],
                    function (updateErr) {
                        if (updateErr) {
                            return res.status(500).json({ error: 'Failed to update meals' });
                        }

                        res.json({ success: true });
                    }
                );
            } else {
                db.run(
                    `INSERT INTO meal_logs
                     (user_id, date, breakfast, lunch, dinner, snack, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.session.userId,
                        today,
                        breakfast ? 1 : 0,
                        lunch ? 1 : 0,
                        dinner ? 1 : 0,
                        snack ? 1 : 0,
                        notes || ''
                    ],
                    function (insertErr) {
                        if (insertErr) {
                            return res.status(500).json({ error: 'Failed to save meals' });
                        }

                        res.json({ success: true });
                    }
                );
            }
        }
    );
});

app.get('/api/sleep', (req, res) => {
    if (!req.session.userId) return res.json(null);

    db.get(
        'SELECT * FROM sleep_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [req.session.userId],
        (err, row) => res.json(row || null)
    );
});

app.post('/api/sleep', (req, res) => {
    if (!req.session.userId) return res.status(401).end();

    const { hours, quality } = req.body;

    db.run(
        'INSERT INTO sleep_logs (user_id, hours, quality, date) VALUES (?, ?, ?, ?)',
        [req.session.userId, hours, quality, new Date().toISOString()],
        () => res.json({ success: true })
    );
});

app.get('/api/meditation', (req, res) => {
    if (!req.session.userId) return res.json(null);

    db.get(
        'SELECT * FROM meditation_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [req.session.userId],
        (err, row) => res.json(row || null)
    );
});

app.post('/api/meditation', (req, res) => {
    if (!req.session.userId) return res.status(401).end();

    const { minutes } = req.body;

    db.run(
        'INSERT INTO meditation_logs (user_id, minutes, date) VALUES (?, ?, ?)',
        [req.session.userId, minutes, new Date().toISOString()],
        () => res.json({ success: true })
    );
});

app.get('/api/notes', (req, res) => {
    if (!req.session.userId) return res.json(null);

    db.get(
        'SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [req.session.userId],
        (err, row) => res.json(row || null)
    );
});

app.post('/api/notes', (req, res) => {
    if (!req.session.userId) return res.status(401).end();

    const { content } = req.body;

    db.run(
        'INSERT INTO notes (user_id, content, date) VALUES (?, ?, ?)',
        [req.session.userId, content, new Date().toISOString()],
        () => res.json({ success: true })
    );
});

// LOGOUT
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Flowy running at http://localhost:${PORT}`);
});