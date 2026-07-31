/**
 * Sistema de Emocoes do Beyonder - Mapeia texto/contexto para expressoes Live2D.
 *
 * Usa analise de palavras-chave com pesos para determinar a emocao
 * mais adequada para cada resposta. O sistema e extensivel via
 * adição de novas regras.
 *
 * Expressoes disponiveis no modelo:
 *   smile    - feliz, saudacao, dado positivo
 *   angy     - erro, frustacao, dado negativo critico
 *   worried  - alerta, atraso, dado preocupante
 *   blush    - elogio, algo pessoal
 *   aww      - surpresa positiva, empatia
 *   oh       - descoberta, dado inesperado
 *   ehh      - confuso, pergunta ambigua, sem dados
 *
 * Fluxo:
 *   Texto da resposta -> analisa keywords com peso -> emocao dominante -> nome da expressao
 */

export type BeyonderEmotion = 'smile' | 'angy' | 'worried' | 'blush' | 'aww' | 'oh' | 'ehh';

interface EmotionRule {
  emotion: BeyonderEmotion;
  keywords: string[];
  weight: number;
}

/**
 * Regras de deteccao de emocao, ordenadas por prioridade.
 * Cada keyword tem um peso base. Keywords mais especificas tem peso maior.
 */
const EMOTION_RULES: EmotionRule[] = [
  // Erros e problemas (prioridade alta)
  {
    emotion: 'angy',
    keywords: [
      'erro', 'error', 'falha', 'falhou', 'nao consegui', 'impossivel',
      'invalido', 'invalida', 'problema', 'bug', 'quebrado', 'corrompido',
      'negado', 'bloqueado', 'proibido', 'unauthorized', 'forbidden',
    ],
    weight: 3,
  },

  // Preocupacao e alertas
  {
    emotion: 'worried',
    keywords: [
      'atrasado', 'atraso', 'vencido', 'vencida', 'prazo', 'urgente',
      'atencao', 'cuidado', 'alerta', 'risco', 'queda', 'caiu',
      'diminuiu', 'reduziu', 'abaixo', 'preocupante', 'critico',
      'pendente', 'pendentes', 'nao faturado', 'verificar',
    ],
    weight: 2.5,
  },

  // Sem dados / confusao
  {
    emotion: 'ehh',
    keywords: [
      'nao encontrei', 'nao encontrado', 'nenhum resultado', 'sem dados',
      'nao disponivel', 'nao existe', 'zero resultados', 'vazio',
      'poderia especificar', 'poderia detalhar', 'nao entendi',
      'ambiguo', 'qual voce quer', 'nao ficou claro', 'reformule',
    ],
    weight: 2.5,
  },

  // Surpresa / descoberta
  {
    emotion: 'oh',
    keywords: [
      'interessante', 'curioso', 'surpreendente', 'inesperado',
      'destaque', 'importante', 'significativo', 'notavel',
      'acima de', 'recorde', 'maximo', 'pico', 'maior',
      'impressionante', 'expressivo',
    ],
    weight: 2,
  },

  // Empatia / fofo
  {
    emotion: 'aww',
    keywords: [
      'obrigado', 'agradeco', 'gentil', 'ajudou', 'perfeito',
      'excelente', 'maravilhoso', 'incrivel', 'fantastico',
      'primeiro acesso', 'bem-vindo', 'boas-vindas', 'prazer',
    ],
    weight: 2,
  },

  // Envergonhado
  {
    emotion: 'blush',
    keywords: [
      'elogio', 'voce e otimo', 'adorei', 'amei', 'lindo',
      'bonito', 'sensacional', 'genial', 'brilhante',
      'muito bom', 'nota 10',
    ],
    weight: 1.5,
  },

  // Feliz (default para respostas positivas)
  {
    emotion: 'smile',
    keywords: [
      'pronto', 'aqui esta', 'encontrei', 'resultado', 'tabela',
      'total', 'soma', 'media', 'ranking', 'top', 'lista',
      'exportei', 'planilha', 'criada', 'compartilhada',
      'ola', 'bom dia', 'boa tarde', 'boa noite', 'como posso ajudar',
      'claro', 'com certeza', 'sim', 'vamos la',
    ],
    weight: 1,
  },
];

/**
 * Analisa o texto da resposta e retorna a emocao mais adequada.
 *
 * Algoritmo:
 * 1. Normaliza o texto (lowercase, remove acentos)
 * 2. Para cada regra, conta quantas keywords aparecem no texto
 * 3. Multiplica contagem pelo peso da regra
 * 4. Retorna a emocao com maior score
 * 5. Default: 'smile' se nenhuma keyword bater
 */
export function detectEmotion(text: string): BeyonderEmotion {
  if (!text || text.trim().length === 0) return 'smile';

  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos

  let bestEmotion: BeyonderEmotion = 'smile';
  let bestScore = 0;

  for (const rule of EMOTION_RULES) {
    let matchCount = 0;
    for (const keyword of rule.keywords) {
      const normalizedKeyword = keyword
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedKeyword)) {
        matchCount++;
      }
    }
    const score = matchCount * rule.weight;
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = rule.emotion;
    }
  }

  return bestEmotion;
}

/**
 * Retorna o nome do arquivo de expressao para uma emocao.
 */
export function getExpressionFile(emotion: BeyonderEmotion): string {
  const map: Record<BeyonderEmotion, string> = {
    smile: 'smile',
    angy: 'angy',
    worried: 'worried',
    blush: 'blush',
    aww: 'aww',
    oh: 'oh',
    ehh: 'ehh',
  };
  return map[emotion] || 'smile';
}

/**
 * Retorna um texto descritivo da emocao (para debug/logs).
 */
export function emotionLabel(emotion: BeyonderEmotion): string {
  const labels: Record<BeyonderEmotion, string> = {
    smile: 'Feliz',
    angy: 'Bravo',
    worried: 'Preocupado',
    blush: 'Envergonhado',
    aww: 'Fofo/Empatico',
    oh: 'Surpreso',
    ehh: 'Confuso',
  };
  return labels[emotion] || 'Neutro';
}

/**
 * Palavras de contexto de ajuda - o Beyonder usa quando esta guiando o usuario.
 */
export const BEYONDER_HELP_PHRASES: Record<string, string> = {
  export: 'Para exportar, clique nos botoes CSV, XLSX, PDF ou Sheets abaixo de qualquer tabela que eu mostrar.',
  voice: 'Clique no icone de microfone para falar comigo. Funciona melhor no Chrome.',
  newchat: 'Use Ctrl+N ou o botao Nova Conversa na sidebar para iniciar um tema novo.',
  rename: 'Passe o mouse sobre a conversa na sidebar e clique no lapis para renomear.',
  context: 'Fixe ciclo, plano ou periodo na barra de contexto no topo. Todas as perguntas vao usar esses filtros.',
  feedback: 'Clique no joinha para cima ou para baixo em qualquer resposta para me ajudar a melhorar.',
  graph: 'Quando eu mostrar uma tabela, clique em "Ver em grafico" para visualizar os dados.',
  pin: 'Fixe conversas importantes com o pin na sidebar. Elas ficam sempre no topo.',
  admin: 'A area de administracao esta em /admin. Apenas administradores podem acessar.',
  sheets: 'O botao verde Sheets cria uma planilha direto no seu Google Drive com os dados formatados.',
};
