import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verify } from '@/lib/session';
import { BACKEND_URL, BACKEND_TOKEN, isAdmin } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const s = verify(req.cookies.get(COOKIE_NAME)?.value);
  if (!s) return NextResponse.json({ authenticated: false }, { status: 200 });

  let admin = isAdmin(s.email); // fallback hardcoded
  if (BACKEND_URL() && BACKEND_TOKEN()) {
    try {
      const res = await fetch(`${BACKEND_URL().replace(/\/$/, '')}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND_TOKEN()}` },
        body: JSON.stringify({ action: 'check', email: s.email }),
      });
      if (res.ok) {
        const data = await res.json();
        admin = data.role === 'admin';
      }
    } catch { /* fallback to hardcoded isAdmin */ }
  }

  return NextResponse.json({ authenticated: true, email: s.email, name: s.name, picture: s.picture || '', admin });
}
