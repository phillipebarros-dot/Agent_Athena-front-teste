/**
 * Rota API do Beyonder -- assistente de ajuda da plataforma Athena.
 *
 * O Beyonder responde perguntas sobre funcionalidades da plataforma.
 * Usa o mesmo backend /chat mas com system prompt especializado.
 */
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, BACKEND_TOKEN } from '@/lib/config';
import { COOKIE_NAME, verify } from '@/lib/session';

export const runtime = 'nodejs';

const BEYONDER_SYSTEM_PROMPT = `Voce e o Beyonder, o assistente de ajuda da plataforma Athena — um sistema de IA conversacional para agencias de publicidade (Grupo OM / OpusMultipla).

Seu papel:
- Explicar TODAS as funcionalidades da plataforma Athena de forma clara e simples
- Ajudar usuarios a entender como usar cada recurso
- Ser amigavel, direto e prestativo
- Responder em portugues brasileiro

Funcionalidades da Athena que voce conhece:
1. Chat com IA (Athena) — conversa principal, faz perguntas sobre clientes, campanhas, midia
2. Historico de conversas — sidebar esquerda, clica pra reabrir
3. Nova conversa — botao "+" no topo da sidebar
4. Selecao de cliente — dropdown no topo pra filtrar contexto por cliente
5. Upload de arquivos — botao de clip no composer, aceita PDF/imagens/planilhas
6. Feedback — polegar pra cima/baixo nas respostas da IA
7. Audio — botao de microfone pra ditar mensagens
8. Admin — painel de configuracao (dominios, sinonimos) so pra admins
9. Beyonder — voce! O assistente de ajuda flutuante
10. TTS — a Athena pode ler respostas em voz alta

Regras:
- Responda em 2-3 frases no maximo (widget pequeno)
- Se nao souber, diga "Nao tenho essa info, pergunta pro time de suporte"
- NUNCA invente funcionalidades que nao existem
- Seja conversacional, nao robótico`;

export async function POST(req: NextRequest) {
  // Verificar sessao
  const session = verify(req.cookies.get(COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: 'nao_autenticado' }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'body_invalido' }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: 'mensagem_vazia' }, { status: 400 });
  }

  try {
    const backendUrl = BACKEND_URL();
    const backendToken = BACKEND_TOKEN();

    if (!backendUrl || !backendToken) {
      return NextResponse.json({ error: 'backend_nao_configurado' }, { status: 500 });
    }

    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        message,
        user_id: session.email,
        user_email: session.email,
        system_prompt_override: BEYONDER_SYSTEM_PROMPT,
        conversation_id: `beyonder_${session.email}`,
        skip_memory: true,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { output: 'Ops, nao consegui processar. Tenta de novo?', error: text },
        { status: 200 } // Retorna 200 pro widget nao quebrar, com mensagem de fallback
      );
    }

    // Retornar resposta do backend
    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { output: 'Backend indisponivel no momento. Tenta daqui a pouco!' },
      { status: 200 }
    );
  }
}
