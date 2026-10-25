'use client';

import { DashboardMockup } from '@/components/DashboardMockup';

export interface ProductVideoDemoProps {
  /** Path to local video file in public folder (legacy prop) */
  videoSrc?: string;
  /** Embed URL for YouTube or Loom (legacy prop) */
  embedUrl?: string;
  /** Poster image path (legacy prop) */
  poster?: string;
  /** Auto-play when scrolled into view (legacy prop) */
  autoPlayOnScroll?: boolean;
}

export function ProductVideoDemo() {
  return <DashboardMockup />;
}
