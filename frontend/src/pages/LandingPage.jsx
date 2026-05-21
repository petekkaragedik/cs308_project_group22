import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─── Helpers ─────────────────────────────────────────── */

function formatPrice(price) {
  return '₺' + price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Pick one card per model, prefer in-stock, highest popularity first */
function pickFeatured(products, limit = 4) {
  const byModel = new Map();
  for (const p of products) {
    const current = byModel.get(p.model);
    if (!current) {
      byModel.set(p.model, p);
      continue;
    }
    const currentInStock = current.quantityInStock > 0 ? 1 : 0;
    const newInStock = p.quantityInStock > 0 ? 1 : 0;
    if (newInStock > currentInStock) {
      byModel.set(p.model, p);
    }
  }
  const unique = Array.from(byModel.values());
  unique.sort((a, b) => {
    const aStock = a.quantityInStock > 0 ? 1 : 0;
    const bStock = b.quantityInStock > 0 ? 1 : 0;
    if (bStock !== aStock) return bStock - aStock;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
  return unique.slice(0, limit);
}

/* ─── Page ────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const featuredRef = useRef(null);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((resp) => {
        setFeatured(pickFeatured(resp.data ?? resp, 4));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onScroll() { setShowScrollTop(window.scrollY > 300); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        .lp-hero-inner { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: var(--space-10); max-width: var(--container-max); width: 100%; padding: 0 var(--container-pad); position: relative; z-index: 1; }
        .lp-hero-image-col { display: block; }
        @media (max-width: 640px) {
          .lp-hero-inner { grid-template-columns: 1fr; }
          .lp-hero-image-col { display: none; }
          .lp-hero { height: 420px !important; }
        }
        .lp-featured-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 1024px) { .lp-featured-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .lp-featured-grid { grid-template-columns: 1fr; } }
        .lp-story-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 720px) { .lp-story-grid { grid-template-columns: 1fr; } }
        .lp-shop-btn:hover { background-color: var(--color-yellow-hover) !important; }
        .lp-link-btn:hover { opacity: 0.7 !important; }
        .lp-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .lp-scroll-top-btn:hover { opacity: 0.85 !important; }
      `}</style>

      <Navbar />

      {/* ── Hero ── */}
      <section className="lp-hero" style={styles.hero}>
        <div style={{ ...styles.heroDot, width: 260, height: 260, top: -80, left: -80 }} />
        <div style={{ ...styles.heroDot, width: 160, height: 160, bottom: -40, right: 60 }} />

        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={styles.heroWave}
          aria-hidden="true"
        >
          <path
            fill="var(--color-blue)"
            fillOpacity="0.55"
            d="M0,160L48,149.3C96,139,192,117,288,128C384,139,480,181,576,181.3C672,181,768,139,864,122.7C960,107,1056,117,1152,138.7C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>

        <div className="lp-hero-inner">
          <div style={styles.heroContent}>
            <p style={styles.heroEyebrow}>Summer Collection · 2026</p>
            <h1 style={styles.heroTitle}>SCYLLA</h1>
            <p style={styles.heroTagline}>Handcrafted crochet, made for the shore.</p>
            <div style={styles.heroActions}>
              <button
                className="lp-shop-btn"
                style={styles.shopBtn}
                onClick={() => navigate('/products')}
              >
                SHOP THE COLLECTION
              </button>
              <button
                className="lp-link-btn"
                style={styles.linkBtn}
                onClick={() => featuredRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                View featured →
              </button>
            </div>
          </div>

          <div className="lp-hero-image-col">
            <img
              src="https://cdn.dsmcdn.com/ty1703/prod/QC_ENRICHMENT/20250701/13/e9deed03-3b30-3d06-ae47-2b195d8a48ed/1_org_zoom.jpg"
              alt="Scylla summer collection"
              style={styles.heroImage}
            />
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section ref={featuredRef} style={styles.section}>
        <div style={styles.sectionHead}>
          <p style={styles.eyebrow}>This Season</p>
          <h2 style={styles.sectionTitle}>Featured Pieces</h2>
          <p style={styles.sectionSub}>Our favourite styles, hand-selected for sun-soaked days.</p>
        </div>

        {loading ? (
          <p style={styles.loadingText}>Loading...</p>
        ) : featured.length === 0 ? (
          <p style={styles.loadingText}>No products yet — check back soon.</p>
        ) : (
          <div style={styles.featuredGrid} className="lp-featured-grid">
            {featured.map((p) => (
              <FeaturedCard key={p.id} product={p} onClick={() => navigate(`/products/${p.id}`)} />
            ))}
          </div>
        )}

        <div style={styles.sectionFooter}>
          <button
            className="lp-shop-btn"
            style={styles.shopBtnOutline}
            onClick={() => navigate('/products')}
          >
            VIEW ALL PRODUCTS
          </button>
        </div>
      </section>

      {/* ── Brand Story ── */}
      <section style={styles.storySection}>
        <div style={styles.storyGrid} className="lp-story-grid">
          <div style={styles.storyImageWrap}>
            <img
              src="https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80"
              alt="Scylla brand story"
              style={styles.storyImage}
            />
          </div>
          <div style={styles.storyContent}>
            <p style={styles.eyebrow}>Our Story</p>
            <h2 style={styles.sectionTitle}>Threads of the sea</h2>
            <p style={styles.storyText}>
              SCYLLA is born where the tide meets the loom. Each piece is
              crocheted by hand, one stitch at a time, using soft natural
              yarns that breathe in the summer air.
            </p>
            <p style={styles.storyText}>
              We design slowly — in small batches, with attention to
              texture, drape, and the way fabric moves in the wind. Every
              bikini, dress, and pareo is made to feel like a second skin
              on the sand.
            </p>
            <button
              className="lp-link-btn"
              style={styles.linkBtn}
              onClick={() => navigate('/products')}
            >
              Discover the collection →
            </button>
          </div>
        </div>
      </section>

      <Footer />

      <button
        className="lp-scroll-top-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        style={{
          ...styles.scrollTopBtn,
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
        }}
      >
        <ChevronUp size={20} />
      </button>
    </>
  );
}

