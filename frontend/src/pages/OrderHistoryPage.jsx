import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, Truck, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─── Helpers ──────────────────────────────────────── */

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatPrice(n) {
  return '₺' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG = {
  processing:  { label: 'Processing',  Icon: Clock,         bg: '#fef3c7', color: '#92400e' },
  'in-transit':{ label: 'In Transit',  Icon: Truck,         bg: '#dbeafe', color: '#1e40af' },
  delivered:   { label: 'Delivered',   Icon: CheckCircle2,  bg: '#d1fae5', color: '#065f46' },
  cancelled:   { label: 'Cancelled',   Icon: AlertCircle,   bg: '#fee2e2', color: '#991b1b' },
};

const FILTERS = ['all', 'active', 'delivered'];

/* ─── Page ─────────────────────────────────────────── */

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, returnsRes] = await Promise.all([
        fetch('/api/profile/orders', { headers: authHeaders() }),
        fetch('/api/returns', { headers: authHeaders() }),
      ]);
      if (!ordersRes.ok) throw new Error('Failed to load orders');
      const ordersData = await ordersRes.json();
      const returnsData = returnsRes.ok ? await returnsRes.json() : [];

      const returnMap = {};
      for (const r of (Array.isArray(returnsData) ? returnsData : [])) {
        returnMap[r.order_id] = r.status;
      }
      setReturns(returnMap);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  const filtered = orders.filter((o) => {
    if (filter === 'active') return o.status !== 'delivered' && o.status !== 'cancelled';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>

          {/* Header */}
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => navigate('/profile')}>
              ← Back to Profile
            </button>
            <h1 style={styles.title}>Order History</h1>
            <p style={styles.subtitle}>View and track all your orders.</p>
          </div>

          {/* Filter tabs */}
          <div style={styles.tabs}>
            {FILTERS.map((f) => (
              <button
                key={f}
                style={{ ...styles.tab, ...(filter === f ? styles.tabActive : {}) }}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {!loading && (
                  <span style={{ ...styles.tabCount, ...(filter === f ? styles.tabCountActive : {}) }}>
                    {f === 'all' ? orders.length
                      : f === 'active' ? orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length
                      : orders.filter(o => o.status === 'delivered').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div style={styles.empty}>
              <Package size={40} strokeWidth={1.4} color="var(--color-charcoal-light, #9ca3af)" />
              <p style={styles.emptyText}>Loading your orders…</p>
            </div>
          ) : error ? (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
              <button style={styles.retryBtn} onClick={load}>Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={styles.empty}>
              <Package size={40} strokeWidth={1.4} color="var(--color-charcoal-light, #9ca3af)" />
              <p style={styles.emptyText}>
                {filter === 'active' ? 'No active orders.' : filter === 'delivered' ? 'No delivered orders yet.' : 'No orders yet.'}
              </p>
            </div>
          ) : (
            <div style={styles.list}>
              {filtered.map((order) => (
                <OrderSummaryCard
                  key={order.orderId}
                  order={order}
                  returnStatus={returns[order.orderId] ?? null}
                  onViewInvoice={() => navigate(`/invoice/${order.orderId}`)}
                />
              ))}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ─── Order Summary Card ───────────────────────────── */

function OrderSummaryCard({ order, returnStatus, onViewInvoice }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;
  const { Icon } = cfg;
  const itemCount = order.items?.length ?? 0;
  const firstItem = order.items?.[0];

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const withinWindow = order.placedAt && Date.now() - new Date(order.placedAt).getTime() <= THIRTY_DAYS_MS;
  const canReturn = order.status === 'delivered' && !returnStatus && withinWindow;

  return (
    <div style={styles.card}>
      {/* Top row: invoice number + status badge */}
      <div style={styles.cardTop}>
        <div>
          <p style={styles.cardLabel}>Order</p>
          <p style={styles.cardInvoice}>{order.id}</p>
        </div>
        <span style={{ ...styles.statusBadge, backgroundColor: cfg.bg, color: cfg.color }}>
          <Icon size={13} />
          {cfg.label}
        </span>
      </div>

      {/* Summary row: date, items, total */}
      <div style={styles.cardMeta}>
        <div style={styles.metaItem}>
          <p style={styles.cardLabel}>Placed</p>
          <p style={styles.metaValue}>{formatDate(order.placedAt)}</p>
        </div>
        <div style={styles.metaItem}>
          <p style={styles.cardLabel}>Items</p>
          <p style={styles.metaValue}>
            {itemCount === 0 ? '—' : itemCount === 1 ? firstItem.name : `${firstItem.name} + ${itemCount - 1} more`}
          </p>
        </div>
        <div style={{ ...styles.metaItem, textAlign: 'right' }}>
          <p style={styles.cardLabel}>Total</p>
          <p style={styles.metaTotal}>{formatPrice(order.total)}</p>
        </div>
      </div>

      {/* Return status indicator */}
      {returnStatus && (
        <div style={styles.returnRow}>
          <RotateCcw size={13} />
          <span>
            Return {returnStatus === 'pending' ? 'requested' : returnStatus === 'approved' ? 'approved' : 'rejected'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={styles.cardActions}>
        <button style={styles.btnPrimary} onClick={onViewInvoice}>
          {order.status === 'delivered' ? 'View Invoice' : 'Track Order'}
        </button>
        {canReturn && (
          <span style={styles.returnHint}>Return available</span>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ───────────────────────────────────────── */

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-sand, #f5f0e8)' },
  main: { flex: 1, padding: 'var(--space-8, 2rem) var(--space-4, 1rem)' },
  container: { maxWidth: 760, margin: '0 auto' },

  header: { marginBottom: 'var(--space-6, 1.5rem)' },
  backBtn: { background: 'none', border: 'none', padding: '0 0 12px', fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-charcoal-light, #6b7280)', cursor: 'pointer', display: 'block' },
  title: { fontSize: 'var(--text-3xl, 1.875rem)', fontWeight: 'var(--weight-semibold, 600)', color: 'var(--color-black, #1a1a1a)', margin: 0 },
  subtitle: { fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-charcoal-light, #6b7280)', marginTop: 4 },

  tabs: { display: 'flex', gap: 8, marginBottom: 'var(--space-6, 1.5rem)' },
  tab: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, border: '1px solid var(--color-border, #e5e7eb)', background: 'white', fontSize: 'var(--text-sm, 0.875rem)', fontWeight: 'var(--weight-medium, 500)', color: 'var(--color-charcoal, #374151)', cursor: 'pointer' },
  tabActive: { background: 'var(--color-charcoal, #1f2937)', color: 'white', borderColor: 'var(--color-charcoal, #1f2937)' },
  tabCount: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: 'var(--color-border, #e5e7eb)', fontSize: 11, fontWeight: 600, color: 'var(--color-charcoal, #374151)' },
  tabCountActive: { background: 'rgba(255,255,255,0.2)', color: 'white' },

  list: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' },

  card: { background: 'white', borderRadius: 12, padding: 'var(--space-5, 1.25rem)', border: '1px solid var(--color-border, #e5e7eb)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4, 1rem)' },
  cardLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-charcoal-light, #9ca3af)', margin: 0 },
  cardInvoice: { fontSize: 'var(--text-base, 1rem)', fontWeight: 'var(--weight-semibold, 600)', color: 'var(--color-black, #1a1a1a)', margin: '2px 0 0' },

  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 'var(--text-xs, 0.75rem)', fontWeight: 600 },

  cardMeta: { display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 'var(--space-4, 1rem)', paddingTop: 'var(--space-4, 1rem)', borderTop: '1px solid var(--color-border, #e5e7eb)', marginBottom: 'var(--space-4, 1rem)' },
  metaItem: {},
  metaValue: { fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-charcoal, #374151)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  metaTotal: { fontSize: 'var(--text-base, 1rem)', fontWeight: 'var(--weight-semibold, 600)', color: 'var(--color-black, #1a1a1a)', margin: '2px 0 0' },

  returnRow: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs, 0.75rem)', color: 'var(--color-charcoal-light, #6b7280)', marginBottom: 'var(--space-3, 0.75rem)' },

  cardActions: { display: 'flex', alignItems: 'center', gap: 'var(--space-3, 0.75rem)' },
  btnPrimary: { padding: '8px 20px', borderRadius: 8, border: '1px solid var(--color-charcoal, #374151)', background: 'white', fontSize: 'var(--text-sm, 0.875rem)', fontWeight: 'var(--weight-medium, 500)', color: 'var(--color-charcoal, #374151)', cursor: 'pointer' },
  returnHint: { fontSize: 'var(--text-xs, 0.75rem)', color: 'var(--color-charcoal-light, #6b7280)' },

  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0', color: 'var(--color-charcoal-light, #9ca3af)' },
  emptyText: { fontSize: 'var(--text-sm, 0.875rem)', margin: 0 },

  errorBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 'var(--text-sm, 0.875rem)' },
  retryBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#991b1b', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' },
};
