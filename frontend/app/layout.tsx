import type { Metadata } from 'next';
import { Archivo, Inter, IBM_Plex_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-archivo' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono' });

export const metadata: Metadata = {
  title: 'CivicLens AI — Report and track local civic issues',
  description: 'See a problem in your neighborhood? Report it, track it, get it fixed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
