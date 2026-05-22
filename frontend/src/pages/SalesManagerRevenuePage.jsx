import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fmt(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
}

function downloadCsv(rows, filename) {
  const header = ['Period', 'Orders', 'Gross Revenue (TRY)', 'Discount Loss (TRY)', 'Net Profit (TRY)'];
  const lines = [
    header.join(','),
    ...rows.map((r) => [r.period, r.orderCount, r.revenue, r.discountLoss, r.profit].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, fontFamily: 'var(--font-body)', fontSize: 13 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontFamily: 'var(--font-body)', fontSize: 12 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)',
  borderRadius: 8, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

export default function SalesManagerRevenuePage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [chartData, setChartData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) { navigate('/login?next=/sales-manager/revenue'); return; }
    fetch(apiUrl('/api/profile'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setAuthState(data?.role === 'sales_manager' ? 'authorized' : 'unauthorized'))
      .catch(() => setAuthState('unauthorized'));
  }, [navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ groupBy });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    try {
      const res = await fetch(apiUrl(`/api/sales-manager/revenue?${params}`), { headers: authHeaders() });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || 'Failed'); }
      const json = await res.json();
      setChartData(json.data);
      setTotals(json.totals);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [startDate, endDate, groupBy]);

  useEffect(() => { if (authState === 'authorized') fetchData(); }, [authState, fetchData]);

  const handleExportCsv = () => {
    const suffix = startDate || endDate ? `_${startDate || 'start'}_to_${endDate || 'end'}` : '_all';
    downloadCsv(chartData, `revenue${suffix}.csv`);
  };

  if (authState === 'checking') return <><Navbar /><div style={styles.center}><span style={styles.centerText}>Loading...</span></div><Footer /></>;
  if (authState === 'unauthorized') return <><Navbar /><div style={styles.center}><h1 style={styles.deniedTitle}>Access Denied</h1><p style={styles.deniedText}>This page is only available to sales managers.</p></div><Footer /></>;

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <button style={styles.backBtn} onClick={() => navigate('/sales-manager/dashboard')}>← Back to Dashboard</button>
        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.title}>Revenue & Profit Chart</h1>
            <p style={styles.subtitle}>Analyse revenue, discount loss, and net profit over time.</p>
          </div>
          {chartData.length > 0 && (
            <button style={styles.exportBtn} onClick={handleExportCsv}>Export CSV</button>
          )}
        </div>

        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.dateInput} />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label}>To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.dateInput} />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Group by</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={styles.dateInput}>
              <option value="day">Day</option>
              <option value="month">Month</option>
            </select>
          </div>
          <button style={styles.filterBtn} onClick={fetchData} disabled={loading}>{loading ? 'Loading…' : 'Apply'}</button>
          {(startDate || endDate) && (
            <button style={styles.clearBtn} onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
          )}
        </div>

        {totals && !error && (
          <div style={styles.summaryRow}>
            {[
              { label: 'Total Orders', value: totals.orderCount, raw: true },
              { label: 'Gross Revenue', value: totals.revenue },
              { label: 'Discount Loss', value: totals.discountLoss, negative: totals.discountLoss > 0 },
              { label: 'Net Profit', value: totals.profit, highlight: true },
            ].map(({ label, value, raw, negative, highlight }) => (
              <div key={label} style={{ ...styles.summaryCard, ...(highlight ? styles.highlightCard : {}) }}>
                <span style={{ ...styles.summaryLabel, ...(highlight ? { color: 'rgba(255,255,255,0.6)' } : {}) }}>{label}</span>
                <span style={{ ...styles.summaryValue, ...(negative ? { color: '#dc2626' } : {}), ...(highlight ? { color: '#fff' } : {}) }}>
                  {raw ? value : fmt(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && <p style={styles.errorMsg}>{error}</p>}

        {!error && (
          <div style={styles.chartCard}>
            {loading ? (
              <p style={styles.loadingText}>Loading chart…</p>
            ) : chartData.length === 0 ? (
              <p style={styles.emptyText}>No data found for the selected period.</p>
            ) : (
              <>
                <p style={styles.chartTitle}>Revenue · Discount Loss · Net Profit</p>
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="period" tick={{ fontFamily: 'var(--font-body)', fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontFamily: 'var(--font-body)', fontSize: 11 }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Gross Revenue" fill="#a3c4bc" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="discountLoss" name="Discount Loss" fill="#f4a261" radius={[3, 3, 0, 0]} />
                    <Line dataKey="profit" name="Net Profit" type="monotone" stroke="#2d6a4f" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Period', 'Orders', 'Gross Revenue', 'Discount Loss', 'Net Profit'].map((h) => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row) => (
                        <tr key={row.period} style={styles.tr}>
                          <td style={styles.td}>{row.period}</td>
                          <td style={styles.td}>{row.orderCount}</td>
                          <td style={styles.td}>{fmt(row.revenue)}</td>
                          <td style={{ ...styles.td, color: '#dc2626' }}>{fmt(row.discountLoss)}</td>
                          <td style={{ ...styles.td, fontWeight: 600, color: '#2d6a4f' }}>{fmt(row.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

const styles = {
  page: { minHeight: '70vh', backgroundColor: 'var(--color-sand)', padding: 'var(--space-10) var(--container-pad)', maxWidth: '1200px', margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', padding: '0 0 var(--space-4) 0', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)', cursor: 'pointer', display: 'block' },
  titleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' },
  title: { margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-regular)', color: 'var(--color-black)', letterSpacing: 'var(--tracking-wide)' },
  exportBtn: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', backgroundColor: 'transparent', color: 'var(--color-charcoal)', border: '1px solid var(--color-charcoal)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-5)', cursor: 'pointer', whiteSpace: 'nowrap' },
  subtitle: { margin: 'var(--space-2) 0 var(--space-6) 0', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-light)' },
  filterBar: { display: 'flex', alignItems: 'flex-end', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)', backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' },
  label: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-light)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dateInput: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-white)', outline: 'none' },
  filterBtn: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', backgroundColor: 'var(--color-black)', color: 'var(--color-white)', border: 'none', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-5)', cursor: 'pointer', alignSelf: 'flex-end' },
  clearBtn: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', backgroundColor: 'transparent', color: 'var(--color-charcoal)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)', cursor: 'pointer', alignSelf: 'flex-end' },
  summaryRow: { display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' },
  summaryCard: { flex: '1 1 0', backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5) var(--space-6)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: '130px' },
  highlightCard: { backgroundColor: '#2d6a4f', border: '1px solid #2d6a4f' },
  summaryLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-light)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  summaryValue: { fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', color: 'var(--color-black)' },
  chartCard: { backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' },
  chartTitle: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', marginTop: 0 },
  tableWrap: { marginTop: 'var(--space-6)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-light)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)', padding: 'var(--space-3) var(--space-4)' },
  loadingText: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-light)', textAlign: 'center', padding: 'var(--space-10)', margin: 0 },
  emptyText: { fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 'var(--text-xl)', color: 'var(--color-charcoal-light)', textAlign: 'center', padding: 'var(--space-10)', margin: 0 },
  errorMsg: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: '#dc2626', marginBottom: 'var(--space-4)' },
  center: { minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-10) var(--container-pad)' },
  centerText: { fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', color: 'var(--color-charcoal-light)' },
  deniedTitle: { fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', color: 'var(--color-black)', margin: 0 },
  deniedText: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--color-charcoal-light)', marginTop: 'var(--space-2)' },
};
