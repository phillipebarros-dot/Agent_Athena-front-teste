import type { Metadata } from 'next';
import { Raleway, Oswald, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const raleway = Raleway({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${raleway.variable} ${oswald.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
