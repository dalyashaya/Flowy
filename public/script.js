/* ================= AUTH ================= */

async function register() {
    const usernameInput = document.getElementById('regUser');
    const passwordInput = document.getElementById('regPass');

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (username === '' || password === '') {
        alert('Please enter a username and password');
        return;
    }

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const text = await res.text();
    alert(text);
}

async function login() {
    const usernameInput = document.getElementById('logUser');
    const passwordInput = document.getElementById('logPass');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (res.redirected) {
        localStorage.clear();

        window.location.href = res.url;
    } else {
        const text = await res.text();
        alert(text);
    }
}

async function logout() {
    await fetch('/logout', { method: 'POST' });
    localStorage.clear();
    window.location.href = '/';
}

function startClock() {
    const timeEl = document.getElementById('liveTime');
    if (!timeEl) return;

    function updateTime() {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateTime();
    setInterval(updateTime, 1000);
}

const quotes = [
    "Small steps every day lead to big changes.",
    "Discipline is a form of self-love.",
    "You do not need to do everything, just the next right thing.",
    "Consistency creates confidence.",
    "Your future is shaped by what you repeat daily."
];

const affirmations = [
    "I am capable of building the life I want.",
    "I deserve peace, progress, and patience.",
    "I can be gentle with myself and still grow.",
    "I am becoming more disciplined every day.",
    "I am allowed to take up space and succeed."
];

let waterGoal = 8;
let waterCount = 0;

/* ================= WATER ================= */

async function fetchWaterCount() {
    const res = await fetch('/api/water');
    if (!res.ok) return 0;

    const data = await res.json();
    return data.cups || 0;
}

async function saveWaterCount(count) {
    const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cups: count })
    });

    if (!res.ok) {
        alert('Could not save water. Make sure you are logged in.');
    }
}

function renderWaterTracker() {
    const container = document.getElementById('waterIcons');
    const countText = document.getElementById('waterCount');

    if (!container || !countText) return;

    container.innerHTML = '';

    for (let i = 1; i <= waterGoal; i++) {
        const cup = document.createElement('span');
        cup.className = 'water-cup';
        cup.textContent = '💧';

        if (i > waterCount) {
            cup.classList.add('inactive');
        }

        cup.addEventListener('click', async () => {
            waterCount = i;
            await saveWaterCount(waterCount);
            renderWaterTracker();
        });

        container.appendChild(cup);
    }

    countText.textContent = `${waterCount} / ${waterGoal} cups`;
}

async function loadWaterTracker() {
    waterCount = await fetchWaterCount();
    renderWaterTracker();
}

/* ================= REMINDERS + CALENDAR ================= */

let calendarDate = new Date();
let allReminders = [];

function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchReminders() {
    const res = await fetch('/api/reminders');
    if (!res.ok) return [];
    return await res.json();
}

async function loadRemindersAndCalendar() {
    allReminders = await fetchReminders();
    renderRemindersList();
    renderCalendar();
}

async function addReminder() {
    const input = document.getElementById('reminderInput');
    const dateInput = document.getElementById('reminderDate');
    const timeInput = document.getElementById('reminderTime');
    const colorInput = document.getElementById('reminderColor');

    if (!input || !dateInput || !timeInput || !colorInput) {
        alert('Reminder form is missing fields.');
        return;
    }

    const text = input.value.trim();
    const reminder_date = dateInput.value;
    const reminder_time = timeInput.value;
    const color = colorInput.value;

    if (!text || !reminder_date || !reminder_time || !color) {
        alert('Please fill out reminder, date, time, and color.');
        return;
    }

    const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text,
            reminder_date,
            reminder_time,
            color
        })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        console.log('Reminder save failed:', data);
        alert(data?.error || 'Could not save reminder.');
        return;
    }

    input.value = '';
    timeInput.value = '';

    if (typeof loadRemindersAndCalendar === 'function') {
        await loadRemindersAndCalendar();
    }
}

async function deleteReminder(id) {
    const res = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE'
    });

    if (!res.ok) {
        alert('Could not delete reminder.');
        return;
    }

    await loadRemindersAndCalendar();
}

