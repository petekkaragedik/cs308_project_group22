import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import mockProducts from '../data/mockProducts';
import { apiUrl } from '../apiBase';

function formatPrice(price) {
  return (
    '₺' +
    Number(price).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function getProduct(productId) {
  return mockProducts.find((p) => p.id === productId) ?? null;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const total = cartItems.reduce((sum, item) => {
    const p = getProduct(item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  async function handleMockPay(e) {
    e.preventDefault();
    setError(null);
    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required for the invoice.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/orders/mock-checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email.trim(),
          customerName: name.trim() || undefined,
          items: cartItems.map((i) => ({
            product_id: i.product_id,
            size: i.size,
            quantity: i.quantity,
          })),
        }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setError(
          `Sunucu yanıtı JSON değil (HTTP ${res.status}). Backend’i 3001 portunda çalıştır: cd backend && npm start`
        );
        return;
      }
      if (!res.ok) {
        const hint = data.detail ? ` ${data.detail}` : '';
        setError((data.message || 'Checkout failed.') + hint);
        return;
      }
      clearCart();
      navigate(`/invoice/${data.orderId}`, {
        replace: true,
        state: {
          emailSent: data.emailSent,
          checkoutMessage: data.message,
          emailDetail: data.emailDetail,
          emailReason: data.emailReason,
        },
      });
    } catch {
      setError('Could not reach the server. Is the backend running on port 3001?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <h1 style={styles.heading}>Checkout</h1>
        <p style={styles.lead}>
          Mock payment creates your order and sends the invoice PDF via Brevo (requires BREVO_API_KEY and
          BREVO_SENDER_EMAIL on the backend).
        </p>

        {cartItems.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Nothing to checkout.</p>
            <Link to="/cart" style={styles.linkBtn}>
              Back to cart
            </Link>
          </div>
        ) : (
          <div style={styles.layout}>
            <form style={styles.formCard} onSubmit={handleMockPay}>
              <h2 style={styles.cardTitle}>Billing</h2>
              <label style={styles.label}>
                Email <span style={styles.req}>*</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={styles.input}
                  required
                />
              </label>
              <label style={styles.label}>
                Name <span style={styles.optional}>(optional)</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  style={styles.input}
                />
              </label>
              {error && <p style={styles.err}>{error}</p>}
              <button type="submit" style={styles.payBtn} disabled={submitting}>
                {submitting ? 'Processing…' : 'Confirm mock payment'}
              </button>
              <Link to="/cart" style={styles.backLink}>
                ← Back to cart
              </Link>
            </form>

            <div style={styles.summary}>
              <h2 style={styles.summaryHeading}>Order summary</h2>
              {cartItems.map((item) => {
                const product = getProduct(item.product_id);
                if (!product) return null;
                return (
                  <div key={item.id} style={styles.sumRow}>
                    <span>
                      {product.name.slice(0, 48)}
                      {product.name.length > 48 ? '…' : ''}
                    </span>
                    <span style={styles.sumMeta}>
                      ×{item.quantity} · {formatPrice(product.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
              <div style={styles.divider} />
              <div style={{ ...styles.sumRow, fontWeight: 'var(--weight-semibold)' }}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

const styles = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: 'var(--space-8) var(--container-pad)',
    minHeight: '70vh',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-3xl)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-3)',
  },
  lead: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-8)',
    maxWidth: 560,
    lineHeight: 1.5,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 'var(--space-12)',
  },
  emptyText: {
    fontSize: 'var(--text-lg)',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-4)',
  },
  linkBtn: {
    display: 'inline-block',
    padding: 'var(--space-3) var(--space-6)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 'var(--text-sm)',
  },
  layout: {
    display: 'flex',
    gap: 'var(--space-8)',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  formCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: 'var(--space-6)',
  },
  cardTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-4)',
  },
  label: {
    display: 'block',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-4)',
  },
  req: { color: 'var(--color-black)' },
  optional: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
    fontWeight: 'var(--weight-regular)',
  },
  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    marginTop: 'var(--space-2)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    backgroundColor: 'var(--color-sand)',
  },
  err: {
    color: 'var(--color-charcoal)',
    fontSize: 'var(--text-sm)',
    marginBottom: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
  },
  payBtn: {
    width: '100%',
    padding: 'var(--space-3) 0',
    marginTop: 'var(--space-2)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: 'var(--space-4)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
  },
  summary: {
    width: 320,
    flexShrink: 0,
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: 'var(--space-6)',
  },
  summaryHeading: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-4)',
  },
  sumRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-3)',
  },
  sumMeta: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--color-border)',
    margin: 'var(--space-3) 0',
  },
};
