import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SalesManagerRefundsPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?next=/sales-manager/refunds');
      return;
    }
    fetch(apiUrl('/api/profile'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (data?.role === 'sales_manager') {
          setAuthState('authorized');
        } else {
          setAuthState('unauthorized');
        }
      })
      .catch(() => setAuthState('unauthorized'));
  }, [navigate]);

  useEffect(() => {
    if (authState !== 'authorized') return;
    setLoading(true);
    fetch(apiUrl('/api/returns'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setRequests(data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [authState]);

  async function handleAction(id, action) {
    setActionError(null);
    try {
      const res = await fetch(apiUrl(`/api/returns/${id}/${action}`), {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setActionError(body.message || `Failed to ${action} request`);
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setActionError(`Failed to ${action} request`);
    }
  }

  if (authState === 'checking') {
    return (
      <>
        <Navbar />
        <div style={styles.center}><span style={styles.centerText}>Loading...</span></div>
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
          <p style={styles.deniedText}>This page is only available to sales managers.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <button style={styles.backBtn} onClick={() => navigate('/sales-manager/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>Refund Requests</h1>
        <p style={styles.subtitle}>Review and approve or reject customer return requests.</p>

        {actionError && <p style={styles.errorBanner}>{actionError}</p>}

        {loading ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No pending refund requests.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {requests.map((r) => (
              <div key={r.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.orderId}>Order #{r.order_id}</span>
                  <span style={styles.date}>{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.row}>
                    <span style={styles.label}>Customer</span>
                    <span style={styles.value}>
                      {r.customer_name || r.customer_email}
                    </span>
                  </div>
                  <div style={styles.row}>
                    <span style={styles.label}>Products</span>
                    <span style={styles.value}>{r.product_names || '—'}</span>
                  </div>
                  <div style={styles.row}>
                    <span style={styles.label}>Total Paid</span>
                    <span style={styles.value}>
                      {Number(r.total_amount).toFixed(2)} {r.currency}
                    </span>
                  </div>
                  {r.reason && (
                    <div style={styles.row}>
                      <span style={styles.label}>Reason</span>
                      <span style={styles.value}>{r.reason}</span>
                    </div>
                  )}
                </div>

                <div style={styles.cardActions}>
                  <button
                    style={styles.approveBtn}
                    onClick={() => handleAction(r.id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    style={styles.rejectBtn}
                    onClick={() => handleAction(r.id, 'reject')}
                  >
                    Reject
                  </button>
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

const styles = {
  page: {
    minHeight: '70vh',
    backgroundColor: 'var(--color-sand)',
    padding: 'var(--space-10) var(--container-pad)',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    padding: '0 0 var(--space-4) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
    display: 'block',
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
    margin: 'var(--space-2) 0 var(--space-8) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  errorBanner: {
    marginBottom: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: '#fdecea',
    border: '1px solid #f5c6cb',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: '#a94442',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)',
    paddingBottom: 'var(--space-3)',
    borderBottom: '1px solid var(--color-border)',
  },
  orderId: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    letterSpacing: 'var(--tracking-wide)',
  },
  date: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-5)',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-3)',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    minWidth: '100px',
    flexShrink: 0,
  },
  value: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  cardActions: {
    display: 'flex',
    gap: 'var(--space-3)',
  },
  approveBtn: {
    padding: 'var(--space-2) var(--space-5)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    cursor: 'pointer',
    border: '1px solid var(--color-charcoal)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-white)',
  },
  rejectBtn: {
    padding: 'var(--space-2) var(--space-5)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
  },
  emptyCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-10)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'var(--font-heading)',
    fontStyle: 'italic',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-charcoal-light)',
    margin: 0,
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
};
