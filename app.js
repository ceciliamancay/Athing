// Brain Clarity Application - Refactored for Better Code Quality

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Utility class for common helper functions
 */
class Utils {
    /**
     * Escape HTML to prevent XSS attacks
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format a date in a user-friendly way
     */
    static formatDate(date) {
        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Format a date with time
     */
    static formatDateTime(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    /**
     * Generate a unique ID with better collision avoidance
     */
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ============================================================================
// STORAGE MANAGER
// ============================================================================

/**
 * Manages localStorage operations with error handling
 */
class StorageManager {
    constructor() {
        this.isAvailable = this.checkAvailability();
        this.fallbackStorage = {};
    }

    /**
     * Check if localStorage is available
     */
    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage is not available, using in-memory fallback');
            return false;
        }
    }

    /**
     * Save data to storage
     */
    save(key, data) {
        try {
            const serialized = JSON.stringify(data);
            if (this.isAvailable) {
                localStorage.setItem(key, serialized);
            } else {
                this.fallbackStorage[key] = serialized;
            }
            return true;
        } catch (e) {
            console.error(`Failed to save data for key "${key}":`, e);
            return false;
        }
    }

    /**
     * Load data from storage
     */
    load(key) {
        try {
            const serialized = this.isAvailable
                ? localStorage.getItem(key)
                : this.fallbackStorage[key];

            if (!serialized) return null;

            return JSON.parse(serialized);
        } catch (e) {
            console.error(`Failed to load data for key "${key}":`, e);
            return null;
        }
    }

    /**
     * Remove data from storage
     */
    remove(key) {
        try {
            if (this.isAvailable) {
                localStorage.removeItem(key);
            } else {
                delete this.fallbackStorage[key];
            }
            return true;
        } catch (e) {
            console.error(`Failed to remove data for key "${key}":`, e);
            return false;
        }
    }
}

// ============================================================================
// DATE PARSER
// ============================================================================

/**
 * Parses natural language dates
 */
class DateParser {
    constructor() {
        this.dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        this.monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];
        this.monthAbbrev = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    }

    /**
     * Parse a date from text
     */
    parse(text) {
        if (!text || typeof text !== 'string') return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lowerText = text.toLowerCase();

        // Try different parsing strategies
        return (
            this.parseRelativeDay(lowerText, today) ||
            this.parseDayName(lowerText, today) ||
            this.parseMonthDay(text, today) ||
            this.parseDateFormat(text) ||
            this.parseRelativeOffset(lowerText, today) ||
            this.parseTimeReference(lowerText, today)
        );
    }

    /**
     * Parse relative days (today, tomorrow, yesterday)
     */
    parseRelativeDay(lowerText, today) {
        if (lowerText.includes('today')) {
            return new Date(today);
        }
        if (lowerText.includes('tomorrow')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        }
        if (lowerText.includes('yesterday')) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        }
        return null;
    }

    /**
     * Parse day names (Monday, Tuesday, etc.)
     */
    parseDayName(lowerText, today) {
        const dayMatch = this.dayNames.find(day => lowerText.includes(day));
        if (!dayMatch) return null;

        const targetDay = this.dayNames.indexOf(dayMatch);
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;

        if (lowerText.includes('next') || daysToAdd <= 0) {
            daysToAdd += (daysToAdd <= 0 ? 7 : 0);
        }

        const result = new Date(today);
        result.setDate(result.getDate() + daysToAdd);
        return result;
    }

    /**
     * Parse month and day (e.g., "March 15", "Mar 15")
     */
    parseMonthDay(text, today) {
        for (let i = 0; i < this.monthNames.length; i++) {
            const pattern = new RegExp(`(${this.monthNames[i]}|${this.monthAbbrev[i]})\\s+(\\d{1,2})`, 'i');
            const match = text.match(pattern);
            if (match) {
                const day = parseInt(match[2], 10);
                let year = today.getFullYear();
                const date = new Date(year, i, day);

                // If the date is in the past, assume next year
                if (date < today) {
                    date.setFullYear(year + 1);
                }
                return date;
            }
        }
        return null;
    }

    /**
     * Parse explicit date formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
     */
    parseDateFormat(text) {
        const patterns = [
            { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, order: ['month', 'day', 'year'] },
            { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/, order: ['month', 'day', 'year'] },
            { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, order: ['year', 'month', 'day'] }
        ];

        for (const { regex, order } of patterns) {
            const match = text.match(regex);
            if (match) {
                const parts = {};
                order.forEach((key, index) => {
                    parts[key] = parseInt(match[index + 1], 10);
                });
                return new Date(parts.year, parts.month - 1, parts.day);
            }
        }
        return null;
    }

    /**
     * Parse relative offsets (in X days/weeks)
     */
    parseRelativeOffset(lowerText, today) {
        // Next week
        if (lowerText.includes('next week')) {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
        }

        // In X days
        const daysMatch = lowerText.match(/in (\d+) (day|days)/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1], 10);
            const result = new Date(today);
            result.setDate(result.getDate() + days);
            return result;
        }

        // In X weeks
        const weeksMatch = lowerText.match(/in (\d+) (week|weeks)/);
        if (weeksMatch) {
            const weeks = parseInt(weeksMatch[1], 10);
            const result = new Date(today);
            result.setDate(result.getDate() + (weeks * 7));
            return result;
        }

        return null;
    }

    /**
     * Parse time references (at 3pm, etc.) - defaults to today
     */
    parseTimeReference(lowerText, today) {
        const timeMatch = lowerText.match(/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
            return new Date(today);
        }
        return null;
    }

    /**
     * Clean date-related text from a string
     */
    cleanDateText(text) {
        let cleaned = text;

        // Remove common date patterns
        const patterns = [
            /\b(today|tomorrow|yesterday)\b/gi,
            /\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week)\b/gi,
            /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi,
            /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/gi,
            /\d{1,2}\/\d{1,2}\/\d{4}/g,
            /\d{1,2}-\d{1,2}-\d{4}/g,
            /\d{4}-\d{1,2}-\d{1,2}/g,
            /\bin \d+ (day|days|week|weeks)\b/gi,
            /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi,
            /\bby\s+/gi
        ];

        patterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });

        // Clean up whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    }
}

