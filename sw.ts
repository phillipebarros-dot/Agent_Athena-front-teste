import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// Filtra o defaultCache para NÃO interceptar URLs externas (Google, APIs, etc.)
// Só cacheia assets estáticos do nosso próprio domínio.
const safeCache = defaultCache.filter((entry) => {
  const urlPattern = (entry as any).urlPattern;
  // Remove regras que capturam URLs externas (cross-origin)
  if (urlPattern && typeof urlPattern === 'object' && urlPattern.hostname !== undefined) {
    return false; // remove cross-origin rules
  }
  return true;
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false, // Desabilitado para evitar race conditions com CSP
  runtimeCaching: safeCache,
});

serwist.addEventListeners();
