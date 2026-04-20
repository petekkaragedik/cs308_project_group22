import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, ShoppingCart, CheckCheck, Star, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';

/* ─── Color map ───────────────────────────────────────── */

const COLOR_MAP = {
  'White': '#FFFFFF', 'Black': '#222222', 'Brown': '#8B5E3C',
  'Purple': '#9B59B6', 'Blue': '#3498DB', 'Red': '#E74C3C',
  'Beige': '#F5DEB3', 'Cream': '#FFFDD0', 'Grey': '#9E9E9E',
  'Yellow': '#FEF08A', 'Green': '#4CAF50', 'Water Green': '#7FFFD4',
  'Sage Green': '#87AE73', 'Gold Glow': '#FFD700', 'Sunshine': '#FFC300',
  'Anthracite': '#2D2D2D', 'Batik': '#8B6359', 'Beige-Orange-Black': '#D4723A',
  'Black Silver': '#404040', 'Black White': '#888888', 'Blue - White': '#5DADE2',
  'Blue Green': '#1ABC9C', 'Blue White': '#85C1E9', 'Blue White Black': '#2C3E50',
  'Brown - Orange Iridescent': '#CD7F32', 'Brown Cream': '#C4A27B',
  'Brown White': '#A0785A', 'Cream Beige': '#F0E6CF', 'Cream Light Yellow': '#FAFAD2',
  'Cyan-Purple': '#9B8EC4', 'Dark Magenta': '#8B008B', 'Ecru': '#FAF0E6',
  'Grey White': '#D3D3D3', 'Khaki': '#BDB76B', 'Lavender': '#B57EDC',
  'Light Brown Beige': '#D4B896', 'Light Brown White': '#C8A882', 'Lilac': '#C8A2C8',
  'Lilac-Pink': '#DDA0DD', 'Milky Brown': '#C4956A', 'Natural': '#D4C5A9',
  'Natural DK2': '#BCA88E', 'Navy': '#001F54', 'Navy Pink': '#1D3461',
  'Pink': '#FF69B4', 'Pink White': '#FFB6C1', 'Purple White': '#C39BD3',
  'Raw': '#E8D5B0', 'Red - White': '#E74C3C', 'Red Star': '#C0392B',
  'Red White': '#E57373', 'Silver': '#C0C0C0', 'Silver-Grey': '#B0B7BF',
  'Terracotta': '#CC4E2A', 'Turquoise': '#40E0D0', 'White Beige': '#F5F0E8',
  'White Black': '#909090', 'White Blue': '#D6E4F0', 'White Milky Brown': '#EDE0CC',
  'White Purple': '#D7BDE2', 'White Turquoise': '#B2DFDB', 'Yellow-Navy': '#F1C40F',
};

const LIGHT_COLORS = new Set([
  'White', 'Cream', 'Ecru', 'Cream Beige', 'Cream Light Yellow', 'White Beige',
  'White Blue', 'White Milky Brown', 'White Purple', 'White Turquoise',
  'Grey White', 'Natural', 'Raw', 'Blue White', 'Pink White',
]);

function swatchBg(colorName) {
  if (colorName === 'Multicolor') return null;
  return COLOR_MAP[colorName] ?? '#A0A0A0';
}

