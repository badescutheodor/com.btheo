import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from '@/lib/jwt';

declare module 'next/server' {
  interface NextRequest {
    user?: Record<string, unknown>;
  }
}

export async function middleware(request: NextRequest) {
  const token = cookies().get('token')?.value;
  const user = token ? await jwt.decode({
    token,
    secret: process.env.JWT_SECRET || 'secret',
  }) : null;

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user || user.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};