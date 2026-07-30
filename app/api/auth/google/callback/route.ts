/**
 * Callback do Google. Troca o code por token, lê o e-mail, valida o domínio
 * e cria a sessão httpOnly assinada. Restrito a ALLOWED_EMAIL_DOMAINS.
 */
import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, googleConfigured, domainAllowed, BACKEND_URL, BACKEND_TOKEN } from '@/lib/config';
import { COOKIE_NAME, sign, cookieOptions } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.cookies.get('oauth_state')?.value;

  const fail = (e: string) => NextResponse.redirect(new URL('/login?error=' + e, origin));

  if (!googleConfigured) return fail('oauth_indisponivel');
  if (url.searchParams.get('error')) return fail('cancelado');
  if (!code || !state || !cookieState || state !== cookieState) return fail('estado_invalido');

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return fail('token');
    const tokens = await tokenRes.json();

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return fail('userinfo');
    const info = await infoRes.json();

    const email = (info.email || '').toLowerCase();
    if (!info.email_verified) return fail('email_nao_verificado');
    if (!domainAllowed(email)) return fail('dominio_nao_permitido');

    const name = info.name || email.split('@')[0];
    const res = NextResponse.redirect(new URL('/chat', origin));
    res.cookies.set(COOKIE_NAME, sign({ email, name }), cookieOptions);
    res.cookies.set('oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 });

    // Registra/atualiza usuário no BigQuery (athena_users)
    if (BACKEND_URL && BACKEND_TOKEN) {
      fetch(`${BACKEND_URL.replace(/\/$/, '')}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND_TOKEN}` },
        body: JSON.stringify({
          action: 'upsert',
          google_sub: info.sub || '',
          email,
          nome: name,
          avatar_url: info.picture || '',
        }),
      }).catch(() => {}); // silencioso — não bloqueia o login
    }

    return res;
  } catch {
    return fail('falha');
  }
}
