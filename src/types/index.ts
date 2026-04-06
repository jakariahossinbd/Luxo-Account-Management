import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardSummary {
  totalSales: number;
  totalPurchase: number;
  totalExpense: number;
  totalProfit: number;
  stockValue: number;
  totalEmployees: number;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface SalesData {
  date: string;
  sales: number;
  purchases: number;
  expenses: number;
}
