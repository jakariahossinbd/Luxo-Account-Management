const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function generateLeadId() {
  return 'LD-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
}

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@luxo.com' },
    update: {},
    create: {
      email: 'admin@luxo.com',
      passwordHash,
      name: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('Created admin:', adminUser.email);

  // Create Seller 1
  const seller1 = await prisma.user.upsert({
    where: { email: 'seller1@luxo.com' },
    update: {},
    create: {
      email: 'seller1@luxo.com',
      passwordHash,
      name: 'Rahul Hasan',
      role: 'SELLER',
      phone: '01711111111',
      status: 'ACTIVE',
    },
  });

  const emp1 = await prisma.employee.upsert({
    where: { userId: seller1.id },
    update: {},
    create: {
      userId: seller1.id,
      employeeCode: 'SEL-001',
      designation: 'Sales Executive',
      salary: 20000,
    },
  });
  console.log('Created seller 1:', seller1.email);

  // Create Seller 2
  const seller2 = await prisma.user.upsert({
    where: { email: 'seller2@luxo.com' },
    update: {},
    create: {
      email: 'seller2@luxo.com',
      passwordHash,
      name: 'Mehedi Islam',
      role: 'SELLER',
      phone: '01722222222',
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { userId: seller2.id },
    update: {},
    create: {
      userId: seller2.id,
      employeeCode: 'SEL-002',
      designation: 'Sales Representative',
      salary: 18000,
    },
  });
  console.log('Created seller 2:', seller2.email);

  // Create Marketing 1
  const marketing1 = await prisma.user.upsert({
    where: { email: 'marketing1@luxo.com' },
    update: {},
    create: {
      email: 'marketing1@luxo.com',
      passwordHash,
      name: 'Tania Akter',
      role: 'MARKETING',
      phone: '01733333333',
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { userId: marketing1.id },
    update: {},
    create: {
      userId: marketing1.id,
      employeeCode: 'MKT-001',
      designation: 'Marketing Manager',
      salary: 25000,
    },
  });
  console.log('Created marketing 1:', marketing1.email);

  // Create Marketing 2
  const marketing2 = await prisma.user.upsert({
    where: { email: 'marketing2@luxo.com' },
    update: {},
    create: {
      email: 'marketing2@luxo.com',
      passwordHash,
      name: 'Karim Uddin',
      role: 'MARKETING',
      phone: '01744444444',
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { userId: marketing2.id },
    update: {},
    create: {
      userId: marketing2.id,
      employeeCode: 'MKT-002',
      designation: 'Marketing Executive',
      salary: 22000,
    },
  });
  console.log('Created marketing 2:', marketing2.email);

  // Create Sample Customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { phone: '01812345678' },
      update: {},
      create: { name: 'Mr. Rahman', nameBn: 'মোঃ রহমান', phone: '01812345678', email: 'rahman@email.com', address: 'Gulshan, Dhaka' }
    }),
    prisma.customer.upsert({
      where: { phone: '01812345679' },
      update: {},
      create: { name: 'Mrs. Farida', nameBn: 'ফারিদা বেগম', phone: '01812345679', email: 'farida@email.com', address: 'Banani, Dhaka' }
    }),
    prisma.customer.upsert({
      where: { phone: '01812345680' },
      update: {},
      create: { name: 'Mr. Kamal', nameBn: 'কামাল হোসেন', phone: '01812345680', address: 'Mirpur, Dhaka' }
    }),
    prisma.customer.upsert({
      where: { phone: '01812345681' },
      update: {},
      create: { name: 'Ms. Jahanara', nameBn: 'জাহানারা বেগম', phone: '01812345681', email: 'jahanara@email.com', address: 'Uttara, Dhaka' }
    }),
    prisma.customer.upsert({
      where: { phone: '01812345682' },
      update: {},
      create: { name: 'Mr. Shahin', nameBn: 'শাহীন মিয়া', phone: '01812345682', address: 'Dhanmondi, Dhaka' }
    }),
  ]);
  console.log('Created customers');

  // Create Sample Leads in Different Stages
  const leadsData = [
    {
      leadId: generateLeadId(),
      customerName: 'Mr. Rahman',
      phone: '01812345678',
      notes: 'Interested in premium wallpaper for living room',
      quantity: 15,
      productNote: 'Floral pattern, 50cm width',
      createdById: seller1.id,
      stage: 'LEAD',
    },
    {
      leadId: generateLeadId(),
      customerName: 'Mrs. Farida',
      phone: '01812345679',
      notes: 'Looking for carpet for office space',
      quantity: 200,
      productNote: 'Wool carpet, beige color',
      createdById: seller1.id,
      stage: 'TRANSFERRED',
    },
    {
      leadId: generateLeadId(),
      customerName: 'Mr. Kamal',
      phone: '01812345680',
      notes: 'Wants blinds for all windows',
      quantity: 5,
      productNote: 'Roman blinds, white',
      createdById: seller2.id,
      stage: 'LEAD',
    },
    {
      leadId: generateLeadId(),
      customerName: 'Ms. Jahanara',
      phone: '01812345681',
      notes: 'Renovation project, needs curtains',
      quantity: 8,
      productNote: 'Modern curtains, light blue',
      createdById: seller2.id,
      stage: 'TRANSFERRED',
    },
    {
      leadId: generateLeadId(),
      customerName: 'New Client - Enterprise Ltd',
      phone: '01755556666',
      notes: 'Corporate office setup, bulk order possible',
      quantity: 500,
      productNote: 'Mix of carpet and blinds',
      createdById: seller1.id,
      stage: 'LEAD',
    },
    {
      leadId: generateLeadId(),
      customerName: 'Mrs. Akter',
      phone: '01755557777',
      notes: 'Home renovation, small order',
      quantity: 3,
      productNote: 'Blinds for bedroom',
      createdById: seller2.id,
      stage: 'TRANSFERRED',
    },

  ];

  for (const lead of leadsData) {
    await prisma.lead.upsert({
      where: { leadId: lead.leadId },
      update: {},
      create: lead,
    });
  }
  console.log('Created sample leads');

  // Create Categories
  await Promise.all([
    prisma.category.upsert({ where: { id: 'cat-wallpaper' }, update: {}, create: { id: 'cat-wallpaper', name: 'Wallpaper', nameBn: 'ওয়ালপেপার', type: 'PRODUCT' } }),
    prisma.category.upsert({ where: { id: 'cat-carpet' }, update: {}, create: { id: 'cat-carpet', name: 'Carpet', nameBn: 'কার্পেট', type: 'PRODUCT' } }),
    prisma.category.upsert({ where: { id: 'cat-blinds' }, update: {}, create: { id: 'cat-blinds', name: 'Blinds', nameBn: 'ব্লাইন্ডস', type: 'PRODUCT' } }),
    prisma.category.upsert({ where: { id: 'cat-curtains' }, update: {}, create: { id: 'cat-curtains', name: 'Curtains', nameBn: 'পর্দা', type: 'PRODUCT' } }),
  ]);
  console.log('Created categories');

  // Create Sample Products
  await Promise.all([
    prisma.product.upsert({ where: { sku: 'WP-001' }, update: {}, create: { sku: 'WP-001', name: 'Premium Floral Wallpaper', nameBn: 'প্রিমিয়াম ফ্লোরাল ওয়ালপেপার', categoryId: 'cat-wallpaper', costPrice: 850, sellPrice: 1200, quantity: 50, unit: 'roll' } }),
    prisma.product.upsert({ where: { sku: 'CP-001' }, update: {}, create: { sku: 'CP-001', name: 'Luxury Wool Carpet', nameBn: 'লাক্সারি উল কার্পেট', categoryId: 'cat-carpet', costPrice: 2500, sellPrice: 4500, quantity: 20, unit: 'sqft' } }),
    prisma.product.upsert({ where: { sku: 'BL-001' }, update: {}, create: { sku: 'BL-001', name: 'Roman Blinds - White', nameBn: 'রোমান ব্লাইন্ডস - সাদা', categoryId: 'cat-blinds', costPrice: 1800, sellPrice: 2800, quantity: 30, unit: 'pcs' } }),
  ]);
  console.log('Created products');

  // Create Cash Account
  await prisma.account.upsert({ where: { id: 'acc-cash' }, update: {}, create: { id: 'acc-cash', name: 'Cash in Hand', type: 'CASH', balance: 100000 } });
  console.log('Created cash account');

  console.log('\n=== SEED COMPLETE ===');
  console.log('\nLogin Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ADMIN:    admin@luxo.com / password123');
  console.log('SELLER 1: seller1@luxo.com / password123');
  console.log('SELLER 2: seller2@luxo.com / password123');
  console.log('MARKETING 1: marketing1@luxo.com / password123');
  console.log('MARKETING 2: marketing2@luxo.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });