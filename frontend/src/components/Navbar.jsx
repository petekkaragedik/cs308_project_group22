import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart, User, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

/* ─── Helpers ─────────────────────────────────────────── */

function formatPrice(price) {
  return '₺' + price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Navbar ──────────────────────────────────────────── */

export default function Navbar() {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { cartCount } = useCart();
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setAllProducts(data))
      .catch(() => {});
  }, []);

  function openOverlay() { setOverlayOpen(true); }
  function closeOverlay() { setOverlayOpen(false); }

  return (
    <>
      <nav style={styles.navbar}>
        <Link to="/products" style={styles.navBrand}>SCYLLA</Link>
        <div style={styles.navIcons}>
          <button
            style={styles.iconBtn}
            aria-label="Search"
            onClick={openOverlay}
          >
            <Search size={22} />
          </button>
          <Link to="/wishlist" style={styles.iconBtn} aria-label="Wishlist">
            <Heart size={22} />
          </Link>
          <Link to="/cart" style={styles.cartBtn} aria-label="Cart">
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span style={styles.badge}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <Link to="/login" style={styles.iconBtn} aria-label="Account">
            <User size={22} />
          </Link>
        </div>
      </nav>

      {overlayOpen && <SearchOverlay onClose={closeOverlay} allProducts={allProducts} />}
    </>
  );
}

/* ─── Search Overlay ──────────────────────────────────── */

function SearchOverlay({ onClose, allProducts }) {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const searchPool = useMemo(() => {
    const seen = new Set();
    return allProducts.filter((p) => {
      const key = `${p.model}|${p.color}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allProducts]);

  /* Fade in on mount */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Auto-focus input */
  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  /* Escape key closes overlay */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* Search results */
  const results = query.trim()
    ? searchPool.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.categoryName.toLowerCase().includes(q)
        );
      })
    : [];

  function handleRowClick(id) {
    onClose();
    navigate(`/products/${id}`);
  }

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: visible ? 1 : 0,
      }}
    >
      <style>{`
        .search-row:hover { background-color: var(--color-blue) !important; }
        .search-close-btn:hover { opacity: 0.7 !important; }
        .search-input::placeholder { color: var(--color-charcoal-light); font-style: italic; }
        .search-results { scrollbar-width: thin; scrollbar-color: var(--color-border) transparent; }
        .search-results::-webkit-scrollbar { width: 4px; }
        .search-results::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: var(--radius-full); }
        .search-results::-webkit-scrollbar-track { background: transparent; }
        @media (max-width: 640px) {
          .search-input-wrap { width: 90vw !important; }
        }
      `}</style>

      {/* ── Overlay top bar (mirrors navbar) ── */}
      <div style={styles.overlayBar}>
        <span style={styles.navBrand}>SCYLLA</span>
        <button
          className="search-close-btn"
          onClick={onClose}
          style={styles.closeBtn}
          aria-label="Close search"
        >
          <X size={24} />
        </button>
      </div>

      {/* ── Search area ── */}
      <div style={styles.searchArea}>

        {/* Input */}
        <div className="search-input-wrap" style={styles.inputWrap}>
          <Search size={16} style={styles.inputIcon} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products..."
            className="search-input"
            style={styles.input}
          />
        </div>

        {/* Results */}
        {query.trim() && (
          <>
            {results.length > 0 && (
              <div className="search-input-wrap" style={styles.resultCountRow}>
                <span style={styles.resultCount}>
                  {results.length} {results.length === 1 ? 'result' : 'results'} for '{query.trim()}'
                </span>
              </div>
            )}
            <div className="search-input-wrap search-results" style={styles.resultsList}>
              {results.length > 0
                ? results.map((p) => (
                    <ResultRow key={`${p.model}|${p.color}`} product={p} onClick={handleRowClick} />
                  ))
                : (
                  <p style={styles.emptyMsg}>
                    No products found for '{query}'
                  </p>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Result Row ──────────────────────────────────────── */

function ResultRow({ product, onClick }) {
  const outOfStock = product.quantityInStock === 0;

  return (
    <div
      className="search-row"
      onClick={() => onClick(product.id)}
      style={styles.row}
    >
      <img
        src={product.images[0]}
        alt={product.name}
        style={styles.thumb}
      />
      <div style={styles.rowInfo}>
        <span style={styles.rowName}>{product.name}</span>
        <span style={styles.rowCategory}>{product.categoryName}</span>
      </div>
      <div style={styles.rowRight}>
        {outOfStock && (
          <span style={styles.outBadge}>OUT OF STOCK</span>
        )}
        <span style={styles.rowPrice}>{formatPrice(product.price)}</span>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────── */

const styles = {
  /* Navbar */
  navbar: {
    position: 'sticky',
    top: 0,
    zIndex: 200,
    height: 'var(--navbar-height)',
    backgroundColor: 'var(--color-sand)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--container-pad)',
  },
  navBrand: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-wider)',
    color: 'var(--color-black)',
    textDecoration: 'none',
  },
  navIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
  },
  cartBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    minWidth: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },

  /* Overlay */
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 999,
    backgroundColor: 'var(--color-sand)',
    transition: 'opacity var(--transition-slow)',
    overflowY: 'auto',
  },
  overlayBar: {
    height: 'var(--navbar-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--container-pad)',
    borderBottom: '1px solid var(--color-border)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    transition: 'opacity var(--transition-fast)',
  },

  /* Search area */
  searchArea: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '0 var(--container-pad)',
  },

  /* Input */
  inputWrap: {
    width: '600px',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    borderBottom: '2px solid var(--color-charcoal)',
    paddingBottom: 'var(--space-2)',
  },
  inputIcon: {
    flexShrink: 0,
    color: 'var(--color-charcoal-light)',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-2xl)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal)',
  },

  /* Results */
  resultCountRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: 'var(--space-1)',
    paddingBottom: 'var(--space-1)',
  },
  resultCount: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal-light)',
  },
  resultsList: {
    width: '600px',
    marginTop: 0,
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    maxHeight: '50vh',
    overflowY: 'auto',
    scrollBehavior: 'smooth',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  thumb: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  rowName: {
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-black)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowCategory: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  rowRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  rowPrice: {
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-bold)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  outBadge: {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    backgroundColor: 'var(--color-error)',
    color: '#991b1b',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
  },

  /* Empty state */
  emptyMsg: {
    margin: 0,
    padding: 'var(--space-6)',
    textAlign: 'center',
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-xl)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal-light)',
  },
};
