import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kovax - Multi-tenant SaaS Platform',
  description: 'Privacy-first, compliance-grade multi-tenant platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
