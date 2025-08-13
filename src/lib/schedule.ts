import { differenceInDays, isToday as dateFnsIsToday, isSameMonth } from 'date-fns';

export type ShiftPattern = {
  work: number;
  off: number;
  startDate: string; // YYYY-MM-DD
};

export const SHIFT_TYPES = {
  WORK: 'Trabalho',
  OFF: 'Folga',
  SWAP: 'Troca',
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

/**
 * Determines the shift information for a specific day based on a shift pattern and any overrides.
 *
 * @param date The date to get information for.
 * @param pattern The user's defined shift pattern.
 * @param overrides A record of any manual overrides for specific dates.
 * @returns A DayInfo object containing the shift type, override status, and other details.
 */
export function getDayInfo(date: Date, pattern: ShiftPattern, overrides: Overrides): Omit<DayInfo, 'isCurrentMonth'> {
    // Use YYYY-MM-DD format for keys to ensure consistency.
    const dateKey = date.toISOString().split('T')[0];
    const override = overrides[dateKey];

    let type: ShiftType;
    let isOverride = false;
    let note = '';

    // If an override exists for this date, it takes precedence over the pattern.
    if (override) {
        isOverride = true;
        type = override.type;
        note = override.note || '';
    } else {
        // Calculate the shift type based on the cyclical pattern.
        const cycleLength = pattern.work + pattern.off;
        if (cycleLength <= 0) {
            // Avoid division by zero and infinite loops if pattern is invalid.
            // Default to OFF in this edge case.
            type = SHIFT_TYPES.OFF; 
        } else {
            const startDate = new Date(pattern.startDate);
            // Calculate the number of days between the start date and the target date.
            const dayDiff = differenceInDays(date, startDate);
            
            // Use the modulo operator to find the position in the cycle.
            // The `+ cycleLength` handles negative differences for dates before the start date correctly.
            const dayInCycle = ((dayDiff % cycleLength) + cycleLength) % cycleLength;
            
            // Determine if the day is a work day or a day off based on its position in the cycle.
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
