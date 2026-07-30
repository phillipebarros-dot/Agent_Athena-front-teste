/**
 * PROXY seguro Front → Backend Athena.
 *
 * Por que existe: o navegador NUNCA pode ver o ATHENA_BACKEND_TOKEN. Se o token
 * fosse embutido no front (ex.: NEXT_PUBLIC_), qualquer pessoa leria no DevTools
 * e bateria direto no backend — vazamento de dados e rios de requisição na sua
 * conta. Aqui o token vive só no servidor e é injetado a cada chamada.
 *
 * O front chama  POST /api/athena/<endpoint>  (mesma origem, com o cookie de
 * sessão). Este handler valida a sessão, injeta a identidade e o Bearer, aplica
 * rate limit e encaminha para o backend Python.
 */
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, BACKEND_TOKEN, RATE_LIMIT_PER_MIN, isAdmin } from '@/lib/config';
import { COOKIE_NAME, verify } from '@/lib/session';

export const runtime = 'nodejs';

// endpoints do backend que o front pode chamar (allowlist)
const ALLOWED = new Set(['chat', 'conversations', 'history', 'save-message', 'feedback', 'compact', 'audit', 'tts', 'export', 'users', 'list-clients', 'resume', 'time-travel']);
// endpoints que recebem a identidade do usuário logado
const NEEDS_USER = new Set(['chat', 'conversations', 'save-message', 'feedback', 'audit', 'users']);

// rate limit simples em memória (por instância). Em produção, somar Cloud Armor / API Gateway.
const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now(), windowMs = 60_000;
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > RATE_LIMIT_PER_MIN;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const endpoint = (path || [])[0];

  if (!endpoint || !ALLOWED.has(endpoint)) {
    return NextResponse.json({ error: 'endpoint_nao_permitido' }, { status: 404 });
  }
  if (!BACKEND_URL || !BACKEND_TOKEN) {
    return NextResponse.json({ error: 'backend_unconfigured', hint: 'defina ATHENA_BACKEND_URL e ATHENA_BACKEND_TOKEN no servidor' }, { status: 503 });
  }

  const session = verify(req.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'nao_autenticado' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(`${ip}:${endpoint}`)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  // auditoria: só admin (o backend revalida, isto é defesa em profundidade)
  if (endpoint === 'audit' && !isAdmin(session.email)) {
    return NextResponse.json({ error: 'acesso_negado' }, { status: 403 });
  }
  // users: ações admin (list, update_role) só admin; check/upsert qualquer autenticado
  // (guard movido pra depois do parse do body)

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  if (body && typeof body === 'object' && NEEDS_USER.has(endpoint)) {
    if (!body.user_id) body.user_id = session.email;
    if (!body.user_email) body.user_email = session.email;
  }

  if (endpoint === 'users') {
    const action = body?.action;
    if (['list', 'update_role'].includes(action) && !isAdmin(session.email)) {
      return NextResponse.json({ error: 'acesso_negado' }, { status: 403 });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND_TOKEN}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch {
    return NextResponse.json({ error: 'backend_indisponivel' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
