/**
 * Config de servidor, lê SÓ de variáveis de ambiente do servidor.
 * NADA aqui pode ter prefixo NEXT_PUBLIC_ (isso vazaria para o navegador).
 * Importar este módulo apenas em route handlers / server components.
 */
import 'server-only';

export const BACKEND_URL = process.env.ATHENA_BACKEND_URL || '';
export const BACKEND_TOKEN = process.env.ATHENA_BACKEND_TOKEN || '';
export const SESSION_SECRET = process.env.SESSION_SECRET || '';
export const DEV_LOGIN = process.env.ATHENA_DEV_LOGIN === 'true';

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ||
  'andrei@grupoom.com.br,phillipe.barros@grupoom.com.br,camilo.ferreira@grupoom.com.br,gabriel.oliveira@grupoom.com.br')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || 'grupoom.com.br,opusmultipla.com.br')
  .split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

export const RATE_LIMIT_PER_MIN = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '30', 10);

export const isAdmin = (email?: string | null) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());
export const domainAllowed = (email?: string | null) =>
  !!email && ALLOWED_DOMAINS.some((d) => email.toLowerCase().endsWith('@' + d));
