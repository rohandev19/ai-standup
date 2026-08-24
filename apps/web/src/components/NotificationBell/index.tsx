'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import styles from './NotificationBell.module.css';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadataJson: Record<string, unknown>;
};

export default function NotificationBell({
  initialCount = 0,
}: {
  initialCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreadCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api('/users/me/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: Notification) => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api(`/users/me/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api('/users/me/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={styles.notifBtn}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.notifBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3 className={styles.title}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={styles.markAllBtn}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className={styles.list}>
            {isLoading && notifications.length === 0 ? (
              <div className={styles.loadingState}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${styles.item} ${
                      !notification.isRead ? styles.itemUnread : ''
                    }`}
                  >
                    <div className={styles.itemHeader}>
                      <p className={`${styles.itemTitle} ${
                        !notification.isRead ? styles.itemTitleUnread : ''
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className={styles.markReadBtn}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                    <p className={styles.itemBody}>
                      {notification.body}
                    </p>
                    <p className={styles.itemTime}>
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.footer}>
            <span className={styles.footerText}>
              Notifications are kept for 30 days
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
