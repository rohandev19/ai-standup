'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import styles from './LandingNav.module.css';

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className={styles.navFixedWrapper}>
      <div className={styles.navContainer}>
        {/* Left Inverted Concave Wing (matching landing page dark tone) */}
        <svg
          className={styles.wingLeft}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M 0 0 A 24 24 0 0 1 24 24 V 0 H 0 Z" fill="#0f1629" />
          <path d="M 0 0 A 24 24 0 0 1 24 24" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" fill="none" />
        </svg>

        {/* Center Hanging Dark Tab */}
        <nav className={styles.navBody} aria-label="Main navigation">
          {/* Left Navigation Links without down arrow */}
          <div className={styles.leftNav}>
            <Link href="#features" className={styles.navLink}>
              Features
            </Link>
            <Link href="#how-it-works" className={styles.navLink}>
              How it works
            </Link>
            <Link href="#pricing" className={styles.navLink}>
              Pricing
            </Link>
          </div>

          {/* Center Brand Logo (Clean text without icon) */}
          <Link href="/" className={styles.centerLogo} aria-label="AI Standup Home">
            <span className={styles.logoText}>AI Standup</span>
          </Link>

          {/* Right Action Links & Button */}
          <div className={styles.rightNav}>
            <Link href="/login" className={styles.navLink}>
              Log in
            </Link>
            <Link href="/register" className={styles.ctaButton}>
              <span>Get started</span>
              <ArrowRight size={15} className={styles.ctaArrow} />
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {/* Right Inverted Concave Wing (matching landing page dark tone) */}
        <svg
          className={styles.wingRight}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M 24 0 A 24 24 0 0 0 0 24 V 0 H 24 Z" fill="#0f1629" />
          <path d="M 24 0 A 24 24 0 0 0 0 24" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" fill="none" />
        </svg>

        {/* Mobile Drawer */}
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
              <Link
                href="/register"
                className={styles.ctaButton}
                onClick={() => setIsOpen(false)}
              >
                <span>Get started</span>
                <ArrowRight size={15} className={styles.ctaArrow} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