// ============================================================================
// THEME MANAGER
// ============================================================================

/**
 * Manages time-of-day themes
 */
class ThemeManager {
    constructor(storage) {
        this.storage = storage;
        this.currentTimeOfDay = this.storage.load('timeOfDay') || this.detectTimeOfDay();
    }

    /**
     * Detect time of day based on current hour
     */
    detectTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'day';
        return 'evening';
    }

    /**
     * Set time of day theme
     */
    setTimeOfDay(timeOfDay) {
        this.currentTimeOfDay = timeOfDay;
        this.storage.save('timeOfDay', timeOfDay);

        // Update body classes
        document.body.classList.remove('time-morning', 'time-day', 'time-evening');
        document.body.classList.add(`time-${timeOfDay}`);

        // Update active button
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.time === timeOfDay);
        });

        this.updateGreeting();
    }

    /**
     * Update greeting based on time of day
     */
    updateGreeting() {
        const greetingEl = document.getElementById('greeting');
        if (!greetingEl) return;

        const greetings = {
            morning: 'Good Morning ☀️',
            day: 'Taking a Break? 🌤️',
            evening: 'Winding Down 🌙'
        };
        greetingEl.textContent = greetings[this.currentTimeOfDay] || 'Brain Clarity';
    }

    /**
     * Initialize theme
     */
    init() {
        this.setTimeOfDay(this.currentTimeOfDay);
    }
}

// ============================================================================
// TODO MANAGER
// ============================================================================

/**
 * Manages todo items
 */
class TodoManager {
    constructor(storage) {
        this.storage = storage;
        this.todos = this.storage.load('todos') || [];
    }

    /**
     * Add a new todo
     */
    add(text) {
        const todo = {
            id: Utils.generateId(),
            text: text,
            completed: false,
            created: new Date().toISOString()
        };
        this.todos.push(todo);
        this.save();
        return todo;
    }

