import type { Metadata } from 'next';
import { LandingPageClient } from './LandingPageClient';

export const metadata: Metadata = {
  title: 'AI Standup | Async Team Standups and AI Summaries',
  description: 'Async team standups with automated AI summaries and real-time blocker detection for remote engineering teams.',
  openGraph: {
    title: 'AI Standup | Async Team Standups and AI Summaries',
    description: 'Async team standups with automated AI summaries and real-time blocker detection for remote engineering teams.',
    type: 'website',
  }
};

export default function LandingPage() {
  return <LandingPageClient />;
}
