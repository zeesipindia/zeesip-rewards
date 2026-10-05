import { cookies } from 'next/headers';

const GUEST_COOKIE_NAME = 'guest_session_id';
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

export async function getGuestSessionIdFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_COOKIE_NAME)?.value;
}

export async function setGuestSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: GUEST_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_SECONDS,
    path: '/',
  });
}

export async function clearGuestSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE_NAME);
}
