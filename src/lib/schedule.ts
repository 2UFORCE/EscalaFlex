import { differenceInDays, isToday as dateFnsIsToday, isSameMonth } from 'date-fns';

export type ShiftPattern = {
  work: number;
  off: number;
  startDate: string; // YYYY-MM-DD
};

export const SHIFT_TYPES = {
  WORK: 'Trabalho',
  OFF: 'Folga',
  VACATION: 'Férias',
  OTHER: 'Outro',
} as const;

export type ShiftType = typeof SHIFT_TYPES[keyof typeof SHIFT_TYPES];

export type ShiftOverride = {
  type: ShiftType;
  note?: string;
};

export type Overrides = Record<string, ShiftOverride>; // Key: 'YYYY-MM-DD'

export type DayInfo = {
  date: Date;
  type: ShiftType | 'Empty';
  isOverride: boolean;
  note?: string;
  isToday: boolean;
  isCurrentMonth: boolean;
};

export function getDayInfo(date: Date, pattern: ShiftPattern, overrides: Overrides): Omit<DayInfo, 'isCurrentMonth'> {
    const dateKey = date.toISOString().split('T')[0];
    const override = overrides[dateKey];

    let type: ShiftType;
    let isOverride = false;
    let note = '';

    if (override) {
        isOverride = true;
        type = override.type;
        note = override.note || '';
    } else {
        const cycleLength = pattern.work + pattern.off;
        if (cycleLength <= 0) {
            // Avoid division by zero and infinite loops if pattern is invalid
            type = SHIFT_TYPES.OFF; 
        } else {
            const startDate = new Date(pattern.startDate);
            const dayDiff = differenceInDays(date, startDate);
            
            // This handles negative differences for dates before the start date correctly.
            const dayInCycle = ((dayDiff % cycleLength) + cycleLength) % cycleLength;
            
            type = dayInCycle < pattern.work ? SHIFT_TYPES.WORK : SHIFT_TYPES.OFF;
        }
    }
    
    return {
        date,
        type,
        isOverride,
        note,
        isToday: dateFnsIsToday(date),
    };
}
