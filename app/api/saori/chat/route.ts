/**
 * Rota API do Saori -- assistente de ajuda da plataforma Athena.
 *
 * O Saori responde perguntas sobre funcionalidades da plataforma.
 * Envia a mensagem ao backend /chat com prefixo de contexto na propria
 * mensagem (o backend nao suporta system_prompt_override).
 */
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, BACKEND_TOKEN } from '@/lib/config';
import { COOKIE_NAME, verify } from '@/lib/session';

export const runtime = 'nodejs';

const SAORI_CONTEXT = `[ATHENA â€” ASSISTENTE DE SABEDORIA]
Voce e Athena, deusa da sabedoria e guia da plataforma Athena.
Responda APENAS sobre funcionalidades da plataforma. Seja breve (2-3 frases).
Use tom sabio e acolhedor, com referencias sutis da Grecia Antiga quando natural.
NUNCA use emojis, emoticons ou caracteres especiais. Fale de forma profissional e inspiradora.

Funcionalidades da Athena:
- Chat com IA: perguntas sobre clientes, campanhas, midia, investimentos
- Selecao de cliente: dropdown no header pra filtrar por cliente
- Chips de contexto: ciclo, plano, periodo, meio â€” filtros fixos editaveis
- Upload: PDF, Excel, CSV, imagens â€” botao de clip no compositor
- Microfone: ditar mensagens com Web Speech API
- TTS: Athena le respostas em voz ultra-realista (Gemini TTS)
- Feedback: polegar cima/baixo + comentario opcional
- Regenerar: refaz a resposta da IA
- Copiar: copia resposta pra area de transferencia
- Parar geracao: cancela resposta em andamento
- Graficos automaticos: tabelas viram graficos (barras, linhas, pizza)
- Exportar: CSV, Excel, HTML, Google Sheets
- Historico: sidebar esquerda com busca por titulo
- Notificacoes: badge de nova mensagem em outra conversa
- Autocomplete: sugestoes de entidades ao digitar
- Admin: dominios autorizados + sinonimos + metricas analiticas
- Tema claro/escuro: toggle no header
- Atalhos: Enter=enviar, Shift+Enter=nova linha, Ctrl+N=nova conversa
- Assistente Athena: guia inteligente de ajuda (voce!)
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

    // conversation_id rotativo a cada 30min â€” evita acumulo de contexto
    // que pode travar o backend quando o historico fica muito grande
    const timeSlot = Math.floor(Date.now() / (30 * 60 * 1000));
    const safeEmail = session.email.replace(/[^a-zA-Z0-9]/g, '_');
    const convId = `Saori_${safeEmail}_${timeSlot}`;

    // Timeout de 30s â€” Saori deve responder rapido (respostas curtas)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    // Envia ao backend com contexto injetado na mensagem
    // (backend nao suporta system_prompt_override)
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        message: SAORI_CONTEXT + message,
        user_id: session.email,
        user_email: session.email,
        conversation_id: convId,
        client: 'Todos',
        is_audio: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const text = await res.text();

    if (!res.ok) {
      console.error('[Saori] Backend error:', res.status, text.slice(0, 300));
      return NextResponse.json(
        { output: 'Hmm, nao consegui agora. Consulte a Central de Ajuda em /faq!' },
        { status: 200 }
      );
    }

    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ output: text }, { status: 200 });
    }

    const outputText = data.output || data.response || data.message || 'Consulte a Central de Ajuda em /faq.';
    let audioB64 = data.audio || null;

    if (!audioB64 && outputText) {
      try {
        const { getAllAudioBase64 } = await import('google-tts-api');
        const results = await getAllAudioBase64(outputText, {
          lang: 'pt-BR',
          slow: false,
          host: 'https://translate.google.com',
          splitPunct: ',.?',
        });
        // Simplest fallback: we just use the first chunk if it splits,
        // or a concatenated base64 which might be tricky in pure node.
        // For Saori, responses are usually short (2-3 sentences), so first chunk is often enough.
        // But let's join them if possible. google-tts-api returns an array of objects.
        if (results && results.length > 0) {
          // Just using the first chunk for simplicity, but ideally we'd play sequentially.
          // Since it's a quick hack for TTS, let's take the first chunk.
          audioB64 = `data:audio/mp3;base64,${results[0].base64}`;
        }
      } catch (e) {
        console.error('[Saori] TTS fallback error:', e);
      }
    }

    return NextResponse.json({
      output: outputText,
      audio: audioB64,
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.error('[Saori]', isTimeout ? 'Timeout (30s)' : 'Fetch error:', err);
    return NextResponse.json(
      { output: isTimeout
          ? 'Demorou demais pra responder. Tente uma pergunta mais curta ou consulte a Central de Ajuda em /faq!'
          : 'Backend indisponivel. Consulte a Central de Ajuda em /faq!' },
      { status: 200 }
    );
  }
}

