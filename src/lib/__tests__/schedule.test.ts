import { getDayInfo, SHIFT_TYPES, type ShiftPattern, type Overrides } from '../schedule';

// Mock isToday for consistent test results
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  isToday: (date: Date) => {
    const today = new Date('2024-01-15T12:00:00.000Z');
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  },
}));

describe('getDayInfo', () => {
  const pattern: ShiftPattern = {
    work: 5,
    off: 2,
    startDate: '2024-01-01', // A Monday
  };

  it('should correctly identify a work day within the pattern', () => {
    const date = new Date('2024-01-03'); // Wednesday, 3rd day of cycle
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.WORK);
    expect(dayInfo.isOverride).toBe(false);
  });

  it('should correctly identify an off day within the pattern', () => {
    const date = new Date('2024-01-06'); // Saturday, 6th day of cycle
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.OFF);
  });

  it('should correctly identify the last day of a work period', () => {
    const date = new Date('2024-01-05'); // Friday, 5th day of cycle
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.WORK);
  });

  it('should correctly identify the first day of an off period', () => {
    const date = new Date('2024-01-06'); // Saturday, 6th day of cycle
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.OFF);
  });

  it('should handle dates before the start date correctly', () => {
    // Sunday, Dec 31st. Should be the last day of the off-cycle (day 7 of 7)
    const date = new Date('2023-12-31');
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.OFF);
  });

  it('should handle the exact start date correctly', () => {
    const date = new Date('2024-01-01');
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.WORK);
  });

  it('should apply an override correctly', () => {
    const date = new Date('2024-01-03'); // A work day
    const overrides: Overrides = {
      '2024-01-03': { type: SHIFT_TYPES.VACATION, note: 'Dentist' },
    };
    const dayInfo = getDayInfo(date, pattern, overrides);
    expect(dayInfo.type).toBe(SHIFT_TYPES.VACATION);
    expect(dayInfo.isOverride).toBe(true);
    expect(dayInfo.note).toBe('Dentist');
  });

  it('should correctly identify today', () => {
    const date = new Date('2024-01-15'); // Mocked today
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.isToday).toBe(true);
  });

  it('should correctly identify not today', () => {
    const date = new Date('2024-01-16');
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.isToday).toBe(false);
  });

  it('should handle an empty override object', () => {
    const date = new Date('2024-01-02');
    const dayInfo = getDayInfo(date, pattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.WORK);
    expect(dayInfo.isOverride).toBe(false);
  });

  it('should return OFF for invalid pattern (cycleLength <= 0)', () => {
    const invalidPattern: ShiftPattern = { work: 0, off: 0, startDate: '2024-01-01' };
    const date = new Date('2024-01-01');
    const dayInfo = getDayInfo(date, invalidPattern, {});
    expect(dayInfo.type).toBe(SHIFT_TYPES.OFF);
  });
});
