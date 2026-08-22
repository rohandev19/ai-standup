import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Standup | Automate Your Daily Updates',
  description: 'AI-powered async team standups that replace Zoom meetings.',
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
