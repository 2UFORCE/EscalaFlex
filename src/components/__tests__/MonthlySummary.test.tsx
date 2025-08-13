import { render, screen } from '@testing-library/react';
import { MonthlySummary } from '../monthly-summary';
import { SHIFT_TYPES } from '@/lib/schedule';
import '@testing-library/jest-dom';

describe('MonthlySummary', () => {
  it('should render the summary correctly', () => {
    const scheduleDays = [
      { date: new Date(), type: SHIFT_TYPES.WORK, isOverride: false, isToday: true, isCurrentMonth: true },
      { date: new Date(), type: SHIFT_TYPES.WORK, isOverride: false, isToday: false, isCurrentMonth: true },
      { date: new Date(), type: SHIFT_TYPES.OFF, isOverride: false, isToday: false, isCurrentMonth: true },
      { date: new Date(), type: SHIFT_TYPES.OFF, isOverride: false, isToday: false, isCurrentMonth: true },
      { date: new Date(), type: SHIFT_TYPES.OFF, isOverride: false, isToday: false, isCurrentMonth: true },
      { date: new Date(), type: SHIFT_TYPES.VACATION, isOverride: true, isToday: false, isCurrentMonth: true },
    ];

    render(<MonthlySummary scheduleDays={scheduleDays} />);

    expect(screen.getByText('Trabalho')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(screen.getByText('Folga')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Férias')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render nothing when there are no schedule days', () => {
    const { container } = render(<MonthlySummary scheduleDays={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});