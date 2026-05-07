import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Clock, Truck, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiUrl } from '../apiBase';

function formatMoney(n) {
  return (
    '₺' +
    Number(n).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const TIMELINE_STEPS = [
  { key: 'processing', label: 'Processing', Icon: Clock },
  { key: 'in_transit', label: 'In transit', Icon: Truck },
  { key: 'delivered', label: 'Delivered', Icon: CheckCircle2 },
];

function normalizeStatus(status) {
  return String(status || '').toLowerCase().replace(/-/g, '_');
}

function DeliveryTimeline({ status }) {
  const normalized = normalizeStatus(status);
  if (normalized === 'cancelled') {
    return (
      <div style={styles.timelineCancelled}>
        <p style={styles.sectionLabel}>Delivery status</p>
        <p style={styles.bodyText}>Order cancelled.</p>
      </div>
    );
  }
  const currentIdx = Math.max(
    0,
    TIMELINE_STEPS.findIndex((s) => s.key === normalized)
  );

  return (
    <div style={styles.timelineWrap}>
      <p style={styles.sectionLabel}>Delivery status</p>
      <div style={styles.timeline}>
        {TIMELINE_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const Icon = step.Icon;
          return (
            <div key={step.key} style={styles.timelineStep}>
              <div
                style={{
                  ...styles.timelineDot,
                  backgroundColor: done ? 'var(--color-yellow)' : 'var(--color-white)',
                  borderColor: done ? 'var(--color-charcoal)' : 'var(--color-border)',
                }}
              >
                <Icon
                  size={16}
                  color={done ? 'var(--color-black)' : 'var(--color-charcoal-light)'}
                />
              </div>
              <span
                style={{
                  ...styles.timelineLabel,
                  color: isCurrent ? 'var(--color-black)' : 'var(--color-charcoal-light)',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {step.label}
              </span>
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  style={{
                    ...styles.timelineLine,
                    backgroundColor:
                      i < currentIdx ? 'var(--color-charcoal)' : 'var(--color-border)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InvoicePage() {
  const { orderId } = useParams();
  const location = useLocation();
  const emailSentFlag = location.state?.emailSent;
  const emailDetail = location.state?.emailDetail;
  const emailReason = location.state?.emailReason;
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(apiUrl(`/api/orders/${orderId}/invoice`));
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setErr(json.message || 'Could not load invoice.');
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setErr('Could not reach the server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const pdfHref = apiUrl(`/api/orders/${orderId}/invoice/pdf`);

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <h1 style={styles.heading}>Invoice</h1>

        {loading && <p style={styles.muted}>Loading…</p>}
        {err && <p style={styles.err}>{err}</p>}

        {!loading && !err && data && (
          <>
            {emailSentFlag === false && (
              <div style={styles.bannerWarn}>
                <p style={styles.bannerText}>
                  {emailDetail ? (
                    <>
                      E-posta gönderilemedi (Brevo): <strong>{emailDetail}</strong>
                    </>
                  ) : emailReason === 'brevo_not_configured' ? (
                    <>
                      Sunucu <code style={styles.code}>BREVO_API_KEY</code> görmüyor.{' '}
                      <code style={styles.code}>backend/.env</code> içine ekleyip backend’i yeniden başlat.
                    </>
                  ) : emailReason === 'brevo_sender_missing' ? (
                    <>
                      <code style={styles.code}>BREVO_SENDER_EMAIL</code> eksik. Brevo’da doğrulanmış gönderen adresini{' '}
                      <code style={styles.code}>backend/.env</code> içine yaz.
                    </>
                  ) : (
                    <>
                      Fatura maili gönderilmedi. <code style={styles.code}>BREVO_API_KEY</code> ve{' '}
                      <code style={styles.code}>BREVO_SENDER_EMAIL</code> kontrol et.
                    </>
                  )}{' '}
                  PDF’yi aşağıdan indirebilirsin.
                </p>
              </div>
            )}
            <div style={styles.card}>
              <div style={styles.topRow}>
                <div>
                  <p style={styles.invoiceNo}>{data.invoiceNumber}</p>
                  <p style={styles.muted}>
                    {data.createdAt
                      ? new Date(data.createdAt).toLocaleString('tr-TR')
                      : ''}
                  </p>
                </div>
                <div style={styles.actions}>
                  <a href={pdfHref} download style={styles.downloadBtn}>
                    Download PDF
                  </a>
                </div>
              </div>

              <DeliveryTimeline status={data.status} />

              <div style={styles.billBlock}>
                <p style={styles.sectionLabel}>Bill to</p>
                <p style={styles.bodyText}>{data.customerName || 'Customer'}</p>
                <p style={styles.bodyText}>{data.customerEmail}</p>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Item</th>
                    <th style={styles.thRight}>Qty</th>
                    <th style={styles.thRight}>Unit</th>
                    <th style={styles.thRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, i) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        <Link to={`/products/${line.productId}`} style={styles.itemLink}>
                          {line.productName}
                        </Link>
                        <span style={styles.dim}> · Size {line.size}</span>
                      </td>
                      <td style={styles.tdRight}>{line.quantity}</td>
                      <td style={styles.tdRight}>{formatMoney(line.unitPrice)}</td>
                      <td style={styles.tdRight}>{formatMoney(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={styles.grandTotal}>Total {formatMoney(data.total)}</p>

              <p style={styles.note}>
                {emailSentFlag === false
                  ? 'Configure Brevo (BREVO_API_KEY + BREVO_SENDER_EMAIL) on the server to receive this invoice by email.'
                  : 'A PDF copy was sent to your email via Brevo.'}
              </p>
            </div>

            <Link to="/products" style={styles.shop}>
              Continue shopping
            </Link>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

const styles = {
  page: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 'var(--space-8) var(--container-pad)',
    minHeight: '70vh',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-3xl)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-6)',
  },
  muted: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
  },
  err: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-6)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  },
  invoiceNo: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-2)',
  },
  actions: {
    flexShrink: 0,
  },
  timelineWrap: {
    marginBottom: 'var(--space-6)',
    paddingBottom: 'var(--space-6)',
    borderBottom: '1px solid var(--color-border)',
  },
  timelineCancelled: {
    marginBottom: 'var(--space-6)',
    paddingBottom: 'var(--space-6)',
    borderBottom: '1px solid var(--color-border)',
  },
  timeline: {
    display: 'flex',
    alignItems: 'flex-start',
    marginTop: 'var(--space-3)',
    position: 'relative',
  },
  timelineStep: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    gap: 'var(--space-2)',
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-full)',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  timelineLine: {
    position: 'absolute',
    top: 17,
    left: '50%',
    right: '-50%',
    height: 2,
    zIndex: 0,
  },
  downloadBtn: {
    display: 'inline-block',
    padding: 'var(--space-3) var(--space-5)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 'var(--text-sm)',
  },
  billBlock: {
    marginBottom: 'var(--space-6)',
  },
  sectionLabel: {
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-2)',
  },
  bodyText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-black)',
    fontFamily: 'var(--font-body)',
    margin: 0,
    lineHeight: 1.5,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--space-2) var(--space-2) var(--space-2) 0',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-charcoal)',
    fontWeight: 'var(--weight-semibold)',
  },
  thRight: {
    textAlign: 'right',
    padding: 'var(--space-2) 0',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-charcoal)',
    fontWeight: 'var(--weight-semibold)',
  },
  td: {
    padding: 'var(--space-3) var(--space-3) var(--space-3) 0',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-black)',
    verticalAlign: 'top',
  },
  tdRight: {
    padding: 'var(--space-3) 0',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  dim: {
    color: 'var(--color-charcoal)',
    fontSize: 'var(--text-xs)',
  },
  itemLink: {
    color: 'inherit',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-border)',
    fontFamily: 'var(--font-body)',
  },
  grandTotal: {
    textAlign: 'right',
    fontSize: 'var(--text-lg)',
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    marginTop: 'var(--space-4)',
  },
  note: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginTop: 'var(--space-6)',
    lineHeight: 1.5,
  },
  shop: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    textDecoration: 'underline',
  },
  bannerWarn: {
    backgroundColor: 'var(--color-warning)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
    border: '1px solid var(--color-border)',
  },
  bannerText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-black)',
    fontFamily: 'var(--font-body)',
    margin: 0,
    lineHeight: 1.5,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '0.85em',
    backgroundColor: 'var(--color-white)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
  },
};
