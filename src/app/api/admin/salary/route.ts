import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const salarySchema = z.object({
  userId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  baseSalary: z.number().min(0),
  bonus: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  rating: z.number().int().min(0).max(5).default(0),
  performanceNote: z.string().optional(),
  status: z.enum(['PENDING', 'PAID']).default('PENDING'),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    const where: any = {};
    if (month && year) {
      where.month = month;
      where.year = year;
    }

    const salaries = await prisma.salary.findMany({
      where,
      include: { user: { include: { employee: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const users = await prisma.user.findMany({
      where: { role: { in: ['SELLER', 'MARKETING'] }, status: 'ACTIVE' },
      include: { employee: true },
    });

    const totalPayroll = salaries.reduce((sum, s) => sum + s.netSalary, 0);
    const pendingPayment = salaries.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + s.netSalary, 0);

    return NextResponse.json({
      success: true,
      data: {
        salaries,
        staff: users,
        stats: {
          totalPayroll,
          pendingPayment,
          staffCount: users.length,
        },
      },
    });
  } catch (error) {
    console.error('Admin salary GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = salarySchema.parse(body);

    const netSalary = data.baseSalary + data.bonus - data.deductions;

    const salary = await prisma.salary.upsert({
      where: {
        userId_month_year: {
          userId: data.userId,
          month: data.month,
          year: data.year,
        },
      },
      create: {
        userId: data.userId,
        month: data.month,
        year: data.year,
        baseSalary: data.baseSalary,
        bonus: data.bonus,
        deductions: data.deductions,
        netSalary,
        rating: data.rating,
        performanceNote: data.performanceNote || null,
        status: data.status,
        paidAt: data.status === 'PAID' ? new Date() : null,
      },
      update: {
        baseSalary: data.baseSalary,
        bonus: data.bonus,
        deductions: data.deductions,
        netSalary,
        rating: data.rating,
        performanceNote: data.performanceNote || null,
        status: data.status,
        paidAt: data.status === 'PAID' ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: salary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Admin salary POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}