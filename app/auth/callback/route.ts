import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGuestSessionIdFromCookies, clearGuestSessionCookie } from '@/lib/cookies';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const baseUrl = siteUrl.replace(/\/+$/, '');

  let targetRedirect = `${baseUrl}/`;

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.user) {
      const user = session.user;
      const adminSupabase = createAdminClient();

      // Claim guest session if cookie exists
      try {
        const guestSessionId = await getGuestSessionIdFromCookies();
        if (guestSessionId) {
          const { data: guestSession } = await adminSupabase
            .from('guest_sessions')
            .select('*')
            .eq('id', guestSessionId)
            .single();

          if (guestSession && !guestSession.claimed_by) {
            const coinsWon = guestSession.coins_won || 50;
            if (coinsWon > 0) {
              await adminSupabase.from('coin_ledger').insert({
                user_id: user.id,
                amount: coinsWon,
                source: 'GUEST_SPIN',
                description: 'Guest spin reward (+50 coins)',
              });

              await adminSupabase
                .from('guest_sessions')
                .update({
                  claimed_by: user.id,
                  claimed_at: new Date().toISOString(),
                })
                .eq('id', guestSessionId);

              await adminSupabase.from('events').insert({
                user_id: user.id,
                event_type: 'COINS_TRANSFERRED',
                metadata: { guest_session_id: guestSessionId, amount: coinsWon },
              });
            }
            await clearGuestSessionCookie();
          }
        }
      } catch (claimErr) {
        console.error('[auth/callback] Error claiming guest session:', claimErr);
      }

      // MINIMUM query: SELECT only display_name, phone_number, pincode to check completeness
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('display_name, phone_number, pincode')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Insert initial basic profile from Google metadata
        await adminSupabase.from('profiles').insert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Zee Sipper',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });

        targetRedirect = `${baseUrl}/profile`;
      } else {
        const isComplete = Boolean(profile.display_name && profile.phone_number && profile.pincode);
        if (!isComplete) {
          targetRedirect = `${baseUrl}/profile`;
        } else {
          targetRedirect = `${baseUrl}/home`;
        }
      }
    }
  }

  // Branded HTML loading page + Instant JS replace / 307 redirect
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setting up your account... | Zee Sip Rewards</title>
  <link rel="icon" type="image/png" href="/zeesip-logo.png" />
  <meta http-equiv="refresh" content="0;url=${targetRedirect}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&display=swap');
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #B92429;
      color: #FFFFFF;
      font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      margin-bottom: 20px;
    }
    .text {
      font-size: 16px;
      font-weight: 600;
      color: #FFFFFF;
      margin: 0 0 20px 0;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script>
    window.location.replace("${targetRedirect}");
  </script>
</head>
<body>
  <img src="/zeesip-logo.png" alt="Zee Sip Logo" class="logo" />
  <p class="text">Setting up your account...</p>
  <div class="spinner"></div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Location': targetRedirect,
    },
    status: 307,
  });
}
