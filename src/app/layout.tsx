import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SimBanner } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: '112Sim',
  description: 'Hädaabikõne treeningsimulatsioon',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="et">
      <body className="min-h-screen bg-bg text-fg">
        <SimBanner />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
