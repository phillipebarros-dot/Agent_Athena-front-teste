import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Athena — OpusMúltipla',
    short_name: 'Athena',
    description: 'Assistente de mídia inteligente da OpusMúltipla. Consulta dados de investimento, audiência, TGI e mais.',
    start_url: '/chat',
    display: 'standalone',
    background_color: '#0C0C14',
    theme_color: '#0C0C14',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/athena-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
    prefer_related_applications: false,
  };
}
