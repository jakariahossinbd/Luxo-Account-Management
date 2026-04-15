'use client';

import { useState } from 'react';

export type DateRangeOption =
  | 'Today'
  | 'Yesterday'
  | 'Today and yesterday'
  | 'Last 7 days'
  | 'Last 14 days'
  | 'Last 28 days'
  | 'Last 30 days'
  | 'This week'
  | 'Last week'
  | 'This month'
  | 'Last month'
  | 'Maximum'
  | 'Custom';

export function useDatePanelSelection(initialOption: DateRangeOption = 'Today') {
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>(initialOption);
  const [customStartDay, setCustomStartDay] = useState<number | null>(null);
  const [customEndDay, setCustomEndDay] = useState<number | null>(null);

  const handleCustomDaySelect = (day: number) => {
    setDateRangeOption('Custom');

    if (customStartDay === null || (customStartDay !== null && customEndDay !== null)) {
      setCustomStartDay(day);
      setCustomEndDay(null);
      return;
    }

    if (day < customStartDay) {
      setCustomEndDay(customStartDay);
      setCustomStartDay(day);
    } else {
      setCustomEndDay(day);
    }
  };

  return {
    dateRangeOption,
    setDateRangeOption,
    customStartDay,
    customEndDay,
    setCustomStartDay,
    setCustomEndDay,
    handleCustomDaySelect,
  };
}
