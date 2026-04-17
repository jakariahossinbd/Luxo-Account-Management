'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, MapPin, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/useToast';
import { DateRangeOption } from '@/hooks/useDatePanelSelection';
import { DatePanelPicker, buildCalendarDays, monthNames } from '@/components/layout/DatePanelPicker';

type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'ON_BREAK' | 'ON_LEAVE';

type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
};

type ClockWindow = {
  clockInStart: string;
  clockInEnd: string;
  clockOutStart: string;
  clockOutEnd: string;
};

type LocationPolicy = {
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
  requireLocation: boolean;
  requireSelfie: boolean;
};

type DayStatus = 'present' | 'absent' | 'late' | 'holiday' | 'empty';

interface SellerAttendanceDashboardProps {
  sellerId?: string;
  profile?: {
    name: string;
    image?: string;
  };
}

const DEFAULT_CLOCK_WINDOW: ClockWindow = {
  clockInStart: '08:00',
  clockInEnd: '11:00',
  clockOutStart: '16:00',
  clockOutEnd: '23:00',
};

const DEFAULT_LOCATION_POLICY: LocationPolicy = {
  officeLatitude: 23.8103,
  officeLongitude: 90.4125,
  allowedRadiusMeters: 250,
  requireLocation: true,
  requireSelfie: true,
};

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
    clockWindow: ClockWindow;
    locationPolicy: LocationPolicy;
  };
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SellerAttendanceDashboard({ sellerId, profile }: SellerAttendanceDashboardProps) {
  const { t } = useTranslation();
  const { success, warning } = useToast();
  const [currentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('CHECKED_OUT');
  const [currentCheckInTime, setCurrentCheckInTime] = useState<string | null>(null);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [todaysEarning, setTodaysEarning] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [totalAbsent, setTotalAbsent] = useState(0);
  const [clockWindow, setClockWindow] = useState<ClockWindow>(DEFAULT_CLOCK_WINDOW);
  const [locationPolicy, setLocationPolicy] = useState<LocationPolicy>(DEFAULT_LOCATION_POLICY);
  const [loading, setLoading] = useState(false);
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('Location is not verified yet.');
  const [geoCoordinates, setGeoCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isDatePanelOpen, setIsDatePanelOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('Today');
  const datePanelRef = useRef<HTMLDivElement>(null);
  const dateToggleRef = useRef<HTMLButtonElement>(null);

  const dateOptions: DateRangeOption[] = ['Today', 'Yesterday', 'Last 7 days', 'This month', 'Maximum', 'Custom'];

  const calendarDays = buildCalendarDays(selectedMonth, selectedYear);

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
      setClockWindow(payload.data.clockWindow || DEFAULT_CLOCK_WINDOW);
      setLocationPolicy(payload.data.locationPolicy || DEFAULT_LOCATION_POLICY);

      if (payload.data.today?.status === 'CHECKED_IN' && payload.data.today?.checkInTime && !payload.data.today?.checkOutTime) {
        setCurrentStatus('CHECKED_IN');
        setCurrentCheckInTime(formatTime(payload.data.today.checkInTime));
      } else {
        setCurrentStatus('CHECKED_OUT');
        setCurrentCheckInTime(null);
      }
    } catch (error) {
      warning('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [warning]);

  const getDayStatus = (day: number): DayStatus => {
    if (!day) return 'empty';
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (holidayDates.includes(dateStr)) return 'holiday';
    const record = attendanceRecords.find(r => r.date === dateStr);
    if (!record) return 'absent';
    if (record.status === 'CHECKED_OUT') return 'present';
    if (record.status === 'ON_BREAK') return 'late';
    return 'absent';
  };

  const getDayColor = (status: DayStatus): string => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'holiday':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'absent':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return '';
    }
  };

  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      const response = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkIn',
          verification: {
            selfieVerified,
            location: geoCoordinates,
          },
        }),
      });
      const payload = await response.json();
      if (!payload.success) {
        warning(payload.error || 'Clock In failed');
        return;
      }
      success('Checked in successfully!');
      setSelfieVerified(false);
      setLocationVerified(false);
      setLocationMessage('Location is not verified yet.');
      setGeoCoordinates(null);
      await fetchAttendanceData(selectedMonth, selectedYear);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setIsClockingOut(true);
    try {
      const response = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkOut' }),
      });
      const payload = await response.json();
      if (!payload.success) {
        warning(payload.error || 'Clock Out failed');
        return;
      }
      success('Checked out successfully!');
      await fetchAttendanceData(selectedMonth, selectedYear);
    } finally {
      setIsClockingOut(false);
    }
  };

  const handleSelfieVerificationDemo = () => {
    setSelfieVerified(true);
    success('Selfie/Liveness demo completed.');
  };

  const handleLocationVerification = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      warning('Geolocation is not supported on this device/browser.');
      return;
    }

    setIsVerifyingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        const distance = distanceMeters(lat, lng, locationPolicy.officeLatitude, locationPolicy.officeLongitude);
        const inRange = distance <= locationPolicy.allowedRadiusMeters;

        setGeoCoordinates({ lat, lng });
        setLocationVerified(inRange);
        if (inRange) {
          setLocationMessage(`Location verified at ${lat}, ${lng}`);
          success('Office location verified successfully.');
        } else {
          setLocationMessage(`Outside office radius by ${Math.round(distance)}m.`);
          warning(`You are outside the allowed ${locationPolicy.allowedRadiusMeters}m office radius.`);
        }
        setIsVerifyingLocation(false);
      },
      () => {
        setLocationVerified(false);
        setLocationMessage('Location permission denied or unavailable.');
        warning('Location verification failed. Please allow location permission.');
        setIsVerifyingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleDownloadAttendance = async () => {
    try {
      // Mock download - in real implementation, this would generate an Excel file
      const csvContent = [
        ['Date', 'Status', 'Check-In', 'Check-Out', 'Total Hours'],
        ...attendanceRecords.map(r => [
          r.date,
          r.status,
          r.checkInTime || '-',
          r.checkOutTime || '-',
          r.totalHours?.toFixed(1) || '-'
        ])
      ]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Attendance downloaded successfully!');
    } catch (error) {
      warning('Failed to download attendance');
    }
  };

  // Close date panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        datePanelRef.current &&
        !datePanelRef.current.contains(e.target as Node) &&
        !dateToggleRef.current?.contains(e.target as Node)
      ) {
        setIsDatePanelOpen(false);
      }
    };

    if (isDatePanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDatePanelOpen]);

  useEffect(() => {
    void fetchAttendanceData(selectedMonth, selectedYear);
  }, [fetchAttendanceData, selectedMonth, selectedYear]);

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

  return (
    <div className="space-y-6">
      <div className="rounded-[8px] border border-slate-200 bg-[#ffffff] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
        {/* Header with Date Selector */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold uppercase tracking-tight text-orange-500 sm:text-[26px]">
              SELLER ATTENDANCE
            </h1>
          </div>
          <button
            ref={dateToggleRef}
            type="button"
            onClick={() => setIsDatePanelOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[14px] font-semibold text-slate-700"
          >
            {dateRangeOption}
            <span className="text-xs">▼</span>
          </button>
        </div>

        <div className="relative">
          {isDatePanelOpen ? (
            <div ref={datePanelRef} className="absolute right-0 top-0 z-20 w-full rounded-[16px] border border-slate-200 bg-white p-3 shadow-2xl sm:max-w-[820px]">
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
                        onClick={() => setSelectedMonth((m) => (m === 0 ? 11 : m - 1))}
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
                        onClick={() => setSelectedMonth((m) => (m === 11 ? 0 : m + 1))}
                        className="text-2xl leading-none"
                      >
                        ›
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-2 text-center text-[15px] text-slate-700">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="py-1 font-medium">{day}</div>
                      ))}
                      {calendarDays.map((day, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={!day}
                          className={`rounded-md py-2 ${
                            !day
                              ? 'cursor-default text-slate-300'
                              : 'text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {day || ''}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-4 px-2 pb-1 text-sm">
                      <button type="button" className="text-slate-700" onClick={() => setIsDatePanelOpen(false)}>
                        Cancel
                      </button>
                      <button type="button" className="rounded-md bg-orange-500 px-4 py-2 text-white" onClick={() => setIsDatePanelOpen(false)}>
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Summary Cards */}
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-gradient-to-b from-white to-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_20px_rgba(148,163,184,0.16)]">
              <p className="border-b border-slate-300 px-2 py-2 text-center text-[18px] font-semibold text-slate-500 sm:px-4 sm:py-3 sm:text-[30px]">Today&apos;s Earnings</p>
              <div className="px-2 pb-3 pt-3 text-center sm:px-4 sm:pb-5 sm:pt-4">
                <p className="text-[22px] font-bold leading-none text-orange-600 sm:text-[58px]">৳{formattedTodaysEarning} Tk</p>
                <p className="mt-2 text-[12px] font-medium text-slate-400 sm:mt-3 sm:text-[18px]">
                  {currentDate.toLocaleDateString('en-BD', { month: 'long', day: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-gradient-to-b from-white to-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_20px_rgba(148,163,184,0.16)]">
              <p className="border-b border-slate-300 px-2 py-2 text-center text-[18px] font-semibold text-slate-500 sm:px-4 sm:py-3 sm:text-[30px]">Monthly Salary</p>
              <div className="px-2 pb-3 pt-3 text-center sm:px-4 sm:pb-5 sm:pt-4">
                <p className="text-[22px] font-bold leading-none text-green-600 sm:text-[58px]">৳{formattedMonthlySalary} Tk</p>
                <p className="mt-2 text-[12px] font-medium text-slate-400 sm:mt-3 sm:text-[18px]">{monthNames[selectedMonth]} - {selectedYear}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-300 bg-gradient-to-b from-white to-slate-100 shadow-[0_8px_24px_rgba(148,163,184,0.18)] sm:mt-5">
            <div className="grid grid-cols-4">
              <div className="border-r border-slate-300 px-2 py-3 text-center sm:px-3 sm:py-4">
                <p className="whitespace-nowrap text-[11px] font-semibold text-slate-500 sm:text-[28px]">Total Presents</p>
                <p className="mt-2 text-[28px] font-bold leading-none text-green-600 sm:mt-3 sm:text-[64px]">{totalPresent}</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400 sm:mt-2 sm:text-[20px]">Days</p>
              </div>

              <div className="border-r border-slate-300 px-2 py-3 text-center sm:px-3 sm:py-4">
                <p className="whitespace-nowrap text-[11px] font-semibold text-slate-500 sm:text-[28px]">Total Absent</p>
                <p className="mt-2 text-[28px] font-bold leading-none text-red-600 sm:mt-3 sm:text-[64px]">{totalAbsent}</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400 sm:mt-2 sm:text-[20px]">Days</p>
              </div>

              <div className="border-r border-slate-300 px-2 py-3 text-center sm:px-3 sm:py-4">
                <p className="whitespace-nowrap text-[11px] font-semibold text-slate-500 sm:text-[28px]">Total Late</p>
                <p className="mt-2 text-[28px] font-bold leading-none text-orange-500 sm:mt-3 sm:text-[64px]">{String(totalLateDays).padStart(2, '0')}</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400 sm:mt-2 sm:text-[20px]">Days</p>
              </div>

              <div className="px-2 py-3 text-center sm:px-3 sm:py-4">
                <p className="whitespace-nowrap text-[11px] font-semibold text-slate-500 sm:text-[28px]">Total Holiday</p>
                <p className="mt-2 text-[28px] font-bold leading-none text-blue-600 sm:mt-3 sm:text-[64px]">{String(totalHolidayDays).padStart(2, '0')}</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400 sm:mt-2 sm:text-[20px]">Days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clock In/Out Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              <span className="text-orange-500">Clock </span>
              <span className="text-slate-700">Status</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Current Status: <span className="font-semibold text-slate-700">
                {currentStatus === 'CHECKED_IN' ? '✓ Checked In' : '✓ Checked Out'}
              </span>
            </p>
          </div>
          <div className={`rounded-full px-6 py-2 text-sm font-bold text-white ${
            currentStatus === 'CHECKED_IN' ? 'bg-green-600' : 'bg-slate-600'
          }`}>
            {currentStatus === 'CHECKED_IN' ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>

        {currentCheckInTime && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-700">
              <Clock className="inline h-4 w-4 mr-2" />
              Checked in at <span className="font-semibold">{currentCheckInTime}</span>
            </p>
          </div>
        )}

        {/* Verification Steps */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Clock-In Verification Steps</h3>
          <p className="mt-1 text-xs text-slate-500">Complete both steps before Clock In.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleSelfieVerificationDemo}
              disabled={selfieVerified}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${selfieVerified
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {selfieVerified ? 'Selfie/Liveness Verified' : 'Run Selfie/Liveness Demo'}
            </button>
            <button
              type="button"
              onClick={handleLocationVerification}
              disabled={isVerifyingLocation || locationVerified}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${locationVerified
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isVerifyingLocation ? 'Verifying Location...' : locationVerified ? 'Location Verified' : 'Verify Office Location'}
            </button>
          </div>
        </div>

        {/* Location Status */}
        <div className={`mb-6 rounded-lg border p-4 ${locationVerified ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
          <div className="flex items-start gap-3">
            <MapPin className={`mt-0.5 h-5 w-5 flex-shrink-0 ${locationVerified ? 'text-green-600' : 'text-blue-600'}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${locationVerified ? 'text-green-900' : 'text-blue-900'}`}>Office Location Verification</p>
              <p className={`mt-1 text-xs ${locationVerified ? 'text-green-700' : 'text-blue-700'}`}>
                {locationVerified ? '✓ Office location is verified.' : locationMessage}
              </p>
              {geoCoordinates ? (
                <p className={`mt-1 text-[11px] ${locationVerified ? 'text-green-700' : 'text-blue-700'}`}>
                  Coordinates: {geoCoordinates.lat}, {geoCoordinates.lng}
                </p>
              ) : null}
              <p className={`mt-1 text-[11px] ${locationVerified ? 'text-green-700' : 'text-blue-700'}`}>
                Allowed Clock In: {clockWindow.clockInStart} - {clockWindow.clockInEnd} | Allowed Clock Out: {clockWindow.clockOutStart} - {clockWindow.clockOutEnd}
              </p>
              <p className={`mt-1 text-[11px] ${locationVerified ? 'text-green-700' : 'text-blue-700'}`}>
                Office: {locationPolicy.officeLatitude}, {locationPolicy.officeLongitude} | Radius: {locationPolicy.allowedRadiusMeters}m
              </p>
            </div>
          </div>
        </div>

        {/* Clock Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClockIn}
            disabled={
              isClockingIn ||
              currentStatus === 'CHECKED_IN' ||
              (locationPolicy.requireSelfie && !selfieVerified) ||
              (locationPolicy.requireLocation && !locationVerified)
            }
            className={`flex-1 rounded-lg px-6 py-3 text-center font-bold transition ${
              currentStatus === 'CHECKED_IN' ||
              (locationPolicy.requireSelfie && !selfieVerified) ||
              (locationPolicy.requireLocation && !locationVerified)
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {isClockingIn ? 'Checking In...' : '▶ Clock In'}
          </button>
          <button
            type="button"
            onClick={handleClockOut}
            disabled={isClockingOut || currentStatus === 'CHECKED_OUT'}
            className={`flex-1 rounded-lg px-6 py-3 text-center font-bold transition ${
              currentStatus === 'CHECKED_OUT'
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            } disabled:opacity-50`}
          >
            {isClockingOut ? 'Checking Out...' : '⏹ Clock Out'}
          </button>
        </div>

        {loading ? <p className="mt-3 text-xs text-slate-400">Loading attendance data...</p> : null}
      </div>

      {/* Calendar Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          <span className="text-orange-500">Monthly </span>
          <span className="text-slate-700">Attendance Calendar</span>
        </h2>

        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-bold text-slate-700">
            {monthNames[selectedMonth]} {selectedYear}
          </h3>
          <button
            type="button"
            onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-bold text-slate-600">
              {day}
            </div>
          ))}
          {calendarDays.map((day, idx) => {
            const status = getDayStatus(day);
            return (
              <div
                key={idx}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-bold transition ${
                  day ? getDayColor(status) + ' border-2' : ''
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Calendar Legend */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-green-300 bg-green-100" />
            <span className="text-xs text-slate-600">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-red-300 bg-red-100" />
            <span className="text-xs text-slate-600">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-yellow-300 bg-yellow-100" />
            <span className="text-xs text-slate-600">Late</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-blue-300 bg-blue-100" />
            <span className="text-xs text-slate-600">Holiday</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleDownloadAttendance}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}
