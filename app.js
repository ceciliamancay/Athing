// Morning Brain Dump Application
class BrainDumpApp {
    constructor() {
        // Fixed habits - these never change
        this.FIXED_HABITS = ['Meds', 'Cat Teeth', 'Sports', 'Read'];

        // Data storage
        this.todos = this.loadData('todos') || [];
        this.habitCompletions = this.loadData('habitCompletions') || {};
        this.calendarItems = this.loadData('calendarItems') || [];
        this.dumpHistory = this.loadData('dumpHistory') || [];
        this.journalEntries = this.loadData('journalEntries') || [];
        this.morningReminders = this.loadData('morningReminders') || [];

        this.currentDate = new Date();
        this.pendingItems = [];
        this.currentMode = 'morning';

        this.init();
    }

    init() {
        this.initializeHabits();
        this.renderAll();
        this.setupEventListeners();
        this.checkMorningReminder();
    }

    initializeHabits() {
        // Initialize habit completions structure if empty
        const today = this.getTodayKey();
        if (!this.habitCompletions[today]) {
            this.habitCompletions[today] = {};
        }
    }

    setupEventListeners() {
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Main actions
        document.getElementById('parseDumpBtn').addEventListener('click', () => this.parseBrainDump());
        document.getElementById('completeDay').addEventListener('click', () => this.completeDay());

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // Modal actions
        document.getElementById('confirmBtn').addEventListener('click', () => this.confirmItems());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());

