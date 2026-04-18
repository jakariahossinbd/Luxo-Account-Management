import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const secret = process.env.NEXTAUTH_SECRET;

function toLoginUrl(request: NextRequest, targetPath: string, switchAccount = false) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', targetPath);
  if (switchAccount) {
    loginUrl.searchParams.set('switch', '1');
  }
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req: request, secret });

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(toLoginUrl(request, pathname));
    }

    // Check if user has admin role
    if (token.role !== 'ADMIN') {
      // Wrong role should re-authenticate instead of falling through to another dashboard
      return NextResponse.redirect(toLoginUrl(request, pathname, true));
    }
  }

  // Protect seller routes
  if (pathname.startsWith('/seller')) {
    const token = await getToken({ req: request, secret });

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(toLoginUrl(request, pathname));
    }

    // Check if user has seller or admin role
    if (token.role !== 'SELLER' && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*'],
};
