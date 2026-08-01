import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkOnly } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// ─────────────────────────────────────────────────────────────────────────────
// Filtra o defaultCache para NÃO interceptar URLs externas (Google, APIs, etc.)
// Só cacheia assets estáticos do nosso próprio domínio.
// ─────────────────────────────────────────────────────────────────────────────
const safeCache = defaultCache.filter((entry) => {
  const urlPattern = (entry as any).urlPattern;
  if (urlPattern && typeof urlPattern === 'object' && urlPattern.hostname !== undefined) {
    return false;
  }
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRA CRÍTICA: Navigation requests (mode === 'navigate') e RSC requests
// NÃO devem ser cacheados. São server-rendered (SSR) pelo Next.js.
//
// Sem isso, o SW intercepta /login, /chat, /admin e tenta responder
// com cache (que não existe no primeiro acesso), causando:
//   "no-response: no-response :: [{url: .../login}]"
//
// NetworkOnly = passa direto pro servidor, zero cache.
// Posição: ANTES do defaultCache (Serwist processa na ordem).
// ─────────────────────────────────────────────────────────────────────────────
const runtimeCaching = [
  {
    matcher: ({ request }: { request: Request }) => {
      // Navigation (HTML pages) — sempre rede
      if (request.mode === 'navigate') return true;
      // RSC / Flight requests do Next.js App Router — sempre rede
      if (request.headers.get('RSC') === '1') return true;
      if (request.headers.get('Next-Router-State-Tree')) return true;
      return false;
    },
    handler: new NetworkOnly(),
  },
  ...safeCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
});

serwist.addEventListeners();

// ─────────────────────────────────────────────────────────────────────────────
// Força desativar navigationPreload que pode ter ficado ativo de versões
// anteriores do SW. O browser mantém a flag mesmo após atualizar o SW.
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).addEventListener('activate', (event: any) => {
  const reg = (self as any).registration;
  if (reg?.navigationPreload) {
    event.waitUntil(reg.navigationPreload.disable());
  }
});
