/**
 * Sessão assinada (HMAC-SHA256) em cookie httpOnly.
 *, Nunca guardamos e-mail/identidade em localStorage (regra de segurança do time).
 *, O cookie é httpOnly + secure + sameSite=lax: JS do navegador não lê, não vaza em XSS.
 *, Em produção, troque o login-stub por Google OAuth (NextAuth) restrito ao domínio.
 */
import crypto from 'crypto';
import { getSessionSecret } from './session-secret';

export const COOKIE_NAME = 'athena_session';
const MAX_AGE = 60 * 60 * 8; // 8 h

export type Session = { email: string; name: string; picture?: string; iat: number };

function b64url(buf: Buffer | string) {
  return Buffer.from(buf).toString('base64url');
}

export function sign(payload: Omit<Session, 'iat'>): string {
  const body = { ...payload, iat: Date.now() };
  const data = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verify(token?: string | null): Session | null {
  const secret = getSessionSecret();
  if (!token || !secret) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  // comparação em tempo constante
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString()) as Session;
    if (Date.now() - parsed.iat > MAX_AGE * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
};
