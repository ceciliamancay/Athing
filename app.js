// Morning Brain Dump Application
class BrainDumpApp {
    constructor() {
        this.todos = this.loadData('todos') || [];
        this.habits = this.loadData('habits') || [];
        this.calendarItems = this.loadData('calendarItems') || [];
        this.dumpHistory = this.loadData('dumpHistory') || [];
        this.currentDate = new Date();
        this.pendingItems = [];
        this.init();
    }

    init() {
        this.renderAll();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('parseDumpBtn').addEventListener('click', () => this.parseBrainDump());
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('confirmBtn').addEventListener('click', () => this.confirmItems());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());

        // Close modal when clicking outside
        document.getElementById('confirmationModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmationModal') {
                this.closeModal();
            }
        });
    }

    // Parse the brain dump text into structured items
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

        this.pendingItems = sentences.map((sentence, index) => {
            const item = sentence.trim();
            const date = this.parseDate(item);
            const isHabit = this.isHabit(item);

            return {
                id: Date.now() + index,
                text: item,
                cleanText: this.cleanItemText(item),
                date: date,
                category: this.suggestCategory(item, date, isHabit),
                isHabit: isHabit,
                completed: false
            };
        });

        this.showConfirmationModal();
        input.value = '';
        this.renderDumpHistory();
    }

    // Determine if text describes a habit
    isHabit(text) {
        const lowerText = text.toLowerCase();
        const habitKeywords = [
            'gym', 'workout', 'exercise', 'run', 'jog', 'yoga', 'sport',
            'read', 'reading', 'book', 'meditate', 'meditation',
            'practice', 'study', 'learn', 'write', 'journal'
        ];

        return habitKeywords.some(keyword => lowerText.includes(keyword));
    }

    // Suggest a category based on the text
    suggestCategory(text, date, isHabit) {
        if (isHabit) return 'habit';
        if (date) return 'calendar';
        return 'todo';
    }

    // Natural language date parser (reusing existing logic)
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

        // Time patterns (e.g., "3pm", "3:00", "15:00")
        const timeMatch = text.match(/(\d{1,2})(:\d{2})?\s*(am|pm)?/i);
        if (timeMatch && lowerText.includes('at')) {
            // This is likely a calendar event with time
            return today; // Default to today if time but no date specified
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

        // Clean up whitespace
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.trim();

        return cleaned;
    }

    // Show confirmation modal
    showConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        const container = document.getElementById('parsedItems');

        container.innerHTML = this.pendingItems.map(item => `
            <div class="parsed-item">
                <div class="item-text">${this.escapeHtml(item.cleanText)}</div>
                <div class="item-meta">
                    ${item.date ? `<span class="date-tag">${this.formatDate(item.date)}</span>` : ''}
                </div>
                <div class="category-selector">
                    <label>
                        <input type="radio" name="category-${item.id}" value="todo"
                               ${item.category === 'todo' ? 'checked' : ''}>
                        To-Do
                    </label>
                    <label>
                        <input type="radio" name="category-${item.id}" value="habit"
                               ${item.category === 'habit' ? 'checked' : ''}>
                        Habit
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
        `).join('');

        modal.style.display = 'flex';
    }

    closeModal() {
        document.getElementById('confirmationModal').style.display = 'none';
        this.pendingItems = [];
    }

    confirmItems() {
        // Get selected categories for each item
        this.pendingItems.forEach(item => {
            const selectedCategory = document.querySelector(`input[name="category-${item.id}"]:checked`);
            if (selectedCategory && selectedCategory.value !== 'skip') {
                const category = selectedCategory.value;

                if (category === 'todo') {
                    this.todos.push({
                        id: item.id,
                        text: item.cleanText,
                        completed: false,
                        created: new Date().toISOString()
                    });
                } else if (category === 'habit') {
                    // Check if habit already exists
                    const existingHabit = this.habits.find(h =>
                        h.text.toLowerCase() === item.cleanText.toLowerCase()
                    );

                    if (!existingHabit) {
                        this.habits.push({
                            id: item.id,
                            text: item.cleanText,
                            completions: {},
                            created: new Date().toISOString()
                        });
                    }
                } else if (category === 'calendar') {
                    this.calendarItems.push({
                        id: item.id,
                        text: item.cleanText,
                        date: item.date ? item.date.toISOString() : new Date().toISOString(),
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

    // Toggle habit completion for today
    toggleHabit(id) {
        const habit = this.habits.find(h => h.id === id);
        if (habit) {
            const today = new Date().toISOString().split('T')[0];
            habit.completions[today] = !habit.completions[today];
            this.saveData('habits', this.habits);
            this.renderHabitList();
        }
    }

    // Delete habit
    deleteHabit(id) {
        this.habits = this.habits.filter(h => h.id !== id);
        this.saveData('habits', this.habits);
        this.renderHabitList();
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
    }

    // Render to-do list
    renderTodoList() {
        const container = document.getElementById('todoList');
        const activeTodos = this.todos.filter(t => !t.completed);

        if (activeTodos.length === 0) {
            container.innerHTML = '<div class="empty-state">No tasks yet</div>';
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

    // Render habit tracker
    renderHabitList() {
        const container = document.getElementById('habitList');
        const today = new Date().toISOString().split('T')[0];

        if (this.habits.length === 0) {
            container.innerHTML = '<div class="empty-state">No habits yet</div>';
            return;
        }

        container.innerHTML = this.habits.map(habit => `
            <div class="habit-item">
                <input type="checkbox" id="habit-${habit.id}"
                       ${habit.completions[today] ? 'checked' : ''}
                       onchange="app.toggleHabit(${habit.id})">
                <label for="habit-${habit.id}">${this.escapeHtml(habit.text)}</label>
                <button class="delete-btn" onclick="app.deleteHabit(${habit.id})">×</button>
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

        container.innerHTML = this.dumpHistory.map(dump => `
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

    formatDate(date) {
        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        this.saveData('habits', this.habits);
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
