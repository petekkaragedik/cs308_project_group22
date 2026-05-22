import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
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

function authHeaders() {
  const t = sessionStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const [products, setProducts] = useState([]);
  const [step, setStep] = useState('auth');
  const [orderData, setOrderData] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionStorage.getItem('token')) {
      navigate('/login?next=/checkout', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    fetch(apiUrl('/api/products?limit=500'))
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => {});
  }, []);

  // eslint-disable-next-line eqeqeq
  const getProduct = useCallback((id) => products.find((p) => p.id == id) ?? null, [products]);

  const total = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const p = getProduct(item.product_id);
        return sum + (p ? p.price * item.quantity : 0);
      }, 0),
    [cartItems, getProduct]
  );

  async function placeOrder({ email, name, shippingAddress }) {
    setError(null);
    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/orders/mock-checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          customerName: name || undefined,
          shippingAddress,
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
          `Unexpected server response (HTTP ${res.status}). Is the backend running on port 3001?`
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

        {cartItems.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Nothing to checkout.</p>
            <Link to="/cart" style={styles.linkBtn}>
              Back to cart
            </Link>
          </div>
        ) : (
          <div style={styles.layout}>
            <div style={styles.leftCol}>
              {step === 'auth' && (
                <AuthPanel
                  onNext={(data) => {
                    setOrderData(data);
                    setStep('payment');
                  }}
                  onSwitch={() => navigate('/login')}
                />
              )}
              {step === 'payment' && orderData && (
                <PaymentForm
                  submitting={submitting}
                  error={error}
                  onApproved={() => placeOrder(orderData)}
                  onBack={() => {
                    setError(null);
                    setStep('auth');
                  }}
                />
              )}
            </div>

            <OrderSummary cartItems={cartItems} total={total} getProduct={getProduct} />
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

/* ─── Step panels ─────────────────────────────────── */

function AuthPanel({ onNext, onSwitch }) {
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [newForm, setNewForm] = useState({
    recipient: '',
    line1: '',
    city: '',
    postal: '',
    country: 'Türkiye',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profRes, addrRes] = await Promise.all([
          fetch(apiUrl('/api/profile'), { headers: authHeaders() }),
          fetch(apiUrl('/api/profile/addresses'), { headers: authHeaders() }),
        ]);
        if (profRes.status === 401) throw new Error('auth');
        if (!profRes.ok) throw new Error('profile');
        const prof = await profRes.json();
        const addrs = addrRes.ok ? await addrRes.json() : [];
        if (cancelled) return;
        setProfile({ name: prof.name || '', email: prof.email });
        const list = Array.isArray(addrs) ? addrs : [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault);
        if (def) setSelected({ type: 'saved', id: def.id });
        else if (list[0]) setSelected({ type: 'saved', id: list[0].id });
        else setSelected({ type: 'new' });
      } catch (e) {
        if (cancelled) return;
        setLoadError(
          e.message === 'auth'
            ? 'Your session has expired. Please log in again.'
            : 'Failed to load your profile.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shippingAddress = useMemo(() => {
    if (!selected) return null;
    if (selected.type === 'new') return { ...newForm };
    const a = addresses.find((x) => x.id === selected.id);
    if (!a) return null;
    return {
      recipient: a.recipient,
      line1: a.line1,
      city: a.city,
      postal: a.postal,
      country: a.country,
    };
  }, [selected, addresses, newForm]);

  const newValid =
    newForm.recipient.trim() &&
    newForm.line1.trim() &&
    newForm.city.trim() &&
    newForm.country.trim();

  const canSubmit =
    !!profile && !!selected && (selected.type !== 'new' || newValid);

  function handleConfirm(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onNext({
      email: profile.email,
      name: profile.name,
      shippingAddress,
    });
  }

  if (loading) {
    return (
      <div style={styles.formCard}>
        <p style={styles.lead}>Loading your info…</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div style={styles.formCard}>
        <div style={styles.errBox}>
          <AlertCircle size={16} /> {loadError}
        </div>
        <button type="button" style={styles.payBtn} onClick={onSwitch}>
          Back to options
        </button>
      </div>
    );
  }

  return (
    <form style={styles.formCard} onSubmit={handleConfirm}>
      <h2 style={styles.cardTitle}>Shipping details</h2>

      <div style={styles.profileBox}>
        <p style={styles.profileName}>{profile.name || '—'}</p>
        <p style={styles.profileEmail}>{profile.email}</p>
      </div>

      <p style={styles.sectionLabel}>Shipping address</p>
      <div style={styles.addressList}>
        {addresses.map((a) => {
          const active = selected?.type === 'saved' && selected.id === a.id;
          return (
            <label
              key={a.id}
              style={{
                ...styles.addrOption,
                borderColor: active ? 'var(--color-black)' : 'var(--color-border)',
              }}
            >
              <input
                type="radio"
                name="addr"
                checked={active}
                onChange={() => setSelected({ type: 'saved', id: a.id })}
                style={styles.radio}
              />
              <div style={{ flex: 1 }}>
                <p style={styles.addrLabel}>
                  {a.label}
                  {a.isDefault && <span style={styles.defaultTag}>DEFAULT</span>}
                </p>
                <p style={styles.addrLine}>{a.recipient}</p>
                <p style={styles.addrLine}>{a.line1}</p>
                <p style={styles.addrLine}>
                  {a.city}
                  {a.postal ? ` · ${a.postal}` : ''} · {a.country}
                </p>
              </div>
            </label>
          );
        })}

        <label
          style={{
            ...styles.addrOption,
            borderColor:
              selected?.type === 'new' ? 'var(--color-black)' : 'var(--color-border)',
          }}
        >
          <input
            type="radio"
            name="addr"
            checked={selected?.type === 'new'}
            onChange={() => setSelected({ type: 'new' })}
            style={styles.radio}
          />
          <div style={{ flex: 1 }}>
            <p style={styles.addrLabel}>
              <Plus size={14} style={{ verticalAlign: 'middle' }} /> Use a new address
            </p>
            {selected?.type === 'new' && (
              <div style={styles.newAddrGrid}>
                <input
                  style={styles.input}
                  placeholder="Recipient"
                  value={newForm.recipient}
                  onChange={(e) =>
                    setNewForm({ ...newForm, recipient: e.target.value })
                  }
                />
                <input
                  style={styles.input}
                  placeholder="Street address"
                  value={newForm.line1}
                  onChange={(e) =>
                    setNewForm({ ...newForm, line1: e.target.value })
                  }
                />
                <input
                  style={styles.input}
                  placeholder="City"
                  value={newForm.city}
                  onChange={(e) =>
                    setNewForm({ ...newForm, city: e.target.value })
                  }
                />
                <input
                  style={styles.input}
                  placeholder="Postal code"
                  value={newForm.postal}
                  onChange={(e) =>
                    setNewForm({ ...newForm, postal: e.target.value })
                  }
                />
                <input
                  style={{ ...styles.input, gridColumn: '1 / -1' }}
                  placeholder="Country"
                  value={newForm.country}
                  onChange={(e) =>
                    setNewForm({ ...newForm, country: e.target.value })
                  }
                />
              </div>
            )}
          </div>
        </label>
      </div>

      <button
        type="submit"
        style={{
          ...styles.payBtn,
          opacity: !canSubmit ? 0.5 : 1,
          cursor: !canSubmit ? 'not-allowed' : 'pointer',
        }}
        disabled={!canSubmit}
      >
        Continue to Payment
      </button>
      <button type="button" style={styles.linkBtnGhost} onClick={onSwitch}>
        Check out differently
      </button>
    </form>
  );
}

function PaymentForm({ submitting, error, onApproved, onBack }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  function formatCardNumber(val) {
    return val
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();
  }

  function formatExpiry(val) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  function validate() {
    const digits = card.number.replace(/\s/g, '');
    if (!/^\d{16}$/.test(digits)) return 'Enter a valid 16-digit card number.';
    const match = card.expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return 'Enter expiry as MM/YY.';
    const month = parseInt(match[1], 10);
    const year = 2000 + parseInt(match[2], 10);
    if (month < 1 || month > 12) return 'Invalid expiry month.';
    const now = new Date();
    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      return 'Your card has expired.';
    }
    if (!/^\d{3,4}$/.test(card.cvv)) return 'Enter a valid CVV (3 or 4 digits).';
    if (!card.name.trim()) return 'Enter the cardholder name.';
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setPaymentError(err);
      return;
    }
    setPaymentError(null);
    setProcessing(true);
    setTimeout(() => {
      const digits = card.number.replace(/\s/g, '');
      const last4 = digits.slice(-4);
      setProcessing(false);
      if (last4 === '0000') {
        setPaymentError('Your card was declined. Please try a different card.');
      } else if (last4 === '9999') {
        setPaymentError('Insufficient funds. Please try a different card.');
      } else {
        onApproved();
      }
    }, 1500);
  }

  const displayError = paymentError || error;
  const busy = processing || submitting;

  return (
    <form style={styles.formCard} onSubmit={handleSubmit}>
      <h2 style={styles.cardTitle}>Payment details</h2>
      <p style={styles.lead}>
        This is a mock payment — no real charges will be made.
      </p>

      <div style={styles.mockHint}>
        <p style={styles.mockHintText}>
          Test cards: any valid number works ·{' '}
          <strong>ends in 0000</strong> → declined ·{' '}
          <strong>ends in 9999</strong> → insufficient funds
        </p>
      </div>

      <label style={styles.label}>
        Cardholder name <span style={styles.req}>*</span>
        <input
          style={styles.input}
          placeholder="Name on card"
          value={card.name}
          onChange={(e) => setCard({ ...card, name: e.target.value })}
          autoComplete="cc-name"
          disabled={busy}
          required
        />
      </label>

      <label style={styles.label}>
        Card number <span style={styles.req}>*</span>
        <input
          style={styles.input}
          placeholder="1234 5678 9012 3456"
          value={card.number}
          onChange={(e) =>
            setCard({ ...card, number: formatCardNumber(e.target.value) })
          }
          autoComplete="cc-number"
          inputMode="numeric"
          maxLength={19}
          disabled={busy}
          required
        />
      </label>

      <div style={styles.rowGrid}>
        <label style={styles.label}>
          Expiry <span style={styles.req}>*</span>
          <input
            style={styles.input}
            placeholder="MM/YY"
            value={card.expiry}
            onChange={(e) =>
              setCard({ ...card, expiry: formatExpiry(e.target.value) })
            }
            autoComplete="cc-exp"
            inputMode="numeric"
            maxLength={5}
            disabled={busy}
            required
          />
        </label>
        <label style={styles.label}>
          CVV <span style={styles.req}>*</span>
          <input
            style={styles.input}
            placeholder="123"
            value={card.cvv}
            onChange={(e) =>
              setCard({
                ...card,
                cvv: e.target.value.replace(/\D/g, '').slice(0, 4),
              })
            }
            autoComplete="cc-csc"
            inputMode="numeric"
            maxLength={4}
            disabled={busy}
            required
          />
        </label>
      </div>

      {displayError && (
        <div style={styles.errBox}>
          <AlertCircle size={16} /> {displayError}
        </div>
      )}

      <button
        type="submit"
        style={{
          ...styles.payBtn,
          opacity: busy ? 0.5 : 1,
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
        disabled={busy}
      >
        {processing ? 'Processing payment…' : submitting ? 'Placing order…' : 'Pay now'}
      </button>
      <button
        type="button"
        style={styles.linkBtnGhost}
        onClick={onBack}
        disabled={busy}
      >
        ← Back to shipping
      </button>
    </form>
  );
}

function OrderSummary({ cartItems, total, getProduct }) {
  return (
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
  );
}

/* ─── Styles ──────────────────────────────────────── */

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
    marginBottom: 'var(--space-6)',
  },
  lead: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-6)',
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
  leftCol: { flex: 1, minWidth: 280 },
  formCard: {
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

  /* Auth step */
  profileBox: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-sand)',
    marginBottom: 'var(--space-5)',
  },
  profileName: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-black)',
  },
  profileEmail: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
  },
  sectionLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-2)',
    marginTop: 'var(--space-2)',
  },
  addressList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-4)',
  },
  addrOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    backgroundColor: 'var(--color-white)',
  },
  radio: { marginTop: 4, flexShrink: 0 },
  addrLabel: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  defaultTag: {
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    letterSpacing: 'var(--tracking-wide)',
  },
  addrLine: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
  },
  newAddrGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-3)',
  },

  /* Payment step */
  mockHint: {
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-sand)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    marginBottom: 'var(--space-4)',
  },
  mockHintText: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
    lineHeight: 1.5,
  },

  /* Guest step */
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-3)',
  },
  label: {
    display: 'block',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-4)',
  },
  req: { color: 'var(--color-black)' },
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

  /* Shared action area */
  errBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-error)',
    color: '#991b1b',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    marginBottom: 'var(--space-3)',
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
  linkBtnGhost: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    marginTop: 'var(--space-4)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: 'var(--space-4)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
  },

  /* Summary */
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