function formatPrice(price) {
  return '₺' + price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fixEncoding(str) {
  if (!str) return str;
  try { return decodeURIComponent(escape(str)); } catch { return str; }
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

function sortSizes(arr) {
  return [...arr].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a), bi = SIZE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

/* ─── Hardcoded placeholder reviews ──────────────────── */

const PLACEHOLDER_REVIEWS = [
  {
    name: 'Ayşe K.',
    rating: 5,
    date: 'March 15, 2026',
    comment: 'Absolutely stunning quality! The crochet work is intricate and the fabric feels luxurious. Received so many compliments at the beach.',
  },
  {
    name: 'Sofia M.',
    rating: 4,
    date: 'February 28, 2026',
    comment: 'Beautiful piece, true to size. The color is exactly as shown in the photos. Shipping was fast too. Would definitely order again!',
  },
];

/* ─── Toast ───────────────────────────────────────────── */

function ToastContainer({ toasts }) {
  return (
    <div style={toastStyles.container}>
      {toasts.map((t) => <Toast key={t.id} message={t.message} />)}
    </div>
  );
}

function Toast({ message }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{
      ...toastStyles.toast,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(110%)',
    }}>
      <ShoppingCart size={16} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

const toastStyles = {
  container: {
    position: 'fixed',
    top: 'var(--space-6)',
    right: 'var(--space-6)',
    zIndex: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    transition: 'opacity var(--transition-base), transform var(--transition-base)',
    whiteSpace: 'nowrap',
  },
};

/* ─── Star row helper ─────────────────────────────────── */

function StarRow({ rating, size = 16 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= rating ? '#FBBF24' : 'none'}
          stroke={n <= rating ? '#FBBF24' : 'var(--color-border)'}
        />
      ))}
    </span>
  );
}

