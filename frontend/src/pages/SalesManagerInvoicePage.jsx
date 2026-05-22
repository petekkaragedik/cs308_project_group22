import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

export default function SalesManagerInvoicePage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login?next=/sales-manager/invoices');
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

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString() ? `?${params}` : '';
    try {
      const res = await fetch(apiUrl(`/api/sales-manager/invoices${qs}`), {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to load invoices');
      }
      const data = await res.json();
      setInvoices(data.invoices);
      setTotalRevenue(data.totalRevenue);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (authState === 'authorized') fetchInvoices();
  }, [authState, fetchInvoices]);

  const handleDownloadPdf = async (orderId, invoiceNumber) => {
    setDownloadingId(orderId);
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/invoice/pdf`), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Could not download PDF: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

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
        <h1 style={styles.title}>Invoice Management</h1>
        <p style={styles.subtitle}>View and download customer invoices. Filter by date range.</p>

        {/* Filter bar */}
        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label}>To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <button style={styles.filterBtn} onClick={fetchInvoices} disabled={loading}>
            {loading ? 'Loading…' : 'Apply Filter'}
          </button>
          {(startDate || endDate) && (
            <button
              style={styles.clearBtn}
              onClick={() => { setStartDate(''); setEndDate(''); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Summary */}
        {!loading && !error && (
          <div style={styles.summaryRow}>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Total Orders</span>
              <span style={styles.summaryValue}>{invoices.length}</span>
            </div>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Total Revenue</span>
              <span style={styles.summaryValue}>{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p style={styles.errorMsg}>{error}</p>}

        {/* Table */}
        {!error && (
          <div style={styles.tableWrap}>
            {loading ? (
              <p style={styles.loadingText}>Loading invoices…</p>
            ) : invoices.length === 0 ? (
              <p style={styles.emptyText}>No invoices found for the selected period.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Invoice #', 'Customer', 'Email', 'Date', 'Total', 'Status', 'PDF'].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.orderId} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.invNum}>{inv.invoiceNumber}</span>
                      </td>
                      <td style={styles.td}>{inv.customerName || '—'}</td>
                      <td style={styles.td}>{inv.customerEmail}</td>
                      <td style={styles.td}>{formatDate(inv.createdAt)}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...statusColor(inv.status) }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.downloadBtn}
                          disabled={downloadingId === inv.orderId}
                          onClick={() => handleDownloadPdf(inv.orderId, inv.invoiceNumber)}
                        >
                          {downloadingId === inv.orderId ? '…' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

function statusColor(status) {
  switch (status) {
    case 'delivered': return { backgroundColor: '#d1fae5', color: '#065f46' };
    case 'in-transit': return { backgroundColor: '#dbeafe', color: '#1e40af' };
    case 'processing': return { backgroundColor: '#fef3c7', color: '#92400e' };
    default: return { backgroundColor: 'var(--color-border)', color: 'var(--color-charcoal)' };
  }
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
    margin: 'var(--space-2) 0 var(--space-6) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
    marginBottom: 'var(--space-6)',
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  dateInput: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--color-white)',
    outline: 'none',
  },
  filterBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-5)',
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  clearBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    backgroundColor: 'transparent',
    color: 'var(--color-charcoal)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  summaryRow: {
    display: 'flex',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
    flexWrap: 'wrap',
  },
  summaryCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5) var(--space-7)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    minWidth: '160px',
  },
  summaryLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  summaryValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    color: 'var(--color-black)',
  },
  tableWrap: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    padding: 'var(--space-3) var(--space-4)',
    verticalAlign: 'middle',
  },
  invNum: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    textTransform: 'capitalize',
  },
  downloadBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '4px 12px',
    cursor: 'pointer',
  },
  loadingText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    textAlign: 'center',
    padding: 'var(--space-10)',
    margin: 0,
  },
  emptyText: {
    fontFamily: 'var(--font-heading)',
    fontStyle: 'italic',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-charcoal-light)',
    textAlign: 'center',
    padding: 'var(--space-10)',
    margin: 0,
  },
  errorMsg: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: '#dc2626',
    marginBottom: 'var(--space-4)',
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
