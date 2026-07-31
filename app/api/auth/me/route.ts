import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verify } from '@/lib/session';
import { BACKEND_URL, BACKEND_TOKEN, isAdmin } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  const s = verify(cookieValue);
  if (!s) {
    const res = NextResponse.json({
      authenticated: false,
      _debug: { hasCookie: !!cookieValue, cookieLen: cookieValue?.length || 0, cookieNames: req.cookies.getAll().map(c => c.name) }
    }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }

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

  const res = NextResponse.json({ authenticated: true, email: s.email, name: s.name, picture: s.picture || '', admin });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res;
}
