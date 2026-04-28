import ExcelJS from 'exceljs';

export interface AttendanceRow {
  date: string;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  totalHours: string;
}

export interface AttendanceStats {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  holidayCount: number;
  totalWorkingHours: number;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'C6EFCE', // Green
  LATE: 'FFC7CE', // Pink
  ABSENT: 'FFC7CE', // Pink
  HOLIDAY: 'B4C7E7', // Blue
};

const VERIFY_METHOD_COLORS: Record<string, string> = {
  'Location': 'FFC0CB', // Light pink
  'Livenese': 'FFB6C1', // Lighter pink
  'Unknown': 'FFFFFF', // White
};

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

  // Set column widths
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Check In', key: 'checkInTime', width: 12 },
    { header: 'Check Out', key: 'checkOutTime', width: 12 },
    { header: 'Working Hours', key: 'totalHours', width: 15 },
    { header: 'Verify Method', key: 'verifyMethod', width: 15 },
  ];

  // Set header row styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue header
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };
  worksheet.getRow(1).height = 25;

  // Add attendance data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dataRow = worksheet.addRow({
      date: row.date,
      status: row.status,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      totalHours: row.totalHours,
      verifyMethod: getVerifyMethod(row.status),
    });

    // Status cell background color
    const statusCell = dataRow.getCell('status');
    const statusColor = STATUS_COLORS[row.status] || 'FFFFFF';
    statusCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${statusColor}` },
    };

    // Verify method color
    const verifyCell = dataRow.getCell('verifyMethod');
    const verifyColor = VERIFY_METHOD_COLORS[getVerifyMethod(row.status)] || 'FFFFFF';
    verifyCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${verifyColor}` },
    };

    // Center align numeric columns
    dataRow.getCell('totalHours').alignment = { horizontal: 'right' };
    dataRow.getCell('checkInTime').alignment = { horizontal: 'center' };
    dataRow.getCell('checkOutTime').alignment = { horizontal: 'center' };
  }

  // Add summary section (below attendance rows)
  const summaryStartRow = rows.length + 3;

  // Month Status label
  const monthStatusRow = worksheet.getRow(summaryStartRow);
  monthStatusRow.getCell(1).value = 'Month Status';
  monthStatusRow.getCell(1).font = { bold: true };
  monthStatusRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF90EE90' }, // Light green
  };

  // Present count
  const presentRow = worksheet.getRow(summaryStartRow + 1);
  presentRow.getCell(1).value = 'Present';
  presentRow.getCell(2).value = stats.presentCount;
  presentRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC6EFCE' },
  };
  presentRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC6EFCE' },
  };

  // Late count
  const lateRow = worksheet.getRow(summaryStartRow + 2);
  lateRow.getCell(1).value = 'Check In Late';
  lateRow.getCell(2).value = stats.lateCount;
  lateRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' }, // Orange
  };
  lateRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' },
  };

  // Check Out Late (placeholder, can be extended)
  const checkOutLateRow = worksheet.getRow(summaryStartRow + 3);
  checkOutLateRow.getCell(1).value = 'Check Out Late';
  checkOutLateRow.getCell(2).value = 0;
  checkOutLateRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' },
  };
  checkOutLateRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' },
  };

  // Total Working Hours
  const totalHoursRow = worksheet.getRow(summaryStartRow + 4);
  totalHoursRow.getCell(1).value = 'Total Work Hours';
  totalHoursRow.getCell(2).value = stats.totalWorkingHours.toFixed(2);
  totalHoursRow.getCell(1).font = { bold: true };
  totalHoursRow.getCell(2).font = { bold: true };
  totalHoursRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE4B5' }, // Moccasin
  };
  totalHoursRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE4B5' },
  };

  // Verification count
  const verifyRow = worksheet.getRow(summaryStartRow + 5);
  verifyRow.getCell(1).value = 'Total Verify';
  verifyRow.getCell(2).value = stats.presentCount + stats.lateCount;
  verifyRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC0C0FF' }, // Light violet
  };
  verifyRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC0C0FF' },
  };

  // Add Seller ID label on the right (merged cells, rotated text)
  // Seller info at the top right
  const sellerIdCell = worksheet.getCell(`F2`);
  sellerIdCell.value = `Seller ID: ${sellerId}`;
  sellerIdCell.font = { bold: true, size: 12 };
  sellerIdCell.alignment = { horizontal: 'center', vertical: 'center', textRotation: 90 };
  worksheet.getRow(2).height = 80; // Make room for rotated text

  // Freeze panes (header row)
  worksheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}

function getVerifyMethod(status: string): string {
  if (status === 'PRESENT' || status === 'LATE') {
    return 'Location'; // Can be extended based on your data
  }
  return '';
}
