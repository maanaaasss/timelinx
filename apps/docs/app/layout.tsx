import './global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Timelinx',
    template: '%s | Timelinx',
  },
  description:
    'Browser-native timeline editor engine and UI toolkit. Build video editors, NLEs, and motion graphics tools in the browser.',
  openGraph: {
    title: 'Timelinx',
    description:
      'Browser-native timeline editor engine and UI toolkit. Build video editors, NLEs, and motion graphics tools in the browser.',
    url: 'https://timelinx-docs.vercel.app',
    siteName: 'Timelinx',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Timelinx',
    description:
      'Browser-native timeline editor engine and UI toolkit.',
  },
  metadataBase: new URL('https://timelinx-docs.vercel.app'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
