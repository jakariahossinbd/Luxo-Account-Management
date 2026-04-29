import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    const where: any = { userId: session.user.id };
    if (month && year) {
      where.month = month;
      where.year = year;
    }

    const salaries = await prisma.salary.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    });

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    const currentSalary = salaries.find(s => s.month === new Date().getMonth() + 1 && s.year === new Date().getFullYear());

    return NextResponse.json({
      success: true,
      data: {
        salaries,
        baseSalary: employee?.salary || 0,
        currentSalary: currentSalary || null,
      },
    });
  } catch (error) {
    console.error('Salary GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}