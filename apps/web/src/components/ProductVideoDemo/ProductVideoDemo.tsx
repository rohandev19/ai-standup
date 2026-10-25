'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ProductVideoDemo.module.css';
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Bot
} from 'lucide-react';

export interface ProductVideoDemoProps {
  /** Path to local video file in public folder, default '/demo.mp4' */
  videoSrc?: string;
  /** Embed URL for YouTube or Loom */
  embedUrl?: string;
  /** Poster image path */
  poster?: string;
  /** Auto-play when scrolled into view, default true */
  autoPlayOnScroll?: boolean;
}

export function ProductVideoDemo({
  videoSrc = '/demo.mp4',
  embedUrl,
  poster,
  autoPlayOnScroll = true,
}: ProductVideoDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!autoPlayOnScroll || embedUrl) return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // IntersectionObserver to trigger seamless autoplay on scroll into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                // If browser restricts or demo.mp4 not present, stay on preview mockup
              });
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [autoPlayOnScroll, embedUrl]);

  const handlePlay = () => {
    if (!videoRef.current) return;

    videoRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        // If file is missing or autoplay restricted, log for developer
        console.warn('Video playback error (ensure demo.mp4 is in apps/web/public/):', err);
      });
  };

  return (
    <div ref={containerRef} className={styles.wrapper}>
      {/* 16:9 Video Player Frame */}
      <div className={styles.videoFrame}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="AI Standup Walkthrough"
            className={styles.iframeElement}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              poster={poster}
              className={styles.videoElement}
              controls={isPlaying}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Authentic Product Dashboard Preview (visible when video is paused/pending) */}
            {!isPlaying && (
              <div className={styles.productPreviewLayer} aria-hidden="true">
                <div className={styles.previewHeader}>
                  <div className={styles.previewTeamInfo}>
                    <span className={styles.previewTeamName}>Platform Engineering</span>
                    <span className={styles.previewMeta}>Window: 09:00 - 11:00 AM</span>
                  </div>
                  <div className={styles.previewStatusBadge}>
                    <span className={styles.statusDot} /> Live
                  </div>
                </div>

                <div className={styles.previewGrid}>
                  {/* Left Column: Live Presence */}
                  <div className={styles.previewColumn}>
                    <div className={styles.columnHeading}>Team Presence (4 of 5 submitted)</div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>AC</div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberName}>Alex Chen</span>
                        <span className={styles.memberTime}>Submitted 09:14</span>
                      </div>
                      <span className={`${styles.chip} ${styles.chipSubmitted}`}>
                        <CheckCircle2 size={12} /> Submitted
                      </span>
                    </div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>SJ</div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberName}>Sara Jenkins</span>
                        <span className={styles.memberTime}>Submitted 09:42</span>
                      </div>
                      <span className={`${styles.chip} ${styles.chipSubmitted}`}>
                        <CheckCircle2 size={12} /> Submitted
                      </span>
                    </div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>DK</div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberName}>David Kim</span>
                        <span className={styles.memberTime}>Submitted 10:15</span>
                      </div>
                      <span className={`${styles.chip} ${styles.chipSubmitted}`}>
                        <CheckCircle2 size={12} /> Submitted
                      </span>
                    </div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>MV</div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberName}>Marcus Vance</span>
                        <span className={styles.memberTime}>Submitted 11:18</span>
                      </div>
                      <span className={`${styles.chip} ${styles.chipLate}`}>
                        <Clock size={12} /> Late
                      </span>
                    </div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>ER</div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberName}>Elena Rostova</span>
                        <span className={styles.memberTime}>Not submitted</span>
                      </div>
                      <span className={`${styles.chip} ${styles.chipMissed}`}>
                        <XCircle size={12} /> Missed
                      </span>
                    </div>
                  </div>

                  {/* Right Column: AI Summary & Blocker */}
                  <div className={styles.previewColumn}>
                    <div className={styles.columnHeading}>AI Daily Summary</div>

                    <div className={styles.summaryBox}>
                      <div className={styles.summaryBadge}>
                        <Bot size={13} style={{ display: 'inline', marginRight: 4 }} />
                        Claude AI Briefing
                      </div>
                      <p className={styles.summaryText}>
                        Team completed database index tuning and WebSocket event verification. Marcus and Sara finalized PR reviews for the billing module.
                      </p>

                      <div className={styles.blockerAlert}>
                        <div className={styles.blockerHeading}>
                          <AlertTriangle size={13} style={{ display: 'inline', marginRight: 4 }} />
                          High Blocker: Marcus Vance
                        </div>
                        <p className={styles.blockerText}>
                          Staging deployment paused waiting on Auth0 token expiry configuration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Play Overlay Button */}
            {!isPlaying && (
              <div className={styles.overlayShade} onClick={handlePlay}>
                <button
                  type="button"
                  className={styles.playButtonAction}
                  aria-label="Play video walkthrough"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Watch demo (30s)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
