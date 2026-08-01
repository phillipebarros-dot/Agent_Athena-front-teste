'use client';
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ── SVG Icons (sem emojis) ────────────────────────── */
const Icons = {
  rocket: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  mic: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  upload: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  download: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  keyboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="8" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="12" y2="12"/><line x1="16" y1="12" x2="16" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
    </svg>
  ),
  chevron: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9"/>
    </svg>
  ),
};

/* ── FAQ Data ─────────────────────────────────────── */
interface FaqItem { q: string; a: string }
interface FaqCategory { title: string; icon: React.ReactNode; accent: string; items: FaqItem[] }

const FAQ: FaqCategory[] = [
  {
    title: 'Primeiros Passos',
    icon: Icons.rocket,
    accent: '#C41E1E',
    items: [
      { q: 'O que e a Athena?', a: 'A Athena e uma assistente de IA especializada em publicidade e midia da OpusMultipla. Ela consulta dados reais (BigQuery, ERP, Kantar, IBOPE, TGI) para responder perguntas sobre clientes, campanhas, investimentos, audiencia e muito mais.' },
      { q: 'Como inicio uma conversa?', a: 'Na tela principal, digite sua pergunta no campo de texto na parte inferior e pressione Enter. A Athena processa sua pergunta, consulta as fontes de dados relevantes e gera uma resposta estruturada.' },
      { q: 'Como crio uma nova conversa?', a: 'Clique no botao "+" no topo da sidebar esquerda. Cada conversa e independente e mantem seu proprio historico.' },
      { q: 'Como acesso conversas anteriores?', a: 'A sidebar esquerda lista todas as suas conversas agrupadas por data (Hoje, Ontem, Ultima semana, Mais antigas). Clique em qualquer uma para reabrir.' },
      { q: 'Posso buscar em conversas antigas?', a: 'Sim. Na sidebar existe um campo de busca. Digite qualquer termo e as conversas serao filtradas em tempo real pelo titulo.' },
      { q: 'Onde ficam as sugestoes de perguntas?', a: 'Na tela de boas-vindas (quando nenhuma conversa esta aberta), a Athena mostra cards com sugestoes como "Investimento de midia do Boticario no ciclo 04" ou "Ranking de radio por ouvintes/minuto em Curitiba". Clique em qualquer uma para enviar automaticamente.' },
    ],
  },
  {
    title: 'Chat e Interacao',
    icon: Icons.chat,
    accent: '#0ea5e9',
    items: [
      { q: 'Como seleciono um cliente?', a: 'Use o dropdown de cliente no header superior. Ao selecionar um cliente (ex: O Boticario, Vivo), a Athena filtra todas as respostas para o contexto daquele cliente.' },
      { q: 'O que sao os chips de contexto?', a: 'Abaixo do header existem chips editaveis: Ciclo, Plano, Periodo e Meio. Preencha-os para dar contexto fixo a suas perguntas. Por exemplo, definir Ciclo=04 faz a Athena filtrar automaticamente por esse ciclo.' },
      { q: 'Posso enviar arquivos?', a: 'Sim. Clique no icone de clip no compositor de mensagens. Aceita PDF, Excel (.xlsx), CSV e imagens. O texto e extraido automaticamente e enviado junto com sua pergunta.' },
      { q: 'Posso enviar imagens para analise?', a: 'Sim. A Athena suporta visao computacional via Claude (multimodal). Envie uma imagem (PNG, JPG, GIF, WebP) e faca perguntas sobre ela. Por exemplo: "Analise este grafico de vendas" com a imagem anexada.' },
      { q: 'Como funciona o streaming de respostas?', a: 'A Athena usa SSE (Server-Sent Events) para enviar tokens em tempo real. Voce ve a resposta sendo construida palavra por palavra, sem esperar o processamento completo. Isso reduz drasticamente o tempo de espera percebido.' },
      { q: 'Como uso o microfone?', a: 'Clique no icone de microfone no compositor. Ele usa a Web Speech API do navegador para transcrever sua fala em texto. Clique novamente para parar a gravacao. O texto transcrito aparece no campo de input.' },
      { q: 'O que faz o botao "Parar"?', a: 'Quando a Athena esta gerando uma resposta longa, o botao "Parar" aparece. Ele cancela a geracao em andamento usando AbortController. Util se voce percebeu que a pergunta nao era a correta.' },
      { q: 'Como copio uma resposta?', a: 'Nas acoes abaixo de cada resposta da Athena, clique no icone de copiar. O conteudo e copiado para a area de transferencia do sistema.' },
      { q: 'Como regenero uma resposta?', a: 'Nas acoes abaixo de cada resposta, clique no icone de regenerar (setas circulares). A Athena reprocessa a mesma pergunta e gera uma nova resposta.' },
      { q: 'Como dou feedback?', a: 'Cada resposta tem icones de polegar para cima e para baixo. Ao clicar em qualquer um, um formulario opcional aparece para voce detalhar o motivo. Isso ajuda a equipe a calibrar a IA.' },
      { q: 'A Athena le respostas em voz alta?', a: 'Sim. Nas acoes de cada resposta existe o botao TTS (Text-to-Speech). Clique para ouvir a resposta em audio sintetizado via OpenAI.' },
      { q: 'O que sao as notificacoes por conversa?', a: 'Se voce esta em uma conversa e recebe resposta em outra, um badge vermelho aparece na sidebar indicando que ha novas mensagens naquela conversa.' },
      { q: 'O que e o autocomplete de entidades?', a: 'Ao digitar no campo de mensagem, a Athena pode sugerir nomes de clientes, veiculos, programas e outras entidades do sistema. Selecione uma sugestao para inserir o nome correto.' },
    ],
  },
  {
    title: 'Graficos e Exportacao',
    icon: Icons.chart,
    accent: '#10b981',
    items: [
      { q: 'Como a Athena gera graficos?', a: 'Quando a resposta contem uma tabela com dados numericos, a Athena detecta automaticamente e oferece um botao "Ver Grafico". Ela escolhe o tipo ideal (barras, linhas, pizza) baseado nos dados.' },
      { q: 'Posso alternar entre tabela e grafico?', a: 'Sim. Use o toggle acima da tabela para alternar entre a visualizacao em tabela e em grafico. Ambas as views mostram os mesmos dados.' },
      { q: 'Como exporto dados para CSV?', a: 'Abaixo de cada tabela, clique no botao "CSV". Um arquivo .csv e gerado e baixado automaticamente com os dados da tabela.' },
      { q: 'Como exporto para Excel?', a: 'Clique no botao "Excel". O backend gera um arquivo .xlsx formatado e faz o download automatico.' },
      { q: 'Posso exportar para Google Sheets?', a: 'Sim. Clique no botao "Sheets". O sistema cria uma planilha no Google Sheets com os dados e abre em uma nova aba. Requer que seu email esteja autorizado.' },
      { q: 'Como exporto uma tabela em HTML?', a: 'Clique no botao "HTML". Um relatorio formatado com a marca Athena e gerado e aberto em nova aba para impressao.' },
    ],
  },
  {
    title: 'Entrada de Voz e Audio',
    icon: Icons.mic,
    accent: '#f59e0b',
    items: [
      { q: 'Que navegadores suportam o microfone?', a: 'O microfone usa a Web Speech API, suportada nativamente no Chrome, Edge e Safari. Firefox tem suporte parcial.' },
      { q: 'Como funciona o TTS no chat?', a: 'O Text-to-Speech no chat usa a API da OpenAI (voz onyx) para gerar audio sintetizado. O audio e reproduzido diretamente no navegador.' },
      { q: 'Como funciona a voz da Saori?', a: 'A Saori usa Gemini TTS com voz feminina ultra-realista (Aoede). Se o Gemini falhar, usa Google Cloud Neural2-C (feminina) como fallback. A voz da Saori e independente do TTS do chat principal.' },
      { q: 'Posso parar o audio no meio?', a: 'Sim. Ao clicar novamente no botao de TTS enquanto esta tocando, o audio para imediatamente.' },
      { q: 'Qual a diferenca de voz entre Saori e Chat?', a: 'A Saori tem voz feminina natural (Gemini AI), enquanto o chat usa OpenAI TTS com voz onyx. Sao provedores separados, otimizados para cada contexto.' },
    ],
  },
  {
    title: 'Upload de Documentos',
    icon: Icons.upload,
    accent: '#8b5cf6',
    items: [
      { q: 'Que tipos de arquivo posso enviar?', a: 'PDF, Excel (.xlsx), CSV e imagens (PNG, JPG, GIF, WebP). O texto e extraido automaticamente de cada formato.' },
      { q: 'Posso enviar imagens para a IA analisar?', a: 'Sim. A Athena usa Claude com suporte multimodal (Vision). Envie qualquer imagem e pergunte sobre ela. Formatos suportados: JPEG, PNG, GIF e WebP.' },
      { q: 'O que acontece com o arquivo enviado?', a: 'O texto e extraido no frontend (para PDFs e CSVs) ou enviado ao backend (para Excel). Imagens sao enviadas em base64 para analise visual pela IA. O conteudo e anexado a sua mensagem como contexto.' },
      { q: 'Ha limite de tamanho?', a: 'O limite pratico e de cerca de 10MB por arquivo. Imagens sao otimizadas automaticamente. Arquivos muito grandes podem demorar para processar.' },
    ],
  },
  {
    title: 'Exportacao de Dados',
    icon: Icons.download,
    accent: '#06b6d4',
    items: [
      { q: 'Que formatos de exportacao estao disponiveis?', a: 'CSV (download direto), Excel .xlsx (gerado no backend), Google Sheets (cria planilha online) e HTML (relatorio formatado para impressao).' },
      { q: 'A exportacao preserva formatacao?', a: 'O Excel e HTML preservam formatacao completa com headers coloridos e marca Athena. CSV exporta dados puros sem formatacao.' },
      { q: 'Posso exportar conversas inteiras?', a: 'Sim. No menu de cada conversa na sidebar, existe a opcao de exportar todo o historico em formato texto.' },
    ],
  },
  {
    title: 'Administracao',
    icon: Icons.settings,
    accent: '#ef4444',
    items: [
      { q: 'Como acesso o painel Admin?', a: 'Clique no icone de engrenagem no header. O acesso e restrito a usuarios com permissao de administrador configurada no backend.' },
      { q: 'Como configuro dominios autorizados?', a: 'No Admin, va em "Dominios". Adicione dominios de email (ex: @grupoom.com.br) que tem permissao de acessar a plataforma. Usuarios com emails fora desses dominios nao conseguem fazer login.' },
      { q: 'O que sao sinonimos?', a: 'Sinonimos ensinam a Athena a entender termos especificos da sua agencia. Por exemplo, "OPM" = "OpusMultipla", "Boti" = "O Boticario". Configure no painel Admin em "Sinonimos".' },
      { q: 'Como gerencio usuarios?', a: 'O acesso e controlado por dominio de email via Google OAuth. Qualquer pessoa com email no dominio autorizado pode acessar. Nao ha gerenciamento individual de usuarios.' },
    ],
  },
  {
    title: 'Seguranca e Privacidade',
    icon: Icons.shield,
    accent: '#64748b',
    items: [
      { q: 'Como funciona a autenticacao?', a: 'A Athena usa Google OAuth 2.0. Voce faz login com sua conta Google corporativa. Tokens sao armazenados em cookies HttpOnly seguros.' },
      { q: 'Meus dados estao seguros?', a: 'Sim. A infraestrutura roda no Google Cloud Run com HTTPS obrigatorio. Dados em transito sao criptografados via TLS. Nenhum dado e compartilhado com terceiros.' },
      { q: 'Posso usar a Athena em dispositivos moveis?', a: 'Sim. O frontend e responsivo e funciona em qualquer navegador moderno, desktop ou mobile.' },
      { q: 'O que acontece se o backend ficar offline?', a: 'A interface mostra um indicador de status. Voce pode continuar navegando conversas existentes, mas novas perguntas nao serao processadas ate o backend voltar.' },
    ],
  },
  {
    title: 'Atalhos e Produtividade',
    icon: Icons.keyboard,
    accent: '#a855f7',
    items: [
      { q: 'Que atalhos de teclado existem?', a: 'Enter: enviar mensagem. Shift+Enter: nova linha. Ctrl+N ou Cmd+N: nova conversa. Ctrl+B: abrir/fechar sidebar. Esc: fechar modais.' },
      { q: 'O que e o tema claro/escuro?', a: 'No header existe um toggle de tema. O modo escuro e o padrao. O modo claro inverte as cores para uso em ambientes com muita luz. A preferencia e salva no navegador.' },
      { q: 'A Saori responde sobre qualquer assunto?', a: 'Nao. A Saori (assistente no canto inferior direito) e especializada em explicar funcionalidades da plataforma Athena. Para perguntas sobre dados de clientes e campanhas, use o chat principal.' },
    ],
  },
];

/* ── Componente ───────────────────────────────────── */
export default function FaqPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const toggle = useCallback((key: string) => {
    setOpenItems(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  const filtered = searchTerm.trim()
    ? FAQ.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item => item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.a.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : activeCategory !== null
      ? [FAQ[activeCategory]]
      : FAQ;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-deep, #0a0a12)',
      color: '#d0d0d0',
      fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
    }}>
      {/* ── Header ── */}
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', gap: 12,
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button onClick={() => router.push('/chat')} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '7px 14px', color: '#aaa', fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s',
        }}>
          {Icons.back} Voltar ao Chat
        </button>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11, color: 'rgba(196,30,30,0.7)', letterSpacing: '1.5px',
          textTransform: 'uppercase', fontWeight: 700,
        }}>
          Central de Ajuda
        </span>
      </header>

      {/* ── Hero ── */}
      <div style={{
        textAlign: 'center', padding: '52px 32px 36px',
        background: 'radial-gradient(ellipse at 50% -20%, rgba(196,30,30,0.08) 0%, transparent 70%)',
      }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: '#fff',
          margin: '0 0 8px', letterSpacing: '-0.3px',
        }}>
          Central de Ajuda Athena
        </h1>
        <p style={{ fontSize: 14, color: '#777', margin: '0 0 28px' }}>
          Tudo sobre as funcionalidades da plataforma em um so lugar
        </p>

        {/* Search */}
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: '#555', display: 'flex',
          }}>{Icons.search}</div>
          <input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); if (e.target.value) setActiveCategory(null); }}
            placeholder="Buscar funcionalidade..."
            style={{
              width: '100%', padding: '12px 16px 12px 40px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, color: '#d0d0d0', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── Category Cards Grid ── */}
      {!searchTerm && (
        <div style={{
          maxWidth: 800, margin: '0 auto', padding: '0 24px 32px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
        }}>
          {FAQ.map((cat, i) => (
            <button key={i} onClick={() => setActiveCategory(activeCategory === i ? null : i)} style={{
              background: activeCategory === i
                ? `${cat.accent}15`
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${activeCategory === i ? `${cat.accent}40` : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10, padding: '14px 12px',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{ color: cat.accent, display: 'flex' }}>{cat.icon}</span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: activeCategory === i ? '#fff' : '#bbb',
              }}>{cat.title}</span>
              <span style={{ fontSize: 10, color: '#555' }}>
                {cat.items.length} topicos
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Accordion Content ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 80px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
            Nenhum resultado para &ldquo;{searchTerm}&rdquo;
          </div>
        )}

        {filtered.map((cat, ci) => {
          const catIdx = FAQ.indexOf(cat);
          return (
            <div key={ci} style={{ marginBottom: 28 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 10, paddingLeft: 2,
              }}>
                <span style={{ color: cat.accent, display: 'flex' }}>{cat.icon}</span>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#ccc', margin: 0 }}>
                  {cat.title}
                </h2>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 10, overflow: 'hidden',
              }}>
                {cat.items.map((item, ii) => {
                  const key = `${catIdx}-${ii}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div key={ii} style={{
                      borderBottom: ii < cat.items.length - 1
                        ? '1px solid rgba(255,255,255,0.03)'
                        : 'none',
                    }}>
                      <button onClick={() => toggle(key)} style={{
                        width: '100%', textAlign: 'left',
                        padding: '14px 16px',
                        background: isOpen ? `${cat.accent}08` : 'transparent',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        color: isOpen ? '#eee' : '#aaa',
                        fontSize: 13, fontWeight: isOpen ? 600 : 400,
                        transition: 'all 0.15s', gap: 12,
                      }}>
                        <span>{item.q}</span>
                        <span style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                          transition: 'transform 0.2s', flexShrink: 0,
                          color: '#555', display: 'flex',
                        }}>{Icons.chevron}</span>
                      </button>
                      {isOpen && (
                        <div style={{
                          padding: '0 16px 14px',
                          fontSize: 13, lineHeight: 1.7, color: '#888',
                          animation: 'faqFade 0.15s ease',
                        }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <div style={{
          textAlign: 'center', padding: '36px 20px', marginTop: 32,
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 14,
        }}>
          <p style={{ fontSize: 14, color: '#999', margin: '0 0 14px' }}>
            Nao encontrou o que procura?
          </p>
          <button onClick={() => router.push('/chat')} style={{
            background: '#C41E1E', color: '#fff', border: 'none',
            borderRadius: 10, padding: '11px 24px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}>
            Pergunte à Saori no Chat
          </button>
        </div>
      </div>

      <style>{`
        @keyframes faqFade {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
