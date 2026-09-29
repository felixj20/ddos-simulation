import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { THEME_SCRIPT } from './lib/theme';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DDoS Defense Simulator',
  description: 'Play the attacker: send traffic through a firewall, a load balancer and a rate limiter, and discover why DDoS protection needs several layers.',
  metadataBase: new URL('http://localhost:3000'),
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'DDoS Defense Simulator',
    description: 'Level-based network defense lab',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DDoS Defense Simulator',
    description: 'Level-based network defense lab',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a18' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
