'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  icon: string;
  items: FaqItem[];
}

const FAQ_DATA: FaqCategory[] = [
  {
    title: 'Primeiros Passos',
    icon: '🚀',
    items: [
      {
        question: 'O que é a Athena?',
        answer: 'A Athena é uma assistente de IA conversacional especializada em publicidade e mídia. Ela responde perguntas sobre clientes, campanhas, investimentos de mídia e muito mais, usando dados reais da sua agência.',
      },
      {
        question: 'Como inicio uma conversa?',
        answer: 'Na tela principal do chat, basta digitar sua pergunta no campo de texto na parte inferior e pressionar Enter ou clicar no botão de enviar. A Athena vai processar e responder.',
      },
      {
        question: 'Como crio uma nova conversa?',
        answer: 'Clique no botão "+" no topo da sidebar esquerda. Isso abre uma conversa limpa, sem histórico anterior.',
      },
      {
        question: 'Como acesso conversas anteriores?',
        answer: 'Todas as suas conversas ficam salvas na sidebar esquerda. Clique em qualquer uma para reabrir e continuar de onde parou.',
      },
    ],
  },
  {
    title: 'Chat e Interação',
    icon: '💬',
    items: [
      {
        question: 'Como seleciono um cliente específico?',
        answer: 'Use o dropdown de seleção de cliente no topo da tela. Ao selecionar um cliente, a Athena filtra suas respostas para o contexto daquele cliente específico.',
      },
      {
        question: 'Posso enviar arquivos para a Athena?',
        answer: 'Sim! Clique no ícone de clip (📎) no compositor de mensagens. A Athena aceita PDFs, imagens, planilhas Excel e outros documentos para análise.',
      },
      {
        question: 'Como uso o microfone para ditar mensagens?',
        answer: 'Clique no ícone de microfone (🎤) no compositor. Fale sua mensagem e ela será transcrita automaticamente. Pressione novamente para parar a gravação.',
      },
      {
        question: 'Como dou feedback nas respostas?',
        answer: 'Cada resposta da Athena tem ícones de polegar para cima (👍) e para baixo (👎). Use-os para indicar se a resposta foi útil. Isso ajuda a Athena a melhorar.',
      },
      {
        question: 'O que é o botão "Parar"?',
        answer: 'Quando a Athena está gerando uma resposta longa, o botão "Parar" aparece para interromper a geração. Útil se você percebeu que a pergunta não era a certa.',
      },
    ],
  },
  {
    title: 'Beyonder (Assistente)',
    icon: '🤖',
    items: [
      {
        question: 'O que é o Beyonder?',
        answer: 'O Beyonder é o assistente de ajuda da plataforma. Ele fica no canto inferior direito e pode responder dúvidas sobre como usar a Athena. Clique nele para interagir.',
      },
      {
        question: 'O Beyonder responde sobre qualquer assunto?',
        answer: 'Não. O Beyonder é especializado em explicar as funcionalidades da plataforma Athena. Para perguntas sobre clientes e campanhas, use o chat principal.',
      },
    ],
  },
  {
    title: 'Administração',
    icon: '⚙️',
    items: [
      {
        question: 'Como configuro domínios autorizados?',
        answer: 'No menu Admin (acessível para administradores), vá em "Domínios". Adicione os domínios de email autorizados a usar a plataforma (ex: @suaempresa.com.br).',
      },
      {
        question: 'O que são sinônimos?',
        answer: 'Sinônimos permitem que a Athena entenda termos específicos da sua agência. Por exemplo, você pode configurar que "OPM" é sinônimo de "OpusMultipla".',
      },
      {
        question: 'Quem tem acesso ao painel Admin?',
        answer: 'Apenas usuários com permissão de administrador. O acesso é controlado pelo email cadastrado na configuração do sistema.',
      },
    ],
  },
  {
    title: 'Recursos Avançados',
    icon: '✨',
    items: [
      {
        question: 'A Athena pode ler respostas em voz alta?',
        answer: 'Sim! A funcionalidade de TTS (Text-to-Speech) permite que a Athena leia suas respostas. Procure o ícone de áudio nas respostas.',
      },
      {
        question: 'Posso exportar conversas?',
        answer: 'Sim. Use a opção de exportar no menu de cada conversa para baixar o histórico em formato texto.',
      },
      {
        question: 'Os dados ficam seguros?',
        answer: 'Sim. A Athena roda em infraestrutura Google Cloud com autenticação OAuth2. Seus dados são criptografados em trânsito e em repouso. Nenhum dado é compartilhado externamente.',
      },
    ],
  },
];

