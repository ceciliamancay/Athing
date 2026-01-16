// Task Manager Application
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentDate = new Date();
        this.init();
    }

    init() {
        this.renderCalendar();
        this.renderTodoList();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
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

        // Next/This week day names
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

        // Month names with day numbers (e.g., "Jan 15", "January 15")
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

                // If the date has passed this year, assume next year
                if (date < today) {
                    date.setFullYear(year + 1);
                }
                return date;
            }
        }

        // Specific date formats: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
        const datePatterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
            /(\d{1,2})-(\d{1,2})-(\d{4})/,    // MM-DD-YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/     // YYYY-MM-DD
        ];

        for (let pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                let year, month, day;
                if (pattern === datePatterns[2]) {
                    // YYYY-MM-DD
                    [, year, month, day] = match;
                } else {
                    // MM/DD/YYYY or MM-DD-YYYY
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

    // Flexible stress level parser - groups similar stress descriptors
    parseStressLevel(text) {
        const lowerText = text.toLowerCase();

        // High stress keywords
        const highStress = ['high', 'urgent', 'critical', 'emergency', 'crucial', 'vital',
                           'stressful', 'panic', 'extreme', 'severe', 'intense', 'overwhelming',
                           'difficult', 'hard', 'challenging', 'demanding'];

        // Medium stress keywords
        const mediumStress = ['medium', 'moderate', 'normal', 'average', 'standard',
                             'regular', 'important', 'some', 'ok', 'okay'];

        // Low stress keywords
        const lowStress = ['low', 'easy', 'simple', 'light', 'minor', 'trivial',
                          'relaxed', 'calm', 'chill', 'casual', 'quick', 'routine'];

        // Check for high stress
        if (highStress.some(keyword => lowerText.includes(keyword))) {
            return 'high';
        }

        // Check for medium stress
        if (mediumStress.some(keyword => lowerText.includes(keyword))) {
            return 'medium';
        }

        // Check for low stress
        if (lowStress.some(keyword => lowerText.includes(keyword))) {
            return 'low';
        }

        // Default to medium if no stress level specified
        return 'medium';
    }

    // Remove date and stress keywords from task text
    cleanTaskText(text) {
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

        // Remove stress level indicators
        cleaned = cleaned.replace(/\b(high|medium|low|urgent|critical|easy|simple|light|stressful|panic|extreme|severe|intense|overwhelming|difficult|hard|challenging|demanding|moderate|normal|average|important|minor|trivial|relaxed|calm|chill|casual|quick|routine)\s*(stress)?\b/gi, '');

        // Remove extra dashes and whitespace
        cleaned = cleaned.replace(/\s*-\s*/g, ' ');
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.trim();

        return cleaned;
    }

    addTask() {
        const input = document.getElementById('taskInput');
        const taskText = input.value.trim();

        if (!taskText) return;

        const date = this.parseDate(taskText);
        const stressLevel = this.parseStressLevel(taskText);
        const cleanText = this.cleanTaskText(taskText);

        const task = {
            id: Date.now(),
            text: cleanText,
            date: date ? date.toISOString() : null,
            stressLevel: stressLevel,
            created: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderCalendar();
        this.renderTodoList();

        input.value = '';
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderCalendar();
        this.renderTodoList();
    }

    renderTodoList() {
        const todoList = document.getElementById('todoList');
        const undatedTasks = this.tasks.filter(task => !task.date);

        if (undatedTasks.length === 0) {
            todoList.innerHTML = '<div class="empty-state">No tasks yet. Add some!</div>';
            return;
        }

        todoList.innerHTML = undatedTasks.map(task => `
            <div class="task-item ${task.stressLevel}">
                <div class="task-text">${this.escapeHtml(task.text)}</div>
                <button class="delete-btn" onclick="taskManager.deleteTask(${task.id})">×</button>
            </div>
        `).join('');
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Update month display
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

            const dayTasks = this.tasks.filter(task => {
                if (!task.date) return false;
                const taskDate = new Date(task.date);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === currentDay.getTime();
            });

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="day-number">${day}</div>
                    <div class="day-tasks">
                        ${dayTasks.map(task => `
                            <div class="task-item ${task.stressLevel}">
                                <div class="task-text">${this.escapeHtml(task.text)}</div>
                                <button class="delete-btn" onclick="taskManager.deleteTask(${task.id})">×</button>
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

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const saved = localStorage.getItem('tasks');
        return saved ? JSON.parse(saved) : [];
    }
}

// Initialize the app
const taskManager = new TaskManager();