        // Close modals when clicking outside
        document.getElementById('confirmationModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmationModal') this.closeModal();
        });

        document.getElementById('reminderModal').addEventListener('click', (e) => {
            if (e.target.id === 'reminderModal') this.closeReminderModal();
        });

        document.getElementById('closeReminder')?.addEventListener('click', () => this.closeReminderModal());

        // Progress indicator on textarea input
        const textarea = document.getElementById('brainDumpInput');
        textarea.addEventListener('input', () => this.updateProgressIndicator());
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Update button states
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Toggle sections
        const inputSection = document.getElementById('inputSection');
        const eveningSection = document.getElementById('eveningSection');

        if (mode === 'evening') {
            inputSection.style.display = 'none';
            eveningSection.style.display = 'block';
            this.renderEveningReview();
        } else {
            inputSection.style.display = 'block';
            eveningSection.style.display = 'none';

            // Update placeholder based on mode
            const textarea = document.getElementById('brainDumpInput');
            if (mode === 'morning') {
                textarea.placeholder = `Just start writing... get it all out.

Example:
Oh, I need to remember to look for an Airbnb in Costa Rica on Monday. Also need to book that dentist appointment. Yoga with Carine would be great Monday too.`;
            } else {
                textarea.placeholder = 'Quick thoughts or tasks to add...';
            }
        }
    }

    updateProgressIndicator() {
        const textarea = document.getElementById('brainDumpInput');
        const progressIndicator = document.getElementById('progressIndicator');
        const progressFill = document.getElementById('progressFill');

        if (textarea.value.length > 0) {
            progressIndicator.style.opacity = '1';
            const wordCount = textarea.value.trim().split(/\s+/).length;
            const progress = Math.min((wordCount / 30) * 100, 100);
            progressFill.style.width = progress + '%';
        } else {
            progressIndicator.style.opacity = '0';
            progressFill.style.width = '0%';
        }
    }

    // Check for morning reminder
    checkMorningReminder() {
        const today = this.getTodayKey();
        const lastCheck = localStorage.getItem('lastReminderCheck');

        if (lastCheck !== today && this.morningReminders.length > 0) {
            const reminder = this.morningReminders[this.morningReminders.length - 1];
            this.showMorningReminder(reminder);
            localStorage.setItem('lastReminderCheck', today);
        }
    }

    showMorningReminder(reminder) {
        const modal = document.getElementById('reminderModal');
        const message = document.getElementById('reminderMessage');
        message.innerHTML = `<p>${this.escapeHtml(reminder)}</p>`;
        modal.style.display = 'flex';
    }

    closeReminderModal() {
        document.getElementById('reminderModal').style.display = 'none';
    }

    // Parse brain dump with smart simplification
    parseBrainDump() {
        const input = document.getElementById('brainDumpInput');
        const text = input.value.trim();

        if (!text) return;

        // Save to history
        this.dumpHistory.unshift({
            id: Date.now(),
            date: new Date().toISOString(),
            text: text
        });
        this.saveData('dumpHistory', this.dumpHistory);

        // Split text into sentences/items
        const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);

        this.pendingItems = sentences
            .map((sentence, index) => {
                const item = sentence.trim();

                // Skip non-actionable statements
                if (this.isNonActionable(item)) {
                    return null;
                }

                const date = this.parseDate(item);
                const simplified = this.simplifyText(item);

                return {
                    id: Date.now() + index,
                    originalText: item,
                    text: simplified,
                    cleanText: this.cleanItemText(simplified),
                    date: date,
                    category: date ? 'calendar' : 'todo',
                    completed: false
                };
            })
            .filter(item => item !== null); // Remove nulls

        if (this.pendingItems.length === 0) {
            input.value = '';
            this.updateProgressIndicator();
            return;
        }

        this.showConfirmationModal();
        input.value = '';
        this.updateProgressIndicator();
        this.renderDumpHistory();
    }

    // Check if text is non-actionable
    isNonActionable(text) {
        const lowerText = text.toLowerCase().trim();

        // Filter out mental preparation statements
        const nonActionablePatterns = [
            /^(okay|ok|alright|right|well|so|hmm|uh|um)/,
            /^i (got|have) (this|it)/,
            /^let'?s (see|think)/,
            /^it'?s (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
            /^what (else|was|is)/,
            /^(also|and then)/,
        ];

        // Very short or just filler words
        if (lowerText.length < 3) return true;

        return nonActionablePatterns.some(pattern => pattern.test(lowerText));
    }

    // Simplify text intelligently
    simplifyText(text) {
        let simplified = text;

        // Remove leading filler phrases
        simplified = simplified.replace(/^(oh,?\s*|ah,?\s*|I (need to|have to|should|must|want to|got to)\s*)/i, '');
        simplified = simplified.replace(/^(remember to|don't forget to)\s*/i, '');

        // Simplification patterns
        const patterns = [
            // "need to look for an Airbnb" -> "Book Airbnb"
            { regex: /look\s+for\s+(an?\s+)?airbnb/i, replacement: 'Book Airbnb' },
            { regex: /find\s+(an?\s+)?airbnb/i, replacement: 'Book Airbnb' },
            { regex: /(book|schedule|make)\s+(an?\s+)?appointment\s+(with|for|at)?\s*(.+)?/i,
              replacement: (match, action, article, prep, details) => `${details || 'Appointment'}` },

            // Generic simplifications
            { regex: /(look for|search for|find)\s+(.+)/i, replacement: 'Find $2' },
            { regex: /(need to|have to|got to|must)\s+(.+)/i, replacement: '$2' },
            { regex: /^(start|begin)\s+(.+)/i, replacement: '$2' },
            { regex: /^(work on|working on)\s+(.+)/i, replacement: '$2' },
        ];

        for (let pattern of patterns) {
            if (typeof pattern.replacement === 'function') {
                simplified = simplified.replace(pattern.regex, pattern.replacement);
            } else {
                simplified = simplified.replace(pattern.regex, pattern.replacement);
            }
        }

        // Capitalize first letter
        simplified = simplified.charAt(0).toUpperCase() + simplified.slice(1);

        return simplified;
    }

    // Natural language date parser
    parseDate(text) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lowerText = text.toLowerCase();

        // Today
        if (lowerText.includes('today')) {
            return new Date(today);
        }

        // Tomorrow
        if (lowerText.includes('tomorrow')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        }

        // Yesterday
        if (lowerText.includes('yesterday')) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        }

        // Day names
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayMatch = dayNames.find(day => lowerText.includes(day));
        if (dayMatch) {
            const targetDay = dayNames.indexOf(dayMatch);
            const currentDay = today.getDay();
            let daysToAdd = targetDay - currentDay;

            if (lowerText.includes('next') || daysToAdd <= 0) {
                daysToAdd += (daysToAdd <= 0 ? 7 : 0);
            }

            const result = new Date(today);
            result.setDate(result.getDate() + daysToAdd);
            return result;
        }

        // Next week
        if (lowerText.includes('next week')) {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
        }

        // Month names with day numbers
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const monthAbbrev = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        for (let i = 0; i < monthNames.length; i++) {
            const monthPattern = new RegExp(`(${monthNames[i]}|${monthAbbrev[i]})\\s+(\\d{1,2})`, 'i');
            const match = text.match(monthPattern);
            if (match) {
                const day = parseInt(match[2]);
                const year = today.getFullYear();
                const date = new Date(year, i, day);

                if (date < today) {
                    date.setFullYear(year + 1);
                }
                return date;
            }
        }

        // Date formats
        const datePatterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            /(\d{1,2})-(\d{1,2})-(\d{4})/,
            /(\d{4})-(\d{1,2})-(\d{1,2})/
        ];

        for (let pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                let year, month, day;
                if (pattern === datePatterns[2]) {
                    [, year, month, day] = match;
                } else {
                    [, month, day, year] = match;
                }
                return new Date(year, parseInt(month) - 1, day);
            }
        }

        // In X days/weeks
        const inXDaysMatch = text.match(/in (\d+) (day|days)/i);
        if (inXDaysMatch) {
            const days = parseInt(inXDaysMatch[1]);
            const result = new Date(today);
            result.setDate(result.getDate() + days);
            return result;
        }

        const inXWeeksMatch = text.match(/in (\d+) (week|weeks)/i);
        if (inXWeeksMatch) {
            const weeks = parseInt(inXWeeksMatch[1]);
            const result = new Date(today);
            result.setDate(result.getDate() + (weeks * 7));
            return result;
        }

        return null;
    }

    // Clean up item text
    cleanItemText(text) {
        let cleaned = text;

        // Remove common date patterns
        cleaned = cleaned.replace(/\b(today|tomorrow|yesterday)\b/gi, '');
        cleaned = cleaned.replace(/\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week)\b/gi, '');
        cleaned = cleaned.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi, '');
        cleaned = cleaned.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/gi, '');
        cleaned = cleaned.replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '');
        cleaned = cleaned.replace(/\d{1,2}-\d{1,2}-\d{4}/g, '');
        cleaned = cleaned.replace(/\d{4}-\d{1,2}-\d{1,2}/g, '');
        cleaned = cleaned.replace(/\bin \d+ (day|days|week|weeks)\b/gi, '');
        cleaned = cleaned.replace(/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '');
        cleaned = cleaned.replace(/\bby\s+/gi, '');
        cleaned = cleaned.replace(/\bon\s+/gi, '');

        // Clean up whitespace
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.trim();

        return cleaned;
    }

    // Show confirmation modal with editable fields
    showConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        const container = document.getElementById('parsedItems');

        container.innerHTML = this.pendingItems.map((item, index) => `
            <div class="parsed-item" data-index="${index}">
                <div class="item-edit-row">
                    <input type="text" class="edit-text" value="${this.escapeHtml(item.cleanText)}"
                           data-index="${index}" placeholder="Task description">
                </div>
                <div class="item-meta-row">
                    <div class="date-editor">
                        <label>Date:</label>
                        <input type="date" class="edit-date"
                               value="${item.date ? this.formatDateForInput(item.date) : ''}"
                               data-index="${index}">
                    </div>
                    <div class="category-selector">
                        <label>
                            <input type="radio" name="category-${item.id}" value="todo"
                                   ${item.category === 'todo' ? 'checked' : ''}>
                            To-Do
                        </label>
                        <label>
                            <input type="radio" name="category-${item.id}" value="calendar"
                                   ${item.category === 'calendar' ? 'checked' : ''}>
                            Calendar
                        </label>
                        <label>
                            <input type="radio" name="category-${item.id}" value="skip">
                            Skip
                        </label>
                    </div>
                </div>
            </div>
        `).join('');

        modal.style.display = 'flex';
    }

    closeModal() {
        document.getElementById('confirmationModal').style.display = 'none';
        this.pendingItems = [];
    }

    confirmItems() {
        // Get edited values
        this.pendingItems.forEach((item, index) => {
            const textInput = document.querySelector(`.edit-text[data-index="${index}"]`);
            const dateInput = document.querySelector(`.edit-date[data-index="${index}"]`);
            const selectedCategory = document.querySelector(`input[name="category-${item.id}"]:checked`);

            if (selectedCategory && selectedCategory.value !== 'skip') {
                const editedText = textInput.value.trim();
                if (!editedText) return; // Skip empty items

                const category = selectedCategory.value;
                const editedDate = dateInput.value ? new Date(dateInput.value) : item.date;

                if (category === 'todo') {
                    this.todos.push({
                        id: item.id,
                        text: editedText,
                        completed: false,
                        created: new Date().toISOString()
                    });
                } else if (category === 'calendar') {
                    this.calendarItems.push({
                        id: item.id,
                        text: editedText,
                        date: editedDate ? editedDate.toISOString() : new Date().toISOString(),
                        completed: false,
                        created: new Date().toISOString()
                    });
                }
            }
        });

        this.saveAll();
        this.renderAll();
        this.closeModal();
    }

    // Evening reflection
    renderEveningReview() {
        const container = document.getElementById('todaysTasks');
        const today = this.getTodayKey();
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        // Get today's completed items
        const completedTodos = this.todos.filter(t => {
            if (!t.completed || !t.completedDate) return false;
            const completedDate = new Date(t.completedDate);
            completedDate.setHours(0, 0, 0, 0);
            return completedDate.getTime() === todayDate.getTime();
        });

        const todaysCalendarItems = this.calendarItems.filter(item => {
            if (!item.date) return false;
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === todayDate.getTime();
        });

        const completedCalendarItems = todaysCalendarItems.filter(i => i.completed);

        // Habits
        const completedHabits = this.FIXED_HABITS.filter(habit =>
            this.habitCompletions[today] && this.habitCompletions[today][habit]
        );

        let html = '<div class="accomplishments-list">';

        if (completedHabits.length > 0) {
            html += '<div class="accomplishment-group"><h4>Habits ✨</h4><ul>';
            completedHabits.forEach(habit => {
                html += `<li>${this.escapeHtml(habit)}</li>`;
            });
            html += '</ul></div>';
        }

        if (completedTodos.length > 0) {
            html += '<div class="accomplishment-group"><h4>Tasks ✓</h4><ul>';
            completedTodos.forEach(todo => {
                html += `<li>${this.escapeHtml(todo.text)}</li>`;
            });
            html += '</ul></div>';
        }

        if (completedCalendarItems.length > 0) {
            html += '<div class="accomplishment-group"><h4>Calendar Items 📅</h4><ul>';
            completedCalendarItems.forEach(item => {
                html += `<li>${this.escapeHtml(item.text)}</li>`;
            });
            html += '</ul></div>';
        }

        if (completedHabits.length === 0 && completedTodos.length === 0 && completedCalendarItems.length === 0) {
            html += '<p class="no-accomplishments">No completed items today. That\'s okay - tomorrow is a new day.</p>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    completeDay() {
        const journalText = document.getElementById('journalInput').value.trim();
        const reminderText = document.getElementById('morningReminder').value.trim();

        // Save journal entry if provided
        if (journalText) {
            this.journalEntries.unshift({
                id: Date.now(),
                date: new Date().toISOString(),
                text: journalText
            });
            this.saveData('journalEntries', this.journalEntries);
        }

        // Save morning reminder if provided
        if (reminderText) {
            this.morningReminders.push(reminderText);
            this.saveData('morningReminders', this.morningReminders);
        }

        // Clear inputs
        document.getElementById('journalInput').value = '';
        document.getElementById('morningReminder').value = '';

        // Switch back to morning mode
        this.switchMode('morning');
        this.renderAll();

        // Show a gentle confirmation
        alert('Day completed. Sleep well! 🌙');
    }

    // Toggle todo completion
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            if (todo.completed) {
                todo.completedDate = new Date().toISOString();
            } else {
                delete todo.completedDate;
            }
            this.saveData('todos', this.todos);
            this.renderTodoList();
        }
    }

    // Delete todo
    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveData('todos', this.todos);
        this.renderTodoList();
    }

    // Toggle fixed habit completion for today
    toggleHabit(habitName) {
        const today = this.getTodayKey();
        if (!this.habitCompletions[today]) {
            this.habitCompletions[today] = {};
        }
        this.habitCompletions[today][habitName] = !this.habitCompletions[today][habitName];
        this.saveData('habitCompletions', this.habitCompletions);
        this.renderHabitList();
    }

    // Get streak for a habit
    getHabitStreak(habitName) {
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check backwards from today
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = this.getDateKey(checkDate);

            if (this.habitCompletions[dateKey] && this.habitCompletions[dateKey][habitName]) {
                streak++;
            } else if (i > 0) {
                // Don't break on today if not completed yet
                break;
            }
        }

        return streak;
    }

    // Toggle calendar item completion
    toggleCalendarItem(id) {
        const item = this.calendarItems.find(i => i.id === id);
        if (item) {
            item.completed = !item.completed;
            if (item.completed) {
                item.completedDate = new Date().toISOString();
            } else {
                delete item.completedDate;
            }
            this.saveData('calendarItems', this.calendarItems);
            this.renderCalendar();
        }
    }

    // Delete calendar item
    deleteCalendarItem(id) {
        this.calendarItems = this.calendarItems.filter(i => i.id !== id);
        this.saveData('calendarItems', this.calendarItems);
        this.renderCalendar();
    }

    // Render all sections
    renderAll() {
        this.renderTodoList();
        this.renderHabitList();
        this.renderCalendar();
        this.renderDumpHistory();
        this.renderJournalHistory();
    }

    // Render to-do list
    renderTodoList() {
        const container = document.getElementById('todoList');
        const activeTodos = this.todos.filter(t => !t.completed);

        if (activeTodos.length === 0) {
            container.innerHTML = '<div class="empty-state">Nothing here yet</div>';
            return;
        }

        container.innerHTML = activeTodos.map(todo => `
            <div class="todo-item">
                <input type="checkbox" id="todo-${todo.id}"
                       onchange="app.toggleTodo(${todo.id})">
                <label for="todo-${todo.id}">${this.escapeHtml(todo.text)}</label>
                <button class="delete-btn" onclick="app.deleteTodo(${todo.id})">×</button>
            </div>
        `).join('');
    }

    // Render fixed habit tracker with streaks
    renderHabitList() {
        const container = document.getElementById('habitList');
        const today = this.getTodayKey();

        if (!this.habitCompletions[today]) {
            this.habitCompletions[today] = {};
        }

        container.innerHTML = this.FIXED_HABITS.map(habit => {
            const isCompleted = this.habitCompletions[today][habit] || false;
            const streak = this.getHabitStreak(habit);

            return `
                <div class="habit-item">
                    <input type="checkbox" id="habit-${habit.replace(/\s/g, '')}"
                           ${isCompleted ? 'checked' : ''}
                           onchange="app.toggleHabit('${habit}')">
                    <label for="habit-${habit.replace(/\s/g, '')}">${this.escapeHtml(habit)}</label>
                    ${streak > 0 ? `<span class="streak-badge">${streak} day${streak > 1 ? 's' : ''}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    // Render journal history
    renderJournalHistory() {
        const container = document.getElementById('journalHistory');

        if (this.journalEntries.length === 0) {
            container.innerHTML = '<div class="empty-state">No reflections yet</div>';
            return;
        }

        const recentEntries = this.journalEntries.slice(0, 5);
        container.innerHTML = recentEntries.map(entry => `
            <div class="journal-entry">
                <div class="journal-date">${this.formatDate(new Date(entry.date))}</div>
                <div class="journal-text">${this.escapeHtml(entry.text)}</div>
            </div>
        `).join('');
    }

    // Render calendar
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

        const calendar = document.getElementById('calendar');
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let html = '';

        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day other-month"><div class="day-number">${day}</div></div>`;
        }

        // Current month days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDay = new Date(year, month, day);
            currentDay.setHours(0, 0, 0, 0);
            const isToday = currentDay.getTime() === today.getTime();

            const dayItems = this.calendarItems.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                itemDate.setHours(0, 0, 0, 0);
                return itemDate.getTime() === currentDay.getTime();
            });

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="day-number">${day}</div>
                    <div class="day-items">
                        ${dayItems.map(item => `
                            <div class="calendar-item ${item.completed ? 'completed' : ''}">
                                <input type="checkbox" id="cal-${item.id}"
                                       ${item.completed ? 'checked' : ''}
                                       onchange="app.toggleCalendarItem(${item.id})">
                                <label for="cal-${item.id}">${this.escapeHtml(item.text)}</label>
                                <button class="delete-btn" onclick="app.deleteCalendarItem(${item.id})">×</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Next month days
        const totalCells = firstDay + daysInMonth;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let day = 1; day <= remainingCells; day++) {
            html += `<div class="calendar-day other-month"><div class="day-number">${day}</div></div>`;
        }

        calendar.innerHTML = html;
    }

    // Render brain dump history
    renderDumpHistory() {
        const container = document.getElementById('dumpHistory');

        if (this.dumpHistory.length === 0) {
            container.innerHTML = '<div class="empty-state">No history yet</div>';
            return;
        }

        container.innerHTML = this.dumpHistory.slice(0, 10).map(dump => `
            <div class="dump-entry">
                <div class="dump-date">${this.formatDateTime(new Date(dump.date))}</div>
                <div class="dump-text">${this.escapeHtml(dump.text)}</div>
            </div>
        `).join('');
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    getTodayKey() {
        return this.getDateKey(new Date());
    }

    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    formatDate(date) {
        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateOnly = new Date(d);
        dateOnly.setHours(0, 0, 0, 0);

        const diffTime = dateOnly.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';

        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatDateForInput(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateTime(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveAll() {
        this.saveData('todos', this.todos);
        this.saveData('habitCompletions', this.habitCompletions);
        this.saveData('calendarItems', this.calendarItems);
    }

    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadData(key) {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    }
}

// Initialize the app
const app = new BrainDumpApp();
