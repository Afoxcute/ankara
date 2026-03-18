import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationCenter } from './NotificationCenter';

export const NotificationButton: React.FC = () => {
  const { notifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.length;
  const hasUnread = unreadCount > 0;

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        className={`notification-button ${hasUnread ? 'has-notifications' : ''}`}
        onClick={toggleNotifications}
        aria-label={`Notifications ${hasUnread ? `(${unreadCount} unread)` : ''}`}
      >
        <span className="notification-icon">🔔</span>
        {hasUnread && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <NotificationCenter />
        </>
      )}
    </>
  );
};