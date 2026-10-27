import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Titipin POS - Modern Point of Sale & Order Management',
  description: 'Sistem Point of Sale (POS) dan Order Management modern untuk bisnis ritel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-canvas-pattern min-h-screen font-sans text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
