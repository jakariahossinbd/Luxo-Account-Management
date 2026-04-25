import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const secret = process.env.NEXTAUTH_SECRET || 'luxo-dev-secret';

async function getAuthToken(request: NextRequest) {
  const commonOptions = { req: request, secret };

  // First try default detection from next-auth.
  const defaultToken = await getToken(commonOptions);
  if (defaultToken) {
    return defaultToken;
  }

  // Fallback for environments where secure/non-secure cookie naming mismatches.
  const cookieCandidates = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
  ];

  for (const cookieName of cookieCandidates) {
    const token = await getToken({ ...commonOptions, cookieName });
    if (token) {
      return token;
    }
  }

  return null;
}

function toLoginUrl(
  request: NextRequest,
  targetPath: string,
  role: 'ADMIN' | 'SELLER',
  switchAccount = false,
) {
  const loginUrl = new URL(`/login/${role.toLowerCase()}`, request.url);
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
    const token = await getAuthToken(request);

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(toLoginUrl(request, pathname, 'ADMIN'));
    }

    // Check if user has admin role
    if (token.role !== 'ADMIN') {
      // Wrong role should re-authenticate instead of falling through to another dashboard
      return NextResponse.redirect(toLoginUrl(request, pathname, 'ADMIN', true));
    }
  }

  // Protect seller routes
  if (pathname.startsWith('/seller')) {
    const token = await getAuthToken(request);

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(toLoginUrl(request, pathname, 'SELLER'));
    }

    // Check if user has seller or admin role
    if (token.role !== 'SELLER' && token.role !== 'ADMIN') {
      return NextResponse.redirect(toLoginUrl(request, pathname, 'SELLER', true));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*'],
};
