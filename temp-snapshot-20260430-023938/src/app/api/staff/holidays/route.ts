import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: startOfYear, lte: endOfYear },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ success: true, data: holidays });
  } catch (error) {
    console.error('Holidays GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name, nameBn, date, type, description } = await request.json();

    const holiday = await prisma.holiday.create({
      data: {
        name,
        nameBn: nameBn || null,
        date: new Date(date),
        type: type || 'GOVERNMENT',
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, data: holiday });
  } catch (error) {
    console.error('Holidays POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Holiday ID required' }, { status: 400 });
    }

    await prisma.holiday.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Holidays DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}