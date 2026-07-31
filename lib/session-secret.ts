import 'server-only';
/** Lê em tempo de execução — NUNCA cachear como const em nível de módulo,
 *  porque `next build` roda dentro do Docker onde a env var não existe. */
export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || '';
}
