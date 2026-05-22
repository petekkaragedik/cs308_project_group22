import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, error, fetchNotifications, markAsRead } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      fetchNotifications('all');
    }
  }, [dropdownOpen, fetchNotifications]);

  function toggleDropdown() {
    setDropdownOpen(!dropdownOpen);
  }

  function handleNotificationClick(notification) {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    setDropdownOpen(false);
  }

  // Get recent 5 notifications
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div style={styles.container} ref={dropdownRef}>
      <style>{`
        .notification-item-link:hover {
          background-color: var(--color-blue-hover) !important;
        }
        .notification-view-all:hover {
          background-color: var(--color-blue) !important;
        }
      `}</style>

      <button
        style={styles.iconBtn}
        aria-label="Notifications"
        onClick={toggleDropdown}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h3 style={styles.dropdownTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <span style={styles.unreadText}>{unreadCount}</span>
            )}
          </div>

          {error ? (
            <div style={styles.errorState}>
              <p style={styles.errorText}>{error}</p>
              <button
                style={styles.retryBtn}
                onClick={() => fetchNotifications('all')}
              >
                Retry
              </button>
            </div>
          ) : recentNotifications.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No notifications yet</p>
            </div>
          ) : (
            <div style={styles.notificationList}>
              {recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  to="/notifications"
                  className="notification-item-link"
                  style={{
                    ...styles.notificationItem,
                    ...(notification.read_at ? {} : styles.notificationItemUnread)
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div style={styles.notificationContent}>
                    <p style={styles.notificationTitle}>{notification.title}</p>
                    <p style={styles.notificationMessage}>{notification.message}</p>
                    <p style={styles.notificationTime}>
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read_at && <div style={styles.unreadDot} />}
                </Link>
              ))}
            </div>
          )}

          <Link
            to="/notifications"
            className="notification-view-all"
            style={styles.viewAllLink}
            onClick={() => setDropdownOpen(false)}
          >
            View All Notifications
          </Link>
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = {
  container: {
    position: 'relative',
  },
  iconBtn: {
    position: 'relative',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
    padding: 'var(--space-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity var(--transition-fast)',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    minWidth: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 360,
    maxHeight: 480,
    backgroundColor: 'var(--color-sand)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: 'var(--space-5)',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-blue)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTitle: {
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
    margin: 0,
  },
  unreadText: {
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-white)',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-full)',
  },
  emptyState: {
    padding: 'var(--space-8)',
    textAlign: 'center',
    backgroundColor: 'var(--color-blue)',
    margin: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
  },
  emptyText: {
    color: 'var(--color-charcoal-light)',
    fontSize: 'var(--text-sm)',
  },
  notificationList: {
    overflowY: 'auto',
    maxHeight: 360,
  },
  notificationItem: {
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background-color var(--transition-fast)',
    cursor: 'pointer',
  },
  notificationItemUnread: {
    backgroundColor: 'var(--color-blue)',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
    margin: '0 0 4px 0',
  },
  notificationMessage: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    margin: '0 0 4px 0',
  },
  notificationTime: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    margin: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-charcoal)',
    flexShrink: 0,
    marginTop: 6,
  },
  viewAllLink: {
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--color-border)',
    textAlign: 'center',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
    textDecoration: 'none',
    transition: 'background-color var(--transition-fast)',
    backgroundColor: 'var(--color-sand)',
    display: 'block',
  },
  errorState: {
    padding: 'var(--space-8)',
    textAlign: 'center',
    backgroundColor: 'var(--color-error)',
    margin: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    alignItems: 'center',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    margin: 0,
  },
  retryBtn: {
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-white)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'opacity var(--transition-fast)',
  },
};
