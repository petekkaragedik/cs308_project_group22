import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Package, Lock, MapPin, LogOut, Camera, Trash2,
  Check, X, Mail, Eye, EyeOff, ChevronRight, Plus,
  Truck, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─── Mock data (backend'e bağlanınca kaldırılacak) ──── */

const MOCK_USER = {
  fullName: 'Beril Serbest',
  email: 'beril@sabanciuniv.edu',
  phone: '+90 532 000 00 00',
  avatar: null,
};

const MOCK_ORDERS = [
  {
    id: 'SCY-2026-0418',
    placedAt: '2026-04-18',
    status: 'in-transit',
    total: 1840,
    items: [
      { id: 1, name: 'Shell Crochet Top', qty: 1, price: 990, image: null },
      { id: 2, name: 'Dune Bucket Hat', qty: 1, price: 850, image: null },
    ],
  },
  {
    id: 'SCY-2026-0411',
    placedAt: '2026-04-11',
    status: 'processing',
    total: 620,
    items: [{ id: 3, name: 'Tide Pool Bag', qty: 1, price: 620, image: null }],
  },
  {
    id: 'SCY-2026-0322',
    placedAt: '2026-03-22',
    status: 'delivered',
    total: 1450,
    items: [
      { id: 4, name: 'Seafoam Cardigan', qty: 1, price: 1450, image: null },
    ],
  },
  {
    id: 'SCY-2026-0215',
    placedAt: '2026-02-15',
    status: 'delivered',
    total: 720,
    items: [{ id: 5, name: 'Coral Scarf', qty: 2, price: 360, image: null }],
  },
];

const MOCK_ADDRESSES = [
  {
    id: 1,
    label: 'Home',
    recipient: 'Beril Serbest',
    line1: 'Orta Mah. Üniversite Cad. No:27',
    city: 'Tuzla / İstanbul',
    postal: '34956',
    country: 'Türkiye',
    isDefault: true,
  },
  {
    id: 2,
    label: 'Campus',
    recipient: 'Beril Serbest',
    line1: 'Sabancı Üniversitesi, Yurtlar',
    city: 'Tuzla / İstanbul',
    postal: '34956',
    country: 'Türkiye',
    isDefault: false,
  },
];

/* ─── Helpers ──────────────────────────────────────── */

function formatPrice(price) {
  return '₺' + Number(price).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function initialsOf(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const ORDER_STEPS = ['processing', 'in-transit', 'delivered'];
const STEP_LABELS = {
  'processing': 'Processing',
  'in-transit': 'In Transit',
  'delivered': 'Delivered',
};

/* ─── Page ─────────────────────────────────────────── */

export default function ProfilePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState(MOCK_USER);
  const [orders] = useState(MOCK_ORDERS);
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <>
      <style>{`
        .pf-shell { grid-template-columns: 260px 1fr; }
        @media (max-width: 860px) { .pf-shell { grid-template-columns: 1fr; } .pf-sidebar { position: static !important; } }
        .pf-tab:hover { background-color: var(--color-blue) !important; }
        .pf-tab-active { background-color: var(--color-blue-hover) !important; color: var(--color-black) !important; }
        .pf-btn-primary:hover { background-color: var(--color-yellow-hover) !important; }
        .pf-btn-ghost:hover { background-color: var(--color-blue) !important; }
        .pf-btn-danger:hover { background-color: var(--color-error) !important; color: #991b1b !important; }
        .pf-input:focus { border-color: var(--color-border-focus) !important; outline: none; }
        .pf-link:hover { opacity: 0.65; }
        .pf-avatar-upload:hover .pf-avatar-overlay { opacity: 1 !important; }
      `}</style>

      <Navbar />

      <div style={styles.page}>
        <header style={styles.header}>
          <p style={styles.eyebrow}>Your Account</p>
          <h1 style={styles.title}>Hello, {user.fullName.split(' ')[0]}</h1>
          <p style={styles.subtitle}>
            Manage your profile, orders, and everything in between.
          </p>
        </header>

        <div style={styles.shell} className="pf-shell">
          {/* Sidebar */}
          <aside style={styles.sidebar} className="pf-sidebar">
            <SidebarTab icon={<User size={18} />} label="Profile" active={tab === 'profile'} onClick={() => setTab('profile')} />
            <SidebarTab icon={<Package size={18} />} label="Orders" active={tab === 'orders'} onClick={() => setTab('orders')} />
            <SidebarTab icon={<Lock size={18} />} label="Security" active={tab === 'security'} onClick={() => setTab('security')} />
            <SidebarTab icon={<MapPin size={18} />} label="Addresses" active={tab === 'addresses'} onClick={() => setTab('addresses')} />

            <div style={styles.sidebarDivider} />

            <button
              className="pf-tab pf-btn-danger"
              style={{ ...styles.sidebarTab, color: '#991b1b' }}
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </aside>

          {/* Main */}
          <main style={styles.main}>
            {tab === 'profile' && (
              <ProfileSection user={user} setUser={setUser} onSaved={() => showToast('Profile updated')} />
            )}
            {tab === 'orders' && <OrdersSection orders={orders} />}
            {tab === 'security' && <SecuritySection email={user.email} onDone={showToast} />}
            {tab === 'addresses' && (
              <AddressesSection
                addresses={addresses}
                setAddresses={setAddresses}
                onChanged={showToast}
              />
            )}
          </main>
        </div>
      </div>

      {logoutOpen && (
        <Modal onClose={() => setLogoutOpen(false)}>
          <h2 style={styles.modalTitle}>Log out?</h2>
          <p style={styles.modalBody}>
            You'll need to sign in again to access your account.
          </p>
          <div style={styles.modalActions}>
            <button className="pf-btn-ghost" style={styles.btnGhost} onClick={() => setLogoutOpen(false)}>
              Cancel
            </button>
            <button className="pf-btn-primary" style={styles.btnPrimary} onClick={handleLogout}>
              LOG OUT
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} />}

      <Footer />
    </>
  );
}

/* ─── Sidebar tab ───────────────────────────────────── */

function SidebarTab({ icon, label, active, onClick }) {
  return (
    <button
      className={'pf-tab ' + (active ? 'pf-tab-active' : '')}
      style={styles.sidebarTab}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
    </button>
  );
}

/* ─── Profile section ───────────────────────────────── */

function ProfileSection({ user, setUser, onSaved }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState(user);

  const dirty =
    form.fullName !== user.fullName ||
    form.phone !== user.phone ||
    form.avatar !== user.avatar;

  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatar: reader.result }));
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setForm((f) => ({ ...f, avatar: null }));
  }

  function save() {
    setUser(form);
    onSaved?.();
  }

  function reset() {
    setForm(user);
  }

  return (
    <Card>
      <SectionHeader title="Profile details" subtitle="This is how others will see you on Scylla." />

      {/* Avatar */}
      <div style={styles.avatarRow}>
        <div className="pf-avatar-upload" style={styles.avatarWrap} onClick={() => fileRef.current?.click()}>
          {form.avatar ? (
            <img src={form.avatar} alt="Avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarFallback}>{initialsOf(form.fullName || 'U')}</div>
          )}
          <div className="pf-avatar-overlay" style={styles.avatarOverlay}>
            <Camera size={22} color="var(--color-white)" />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickFile}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <button className="pf-btn-ghost" style={styles.btnGhost} onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> Upload new photo
          </button>
          {form.avatar && (
            <button className="pf-link" style={styles.linkDanger} onClick={removeAvatar}>
              <Trash2 size={14} /> Remove photo
            </button>
          )}
          <p style={styles.hint}>PNG or JPG, up to 5MB.</p>
        </div>
      </div>

      <Divider />

      {/* Fields */}
      <div style={styles.fieldGrid}>
        <Field label="Full name">
          <input
            className="pf-input"
            style={styles.input}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </Field>

        <Field label="Email" hint="To change email, contact support.">
          <input
            className="pf-input"
            style={{ ...styles.input, color: 'var(--color-charcoal-light)' }}
            value={form.email}
            readOnly
          />
        </Field>

        <Field label="Phone">
          <input
            className="pf-input"
            style={styles.input}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+90 ..."
          />
        </Field>
      </div>

      <div style={styles.footerActions}>
        <button className="pf-btn-ghost" style={styles.btnGhost} disabled={!dirty} onClick={reset}>
          Cancel
        </button>
        <button
          className="pf-btn-primary"
          style={{ ...styles.btnPrimary, opacity: dirty ? 1 : 0.5, cursor: dirty ? 'pointer' : 'not-allowed' }}
          disabled={!dirty}
          onClick={save}
        >
          SAVE CHANGES
        </button>
      </div>
    </Card>
  );
}

