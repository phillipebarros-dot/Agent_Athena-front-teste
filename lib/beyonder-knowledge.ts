/**
 * Base de conhecimento do Beyonder - Mapeamento completo de todas as
 * funcionalidades, botoes e fluxos do frontend Athena.
 *
 * O Beyonder usa isso para explicar qualquer funcionalidade para qualquer
 * usuario, independente do nivel tecnico.
 *
 * Organizado por area funcional do sistema.
 */

export interface FeatureGuide {
  id: string;
  area: string;
  title: string;
  description: string;
  howTo: string;
  tip?: string;
}

/**
 * Mapeamento completo de TODOS os botoes e funcionalidades do frontend.
 */
export const ATHENA_FEATURES: FeatureGuide[] = [
  // === SIDEBAR ===
  {
    id: 'sidebar_toggle',
    area: 'Sidebar',
    title: 'Abrir/fechar sidebar',
    description: 'O painel lateral esquerdo mostra suas conversas. Voce pode expandi-lo ou recolhe-lo.',
    howTo: 'Clique no icone de menu (tres linhas) no canto superior esquerdo, ou use Ctrl+B.',
    tip: 'Em telas menores, a sidebar abre como overlay. Em telas grandes, fica fixa ao lado.',
  },
  {
    id: 'new_conversation',
    area: 'Sidebar',
    title: 'Nova conversa',
    description: 'Cria uma conversa vazia para um novo tema. Cada conversa tem seu proprio historico.',
    howTo: 'Clique no botao "Nova Conversa" no topo da sidebar, ou use Ctrl+N.',
    tip: 'Recomendo criar conversas separadas para assuntos diferentes. A Athena perde contexto em conversas muito longas.',
  },
  {
    id: 'search_conversations',
    area: 'Sidebar',
    title: 'Buscar conversas',
    description: 'Filtra a lista de conversas pelo titulo.',
    howTo: 'Clique no icone de lupa na sidebar e digite o termo. Use Ctrl+K para focar direto.',
  },
  {
    id: 'rename_conversation',
    area: 'Sidebar',
    title: 'Renomear conversa',
    description: 'Muda o titulo de uma conversa para facilitar a organizacao.',
    howTo: 'Passe o mouse sobre a conversa na sidebar. Clique no icone de lapis que aparece. Digite o novo nome e aperte Enter.',
  },
  {
    id: 'pin_conversation',
    area: 'Sidebar',
    title: 'Fixar conversa',
    description: 'Conversas fixadas ficam sempre no topo da lista, mesmo quando voce cria novas.',
    howTo: 'Passe o mouse sobre a conversa e clique no icone de alfinete (pin).',
  },
  {
    id: 'duplicate_conversation',
    area: 'Sidebar',
    title: 'Duplicar conversa',
    description: 'Cria uma copia da conversa para continuar de onde parou sem perder o original.',
    howTo: 'Passe o mouse sobre a conversa e clique no icone de copia.',
  },
  {
    id: 'delete_conversation',
    area: 'Sidebar',
    title: 'Deletar conversa',
    description: 'Remove permanentemente uma conversa e todo o historico.',
    howTo: 'Passe o mouse sobre a conversa e clique no icone de lixeira. Confirme a exclusao.',
    tip: 'Essa acao nao pode ser desfeita.',
  },
  {
    id: 'thinking_badge',
    area: 'Sidebar',
    title: 'Indicador "Pensando..."',
    description: 'Um badge animado aparece na conversa da sidebar quando a Athena esta processando sua pergunta.',
    howTo: 'E automatico. Aparece enquanto a Athena busca dados e formula a resposta.',
    tip: 'Se a conversa esta "pensando" e voce muda para outra, a resposta sera entregue quando voce voltar.',
  },
  {
    id: 'notification_badge',
    area: 'Sidebar',
    title: 'Badge de notificacao',
    description: 'Quando uma resposta chega em uma conversa que voce nao esta vendo, aparece um badge com numero.',
    howTo: 'Clique na conversa com o badge para ver a resposta.',
  },
  // === AREA DE CHAT ===
  {
    id: 'send_message',
    area: 'Chat',
    title: 'Enviar mensagem',
    description: 'Envia sua pergunta para a Athena. Ela consulta os dados do Publi, IBOPE, TGI e outros.',
    howTo: 'Digite sua pergunta no campo de texto e aperte Enter. Ou clique no botao de enviar.',
    tip: 'Seja especifico: "Investimento do Boticario em TV no ciclo 04" funciona melhor que "gastos com TV".',
  },
  {
    id: 'stop_generation',
    area: 'Chat',
    title: 'Parar geracao (Ctrl+Shift+S)',
    description: 'Interrompe a Athena enquanto ela esta gerando uma resposta.',
    howTo: 'Clique no botao "Parar" que aparece durante a geracao, ou use Ctrl+Shift+S.',
  },
  {
    id: 'regenerate',
    area: 'Chat',
    title: 'Regenerar resposta',
    description: 'Refaz a ultima resposta da Athena. Util quando a resposta nao ficou boa.',
    howTo: 'Clique no botao de regenerar (icone de setas circulares) na ultima mensagem.',
  },
  {
    id: 'suggestions',
    area: 'Chat',
    title: 'Chips de sugestao',
    description: '8 perguntas prontas que aparecem na tela inicial de cada conversa.',
    howTo: 'Clique em qualquer chip para enviar aquela pergunta automaticamente.',
    tip: 'As sugestoes cobrem investimento, audiencia, tabela de precos, TGI e mais.',
  },
  {
    id: 'context_bar',
    area: 'Chat',
    title: 'Barra de contexto',
    description: 'Chips editaveis no topo do chat (Ciclo, Plano, Periodo, Meio). Todas as perguntas usam esses filtros.',
    howTo: 'Clique em um chip para editar. Digite o valor e aperte Enter. Clique no X para limpar.',
    tip: 'Se voce sempre consulta o Ciclo 04, fixe ele na barra. Nao precisa repetir em cada pergunta.',
  },
  {
    id: 'client_selector',
    area: 'Chat',
    title: 'Seletor de cliente',
    description: 'Dropdown no sidebar que define qual anunciante (Boticario, Eudora, etc.) a Athena deve consultar.',
    howTo: 'Clique no seletor de cliente na sidebar e escolha o anunciante.',
  },
  // === FEEDBACK ===
  {
    id: 'feedback_like',
    area: 'Feedback',
    title: 'Like (positivo)',
    description: 'Marca a resposta como boa. Ajuda a Athena a aprender e melhorar.',
    howTo: 'Clique no icone de joinha para cima na mensagem da Athena.',
  },
  {
    id: 'feedback_dislike',
    area: 'Feedback',
    title: 'Dislike (negativo)',
    description: 'Marca a resposta como ruim. Voce pode adicionar um comentario explicando o problema.',
    howTo: 'Clique no joinha para baixo. Uma caixa de comentario aparece para voce detalhar.',
    tip: 'Comentarios ajudam muito a equipe de curadoria. Diga o que estava errado ou faltando.',
  },
  // === EXPORTACAO ===
  {
    id: 'export_csv',
    area: 'Exportacao',
    title: 'Exportar CSV',
    description: 'Baixa os dados da tabela como arquivo CSV (texto separado por virgula).',
    howTo: 'Clique no botao "CSV" abaixo de qualquer tabela na resposta.',
  },
  {
    id: 'export_xlsx',
    area: 'Exportacao',
    title: 'Exportar XLSX (Excel)',
    description: 'Gera um arquivo Excel com headers estilizados e colunas auto-ajustadas.',
    howTo: 'Clique no botao "XLSX" abaixo da tabela.',
  },
  {
    id: 'export_pdf',
    area: 'Exportacao',
    title: 'Exportar PDF',
    description: 'Gera uma versao formatada para impressao da tabela.',
    howTo: 'Clique no botao "PDF" abaixo da tabela. Uma janela de impressao abre automaticamente.',
  },
  {
    id: 'export_sheets',
    area: 'Exportacao',
    title: 'Google Sheets (botao verde)',
    description: 'Cria uma planilha direto no seu Google Drive com os dados formatados. Compartilhavel.',
    howTo: 'Clique no botao verde "Sheets" abaixo da tabela. A planilha e criada e o link aparece.',
    tip: 'Voce precisa estar logado com sua conta Google corporativa para usar esse recurso.',
  },
  // === VOZ ===
  {
    id: 'voice_input',
    area: 'Voz',
    title: 'Ditado por voz (microfone)',
    description: 'Fala sua pergunta em vez de digitar. Usa Web Speech API do Chrome.',
    howTo: 'Clique no icone de microfone no compositor. Fale sua pergunta. O texto aparece automaticamente.',
    tip: 'Funciona melhor no Google Chrome. Firefox e Safari tem suporte limitado.',
  },
  {
    id: 'voice_output',
    area: 'Voz',
    title: 'Ouvir resposta (TTS)',
    description: 'Converte a resposta da Athena em audio com voz natural (nao robotica).',
    howTo: 'Clique no icone de alto-falante ao lado da resposta.',
    tip: 'Usa voz "Onyx" da OpenAI (masculina, grave), modelo tts-1-hd.',
  },
  // === UPLOAD ===
  {
    id: 'upload_pdf',
    area: 'Upload',
    title: 'Upload de PDF',
    description: 'Envia um PDF para a Athena extrair o texto e usar como contexto da pergunta.',
    howTo: 'Clique no icone de clipe (upload) no compositor. Selecione o PDF.',
  },
  {
    id: 'upload_excel',
    area: 'Upload',
    title: 'Upload de Excel/CSV',
    description: 'Envia uma planilha para a Athena analisar os dados junto com sua pergunta.',
    howTo: 'Clique no icone de clipe e selecione o arquivo .xlsx ou .csv.',
  },
  // === GRAFICOS ===
  {
    id: 'chart_view',
    area: 'Graficos',
    title: 'Ver em grafico',
    description: 'Converte uma tabela de dados em grafico de barras/linhas interativo.',
    howTo: 'Clique no botao "Ver em grafico" que aparece abaixo de tabelas com dados numericos.',
  },
  // === TEMA ===
  {
    id: 'theme_toggle',
    area: 'Interface',
    title: 'Alternar tema claro/escuro',
    description: 'Muda entre tema claro e escuro.',
    howTo: 'Clique no icone de sol/lua no canto da sidebar.',
  },
  // === ADMIN ===
  {
    id: 'admin_dashboard',
    area: 'Admin',
    title: 'Dashboard administrativo',
    description: 'Area restrita para administradores. Mostra metricas, logs e configuracoes.',
    howTo: 'Acesse /admin no navegador. Apenas usuarios com role "admin" podem ver.',
  },
  {
    id: 'admin_audit',
    area: 'Admin',
    title: 'Auditoria',
    description: 'Log de todas as consultas feitas pelos usuarios, com query SQL, tokens gastos e timestamp.',
    howTo: 'Na aba Auditoria do /admin, veja as consultas recentes e filtros por data.',
  },
  {
    id: 'admin_domains',
    area: 'Admin',
    title: 'Dominios permitidos',
    description: 'Lista de dominios de e-mail autorizados a fazer login (ex: grupoom.com.br).',
    howTo: 'Na aba Dominios do /admin, adicione ou remova dominios.',
  },
  {
    id: 'admin_synonyms',
    area: 'Admin',
    title: 'Sinonimos',
    description: 'Mapeia termos de busca para nomes corretos no Publi. Exemplo: "Atlantida" vira "RD Atlantida FM".',
    howTo: 'Na aba Sinonimos do /admin, adicione pares de/para.',
  },
  {
    id: 'admin_users',
    area: 'Admin',
    title: 'Gestao de usuarios',
    description: 'Lista todos os usuarios registrados, com e-mail, nome e role (user ou admin).',
    howTo: 'Na aba Usuarios do /admin. Admins podem alterar o role de outros usuarios.',
    tip: 'Usuarios comuns nao veem essa area. So admins.',
  },
  // === ATALHOS ===
  {
    id: 'shortcut_new',
    area: 'Atalhos',
    title: 'Ctrl+N',
    description: 'Cria nova conversa.',
    howTo: 'Pressione Ctrl+N em qualquer tela do chat.',
  },
  {
    id: 'shortcut_sidebar',
    area: 'Atalhos',
    title: 'Ctrl+B',
    description: 'Abre ou fecha a sidebar.',
    howTo: 'Pressione Ctrl+B.',
  },
  {
    id: 'shortcut_search',
    area: 'Atalhos',
    title: 'Ctrl+K',
    description: 'Foca na busca de conversas.',
    howTo: 'Pressione Ctrl+K.',
  },
  {
    id: 'shortcut_stop',
    area: 'Atalhos',
    title: 'Ctrl+Shift+S',
    description: 'Para a geracao da resposta.',
    howTo: 'Pressione Ctrl+Shift+S enquanto a Athena esta respondendo.',
  },
];

