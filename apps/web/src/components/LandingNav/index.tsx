'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button/Button';
import { Menu, X } from 'lucide-react';
import styles from './LandingNav.module.css';

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.navBar}>
        <Link href="/" className={styles.logo}>
          AI Standup
        </Link>

        {/* Desktop links */}
        <div className={styles.desktopLinks}>
          <Link href="#features" className={styles.link}>Features</Link>
          <Link href="#how-it-works" className={styles.link}>How it works</Link>
          <Link href="#pricing" className={styles.link}>Pricing</Link>
          <Link href="/login" className={styles.link}>Log in</Link>
          <Link href="/register">
            <Button variant="primary">Get started</Button>
          </Link>
        </div>

        {/* Mobile toggle button */}
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className={styles.mobileDrawer}>
          <Link 
            href="#features" 
            className={styles.mobileLink}
            onClick={() => setIsOpen(false)}
          >
            Features
          </Link>
          <Link 
            href="#how-it-works" 
            className={styles.mobileLink}
            onClick={() => setIsOpen(false)}
          >
            How it works
          </Link>
          <Link 
            href="#pricing" 
            className={styles.mobileLink}
            onClick={() => setIsOpen(false)}
          >
            Pricing
          </Link>
          <Link 
            href="/login" 
            className={styles.mobileLink}
            onClick={() => setIsOpen(false)}
          >
            Log in
          </Link>
          <div className={styles.mobileCta}>
            <Link href="/register" onClick={() => setIsOpen(false)}>
              <Button variant="primary" fullWidth>Get started</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
