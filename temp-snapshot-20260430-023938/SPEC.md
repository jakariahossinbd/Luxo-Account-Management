# Luxo Account Management Software - Technical Specification

## 1. Project Overview

**Project Name:** Luxo Account Management (ERP-lite for Interior Products Business)

**Business Type:** Interior products (wallpaper, carpet, blinds, related items)

**Technology Stack:**
- Frontend: Next.js 14 with TypeScript, Tailwind CSS
- Backend: Next.js API Routes (serverless)
- Database: PostgreSQL with Prisma ORM
- Authentication: NextAuth.js
- Charts: Recharts
- State Management: React Context + Zustand
- i18n: next-intl (Bangla + English)

---

## 2. Database Schema

### 2.1 Users Table
```sql
id, email, password_hash, name, role (ADMIN|MANAGER|EMPLOYEE), 
phone, address, avatar, status, created_at, updated_at
```

### 2.2 Products Table
```sql
id, sku, name, name_bn, category_id, description, description_bn,
unit, cost_price, sell_price, quantity, min_stock_alert,
image_url, status, created_at, updated_at
```

### 2.3 Categories Table
```sql
id, name, name_bn, type (PRODUCT|EXPENSE), parent_id, 
icon, status, created_at
```

### 2.4 Customers Table
```sql
id, name, name_bn, phone, email, address, address_bn,
company_name, total_due, status, created_at, updated_at
```

### 2.5 Suppliers Table
```sql
id, name, name_bn, phone, email, address, address_bn,
company_name, total_due, status, created_at, updated_at
```

### 2.6 Sales Table
```sql
id, order_id, customer_id, employee_id, subtotal, discount,
tax, total, payment_method, payment_status, status,
invoice_number, notes, created_at, updated_at
```

### 2.7 SaleItems Table
```sql
id, sale_id, product_id, quantity, unit_price, total, created_at
```

### 2.8 Purchases Table
```sql
id, purchase_order_no, supplier_id, employee_id, subtotal, discount,
tax, total, payment_method, payment_status, status,
notes, created_at, updated_at
```

### 2.9 PurchaseItems Table
```sql
id, purchase_id, product_id, quantity, unit_price, total, created_at
```

### 2.10 Expenses Table
```sql
id, category_id, employee_id, amount, description, description_bn,
payment_method, payment_status, date, created_at, updated_at
```

### 2.11 Employees Table
```sql
id, user_id, employee_code, designation, designation_bn, salary,
hire_date, status, created_at, updated_at
```

### 2.12 Accounts Table
```sql
id, name, type (CASH|BANK), account_number, bank_name, branch,
balance, status, created_at, updated_at
```

### 2.13 Transactions Table
```sql
id, account_id, type (DEBIT|CREDIT), amount, description,
reference_no, related_id, related_type, created_at
```

### 2.14 Notifications Table
```sql
id, user_id, type, title, title_bn, message, message_bn,
is_read, created_at
```

### 2.15 Settings Table
```sql
id, key, value, created_at, updated_at
```

---

## 3. API Structure

### 3.1 Authentication Routes
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/session

### 3.2 Users Routes
- GET /api/users
- POST /api/users
- GET /api/users/[id]
- PUT /api/users/[id]
- DELETE /api/users/[id]

### 3.3 Products Routes
- GET /api/products
- POST /api/products
- GET /api/products/[id]
- PUT /api/products/[id]
- DELETE /api/products/[id]
- GET /api/products/low-stock

### 3.4 Categories Routes
- GET /api/categories
- POST /api/categories
- PUT /api/categories/[id]
- DELETE /api/categories/[id]

### 3.5 Customers Routes
- GET /api/customers
- POST /api/customers
- GET /api/customers/[id]
- PUT /api/customers/[id]
- DELETE /api/customers/[id]

### 3.6 Suppliers Routes
- GET /api/suppliers
- POST /api/suppliers
- GET /api/suppliers/[id]
- PUT /api/suppliers/[id]
- DELETE /api/suppliers/[id]

### 3.7 Sales Routes
- GET /api/sales
- POST /api/sales
- GET /api/sales/[id]
- GET /api/sales/invoice/[order_id]
- PUT /api/sales/[id]