export default function FaqPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Filtrar por busca
  const filtered = search.trim()
    ? FAQ_DATA.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.question.toLowerCase().includes(search.toLowerCase()) ||
            item.answer.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQ_DATA;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-deep, #0a0a0f)',
      color: '#e0e0e0',
      fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
    }}>
      {/* Header */}
      <header style={{
        padding: '24px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button
          onClick={() => router.push('/chat')}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 16px',
            color: '#ccc', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Voltar ao Chat
        </button>
        <div style={{ flex: 1 }} />
        <div style={{
          fontSize: 11, color: '#666', letterSpacing: '1px',
          textTransform: 'uppercase', fontWeight: 600,
        }}>
          Central de Ajuda
        </div>
      </header>

      {/* Hero */}
      <div style={{
        textAlign: 'center', padding: '60px 40px 40px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(221,0,4,0.06) 0%, transparent 60%)',
      }}>
        <h1 style={{
          fontSize: 32, fontWeight: 700, color: '#fff',
          margin: '0 0 12px', letterSpacing: '-0.5px',
        }}>
          Como podemos ajudar?
        </h1>
        <p style={{ fontSize: 15, color: '#888', margin: '0 0 32px', maxWidth: 480, marginInline: 'auto' }}>
          Encontre respostas sobre todas as funcionalidades da plataforma Athena
        </p>

        {/* Barra de busca */}
        <div style={{
          maxWidth: 520, margin: '0 auto',
          position: 'relative',
        }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por funcionalidade, recurso ou dúvida..."
            style={{
              width: '100%', padding: '14px 20px 14px 44px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, color: '#e0e0e0', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
              transition: 'border 0.2s',
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(221,0,4,0.3)'; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: '#666',
          }}>🔍</span>
        </div>
      </div>

      {/* Categorias + Accordions */}
      <div style={{
        maxWidth: 720, margin: '0 auto', padding: '20px 24px 80px',
      }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            Nenhum resultado para &ldquo;{search}&rdquo;. Tente outra busca ou pergunte ao Beyonder!
          </div>
        )}

        {filtered.map((cat, ci) => (
          <div key={ci} style={{ marginBottom: 32 }}>
            {/* Categoria header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 12, paddingLeft: 4,
            }}>
              <span style={{ fontSize: 20 }}>{cat.icon}</span>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#ccc', margin: 0 }}>
                {cat.title}
              </h2>
              <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>
                {cat.items.length} {cat.items.length === 1 ? 'tópico' : 'tópicos'}
              </span>
            </div>

            {/* Items accordion */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              {cat.items.map((item, ii) => {
                const key = `${ci}-${ii}`;
                const isOpen = openItems.has(key);
                return (
                  <div key={ii} style={{
                    borderBottom: ii < cat.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <button
                      onClick={() => toggleItem(key)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '16px 20px',
                        background: isOpen ? 'rgba(221,0,4,0.04)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        color: isOpen ? '#fff' : '#ccc',
                        fontSize: 14, fontWeight: isOpen ? 600 : 400,
                        transition: 'all 0.2s',
                      }}
                    >
                      {item.question}
                      <span style={{
                        fontSize: 12, color: '#666',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        flexShrink: 0, marginLeft: 12,
                      }}>▼</span>
                    </button>
                    {isOpen && (
                      <div style={{
                        padding: '0 20px 16px',
                        fontSize: 13, lineHeight: 1.7, color: '#999',
                        animation: 'faqSlideDown 0.2s ease',
                      }}>
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, marginTop: 40,
        }}>
          <p style={{ fontSize: 15, color: '#bbb', margin: '0 0 12px' }}>
            Não encontrou o que procura?
          </p>
          <button
            onClick={() => router.push('/chat')}
            style={{
              background: 'var(--red, #dd0004)', color: '#fff',
              border: 'none', borderRadius: 10,
              padding: '12px 28px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Pergunte ao Beyonder no Chat
          </button>
        </div>
      </div>

      <style>{`
        @keyframes faqSlideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