function renderRemindersList() {
    const reminderList = document.getElementById('reminderList');
    if (!reminderList) return;

    reminderList.innerHTML = '';

    if (allReminders.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'reminder-item blush';
        emptyMessage.innerHTML = `
            <div class="reminder-main">
                <span class="reminder-text">No reminders yet ✨</span>
            </div>
        `;
        reminderList.appendChild(emptyMessage);
        return;
    }

    allReminders.forEach((reminder) => {
        const item = document.createElement('li');
        item.className = `reminder-item ${reminder.color || 'blush'}`;

        item.innerHTML = `
            <div class="reminder-main">
                <span class="reminder-text">${reminder.text}</span>
                <span class="reminder-meta">${reminder.reminder_date} • ${reminder.reminder_time}</span>
            </div>
            <button class="reminder-delete" data-id="${reminder.id}">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        reminderList.appendChild(item);
    });
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarMonthLabel = document.getElementById('calendarMonthLabel');

    if (!calendarGrid || !calendarMonthLabel) return;

    calendarGrid.innerHTML = '';

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayIndex = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    calendarMonthLabel.textContent = calendarDate.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric'
    });

    for (let i = 0; i < startDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }

    const todayString = formatDateLocal(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateString = formatDateLocal(dateObj);

        const dayReminders = allReminders.filter(r => r.reminder_date === dateString);

        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        if (dateString === todayString) {
            cell.classList.add('today');
        }

        const dots = dayReminders
            .slice(0, 4)
            .map(r => `<span class="calendar-dot dot-${r.color || 'blush'}"></span>`)
            .join('');

        cell.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-dot-row">${dots}</div>
        `;

        cell.addEventListener('click', () => {
            const reminderDateInput = document.getElementById('reminderDate');
            if (reminderDateInput) {
                reminderDateInput.value = dateString;
            }
        });

        calendarGrid.appendChild(cell);
    }
}

function goToPreviousMonth() {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    renderCalendar();
}

function goToNextMonth() {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    renderCalendar();
}

/* ================= SLEEP ================= */

async function saveSleep() {
    const hours = document.getElementById('sleepHours').value;
    const quality = document.getElementById('sleepQuality').value;

    if (!hours || !quality) return;

    await fetch('/api/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours, quality })
    });

    loadSleep();
}

async function loadSleep() {
    const res = await fetch('/api/sleep');
    const data = await res.json();

    const summary = document.getElementById('sleepSummary');

    if (!data) {
        summary.textContent = 'No sleep logged yet 🌙';
        return;
    }

    summary.textContent = `${data.hours} hours • ${data.quality}`;
}
/* ================= MEDITATION ================= */

async function saveMeditation() {
    const minutes = document.getElementById('meditationMinutes').value;

    if (!minutes) return;

    await fetch('/api/meditation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
    });

    loadMeditation();
}

async function loadMeditation() {
    const res = await fetch('/api/meditation');
    const data = await res.json();

    const summary = document.getElementById('meditationSummary');

    if (!data) {
        summary.textContent = 'No meditation logged yet 🫶';
        return;
    }

    summary.textContent = `${data.minutes} minutes logged`;
}

/* ================= MEALS ================= */

async function fetchMeals() {
    const res = await fetch('/api/meals');
    if (!res.ok) {
        return {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            snack: 0,
            notes: ''
        };
    }

    return await res.json();
}

async function saveMeals() {
    const breakfast = document.getElementById('mealBreakfast')?.checked || false;
    const lunch = document.getElementById('mealLunch')?.checked || false;
    const dinner = document.getElementById('mealDinner')?.checked || false;
    const snack = document.getElementById('mealSnack')?.checked || false;
    const notes = document.getElementById('mealNotes')?.value || '';

    const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            breakfast,
            lunch,
            dinner,
            snack,
            notes
        })
    });

    if (!res.ok) {
        alert('Could not save meals.');
        return;
    }

    renderMealSummary();
}