### 3.8 Purchases Routes
- GET /api/purchases
- POST /api/purchases
- GET /api/purchases/[id]
- PUT /api/purchases/[id]

### 3.9 Expenses Routes
- GET /api/expenses
- POST /api/expenses
- GET /api/expenses/[id]
- PUT /api/expenses/[id]
- GET /api/expenses/summary

### 3.10 Employees Routes
- GET /api/employees
- POST /api/employees
- GET /api/employees/[id]
- PUT /api/employees/[id]
- GET /api/employees/[id]/sales

### 3.11 Accounts Routes
- GET /api/accounts
- POST /api/accounts
- GET /api/accounts/[id]
- PUT /api/accounts/[id]
- GET /api/accounts/[id]/transactions

### 3.12 Reports Routes
- GET /api/reports/sales
- GET /api/reports/expenses
- GET /api/reports/profit-loss
- GET /api/reports/stock
- GET /api/reports/employee-performance

### 3.13 Dashboard Routes
- GET /api/dashboard/summary
- GET /api/dashboard/chart-data
- GET /api/dashboard/recent-activities

### 3.14 Settings Routes
- GET /api/settings
- PUT /api/settings

### 3.15 Notifications Routes
- GET /api/notifications
- PUT /api/notifications/[id]/read
- PUT /api/notifications/read-all

---

## 4. UI/UX Design