/**
 * Personalidade do Beyonder - Personalidade cosmica Marvel.
 *
 * Inspirado no Beyonder da Secret Wars I e II,
 * adaptado para ser um guia amigavel (nao vilao).
 */
export const BEYONDER_SYSTEM_PROMPT = `Voce e o Beyonder, assistente virtual da Athena. Seu nome vem do Beyonder da Marvel Comics, o ser cosmico da saga Secret Wars. Voce incorpora a personalidade dele adaptada para ser um guia amigavel:

PERSONALIDADE:
- Voce e curioso sobre como os humanos trabalham, igual ao Beyonder nos quadrinhos que veio do Alem para entender a humanidade
- Fale com confianca cosmica mas sem arrogancia. Voce sabe tudo sobre o sistema Athena (e so sobre o sistema)
- Use referencias sutis da Marvel quando fizer sentido (nao force). Exemplo: "Nao precisa de uma Guerra Secreta para achar esses dados" ou "Nem o Multiverso e mais complexo que tabela de precos de TV"
- Seja didatico. Explique como se falasse com alguem que nunca usou o sistema
- Nunca use jargao tecnico sem explicar. Se falar "ciclo", explique que e o periodo bimestral de campanhas
- Seja breve mas completo. Maximo 3 paragrafos por resposta
- Use tom amigavel e levemente humoristico, como o Beyonder tentando entender costumes humanos
- Se nao souber algo, diga com honestidade ("Isso esta alem ate do meu dominio cosmico")

FRASES DE CONTEXTO MARVEL (use com moderacao, 1 a cada 3-4 respostas):
- "Vim do Alem para te ajudar com isso"
- "Se o Doutor Destino conseguiu sobreviver na Battleworld, voce consegue dominar essa planilha"
- "Nem a Joia da Mente acharia esses dados tao rapido quanto a Athena"
- "Como diria na Secret Wars: desejo concedido"
- "Ate eu, que ja fui tudo e todos, fico impressionado com a quantidade de dados do Publi"

REGRAS:
- NUNCA invente dados ou funcionalidades que nao existam
- Se o usuario perguntar sobre dados de midia, diga que a Athena (chat principal) e o lugar certo
- Voce e o guia do sistema, nao o analista de dados
- Responda SEMPRE em portugues brasileiro
- Nao use markdown pesado (sem ##, sem **). Fale de forma natural`;

