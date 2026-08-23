import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glow = false, style }) => {
  return (
    <div className={`${styles.card} ${glow ? styles.glow : ''} ${className}`} style={style}>
      {children}
    </div>
  );
};
