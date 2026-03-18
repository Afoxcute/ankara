import React from 'react';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import './NotificationCenter.css';

const NotificationItem: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const handleRemove = () => {
    onRemove(notification.id);
  };

  return (
    <div className={`notification-item notification-${notification.type}`}>
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{getIcon()}</span>
          <span className="notification-title">{notification.title}</span>
          <button 
            className="notification-close"
            onClick={handleRemove}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
        <p className="notification-message">{notification.message}</p>
        {notification.action && (
          <button 
            className="notification-action"
            onClick={notification.action.onClick}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <div className="notification-progress">
        {notification.duration && notification.duration > 0 && (
          <div 
            className="notification-progress-bar"
            style={{
              animationDuration: `${notification.duration}ms`
            }}
          />
        )}
      </div>
    </div>
  );
};

export const NotificationCenter: React.FC = () => {
  const { notifications, removeNotification, clearAllNotifications } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h3>Notifications ({notifications.length})</h3>
        {notifications.length > 1 && (
          <button 
            className="clear-all-btn"
            onClick={clearAllNotifications}
          >
            Clear All
          </button>
        )}
      </div>
      <div className="notification-list">
        {notifications
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRemove={removeNotification}
            />
          ))}
      </div>
    </div>
  );
};

// Toast notifications that appear at the top-right
export const NotificationToasts: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="notification-toasts">
      {notifications
        .filter(n => n.type !== 'info' || n.duration !== 0) // Show non-persistent info as toasts
        .slice(-3) // Show only last 3 toasts
        .map((notification) => (
          <div
            key={notification.id}
            className={`notification-toast notification-toast-${notification.type}`}
          >
            <div className="toast-content">
              <span className="toast-icon">
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
              </span>
              <div className="toast-text">
                <div className="toast-title">{notification.title}</div>
                <div className="toast-message">{notification.message}</div>
              </div>
              <button 
                className="toast-close"
                onClick={() => removeNotification(notification.id)}
              >
                ×
              </button>
            </div>
            {notification.duration && notification.duration > 0 && (
              <div 
                className="toast-progress"
                style={{
                  animationDuration: `${notification.duration}ms`
                }}
              />
            )}
          </div>
        ))}
    </div>
  );
};