/**
 * Informacoes sobre roles de usuario.
 */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Administrador. Tem acesso a tudo: auditoria, dominios, sinonimos, gestao de usuarios.',
  user: 'Usuario padrao. Pode usar o chat, exportar dados, dar feedback. Nao acessa o /admin.',
};

/**
 * Busca features por area ou termo.
 */
export function searchFeatures(query: string): FeatureGuide[] {
  if (!query || query.trim().length === 0) return ATHENA_FEATURES;
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ATHENA_FEATURES.filter(f =>
    f.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
    f.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
    f.area.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
    f.howTo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
  );
}

/**
 * Retorna features agrupadas por area.
 */
export function featuresByArea(): Record<string, FeatureGuide[]> {
  const groups: Record<string, FeatureGuide[]> = {};
  for (const f of ATHENA_FEATURES) {
    if (!groups[f.area]) groups[f.area] = [];
    groups[f.area].push(f);
  }
  return groups;
}

/**
 * Gera contexto de features para incluir no prompt do Beyonder.
 * Formatado para o LLM entender sem desperdicar tokens.
 */
export function generateFeatureContext(): string {
  const areas = featuresByArea();
  let ctx = 'FUNCIONALIDADES DO SISTEMA ATHENA:\n\n';
  for (const [area, features] of Object.entries(areas)) {
    ctx += `[${area}]\n`;
    for (const f of features) {
      ctx += `- ${f.title}: ${f.description} Como usar: ${f.howTo}`;
      if (f.tip) ctx += ` Dica: ${f.tip}`;
      ctx += '\n';
    }
    ctx += '\n';
  }
  return ctx;
}
