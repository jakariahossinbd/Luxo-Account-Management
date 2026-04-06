import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  nameBn: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  descriptionBn: z.string().optional(),
  unit: z.string().default('pcs'),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  quantity: z.number().int().min(0).default(0),
  minStockAlert: z.number().int().min(0).default(10),
  imageUrl: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');

    const where: any = {
      status: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'EMPLOYEE') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const data = productSchema.parse(body);

    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      return NextResponse.json({ success: false, error: 'SKU already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        nameBn: data.nameBn || null,
        categoryId: data.categoryId,
        description: data.description || null,
        descriptionBn: data.descriptionBn || null,
        unit: data.unit,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        quantity: data.quantity,
        minStockAlert: data.minStockAlert,
        imageUrl: data.imageUrl || null,
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Products POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
