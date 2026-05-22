import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useNotifications } from '../context/NotificationContext';

/* ─── Helpers ─────────────────────────────────────────── */

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Page ────────────────────────────────────────────── */

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchNotifications(filter);
  }, [filter, fetchNotifications, navigate]);

  const filteredNotifications = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.read_at)
    : notifications.filter(n => n.read_at);

  return (
    <>
      <style>{`
        .notif-btn:hover { opacity: 0.7; }
        .notif-filter-btn:hover { background-color: var(--color-blue); }
        .notif-item:hover { background-color: var(--color-blue); }
      `}</style>

      <Navbar />

      <div style={styles.page}>
        <header style={styles.header}>
          <p style={styles.eyebrow}>Your Updates</p>
          <h1 style={styles.title}>Notifications</h1>
        </header>

        {loading && <Message text="Loading notifications..." />}

        {!loading && notifications.length === 0 && (
          <EmptyState
            heading="No notifications yet"
            body="When your wishlisted items go on sale, you'll see notifications here."
            cta="GO TO WISHLIST"
            onCta={() => navigate('/wishlist')}
            secondaryCta="Continue shopping →"
            onSecondaryCta={() => navigate('/products')}
          />
        )}

        {!loading && notifications.length > 0 && (
          <>
            <div style={styles.controls}>
              <div style={styles.filters}>
                <button
                  className="notif-filter-btn"
                  style={{
                    ...styles.filterBtn,
                    ...(filter === 'all' ? styles.filterBtnActive : {})
                  }}
                  onClick={() => setFilter('all')}
                >
                  All ({notifications.length})
                </button>
                <button
                  className="notif-filter-btn"
                  style={{
                    ...styles.filterBtn,
                    ...(filter === 'unread' ? styles.filterBtnActive : {})
                  }}
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  className="notif-filter-btn"
                  style={{
                    ...styles.filterBtn,
                    ...(filter === 'read' ? styles.filterBtnActive : {})
                  }}
                  onClick={() => setFilter('read')}
                >
                  Read ({notifications.length - unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  className="notif-btn"
                  style={styles.markAllBtn}
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {filteredNotifications.length === 0 ? (
              <div style={styles.emptyFiltered}>
                <p>No {filter} notifications</p>
              </div>
            ) : (
              <div style={styles.list}>
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </>
  );
}

/* ─── Notification Item ───────────────────────────────── */

function NotificationItem({ notification, onMarkAsRead, onDelete }) {
  const isUnread = !notification.read_at;
  const affectedProducts = notification.affected_products || [];
  const firstProductId = affectedProducts.length > 0 ? affectedProducts[0] : null;

  return (
    <div
      className="notif-item"
      style={{
        ...styles.item,
        ...(isUnread ? styles.itemUnread : {})
      }}
    >
      <div style={styles.itemContent}>
        <div style={styles.itemHeader}>
          <div style={styles.itemTitle}>
            {notification.title}
            {isUnread && <div style={styles.unreadDot} />}
          </div>
          <button
            className="notif-btn"
            style={styles.deleteBtn}
            onClick={onDelete}
            aria-label="Delete notification"
          >
            <X size={18} />
          </button>
        </div>

        <p style={styles.itemMessage}>{notification.message}</p>

        {affectedProducts.length > 0 && firstProductId && (
          <Link
            to={`/products/${firstProductId}`}
            style={styles.viewLink}
          >
            View {affectedProducts.length === 1 ? 'Product' : `${affectedProducts.length} Products`} →
          </Link>
        )}

        <div style={styles.itemFooter}>
          <p style={styles.itemTime}>{formatTime(notification.created_at)}</p>
          {isUnread && (
            <button
              className="notif-btn"
              style={styles.markReadBtn}
              onClick={onMarkAsRead}
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state / Message ───────────────────────────── */

function EmptyState({ heading, body, cta, onCta, secondaryCta, onSecondaryCta }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIconWrap} aria-hidden="true">
        <div style={styles.emptyIconHalo} />
        <Bell
          size={42}
          strokeWidth={1.5}
          style={styles.emptyIcon}
        />
      </div>
      <h2 style={styles.emptyHeading}>{heading}</h2>
      <p style={styles.emptyBody}>{body}</p>
      <div style={styles.emptyActions}>
        <button style={styles.button} onClick={onCta}>
          {cta}
        </button>
        {secondaryCta && (
          <button
            style={styles.linkBtn}
            onClick={onSecondaryCta}
          >
            {secondaryCta}
          </button>
        )}
      </div>
    </div>
  );
}

function Message({ text }) {
  return (
    <div style={styles.message}>
      <p>{text}</p>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────── */

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--navbar-height) - var(--footer-height))',
    padding: 'var(--space-8) var(--space-4)',
    maxWidth: 800,
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--space-8)',
  },
  eyebrow: {
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--color-charcoal-light)',
    marginBottom: 'var(--space-2)',
  },
  title: {
    fontSize: 'var(--text-3xl)',
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-light)',
    color: 'var(--color-charcoal)',
    margin: 0,
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-6)',
    flexWrap: 'wrap',
    gap: 'var(--space-4)',
  },
  filters: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  filterBtn: {
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'transparent',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  filterBtnActive: {
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    borderColor: 'var(--color-charcoal)',
  },
  markAllBtn: {
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    transition: 'opacity var(--transition-fast)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  item: {
    padding: 'var(--space-6)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-sand)',
    transition: 'background-color var(--transition-fast)',
  },
  itemUnread: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderColor: 'var(--color-charcoal)',
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 'var(--text-md)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-charcoal)',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-charcoal-light)',
    cursor: 'pointer',
    padding: 'var(--space-2)',
    display: 'flex',
    alignItems: 'center',
    transition: 'opacity var(--transition-fast)',
  },
  itemMessage: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    margin: 0,
  },
  viewLink: {
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    textDecoration: 'underline',
  },
  itemFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'var(--space-2)',
  },
  itemTime: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    margin: 0,
  },
  markReadBtn: {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    transition: 'opacity var(--transition-fast)',
  },
  emptyFiltered: {
    textAlign: 'center',
    padding: 'var(--space-8)',
    color: 'var(--color-charcoal-light)',
    backgroundColor: 'var(--color-blue)',
    borderRadius: 'var(--radius-md)',
    margin: 'var(--space-4) 0',
  },
  message: {
    textAlign: 'center',
    padding: 'var(--space-8)',
    color: 'var(--color-charcoal-light)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 'var(--space-12) var(--space-4)',
    textAlign: 'center',
  },
  emptyIconWrap: {
    position: 'relative',
    marginBottom: 'var(--space-6)',
  },
  emptyIconHalo: {
    position: 'absolute',
    inset: -16,
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-blue)',
    opacity: 0.5,
  },
  emptyIcon: {
    position: 'relative',
    color: 'var(--color-charcoal)',
  },
  emptyHeading: {
    fontSize: 'var(--text-xl)',
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-normal)',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-3)',
  },
  emptyBody: {
    fontSize: 'var(--text-md)',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-charcoal-light)',
    maxWidth: 480,
    marginBottom: 'var(--space-6)',
    lineHeight: 1.6,
  },
  emptyActions: {
    display: 'flex',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    padding: 'var(--space-3) var(--space-6)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: '0.05em',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  linkBtn: {
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    transition: 'opacity var(--transition-fast)',
  },
};
