import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verify } from '@/lib/session';
import { isAdmin } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const s = verify(req.cookies.get(COOKIE_NAME)?.value);
  if (!s) return NextResponse.json({ authenticated: false }, { status: 200 });
  return NextResponse.json({ authenticated: true, email: s.email, name: s.name, admin: isAdmin(s.email) });
}
