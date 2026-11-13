import type { Metadata } from 'next';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="et" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <SimBanner />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
