import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n/request';
import './globals.css';

export const metadata: Metadata = {
  title: 'NavStation',
  description: 'Navigation portal',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  return (
    <html lang={locale}>
      <head />
      <body className="bg-background-light text-slate-900 overflow-hidden">{children}</body>
    </html>
  );
}