/* ─── Featured Card ───────────────────────────────────── */

function FeaturedCard({ product, onClick }) {
  const inStock = product.quantityInStock > 0;
  return (
    <div className="lp-card" onClick={onClick} style={styles.card}>
      <div style={styles.cardImageWrap}>
        <img
          src={product.images[0]}
          alt={product.name}
          style={{
            ...styles.cardImage,
            ...(!inStock ? { filter: 'grayscale(60%)', opacity: 0.65 } : {}),
          }}
        />
        {!inStock && (
          <span style={styles.outBadge}>OUT OF STOCK</span>
        )}
      </div>
      <div style={styles.cardBody}>
        <p style={styles.cardCategory}>{product.categoryName}</p>
        <p style={styles.cardName}>{product.name}</p>
        <p style={styles.cardPrice}>{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────── */

const styles = {
  /* Hero */
  hero: {
    position: 'relative',
    height: '520px',
    backgroundColor: 'var(--color-sand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '55%',
    pointerEvents: 'none',
  },
  heroDot: {
    position: 'absolute',
    borderRadius: '50%',
    backgroundColor: 'var(--color-blue)',
    opacity: 0.35,
    pointerEvents: 'none',
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
    textAlign: 'left',
  },
  heroEyebrow: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--color-charcoal-light)',
  },
  heroTitle: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: '4.5rem',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-wider)',
    color: 'var(--color-black)',
    lineHeight: 1,
  },
  heroTagline: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal)',
    maxWidth: '420px',
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-5)',
    marginTop: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  shopBtn: {
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
  },
  shopBtnOutline: {
    padding: 'var(--space-3) var(--space-8)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-charcoal)',
    backgroundColor: 'transparent',
    color: 'var(--color-black)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    transition: 'opacity var(--transition-fast)',
  },
  heroImage: {
    width: '100%',
    height: '440px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-2xl)',
    display: 'block',
  },

  /* Section */
  section: {
    backgroundColor: 'var(--color-sand)',
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: 'var(--space-20) var(--container-pad)',
  },
  sectionHead: {
    textAlign: 'center',
    marginBottom: 'var(--space-12)',
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
  sectionTitle: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-4xl)',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-tight)',
    color: 'var(--color-black)',
  },
  sectionSub: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal-light)',
    maxWidth: '520px',
  },
  sectionFooter: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'var(--space-12)',
  },
  loadingText: {
    textAlign: 'center',
    fontFamily: 'var(--font-heading)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal-light)',
    fontSize: 'var(--text-lg)',
    padding: 'var(--space-12) 0',
  },

  /* Featured grid */
  featuredGrid: {
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
  cardImageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: '3 / 4',
    objectFit: 'cover',
    display: 'block',
  },
  outBadge: {
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
    backgroundColor: 'var(--color-error)',
    color: '#991b1b',
  },
  cardBody: {
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  cardCategory: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
  },
  cardName: {
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
  cardPrice: {
    margin: 'var(--space-2) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-charcoal)',
  },

  /* Story */
  storySection: {
    backgroundColor: 'var(--color-blue)',
    padding: 'var(--space-20) 0',
  },
  storyGrid: {
    display: 'grid',
    gap: 'var(--space-12)',
    alignItems: 'center',
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: '0 var(--container-pad)',
  },
  storyImageWrap: {
    borderRadius: 'var(--radius-2xl)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
  },
  storyImage: {
    width: '100%',
    height: '460px',
    objectFit: 'cover',
    display: 'block',
  },
  storyContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
  },
  storyText: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    lineHeight: 1.7,
    color: 'var(--color-charcoal)',
    maxWidth: '520px',
  },

  /* Scroll to top */
  scrollTopBtn: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 300,
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity var(--transition-base)',
    boxShadow: 'var(--shadow-md)',
  },
};
