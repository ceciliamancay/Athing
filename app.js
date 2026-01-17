// Brain Clarity Application - Calm, Anxiety-Friendly Design
class BrainDumpApp {
    constructor() {
        this.todos = this.loadData('todos') || [];
        this.habits = this.loadData('habits') || [];
        this.calendarItems = this.loadData('calendarItems') || [];
        this.dumpHistory = this.loadData('dumpHistory') || [];
        this.eveningReflections = this.loadData('eveningReflections') || [];
        this.currentDate = new Date();
        this.pendingItems = [];
        this.currentTimeOfDay = this.loadData('timeOfDay') || this.detectTimeOfDay();
        this.selectedScheduleDate = new Date();
        this.selectedScheduleDate.setHours(0, 0, 0, 0);
        this.init();
    }

    init() {
        this.setTimeOfDay(this.currentTimeOfDay);
        this.updateGreeting();
        this.renderAll();
        this.setupEventListeners();
    }

    // Detect time of day based on current hour
    detectTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return 'morning';
        } else if (hour >= 12 && hour < 18) {
            return 'day';
        } else {
            return 'evening';
        }
    }

    // Set time of day and apply corresponding styles
    setTimeOfDay(timeOfDay) {
        this.currentTimeOfDay = timeOfDay;
        this.saveData('timeOfDay', timeOfDay);

        // Remove all time classes
        document.body.classList.remove('time-morning', 'time-day', 'time-evening');

        // Add the current time class
        document.body.classList.add(`time-${timeOfDay}`);

        // Update active button
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.time === timeOfDay) {
                btn.classList.add('active');
            }
        });

        this.updateGreeting();
    }

    // Update greeting based on time of day
    updateGreeting() {
        const greetingEl = document.getElementById('greeting');
        const greetings = {
            morning: 'Good Morning ☀️',
            day: 'Taking a Break? 🌤️',
            evening: 'Winding Down 🌙'
        };
        greetingEl.textContent = greetings[this.currentTimeOfDay] || 'Brain Clarity';
    }

    setupEventListeners() {
        document.getElementById('parseDumpBtn').addEventListener('click', () => this.parseBrainDump());
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('confirmBtn').addEventListener('click', () => this.confirmItems());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());

        // Time switcher buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTimeOfDay(btn.dataset.time);
            });
        });

        // Close modal when clicking outside
        document.getElementById('confirmationModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmationModal') {
                this.closeModal();
            }
        });

        // Daily schedule date selector buttons
        document.querySelectorAll('.date-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const offset = parseInt(btn.dataset.offset);
                const newDate = new Date();
                newDate.setDate(newDate.getDate() + offset);
                newDate.setHours(0, 0, 0, 0);
                this.setScheduleDate(newDate);

                // Update active button
                document.querySelectorAll('.date-quick-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Custom date picker
        const customDatePicker = document.getElementById('customDatePicker');
        customDatePicker.addEventListener('change', () => {
            if (customDatePicker.value) {
                const newDate = new Date(customDatePicker.value);
                newDate.setHours(0, 0, 0, 0);
                this.setScheduleDate(newDate);

                // Remove active from quick buttons
                document.querySelectorAll('.date-quick-btn').forEach(b => b.classList.remove('active'));
            }
        });
    }

    // Parse the brain dump text into structured items
    parseBrainDump() {
        const input = document.getElementById('brainDumpInput');
        const text = input.value.trim();

        if (!text) return;

        // Save to history - separate evening reflections from regular prompts
        const historyEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            text: text
        };

        if (this.currentTimeOfDay === 'evening') {
            // Save as evening reflection (keep all)
            this.eveningReflections.unshift(historyEntry);
            this.saveData('eveningReflections', this.eveningReflections);
        } else {
            // Save as regular prompt (limit to 10)
            this.dumpHistory.unshift(historyEntry);
            // Keep only the 10 most recent
            if (this.dumpHistory.length > 10) {
                this.dumpHistory = this.dumpHistory.slice(0, 10);
            }
            this.saveData('dumpHistory', this.dumpHistory);
        }

        // Split text into sentences/items
        let sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);

        // Remove filler phrases and non-actionable sentences
        sentences = sentences.map(s => this.removeFillerPhrases(s.trim()))
                             .filter(s => s.length > 0)
                             .filter(s => !this.isNonActionable(s));

        // Combine related sentences with context understanding
        sentences = this.combineRelatedSentences(sentences);

        this.pendingItems = sentences.map((sentence, index) => {
            const originalText = sentence.original || sentence;
            const item = sentence.text || sentence;
            const date = this.parseDate(item);
            const time = this.parseTime(item);
            const habitInfo = this.detectHabit(item);

            return {
                id: Date.now() + index,
                text: originalText,
                cleanText: this.cleanItemText(item, habitInfo),  // Pass habitInfo for simplification
                date: date,
                time: time,
                category: this.suggestCategory(item, date, time, habitInfo),
                habitInfo: habitInfo,
                completed: false
            };
        });

        this.showConfirmationModal();
        input.value = '';
        this.renderDumpHistory();
    }

    // Remove common filler phrases - deterministic word list
    removeFillerPhrases(text) {
        // Deterministic list of words/phrases to always remove
        const wordsToRemove = [
            'I', 'need to', 'have to', 'should', 'remember to',
            'I think', 'maybe', 'probably', 'okay', 'so', 'well',
            'like', 'literally', 'basically'
        ];

        let cleaned = text;

        // Remove each word/phrase (case-insensitive, word boundaries)
        wordsToRemove.forEach(word => {
            // Escape special regex characters in the word
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Create pattern with word boundaries
            const pattern = new RegExp(`\\b${escapedWord}\\b`, 'gi');
            cleaned = cleaned.replace(pattern, '');
        });

        // Clean up whitespace and punctuation
        cleaned = cleaned.replace(/\s+/g, ' ');  // normalize whitespace
        cleaned = cleaned.replace(/\s+,/g, ',');  // space before comma
        cleaned = cleaned.replace(/,\s*$/g, '');  // trailing comma
        cleaned = cleaned.replace(/^\s*,\s*/g, '');  // leading comma
        cleaned = cleaned.replace(/\s+\./g, '.');  // space before period
        cleaned = cleaned.replace(/^,\s*/g, '');   // leading comma after word removal

        return cleaned.trim();
    }

    // Check if sentence is non-actionable (time/day confirmations, etc.)
    isNonActionable(text) {
        const lowerText = text.toLowerCase();

        // Time/day confirmations like "it's monday morning" or "today is tuesday"
        const nonActionablePatterns = [
            /^(it'?s|today is|this is)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
            /^(it'?s|this is)\s+(morning|afternoon|evening|night)/i,
            /^(good morning|good afternoon|good evening)/i,
            /^(hi|hey|hello|yo)\s*$/i
        ];

        return nonActionablePatterns.some(pattern => pattern.test(lowerText));
    }

    // Combine related sentences using context understanding
    combineRelatedSentences(sentences) {
        const combined = [];
        let currentContext = null;

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const lowerSentence = sentence.toLowerCase();

            // Check if this sentence references previous context
            const hasPronouns = /\b(that|this|it|those|these)\b/.test(lowerSentence);
            const isShort = sentence.split(' ').length < 5;

            if (hasPronouns && isShort && currentContext) {
                // Combine with previous sentence
                const previous = combined[combined.length - 1];
                const combinedText = `${previous.text} ${sentence}`;
                combined[combined.length - 1] = {
                    text: combinedText,
                    original: `${previous.original}\n${sentence}`
                };
            } else {
                // Start new item
                combined.push({
                    text: sentence,
                    original: sentence
                });
                // Update context for next iteration
                currentContext = sentence;
            }
        }

        return combined;
    }

    // Parse time from text
    parseTime(text) {
        const timePatterns = [
            /\bat\s+(\d{1,2})(:\d{2})?\s*(am|pm)/i,
            /\b(\d{1,2})(:\d{2})?\s*(am|pm)\b/i,
            /\bat\s+(\d{1,2})(:\d{2})\b/i
        ];

        for (let pattern of timePatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0]; // Return the full time string
            }
        }

        return null;
    }

    // Detect specific habits and categorize with deterministic keyword detection
    detectHabit(text) {
        const lowerText = text.toLowerCase();

        const detected = {
            isFixedHabit: false,
            habitType: null,
            isWorkout: false,
            simplifiedText: null,  // Store simplified text for this habit
            isMeeting: false,      // Special flag for meetings
            meetingName: null      // Store name for meetings
        };

        // Keyword detection for categories (deterministic rules)

        // 1. Gym/yoga/run/workout/exercise → "Gym" + Sports habit
        if (/\b(gym|yoga|run|running|workout|exercise)\b/i.test(text)) {
            detected.isFixedHabit = true;
            detected.habitType = 'sports';
            detected.isWorkout = true;
            detected.simplifiedText = 'Gym';
            return detected;
        }

        // 2. Read/book/article → "Reading" + Read habit
        if (/\b(read|reading|book|article)\b/i.test(text)) {
            detected.isFixedHabit = true;
            detected.habitType = 'read';
            detected.simplifiedText = 'Reading';
            return detected;
        }

        // 3. Meds/medicine/pills → "Meds" + Meds habit
        if (/\b(meds?|medicine|pills?)\b/i.test(text)) {
            detected.isFixedHabit = true;
            detected.habitType = 'meds';
            detected.simplifiedText = 'Meds';
            return detected;
        }

        // 4. Meeting/meet/coffee with [name] → "Meet [name]"
        const meetingPattern = /\b(meeting|meet|coffee)\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
        const meetingMatch = text.match(meetingPattern);
        if (meetingMatch) {
            detected.isMeeting = true;
            detected.meetingName = meetingMatch[2];
            detected.simplifiedText = `Meet ${meetingMatch[2]}`;
            return detected;
        }

        // Legacy: Cat teeth (keeping for backwards compatibility)
        if (/\b(cat'?s?\s*(teeth|tooth|dental|brush))\b/i.test(text)) {
            detected.isFixedHabit = true;
            detected.habitType = 'catTeeth';
            detected.simplifiedText = 'Cat Teeth';
            return detected;
        }

        return detected;
    }

    // Determine if text describes a habit (legacy method, keeping for compatibility)
    isHabit(text) {
        const habitInfo = this.detectHabit(text);
        return habitInfo.isFixedHabit;
    }

    // Suggest a category based on the text (deterministic rules)
    suggestCategory(text, date, time, habitInfo) {
        const lowerText = text.toLowerCase();

        // 1. Meetings always go to calendar
        if (habitInfo.isMeeting) {
            return 'calendar';
        }

        // 2. Check for specific timed events (meetings, classes, appointments)
        const timedEventKeywords = /\b(meeting|class|appointment|call|conference|session|lecture)\b/i;
        if (timedEventKeywords.test(lowerText) && (date || time)) {
            return 'calendar';
        }

        // 3. Workouts/exercises logic:
        // - If there's a time → Calendar
        // - If no time → Habit (changed from To-Do to Habit for consistency)
        if (habitInfo.isWorkout) {
            if (time || date) {
                return 'calendar';
            } else {
                return 'habit';  // Sports go to habits
            }
        }

        // 4. Fixed daily habits (Meds, Read) → Habits
        if (habitInfo.isFixedHabit) {
            return 'habit';
        }

        // 5. Events with dates/times → Calendar
        if (date || time) {
            return 'calendar';
        }

        // 6. Everything else → To-Do
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

    // Clean up item text - deterministic max 4 words algorithm
    cleanItemText(text, habitInfo = null) {
        // If this is a detected habit/meeting with simplified text, use that
        if (habitInfo && habitInfo.simplifiedText) {
            return habitInfo.simplifiedText;
        }

        let cleaned = text;

        // Remove common date patterns
        cleaned = cleaned.replace(/\b(today|tomorrow|yesterday)\b/gi, '');
        cleaned = cleaned.replace(/\b(next|this|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)\b/gi, '');
        cleaned = cleaned.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?\b/gi, '');
        cleaned = cleaned.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(st|nd|rd|th)?\b/gi, '');
        cleaned = cleaned.replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '');
        cleaned = cleaned.replace(/\d{1,2}-\d{1,2}-\d{4}/g, '');
        cleaned = cleaned.replace(/\d{4}-\d{1,2}-\d{1,2}/g, '');
        cleaned = cleaned.replace(/\bin \d+ (day|days|week|weeks)\b/gi, '');
        cleaned = cleaned.replace(/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '');
        cleaned = cleaned.replace(/\b(by|before|after|around)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');

        // Remove time-related phrases
        cleaned = cleaned.replace(/\b(in the )?(morning|afternoon|evening|night)\b/gi, '');
        cleaned = cleaned.replace(/\b(this|next)\s+(morning|afternoon|evening|night)\b/gi, '');

        // Remove action intention phrases
        cleaned = cleaned.replace(/^(I will|I'll|I am going to|I'm going to)\s+/gi, '');

        // Remove stopwords (additional common words)
        const stopwords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                          'of', 'with', 'from', 'up', 'about', 'into', 'through', 'during'];
        stopwords.forEach(word => {
            const pattern = new RegExp(`\\b${word}\\b`, 'gi');
            cleaned = cleaned.replace(pattern, '');
        });

        // Clean up whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // Max 4 words algorithm: keep only [name] + [action verb] + [object]
        const words = cleaned.split(/\s+/).filter(w => w.length > 0);

        if (words.length > 4) {
            // Keep first 4 meaningful words
            cleaned = words.slice(0, 4).join(' ');
        } else {
            cleaned = words.join(' ');
        }

        // Capitalize first letter
        if (cleaned.length > 0) {
            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }

        // Clean up final punctuation
        cleaned = cleaned.replace(/,\s*$/g, '');
        cleaned = cleaned.replace(/^\s*,\s*/g, '');

        return cleaned.trim();
    }

    // Show confirmation modal with editing capabilities
    showConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        const container = document.getElementById('parsedItems');

        container.innerHTML = this.pendingItems.map(item => {
            const showDatePicker = item.category === 'calendar' || item.date;
            const showTimePicker = item.category === 'calendar' || item.time;

            // Format date for input field
            let dateValue = '';
            if (item.date) {
                const d = new Date(item.date);
                dateValue = d.toISOString().split('T')[0];
            }

            // Extract time value
            let timeValue = '';
            if (item.time) {
                // Parse time string like "3pm" or "3:00pm" to 24-hour format
                timeValue = this.parseTimeToValue(item.time);
            }

            // Build habit checkboxes HTML
            let habitCheckboxes = '';
            if (item.habitInfo.isWorkout) {
                habitCheckboxes = `
                    <div class="habit-checkboxes">
                        <label class="habit-checkbox">
                            <input type="checkbox" data-habit="sports" checked>
                            Sports
                        </label>
                    </div>
                `;
            } else if (item.habitInfo.isFixedHabit) {
                const habitLabels = {
                    meds: 'Meds',
                    catTeeth: 'Cat Teeth',
                    sports: 'Sports',
                    read: 'Read'
                };
                habitCheckboxes = `
                    <div class="habit-checkboxes">
                        <label class="habit-checkbox">
                            <input type="checkbox" data-habit="${item.habitInfo.habitType}" checked>
                            ${habitLabels[item.habitInfo.habitType]}
                        </label>
                    </div>
                `;
            }

            return `
                <div class="parsed-item" data-item-id="${item.id}">
                    <div class="item-content">
                        <div class="item-text-editable" contenteditable="true" data-item-id="${item.id}">
                            ${this.escapeHtml(item.cleanText)}
                        </div>
                        <div class="item-original">${this.escapeHtml(item.text)}</div>
                    </div>

                    <div class="item-details">
                        ${showDatePicker ? `
                            <div class="date-time-picker">
                                <label>
                                    Date:
                                    <input type="date"
                                           class="date-input"
                                           data-item-id="${item.id}"
                                           value="${dateValue}">
                                </label>
                                ${showTimePicker ? `
                                    <label>
                                        Time:
                                        <input type="time"
                                               class="time-input"
                                               data-item-id="${item.id}"
                                               value="${timeValue}">
                                    </label>
                                ` : ''}
                            </div>
                        ` : ''}

                        ${habitCheckboxes}
                    </div>

                    <div class="category-selector">
                        <label>
                            <input type="radio"
                                   name="category-${item.id}"
                                   value="todo"
                                   ${item.category === 'todo' ? 'checked' : ''}
                                   onchange="app.updateItemCategory(${item.id}, 'todo')">
                            To-Do
                        </label>
                        <label>
                            <input type="radio"
                                   name="category-${item.id}"
                                   value="habit"
                                   ${item.category === 'habit' ? 'checked' : ''}
                                   onchange="app.updateItemCategory(${item.id}, 'habit')">
                            Habit
                        </label>
                        <label>
                            <input type="radio"
                                   name="category-${item.id}"
                                   value="calendar"
                                   ${item.category === 'calendar' ? 'checked' : ''}
                                   onchange="app.updateItemCategory(${item.id}, 'calendar')">
                            Calendar
                        </label>
                        <label>
                            <input type="radio"
                                   name="category-${item.id}"
                                   value="skip"
                                   onchange="app.updateItemCategory(${item.id}, 'skip')">
                            Skip
                        </label>
                    </div>
                </div>
            `;
        }).join('');

        modal.style.display = 'flex';
    }

    // Parse time string to value for input field
    parseTimeToValue(timeStr) {
        const match = timeStr.match(/(\d{1,2})(:\d{2})?\s*(am|pm)?/i);
        if (!match) return '';

        let hours = parseInt(match[1]);
        const minutes = match[2] ? match[2].substring(1) : '00';
        const period = match[3] ? match[3].toLowerCase() : null;

        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;

        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    // Update item category when radio button changes
    updateItemCategory(itemId, category) {
        const item = this.pendingItems.find(i => i.id === itemId);
        if (!item) return;

        item.category = category;

        // Show/hide date/time pickers based on category
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        const detailsSection = itemElement.querySelector('.item-details');

        if (category === 'calendar') {
            // Add date/time pickers if not present
            if (!detailsSection.querySelector('.date-time-picker')) {
                const dateValue = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
                const timeValue = item.time ? this.parseTimeToValue(item.time) : '';

                const pickerHtml = `
                    <div class="date-time-picker">
                        <label>
                            Date:
                            <input type="date"
                                   class="date-input"
                                   data-item-id="${itemId}"
                                   value="${dateValue}">
                        </label>
                        <label>
                            Time:
                            <input type="time"
                                   class="time-input"
                                   data-item-id="${itemId}"
                                   value="${timeValue}">
                        </label>
                    </div>
                `;
                detailsSection.insertAdjacentHTML('afterbegin', pickerHtml);
            }
        } else {
            // Remove date/time pickers if present
            const picker = detailsSection.querySelector('.date-time-picker');
            if (picker) picker.remove();
        }
    }

    closeModal() {
        document.getElementById('confirmationModal').style.display = 'none';
        this.pendingItems = [];
    }

    confirmItems() {
        // Get selected categories and edited values for each item
        this.pendingItems.forEach(item => {
            const selectedCategory = document.querySelector(`input[name="category-${item.id}"]:checked`);
            if (selectedCategory && selectedCategory.value !== 'skip') {
                const category = selectedCategory.value;

                // Get edited text
                const editableElement = document.querySelector(`[data-item-id="${item.id}"][contenteditable]`);
                const editedText = editableElement ? editableElement.textContent.trim() : item.cleanText;

                // Get date/time if calendar item
                let finalDate = item.date;
                if (category === 'calendar') {
                    const dateInput = document.querySelector(`.date-input[data-item-id="${item.id}"]`);
                    const timeInput = document.querySelector(`.time-input[data-item-id="${item.id}"]`);

                    if (dateInput && dateInput.value) {
                        finalDate = new Date(dateInput.value);

                        // Add time if specified
                        if (timeInput && timeInput.value) {
                            const [hours, minutes] = timeInput.value.split(':');
                            finalDate.setHours(parseInt(hours), parseInt(minutes));
                        }
                    } else {
                        finalDate = finalDate || new Date();
                    }
                }

                // Handle category-specific logic
                if (category === 'todo') {
                    this.todos.push({
                        id: item.id,
                        text: editedText,
                        originalText: item.text,
                        completed: false,
                        created: new Date().toISOString()
                    });
                } else if (category === 'habit') {
                    // Check if habit already exists
                    const existingHabit = this.habits.find(h =>
                        h.text.toLowerCase() === editedText.toLowerCase()
                    );

                    if (!existingHabit) {
                        this.habits.push({
                            id: item.id,
                            text: editedText,
                            originalText: item.text,
                            completions: {},
                            created: new Date().toISOString()
                        });
                    }
                } else if (category === 'calendar') {
                    this.calendarItems.push({
                        id: item.id,
                        text: editedText,
                        originalText: item.text,
                        date: finalDate ? finalDate.toISOString() : new Date().toISOString(),
                        completed: false,
                        created: new Date().toISOString()
                    });
                }

                // Handle habit checkboxes (for fixed habits like Sports, Meds, etc.)
                const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
                const habitCheckboxes = itemElement.querySelectorAll('.habit-checkbox input[type="checkbox"]:checked');

                habitCheckboxes.forEach(checkbox => {
                    const habitType = checkbox.dataset.habit;
                    const habitLabels = {
                        meds: 'Meds',
                        catTeeth: 'Cat Teeth',
                        sports: 'Sports',
                        read: 'Read'
                    };

                    const habitText = habitLabels[habitType];
                    if (habitText) {
                        // Check if this habit already exists
                        const existingHabit = this.habits.find(h =>
                            h.text.toLowerCase() === habitText.toLowerCase()
                        );

                        if (!existingHabit) {
                            this.habits.push({
                                id: Date.now() + Math.random(),
                                text: habitText,
                                completions: {},
                                created: new Date().toISOString()
                            });
                        }
                    }
                });
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
        this.renderDailySchedule();
    }

    // Set the selected date for daily schedule view
    setScheduleDate(date) {
        this.selectedScheduleDate = new Date(date);
        this.selectedScheduleDate.setHours(0, 0, 0, 0);
        this.renderDailySchedule();
    }

    // Render daily schedule view
    renderDailySchedule() {
        const selectedDate = this.selectedScheduleDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Update date display
        const dateDisplay = document.getElementById('scheduleDateDisplay');
        if (selectedDate.getTime() === today.getTime()) {
            dateDisplay.textContent = 'Today';
        } else if (selectedDate.getTime() === tomorrow.getTime()) {
            dateDisplay.textContent = 'Tomorrow';
        } else {
            dateDisplay.textContent = selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        }

        // Render calendar events for selected date
        const calendarContainer = document.getElementById('scheduleCalendarItems');
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        const calendarEvents = this.calendarItems.filter(item => {
            if (!item.date) return false;
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === selectedDate.getTime();
        }).sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            return timeA - timeB;
        });

        if (calendarEvents.length === 0) {
            calendarContainer.innerHTML = '<div class="schedule-empty">No events scheduled ✨</div>';
        } else {
            calendarContainer.innerHTML = calendarEvents.map(item => {
                const itemDate = new Date(item.date);
                const hasTime = itemDate.getHours() !== 0 || itemDate.getMinutes() !== 0;
                const timeStr = hasTime
                    ? itemDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '';

                return `
                    <div class="schedule-item ${item.completed ? 'completed' : ''}"
                         onclick="app.focusOnCalendarItem(${item.id})">
                        ${timeStr ? `<span class="schedule-item-time">${timeStr}</span>` : ''}
                        <span class="schedule-item-text">${this.escapeHtml(item.text)}</span>
                    </div>
                `;
            }).join('');
        }

        // Render to-dos (active ones)
        const todoContainer = document.getElementById('scheduleTodoItems');
        const activeTodos = this.todos.filter(t => !t.completed);

        if (activeTodos.length === 0) {
            todoContainer.innerHTML = '<div class="schedule-empty">All clear! 🌸</div>';
        } else {
            todoContainer.innerHTML = activeTodos.map(todo => `
                <div class="schedule-item ${todo.completed ? 'completed' : ''}"
                     onclick="app.focusOnTodo(${todo.id})">
                    <span class="schedule-item-text">${this.escapeHtml(todo.text)}</span>
                </div>
            `).join('');
        }

        // Render habits for selected date
        const habitContainer = document.getElementById('scheduleHabitItems');

        if (this.habits.length === 0) {
            habitContainer.innerHTML = '<div class="schedule-empty">No habits yet 💭</div>';
        } else {
            habitContainer.innerHTML = this.habits.map(habit => {
                const isCompleted = habit.completions[selectedDateStr];
                return `
                    <div class="schedule-item ${isCompleted ? 'completed' : ''}"
                         onclick="app.focusOnHabit(${habit.id})">
                        <span class="schedule-item-text">${this.escapeHtml(habit.text)}</span>
                    </div>
                `;
            }).join('');
        }
    }

    // Focus/scroll to a specific calendar item
    focusOnCalendarItem(itemId) {
        const item = this.calendarItems.find(c => c.id === itemId);
        if (!item) return;

        // Navigate to the month of the item
        const itemDate = new Date(item.date);
        this.currentDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
        this.renderCalendar();

        // Scroll to and highlight the item
        setTimeout(() => {
            const element = document.querySelector(`[data-item-id="${itemId}"].calendar-item`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.background = 'rgba(216, 199, 233, 0.3)';
                setTimeout(() => {
                    element.style.background = '';
                }, 2000);
            }
        }, 100);
    }

    // Focus/scroll to a specific todo
    focusOnTodo(itemId) {
        const element = document.querySelector(`[data-item-id="${itemId}"].todo-item`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.background = 'rgba(216, 199, 233, 0.3)';
            setTimeout(() => {
                element.style.background = '';
            }, 2000);
        }
    }

    // Focus/scroll to a specific habit
    focusOnHabit(itemId) {
        const element = document.querySelector(`[data-item-id="${itemId}"].habit-item`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.background = 'rgba(216, 199, 233, 0.3)';
            setTimeout(() => {
                element.style.background = '';
            }, 2000);
        }
    }

    // Render to-do list
    renderTodoList() {
        const container = document.getElementById('todoList');
        const activeTodos = this.todos.filter(t => !t.completed);

        if (activeTodos.length === 0) {
            container.innerHTML = '<div class="empty-state">Your mind is clear right now 🌸</div>';
            return;
        }

        container.innerHTML = activeTodos.map(todo => `
            <div class="todo-item" data-item-id="${todo.id}">
                <input type="checkbox" id="todo-${todo.id}"
                       onchange="app.toggleTodo(${todo.id})">
                <div class="item-content-wrapper">
                    <div class="item-text-editable" contenteditable="true"
                         onblur="app.updateItemText('todo', ${todo.id}, this.textContent)"
                         onfocus="this.dataset.original = this.textContent">${this.escapeHtml(todo.text)}</div>
                    ${todo.originalText ? `<div class="item-original-small">${this.escapeHtml(todo.originalText)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="move-btn" onclick="app.moveItemToCategory('todo', ${todo.id}, 'habit')" title="Move to Habits">📋→✨</button>
                    <button class="move-btn" onclick="app.moveItemToCategory('todo', ${todo.id}, 'calendar')" title="Move to Calendar">📋→📅</button>
                    <button class="delete-btn" onclick="app.deleteTodo(${todo.id})">×</button>
                </div>
            </div>
        `).join('');
    }

    // Render habit tracker
    renderHabitList() {
        const container = document.getElementById('habitList');
        const today = new Date().toISOString().split('T')[0];

        if (this.habits.length === 0) {
            container.innerHTML = '<div class="empty-state">Ready to build something new? ✨</div>';
            return;
        }

        container.innerHTML = this.habits.map(habit => `
            <div class="habit-item" data-item-id="${habit.id}">
                <input type="checkbox" id="habit-${habit.id}"
                       ${habit.completions[today] ? 'checked' : ''}
                       onchange="app.toggleHabit(${habit.id})">
                <div class="item-content-wrapper">
                    <div class="item-text-editable" contenteditable="true"
                         onblur="app.updateItemText('habit', ${habit.id}, this.textContent)"
                         onfocus="this.dataset.original = this.textContent">${this.escapeHtml(habit.text)}</div>
                    ${habit.originalText ? `<div class="item-original-small">${this.escapeHtml(habit.originalText)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="move-btn" onclick="app.moveItemToCategory('habit', ${habit.id}, 'todo')" title="Move to To-Do">✨→📋</button>
                    <button class="move-btn" onclick="app.moveItemToCategory('habit', ${habit.id}, 'calendar')" title="Move to Calendar">✨→📅</button>
                    <button class="delete-btn" onclick="app.deleteHabit(${habit.id})">×</button>
                </div>
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
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">
                    <div class="day-number">${day}</div>
                    <div class="day-items">
                        ${dayItems.map(item => {
                            const itemDate = new Date(item.date);
                            const timeStr = itemDate.getHours() !== 0 || itemDate.getMinutes() !== 0
                                ? itemDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                : '';
                            return `
                            <div class="calendar-item ${item.completed ? 'completed' : ''}" data-item-id="${item.id}">
                                <div class="calendar-item-header">
                                    <input type="checkbox" id="cal-${item.id}"
                                           ${item.completed ? 'checked' : ''}
                                           onchange="app.toggleCalendarItem(${item.id})">
                                    ${timeStr ? `<span class="item-time">${timeStr}</span>` : ''}
                                </div>
                                <div class="item-text-editable" contenteditable="true"
                                     onblur="app.updateItemText('calendar', ${item.id}, this.textContent)"
                                     onfocus="this.dataset.original = this.textContent">${this.escapeHtml(item.text)}</div>
                                ${item.originalText ? `<div class="item-original-small">${this.escapeHtml(item.originalText)}</div>` : ''}
                                <div class="calendar-item-actions">
                                    <button class="edit-datetime-btn" onclick="app.editCalendarItemDateTime(${item.id})" title="Edit date/time">📅⏰</button>
                                    <button class="move-btn-small" onclick="app.moveItemToCategory('calendar', ${item.id}, 'todo')" title="Move to To-Do">📅→📋</button>
                                    <button class="move-btn-small" onclick="app.moveItemToCategory('calendar', ${item.id}, 'habit')" title="Move to Habits">📅→✨</button>
                                    <button class="delete-btn" onclick="app.deleteCalendarItem(${item.id})">×</button>
                                </div>
                            </div>
                        `}).join('')}
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

        let html = '';

        // Regular prompts section (limited to 10)
        if (this.dumpHistory.length > 0) {
            html += '<div class="history-subsection">';
            html += '<h4 class="history-subsection-title">💭 Recent Thoughts</h4>';
            html += this.dumpHistory.map(dump => `
                <div class="dump-entry">
                    <div class="dump-date">${this.formatDateTime(new Date(dump.date))}</div>
                    <div class="dump-text">${this.escapeHtml(dump.text)}</div>
                </div>
            `).join('');
            html += '</div>';
        }

        // Evening reflections section (all reflections)
        if (this.eveningReflections.length > 0) {
            html += '<div class="history-subsection reflection-subsection">';
            html += '<h4 class="history-subsection-title reflection-title">🌙 Evening Reflections</h4>';
            html += '<p class="reflection-subtitle">A space for your thoughts, feelings, and the day\'s journey</p>';
            html += this.eveningReflections.map(reflection => `
                <div class="reflection-entry">
                    <div class="reflection-date">${this.formatDateTime(new Date(reflection.date))}</div>
                    <div class="reflection-text">${this.escapeHtml(reflection.text)}</div>
                </div>
            `).join('');
            html += '</div>';
        }

        if (html === '') {
            container.innerHTML = '<div class="empty-state">Your thoughts will gather here 💭</div>';
        } else {
            container.innerHTML = html;
        }
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

    // Update item text when edited inline
    updateItemText(category, itemId, newText) {
        newText = newText.trim();
        if (!newText) return;

        let item;
        if (category === 'todo') {
            item = this.todos.find(t => t.id === itemId);
        } else if (category === 'habit') {
            item = this.habits.find(h => h.id === itemId);
        } else if (category === 'calendar') {
            item = this.calendarItems.find(c => c.id === itemId);
        }

        if (item && item.text !== newText) {
            item.text = newText;
            this.saveAll();
        }
    }

    // Move item between categories
    moveItemToCategory(fromCategory, itemId, toCategory) {
        let item;

        // Find and remove from source category
        if (fromCategory === 'todo') {
            const index = this.todos.findIndex(t => t.id === itemId);
            if (index === -1) return;
            item = this.todos[index];
            this.todos.splice(index, 1);
        } else if (fromCategory === 'habit') {
            const index = this.habits.findIndex(h => h.id === itemId);
            if (index === -1) return;
            item = this.habits[index];
            this.habits.splice(index, 1);
        } else if (fromCategory === 'calendar') {
            const index = this.calendarItems.findIndex(c => c.id === itemId);
            if (index === -1) return;
            item = this.calendarItems[index];
            this.calendarItems.splice(index, 1);
        }

        // Add to destination category
        if (toCategory === 'todo') {
            this.todos.push({
                id: item.id,
                text: item.text,
                originalText: item.originalText,
                completed: item.completed || false,
                created: item.created || new Date().toISOString()
            });
        } else if (toCategory === 'habit') {
            // Check if habit already exists
            const existingHabit = this.habits.find(h =>
                h.text.toLowerCase() === item.text.toLowerCase()
            );
            if (!existingHabit) {
                this.habits.push({
                    id: item.id,
                    text: item.text,
                    originalText: item.originalText,
                    completions: item.completions || {},
                    created: item.created || new Date().toISOString()
                });
            }
        } else if (toCategory === 'calendar') {
            this.calendarItems.push({
                id: item.id,
                text: item.text,
                originalText: item.originalText,
                date: item.date || new Date().toISOString(),
                completed: item.completed || false,
                created: item.created || new Date().toISOString()
            });
        }

        this.saveAll();
        this.renderAll();
    }

    // Edit calendar item date and time
    editCalendarItemDateTime(itemId) {
        const item = this.calendarItems.find(c => c.id === itemId);
        if (!item) return;

        const currentDate = new Date(item.date);
        const dateStr = currentDate.toISOString().split('T')[0];
        const timeStr = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;

        // Create a simple modal for editing
        const modal = document.getElementById('confirmationModal');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <h2>📅 Edit Date & Time</h2>
            <p>Adjust the date and time for: <strong>${this.escapeHtml(item.text)}</strong></p>
            <div class="date-time-editor">
                <label>
                    Date:
                    <input type="date" id="editDate" value="${dateStr}">
                </label>
                <label>
                    Time:
                    <input type="time" id="editTime" value="${timeStr}">
                </label>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="app.saveCalendarDateTime(${itemId})">Save ✓</button>
                <button class="btn-secondary" onclick="app.closeEditModal()">Cancel</button>
            </div>
        `;

        modal.style.display = 'flex';
    }

    // Save edited calendar date/time
    saveCalendarDateTime(itemId) {
        const item = this.calendarItems.find(c => c.id === itemId);
        if (!item) return;

        const dateInput = document.getElementById('editDate');
        const timeInput = document.getElementById('editTime');

        if (dateInput.value) {
            const newDate = new Date(dateInput.value);
            if (timeInput.value) {
                const [hours, minutes] = timeInput.value.split(':');
                newDate.setHours(parseInt(hours), parseInt(minutes));
            }
            item.date = newDate.toISOString();
        }

        this.saveAll();
        this.closeEditModal();
        this.renderCalendar();
    }

    // Close edit modal
    closeEditModal() {
        const modal = document.getElementById('confirmationModal');
        modal.style.display = 'none';
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
        this.saveData('eveningReflections', this.eveningReflections);
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
