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
const ALLOWED = new Set(['chat', 'chat/stream', 'conversations', 'history', 'save-message', 'feedback', 'compact', 'audit', 'tts', 'export', 'users', 'list-clients', 'resume', 'time-travel', 'settings/domains', 'settings/domains/add', 'settings/domains/remove', 'search-entities', 'settings/synonyms', 'settings/synonyms/add', 'settings/synonyms/remove', 'upload']);
// endpoints que recebem a identidade do usuário logado
const NEEDS_USER = new Set(['chat', 'chat/stream', 'conversations', 'save-message', 'feedback', 'audit', 'users']);

// rate limit simples em memória (por instância). Em produção, somar Cloud Armor / API Gateway.
const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now(), windowMs = 60_000;
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > RATE_LIMIT_PER_MIN();
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const endpoint = (path || []).join('/');

  if (!endpoint || !ALLOWED.has(endpoint)) {
    return NextResponse.json({ error: 'endpoint_nao_permitido' }, { status: 404 });
  }
  if (!BACKEND_URL() || !BACKEND_TOKEN()) {
    return NextResponse.json({ error: 'backend_unconfigured', hint: 'defina ATHENA_BACKEND_URL e ATHENA_BACKEND_TOKEN no servidor' }, { status: 503 });
  }

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  const session = verify(cookieValue);
  if (!session) {
    return NextResponse.json({
      error: 'nao_autenticado',
      _debug: {
        endpoint,
        hasCookie: !!cookieValue,
        cookieLen: cookieValue?.length || 0,
        hasSecret: !!process.env.SESSION_SECRET,
        secretLen: (process.env.SESSION_SECRET || '').length,
        cookieNames: req.cookies.getAll().map(c => c.name),
      }
    }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(`${ip}:${endpoint}`)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  // auditoria: só admin (o backend revalida, isto é defesa em profundidade)
  if ((endpoint === 'audit' || endpoint.startsWith('settings/')) && !isAdmin(session.email)) {
    return NextResponse.json({ error: 'acesso_negado' }, { status: 403 });
  }
  // users: ações admin (list, update_role) só admin; check/upsert qualquer autenticado
  // (guard movido pra depois do parse do body)

  // Upload: encaminha multipart/form-data direto (não JSON)
  if (endpoint === 'upload') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'nenhum_arquivo' }, { status: 400 });
      const upstreamForm = new FormData();
      upstreamForm.append('file', file);
      const res = await fetch(`${BACKEND_URL().replace(/\/$/, '')}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${BACKEND_TOKEN()}` },
        body: upstreamForm,
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

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  if (body && typeof body === 'object' && NEEDS_USER.has(endpoint)) {
    if (!body.user_id) body.user_id = session.email;
    if (!body.user_email) body.user_email = session.email;
  }
  // Injetar Google access_token para export Sheets (agora em cookie separado)
  if (body && typeof body === 'object' && endpoint === 'export') {
    const gat = req.cookies.get('google_access_token')?.value;
    if (gat) body.google_access_token = gat;
  }

  if (endpoint === 'users') {
    const action = body?.action;
    if (['list', 'update_role'].includes(action) && !isAdmin(session.email)) {
      return NextResponse.json({ error: 'acesso_negado' }, { status: 403 });
    }
  }

  // ── SSE Streaming: pipe body direto, não consumir com res.text() ──
  // Ref: Next.js docs — Route Handlers suportam ReadableStream via new Response(res.body)
  // Ref: GCP Cloud Run — text/event-stream com status 200 não é bufferizado
  if (endpoint === 'chat/stream') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000); // 5 min timeout para SSE
    try {
      const res = await fetch(`${BACKEND_URL().replace(/\/$/, '')}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND_TOKEN()}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        return new NextResponse(text, { status: res.status });
      }
      // Pipe SSE stream direto — NÃO consumir com res.text()
      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch {
      return NextResponse.json({ error: 'backend_indisponivel' }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${BACKEND_URL().replace(/\/$/, '')}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND_TOKEN()}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();

    // ShieldFont: codifica output do chat antes de enviar ao browser
    if (endpoint === 'chat' && res.ok) {
      try {
        const data = JSON.parse(text);
        if (data.output && typeof data.output === 'string') {
          const { encode, alpha } = await import('@shieldfont/core');
          data.output = encode(data.output, alpha);
          data._shielded = true; // flag para o front saber que esta codificado
          return NextResponse.json(data, { status: res.status });
        }
      } catch {
        // Se encoding falhar, retorna resposta original (graceful degradation)
      }
    }

    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch {
    return NextResponse.json({ error: 'backend_indisponivel' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const endpoint = (path || []).join('/');

  if (!['settings/domains', 'settings/synonyms'].includes(endpoint)) {
    return NextResponse.json({ error: 'endpoint_nao_permitido' }, { status: 404 });
  }
  if (!BACKEND_URL() || !BACKEND_TOKEN()) {
    return NextResponse.json({ error: 'backend_unconfigured' }, { status: 503 });
  }

  const session = verify(req.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'nao_autenticado' }, { status: 401 });
  if (!isAdmin(session.email)) return NextResponse.json({ error: 'acesso_negado' }, { status: 403 });

  try {
    const res = await fetch(`${BACKEND_URL().replace(/\/$/, '')}/${endpoint}`, {
      headers: { Authorization: `Bearer ${BACKEND_TOKEN()}` },
    });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return NextResponse.json({ error: 'backend_indisponivel' }, { status: 502 });
  }
}
