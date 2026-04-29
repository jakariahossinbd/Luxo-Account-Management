import ExcelJS from 'exceljs';

export interface AttendanceRow {
  date: string;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  totalHours: string;
  verifyMethod?: string;
}

export interface AttendanceStats {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  holidayCount: number;
  totalWorkingHours: number;
  checkInLate: number;
  checkInRight: number;
  checkOutLate: number;
  checkOutRight: number;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '00B050',
  LATE: 'F4B183',
  ABSENT: 'FF6666',
  HOLIDAY: '9FB8E8',
};

const VERIFY_METHOD_COLORS: Record<string, string> = {
  Location: '9B6DFF',
  Liveness: 'FF66E6',
  Unknown: 'FFFFFF',
};

const CELL_BORDER = {
  top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
} as const;

function toArgb(hex: string): string {
  return `FF${hex.replace('#', '')}`;
}

function setFill(cell: ExcelJS.Cell, hex: string) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: toArgb(hex) },
  };
}

function setCellStyle(cell: ExcelJS.Cell, options: { fill?: string; bold?: boolean; color?: string; align?: 'left' | 'center' | 'right'; rotate?: number } = {}) {
  cell.border = CELL_BORDER;
  cell.alignment = {
    horizontal: options.align ?? 'center',
    vertical: 'middle',
    textRotation: options.rotate ?? 0,
    wrapText: true,
  };
  cell.font = {
    bold: options.bold ?? false,
    color: { argb: toArgb(options.color ?? '000000') },
    size: 11,
  };
  if (options.fill) {
    setFill(cell, options.fill);
  }
}

function formatDisplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  return `${day}-${month}-${year}`;
}

