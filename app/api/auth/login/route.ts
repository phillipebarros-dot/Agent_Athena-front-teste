/**
 * Login.
 * DEV (ATHENA_DEV_LOGIN=true): aceita {email} de domínio permitido e cria a sessão.
 * PROD: troque por Google OAuth (NextAuth) restrito ao domínio, ver DEPLOY-GCP.md.
 * O front NUNCA guarda identidade em localStorage; a sessão é um cookie httpOnly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { DEV_LOGIN, domainAllowed, ADMIN_EMAILS } from '@/lib/config';
import { COOKIE_NAME, sign, cookieOptions } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!DEV_LOGIN) {
    return NextResponse.json(
      { error: 'oauth_required', hint: 'Em produção o login é via Google OAuth. Ative ATHENA_DEV_LOGIN=true só em dev.' },
      { status: 501 },
    );
  }
  let email = '';
  let name = '';
  try {
    const body = await req.json();
    email = (body.email || '').trim().toLowerCase();
    name = (body.name || '').trim();
  } catch { /* usa default abaixo */ }
  if (!email) email = ADMIN_EMAILS[0] || 'phillipe.barros@grupoom.com.br';
  if (!domainAllowed(email)) {
    return NextResponse.json({ error: 'dominio_nao_permitido' }, { status: 403 });
  }
  if (!name) name = email.split('@')[0].split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  const res = NextResponse.json({ ok: true, email, name });
  res.cookies.set(COOKIE_NAME, sign({ email, name }), cookieOptions);
  return res;
}