async function loadMeals() {
    const data = await fetchMeals();

    const breakfast = document.getElementById('mealBreakfast');
    const lunch = document.getElementById('mealLunch');
    const dinner = document.getElementById('mealDinner');
    const snack = document.getElementById('mealSnack');
    const notes = document.getElementById('mealNotes');

    if (breakfast) breakfast.checked = !!data.breakfast;
    if (lunch) lunch.checked = !!data.lunch;
    if (dinner) dinner.checked = !!data.dinner;
    if (snack) snack.checked = !!data.snack;
    if (notes) notes.value = data.notes || '';

    renderMealSummary();
}

function renderMealSummary() {
    const summary = document.getElementById('mealSummary');
    const breakfast = document.getElementById('mealBreakfast')?.checked;
    const lunch = document.getElementById('mealLunch')?.checked;
    const dinner = document.getElementById('mealDinner')?.checked;
    const snack = document.getElementById('mealSnack')?.checked;
    const notes = document.getElementById('mealNotes')?.value.trim();

    if (!summary) return;

    const logged = [];
    if (breakfast) logged.push('Breakfast');
    if (lunch) logged.push('Lunch');
    if (dinner) logged.push('Dinner');
    if (snack) logged.push('Snack');

    if (logged.length === 0 && notes === '') {
        summary.textContent = 'No meals logged yet 🍽️';
        return;
    }

    let text = '';

    if (logged.length > 0) {
        text += `Logged today: ${logged.join(', ')}. `;
    }

    if (notes !== '') {
        text += `Notes: ${notes}`;
    }

    summary.textContent = text.trim();
}

/* ================= DATE / TEXT ================= */

function setTodayDate() {
    const dateEl = document.getElementById('todayDate');
    if (!dateEl) return;

    const today = new Date();
    dateEl.textContent = today.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
}

function setRandomAffirmation() {
    const affirmationEl = document.getElementById('affirmationText');
    if (!affirmationEl) return;

    const randomIndex = Math.floor(Math.random() * affirmations.length);
    affirmationEl.textContent = affirmations[randomIndex];
}

function setRandomQuote() {
    const quoteEl = document.getElementById('quoteText');
    if (!quoteEl) return;

    const randomIndex = Math.floor(Math.random() * quotes.length);
    quoteEl.textContent = quotes[randomIndex];
}

function setupAuthTabs() {
    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');
    const showLogin = document.getElementById('showLogin');
    const showRegister = document.getElementById('showRegister');

    if (!loginPanel || !registerPanel || !showLogin || !showRegister) return;

    showLogin.addEventListener('click', () => {
        showLogin.classList.add('active');
        showRegister.classList.remove('active');
        loginPanel.classList.add('active');
        registerPanel.classList.remove('active');
    });

    showRegister.addEventListener('click', () => {
        showRegister.classList.add('active');
        showLogin.classList.remove('active');
        registerPanel.classList.add('active');
        loginPanel.classList.remove('active');
    });
}

async function loadWelcomeMessage() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (!welcomeMessage) return;

    const res = await fetch('/api/me');
    if (!res.ok) return;

    const data = await res.json();
    if (data.username) {
        welcomeMessage.textContent = `Hello, ${data.username} ✨`;
    }
}

async function saveNotes() {
    const content = document.getElementById('notesInput').value;

    await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });

    loadNotes();
}

async function loadNotes() {
    const res = await fetch('/api/notes');
    const data = await res.json();

    if (data) {
        document.getElementById('notesInput').value = data.content;
    }
}

/* ================= GRATITUDE ================= */

async function loadGratitude() {
    const input = document.getElementById('gratitudeInput');
    const status = document.getElementById('gratitudeStatus');
    if (!input || !status) return;

    const res = await fetch('/api/gratitude');
    if (!res.ok) {
        status.textContent = 'Could not load gratitude';
        return;
    }

    const data = await res.json();
    input.value = data.content || '';
    status.textContent = data.content ? 'Saved for today 💗' : 'Nothing saved yet ✨';
}

