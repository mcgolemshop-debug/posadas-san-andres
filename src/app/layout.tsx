import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

export const metadata: Metadata = {
  title: {
    default: 'Posadas San Andrés — Chichiriviche, Venezuela',
    template: '%s · Posadas San Andrés',
  },
  description:
    'Reserva en San Andrés Confort o San Andrés Beach: dos posadas frente al mar en Chichiriviche, estado Falcón. Apartamentos individuales o casa completa.',
  openGraph: {
    title: 'Posadas San Andrés',
    description: 'Dos posadas frente al mar en Chichiriviche, Venezuela.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
