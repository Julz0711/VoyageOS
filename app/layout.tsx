import type { Metadata, Viewport } from 'next';
import { Sora, Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';
import { themeRootCss } from '@/lib/theme/css';
import { strings } from '@/lib/strings';
import { Providers } from '@/app/providers';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: strings.appName, template: `%s · ${strings.appName}` },
  description: strings.tagline,
  applicationName: strings.appName,
  // Installable-app hints for iOS Safari (Add to Home Screen).
  appleWebApp: {
    capable: true,
    title: strings.appName,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#17191c',
  width: 'device-width',
  initialScale: 1,
  // Render under the status bar / home indicator when installed (standalone).
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${jakarta.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Inject theme tokens from config/theme.ts onto :root (server-rendered, no FOUC). */}
        <style id="vos-theme" dangerouslySetInnerHTML={{ __html: themeRootCss() }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
