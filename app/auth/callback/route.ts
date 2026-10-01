import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        await adminSupabase.from('profiles').insert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Zee Sipper',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });

        await adminSupabase.from('events').insert([
          { user_id: user.id, event_type: 'ACCOUNT_CREATED' },
          { user_id: user.id, event_type: 'GOOGLE_AUTH_COMPLETED' },
        ]);

        targetRedirect = `${baseUrl}/profile`;
      } else {
        await adminSupabase.from('events').insert({
          user_id: user.id,
          event_type: 'LOGIN',
        });

        if (!profile.phone_number || !profile.team) {
          targetRedirect = `${baseUrl}/profile`;
        } else {
          targetRedirect = `${baseUrl}/home`;
        }
      }
    }
  }

  // Branded HTML loading page + 307 HTTP redirect
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Saving your coins... | Zee Sip Rewards</title>
  <meta http-equiv="refresh" content="0;url=${targetRedirect}">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #B92429;
      color: #FFFFFF;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .logo {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      margin-bottom: 20px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #FFC93C;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 {
      font-size: 22px;
      font-weight: 800;
      margin: 0;
      color: #FFC93C;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
    }
  </style>
  <script>
    window.location.replace("${targetRedirect}");
  </script>
</head>
<body>
  <img src="/zeesip-logo.png" alt="Zee Sip" class="logo" />
  <div class="spinner"></div>
  <h2>Saving your coins...</h2>
  <p>Connecting your Zee Sip Rewards profile</p>
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
