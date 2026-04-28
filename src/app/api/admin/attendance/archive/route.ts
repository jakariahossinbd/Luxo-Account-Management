import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { archiveMonthlyAttendance } from '@/lib/attendance/archiveHelper';

// Archive all users' attendance for a given month
// Can be called manually or via a scheduled task
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow admin or internal cron job (with secret header)
    const isAdmin = session && session.user.role === 'ADMIN';
    const isCronJob = request.headers.get('X-Cron-Secret') === process.env.CRON_SECRET;

    if (!isAdmin && !isCronJob) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { month, year } = await request.json();

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    const results = [];
    for (const user of users) {
      const success = await archiveMonthlyAttendance(user.id, month, year);
      results.push({ userId: user.id, success });
    }

    return NextResponse.json({
      success: true,
      message: `Archived attendance for ${results.filter((r) => r.success).length}/${results.length} users`,
      results,
    });
  } catch (error) {
    console.error('Month-end archival error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: GET endpoint to check archival status
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get('month'));
    const year = Number(searchParams.get('year'));

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Month and year are required' },
        { status: 400 }
      );
    }

    const archives = await prisma.archivedAttendance.findMany({
      where: { month, year },
      select: { userId: true, archivedAt: true, fileName: true },
    });

    return NextResponse.json({
      success: true,
      month,
      year,
      archiveCount: archives.length,
      archives,
    });
  } catch (error) {
    console.error('Archive status error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
