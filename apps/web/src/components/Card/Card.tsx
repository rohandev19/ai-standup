import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  interactive?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  interactive = false,
  style,
  onClick,
}) => {
  const isInteractive = interactive || Boolean(onClick);
  return (
    <div
      className={`${styles.card} ${glow ? styles.glow : ''} ${isInteractive ? styles.interactive : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
