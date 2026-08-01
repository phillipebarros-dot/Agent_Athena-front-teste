import withSerwistInit from '@serwist/next';

/** @type {import('next').NextConfig} */

// CSP agora é gerenciado pelo middleware.ts com nonces por request.
// Outros security headers que nao precisam de nonce ficam aqui como fallback.
const securityHeaders = [
  // CSP removido — middleware.ts gera com nonce
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',            // imagem Docker enxuta para Cloud Run
  productionBrowserSourceMaps: false, // não expõe o .tsx no DevTools
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: 'sw.ts',
  swDest: 'public/sw.js',
});

export default withSerwist(nextConfig);
