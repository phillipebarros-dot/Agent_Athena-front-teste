/**
 * Rota API do Beyonder -- assistente de ajuda da plataforma Athena.
 *
 * O Beyonder responde perguntas sobre funcionalidades da plataforma.
 * Envia a mensagem ao backend /chat com prefixo de contexto na propria
 * mensagem (o backend nao suporta system_prompt_override).
 */
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, BACKEND_TOKEN } from '@/lib/config';
import { COOKIE_NAME, verify } from '@/lib/session';

export const runtime = 'nodejs';

const BEYONDER_CONTEXT = `[MODO BEYONDER - ASSISTENTE DE AJUDA]
Voce esta respondendo como o Beyonder, assistente de ajuda da plataforma Athena.
Responda APENAS sobre funcionalidades da plataforma. Seja breve (2-3 frases).

Funcionalidades da Athena:
- Chat com IA: perguntas sobre clientes, campanhas, midia, investimentos
- Selecao de cliente: dropdown no header pra filtrar por cliente
- Chips de contexto: ciclo, plano, periodo, meio — filtros fixos editaveis
- Upload: PDF, Excel, CSV, imagens — botao de clip no compositor
- Microfone: ditar mensagens com Web Speech API
- TTS: Athena le respostas em voz alta
- Feedback: polegar cima/baixo + comentario opcional
- Regenerar: refaz a resposta da IA
- Copiar: copia resposta pra area de transferencia
- Parar geracao: cancela resposta em andamento
- Graficos automaticos: tabelas viram graficos (barras, linhas, pizza)
- Exportar: CSV, Excel, HTML, Google Sheets
- Historico: sidebar esquerda com busca por titulo
- Notificacoes: badge de nova mensagem em outra conversa
- Autocomplete: sugestoes de entidades ao digitar
- Admin: dominios autorizados + sinonimos
- Tema claro/escuro: toggle no header
- Atalhos: Enter=enviar, Shift+Enter=nova linha, Ctrl+N=nova conversa
- Beyonder: assistente Live2D de ajuda (voce!)
- FAQ: pagina /faq com central de ajuda completa

PERGUNTA DO USUARIO: `;

export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { output: 'Backend nao configurado. Consulte a Central de Ajuda em /faq.' },
        { status: 200 }
      );
    }

    // Envia ao backend com contexto injetado na mensagem
    // (backend nao suporta system_prompt_override)
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        message: BEYONDER_CONTEXT + message,
        user_id: session.email,
        user_email: session.email,
        conversation_id: `beyonder_${session.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        client: 'Todos',
        is_audio: true,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error('[Beyonder] Backend error:', res.status, text.slice(0, 200));
      return NextResponse.json(
        { output: 'Hmm, nao consegui agora. Consulte a Central de Ajuda em /faq!' },
        { status: 200 }
      );
    }

    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ output: text }, { status: 200 });
    }

    return NextResponse.json({
      output: data.output || data.response || data.message || 'Consulte a Central de Ajuda em /faq.',
      audio: data.audio || null,
    });
  } catch (err) {
    console.error('[Beyonder] Fetch error:', err);
    return NextResponse.json(
      { output: 'Backend indisponivel. Consulte a Central de Ajuda em /faq!' },
      { status: 200 }
    );
  }
}
