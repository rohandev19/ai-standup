'use client';

import { useState } from 'react';
import styles from './GoogleSignInButton.module.css';

interface GoogleSignInButtonProps {
  label?: string;
  showDivider?: boolean;
}

export function GoogleSignInButton({
  label = 'Continue with Google',
  showDivider = true,
}: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleLogin = () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    // Redirect through Next.js proxy rewrite to NestJS GET /auth/google
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/api/auth/google';
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isRedirecting}
        className={styles.googleBtn}
        aria-label={label}
        style={isRedirecting ? { opacity: 0.7, cursor: 'wait' } : undefined}
      >
        <svg
          className={styles.googleIcon}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.13C3.26 21.31 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.63H1.27C.46 8.24 0 10.06 0 12s.46 3.76 1.27 5.37l4-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.69 1.27 6.63l4 3.13c.95-2.85 3.6-4.96 6.73-4.96z"
          />
        </svg>
        <span>{isRedirecting ? 'Connecting to Google...' : label}</span>
      </button>

      {showDivider && (
        <div className={styles.authDivider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>or continue with email</span>
          <div className={styles.dividerLine} />
        </div>
      )}
    </>
  );
}
