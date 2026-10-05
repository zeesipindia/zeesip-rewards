import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccessCode, ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessCode } = body;

    if (!verifyAdminAccessCode(accessCode)) {
      return NextResponse.json({ error: 'Wrong code' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: 'true',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
