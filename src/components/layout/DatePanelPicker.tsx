'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const yearOptions = Array.from({ length: 61 }, (_, index) => 2000 + index);

export function buildCalendarDays(monthIndex: number, year: number) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

interface DatePanelPickerProps {
  monthIndex: number;
  year: number;
  onMonthChange: (monthIndex: number) => void;
  onYearChange: (year: number) => void;
}

export function DatePanelPicker({ monthIndex, year, onMonthChange, onYearChange }: DatePanelPickerProps) {
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMonthMenuOpen(false);
        setYearMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const selectedMonthLabel = monthNames[monthIndex];
  const yearWindow = useMemo(() => yearOptions, []);

  return (
    <div ref={rootRef} className="relative flex flex-1 gap-2 text-sm">
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            setYearMenuOpen(false);
            setMonthMenuOpen((prev) => !prev);
          }}
          className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1.5 text-left text-sm text-slate-700 outline-none transition hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        >
          <span className="truncate">{selectedMonthLabel}</span>
          <span className="ml-2 text-slate-500">▾</span>
        </button>

        {monthMenuOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
            {monthNames.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onMonthChange(index);
                  setMonthMenuOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-orange-50 hover:text-orange-600 ${index === monthIndex ? 'bg-orange-500 text-white hover:bg-orange-500 hover:text-white' : 'text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            setMonthMenuOpen(false);
            setYearMenuOpen((prev) => !prev);
          }}
          className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1.5 text-left text-sm text-slate-700 outline-none transition hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        >
          <span className="truncate">{year}</span>
          <span className="ml-2 text-slate-500">▾</span>
        </button>

        {yearMenuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
            {yearWindow.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onYearChange(value);
                  setYearMenuOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-orange-50 hover:text-orange-600 ${value === year ? 'bg-orange-500 text-white hover:bg-orange-500 hover:text-white' : 'text-slate-700'}`}
              >
                {value}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}