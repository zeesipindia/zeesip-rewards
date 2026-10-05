import { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'admin_session';
export const DEFAULT_ADMIN_CODE = '9656324645@zee';

export function getAdminAccessCode(): string {
  return process.env.ADMIN_ACCESS_CODE || DEFAULT_ADMIN_CODE;
}

export function verifyAdminAccessCode(code: string): boolean {
  if (!code) return false;
  return code.trim() === getAdminAccessCode().trim();
}

export function isAdminAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  return cookie?.value === 'true';
}
