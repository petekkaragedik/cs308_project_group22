import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─── Helpers ─────────────────────────────────────────── */

function formatPrice(price) {
  return '₺' + price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Page ────────────────────────────────────────────── */

export default function WishlistPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError('auth');
      return;
    }

    fetch('/api/favorites', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) throw new Error('auth');
        if (!res.ok) throw new Error('fetch');
        return res.json();
      })
      .then((data) => {
        setFavorites(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message === 'auth' ? 'auth' : 'fetch');
        setLoading(false);
      });
  }, []);

  return (
    <>
      <style>{`
        .wl-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) { .wl-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .wl-grid { grid-template-columns: 1fr; } }
        .wl-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .wl-btn:hover { background-color: var(--color-yellow-hover) !important; }
      `}</style>

      <Navbar />

      <div style={styles.page}>
        <header style={styles.header}>
          <p style={styles.eyebrow}>Your Collection</p>
          <h1 style={styles.title}>Wishlist</h1>
        </header>

        {loading && <Message text="Loading..." />}

        {!loading && error === 'auth' && (
          <EmptyState
            heading="Sign in to see your wishlist"
            body="Save the pieces you love and find them here anytime."
            cta="SIGN IN"
            onCta={() => navigate('/login')}
          />
        )}

        {!loading && error === 'fetch' && (
          <Message text="Couldn't load your wishlist. Please try again." />
        )}

        {!loading && !error && favorites.length === 0 && (
          <EmptyState
            heading="No favorites yet"
            body="Browse the collection and tap the heart to save pieces you love."
            cta="SHOP THE COLLECTION"
            onCta={() => navigate('/products')}
          />
        )}

        {!loading && !error && favorites.length > 0 && (
          <>
            <p style={styles.count}>
              {favorites.length} {favorites.length === 1 ? 'item' : 'items'}
            </p>
            <div style={styles.grid} className="wl-grid">
              {favorites.map((p) => (
                <WishlistCard
                  key={p.id}
                  product={p}
                  onClick={() => navigate(`/products/${p.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}

/* ─── Card ────────────────────────────────────────────── */

function WishlistCard({ product, onClick }) {
  const inStock = product.quantityInStock > 0;
  const image = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : null;

  return (
    <div className="wl-card" style={styles.card} onClick={onClick}>
      <div style={styles.imageWrap}>
        {image && (
          <img
            src={image}
            alt={product.name}
            style={{
              ...styles.image,
              ...(!inStock ? { filter: 'grayscale(60%)', opacity: 0.65 } : {}),
            }}
          />
        )}
        <span style={{ ...styles.badge, ...(inStock ? styles.badgeIn : styles.badgeOut) }}>
          {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
        </span>
      </div>

      <div style={styles.body}>
        <p style={styles.category}>{product.categoryName}</p>
        <p style={styles.name}>{product.name}</p>
        <p style={styles.price}>{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}

/* ─── Empty state / Message ───────────────────────────── */

function EmptyState({ heading, body, cta, onCta }) {
  return (
    <div style={styles.empty}>
      <h2 style={styles.emptyHeading}>{heading}</h2>
      <p style={styles.emptyBody}>{body}</p>
      <button className="wl-btn" style={styles.button} onClick={onCta}>
        {cta}
      </button>
    </div>
  );
}

function Message({ text }) {
  return <p style={styles.message}>{text}</p>;
}

/* ─── Styles ──────────────────────────────────────────── */

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
  count: {
    margin: '0 0 var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    textAlign: 'right',
  },

  /* Grid */
  grid: {
    display: 'grid',
    gap: 'var(--space-6)',
  },

  /* Card */
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-card)',
    transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
    display: 'flex',
    flexDirection: 'column',
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: '3 / 4',
    objectFit: 'cover',
    display: 'block',
  },
  badge: {
    position: 'absolute',
    top: 'var(--space-3)',
    left: 'var(--space-3)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    fontFamily: 'var(--font-body)',
    padding: '3px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
  },
  badgeIn: {
    backgroundColor: 'var(--color-success)',
    color: '#166534',
  },
  badgeOut: {
    backgroundColor: 'var(--color-error)',
    color: '#991b1b',
  },
  body: {
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  category: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
  },
  name: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  price: {
    margin: 'var(--space-2) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-charcoal)',
  },

  /* Empty / message */
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-16) var(--container-pad)',
    textAlign: 'center',
  },
  emptyHeading: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
  },
  emptyBody: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
    maxWidth: '420px',
  },
  button: {
    padding: 'var(--space-3) var(--space-8)',
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
    transition: 'background-color var(--transition-fast)',
    marginTop: 'var(--space-2)',
  },
  message: {
    textAlign: 'center',
    fontFamily: 'var(--font-heading)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal-light)',
    fontSize: 'var(--text-lg)',
    padding: 'var(--space-12) 0',
  },
};
