import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWAInstall from '@/components/layout/PWAInstall';
import NavigationProgress from '@/components/layout/NavigationProgress';
import { AuthProvider } from '@/contexts/AuthContext';
import { getInitialAuth } from '@/lib/supabase/initial-auth';

export const metadata: Metadata = {
  title: 'Receptenboek',
  description: 'Jouw persoonlijk receptenplatform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Receptenboek',
  },
  openGraph: {
    title: 'Receptenboek',
    description: 'Jouw persoonlijk receptenplatform',
    type: 'website',
    locale: 'nl_NL',
    siteName: 'Receptenboek',
  },
  twitter: {
    card: 'summary',
    title: 'Receptenboek',
    description: 'Jouw persoonlijk receptenplatform',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Resolve the user server-side so AuthProvider knows it on first paint —
  // no client-side getSession() round trip blocking the cold open.
  const { user, profile } = await getInitialAuth();
  return (
    <html lang="nl">
      <head>
        {/* Warm the TLS connection to Supabase before the first auth call.
            Saves ~200-400ms on mobile cold opens where the handshake would
            otherwise block the initial rest/v1 request. */}
        {supabaseUrl && <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />}
        {supabaseUrl && <link rel="dns-prefetch" href={supabaseUrl} />}
      </head>
      <body className="font-sans antialiased">
        <AuthProvider initialUser={user} initialProfile={profile}>
          <NavigationProgress />
          {children}
          <PWAInstall />
        </AuthProvider>
      </body>
    </html>
  );
}