    /**
     * Toggle todo completion
     */
    toggle(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            if (todo.completed) {
                todo.completedDate = new Date().toISOString();
            } else {
                delete todo.completedDate;
            }
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Delete a todo
     */
    delete(id) {
        const initialLength = this.todos.length;
        this.todos = this.todos.filter(t => t.id !== id);
        if (this.todos.length !== initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Get active todos
     */
    getActive() {
        return this.todos.filter(t => !t.completed);
    }

    /**
     * Save todos to storage
     */
    save() {
        this.storage.save('todos', this.todos);
    }
}

// ============================================================================
// HABIT MANAGER
// ============================================================================

/**
 * Manages habits
 */
class HabitManager {
    constructor(storage) {
        this.storage = storage;
        this.habits = this.storage.load('habits') || [];
    }

    /**
     * Add a new habit (prevents duplicates)
     */
    add(text) {
        const existingHabit = this.habits.find(h =>
            h.text.toLowerCase() === text.toLowerCase()
        );

        if (existingHabit) {
            return null; // Habit already exists
        }

        const habit = {
            id: Utils.generateId(),
            text: text,
            completions: {},
            created: new Date().toISOString()
        };
        this.habits.push(habit);
        this.save();
        return habit;
    }

    /**
     * Toggle habit completion for today
     */
    toggle(id) {
        const habit = this.habits.find(h => h.id === id);
        if (habit) {
            const today = new Date().toISOString().split('T')[0];
            habit.completions[today] = !habit.completions[today];
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Delete a habit
     */
    delete(id) {
        const initialLength = this.habits.length;
        this.habits = this.habits.filter(h => h.id !== id);
        if (this.habits.length !== initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Check if habit is completed today
     */
    isCompletedToday(habit) {
        const today = new Date().toISOString().split('T')[0];
        return !!habit.completions[today];
    }

    /**
     * Get all habits
     */
    getAll() {
        return this.habits;
    }

    /**
     * Save habits to storage
     */
    save() {
        this.storage.save('habits', this.habits);
    }
}

// ============================================================================
// CALENDAR MANAGER
// ============================================================================

/**
 * Manages calendar items
 */
class CalendarManager {
    constructor(storage) {
        this.storage = storage;
        this.items = this.storage.load('calendarItems') || [];
        this.currentDate = new Date();
    }

    /**
     * Add a new calendar item
     */
    add(text, date) {
        const item = {
            id: Utils.generateId(),
            text: text,
            date: date ? date.toISOString() : new Date().toISOString(),
            completed: false,
            created: new Date().toISOString()
        };
        this.items.push(item);
        this.save();
        return item;
    }

    /**
     * Toggle calendar item completion
     */
    toggle(id) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.completed = !item.completed;
            if (item.completed) {
                item.completedDate = new Date().toISOString();
            } else {
                delete item.completedDate;
            }
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Delete a calendar item
     */
    delete(id) {
        const initialLength = this.items.length;
        this.items = this.items.filter(i => i.id !== id);
        if (this.items.length !== initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Get items for a specific date
     */
    getItemsForDate(date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        return this.items.filter(item => {
            if (!item.date) return false;
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === targetDate.getTime();
        });
    }

    /**
     * Change current month
     */
    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    }

    /**
     * Get current date
     */
    getCurrentDate() {
        return this.currentDate;
    }

    /**
     * Save calendar items to storage
     */
    save() {
        this.storage.save('calendarItems', this.items);
    }
}

// ============================================================================
// HISTORY MANAGER
// ============================================================================

/**
 * Manages brain dump history
 */
class HistoryManager {
    constructor(storage) {
        this.storage = storage;
        this.history = this.storage.load('dumpHistory') || [];
    }

    /**
     * Add a new entry to history
     */
    add(text) {
        const entry = {
            id: Utils.generateId(),
            date: new Date().toISOString(),
            text: text
        };
        this.history.unshift(entry); // Add to beginning
        this.save();
        return entry;
    }

    /**
     * Get all history entries
     */
    getAll() {
        return this.history;
    }

    /**
     * Save history to storage
     */
    save() {
        this.storage.save('dumpHistory', this.history);
    }
}

// ============================================================================
// BRAIN DUMP PARSER
// ============================================================================

/**
 * Parses brain dumps into structured items
 */
class BrainDumpParser {
    constructor(dateParser) {
        this.dateParser = dateParser;
        this.habitKeywords = [
            'gym', 'workout', 'exercise', 'run', 'jog', 'yoga', 'sport',
            'read', 'reading', 'book', 'meditate', 'meditation',
            'practice', 'study', 'learn', 'write', 'journal'
        ];
    }

    /**
     * Parse brain dump text into items
     */
    parse(text) {
        if (!text || !text.trim()) return [];

        // Split text into sentences/items
        const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);

        return sentences.map(sentence => {
            const item = sentence.trim();
            const date = this.dateParser.parse(item);
            const isHabit = this.isHabit(item);

            return {
                id: Utils.generateId(),
                text: item,
                cleanText: this.dateParser.cleanDateText(item),
                date: date,
                category: this.suggestCategory(item, date, isHabit),
                isHabit: isHabit
            };
        });
    }

    /**
     * Determine if text describes a habit
     */
    isHabit(text) {
        const lowerText = text.toLowerCase();
        return this.habitKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Suggest a category based on the text
     */
    suggestCategory(text, date, isHabit) {
        if (isHabit) return 'habit';
        if (date) return 'calendar';
        return 'todo';
    }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

/**
 * Main Brain Dump Application
 */
class BrainDumpApp {
    constructor() {
        // Initialize managers
        this.storage = new StorageManager();
        this.dateParser = new DateParser();
        this.themeManager = new ThemeManager(this.storage);
        this.todoManager = new TodoManager(this.storage);
        this.habitManager = new HabitManager(this.storage);
        this.calendarManager = new CalendarManager(this.storage);
        this.historyManager = new HistoryManager(this.storage);
        this.brainDumpParser = new BrainDumpParser(this.dateParser);

        // State
        this.pendingItems = [];

        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.themeManager.init();
        this.renderAll();
        this.setupEventListeners();
    }

    /**
     * Setup event listeners using proper event delegation
     */
    setupEventListeners() {
        // Brain dump button
        const parseDumpBtn = document.getElementById('parseDumpBtn');
        if (parseDumpBtn) {
            parseDumpBtn.addEventListener('click', () => this.handleBrainDump());
        }

        // Calendar navigation
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');
        if (prevMonth) prevMonth.addEventListener('click', () => this.handleMonthChange(-1));
        if (nextMonth) nextMonth.addEventListener('click', () => this.handleMonthChange(1));

        // Modal buttons
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.handleConfirmItems());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // Time switcher buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.themeManager.setTimeOfDay(btn.dataset.time);
            });
        });

        // Modal close on outside click
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'confirmationModal') {
                    this.closeModal();
                }
            });
        }

        // Event delegation for todo list
        const todoList = document.getElementById('todoList');
        if (todoList) {
            todoList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox' && e.target.dataset.todoId) {
                    this.handleTodoToggle(e.target.dataset.todoId);
                }
            });
            todoList.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn') && e.target.dataset.todoId) {
                    this.handleTodoDelete(e.target.dataset.todoId);
                }
            });
        }

        // Event delegation for habit list
        const habitList = document.getElementById('habitList');
        if (habitList) {
            habitList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox' && e.target.dataset.habitId) {
                    this.handleHabitToggle(e.target.dataset.habitId);
                }
            });
            habitList.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn') && e.target.dataset.habitId) {
                    this.handleHabitDelete(e.target.dataset.habitId);
                }
            });
        }

        // Event delegation for calendar
        const calendar = document.getElementById('calendar');
        if (calendar) {
            calendar.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox' && e.target.dataset.calendarId) {
                    this.handleCalendarToggle(e.target.dataset.calendarId);
                }
            });
            calendar.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn') && e.target.dataset.calendarId) {
                    this.handleCalendarDelete(e.target.dataset.calendarId);
                }
            });
        }
    }

    /**
     * Handle brain dump submission
     */
    handleBrainDump() {
        const input = document.getElementById('brainDumpInput');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        // Save to history
        this.historyManager.add(text);

        // Parse into items
        this.pendingItems = this.brainDumpParser.parse(text);

        // Show confirmation modal
        this.showConfirmationModal();

        // Clear input
        input.value = '';

        // Re-render history
        this.renderDumpHistory();
    }

    /**
     * Handle month change in calendar
     */
    handleMonthChange(direction) {
        this.calendarManager.changeMonth(direction);
        this.renderCalendar();
    }

    /**
     * Handle todo toggle
     */
    handleTodoToggle(id) {
        if (this.todoManager.toggle(id)) {
            this.renderTodoList();
        }
    }

    /**
     * Handle todo delete
     */
    handleTodoDelete(id) {
        if (this.todoManager.delete(id)) {
            this.renderTodoList();
        }
    }

    /**
     * Handle habit toggle
     */
    handleHabitToggle(id) {
        if (this.habitManager.toggle(id)) {
            this.renderHabitList();
        }
    }

    /**
     * Handle habit delete
     */
    handleHabitDelete(id) {
        if (this.habitManager.delete(id)) {
            this.renderHabitList();
        }
    }

    /**
     * Handle calendar item toggle
     */
    handleCalendarToggle(id) {
        if (this.calendarManager.toggle(id)) {
            this.renderCalendar();
        }
    }

    /**
     * Handle calendar item delete
     */
    handleCalendarDelete(id) {
        if (this.calendarManager.delete(id)) {
            this.renderCalendar();
        }
    }

    /**
     * Show confirmation modal with parsed items
     */
    showConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        const container = document.getElementById('parsedItems');
        if (!modal || !container) return;

        container.innerHTML = this.pendingItems.map(item => `
            <div class="parsed-item">
                <div class="item-text">${Utils.escapeHtml(item.cleanText)}</div>
                <div class="item-meta">
                    ${item.date ? `<span class="date-tag">${Utils.formatDate(item.date)}</span>` : ''}
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

    /**
     * Close confirmation modal
     */
    closeModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.pendingItems = [];
    }

    /**
     * Confirm and save parsed items
     */
    handleConfirmItems() {
        this.pendingItems.forEach(item => {
            const selectedCategory = document.querySelector(`input[name="category-${item.id}"]:checked`);
            if (!selectedCategory || selectedCategory.value === 'skip') return;

            const category = selectedCategory.value;

            switch (category) {
                case 'todo':
                    this.todoManager.add(item.cleanText);
                    break;
                case 'habit':
                    this.habitManager.add(item.cleanText);
                    break;
                case 'calendar':
                    this.calendarManager.add(item.cleanText, item.date);
                    break;
            }
        });

        this.renderAll();
        this.closeModal();
    }

    /**
     * Render all sections
     */
    renderAll() {
        this.renderTodoList();
        this.renderHabitList();
        this.renderCalendar();
        this.renderDumpHistory();
    }

    /**
     * Render to-do list
     */
    renderTodoList() {
        const container = document.getElementById('todoList');
        if (!container) return;

        const activeTodos = this.todoManager.getActive();

        if (activeTodos.length === 0) {
            container.innerHTML = '<div class="empty-state">Your mind is clear right now 🌸</div>';
            return;
        }

        container.innerHTML = activeTodos.map(todo => `
            <div class="todo-item">
                <input type="checkbox"
                       id="todo-${todo.id}"
                       data-todo-id="${todo.id}">
                <label for="todo-${todo.id}">${Utils.escapeHtml(todo.text)}</label>
                <button class="delete-btn" data-todo-id="${todo.id}">×</button>
            </div>
        `).join('');
    }

    /**
     * Render habit tracker
     */
    renderHabitList() {
        const container = document.getElementById('habitList');
        if (!container) return;

        const habits = this.habitManager.getAll();

        if (habits.length === 0) {
            container.innerHTML = '<div class="empty-state">Ready to build something new? ✨</div>';
            return;
        }

        container.innerHTML = habits.map(habit => {
            const isCompleted = this.habitManager.isCompletedToday(habit);
            return `
                <div class="habit-item">
                    <input type="checkbox"
                           id="habit-${habit.id}"
                           data-habit-id="${habit.id}"
                           ${isCompleted ? 'checked' : ''}>
                    <label for="habit-${habit.id}">${Utils.escapeHtml(habit.text)}</label>
                    <button class="delete-btn" data-habit-id="${habit.id}">×</button>
                </div>
            `;
        }).join('');
    }

    /**
     * Render calendar
     */
    renderCalendar() {
        const currentDate = this.calendarManager.getCurrentDate();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Update month header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const currentMonthEl = document.getElementById('currentMonth');
        if (currentMonthEl) {
            currentMonthEl.textContent = `${monthNames[month]} ${year}`;
        }

        // Render calendar grid
        const calendar = document.getElementById('calendar');
        if (!calendar) return;

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

            const dayItems = this.calendarManager.getItemsForDate(currentDay);

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="day-number">${day}</div>
                    <div class="day-items">
                        ${dayItems.map(item => `
                            <div class="calendar-item ${item.completed ? 'completed' : ''}">
                                <input type="checkbox"
                                       id="cal-${item.id}"
                                       data-calendar-id="${item.id}"
                                       ${item.completed ? 'checked' : ''}>
                                <label for="cal-${item.id}">${Utils.escapeHtml(item.text)}</label>
                                <button class="delete-btn" data-calendar-id="${item.id}">×</button>
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

    /**
     * Render brain dump history
     */
    renderDumpHistory() {
        const container = document.getElementById('dumpHistory');
        if (!container) return;

        const history = this.historyManager.getAll();

        if (history.length === 0) {
            container.innerHTML = '<div class="empty-state">Your thoughts will gather here 💭</div>';
            return;
        }

        container.innerHTML = history.map(dump => `
            <div class="dump-entry">
                <div class="dump-date">${Utils.formatDateTime(new Date(dump.date))}</div>
                <div class="dump-text">${Utils.escapeHtml(dump.text)}</div>
            </div>
        `).join('');
    }
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BrainDumpApp();
    });
} else {
    new BrainDumpApp();
}
