import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type DayInfo, type ShiftType } from '@/lib/schedule';

export function MonthlySummary({ scheduleDays }: { scheduleDays: DayInfo[] }) {
  const summary = useMemo(() => {
    return scheduleDays.reduce((acc, day) => {
      if (day.type !== 'Empty') {
        acc[day.type] = (acc[day.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<ShiftType, number>);
  }, [scheduleDays]);

  if (Object.keys(summary).length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Resumo do Mês</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(summary).map(([type, count]) => (
            <div key={type} className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">{type}</div>
              <div className="text-2xl font-bold">{count}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}