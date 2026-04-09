import type { Metadata, Viewport } from 'next';
import './globals.css';
import dynamic from 'next/dynamic';

const PWAInstall = dynamic(() => import('@/components/layout/PWAInstall'), { ssr: false });

export const metadata: Metadata = {
  title: 'Receptenboek',
  description: 'Jouw persoonlijk receptenplatform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Receptenboek',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#16653a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="font-sans antialiased">
        {children}
        <PWAInstall />
      </body>
    </html>
  );
}
