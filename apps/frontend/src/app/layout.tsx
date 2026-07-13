import type { Metadata } from 'next';

import { UiProviders } from '@/shared/providers/ui-providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Orivex',
  description: 'Orivex healthcare platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <UiProviders>{children}</UiProviders>
      </body>
    </html>
  );
}