### 4.1 Layout Structure
- **Sidebar:** 260px fixed width, dark theme (#1e293b)
- **Header:** 64px height, sticky, contains search + user menu + notifications
- **Main Content:** Fluid, responsive, padding 24px
- **Cards:** White background, border-radius 12px, shadow-sm

### 4.2 Color Scheme
- Primary: #3b82f6 (Blue)
- Secondary: #64748b (Slate)
- Success: #22c55e (Green)
- Warning: #f59e0b (Amber)
- Danger: #ef4444 (Red)
- Background: #f8fafc (Light gray)
- Card: #ffffff
- Sidebar: #1e293b (Dark slate)
- Text Primary: #1e293b
- Text Secondary: #64748b

### 4.3 Typography
- Font Family: "Inter", system-ui, sans-serif
- Headings: font-weight 600-700
- Body: font-weight 400, 14-16px
- Bangla Font: "Hind Siliguri"

### 4.4 Components
- Buttons: Primary, Secondary, Danger, Ghost variants
- Input Fields: Border, focus ring, error states
- Tables: Striped, hover effects, pagination
- Cards: Stats cards with icons, charts
- Modals: Centered, backdrop blur
- Sidebar Menu: Icons + labels, active state indicator

### 4.5 Responsive Breakpoints
- Mobile: < 768px (sidebar as drawer)
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## 5. Feature Modules

### 5.1 Authentication
- Login with email/password
- Role-based access control (Admin, Manager, Employee)
- Session management with JWT
- Profile management

### 5.2 Dashboard
- Summary cards (Total Sales, Purchase, Expense, Profit, Stock Value, Employees)
- Sales chart (Daily/Weekly/Monthly/Yearly)
- Income vs Expense chart
- Recent activities feed
- Notifications preview

### 5.3 Products & Inventory
- Category management (Wallpaper, Carpet, Blinds, etc.)
- Product CRUD with images
- Stock auto-update (increase on purchase, decrease on sale)
- Low stock alerts (< min_stock_alert)
- Quick stock summary
- Product search

### 5.4 Sales Management
- Create invoice with multiple products
- Assign employee to sale
- Order ID tracking (auto-generated)
- Filter by date, employee
- Sales history
- Auto stock deduction
- Printable invoice

### 5.5 Purchase Management
- Record purchases from suppliers
- Supplier management
- Auto stock increase
- Purchase reports

### 5.6 Expense Management
- Expense categories (Rent, Salary, Utilities, etc.)
- Daily expense input
- Monthly expense summary

### 5.7 Employee Management
- Employee CRUD (linked to users)
- Salary management
- Sales performance tracking
- Employee search

### 5.8 Banking & Transactions
- Cash & Bank accounts
- Debit/Credit tracking
- Transaction history

### 5.9 Reports & Analytics
- Sales report with filters
- Expense report
- Profit/Loss report
- Employee performance report
- Stock report

### 5.10 Invoice System
- Auto-generated invoice
- Order ID based tracking
- Print & Download PDF

### 5.11 Notifications
- Low stock alerts
- Sales alerts
- Expense alerts

### 5.12 Settings
- Company info
- Currency settings
- Language switch (Bangla/English)
- User permissions

---

## 6. Automation Features

1. **Stock Auto Update:**
   - On Sale: Decrease product quantity
   - On Purchase: Increase product quantity

2. **Profit Auto Calculation:**
   - Profit = Total Sales - Total Purchases - Total Expenses

3. **Expense Auto Summary:**
   - Monthly expense totals by category

4. **Sales Analytics Auto Generate:**
   - Daily/Weekly/Monthly/Yearly aggregates

5. **Low Stock Alerts:**
   - Check daily, create notifications when quantity < min_stock_alert

---

## 7. Internationalization (i18n)

### 7.1 Supported Languages
- English (en) - Default
- Bangla (bn)

### 7.2 Translation Keys Structure
- common.* (save, cancel, delete, etc.)
- nav.* (navigation labels)
- dashboard.* (dashboard labels)
- products.* (product management)
- sales.* (sales management)
- purchases.* (purchase management)
- expenses.* (expense management)
- employees.* (employee management)
- reports.* (report labels)
- settings.* (settings labels)

---

## 8. Security Requirements

1. Password hashing with bcrypt
2. JWT token authentication
3. Role-based access control at API level
4. Input validation with Zod
5. SQL injection prevention via Prisma
6. XSS protection
7. CORS configuration

---

## 9. File Structure

```
/Luxo-Account-Management
├── /src
│   ├── /app
│   │   ├── /api
│   │   │   ├── /auth
│   │   │   ├── /users
│   │   │   ├── /products
│   │   │   ├── /categories
│   │   │   ├── /customers
│   │   │   ├── /suppliers
│   │   │   ├── /sales
│   │   │   ├── /purchases
│   │   │   ├── /expenses
│   │   │   ├── /employees
│   │   │   ├── /accounts
│   │   │   ├── /reports
│   │   │   ├── /dashboard
│   │   │   ├── /notifications
│   │   │   └── /settings
│   │   ├── /(auth)
│   │   │   └── /login
│   │   ├── /(dashboard)
│   │   │   ├── /layout.tsx
│   │   │   ├── /page.tsx
│   │   │   ├── /products
│   │   │   ├── /sales
│   │   │   ├── /purchases
│   │   │   ├── /expenses
│   │   │   ├── /employees
│   │   │   ├── /customers
│   │   │   ├── /suppliers
│   │   │   ├── /accounts
│   │   │   ├── /reports
│   │   │   └── /settings
│   │   ├── /globals.css
│   │   └── /layout.tsx
│   ├── /components
│   │   ├── /ui
│   │   ├── /layout
│   │   └── /features
│   ├── /lib
│   │   ├── /prisma.ts
│   │   ├── /auth.ts
│   │   └── /utils.ts
│   ├── /hooks
│   ├── /store
│   └── /messages
│       ├── /en.json
│       └── /bn.json
├── /prisma
│   └── schema.prisma
├── /public
├── package.json
├── tailwind.config.ts
├── next.config.js
└── tsconfig.json
```

---

## 10. Acceptance Criteria

1. ✅ Users can log in with different roles (Admin, Manager, Employee)
2. ✅ Dashboard shows real-time analytics and charts
3. ✅ Products can be added/edited/deleted with stock tracking
4. ✅ Sales automatically deduct stock and generate invoices
5. ✅ Purchases automatically add stock
6. ✅ Expenses are tracked by category
7. ✅ Employee performance is tracked via sales
8. ✅ All reports generate correctly with filters
9. ✅ System supports Bangla and English languages
10. ✅ Low stock alerts appear as notifications
11. ✅ Invoice can be printed/downloaded
12. ✅ Responsive design works on mobile/tablet/desktop
