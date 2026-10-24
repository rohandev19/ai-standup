import React, { ReactNode } from 'react';
import styles from './EmptyState.module.css';
import { Button } from '../Button/Button';
import { Inbox, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  tone?: 'calm' | 'urgent';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  tone = 'calm',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const defaultIcon = tone === 'urgent' ? <AlertCircle size={32} /> : <Inbox size={32} />;
  return (
    <div className={`${styles.container} ${styles[tone]}`}>
      <div className={styles.icon}>{icon || defaultIcon}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