async function saveGratitude() {
    const input = document.getElementById('gratitudeInput');
    const status = document.getElementById('gratitudeStatus');
    if (!input || !status) return;

    const content = input.value;

    const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });

    if (!res.ok) {
        status.textContent = 'Could not save 😭';
        return;
    }

    status.textContent = 'Saved for today 💗';
}

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', () => {
    setupAuthTabs();
    loadWelcomeMessage();
    startClock();
    setTodayDate();
    loadWaterTracker();
    loadRemindersAndCalendar();
    renderSleepSummary();
    renderMeditationSummary();
    loadMeals();
    setRandomAffirmation();
    setRandomQuote();

    const quoteButton = document.getElementById('newQuoteButton');
    if (quoteButton) {
        quoteButton.addEventListener('click', setRandomQuote);
    }

    const addReminderButton = document.getElementById('addReminderButton');
    if (addReminderButton) {
        addReminderButton.addEventListener('click', addReminder);
    }

    const saveSleepButton = document.getElementById('saveSleepButton');
    if (saveSleepButton) {
        saveSleepButton.addEventListener('click', saveSleep);
    }

    const saveMeditationButton = document.getElementById('saveMeditationButton');
    if (saveMeditationButton) {
        saveMeditationButton.addEventListener('click', saveMeditation);
    }

    const saveMealsButton = document.getElementById('saveMealsButton');
    if (saveMealsButton) {
        saveMealsButton.addEventListener('click', saveMeals);
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    const prevMonthButton = document.getElementById('prevMonthButton');
    if (prevMonthButton) {
        prevMonthButton.addEventListener('click', goToPreviousMonth);
    }

    const nextMonthButton = document.getElementById('nextMonthButton');
    if (nextMonthButton) {
        nextMonthButton.addEventListener('click', goToNextMonth);
    }

    document.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.reminder-delete');
        if (deleteButton) {
            const id = deleteButton.dataset.id;
            deleteReminder(id);
        }
    });
});

// document.addEventListener('DOMContentLoaded', () => {
//     setupAuthTabs();
//     loadWelcomeMessage();
//     setTodayDate();
//     loadWaterTracker();
//     renderReminders();
//     setRandomAffirmation();
//     setRandomQuote();
//     loadMeals();
//     startClock();
//     loadSleep();
//     loadMeditation();
//     loadNotes();
//      loadRemindersAndCalendar();

//     const quoteButton = document.getElementById('newQuoteButton');
//     if (quoteButton) {
//         quoteButton.addEventListener('click', setRandomQuote);
//     }

//     const addReminderButton = document.getElementById('addReminderButton');
//     if (addReminderButton) {
//         addReminderButton.addEventListener('click', addReminder);
//     }

//     const reminderInput = document.getElementById('reminderInput');
//     if (reminderInput) {
//         reminderInput.addEventListener('keydown', (event) => {
//             if (event.key === 'Enter') {
//                 addReminder();
//             }
//         });
//     }

//     const saveSleepButton = document.getElementById('saveSleepButton');
//     if (saveSleepButton) {
//         saveSleepButton.addEventListener('click', saveSleep);
//     }

//     const saveMeditationButton = document.getElementById('saveMeditationButton');
//     if (saveMeditationButton) {
//         saveMeditationButton.addEventListener('click', saveMeditation);
//     }

//     const saveMealsButton = document.getElementById('saveMealsButton');
//     if (saveMealsButton) {
//         saveMealsButton.addEventListener('click', saveMeals);
//     }

//     const logoutButton = document.getElementById('logoutButton');
//     if (logoutButton) {
//         logoutButton.addEventListener('click', logout);
//     }

// const prevMonthButton = document.getElementById('prevMonthButton');
//     if (prevMonthButton) {
//         prevMonthButton.addEventListener('click', goToPreviousMonth);
//     }

//     const nextMonthButton = document.getElementById('nextMonthButton');
//     if (nextMonthButton) {
//         nextMonthButton.addEventListener('click', goToNextMonth);
//     }

//     document.addEventListener('click', (event) => {
//         const deleteButton = event.target.closest('.reminder-delete');
//         if (deleteButton) {
//             const id = deleteButton.dataset.id;
//             deleteReminder(id);
//         }
//     });
// });