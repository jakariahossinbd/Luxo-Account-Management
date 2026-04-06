import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const activitySchema = z.object({
  activity: z.string().min(1, 'Activity is required'),
  notes: z.string().optional(),
  duration: z.number().int().min(0).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = { userId: session.user.id };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.date = { gte: startOfDay, lt: endOfDay };
    }

    const [activities, total] = await Promise.all([
      prisma.dailyActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dailyActivity.count({ where }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayActivities = await prisma.dailyActivity.findMany({
      where: {
        userId: session.user.id,
        date: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: 'desc' },
    });

    const todaySummary = {
      total: todayActivities.length,
      completed: todayActivities.filter(a => a.status === 'COMPLETED').length,
      pending: todayActivities.filter(a => a.status === 'PENDING').length,
      totalMinutes: todayActivities.reduce((sum, a) => sum + (a.duration || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        todaySummary,
      },
    });
  } catch (error) {
    console.error('Activities GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = activitySchema.parse(body);

    const activity = await prisma.dailyActivity.create({
      data: {
        userId: session.user.id,
        activity: data.activity,
        notes: data.notes || null,
        duration: data.duration || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, data: activity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Activities POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await request.json();

    const activity = await prisma.dailyActivity.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: activity });
  } catch (error) {
    console.error('Activities PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}