import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Orivex',
  description: 'Orivex healthcare platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
