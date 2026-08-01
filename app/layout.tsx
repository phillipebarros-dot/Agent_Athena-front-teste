import type { Metadata } from 'next';
import { Inter, Oswald, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Athena, OpusMúltipla',
  description: 'Assistente de mídia da OpusMúltipla',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Athena',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#141312',
};

import { cookies } from 'next/headers';
import { ThemeProvider } from '@/lib/theme';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('athena_theme')?.value === 'light' ? 'light' : '';
  const isLight = theme === 'light';

  return (
    <html lang="pt-BR" className={`${inter.variable} ${oswald.variable} ${jetbrainsMono.variable} ${theme}`}>
      <head />
      <body>
        <ThemeProvider defaultLight={isLight}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
