/**
 * Início do login Google (OAuth 2.0 / OpenID Connect).
 * Reusa a MESMA sessão httpOnly assinada do resto do app (lib/session).
 * Sem dependência externa: fala direto com os endpoints do Google.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { GOOGLE_CLIENT_ID, googleConfigured, ALLOWED_DOMAINS } from '@/lib/config';

export const runtime = 'nodejs';

/** Cloud Run roda atrás de um LB — req.nextUrl.origin retorna 0.0.0.0:8080.
 *  Usa x-forwarded-host/proto pra obter a URL pública real. */
function getOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

const rateLimit = new Map<string, { count: number, resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rateLimit.get(ip);
  if (!rec || now > rec.resetAt) { rateLimit.set(ip, { count: 1, resetAt: now + 60000 }); return true; }
  if (rec.count >= 10) return false;
  rec.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  if (!googleConfigured) {
    return NextResponse.redirect(new URL('/login?error=oauth_indisponivel', getOrigin(req)));
  }
  const state = crypto.randomBytes(16).toString('base64url');
  const redirectUri = `${getOrigin(req)}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  
  if (ALLOWED_DOMAINS.length > 1) {
    params.set('hd', '*');
  } else if (ALLOWED_DOMAINS.length === 1) {
    params.set('hd', ALLOWED_DOMAINS[0]);
  }

  const res = NextResponse.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
  res.cookies.set('oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
