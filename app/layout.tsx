import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans, Sora, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { themeRootCss } from '@/lib/theme/css';
import { strings } from '@/lib/strings';
import { Providers } from '@/app/providers';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
});

// Used for numbers app-wide (money, stats, counts) — see the `.num` utility in globals.css.
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: strings.appName, template: `%s · ${strings.appName}` },
  description: strings.tagline,
  applicationName: strings.appName,
  // Installable-app hints for iOS Safari (Add to Home Screen). `default` keeps the
  // status bar opaque over the light canvas (dark icons) rather than overlaying content.
  appleWebApp: {
    capable: true,
    title: strings.appName,
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#17191c',
  width: 'device-width',
  initialScale: 1,
  // Render under the status bar / home indicator when installed (standalone).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${sora.variable} ${spaceGrotesk.variable}`}
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
