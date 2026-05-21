import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronUp, CheckCheck, SlidersHorizontal, Heart } from 'lucide-react';
import FilterPanel from '../components/FilterPanel';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { apiUrl } from '../apiBase';

/* ─── Constants ───────────────────────────────────────── */


const FEATURED = ['All', 'Bikini Set', 'Top & Bottom Set', 'Dress', 'Pareo', 'Bustier'];

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Popularity' },
];

/* ─── Color swatch map ────────────────────────────────── */

const COLOR_MAP = {
  /* ── Solid basics ── */
  'White':                '#FFFFFF',
  'Black':                '#222222',
  'Brown':                '#8B5E3C',
  'Purple':               '#9B59B6',
  'Blue':                 '#3498DB',
  'Red':                  '#E74C3C',
  'Beige':                '#F5DEB3',
  'Cream':                '#FFFDD0',
  'Grey':                 '#9E9E9E',
  'Yellow':               '#FEF08A',
  'Green':                '#4CAF50',
  'Water Green':          '#7FFFD4',
  'Sage Green':           '#87AE73',
  'Gold Glow':            '#FFD700',
  'Sunshine':             '#FFC300',
  /* ── Extended palette ── */
  'Anthracite':           '#2D2D2D',
  'Batik':                '#8B6359',
  'Beige-Orange-Black':   '#D4723A',
  'Black Silver':         '#404040',
  'Black White':          '#888888',
  'Blue - White':         '#5DADE2',
  'Blue Green':           '#1ABC9C',
  'Blue White':           '#85C1E9',
  'Blue White Black':     '#2C3E50',
  'Brown - Orange Iridescent': '#CD7F32',
  'Brown Cream':          '#C4A27B',
  'Brown White':          '#A0785A',
  'Cream Beige':          '#F0E6CF',
  'Cream Light Yellow':   '#FAFAD2',
  'Cyan-Purple':          '#9B8EC4',
  'Dark Magenta':         '#8B008B',
  'Ecru':                 '#FAF0E6',
  'Grey White':           '#D3D3D3',
  'Khaki':                '#BDB76B',
  'Lavender':             '#B57EDC',
  'Light Brown Beige':    '#D4B896',
  'Light Brown White':    '#C8A882',
  'Lilac':                '#C8A2C8',
  'Lilac-Pink':           '#DDA0DD',
  'Milky Brown':          '#C4956A',
  'Natural':              '#D4C5A9',
  'Natural DK2':          '#BCA88E',
  'Navy':                 '#001F54',
  'Navy Pink':            '#1D3461',
  'Pink':                 '#FF69B4',
  'Pink White':           '#FFB6C1',
  'Purple White':         '#C39BD3',
  'Raw':                  '#E8D5B0',
  'Red - White':          '#E74C3C',
  'Red Star':             '#C0392B',
  'Red White':            '#E57373',
  'Silver':               '#C0C0C0',
  'Silver-Grey':          '#B0B7BF',
  'Terracotta':           '#CC4E2A',
  'Turquoise':            '#40E0D0',
  'White Beige':          '#F5F0E8',
  'White Black':          '#909090',
  'White Blue':           '#D6E4F0',
  'White Milky Brown':    '#EDE0CC',
  'White Purple':         '#D7BDE2',
  'White Turquoise':      '#B2DFDB',
  'Yellow-Navy':          '#F1C40F',
};

/* Colors that are so light they need a stronger border to be visible on a white card */
const LIGHT_COLORS = new Set([
  'White', 'Cream', 'Ecru', 'Cream Beige', 'Cream Light Yellow', 'White Beige',
  'White Blue', 'White Milky Brown', 'White Purple', 'White Turquoise',
  'Grey White', 'Natural', 'Raw', 'Blue White', 'Pink White',
]);

function swatchBackground(colorName) {
  if (colorName === 'Multicolor') return null; // gradient, handled inline
  return COLOR_MAP[colorName] ?? '#A0A0A0';
}

/* ─── Helpers ─────────────────────────────────────────── */

