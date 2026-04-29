export type ClockWindow = {
  clockInStart: string;
  clockInEnd: string;
  clockOutStart: string;
  clockOutEnd: string;
};

export type MonthlyAttendanceInput = {
  attendances: Array<{
    id?: string;
    date: Date;
    status: string;
    checkInTime: Date | null;
    checkOutTime: Date | null;
    totalHours: number | null;
  }>;
  holidays: Array<{
    date: Date;
  }>;
  verificationMethodsByDate?: Map<string, string>;
  year: number;
  month: number;
  daysInScope: number;
  clockWindow?: ClockWindow;
};

export type MonthlyAttendanceRow = {
  id?: string;
  date: string;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  totalHours: string;
  verifyMethod?: string;
};

export type MonthlyAttendanceStats = {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  holidayCount: number;
  totalWorkingHours: number;
  checkInLate: number;
  checkInRight: number;
  checkOutLate: number;
  checkOutRight: number;
};

export type MonthlyAttendanceDataset = {
  rows: MonthlyAttendanceRow[];
  stats: MonthlyAttendanceStats;
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeForDisplay(date: Date | null): string {
  if (!date) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isWithinWindow(checkTime: Date, windowStart: string, windowEnd: string): boolean {
  if (windowStart === '00:00' && windowEnd === '23:59') {
    return true;
  }

  const checkMinutes = checkTime.getHours() * 60 + checkTime.getMinutes();
  const startMinutes = toMinutes(windowStart);
  const endMinutes = toMinutes(windowEnd);

  if (startMinutes <= endMinutes) {
    return checkMinutes >= startMinutes && checkMinutes <= endMinutes;
  }
  return checkMinutes >= startMinutes || checkMinutes <= endMinutes;
}

export function buildMonthlyAttendanceDataset(input: MonthlyAttendanceInput): MonthlyAttendanceDataset {
  const attendanceMap = new Map(input.attendances.map((item) => [formatDateKey(item.date), item]));
  const holidayKeys = new Set(input.holidays.map((item) => formatDateKey(item.date)));

  const defaultClockWindow: ClockWindow = {
    clockInStart: '00:00',
    clockInEnd: '23:59',
    clockOutStart: '00:00',
    clockOutEnd: '23:59',
  };
  const clockWindow = input.clockWindow || defaultClockWindow;

  const rows: MonthlyAttendanceRow[] = [];
  const stats: MonthlyAttendanceStats = {
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    holidayCount: 0,
    totalWorkingHours: 0,
    checkInLate: 0,
    checkInRight: 0,
    checkOutLate: 0,
    checkOutRight: 0,
  };

  for (let day = 1; day <= input.daysInScope; day += 1) {
    const dateKey = `${input.year}-${String(input.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const attendance = attendanceMap.get(dateKey);
    const isHoliday = holidayKeys.has(dateKey);

    let status = 'ABSENT';
    let checkInLate = false;
    let checkOutLate = false;

    if (isHoliday) {
      status = 'HOLIDAY';
      stats.holidayCount += 1;
    } else if (attendance) {
      status = attendance.status === 'CHECKED_IN' || attendance.status === 'CHECKED_OUT' ? 'PRESENT' : 'LATE';
      if (status === 'PRESENT') stats.presentCount += 1;
      if (status === 'LATE') stats.lateCount += 1;
      stats.totalWorkingHours += attendance.totalHours || 0;

      // Calculate check-in late/right
      if (attendance.checkInTime) {
        const isCheckInOnTime = isWithinWindow(attendance.checkInTime, clockWindow.clockInStart, clockWindow.clockInEnd);
        if (isCheckInOnTime) {
          stats.checkInRight += 1;
        } else {
          stats.checkInLate += 1;
          checkInLate = true;
        }
      }

      // Calculate check-out late/right
      if (attendance.checkOutTime) {
        const isCheckOutOnTime = isWithinWindow(attendance.checkOutTime, clockWindow.clockOutStart, clockWindow.clockOutEnd);
        if (isCheckOutOnTime) {
          stats.checkOutRight += 1;
        } else {
          stats.checkOutLate += 1;
          checkOutLate = true;
        }
      }
    } else {
      stats.absentCount += 1;
    }

    rows.push({
      id: attendance?.id,
      date: dateKey,
      status,
      checkInTime: formatTimeForDisplay(attendance?.checkInTime ?? null),
      checkOutTime: formatTimeForDisplay(attendance?.checkOutTime ?? null),
      totalHours: attendance?.totalHours ? String(attendance.totalHours.toFixed(2)) : '',
      verifyMethod: input.verificationMethodsByDate?.get(dateKey),
    });
  }

  return { rows, stats };
}