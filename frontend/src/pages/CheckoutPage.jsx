import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, UserX, Plus, AlertCircle } from 'lucide-react';
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

function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const hasToken =
    typeof window !== 'undefined' && !!localStorage.getItem('token');

  const [step, setStep] = useState(hasToken ? 'auth' : 'entry');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const total = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const p = getProduct(item.product_id);
        return sum + (p ? p.price * item.quantity : 0);
      }, 0),
    [cartItems]
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email,
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
              {step === 'entry' && (
                <EntryPanel
                  onLogin={() => navigate('/login?next=/checkout')}
                  onGuest={() => setStep('guest')}
                />
              )}
              {step === 'auth' && (
                <AuthPanel
                  submitting={submitting}
                  error={error}
                  onSubmit={placeOrder}
                  onSwitch={() => {
                    setError(null);
                    setStep('entry');
                  }}
                />
              )}
              {step === 'guest' && (
                <GuestPanel
                  submitting={submitting}
                  error={error}
                  onBack={() => {
                    setError(null);
                    setStep('entry');
                  }}
                  onSubmit={placeOrder}
                />
              )}
            </div>

            <OrderSummary cartItems={cartItems} total={total} />
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

/* ─── Step panels ─────────────────────────────────── */

function EntryPanel({ onLogin, onGuest }) {
  return (
    <div style={styles.formCard}>
      <h2 style={styles.cardTitle}>How would you like to continue?</h2>
      <p style={styles.lead}>
        Sign in to use your saved addresses, or check out as a guest.
      </p>
      <div style={styles.choiceList}>
        <button type="button" style={styles.choiceBtn} onClick={onLogin}>
          <User size={22} />
          <div style={styles.choiceTextWrap}>
            <p style={styles.choiceTitle}>Log in</p>
            <p style={styles.choiceDesc}>Use your account and saved addresses.</p>
          </div>
        </button>
        <button type="button" style={styles.choiceBtnAlt} onClick={onGuest}>
          <UserX size={22} />
          <div style={styles.choiceTextWrap}>
            <p style={styles.choiceTitle}>Continue as guest</p>
            <p style={styles.choiceDesc}>
              No account needed — just your shipping details.
            </p>
          </div>
        </button>
      </div>
      <Link to="/cart" style={styles.backLink}>
        ← Back to cart
      </Link>
    </div>
  );
}

function AuthPanel({ submitting, error, onSubmit, onSwitch }) {
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
    onSubmit({
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
      <h2 style={styles.cardTitle}>Shipping &amp; payment</h2>

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

      {error && (
        <div style={styles.errBox}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <button
        type="submit"
        style={{
          ...styles.payBtn,
          opacity: submitting || !canSubmit ? 0.5 : 1,
          cursor: submitting || !canSubmit ? 'not-allowed' : 'pointer',
        }}
        disabled={submitting || !canSubmit}
      >
        {submitting ? 'Processing…' : 'Confirm Payment'}
      </button>
      <button type="button" style={styles.linkBtnGhost} onClick={onSwitch}>
        Check out differently
      </button>
    </form>
  );
}

function GuestPanel({ submitting, error, onBack, onSubmit }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    line1: '',
    city: '',
    postal: '',
    country: 'Türkiye',
  });

  const valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.line1.trim() &&
    form.city.trim() &&
    form.country.trim();

  function handleSubmit(e) {
    e.preventDefault();
    if (!valid) return;
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    onSubmit({
      email: form.email.trim(),
      name: fullName,
      shippingAddress: {
        recipient: fullName,
        line1: form.line1.trim(),
        city: form.city.trim(),
        postal: form.postal.trim(),
        country: form.country.trim(),
      },
    });
  }

  return (
    <form style={styles.formCard} onSubmit={handleSubmit}>
      <h2 style={styles.cardTitle}>Guest checkout</h2>

      <div style={styles.rowGrid}>
        <label style={styles.label}>
          First name <span style={styles.req}>*</span>
          <input
            style={styles.input}
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </label>
        <label style={styles.label}>
          Last name <span style={styles.req}>*</span>
          <input
            style={styles.input}
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </label>
      </div>

      <label style={styles.label}>
        Email <span style={styles.req}>*</span>
        <input
          type="email"
          autoComplete="email"
          style={styles.input}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
          required
        />
      </label>

      <p style={styles.sectionLabel}>Shipping address</p>
      <label style={styles.label}>
        Street address <span style={styles.req}>*</span>
        <input
          style={styles.input}
          autoComplete="street-address"
          value={form.line1}
          onChange={(e) => setForm({ ...form, line1: e.target.value })}
          required
        />
      </label>
      <div style={styles.rowGrid}>
        <label style={styles.label}>
          City <span style={styles.req}>*</span>
          <input
            style={styles.input}
            autoComplete="address-level2"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
          />
        </label>
        <label style={styles.label}>
          Postal code
          <input
            style={styles.input}
            autoComplete="postal-code"
            value={form.postal}
            onChange={(e) => setForm({ ...form, postal: e.target.value })}
          />
        </label>
      </div>
      <label style={styles.label}>
        Country <span style={styles.req}>*</span>
        <input
          style={styles.input}
          autoComplete="country-name"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          required
        />
      </label>

      {error && (
        <div style={styles.errBox}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <button
        type="submit"
        style={{
          ...styles.payBtn,
          opacity: submitting || !valid ? 0.5 : 1,
          cursor: submitting || !valid ? 'not-allowed' : 'pointer',
        }}
        disabled={submitting || !valid}
      >
        {submitting ? 'Processing…' : 'Confirm Payment'}
      </button>
      <button type="button" style={styles.linkBtnGhost} onClick={onBack}>
        ← Back to options
      </button>
    </form>
  );
}

function OrderSummary({ cartItems, total }) {
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

  /* Entry step */
  choiceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-4)',
  },
  choiceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-4) var(--space-5)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    textAlign: 'left',
  },
  choiceBtnAlt: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-4) var(--space-5)',
    backgroundColor: 'var(--color-sand)',
    color: 'var(--color-black)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    textAlign: 'left',
  },
  choiceTextWrap: { display: 'flex', flexDirection: 'column', gap: 2 },
  choiceTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-semibold)',
  },
  choiceDesc: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
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
