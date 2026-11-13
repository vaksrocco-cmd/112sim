import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { SimBanner } from '@/components/ui';
import './globals.css';

const sans = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: '112Sim',
  description: 'Hädaabikõne treeningsimulatsioon',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#070606' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="et" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <SimBanner />
        <main className="mx-auto flex min-h-[calc(100dvh-2.25rem)] w-full max-w-[430px] flex-col px-4 pb-6 pt-4">{children}</main>
      </body>
    </html>
  );
}