function formatWorkingHours(value: string): string {
  if (!value) return '';
  const [hoursPart, minutesPart = '00'] = value.split('.');
  const hours = Number.parseInt(hoursPart, 10);
  const minutes = Number.parseInt(minutesPart.padEnd(2, '0').slice(0, 2), 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} Hours`;
}

function getStatusFill(status: string): string | undefined {
  return STATUS_COLORS[status];
}

function getCheckInFill(status: string): string | undefined {
  if (status === 'PRESENT') return 'F4B183';
  if (status === 'LATE') return 'A9D18E';
  return undefined;
}

function getCheckOutFill(status: string): string | undefined {
  if (status === 'PRESENT') return 'A9D18E';
  if (status === 'LATE') return 'F4B183';
  return undefined;
}

export async function generateAttendanceXlsx(
  sellerId: string,
  sellerName: string,
  month: number,
  year: number,
  rows: AttendanceRow[],
  stats: AttendanceStats
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  worksheet.columns = [
    { key: 'date', width: 12 },
    { key: 'status', width: 12 },
    { key: 'checkInTime', width: 14 },
    { key: 'checkOutTime', width: 14 },
    { key: 'totalHours', width: 16 },
    { key: 'verifyMethod', width: 15 },
    { key: 'sellerId', width: 10 },
  ];

  worksheet.getRow(1).height = 22;
  worksheet.getRow(2).height = 24;
  worksheet.getColumn(7).hidden = false;

  const headerRow = worksheet.getRow(1);
  const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
  const headerValues = ['Date', 'Status', 'Check In', 'Check Out', 'Working Hours', 'Verify Method'];
  headerCells.forEach((address, index) => {
    const cell = worksheet.getCell(address);
    cell.value = headerValues[index];
    setCellStyle(cell, { fill: '4472C4', bold: true, color: 'FFFFFF' });
  });
  worksheet.getRow(1).height = 25;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 2;
    const statusFill = getStatusFill(row.status);
    const verifyMethod = row.verifyMethod ?? getVerifyMethod(row.status);

    const dateCell = worksheet.getCell(`A${rowIndex}`);
    dateCell.value = formatDisplayDate(row.date);
    setCellStyle(dateCell, { align: 'left' });

    const statusCell = worksheet.getCell(`B${rowIndex}`);
    statusCell.value = row.status;
    setCellStyle(statusCell, { fill: statusFill, bold: true });

    const checkInCell = worksheet.getCell(`C${rowIndex}`);
    checkInCell.value = row.checkInTime;
    setCellStyle(checkInCell, { fill: getCheckInFill(row.status), align: 'center' });

    const checkOutCell = worksheet.getCell(`D${rowIndex}`);
    checkOutCell.value = row.checkOutTime;
    setCellStyle(checkOutCell, { fill: getCheckOutFill(row.status), align: 'center' });

    const hoursCell = worksheet.getCell(`E${rowIndex}`);
    hoursCell.value = formatWorkingHours(row.totalHours);
    setCellStyle(hoursCell, { fill: 'D9D9D9', align: 'center' });

    const verifyCell = worksheet.getCell(`F${rowIndex}`);
    verifyCell.value = verifyMethod;
    setCellStyle(verifyCell, {
      fill: VERIFY_METHOD_COLORS[verifyMethod] || VERIFY_METHOD_COLORS.Unknown,
      bold: false,
    });

    const sellerCell = worksheet.getCell(`G${rowIndex}`);
    sellerCell.value = '';
    sellerCell.border = CELL_BORDER;
  }

  if (rows.length > 0) {
    worksheet.mergeCells(`G2:G${rows.length + 1}`);
    const sellerIdCell = worksheet.getCell('G2');
    sellerIdCell.value = `SELLER ID: ${sellerId}`;
    sellerIdCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    sellerIdCell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: true };
    sellerIdCell.border = CELL_BORDER;
    setFill(sellerIdCell, 'FFFFFF');
  }

  const summaryStartRow = rows.length + 4;
  const summaryHeaderRow = worksheet.getRow(summaryStartRow);
  const summaryValueRow = worksheet.getRow(summaryStartRow + 1);
  const rightLabelRow = worksheet.getRow(summaryStartRow + 2);
  const rightValueRow = worksheet.getRow(summaryStartRow + 3);

  summaryHeaderRow.height = 22;
  summaryValueRow.height = 22;
  rightLabelRow.height = 22;
  rightValueRow.height = 22;

  const summaryHeaders = [
    { address: 'A' + summaryStartRow, value: 'Month Status', fill: 'A9D18E' },
    { address: 'C' + summaryStartRow, value: 'Check In Late', fill: 'F4B183' },
    { address: 'D' + summaryStartRow, value: 'Check Out Late', fill: 'F4B183' },
    { address: 'E' + summaryStartRow, value: 'Total Work Hours', fill: 'D9D9D9' },
    { address: 'F' + summaryStartRow, value: 'Total Verify', fill: 'C9C9FF' },
  ];

  summaryHeaders.forEach(({ address, value, fill }) => {
    const cell = worksheet.getCell(address);
    cell.value = value;
    setCellStyle(cell, { fill, bold: true, align: 'left' });
  });

  const summaryValues = [
    { address: 'A' + (summaryStartRow + 1), value: stats.presentCount, fill: 'A9D18E' },
    { address: 'C' + (summaryStartRow + 1), value: stats.checkInLate, fill: 'F4B183' },
    { address: 'D' + (summaryStartRow + 1), value: stats.checkOutLate, fill: 'F4B183' },
    { address: 'E' + (summaryStartRow + 1), value: Math.round(stats.totalWorkingHours), fill: 'D9D9D9' },
    { address: 'F' + (summaryStartRow + 1), value: stats.presentCount + stats.lateCount, fill: 'C9C9FF' },
  ];

  summaryValues.forEach(({ address, value, fill }) => {
    const cell = worksheet.getCell(address);
    cell.value = value;
    setCellStyle(cell, { fill, bold: true, align: 'right' });
  });

  const rightHeaders = [
    { address: 'C' + (summaryStartRow + 2), value: 'Check In Right', fill: 'C6E0B4' },
    { address: 'D' + (summaryStartRow + 2), value: 'Check Out Right', fill: 'C6E0B4' },
  ];

  rightHeaders.forEach(({ address, value, fill }) => {
    const cell = worksheet.getCell(address);
    cell.value = value;
    setCellStyle(cell, { fill, bold: true, align: 'left' });
  });

  const rightValues = [
    { address: 'C' + (summaryStartRow + 3), value: stats.checkInRight, fill: 'C6E0B4' },
    { address: 'D' + (summaryStartRow + 3), value: stats.checkOutRight, fill: 'C6E0B4' },
  ];

  rightValues.forEach(({ address, value, fill }) => {
    const cell = worksheet.getCell(address);
    cell.value = value;
    setCellStyle(cell, { fill, bold: false, align: 'right' });
  });

  for (let rowIndex = summaryStartRow; rowIndex <= summaryStartRow + 3; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.height = 22;
    for (let colIndex = 1; colIndex <= 6; colIndex += 1) {
      const cell = row.getCell(colIndex);
      if (!cell.border || !('style' in cell.border.top)) {
        cell.border = CELL_BORDER;
      }
    }
  }

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}

function getVerifyMethod(status: string): string {
  if (status === 'PRESENT' || status === 'LATE') {
    return 'Location'; // Can be extended based on your data
  }
  return '';
}
