import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Main domain temporarily redirects to Rewards.
// MUST stay 307 (temporary). Never 301/308 — the main domain will later
// host the official Zee Sip website, and permanent redirects get cached
// in customers' browsers forever.
const MAIN_HOSTS = ['zeesip.com', 'www.zeesip.com'];
const REWARDS_ORIGIN = 'https://rewards.zeesip.com';

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();

  if (MAIN_HOSTS.includes(host)) {
    const target = new URL(req.nextUrl.pathname + req.nextUrl.search, REWARDS_ORIGIN);
    if (!target.searchParams.has('src')) target.searchParams.set('src', 'bottle_qr');
    return NextResponse.redirect(target, 307);
  }

  const pathname = req.nextUrl.pathname;

  // Returning user check: if user is logged in, immediately redirect from / to /home
  if (pathname === '/') {
    const hasAuthCookie = req.cookies
      .getAll()
      .some((c) => (c.name.startsWith('sb-') && c.name.includes('-auth-token')) || c.name === 'supabase-auth-token');

    if (hasAuthCookie && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            cookies: {
              getAll() {
                return req.cookies.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
              },
            },
          }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          return NextResponse.redirect(new URL('/home', req.url));
        }
      } catch (err) {
        console.error('Middleware landing redirect error:', err);
      }
    }
  }
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