/* ─── Page ────────────────────────────────────────────── */

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [modelProducts, setModelProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // null | 'not_found' | 'error'

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setModelProducts([]);

    let fetchedProduct;

    fetch(`/api/products/${id}`)
      .then((res) => {
        if (res.status === 404) throw Object.assign(new Error(), { code: 'not_found' });
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((p) => {
        fetchedProduct = p;
        setProduct(p);
        return fetch('/api/products');
      })
      .then((res) => res.json())
      .then((all) => {
        setModelProducts(all.filter((p) => p.model === fetchedProduct.model));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.code === 'not_found' ? 'not_found' : 'error');
        setLoading(false);
      });
  }, [id]);

  /* One representative id per color (first entry found) */
  const colorVariants = useMemo(() => {
    const seen = new Set();
    const variants = [];
    for (const p of modelProducts) {
      if (!seen.has(p.color)) {
        seen.add(p.color);
        variants.push({ color: p.color, id: p.id });
      }
    }
    return variants;
  }, [modelProducts]);

  /* Sizes for the currently viewed color */
  const sizes = useMemo(() => {
    if (!product) return [];
    const raw = modelProducts
      .filter((p) => p.color === product.color)
      .map((p) => p.size)
      .filter((s, i, arr) => arr.indexOf(s) === i);
    return sortSizes(raw);
  }, [modelProducts, product]);

  /* Total stock across all sizes for this color variant */
  const totalStock = useMemo(() => {
    if (!product) return 0;
    return modelProducts
      .filter((p) => p.color === product.color)
      .reduce((sum, p) => sum + p.quantityInStock, 0);
  }, [modelProducts, product]);

  /* Stock per size: { 'S': 2, 'M': 0, ... } */
  const stockBySize = useMemo(() => {
    if (!product) return {};
    const map = {};
    for (const p of modelProducts) {
      if (p.color === product.color) map[p.size] = (map[p.size] ?? 0) + p.quantityInStock;
    }
    return map;
  }, [modelProducts, product]);

  /* ── Local state ── */
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [cartAdded, setCartAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbRowRef = useRef(null);
  const touchStartX = useRef(null);
  const mouseStartX = useRef(null);
  const wasDrag = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const goTo = useCallback((i) => {
    setActiveImage(i);
  }, []);

  const goPrev = useCallback(() => {
    setActiveImage((cur) => (cur > 0 ? cur - 1 : cur));
  }, []);

  const goNext = useCallback((len) => {
    setActiveImage((cur) => (cur < len - 1 ? cur + 1 : cur));
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    mouseStartX.current = e.clientX;
    wasDrag.current = false;
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback((e, len) => {
    if (mouseStartX.current === null) return;
    const delta = mouseStartX.current - e.clientX;
    wasDrag.current = Math.abs(delta) >= 10;
    if (Math.abs(delta) >= 50) {
      if (delta > 0) goNext(len); else goPrev();
    }
    mouseStartX.current = null;
    setIsDragging(false);
  }, [goNext, goPrev]);

  const handleMouseLeave = useCallback(() => {
    mouseStartX.current = null;
    setIsDragging(false);
  }, []);

  /* Auto-scroll thumbnail strip to keep active thumb visible */
  useEffect(() => {
    const row = thumbRowRef.current;
    if (!row) return;
    const thumb = row.children[activeImage];
    if (thumb) thumb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeImage]);


  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e, len) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) >= 50) {
      if (delta > 0) goNext(len); else goPrev();
    }
    touchStartX.current = null;
  }, [goNext, goPrev]);

  /* Scroll to top on mount */
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  /* Reset state + scroll to top when navigating between variants */
  useEffect(() => { setSelectedSize(null); setActiveImage(0); window.scrollTo({ top: 0, behavior: 'instant' }); }, [id]);

  /* Load initial wishlist state for this product */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) { setWishlisted(false); return; }
    fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((favs) => {
        setWishlisted(Array.isArray(favs) && favs.some((p) => String(p.id) === String(id)));
      })
      .catch(() => {});
  }, [id]);

  const toggleWishlist = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const next = !wishlisted;
    setWishlisted(next);
    try {
      const res = await fetch(
        next ? '/api/favorites' : `/api/favorites/${id}`,
        {
          method: next ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: next ? JSON.stringify({ product_id: id }) : undefined,
        }
      );
      if (!res.ok && res.status !== 409 && res.status !== 404) {
        setWishlisted(!next);
      }
    } catch {
      setWishlisted(!next);
    }
  }, [wishlisted, id, navigate]);

  /* ── Review form state ── */
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');

  function addToast(message) {
    const tid = Date.now();
    setToasts((prev) => [...prev, { id: tid, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== tid)), 2500);
  }

  function handleAddToCart() {
    if (!selectedSize || totalStock === 0) return;
    addItem(product.id, selectedSize);
    setCartAdded(true);
    addToast('Added to cart!');
    setTimeout(() => setCartAdded(false), 1500);
  }

  function handleSubmitReview() {
    addToast('Review submitted for approval!');
    setReviewRating(0);
    setReviewText('');
  }

  /* ── Loading / error / not-found ── */
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-charcoal-light)', fontSize: 'var(--text-xl)' }}>Loading...</span>
    </div>
  );

  if (error === 'not_found') return (
    <>
      <Navbar />
      <div style={styles.notFound}>
        <p style={styles.notFoundText}>Product not found.</p>
        <Link to="/products" style={styles.backLink}>← Back to all products</Link>
      </div>
      <Footer />
    </>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-charcoal-light)', fontSize: 'var(--text-xl)' }}>Could not load product. Please try again.</span>
    </div>
  );

  const inStock = totalStock > 0;
  const images = product.images ?? [];

  return (
    <>
      <style>{`
        .pdp-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-12);
          align-items: start;
        }
        @media (max-width: 768px) {
          .pdp-layout { grid-template-columns: 1fr; gap: var(--space-8); }
        }
        .pdp-thumb:hover { opacity: 0.8; }
        .pdp-size-pill:hover { border-color: var(--color-charcoal); }
        .pdp-cart-btn:hover:not(:disabled) { background-color: var(--color-yellow-hover) !important; }
        .pdp-wishlist-btn:hover { border-color: var(--color-blue) !important; }
        .pdp-swatch:hover { transform: scale(1.15); }
        .pdp-review-star:hover { cursor: pointer; }
        @keyframes pdp-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .pdp-lightbox-overlay { animation: pdp-fade-in var(--transition-base) both; }
        .pdp-lightbox-arrow:hover { background: rgba(0,0,0,0.5) !important; }
        .pdp-lightbox-close:hover { opacity: 0.75; }
        .pdp-main-img-wrap:hover .pdp-zoom-hint { opacity: 1 !important; }
        .pdp-img-arrow { opacity: 0; transition: opacity var(--transition-base), background var(--transition-fast); }
        .pdp-main-img-wrap:hover .pdp-img-arrow { opacity: 1; }
        .pdp-img-arrow:hover { background: rgba(255,255,255,0.92) !important; }
      `}</style>

      <Navbar />

      <div style={styles.page}>
        {/* ── Breadcrumb ── */}
        <div style={styles.breadcrumb}>
          <Link to="/products" style={styles.breadcrumbLink}>All Products</Link>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbCurrent}>{product.categoryName}</span>
        </div>

        {/* ── Two-column layout ── */}
        <div className="pdp-layout" style={{ marginTop: 'var(--space-6)' }}>

          {/* ── LEFT: Image Gallery ── */}
          <div>
            {/* Main image */}
            <div
              className="pdp-main-img-wrap"
              style={{ ...styles.mainImageWrap, cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => images.length > 1 && handleMouseDown(e)}
              onMouseUp={(e) => images.length > 1 && handleMouseUp(e, images.length)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => images.length > 1 && handleTouchEnd(e, images.length)}
            >
              {images.length > 0 && (
                <img
                  src={images[activeImage]}
                  alt={fixEncoding(product.name)}
                  draggable="false"
                  style={{ ...styles.mainImage, cursor: 'inherit' }}
                  onClick={() => { if (!wasDrag.current) setLightboxOpen(true); }}
                />
              )}

              {/* Prev arrow */}
              {images.length > 1 && activeImage > 0 && (
                <button
                  className="pdp-img-arrow pdp-img-arrow-left"
                  style={{ ...styles.imgArrow, left: 'var(--space-3)' }}
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Next arrow */}
              {images.length > 1 && activeImage < images.length - 1 && (
                <button
                  className="pdp-img-arrow pdp-img-arrow-right"
                  style={{ ...styles.imgArrow, right: 'var(--space-3)' }}
                  onClick={(e) => { e.stopPropagation(); goNext(images.length); }}
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* Stock badge */}
              <span style={{ ...styles.badge, ...(inStock ? styles.badgeIn : styles.badgeOut) }}>
                {inStock ? `IN STOCK — ${totalStock} left` : 'OUT OF STOCK'}
              </span>

              {/* Zoom hint */}
              <span className="pdp-zoom-hint" style={styles.zoomHint}>
                <ZoomIn size={20} />
              </span>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div ref={thumbRowRef} style={styles.thumbRow}>
                {images.map((src, i) => (
                  <button
                    key={i}
                    className="pdp-thumb"
                    onClick={() => goTo(i)}
                    style={{
                      ...styles.thumb,
                      border: i === activeImage
                        ? '2px solid var(--color-charcoal)'
                        : '2px solid transparent',
                    }}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={src} alt={`${product.name} view ${i + 1}`} style={styles.thumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div style={styles.infoCol}>

            {/* Name */}
            <h1 style={styles.productName}>{fixEncoding(product.name)}</h1>

            {/* Price */}
            <p style={styles.price}>{formatPrice(product.price)}</p>

            {/* Color selector */}
            {colorVariants.length > 0 && (
              <div style={styles.selectorBlock}>
                <span style={styles.selectorLabel}>Color</span>
                <div style={styles.swatchRow}>
                  {colorVariants.map((v) => {
                    const isActive = v.id === product.id;
                    const bg = swatchBg(v.color);
                    const isGradient = v.color === 'Multicolor';
                    const needsBorder = LIGHT_COLORS.has(v.color);
                    return (
                      <div key={v.id} style={styles.swatchWrap} className="swatch-wrap">
                        <button
                          className="pdp-swatch"
                          onClick={() => { if (!isActive) navigate(`/products/${v.id}`); }}
                          style={{
                            ...styles.swatch,
                            ...(isGradient
                              ? { backgroundImage: 'linear-gradient(135deg,#f06,#9f6,#06f)' }
                              : { backgroundColor: bg }),
                            outline: needsBorder ? '1.5px solid #BBBBBB' : '1.5px solid transparent',
                            outlineOffset: '1px',
                            ...(isActive ? styles.swatchActive : {}),
                            cursor: isActive ? 'default' : 'pointer',
                          }}
                          aria-label={v.color}
                          title={v.color}
                        />
                      </div>
                    );
                  })}
                  <span style={styles.colorName}>{product.color}</span>
                </div>
              </div>
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
              <div style={styles.selectorBlock}>
                <span style={styles.selectorLabel}>Size</span>
                <div style={styles.sizeRow}>
                  {sizes.map((sz) => {
                    const sizeOos = (stockBySize[sz] ?? 0) === 0;
                    return (
                      <button
                        key={sz}
                        className="pdp-size-pill"
                        disabled={sizeOos}
                        onClick={() => !sizeOos && setSelectedSize(sz === selectedSize ? null : sz)}
                        style={{
                          ...styles.sizePill,
                          ...(selectedSize === sz ? styles.sizePillActive : {}),
                          ...(sizeOos ? styles.sizePillOos : {}),
                        }}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADD TO CART */}
            <button
              className="pdp-cart-btn"
              disabled={!selectedSize || !inStock || cartAdded}
              onClick={handleAddToCart}
              style={{
                ...styles.cartBtn,
                ...(cartAdded
                  ? styles.cartBtnAdded
                  : !inStock
                    ? styles.cartBtnDisabled
                    : !selectedSize
                      ? styles.cartBtnNoSize
                      : {}),
              }}
            >
              {cartAdded
                ? <><CheckCheck size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Added!</>
                : !inStock
                  ? 'OUT OF STOCK'
                  : !selectedSize
                    ? 'SELECT A SIZE'
                    : 'ADD TO CART'}
            </button>

            {/* WISHLIST */}
            <button
              className="pdp-wishlist-btn"
              onClick={toggleWishlist}
              style={{
                ...styles.wishlistBtn,
                borderColor: wishlisted ? 'var(--color-blue)' : 'var(--color-border)',
                color: wishlisted ? 'var(--color-charcoal)' : 'var(--color-charcoal)',
              }}
            >
              <Heart
                size={16}
                fill={wishlisted ? 'var(--color-blue-hover)' : 'none'}
                stroke={wishlisted ? 'var(--color-blue-hover)' : 'var(--color-charcoal)'}
                style={{ flexShrink: 0 }}
              />
              ADD TO WISHLIST
            </button>

            {/* Description */}
            {product.description && (
              <div style={styles.section}>
                <p style={styles.sectionLabel}>Description</p>
                <p style={styles.descriptionText}>{fixEncoding(product.description)}</p>
              </div>
            )}

            {/* Specs table */}
            <div style={styles.section}>
              <p style={styles.sectionLabel}>Product Details</p>
              <table style={styles.table}>
                <tbody>
                  {[
                    ['Model', product.model],
                    ['Serial Number', product.serialNumber],
                    ['Delivery', 'Ships within 3 business days'],
                    ['Returns', 'Free returns within 15 business days'],
                    ['Distributor', fixEncoding(product.distributorInfo)],
                    ['Gender', product.gender],
                    ['VAT Rate', `${product.vatRate}%`],
                  ].map(([label, value], i) => (
                    <tr
                      key={label}
                      style={{ backgroundColor: i % 2 === 0 ? 'var(--color-sand)' : 'var(--color-white)' }}
                    >
                      <td style={styles.tdLabel}>{label}</td>
                      <td style={styles.tdValue}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* ── Reviews section (full width) ── */}
        <div style={styles.reviewsSection}>
          <h2 style={styles.reviewsTitle}>Reviews</h2>

          {/* Average rating summary */}
          <div style={styles.ratingsummary}>
            <StarRow rating={5} size={20} />
            <span style={styles.ratingValue}>4.5 / 5</span>
            <span style={styles.ratingCount}>12 reviews</span>
          </div>

          {/* Placeholder review cards */}
          <div style={styles.reviewList}>
            {PLACEHOLDER_REVIEWS.map((r) => (
              <div key={r.name} style={styles.reviewCard}>
                <div style={styles.reviewHeader}>
                  <span style={styles.reviewerName}>{r.name}</span>
                  <StarRow rating={r.rating} size={14} />
                  <span style={styles.reviewDate}>{r.date}</span>
                </div>
                <p style={styles.reviewComment}>{r.comment}</p>
              </div>
            ))}
          </div>

          {/* Leave a review form */}
          <div style={styles.reviewForm}>
            <p style={styles.sectionLabel}>Leave a Review</p>

            {/* Star picker */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-3)' }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= (reviewHover || reviewRating);
                return (
                  <Star
                    key={n}
                    size={24}
                    className="pdp-review-star"
                    fill={filled ? '#FBBF24' : 'none'}
                    stroke={filled ? '#FBBF24' : 'var(--color-border)'}
                    style={{ cursor: 'pointer', transition: 'fill var(--transition-fast)' }}
                    onMouseEnter={() => setReviewHover(n)}
                    onMouseLeave={() => setReviewHover(0)}
                    onClick={() => setReviewRating(n)}
                  />
                );
              })}
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              style={styles.textarea}
            />

            <button
              onClick={handleSubmitReview}
              style={styles.submitReviewBtn}
            >
              SUBMIT REVIEW
            </button>
            <p style={styles.reviewNotice}>
              Your review will be visible after approval by our team
            </p>
          </div>
        </div>
      </div>

      <Footer />
      <ToastContainer toasts={toasts} />

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="pdp-lightbox-overlay"
          style={styles.lightboxOverlay}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close */}
          <button
            className="pdp-lightbox-close"
            style={styles.lightboxClose}
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close lightbox"
          >
            <X size={32} color="var(--color-sand)" />
          </button>

          {/* Prev arrow */}
          {images.length > 1 && (
            <button
              className="pdp-lightbox-arrow"
              style={{ ...styles.lightboxArrow, left: 'var(--space-6)' }}
              onClick={(e) => { e.stopPropagation(); setActiveImage((activeImage - 1 + images.length) % images.length); }}
              aria-label="Previous image"
            >
              <ChevronLeft size={32} color="var(--color-sand)" />
            </button>
          )}

          <img
            src={images[activeImage]}
            alt={fixEncoding(product.name)}
            style={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next arrow */}
          {images.length > 1 && (
            <button
              className="pdp-lightbox-arrow"
              style={{ ...styles.lightboxArrow, right: 'var(--space-6)' }}
              onClick={(e) => { e.stopPropagation(); setActiveImage((activeImage + 1) % images.length); }}
              aria-label="Next image"
            >
              <ChevronRight size={32} color="var(--color-sand)" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Styles ──────────────────────────────────────────── */

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-sand)',
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: 'var(--space-8) var(--container-pad) var(--space-16)',
  },

  /* Not found */
  notFound: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-4)',
    backgroundColor: 'var(--color-sand)',
  },
  notFoundText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    color: 'var(--color-charcoal)',
    margin: 0,
  },
  backLink: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    textDecoration: 'none',
    letterSpacing: 'var(--tracking-wide)',
  },

  /* Breadcrumb */
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  breadcrumbLink: {
    color: 'var(--color-charcoal-light)',
    textDecoration: 'none',
  },
  breadcrumbSep: {
    color: 'var(--color-border)',
  },
  breadcrumbCurrent: {
    color: 'var(--color-charcoal)',
  },

  /* Image gallery */
  mainImageWrap: {
    position: 'relative',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-sand)',
    border: 'none',
    boxShadow: 'none',
  },
  mainImage: {
    width: '100%',
    aspectRatio: '3 / 4',
    objectFit: 'cover',
    display: 'block',
    border: 'none',
    boxShadow: 'none',
    margin: 0,
    padding: 0,
    transition: 'opacity var(--transition-base)',
  },
  imgArrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.7)',
    color: 'var(--color-charcoal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
    padding: 0,
  },

  zoomHint: {
    position: 'absolute',
    bottom: 'var(--space-3)',
    right: 'var(--space-3)',
    color: 'var(--color-white)',
    opacity: 0,
    transition: 'opacity var(--transition-base)',
    pointerEvents: 'none',
    display: 'flex',
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
  },
  badge: {
    position: 'absolute',
    top: 'var(--space-4)',
    left: 'var(--space-4)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    fontFamily: 'var(--font-body)',
    padding: '4px var(--space-3)',
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
  thumbRow: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
    marginTop: 'var(--space-3)',
  },
  thumb: {
    width: 64,
    height: 64,
    padding: 0,
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-sand)',
    overflow: 'hidden',
    cursor: 'pointer',
    background: 'none',
    transition: 'border-color var(--transition-fast), opacity var(--transition-fast)',
    flexShrink: 0,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  /* Info column */
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
  },
  productName: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-tight)',
    color: 'var(--color-black)',
    lineHeight: 1.25,
  },
  price: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-charcoal)',
  },

  /* Selectors */
  selectorBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  selectorLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    color: 'var(--color-charcoal-light)',
    margin: 0,
  },

  /* Color swatches */
  swatchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  swatchWrap: {
    position: 'relative',
    display: 'inline-flex',
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    flexShrink: 0,
    transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
  },
  swatchActive: {
    boxShadow: '0 0 0 2px var(--color-sand), 0 0 0 3.5px var(--color-charcoal)',
  },
  colorName: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    marginLeft: 'var(--space-2)',
  },

  /* Sizes */
  sizeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  sizePill: {
    height: 36,
    padding: '0 var(--space-4)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
  },
  sizePillOos: {
    opacity: 0.4,
    textDecoration: 'line-through',
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  sizePillActive: {
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    borderColor: 'var(--color-charcoal)',
  },

  /* Buttons */
  cartBtn: {
    width: '100%',
    padding: 'var(--space-4) 0',
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
  },
  cartBtnAdded: {
    backgroundColor: 'var(--color-success)',
    color: '#166534',
    cursor: 'default',
  },
  cartBtnNoSize: {
    backgroundColor: 'var(--color-border)',
    color: 'var(--color-charcoal-light)',
    cursor: 'default',
  },
  cartBtnDisabled: {
    backgroundColor: 'var(--color-border)',
    color: 'var(--color-charcoal-light)',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  wishlistBtn: {
    width: '100%',
    padding: 'var(--space-4) 0',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    transition: 'border-color var(--transition-fast)',
  },

  /* Description + specs */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  sectionLabel: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    color: 'var(--color-charcoal-light)',
  },
  descriptionText: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal)',
    lineHeight: 1.7,
  },

  /* Specs table */
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
  },
  tdLabel: {
    padding: 'var(--space-3) var(--space-4)',
    color: 'var(--color-charcoal-light)',
    fontWeight: 'var(--weight-medium)',
    width: '45%',
    whiteSpace: 'nowrap',
  },
  tdValue: {
    padding: 'var(--space-3) var(--space-4)',
    color: 'var(--color-charcoal)',
  },

  /* Reviews */
  reviewsSection: {
    marginTop: 'var(--space-16)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },
  reviewsTitle: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
  },
  ratingsummary: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  ratingValue: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-charcoal)',
  },
  ratingCount: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  reviewCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  reviewerName: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
  },
  reviewDate: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    marginLeft: 'auto',
  },
  reviewComment: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    lineHeight: 1.6,
  },

  /* Review form */
  reviewForm: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    maxWidth: 600,
  },
  textarea: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    backgroundColor: 'var(--color-sand)',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.6,
  },
  reviewNotice: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  submitReviewBtn: {
    alignSelf: 'flex-start',
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
    transition: 'background-color var(--transition-fast)',
  },

  /* Lightbox */
  lightboxOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    maxHeight: '90vh',
    maxWidth: '90vw',
    objectFit: 'contain',
    borderRadius: 'var(--radius-xl)',
    display: 'block',
  },
  lightboxClose: {
    position: 'fixed',
    top: 'var(--space-6)',
    right: 'var(--space-6)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--space-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
    transition: 'opacity var(--transition-fast)',
  },
  lightboxArrow: {
    position: 'fixed',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.3)',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--space-3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    zIndex: 1001,
    transition: 'background var(--transition-fast)',
  },
};
