
// Mock types and utils to simulate the component logic
type Habit = {
    id: string;
    startedAt: string;
    createdAt: string;
    activeFrom: number;
    activeTo: number;
    frequency: 'daily' | 'weekdays' | number[];
};

const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const isHabitPlannedOnDate = (habit: Habit, date: string, today: string): boolean => {
    if (date > today) return false;
    if (habit.startedAt && date < habit.startedAt) return false;
    // Note: The original code had: if (habit.createdAt && date < habit.createdAt) return false;
    // But we are testing the RENDER logic which is supposed to OVERRIDE this if data exists.
    // The render logic calls this function first for 'isPlanned', but checks 'isDone' independently.
    return true;
};

// The logic we want to test:
function getCellClass(habit: Habit, date: string, today: string, log: string[]) {
    const isFuture = date > today;
    const isBeforeStart = habit.startedAt && date < habit.startedAt;
    const isBeforeEntry = habit.createdAt && date < habit.createdAt;

    // We simulate the component NOT checking isHabitPlannedOnDate for the 'inactive' check if we want to support backfilling?
    // Wait, the component logic is:
    /*
    const isPlanned = isHabitPlannedOnDate(habit, date); // This usually returns false for dates before start
    const isDone = log.includes(habit.id); // This is the source of truth

    let cellClass = 'habit-heatmap-cell';
    // Data wins: If it's done, it's done. regardless of start date
    if (isDone) cellClass += ' done';
    else if (isFuture) cellClass += ' future';
    else if (isBeforeEntry || isBeforeStart) cellClass += ' future';
    else if (!isPlanned) cellClass += ' inactive';
    else cellClass += ' missed';
    */

    const isPlanned = isHabitPlannedOnDate(habit, date, today);
    const isDone = log.includes(habit.id);

    let cellClass = 'habit-heatmap-cell';
    if (isDone) cellClass += ' done';
    else if (isFuture) cellClass += ' future';
    else if (isBeforeEntry || isBeforeStart) cellClass += ' future';
    else if (!isPlanned) cellClass += ' inactive';
    else cellClass += ' missed';

    return cellClass;
}

// Test Case
const habit: Habit = {
    id: 'h1',
    startedAt: '2023-01-05', // Started on Jan 5th
    createdAt: '2023-01-05',
    activeFrom: 1,
    activeTo: 12,
    frequency: 'daily'
};

const today = '2023-01-10';

// Scenario 1: Date BEFORE start/creation, but LOGGED (Backfilled)
const dateBackfilled = '2023-01-02';
const logBackfilled = ['h1']; // Logged
const classBackfilled = getCellClass(habit, dateBackfilled, today, logBackfilled);
console.log(`Backfilled Date (${dateBackfilled}): Expected 'done', Got '${classBackfilled}'`);

// Scenario 2: Date BEFORE start/creation, NOT LOGGED
const dateBefore = '2023-01-03';
const logBefore: string[] = [];
const classBefore = getCellClass(habit, dateBefore, today, logBefore);
console.log(`Before Date (${dateBefore}): Expected 'future' (or inactive/grey), Got '${classBefore}'`);

// Scenario 3: Future Date
const dateFuture = '2023-01-15';
const classFuture = getCellClass(habit, dateFuture, today, []);
console.log(`Future Date (${dateFuture}): Expected 'future', Got '${classFuture}'`);

