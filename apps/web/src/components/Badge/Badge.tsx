import React from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  icon,
  className = '',
  style,
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className}`} style={style}>
      {icon ? icon : dot && <span className={styles.dot} />}
      {children}
    </span>
  );
};
