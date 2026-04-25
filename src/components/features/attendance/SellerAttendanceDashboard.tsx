'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, Download, LogOut, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { DatePanelPicker, buildCalendarDays, monthNames } from '@/components/layout/DatePanelPicker';
import { DateRangeOption, useDatePanelSelection } from '@/hooks/useDatePanelSelection';

const dateOptions: DateRangeOption[] = [
  'Today',
  'Yesterday',
  'Today and yesterday',
  'Last 7 days',
  'Last 14 days',
  'Last 28 days',
  'Last 30 days',
  'This week',
  'Last week',
  'This month',
  'Last month',
  'Maximum',
  'Custom',
];

type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'ON_BREAK' | 'ON_LEAVE';

type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
};

type DayStatus = 'present' | 'absent' | 'late' | 'holiday' | 'empty';

type AttendanceResponse = {
  success: boolean;
  error?: string;
  data?: {
    today: {
      status: AttendanceStatus;
      checkInTime?: string | null;
      checkOutTime?: string | null;
    } | null;
    monthRecords: AttendanceRecord[];
    holidays: string[];
    salary: {
      monthly: number;
    };
    todayEarning: number;
    summary: {
      presentCount: number;
      absentCount: number;
    };
  };
};

interface SellerAttendanceDashboardProps {
  sellerId?: string;
  profile?: {
    name: string;
    image?: string;
  };
}

function formatTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SellerAttendanceDashboard({ sellerId: _sellerId, profile: _profile }: SellerAttendanceDashboardProps) {
  const router = useRouter();
  const { warning } = useToast();
  const [currentDate] = useState(new Date());
  const attendanceDateSelection = useDatePanelSelection('Today');
  const {
    dateRangeOption,
    setDateRangeOption,
    customStartDay,
    customEndDay,
    handleCustomDaySelect,
  } = attendanceDateSelection;
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isDatePanelOpen, setIsDatePanelOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('CHECKED_OUT');
  const [currentCheckInTime, setCurrentCheckInTime] = useState<string | null>(null);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [todaysEarning, setTodaysEarning] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [totalAbsent, setTotalAbsent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const datePanelRef = useRef<HTMLDivElement>(null);
  const dateToggleRef = useRef<HTMLButtonElement>(null);

  const calendarDays = buildCalendarDays(selectedMonth, selectedYear);
  const isCurrentMonth = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();
  const todayDayOfMonth = currentDate.getDate();
  const datePanelBounds = useMemo(
    () => (customStartDay !== null && customEndDay !== null ? {
      startDay: Math.min(customStartDay, customEndDay),
      endDay: Math.max(customStartDay, customEndDay),
    } : null),
    [customEndDay, customStartDay],
  );

  const fetchAttendanceData = useCallback(async (month: number, year: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/staff/attendance?month=${month + 1}&year=${year}`, { cache: 'no-store' });
      const payload: AttendanceResponse = await response.json();

      if (!payload.success || !payload.data) {
        warning(payload.error || 'Failed to load attendance data');
        return;
      }

      setAttendanceRecords(payload.data.monthRecords || []);
      setHolidayDates(payload.data.holidays || []);
      setMonthlySalary(payload.data.salary?.monthly || 0);
      setTodaysEarning(payload.data.todayEarning || 0);
      setTotalPresent(payload.data.summary?.presentCount || 0);
      setTotalAbsent(payload.data.summary?.absentCount || 0);

      if (payload.data.today?.status === 'CHECKED_IN' && payload.data.today?.checkInTime && !payload.data.today?.checkOutTime) {
        setCurrentStatus('CHECKED_IN');
        setCurrentCheckInTime(formatTime(payload.data.today.checkInTime));
      } else {
        setCurrentStatus('CHECKED_OUT');
        setCurrentCheckInTime(null);
      }
    } catch {
      warning('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [warning]);

  const getDayStatus = (day: number): DayStatus => {
    if (!day) return 'empty';
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (holidayDates.includes(dateStr)) return 'holiday';
    const record = attendanceRecords.find((recordItem) => recordItem.date === dateStr);
    if (!record) return 'absent';
    if (record.status === 'CHECKED_OUT') return 'present';
    if (record.status === 'ON_BREAK') return 'late';
    return 'absent';
  };

  const getDayColor = (status: DayStatus): string => {
    switch (status) {
      case 'present':
        return 'bg-[#2fbf71] text-white border-[#2fbf71]';
      case 'late':
        return 'bg-[#ff9d2e] text-white border-[#ff9d2e]';
      case 'holiday':
        return 'bg-[#3d46d9] text-white border-[#3d46d9]';
      case 'absent':
        return 'bg-[#e9302d] text-white border-[#e9302d]';
      default:
        return 'border-slate-200 bg-white text-slate-400';
    }
  };

  useEffect(() => {
    void fetchAttendanceData(selectedMonth, selectedYear);
  }, [fetchAttendanceData, selectedMonth, selectedYear]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (datePanelRef.current?.contains(target)) return;
      if (dateToggleRef.current?.contains(target)) return;
      setIsDatePanelOpen(false);
    }

    if (isDatePanelOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDatePanelOpen]);

  const totalLateDays = attendanceRecords.filter((record) => record.status === 'ON_BREAK').length;
  const totalHolidayDays = holidayDates.length;
  const formattedTodaysEarning = todaysEarning.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedMonthlySalary = monthlySalary.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const dateRangeButtonLabel = dateRangeOption === 'Custom' && customStartDay && customEndDay
    ? `Custom (${customStartDay}-${customEndDay})`
    : dateRangeOption;

  const currentTimeLabel = new Date().toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const currentDayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: '2-digit',
  });

  const handleDownloadAttendance = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/staff/attendance/export?month=${selectedMonth + 1}&year=${selectedYear}`);
      if (!response.ok) {
        warning('Failed to download attendance sheet');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seller-attendance-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      warning('Failed to download attendance sheet');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[20px] font-bold tracking-tight text-orange-500 sm:text-[24px]">SELLER ATTENDANCE</h2>
          <button
            ref={dateToggleRef}
            type="button"
            onClick={() => setIsDatePanelOpen((prev) => !prev)}
            className="text-[16px] font-semibold text-slate-700"
          >
            {dateRangeButtonLabel} ▼
          </button>
        </div>

        <div className="relative mt-2">
          {isDatePanelOpen && (
            <div ref={datePanelRef} className="absolute left-0 top-0 z-20 w-full rounded-[16px] border border-slate-200 bg-white p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Select Date Range</p>
                <button
                  type="button"
                  onClick={() => setIsDatePanelOpen(false)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close date panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <div className="grid min-w-[620px] grid-cols-[170px_1fr] gap-4">
                  <div className="space-y-1 border-r border-slate-100 pr-4 text-sm text-slate-700">
                    {dateOptions.map((option) => (
                      <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-slate-50">
                        <input
                          type="radio"
                          name="attendanceDateRange"
                          checked={dateRangeOption === option}
                          onChange={() => setDateRangeOption(option)}
                          className="accent-orange-500"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>

                  <div className="rounded-[14px] border border-slate-200 bg-white p-2">
                    <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1 text-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1));
                          if (selectedMonth === 0) {
                            setSelectedYear((prev) => prev - 1);
                          }
                        }}
                        className="text-2xl leading-none"
                      >
                        ‹
                      </button>

                      <DatePanelPicker
                        monthIndex={selectedMonth}
                        year={selectedYear}
                        onMonthChange={setSelectedMonth}
                        onYearChange={setSelectedYear}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1));
                          if (selectedMonth === 11) {
                            setSelectedYear((prev) => prev + 1);
                          }
                        }}
                        className="text-2xl leading-none"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-y-2 text-center text-[15px] text-slate-700">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="py-1 font-medium">{day}</div>
                      ))}

                      {calendarDays.map((day, index) => (
                        <button
                          key={`${selectedYear}-${selectedMonth}-${index}`}
                          type="button"
                          disabled={!day}
                          onClick={() => {
                            if (day) {
                              handleCustomDaySelect(day);
                            }
                          }}
                          className={`rounded-md py-2 ${!day
                            ? 'cursor-default text-slate-300'
                            : datePanelBounds && day >= datePanelBounds.startDay && day <= datePanelBounds.endDay
                              ? 'bg-orange-500 font-semibold text-white'
                              : isCurrentMonth && day === todayDayOfMonth
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-slate-900 hover:bg-slate-100'}`}
                        >
                          {day ?? ''}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-4 px-2 pb-1 text-sm">
                      <button type="button" className="text-slate-700" onClick={() => setIsDatePanelOpen(false)}>Cancel</button>
                      <button
                        type="button"
                        className="rounded-md bg-orange-500 px-4 py-2 text-white"
                        onClick={() => {
                          setIsDatePanelOpen(false);
                          void fetchAttendanceData(selectedMonth, selectedYear);
                        }}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex min-h-[118px] flex-col items-center justify-center rounded-[14px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 text-center sm:min-h-[156px] sm:p-4">
            <p className="text-[14px] font-semibold text-slate-700 sm:text-[18px]">Today&apos;s Earnings</p>
            <p className="mt-2 text-[26px] font-bold text-orange-600 sm:text-[44px]">৳{formattedTodaysEarning} Tk</p>
            <p className="mt-1 text-[12px] font-medium text-slate-400 sm:text-[16px]">
              {currentDate.toLocaleDateString('en-BD', { month: 'long', day: '2-digit', year: 'numeric' })}
            </p>
          </div>

          <div className="flex min-h-[118px] flex-col items-center justify-center rounded-[14px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 text-center sm:min-h-[156px] sm:p-4">
            <p className="text-[14px] font-semibold text-slate-700 sm:text-[18px]">Monthly Salary</p>
            <p className="mt-2 text-[26px] font-bold text-green-600 sm:text-[44px]">৳{formattedMonthlySalary} Tk</p>
            <p className="mt-1 text-[12px] font-medium text-slate-400 sm:text-[16px]">{monthNames[selectedMonth]} - {selectedYear}</p>
          </div>
        </div>

        <div className="mt-4 rounded-[14px] border border-slate-200 bg-white">
          <div className="grid grid-cols-4">
            <div className="border-r border-slate-200 p-2 text-center sm:p-3">
              <p className="text-[10px] font-semibold text-slate-500 sm:text-[16px]">Total Presents</p>
              <p className="mt-1 text-[24px] font-bold leading-none text-green-600 sm:text-[48px]">{totalPresent}</p>
              <p className="text-[10px] text-slate-400 sm:text-[16px]">Days</p>
            </div>
            <div className="border-r border-slate-200 p-2 text-center sm:p-3">
              <p className="text-[10px] font-semibold text-slate-500 sm:text-[16px]">Total Absent</p>
              <p className="mt-1 text-[24px] font-bold leading-none text-red-600 sm:text-[48px]">{totalAbsent}</p>
              <p className="text-[10px] text-slate-400 sm:text-[16px]">Days</p>
            </div>
            <div className="border-r border-slate-200 p-2 text-center sm:p-3">
              <p className="text-[10px] font-semibold text-slate-500 sm:text-[16px]">Total Late</p>
              <p className="mt-1 text-[24px] font-bold leading-none text-orange-500 sm:text-[48px]">{String(totalLateDays).padStart(2, '0')}</p>
              <p className="text-[10px] text-slate-400 sm:text-[16px]">Days</p>
            </div>
            <div className="p-2 text-center sm:p-3">
              <p className="text-[10px] font-semibold text-slate-500 sm:text-[16px]">Total Holiday</p>
              <p className="mt-1 text-[24px] font-bold leading-none text-blue-600 sm:text-[48px]">{String(totalHolidayDays).padStart(2, '0')}</p>
              <p className="text-[10px] text-slate-400 sm:text-[16px]">Days</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.08)]">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => {
                setIsClockingIn(true);
                router.push('/seller/attendance/clock-in');
              }}
              disabled={isClockingIn || currentStatus === 'CHECKED_IN'}
              className={`inline-flex items-center justify-center gap-3 rounded-[16px] px-5 py-5 text-center text-[20px] font-bold text-white transition ${currentStatus === 'CHECKED_IN' ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-gradient-to-r from-[#18a44b] to-[#2cbf5d] hover:brightness-95'}`}
            >
              <Clock className="h-7 w-7" />
              {isClockingIn ? 'OPENING...' : 'CLOCK IN'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsClockingOut(true);
                router.push('/seller/attendance/clock-out');
              }}
              disabled={isClockingOut || currentStatus === 'CHECKED_OUT'}
              className={`inline-flex items-center justify-center gap-3 rounded-[16px] px-5 py-5 text-center text-[20px] font-bold transition ${currentStatus === 'CHECKED_OUT' ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-gradient-to-r from-[#e2241f] to-[#f03b38] text-white hover:brightness-95'}`}
            >
              <LogOut className="h-7 w-7" />
              {isClockingOut ? 'OPENING...' : 'CLOCK OUT'}
            </button>
          </div>

          <p className="mt-4 text-center text-[24px] font-medium text-slate-800">
            {currentDayLabel} | {currentTimeLabel}
          </p>
          {currentCheckInTime ? (
            <p className="mt-1 text-center text-sm text-slate-500">Checked in at {currentCheckInTime}</p>
          ) : null}
        </div>

        {loading ? <p className="mt-3 text-xs text-slate-400">Loading attendance data...</p> : null}
      </section>

      <section className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
        <h2 className="text-[18px] font-bold sm:text-[22px]">
          <span className="text-orange-500">Monthly </span>
          <span className="text-slate-900">Attendance Calendar</span>
        </h2>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear((prev) => prev - 1);
              } else {
                setSelectedMonth((prev) => prev - 1);
              }
            }}
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h3 className="text-[18px] font-bold text-slate-900 sm:text-[20px]">
            {monthNames[selectedMonth]} {selectedYear}
          </h3>

          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear((prev) => prev + 1);
              } else {
                setSelectedMonth((prev) => prev + 1);
              }
            }}
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-1.5">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            const status = getDayStatus(day);
            return (
              <div
                key={idx}
                className={`flex aspect-square items-center justify-center rounded-[8px] border text-[15px] font-semibold transition ${day ? getDayColor(status) : 'border-slate-200 bg-white text-transparent'}`}
              >
                {day || ''}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-4 w-4 rounded-[3px] border border-[#2fbf71] bg-[#c9f4d9]" />
              <span className="text-[12px] text-slate-600 sm:text-sm">Present</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-4 w-4 rounded-[3px] border border-[#e9302d] bg-[#ffd5d4]" />
              <span className="text-[12px] text-slate-600 sm:text-sm">Absent</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-4 w-4 rounded-[3px] border border-[#ff9d2e] bg-[#ffe3b8]" />
              <span className="text-[12px] text-slate-600 sm:text-sm">Late</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-4 w-4 rounded-[3px] border border-[#3d46d9] bg-[#d7ddff]" />
              <span className="text-[12px] text-slate-600 sm:text-sm">Holiday</span>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleDownloadAttendance}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-md bg-[#0f7a37] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5d2a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Downloading...' : 'Download Attendance Excel'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
