import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

export const metadata: Metadata = {
  title: {
    default: 'AI Standup | Automate Your Daily Updates',
    template: '%s | AI Standup',
  },
  description: 'AI-powered async team standups that replace Zoom meetings. Team members drop quick async updates, and our AI summarizes progress, highlights blockers, and delivers a daily digest.',
  icons: {
    icon: '/icon.svg',
  },
  metadataBase: new URL('https://aistandup.app'),
  openGraph: {
    title: 'AI Standup | Automate Your Daily Updates',
    description: 'Replace boring Zoom meetings. AI-powered async standups for modern teams.',
    url: 'https://aistandup.app',
    siteName: 'AI Standup',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'AI Standup | Automate Your Daily Updates',
    description: 'Replace boring Zoom meetings. AI-powered async standups for modern teams.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
