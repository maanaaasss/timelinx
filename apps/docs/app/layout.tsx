import './global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
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
    url: 'https://docs.timelinx.dev',
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
  metadataBase: new URL('https://docs.timelinx.dev'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
