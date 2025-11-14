import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/membership',
  '/customers', 
  '/credit',
  '/services',
  '/staff',
  '/reports',
  '/invoice',
  '/appointments',
  '/book-appointment'
];

// Special case for reports - only admins can access
const adminOnlyPaths = [
  '/reports',
  '/reports/daily'
];

// Auth related paths that should be excluded from session checks
const authPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
];

// Temporarily disable auth checks
export async function middleware(req) {
  const res = NextResponse.next();
  
  // Get the pathname from the URL
  const path = req.nextUrl.pathname;
  
  // Redirect home page to dashboard
  if (path === '/' || path === '') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return res;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/membership/:path*',
    '/customers/:path*',
    '/credit/:path*',
    '/services/:path*',
    '/staff/:path*',
    '/reports/:path*',
    '/auth/:path*',
    '/invoice/:path*',
    '/appointments/:path*',
    '/book-appointment/:path*',
  ],
}; 