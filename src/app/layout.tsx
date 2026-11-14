import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { MotionProvider, SimBanner } from '@/components/ui';
import './globals.css';

const sans = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: '112Sim',
  description: 'Hädaabikõne treeningsimulatsioon',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#050507' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="et" className={`${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col bg-bg text-fg antialiased">
        <SimBanner />
        {/* Laiuse ja kõrguse valib iga leht ise: vt components/ui/Page.tsx. */}
        <main className="flex flex-1 flex-col">
          <MotionProvider>{children}</MotionProvider>
        </main>
      </body>
    </html>
  );
}
