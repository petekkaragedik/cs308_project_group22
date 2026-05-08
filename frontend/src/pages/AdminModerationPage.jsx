import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

export default function AdminModerationPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking'); // checking | authorized | unauthorized
  const [status, setStatus] = useState('pending');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login?next=/admin/moderation');
      return;
    }
    fetch(apiUrl('/api/profile'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (data?.role === 'product_manager') {
          setAuthState('authorized');
        } else {
          setAuthState('unauthorized');
        }
      })
      .catch(() => setAuthState('unauthorized'));
  }, [navigate]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/comments?status=pending'), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      /* leave count as-is */
    }
  }, []);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = status === 'all'
        ? apiUrl('/api/admin/comments')
        : apiUrl(`/api/admin/comments?status=${encodeURIComponent(status)}`);
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setComments(list);
      if (status === 'pending') setPendingCount(list.length);
      else refreshPendingCount();
    } catch (e) {
      setError('Could not load comments. Please try again.');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [status, refreshPendingCount]);

  useEffect(() => {
    if (authState === 'authorized') loadComments();
  }, [authState, loadComments]);

  async function act(id, action) {
    setBusyId(id);
    try {
      const isDelete = action === 'delete';
      const url = isDelete
        ? apiUrl(`/api/admin/comments/${id}`)
        : apiUrl(`/api/admin/comments/${id}/${action}`);
      const res = await fetch(url, {
        method: isDelete ? 'DELETE' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadComments();
    } catch (e) {
      setError(`Failed to ${action} comment.`);
    } finally {
      setBusyId(null);
    }
  }

  if (authState === 'checking') {
    return (
      <>
        <Navbar />
        <div style={styles.center}>
          <span style={styles.centerText}>Loading...</span>
        </div>
        <Footer />
      </>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <>
        <Navbar />
        <div style={styles.center}>
          <h1 style={styles.deniedTitle}>Access Denied</h1>
          <p style={styles.deniedText}>
            This page is only available to product managers.
          </p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <style>{`
        .mod-tab { cursor: pointer; }
        .mod-tab:hover { background-color: var(--color-blue) !important; }
        .mod-tab.active { background-color: var(--color-charcoal) !important; color: var(--color-sand) !important; }
        .mod-approve:hover:not(:disabled) { background-color: var(--color-success) !important; }
        .mod-reject:hover:not(:disabled) { background-color: var(--color-warning) !important; }
        .mod-delete:hover:not(:disabled) { background-color: var(--color-error) !important; }
      `}</style>

      <Navbar />

      <div style={styles.page}>
        <h1 style={styles.title}>Comment Moderation</h1>
        <p style={styles.subtitle}>
          Review customer comments and approve, reject, or delete them.
        </p>

        <div style={styles.tabs}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              className={`mod-tab${status === t.key ? ' active' : ''}`}
              style={styles.tab}
              onClick={() => setStatus(t.key)}
            >
              {t.label}
              {t.key === 'pending' && pendingCount > 0 && (
                <span style={styles.pendingBadge}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <div style={styles.center}><span style={styles.centerText}>Loading...</span></div>
        ) : comments.length === 0 ? (
          <div style={styles.empty}>No comments in this category.</div>
        ) : (
          <div style={styles.list}>
            {comments.map((c) => (
              <div key={c.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.meta}>
                    <span style={styles.user}>{c.user_name || `User #${c.user_id}`}</span>
                    <span style={styles.metaSep}>·</span>
                    <span style={styles.muted}>{c.user_email}</span>
                  </div>
                  <span style={statusBadgeStyle(c.status)}>{c.status}</span>
                </div>
                <div style={styles.productLine}>
                  Product: <span style={styles.productId}>{c.product_id}</span>
                </div>
                <p style={styles.body}>{c.body}</p>
                <div style={styles.cardFooter}>
                  <span style={styles.date}>{formatDate(c.created_at)}</span>
                  <div style={styles.actions}>
                    {c.status !== 'approved' && (
                      <button
                        className="mod-approve"
                        style={styles.actionBtn}
                        disabled={busyId === c.id}
                        onClick={() => act(c.id, 'approve')}
                      >
                        Approve
                      </button>
                    )}
                    {c.status !== 'rejected' && (
                      <button
                        className="mod-reject"
                        style={styles.actionBtn}
                        disabled={busyId === c.id}
                        onClick={() => act(c.id, 'reject')}
                      >
                        Reject
                      </button>
                    )}
                    <button
                      className="mod-delete"
                      style={styles.actionBtn}
                      disabled={busyId === c.id}
                      onClick={() => act(c.id, 'delete')}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

function statusBadgeStyle(s) {
  const base = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-black)',
  };
  if (s === 'approved') return { ...base, backgroundColor: 'var(--color-success)' };
  if (s === 'rejected') return { ...base, backgroundColor: 'var(--color-error)' };
  return { ...base, backgroundColor: 'var(--color-warning)' };
}

const styles = {
  page: {
    minHeight: '70vh',
    backgroundColor: 'var(--color-sand)',
    padding: 'var(--space-10) var(--container-pad)',
    maxWidth: '960px',
    margin: '0 auto',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    letterSpacing: 'var(--tracking-wide)',
  },
  subtitle: {
    margin: 'var(--space-2) 0 var(--space-6) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-6)',
    flexWrap: 'wrap',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-warning)',
    color: 'var(--color-black)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-bold)',
    letterSpacing: 'var(--tracking-normal)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5) var(--space-6)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-2)',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  user: {
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-black)',
  },
  metaSep: { color: 'var(--color-charcoal-light)' },
  muted: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  productLine: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    marginBottom: 'var(--space-3)',
  },
  productId: {
    color: 'var(--color-charcoal)',
    fontWeight: 'var(--weight-medium)',
  },
  body: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal)',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  cardFooter: {
    marginTop: 'var(--space-4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  date: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  actionBtn: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  empty: {
    padding: 'var(--space-10) 0',
    textAlign: 'center',
    fontFamily: 'var(--font-heading)',
    fontStyle: 'italic',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-charcoal-light)',
  },
  center: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'var(--space-10) var(--container-pad)',
  },
  centerText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-charcoal-light)',
  },
  deniedTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    color: 'var(--color-black)',
    margin: 0,
  },
  deniedText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
    marginTop: 'var(--space-2)',
  },
  errorBox: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-error)',
    color: '#991b1b',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    marginBottom: 'var(--space-4)',
  },
};