/* ─── Orders section ───────────────────────────────── */

function OrdersSection({ orders }) {
  const [view, setView] = useState('active');
  const active = orders.filter((o) => o.status !== 'delivered');
  const past = orders.filter((o) => o.status === 'delivered');
  const list = view === 'active' ? active : past;

  return (
    <Card>
      <SectionHeader title="Your orders" subtitle="Track shipments and revisit past purchases." />

      <div style={styles.pillRow}>
        <Pill active={view === 'active'} onClick={() => setView('active')}>
          Active <span style={styles.pillCount}>{active.length}</span>
        </Pill>
        <Pill active={view === 'past'} onClick={() => setView('past')}>
          Past <span style={styles.pillCount}>{past.length}</span>
        </Pill>
      </div>

      {list.length === 0 ? (
        <EmptyMini
          icon={<Package size={32} strokeWidth={1.5} />}
          heading={view === 'active' ? 'No active orders' : 'No past orders yet'}
          body={view === 'active'
            ? 'When you place an order, you\'ll be able to track it here.'
            : 'Your delivered orders will appear here.'}
        />
      ) : (
        <div style={styles.orderList}>
          {list.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </Card>
  );
}

function OrderCard({ order }) {
  const stepIdx = ORDER_STEPS.indexOf(order.status);

  return (
    <div style={styles.orderCard}>
      <div style={styles.orderHead}>
        <div>
          <p style={styles.orderIdLabel}>Order</p>
          <p style={styles.orderId}>{order.id}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={styles.orderIdLabel}>Placed</p>
          <p style={styles.orderMeta}>{formatDate(order.placedAt)}</p>
        </div>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {ORDER_STEPS.map((step, i) => {
          const done = i <= stepIdx;
          const isCurrent = i === stepIdx;
          const Icon = step === 'processing' ? Clock : step === 'in-transit' ? Truck : CheckCircle2;
          return (
            <div key={step} style={styles.timelineStep}>
              <div style={{
                ...styles.timelineDot,
                backgroundColor: done ? 'var(--color-yellow)' : 'var(--color-white)',
                borderColor: done ? 'var(--color-charcoal)' : 'var(--color-border)',
              }}>
                <Icon size={14} color={done ? 'var(--color-black)' : 'var(--color-charcoal-light)'} />
              </div>
              <span style={{
                ...styles.timelineLabel,
                color: isCurrent ? 'var(--color-black)' : 'var(--color-charcoal-light)',
                fontWeight: isCurrent ? 'var(--weight-semibold)' : 'var(--weight-regular)',
              }}>
                {STEP_LABELS[step]}
              </span>
              {i < ORDER_STEPS.length - 1 && (
                <div style={{
                  ...styles.timelineLine,
                  backgroundColor: i < stepIdx ? 'var(--color-charcoal)' : 'var(--color-border)',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Items */}
      <div style={styles.orderItems}>
        {order.items.map((it) => (
          <div key={it.id} style={styles.orderItem}>
            <div style={styles.orderThumb}>
              {it.image
                ? <img src={it.image} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Package size={20} color="var(--color-charcoal-light)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.orderItemName}>{it.name}</p>
              <p style={styles.orderItemMeta}>Qty {it.qty}</p>
            </div>
            <p style={styles.orderItemPrice}>{formatPrice(it.price)}</p>
          </div>
        ))}
      </div>

      <div style={styles.orderFooter}>
        <div>
          <p style={styles.orderIdLabel}>Total</p>
          <p style={styles.orderTotal}>{formatPrice(order.total)}</p>
        </div>
        <div style={styles.orderActions}>
          {order.status !== 'delivered' ? (
            <button className="pf-btn-ghost" style={styles.btnGhost}>Track order</button>
          ) : (
            <>
              <button className="pf-btn-ghost" style={styles.btnGhost}>Invoice</button>
              <button className="pf-btn-ghost" style={styles.btnGhost}>Request return</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Security section ─────────────────────────────── */

function SecuritySection({ email, onDone }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <SectionHeader title="Security" subtitle="Keep your account safe." />

      <SettingRow
        icon={<Lock size={20} />}
        title="Password"
        desc="Last changed · never"
        action={
          <button className="pf-btn-ghost" style={styles.btnGhost} onClick={() => setOpen(true)}>
            Change password
          </button>
        }
      />

      <SettingRow
        icon={<Mail size={20} />}
        title="Email"
        desc={email}
        action={<span style={styles.verifiedBadge}>VERIFIED</span>}
      />

      {open && (
        <ChangePasswordModal
          email={email}
          onClose={() => setOpen(false)}
          onDone={(msg) => { setOpen(false); onDone?.(msg); }}
        />
      )}
    </Card>
  );
}

function ChangePasswordModal({ email, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [err, setErr] = useState(null);

  const strength =
    next.length === 0 ? 0
    : next.length < 8 ? 1
    : /[A-Z]/.test(next) && /\d/.test(next) && next.length >= 10 ? 3
    : 2;
  const strengthLabel = ['', 'Weak', 'Okay', 'Strong'][strength];
  const strengthColor = ['', 'var(--color-error)', 'var(--color-warning)', 'var(--color-success)'][strength];

  function submit() {
    setErr(null);
    if (!current) return setErr('Enter your current password.');
    if (next.length < 8) return setErr('New password must be at least 8 characters.');
    if (next !== confirm) return setErr('New passwords do not match.');
    setStep(2);
  }

  return (
    <Modal onClose={onClose} wide>
      {step === 1 && (
        <>
          <h2 style={styles.modalTitle}>Change password</h2>
          <p style={styles.modalBody}>
            For your security, we'll email you a confirmation link before the change takes effect.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <Field label="Current password">
              <div style={styles.passwordWrap}>
                <input
                  className="pf-input"
                  style={styles.input}
                  type={showCurrent ? 'text' : 'password'}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
                <button style={styles.eyeBtn} onClick={() => setShowCurrent((v) => !v)} type="button">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="New password">
              <div style={styles.passwordWrap}>
                <input
                  className="pf-input"
                  style={styles.input}
                  type={showNext ? 'text' : 'password'}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
                <button style={styles.eyeBtn} onClick={() => setShowNext((v) => !v)} type="button">
                  {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {next && (
                <div style={styles.strengthRow}>
                  <div style={styles.strengthBar}>
                    <div style={{
                      ...styles.strengthFill,
                      width: `${(strength / 3) * 100}%`,
                      backgroundColor: strengthColor,
                    }} />
                  </div>
                  <span style={{ ...styles.hint, color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </Field>

            <Field label="Confirm new password">
              <input
                className="pf-input"
                style={styles.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>

            {err && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} /> {err}
              </div>
            )}
          </div>

          <div style={styles.modalActions}>
            <button className="pf-btn-ghost" style={styles.btnGhost} onClick={onClose}>Cancel</button>
            <button className="pf-btn-primary" style={styles.btnPrimary} onClick={submit}>
              SEND CONFIRMATION EMAIL
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center' }}>
          <div style={styles.mailIconWrap}>
            <div style={styles.mailIconHalo} />
            <Mail size={38} strokeWidth={1.5} style={{ position: 'relative', color: 'var(--color-charcoal)' }} />
          </div>
          <h2 style={styles.modalTitle}>Check your email</h2>
          <p style={styles.modalBody}>
            We've sent a confirmation link to <strong>{email}</strong>. Click the link within 15 minutes to finalize your new password.
          </p>
          <p style={{ ...styles.hint, marginTop: 'var(--space-4)' }}>
            Didn't get it? Check your spam folder or{' '}
            <button className="pf-link" style={styles.inlineLink}>resend email</button>.
          </p>
          <div style={{ ...styles.modalActions, justifyContent: 'center' }}>
            <button className="pf-btn-primary" style={styles.btnPrimary} onClick={() => onDone('Confirmation email sent')}>
              DONE
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Addresses section ────────────────────────────── */

function AddressesSection({ addresses, setAddresses, onChanged }) {
  const [editing, setEditing] = useState(null);

  function setDefault(id) {
    setAddresses((list) => list.map((a) => ({ ...a, isDefault: a.id === id })));
    onChanged?.('Default address updated');
  }

  function remove(id) {
    setAddresses((list) => list.filter((a) => a.id !== id));
    onChanged?.('Address removed');
  }

  function save(addr) {
    setAddresses((list) => {
      if (addr.id) return list.map((a) => (a.id === addr.id ? addr : a));
      return [...list, { ...addr, id: Date.now() }];
    });
    setEditing(null);
    onChanged?.('Address saved');
  }

  return (
    <Card>
      <SectionHeader
        title="Addresses"
        subtitle="Where should we ship your orders?"
        action={
          <button className="pf-btn-primary" style={styles.btnPrimary} onClick={() => setEditing({})}>
            <Plus size={16} /> ADD ADDRESS
          </button>
        }
      />

      {addresses.length === 0 ? (
        <EmptyMini
          icon={<MapPin size={32} strokeWidth={1.5} />}
          heading="No addresses yet"
          body="Add a shipping address to speed up checkout."
        />
      ) : (
        <div style={styles.addressGrid}>
          {addresses.map((a) => (
            <AddressCard key={a.id} address={a} onEdit={() => setEditing(a)} onDelete={() => remove(a.id)} onDefault={() => setDefault(a.id)} />
          ))}
        </div>
      )}

      {editing && (
        <AddressEditorModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </Card>
  );
}

function AddressCard({ address, onEdit, onDelete, onDefault }) {
  return (
    <div style={styles.addressCard}>
      <div style={styles.addressHead}>
        <span style={styles.addressLabel}>{address.label}</span>
        {address.isDefault && <span style={styles.defaultBadge}>DEFAULT</span>}
      </div>
      <p style={styles.addressRecipient}>{address.recipient}</p>
      <p style={styles.addressLine}>{address.line1}</p>
      <p style={styles.addressLine}>{address.city} · {address.postal}</p>
      <p style={styles.addressLine}>{address.country}</p>

      <div style={styles.addressActions}>
        {!address.isDefault && (
          <button className="pf-link" style={styles.inlineLink} onClick={onDefault}>
            Set as default
          </button>
        )}
        <button className="pf-link" style={styles.inlineLink} onClick={onEdit}>Edit</button>
        {!address.isDefault && (
          <button className="pf-link" style={{ ...styles.inlineLink, color: '#991b1b' }} onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function AddressEditorModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    id: initial.id,
    label: initial.label || '',
    recipient: initial.recipient || '',
    line1: initial.line1 || '',
    city: initial.city || '',
    postal: initial.postal || '',
    country: initial.country || 'Türkiye',
    isDefault: initial.isDefault || false,
  });

  const valid = form.label && form.recipient && form.line1 && form.city;

  return (
    <Modal onClose={onClose} wide>
      <h2 style={styles.modalTitle}>{initial.id ? 'Edit address' : 'Add address'}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <Field label="Label"><input className="pf-input" style={styles.input} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home, Campus..." /></Field>
        <Field label="Recipient"><input className="pf-input" style={styles.input} value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></Field>
        <Field label="Street address" full><input className="pf-input" style={styles.input} value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></Field>
        <Field label="City"><input className="pf-input" style={styles.input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label="Postal code"><input className="pf-input" style={styles.input} value={form.postal} onChange={(e) => setForm({ ...form, postal: e.target.value })} /></Field>
        <Field label="Country" full><input className="pf-input" style={styles.input} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
      </div>

      <div style={styles.modalActions}>
        <button className="pf-btn-ghost" style={styles.btnGhost} onClick={onClose}>Cancel</button>
        <button
          className="pf-btn-primary"
          style={{ ...styles.btnPrimary, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
          disabled={!valid}
          onClick={() => onSave(form)}
        >
          SAVE ADDRESS
        </button>
      </div>
    </Modal>
  );
}

/* ─── Shared UI ──────────────────────────────────── */

function Card({ children }) {
  return <div style={styles.card}>{children}</div>;
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {subtitle && <p style={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Field({ label, hint, children, full }) {
  return (
    <div style={{ ...styles.field, ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={styles.label}>{label}</label>
      {children}
      {hint && <p style={styles.hint}>{hint}</p>}
    </div>
  );
}

function SettingRow({ icon, title, desc, action }) {
  return (
    <div style={styles.settingRow}>
      <div style={styles.settingIcon}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={styles.settingTitle}>{title}</p>
        <p style={styles.settingDesc}>{desc}</p>
      </div>
      {action}
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      style={{
        ...styles.pill,
        backgroundColor: active ? 'var(--color-black)' : 'var(--color-white)',
        color: active ? 'var(--color-sand)' : 'var(--color-charcoal)',
        borderColor: active ? 'var(--color-black)' : 'var(--color-border)',
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

function EmptyMini({ icon, heading, body }) {
  return (
    <div style={styles.emptyMini}>
      <div style={styles.emptyMiniIcon}>{icon}</div>
      <p style={styles.emptyMiniHeading}>{heading}</p>
      <p style={styles.emptyMiniBody}>{body}</p>
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: wide ? 520 : 420 }} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Toast({ message }) {
  return (
    <div style={styles.toast}>
      <Check size={16} /> {message}
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────── */

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-sand)',
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: 'var(--space-12) var(--container-pad) var(--space-16)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--space-10)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    alignItems: 'center',
  },
  eyebrow: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--color-charcoal-light)',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-4xl)',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-tight)',
    color: 'var(--color-black)',
  },
  subtitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
    maxWidth: '480px',
  },

  shell: {
    display: 'grid',
    gap: 'var(--space-8)',
    alignItems: 'start',
  },

  /* Sidebar */
  sidebar: {
    position: 'sticky',
    top: 'calc(var(--navbar-height) + var(--space-4))',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
  },
  sidebarTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    background: 'transparent',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    textAlign: 'left',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'var(--color-border)',
    margin: 'var(--space-2) 0',
  },

  /* Main */
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },

  /* Card */
  card: {
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-8)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-card)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  },
  sectionTitle: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-tight)',
    color: 'var(--color-black)',
  },
  sectionSubtitle: {
    margin: 'var(--space-1) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },

  divider: {
    height: 1,
    backgroundColor: 'var(--color-border)',
    margin: 'var(--space-6) 0',
  },

  /* Avatar */
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-6)',
    flexWrap: 'wrap',
  },
  avatarWrap: {
    position: 'relative',
    width: 110,
    height: 110,
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '2px solid var(--color-border)',
    flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-blue)',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    color: 'var(--color-black)',
    letterSpacing: 'var(--tracking-wide)',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(26,26,26,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity var(--transition-fast)',
  },

  /* Fields */
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--space-5)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--color-charcoal-light)',
  },
  input: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    backgroundColor: 'var(--color-white)',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
    boxSizing: 'border-box',
  },
  hint: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    fontStyle: 'italic',
  },
  inlineEditRow: { display: 'flex', gap: 'var(--space-2)', alignItems: 'stretch' },
  inlineReadRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-sand)',
  },
  readValue: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-black)',
    fontWeight: 'var(--weight-medium)',
  },

  footerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-8)',
  },

  /* Buttons */
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), opacity var(--transition-fast)',
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  iconBtnSquare: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    transition: 'background-color var(--transition-fast)',
  },
  inlineLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-border)',
    transition: 'opacity var(--transition-fast)',
  },
  linkDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: '#991b1b',
  },

  /* Settings rows */
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-5) 0',
    borderTop: '1px solid var(--color-border)',
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-charcoal)',
    flexShrink: 0,
  },
  settingTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
  },
  settingDesc: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  verifiedBadge: {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    backgroundColor: 'var(--color-success)',
    color: '#166534',
    padding: '4px var(--space-3)',
    borderRadius: 'var(--radius-sm)',
  },

  /* Password */
  passwordWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: 'var(--space-3)',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-charcoal-light)',
    padding: 'var(--space-1)',
  },
  strengthRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-1)',
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'var(--color-border)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    transition: 'width var(--transition-base), background-color var(--transition-base)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-error)',
    color: '#991b1b',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
  },

  /* Orders */
  pillRow: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-6)',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  pillCount: {
    fontSize: 'var(--text-xs)',
    opacity: 0.7,
  },
  orderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  orderCard: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    backgroundColor: 'var(--color-sand)',
  },
  orderHead: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-5)',
  },
  orderIdLabel: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
  },
  orderId: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
  },
  orderMeta: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  timeline: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: 'var(--space-4) 0',
    margin: '0 var(--space-2)',
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
    width: 32,
    height: 32,
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
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    right: '-50%',
    height: 2,
    zIndex: 0,
  },
  orderItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--color-border)',
  },
  orderItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
  },
  orderThumb: {
    width: 48,
    height: 48,
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  orderItemName: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
  },
  orderItemMeta: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
  },
  orderItemPrice: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
  },
  orderFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 'var(--space-4)',
    paddingTop: 'var(--space-4)',
    marginTop: 'var(--space-4)',
    borderTop: '1px solid var(--color-border)',
    flexWrap: 'wrap',
  },
  orderTotal: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-black)',
  },
  orderActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },

  /* Addresses */
  addressGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 'var(--space-4)',
  },
  addressCard: {
    position: 'relative',
    padding: 'var(--space-5)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-sand)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  addressHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-2)',
  },
  addressLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
  },
  defaultBadge: {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    padding: '3px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
  },
  addressRecipient: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
  },
  addressLine: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  addressActions: {
    marginTop: 'var(--space-4)',
    display: 'flex',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
  },

  /* Empty mini */
  emptyMini: {
    padding: 'var(--space-10) var(--space-4)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  emptyMiniIcon: {
    width: 72,
    height: 72,
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-2)',
  },
  emptyMiniHeading: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
  },
  emptyMiniBody: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    maxWidth: 360,
  },

  /* Modal */
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(26,26,26,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--container-pad)',
    zIndex: 500,
  },
  modal: {
    position: 'relative',
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-8)',
    width: '100%',
    boxShadow: 'var(--shadow-lg)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalClose: {
    position: 'absolute',
    top: 'var(--space-4)',
    right: 'var(--space-4)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    padding: 'var(--space-1)',
    display: 'flex',
  },
  modalTitle: {
    margin: '0 0 var(--space-2)',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-tight)',
    color: 'var(--color-black)',
  },
  modalBody: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    lineHeight: 1.6,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-6)',
  },

  /* Mail icon in email-sent step */
  mailIconWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto var(--space-4)',
  },
  mailIconHalo: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    backgroundColor: 'var(--color-blue)',
    opacity: 0.6,
  },

  /* Toast */
  toast: {
    position: 'fixed',
    bottom: 'var(--space-8)',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-sand)',
    padding: 'var(--space-3) var(--space-5)',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1000,
  },
};
