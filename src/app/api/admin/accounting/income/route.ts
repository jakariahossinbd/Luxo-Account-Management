import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const skip = (page - 1) * limit;

    const where: any = { type: 'CREDIT' as const };

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // Include entire end date
      if (where.createdAt) {
        where.createdAt.lte = end;
      } else {
        where.createdAt = { lte: end };
      }
    }

    const [incomes, total, totalIncome, accounts] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.account.findMany({
        where: { status: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, type: true, balance: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: incomes,
      meta: {
        totalIncome: totalIncome._sum.amount || 0,
      },
      accounts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching income transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch income transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, amount, description, referenceNo, relatedId, relatedType, date } = body;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    let targetAccountId = accountId as string | undefined;

    if (!targetAccountId) {
      const fallbackAccount = await prisma.account.findFirst({
        where: { status: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      if (fallbackAccount) {
        targetAccountId = fallbackAccount.id;
      }
    }

    if (!targetAccountId) {
      const autoAccount = await prisma.account.create({
        data: {
          name: 'Cash Account',
          type: 'CASH',
          balance: 0,
          status: true,
        },
        select: { id: true },
      });
      targetAccountId = autoAccount.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          accountId: targetAccountId as string,
          type: 'CREDIT',
          amount: parsedAmount,
          ...(description ? { description: String(description).trim() } : {}),
          ...(referenceNo ? { referenceNo: String(referenceNo).trim() } : {}),
          ...(relatedId ? { relatedId: String(relatedId).trim() } : {}),
          ...(relatedType ? { relatedType: String(relatedType).trim() } : {}),
          ...(date ? { createdAt: new Date(date) } : {}),
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      await tx.account.update({
        where: { id: targetAccountId as string },
        data: {
          balance: { increment: parsedAmount },
        },
      });

      return transaction;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating income transaction:', error);
    return NextResponse.json({ error: 'Failed to create income transaction' }, { status: 500 });
  }
}