function formatPrice(price) {
  return '₺' + price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Data-building helpers (accept a products array) ─── */

function buildAllCards(products) {
  const map = new Map();
  for (const p of products) {
    if (!map.has(p.model)) {
      map.set(p.model, {
        model: p.model,
        name: p.name,
        categoryName: p.categoryName,
        price: p.price,
        variants: [],
      });
    }
    const group = map.get(p.model);
    const existing = group.variants.find((v) => v.color === p.color);
    if (!existing) {
      group.variants.push({
        id: p.id,
        color: p.color,
        images: p.images,
        totalStock: p.quantityInStock,
      });
    } else {
      existing.totalStock += p.quantityInStock;
    }
  }
  const cards = [];
  for (const group of map.values()) {
    const siblings = group.variants.map((v) => ({ id: v.id, color: v.color }));
    for (const v of group.variants) {
      cards.push({
        id: v.id,
        color: v.color,
        images: v.images,
        quantityInStock: v.totalStock,
        model: group.model,
        name: group.name,
        categoryName: group.categoryName,
        price: group.price,
        siblings,
      });
    }
  }
  return cards;
}

function buildSizeMap(products) {
  const map = {};
  for (const p of products) {
    const key = `${p.model}|${p.color}`;
    if (!map[key]) map[key] = [];
    if (!map[key].includes(p.size)) map[key].push(p.size);
  }
  const ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => {
      const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }
  return map;
}

function buildSizeStockMap(products) {
  const map = {};
  for (const p of products) {
    map[`${p.model}|${p.color}|${p.size}`] = p.quantityInStock;
  }
  return map;
}

/* ─── Page ────────────────────────────────────────────── */

export default function ProductListingPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('scylla_sort') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [allCategories, setAllCategories] = useState(['All']);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const dropdownRef = useRef(null);
  const sortRef = useRef(null);
  const gridRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [priceFloor, setPriceFloor] = useState(0);
  const [priceCeiling, setPriceCeiling] = useState(10000);
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedColors, setSelectedColors] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const hasLoadedColors = useRef(false);

  // Fetch categories from backend on mount
  useEffect(() => {
    fetch(apiUrl('/api/categories'))
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((cats) => setAllCategories(['All', ...cats]))
      .catch(() => {}); // keep default ['All'] on error
  }, []);

  // Fetch price range once on mount so FilterPanel knows slider bounds
  useEffect(() => {
    fetch(apiUrl('/api/products/filter-meta'))
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((meta) => { setPriceFloor(meta.minPrice); setPriceCeiling(meta.maxPrice); })
      .catch(() => {});
  }, []);

  // Persist sort preference across page refreshes
  useEffect(() => {
    if (sortBy) localStorage.setItem('scylla_sort', sortBy);
    else localStorage.removeItem('scylla_sort');
  }, [sortBy]);

  // Fetch products: all or filtered by category, with sort and pagination params
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: pageSize, offset: (currentPage - 1) * pageSize });
    if (sortBy) params.set('sort', sortBy);
    if (minPrice !== null) params.append('minPrice', minPrice);
    if (maxPrice !== null) params.append('maxPrice', maxPrice);
    if (minRating > 0) params.append('minRating', minRating);
    if (inStockOnly) params.append('inStock', 'true');
    if (selectedColors.length > 0) params.append('colors', selectedColors.join(','));
    const url = activeCategory === 'All'
      ? apiUrl(`/api/products?${params}`)
      : apiUrl(`/api/products/category/${encodeURIComponent(activeCategory)}?${params}`);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((resp) => {
        if (!hasLoadedColors.current && resp.data.length > 0) {
          const unique = [...new Set(resp.data.map((p) => p.color).filter(Boolean))].sort();
          setAvailableColors(unique);
          hasLoadedColors.current = true;
        }
        setProducts(resp.data);
        setPagination(resp.pagination);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [activeCategory, sortBy, currentPage, pageSize, minPrice, maxPrice, minRating, inStockOnly, selectedColors]);

  useEffect(() => {
    function onScroll() {
      setShowScrollTop(window.scrollY > 300);
      sessionStorage.setItem('scylla_scroll', String(window.scrollY));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem('scylla_scroll');
      if (saved) window.scrollTo(0, Number(saved));
    }
  }, [loading]);

  function addToast() {
    const id = Date.now();
    setToasts((prev) => [...prev, { id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }

  const allCards = useMemo(() => buildAllCards(products), [products]);
  const sizeMap = useMemo(() => buildSizeMap(products), [products]);
  const sizeStockMap = useMemo(() => buildSizeStockMap(products), [products]);

  const moreCategories = useMemo(
    () => allCategories.filter((c) => !FEATURED.includes(c)),
    [allCategories]
  );

  const cards = allCards;

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectCategory(cat) {
    setActiveCategory(cat);
    setCurrentPage(1);
    setMoreOpen(false);
  }

  function handlePriceChange(min, max) {
    setMinPrice(min);
    setMaxPrice(max);
    setCurrentPage(1);
  }
  function handleRatingChange(rating) {
    setMinRating(rating);
    setCurrentPage(1);
  }
  function handleClearFilters() {
    setMinPrice(null);
    setMaxPrice(null);
    setMinRating(0);
    setInStockOnly(false);
    setSelectedColors([]);
    setCurrentPage(1);
  }
  function handleInStockChange(val) {
    setInStockOnly(val);
    setCurrentPage(1);
  }
  function handleColorsChange(colors) {
    setSelectedColors(colors);
    setCurrentPage(1);
  }

  const hasActiveFilter = minPrice !== null || maxPrice !== null || minRating > 0 || inStockOnly || selectedColors.length > 0;

  const activeInMore = moreCategories.includes(activeCategory);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-charcoal-light)', fontSize: 'var(--text-xl)' }}>Loading...</span>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-charcoal-light)', fontSize: 'var(--text-xl)' }}>Could not load products. Please try again.</span>
    </div>
  );

  return (
    <>
      <style>{`
        .plp-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) { .plp-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .plp-grid { grid-template-columns: 1fr; } }
        .swatch-tooltip { display: none; }
        .swatch-wrap:hover .swatch-tooltip { display: block; }
        .dropdown-item-btn:hover { background-color: var(--color-blue) !important; }
        .hero { height: 420px; }
        @media (max-width: 640px) { .hero { height: 280px; } }
        .shop-now-btn:hover { background-color: var(--color-yellow-hover) !important; }
        .hero-inner { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: var(--space-10); max-width: var(--container-max); width: 100%; padding: 0 var(--container-pad); position: relative; z-index: 1; }
        .hero-image-col { display: block; }
        @media (max-width: 640px) { .hero-inner { grid-template-columns: 1fr; } .hero-image-col { display: none; } }
        .scroll-top-btn:hover { opacity: 0.85 !important; }
        .sort-opt:hover { background: color-mix(in srgb, var(--color-blue) 15%, transparent) !important; }
        .plp-mobile-toggle-area { display: none; }
        .plp-sidebar { display: block; }
        @media (max-width: 768px) {
          .plp-content-row { flex-direction: column !important; }
          .plp-sidebar { display: none !important; }
          .plp-mobile-toggle-area { display: block; margin-bottom: var(--space-4); }
        }
        .plp-heart-btn:hover { border-color: var(--color-blue) !important; background-color: var(--color-sand) !important; }
      `}</style>

      <Navbar />

      {/* ── Hero Banner ── */}
      <div className="hero" style={styles.hero}>
        {/* Decorative circles */}
        <div style={{ ...styles.heroDot, width: 220, height: 220, top: -60, left: -60 }} />
        <div style={{ ...styles.heroDot, width: 140, height: 140, bottom: -30, right: 40 }} />

        {/* Wave SVG */}
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

        {/* Split layout */}
        <div className="hero-inner">
          {/* Left — text */}
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>SCYLLA</h1>
            <p style={styles.heroTagline}>Handcrafted for the shore</p>
            <button
              className="shop-now-btn"
              style={styles.shopNowBtn}
              onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              SHOP NOW
            </button>
          </div>

          {/* Right — hero image */}
          <div className="hero-image-col">
            <img
              src="https://cdn.dsmcdn.com/ty1703/prod/QC_ENRICHMENT/20250701/13/e9deed03-3b30-3d06-ae47-2b195d8a48ed/1_org_zoom.jpg"
              alt="Scylla hero"
              style={styles.heroImage}
            />
          </div>
        </div>
      </div>

      <div style={styles.page}>
        <div className="plp-content-row" style={styles.contentRow}>

          {/* ── Left sidebar — desktop only ── */}
          <aside className="plp-sidebar" style={styles.sidebar}>
            <FilterPanel
              minPrice={minPrice ?? priceFloor}
              maxPrice={maxPrice ?? priceCeiling}
              priceFloor={priceFloor}
              priceCeiling={priceCeiling}
              minRating={minRating}
              onPriceChange={handlePriceChange}
              onRatingChange={handleRatingChange}
              onClearFilters={handleClearFilters}
              inStockOnly={inStockOnly}
              onInStockChange={handleInStockChange}
              selectedColors={selectedColors}
              onColorsChange={handleColorsChange}
              availableColors={availableColors}
            />
          </aside>

          {/* ── Right column ── */}
          <div style={styles.mainCol}>

            {/* Mobile: filter toggle button + collapsible panel */}
            <div className="plp-mobile-toggle-area">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                style={{
                  ...styles.pill,
                  ...(filtersOpen ? styles.pillActive : {}),
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <SlidersHorizontal size={14} />
                Filters
                {hasActiveFilter && <span style={styles.filterDot} />}
              </button>
              {filtersOpen && (
                <div style={styles.mobilePanelWrap}>
                  <FilterPanel
                    minPrice={minPrice ?? priceFloor}
                    maxPrice={maxPrice ?? priceCeiling}
                    priceFloor={priceFloor}
                    priceCeiling={priceCeiling}
                    minRating={minRating}
                    onPriceChange={handlePriceChange}
                    onRatingChange={handleRatingChange}
                    onClearFilters={handleClearFilters}
                    inStockOnly={inStockOnly}
                    onInStockChange={handleInStockChange}
                    selectedColors={selectedColors}
                    onColorsChange={handleColorsChange}
                    availableColors={availableColors}
                  />
                </div>
              )}
            </div>

            {/* ── Filter Bar ── */}
            <div style={styles.filterBar}>
              {/* Row 1: category pills */}
              <div style={styles.pillGroup}>
                {FEATURED.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    style={activeCategory === cat ? { ...styles.pill, ...styles.pillActive } : styles.pill}
                  >
                    {cat}
                  </button>
                ))}

                {moreCategories.length > 0 && (
                  <div ref={dropdownRef} style={styles.moreWrap}>
                    <button
                      onClick={() => setMoreOpen((o) => !o)}
                      style={activeInMore ? { ...styles.pill, ...styles.pillActive } : styles.pill}
                    >
                      {activeInMore ? activeCategory : 'More'} ▾
                    </button>
                    {moreOpen && (
                      <div style={styles.dropdown}>
                        {moreCategories.map((cat) => (
                          <button
                            key={cat}
                            className="dropdown-item-btn"
                            onClick={() => selectCategory(cat)}
                            style={
                              activeCategory === cat
                                ? { ...styles.dropdownItem, ...styles.dropdownItemActive }
                                : styles.dropdownItem
                            }
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2: sort dropdown, right-aligned */}
              <div style={styles.sortRow}>
                <div style={styles.sortControl}>
                  <span style={styles.sortLabel}>Sort by:</span>
                  <div ref={sortRef} style={styles.sortDropdownWrap}>
                    <button
                      onClick={() => setSortOpen((o) => !o)}
                      style={styles.sortBtn}
                    >
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Default'}
                      <span style={styles.sortBtnChevron} aria-hidden="true">▾</span>
                    </button>
                    {sortOpen && (
                      <ul style={styles.sortList}>
                        {SORT_OPTIONS.map((opt) => (
                          <li
                            key={opt.value}
                            className="sort-opt"
                            onClick={() => { setSortBy(opt.value); setCurrentPage(1); setSortOpen(false); }}
                            style={{
                              ...styles.sortOption,
                              ...(sortBy === opt.value ? styles.sortOptionActive : {}),
                            }}
                          >
                            {opt.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Product count + page size toggle ── */}
            <div style={styles.countRow}>
              <span style={styles.countText}>Showing {cards.length} products</span>
              <div style={styles.pageSizeGroup}>
                <span style={styles.sortLabel}>Show:</span>
                {[20, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setPageSize(n); setCurrentPage(1); }}
                    style={{ ...styles.pageSizeBtn, ...(pageSize === n ? styles.pageSizeBtnActive : {}) }}
                  >
                    {n}
                  </button>
                ))}
                <span style={styles.sortLabel}>products per page</span>
              </div>
            </div>

            {/* ── Product Grid ── */}
            <div ref={gridRef} style={styles.grid} className="plp-grid">
              {cards.map((card) => (
                <ProductCard
                  key={card.id}
                  card={card}
                  navigate={navigate}
                  onAddToCart={(size) => {
                    addItem(card.id, size);
                    addToast();
                  }}
                  sizeMap={sizeMap}
                  sizeStockMap={sizeStockMap}
                  wishlisted={isWishlisted(card.id)}
                  onToggleWishlist={() => {
                    const token = sessionStorage.getItem('token');
                    if (!token) { navigate('/login'); return; }
                    toggleWishlist(card.id);
                  }}
                />
              ))}
            </div>

            {/* ── Pagination ── */}
            {pagination && Math.ceil(pagination.total / pageSize) > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(pagination.total / pageSize)}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* ── Toast container ── */}
      <ToastContainer toasts={toasts} />

      {/* ── Scroll to top ── */}
      <button
        className="scroll-top-btn"
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

/* ─── Product Card ────────────────────────────────────── */

function ProductCard({ card, navigate, onAddToCart, sizeMap, sizeStockMap, wishlisted, onToggleWishlist }) {
  const [hovered, setHovered] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [added, setAdded] = useState(false);
  const inStock = card.quantityInStock > 0;

  const sizes = sizeMap[`${card.model}|${card.color}`] ?? [];
  /* Show size drawer when hovered OR a size is already selected */
  const drawerOpen = hovered || selectedSize !== null;

  function handleMouseLeave() {
    setHovered(false);
    /* If nothing was selected, collapse the drawer */
    if (selectedSize === null) {
      /* nothing extra needed — drawerOpen recomputes */
    }
  }

  function handleSwatchClick(e, sibling) {
    e.stopPropagation();
    if (sibling.id === card.id) return;
    const el = document.getElementById(`plp-card-${sibling.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--color-charcoal)';
      setTimeout(() => { el.style.outline = 'none'; }, 1200);
    }
  }

  function handleAddToCart(e) {
    e.stopPropagation();
    if (!selectedSize) return;
    onAddToCart(selectedSize);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setSelectedSize(null);
    }, 1500);
  }

  return (
    <div
      id={`plp-card-${card.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        ...styles.card,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-card)',
      }}
    >
      {/* Image — clicking navigates to detail */}
      <div
        style={styles.imageWrap}
        onClick={() => navigate(`/products/${card.id}`)}
      >
        <img
          src={card.images[0]}
          alt={card.name}
          style={{
            ...styles.image,
            ...(!inStock ? { filter: 'grayscale(60%)', opacity: 0.65 } : {}),
          }}
        />
        <span style={{ ...styles.badge, ...(inStock ? styles.badgeIn : styles.badgeOut) }}>
          {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
        </span>
        <button
          className="plp-heart-btn"
          style={{
            ...styles.heartBtn,
            borderColor: wishlisted ? 'var(--color-blue)' : 'var(--color-border)',
          }}
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={14}
            fill={wishlisted ? 'var(--color-blue-hover)' : 'none'}
            stroke={wishlisted ? 'var(--color-blue-hover)' : 'var(--color-charcoal)'}
          />
        </button>
      </div>

      {/* Body */}
      <div style={styles.cardBody}>
        {/* Name — clicking navigates */}
        <p
          style={{ ...styles.name, cursor: 'pointer' }}
          onClick={() => navigate(`/products/${card.id}`)}
        >
          {card.name}
        </p>

        <div style={styles.meta}>
          <span style={styles.price}>{formatPrice(card.price)}</span>
          <span style={styles.colorLabel}>{card.color}</span>
        </div>

        {/* Color swatches */}
        {card.siblings.length > 1 && (
          <div style={styles.swatches}>
            {card.siblings.map((s) => {
              const isActive = s.id === card.id;
              const bg = swatchBackground(s.color);
              const isGradient = s.color === 'Multicolor';
              const needsBorder = LIGHT_COLORS.has(s.color);
              return (
                <div key={s.id} className="swatch-wrap" style={styles.swatchWrap}>
                  <button
                    onClick={(e) => handleSwatchClick(e, s)}
                    style={{
                      ...styles.swatch,
                      ...(isGradient
                        ? { backgroundImage: 'linear-gradient(135deg,#f06,#9f6,#06f)' }
                        : { backgroundColor: bg }),
                      outline: needsBorder ? '1.5px solid #BBBBBB' : '1.5px solid transparent',
                      outlineOffset: '1px',
                      ...(isActive ? styles.swatchActive : {}),
                    }}
                    aria-label={s.color}
                  />
                  <span className="swatch-tooltip" style={styles.swatchTooltip}>
                    {s.color}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Size + button drawer */}
        <div style={styles.cartArea}>
          {/* Size row — slides up on hover */}
          {sizes.length > 0 && (
            <div style={{
              ...styles.sizeRow,
              transform: drawerOpen ? 'translateY(0)' : 'translateY(110%)',
              opacity: drawerOpen ? 1 : 0,
              pointerEvents: drawerOpen ? 'auto' : 'none',
            }}>
              {sizes.map((sz) => {
                const sizeInStock = (sizeStockMap[`${card.model}|${card.color}|${sz}`] ?? 0) > 0;
                return (
                  <button
                    key={sz}
                    disabled={!sizeInStock}
                    onClick={(e) => { e.stopPropagation(); if (sizeInStock) setSelectedSize(sz === selectedSize ? null : sz); }}
                    style={{
                      ...styles.sizePill,
                      ...(selectedSize === sz ? styles.sizePillActive : {}),
                      ...(!sizeInStock ? styles.sizePillDisabled : {}),
                    }}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cart button */}
          {inStock ? (
            <button
              disabled={!selectedSize || added}
              onClick={handleAddToCart}
              style={{
                ...styles.cartBtn,
                ...(added
                  ? styles.cartBtnAdded
                  : !selectedSize
                    ? styles.cartBtnNoSize
                    : {}),
              }}
            >
              {added
                ? <><CheckCheck size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />Added!</>
                : !selectedSize
                  ? 'SELECT SIZE'
                  : 'ADD TO CART'}
            </button>
          ) : (
            <button disabled style={{ ...styles.cartBtn, ...styles.cartBtnDisabled }}>
              OUT OF STOCK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────── */

const styles = {
  /* Page */
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-sand)',
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: 'var(--space-10) var(--container-pad) var(--space-16)',
  },

  /* Two-column layout */
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: '1.5rem',
  },
  sidebar: {
    width: '180px',
    flexShrink: 0,
    boxSizing: 'border-box',
    paddingRight: 'var(--space-3)',
    borderRight: '1px solid rgba(74,74,74,0.08)',
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
  },
  mobilePanelWrap: {
    marginTop: 'var(--space-4)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
  },
  filterDot: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-charcoal)',
    flexShrink: 0,
  },

  /* Filter bar */
  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    marginBottom: 'var(--space-10)',
  },
  pillGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
  },

  /* Sort row sits below pills, right-aligned */
  sortRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-2)',
  },
  sortControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  sortLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    whiteSpace: 'nowrap',
  },
  sortDropdownWrap: {
    position: 'relative',
  },
  sortBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    minWidth: '160px',
    padding: 'var(--space-2) var(--space-3)',
    backgroundColor: 'var(--color-sand)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(51,51,51,0.2)',
    cursor: 'pointer',
  },
  sortBtnChevron: {
    pointerEvents: 'none',
    fontSize: 'var(--text-xs)',
    lineHeight: 1,
    flexShrink: 0,
  },
  sortList: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    zIndex: 200,
    minWidth: '160px',
    margin: 0,
    padding: 'var(--space-1) 0',
    listStyle: 'none',
    backgroundColor: 'var(--color-sand)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    overflow: 'hidden',
  },
  sortOption: {
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
  },
  sortOptionActive: {
    borderLeft: '3px solid var(--color-blue)',
  },
  pill: {
    padding: 'var(--space-2) var(--space-5)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    background: 'transparent',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    letterSpacing: 'var(--tracking-wide)',
    cursor: 'pointer',
    transition: 'var(--transition-base)',
    whiteSpace: 'nowrap',
  },
  pillActive: {
    backgroundColor: 'var(--color-blue)',
    color: 'var(--color-black)',
    fontWeight: 'var(--weight-semibold)',
  },

  /* More dropdown */
  moreWrap: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + var(--space-2))',
    left: 0,
    zIndex: 100,
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  dropdownItemActive: {
    backgroundColor: 'var(--color-blue)',
    color: 'var(--color-black)',
    fontWeight: 'var(--weight-semibold)',
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
    transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
    display: 'flex',
    flexDirection: 'column',
  },

  /* Image */
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: '3 / 4',
    objectFit: 'cover',
    borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
    display: 'block',
  },

  /* Stock badge */
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

  /* Card body */
  cardBody: {
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    flex: 1,
  },

  /* Name */
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

  /* Price + swatches row */
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  price: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-charcoal)',
  },
  colorLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
    letterSpacing: 'var(--tracking-wide)',
  },

  /* Color swatches */
  swatches: {
    display: 'flex',
    gap: 'var(--space-1)',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  swatchWrap: {
    position: 'relative',
    display: 'inline-flex',
  },
  swatch: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'box-shadow var(--transition-fast)',
  },
  swatchActive: {
    boxShadow: '0 0 0 2px var(--color-white), 0 0 0 3.5px var(--color-charcoal)',
  },
  swatchTooltip: {
    position: 'absolute',
    bottom: 'calc(100% + 6px)',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 10,
  },

  /* Add to Cart */
  cartBtn: {
    marginTop: 'auto',
    width: '100%',
    padding: 'var(--space-3) 0',
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
    transition: 'background-color var(--transition-base)',
  },
  cartBtnNoSize: {
    backgroundColor: 'var(--color-border)',
    color: 'var(--color-charcoal-light)',
    cursor: 'default',
  },

  /* Size drawer */
  cartArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    marginTop: 'auto',
    overflow: 'hidden',
  },
  sizeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-1)',
    transition: 'transform var(--transition-base), opacity var(--transition-base)',
  },
  sizePill: {
    height: '28px',
    padding: '0 var(--space-3)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-medium)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  sizePillActive: {
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    borderColor: 'var(--color-charcoal)',
  },
  sizePillDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
    textDecoration: 'line-through',
  },
  cartBtnDisabled: {
    backgroundColor: 'var(--color-border)',
    color: 'var(--color-charcoal-light)',
    cursor: 'not-allowed',
    opacity: 0.7,
  },

  /* ── Hero ── */
  hero: {
    position: 'relative',
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
  heroTitle: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: '4rem',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-wider)',
    color: 'var(--color-black)',
    lineHeight: 1,
  },
  heroTagline: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontStyle: 'italic',
    color: 'var(--color-charcoal-light)',
  },
  shopNowBtn: {
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

  /* ── Product count ── */
  countRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-4)',
  },
  pageSizeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  pageSizeBtn: {
    minWidth: '36px',
    height: '28px',
    padding: '0 var(--space-3)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    background: 'transparent',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-base)',
  },
  pageSizeBtnActive: {
    backgroundColor: 'var(--color-blue)',
    borderColor: 'var(--color-blue)',
    fontWeight: 'var(--weight-semibold)',
  },
  countText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },

  /* Hero image */
  heroImage: {
    width: '100%',
    height: '380px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-2xl)',
    display: 'block',
  },

  /* Wishlist heart button on card */
  heartBtn: {
    position: 'absolute',
    top: 'var(--space-3)',
    right: 'var(--space-3)',
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
    padding: 0,
    flexShrink: 0,
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

/* ─── Toast ───────────────────────────────────────────── */

function ToastContainer({ toasts }) {
  return (
    <div style={toastStyles.container}>
      {toasts.map((t) => <Toast key={t.id} />)}
    </div>
  );
}

function Toast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* Trigger enter animation on next frame */
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
      <span>Added to cart!</span>
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
