import { NextRequest, NextResponse } from 'next/server';

// Main domain temporarily redirects to Rewards.
// MUST stay 307 (temporary). Never 301/308 — the main domain will later
// host the official Zee Sip website, and permanent redirects get cached
// in customers' browsers forever.
const MAIN_HOSTS = ['zeesip.com', 'www.zeesip.com'];
const REWARDS_ORIGIN = 'https://rewards.zeesip.com';

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();

  if (MAIN_HOSTS.includes(host)) {
    const target = new URL(req.nextUrl.pathname + req.nextUrl.search, REWARDS_ORIGIN);
    if (!target.searchParams.has('src')) target.searchParams.set('src', 'bottle_qr');
    return NextResponse.redirect(target, 307);
  }

  // Admin section session protection
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/admin')) {
    const isAdminAuthenticated = req.cookies.get('admin_session')?.value === 'true';

    if (pathname === '/admin' || pathname === '/admin/') {
      if (isAdminAuthenticated) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    } else {
      if (!isAdminAuthenticated) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
