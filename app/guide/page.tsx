'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

const css = (s: string) => {
  const obj: Record<string, string> = {};
  s.split(';').filter(Boolean).forEach(p => {
    const [k, ...v] = p.split(':');
    if (k && v.length) obj[k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v.join(':').trim();
  });
  return obj;
};

type Section = {
  title: string;
  icon: string;
  items: { title: string; desc: string; tip?: string }[];
};

const SECTIONS: Section[] = [
  {
    title: 'Chat e Conversas',
    icon: '💬',
    items: [
      { title: 'Enviar mensagem', desc: 'Digite sua pergunta no campo inferior e pressione Enter. Use Shift+Enter para nova linha.', tip: 'Seja específico: "Investimento do Boticário em TV no ciclo 04" funciona melhor que "gastos com TV".' },
      { title: 'Nova conversa', desc: 'Clique em "+ Nova conversa" na sidebar ou use Ctrl+N. Cada conversa tem seu próprio contexto.', tip: 'Recomendamos separar conversas por tema: uma para financeiro, outra para audiência, etc.' },
      { title: 'Renomear conversa', desc: 'Passe o mouse sobre a conversa na sidebar e clique no ícone ✏️. Digite o novo nome e pressione Enter.' },
      { title: 'Fixar conversa', desc: 'Clique no ícone de pin ao lado da conversa. Conversas fixadas ficam sempre no topo.' },
      { title: 'Deletar conversa', desc: 'Clique no ícone de lixeira ao lado da conversa. A ação é irreversível.' },
      { title: 'Buscar conversas', desc: 'Use o campo de busca na sidebar ou Ctrl+K para filtrar conversas por título.' },
      { title: 'Parar geração', desc: 'Enquanto a Athena está respondendo, clique em "Parar" ou use Ctrl+Shift+S.' },
      { title: 'Regenerar resposta', desc: 'Clique em ↻ Regenerar abaixo de qualquer resposta da Athena para refazer a consulta.' },
      { title: 'Indicador "Pensando…"', desc: 'Na sidebar, um badge dourado "Pensando…" aparece na conversa que está sendo processada.' },
      { title: 'Notificação de resposta', desc: 'Se você trocar de conversa enquanto a Athena responde, um badge vermelho aparece e um toast avisa.' },
    ],
  },
  {
    title: 'Exportação de Dados',
    icon: '📊',
    items: [
      { title: 'Botão CSV', desc: 'Exporta a tabela em formato CSV (texto separado por vírgulas). Download direto no navegador.' },
      { title: 'Botão XLSX', desc: 'Exporta em formato Excel com headers estilizados, cores e largura automática das colunas.' },
      { title: 'Botão PDF', desc: 'Gera um PDF formatado da tabela e abre a janela de impressão do navegador.' },
      { title: 'Botão Sheets (verde)', desc: 'Cria uma planilha Google Sheets nativa diretamente no seu Google Drive. Abre automaticamente no navegador.', tip: 'A planilha é criada no SEU Drive pessoal, com headers estilizados em vermelho e branco.' },
      { title: 'Copiar tabela', desc: 'Clique em "Copiar" para copiar a tabela para a área de transferência (cola no Excel/Sheets).' },
    ],
  },
  {
    title: 'Voz e Áudio',
    icon: '🎙️',
    items: [
      { title: 'Ditado por voz', desc: 'Clique no ícone 🎙️ no compositor para ditar sua pergunta. Disponível apenas no Google Chrome.', tip: 'Fale claramente e aguarde o texto aparecer no campo antes de enviar.' },
      { title: 'Ouvir resposta', desc: 'Clique no ícone 🔊 ao lado de qualquer resposta para ouvi-la em áudio (OpenAI TTS).', tip: 'Respostas muito longas podem demorar para gerar o áudio.' },
    ],
  },
  {
    title: 'Upload de Documentos',
    icon: '📎',
    items: [
      { title: 'Anexar PDF', desc: 'Clique no ícone 📎 e selecione um PDF. O texto será extraído e usado como contexto da sua pergunta.' },
      { title: 'Anexar Excel/CSV', desc: 'Mesma funcionalidade do PDF. Os dados são extraídos e incluídos na conversa.' },
    ],
  },
  {
    title: 'Contexto e Filtros',
    icon: '🎯',
    items: [
      { title: 'Barra de contexto', desc: 'No topo do chat, chips editáveis permitem fixar Ciclo, Plano, Período e Meio. Esses filtros são incluídos automaticamente em todas as perguntas.' },
      { title: 'Seletor de cliente', desc: 'Na sidebar, selecione o cliente ativo (Boticário, Eudora, etc.). Todas as consultas usam esse filtro.' },
      { title: 'Ver em gráfico', desc: 'Abaixo de tabelas, clique em "Ver em gráfico" para visualizar os dados como gráfico de barras.' },
    ],
  },
  {
    title: 'Gráficos e Visualização',
    icon: '📈',
    items: [
      { title: 'Gráfico automático', desc: 'Quando a Athena retorna uma tabela, o botão "Ver em gráfico" converte em Chart.js (barras).' },
      { title: 'Feedback', desc: 'Clique em 👍 ou 👎 abaixo de qualquer resposta. Adicione um comentário opcional para ajudar a melhorar a Athena.' },
    ],
  },
  {
    title: 'Administração',
    icon: '⚙️',
    items: [
      { title: 'Painel Admin', desc: 'Acesse /admin (apenas administradores). Visualize logs de auditoria, gerencie domínios e sinônimos.' },
      { title: 'Domínios permitidos', desc: 'Configure quais domínios de e-mail podem fazer login (ex: grupoom.com.br).' },
      { title: 'Sinônimos', desc: 'Mapeie termos de busca para nomes do Publi (ex: "Meio Dia Paraná" → "MEIO DIA PR").' },
    ],
  },
];

const FAQ = [
  { q: 'A Athena não encontrou meus dados. O que fazer?', a: 'Tente variações do nome (ex: "Meio Dia PR" em vez de "Meio Dia Paraná"). Use termos parciais. A Athena tenta automaticamente variantes, mas nomes muito diferentes podem não ser encontrados.' },
  { q: 'Posso exportar resultados para o Google Sheets?', a: 'Sim! Clique no botão verde "Sheets" abaixo de qualquer tabela. A planilha é criada diretamente no seu Google Drive com headers estilizados.' },
  { q: 'A resposta apareceu na conversa errada. O que houve?', a: 'Isso pode acontecer se você trocar de conversa rapidamente. A Athena agora detecta isso e mostra um toast avisando. Volte à conversa original para ver a resposta.' },
  { q: 'Como falar por voz?', a: 'Clique no 🎙️ no compositor. Disponível apenas no Google Chrome. Fale claramente e aguarde o texto aparecer.' },
  { q: 'O áudio da resposta não funciona. O que fazer?', a: 'O TTS usa OpenAI e pode ter limites de uso. Se der erro, tente novamente em alguns segundos. Textos muito longos (>4000 chars) são truncados.' },
  { q: 'Como separar conversas por tema?', a: 'Use "+ Nova conversa" para cada tema. Renomeie cada uma (ex: "Visão Ciclo", "Planejamentos", "Audiência"). Use o pin para fixar as mais usadas.' },
  { q: 'A Athena confundiu a geografia (ex: Grande Rio vs RJ Estado)?', a: 'A Athena agora diferencia mercados Kantar (metropolitanas) de estados inteiros. Se houver dúvida, ela pergunta qual recorte você quer.' },
  { q: 'Posso usar a Athena pelo celular?', a: 'Sim! O layout é responsivo. No celular, a sidebar abre com o menu hambúrguer (☰).' },
  { q: 'Quantas mensagens posso enviar?', a: 'O limite é de 30 mensagens por minuto. Após 20 mensagens numa conversa, o contexto é compactado automaticamente para manter a qualidade.' },
  { q: 'Os PIs que antes não apareciam agora estão disponíveis?', a: 'Sim! A Athena agora puxa PIs de todos os status (exceto cancelados), incluindo "Aprovado mas não faturar".' },
];

export default function GuidePage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await auth.me();
        if (!m?.authenticated) { router.replace('/login'); return; }
        setMe(m);
      } catch { router.replace('/login'); }
    })();
  }, [router]);

  const filteredSections = SECTIONS.map(s => ({
    ...s,
    items: s.items.filter(i =>
      !searchTerm || i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.desc.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(s => s.items.length > 0);

  const filteredFaq = FAQ.filter(f =>
    !searchTerm || f.q.toLowerCase().includes(searchTerm.toLowerCase()) || f.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={css('min-height:100vh; background:var(--bg-deep); color:var(--white); font-family:var(--font-body)')}>
      {/* Header */}
      <header style={css('padding:20px 32px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; background:rgba(24,24,27,0.8); backdrop-filter:blur(12px); position:sticky; top:0; z-index:10')}>
        <div style={css('display:flex; align-items:center; gap:16px')}>
          <button onClick={() => router.push('/chat')} style={css('background:none; border:none; color:var(--muted-light); cursor:pointer; font-size:14px; display:flex; align-items:center; gap:6px')}>
            ← Voltar ao Chat
          </button>
          <h1 style={css('font-size:20px; font-weight:700; color:var(--white); margin:0')}>
            📖 Guia da Athena
          </h1>
        </div>
        <input
          type="text"
          placeholder="Buscar funcionalidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={css('padding:8px 16px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); color:var(--white); font-size:13px; width:280px; outline:none')}
        />
      </header>

      <div style={css('max-width:960px; margin:0 auto; padding:32px 24px')}>
        {/* Section nav */}
        <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-bottom:32px')}>
          {SECTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => { setActiveSection(i); setSearchTerm(''); }}
              style={css(`padding:8px 16px; border-radius:20px; border:1px solid ${activeSection === i ? 'var(--red)' : 'var(--border)'}; background:${activeSection === i ? 'var(--red)' : 'var(--bg-surface)'}; color:${activeSection === i ? '#fff' : 'var(--muted-light)'}; cursor:pointer; font-size:13px; font-weight:500; transition:all 0.2s`)}
            >
              {s.icon} {s.title}
            </button>
          ))}
          <button
            onClick={() => { setActiveSection(-1); setSearchTerm(''); }}
            style={css(`padding:8px 16px; border-radius:20px; border:1px solid ${activeSection === -1 ? 'var(--gold)' : 'var(--border)'}; background:${activeSection === -1 ? 'var(--gold)' : 'var(--bg-surface)'}; color:${activeSection === -1 ? '#000' : 'var(--muted-light)'}; cursor:pointer; font-size:13px; font-weight:500; transition:all 0.2s`)}
          >
            ❓ FAQ
          </button>
        </div>

        {/* Content */}
        {activeSection >= 0 ? (
          <div>
            {(searchTerm ? filteredSections : [SECTIONS[activeSection]]).map((section, si) => (
              <div key={si} style={css('margin-bottom:32px')}>
                <h2 style={css('font-size:18px; font-weight:700; margin-bottom:16px; color:var(--white)')}>
                  {section.icon} {section.title}
                </h2>
                <div style={css('display:flex; flex-direction:column; gap:12px')}>
                  {section.items.map((item, ii) => (
                    <div key={ii} style={css('padding:16px 20px; border-radius:12px; border:1px solid var(--border); background:var(--bg-surface); transition:all 0.2s')}>
                      <h3 style={css('font-size:14px; font-weight:600; color:var(--white); margin:0 0 6px 0')}>{item.title}</h3>
                      <p style={css('font-size:13px; color:var(--muted-light); margin:0; line-height:1.6')}>{item.desc}</p>
                      {item.tip && (
                        <p style={css('font-size:12px; color:var(--gold); margin:8px 0 0 0; padding:8px 12px; background:rgba(215,180,80,0.08); border-radius:6px; border-left:3px solid var(--gold)')}>
                          💡 {item.tip}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <h2 style={css('font-size:18px; font-weight:700; margin-bottom:16px; color:var(--white)')}>
              ❓ Perguntas Frequentes
            </h2>
            <div style={css('display:flex; flex-direction:column; gap:8px')}>
              {filteredFaq.map((faq, i) => (
                <div
                  key={i}
                  style={css('border-radius:12px; border:1px solid var(--border); background:var(--bg-surface); overflow:hidden; transition:all 0.2s')}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    style={css('width:100%; padding:14px 20px; background:none; border:none; color:var(--white); font-size:14px; font-weight:500; text-align:left; cursor:pointer; display:flex; justify-content:space-between; align-items:center')}
                  >
                    <span>{faq.q}</span>
                    <span style={css(`transition:transform 0.2s; transform:rotate(${expandedFaq === i ? '180deg' : '0deg'})`)}> ▼</span>
                  </button>
                  {expandedFaq === i && (
                    <div style={css('padding:0 20px 14px 20px; font-size:13px; color:var(--muted-light); line-height:1.6')}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atalhos */}
        <div style={css('margin-top:40px; padding:24px; border-radius:12px; border:1px solid var(--border); background:var(--bg-surface)')}>
          <h2 style={css('font-size:16px; font-weight:700; margin:0 0 12px 0; color:var(--white)')}>⌨️ Atalhos de Teclado</h2>
          <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:8px')}>
            {[
              ['Ctrl+N', 'Nova conversa'],
              ['Ctrl+B', 'Abrir/fechar sidebar'],
              ['Ctrl+K', 'Focar na busca'],
              ['Ctrl+Shift+S', 'Parar geração'],
              ['Enter', 'Enviar mensagem'],
              ['Shift+Enter', 'Nova linha'],
            ].map(([key, action]) => (
              <div key={key} style={css('display:flex; align-items:center; gap:8px')}>
                <kbd style={css('padding:2px 8px; border-radius:4px; background:rgba(255,255,255,0.1); font-size:12px; font-family:monospace; color:var(--white); border:1px solid var(--border)')}>{key}</kbd>
                <span style={css('font-size:13px; color:var(--muted-light)')}>{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={css('text-align:center; margin-top:32px; font-size:12px; color:var(--muted)')}>
          Athena v3.1 — Opus Múltipla / Grupo OM — Desenvolvido por Phillipe Barros
        </p>
      </div>
    </div>
  );
}
