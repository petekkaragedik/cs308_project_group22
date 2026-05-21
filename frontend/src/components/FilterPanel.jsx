import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

export default function FilterPanel({
  minPrice,
  maxPrice,
  priceFloor,
  priceCeiling,
  minRating,
  onPriceChange,
  onRatingChange,
  onClearFilters,
}) {
  const [draftMin, setDraftMin] = useState(String(minPrice));
  const [draftMax, setDraftMax] = useState(String(maxPrice));

  // Re-sync draft inputs when the parent resets props (e.g. after clearFilters)
  useEffect(() => { setDraftMin(String(minPrice)); }, [minPrice]);
  useEffect(() => { setDraftMax(String(maxPrice)); }, [maxPrice]);

  const isFiltered = minPrice !== priceFloor || maxPrice !== priceCeiling || minRating > 0;

  function handleMinBlur() {
    const val = parseFloat(draftMin);
    const resolved = Number.isFinite(val) ? Math.max(priceFloor, val) : priceFloor;
    setDraftMin(String(resolved));
    onPriceChange(resolved, maxPrice);
  }

  function handleMaxBlur() {
    const val = parseFloat(draftMax);
    const resolved = Number.isFinite(val) ? Math.min(priceCeiling, val) : priceCeiling;
    setDraftMax(String(resolved));
    onPriceChange(minPrice, resolved);
  }

  return (
    <div style={styles.panel}>
      <style>{`
        .fp-input::-webkit-inner-spin-button,
        .fp-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .fp-input { -moz-appearance: textfield; }
        .fp-input:focus { outline: none; border-color: var(--color-border-focus) !important; }
        .fp-clear:hover { text-decoration: underline !important; opacity: 1 !important; }
      `}</style>

      {/* ── Price section ── */}
      <div style={styles.section}>
        <span style={styles.sectionLabel}>PRICE</span>
        <div style={styles.priceRow}>
          <label style={styles.priceField}>
            <span style={styles.priceFieldLabel}>Min ₺</span>
            <input
              className="fp-input"
              type="number"
              value={draftMin}
              placeholder={String(priceFloor)}
              onChange={(e) => setDraftMin(e.target.value)}
              onBlur={handleMinBlur}
              style={styles.priceInput}
            />
          </label>
          <label style={styles.priceField}>
            <span style={styles.priceFieldLabel}>Max ₺</span>
            <input
              className="fp-input"
              type="number"
              value={draftMax}
              placeholder={String(priceCeiling)}
              onChange={(e) => setDraftMax(e.target.value)}
              onBlur={handleMaxBlur}
              style={styles.priceInput}
            />
          </label>
        </div>
      </div>

      {/* ── Min rating section ── */}
      <div style={styles.section}>
        <span style={styles.sectionLabel}>MIN RATING</span>
        <div style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= minRating;
            return (
              <button
                key={n}
                onClick={() => onRatingChange(minRating === n ? 0 : n)}
                style={{
                  ...styles.starBtn,
                  transform: active ? 'scale(1.18)' : 'scale(1)',
                }}
                aria-label={`Minimum ${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={active ? 'var(--color-yellow)' : 'none'}
                  color={active ? '#B8860B' : 'rgba(74,74,74,0.25)'}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>
        {minRating > 0 && (
          <span style={styles.ratingHint}>{minRating}★ &amp; up</span>
        )}
      </div>

      {/* ── Clear filters ── */}
      {isFiltered && (
        <button
          className="fp-clear"
          onClick={onClearFilters}
          style={styles.clearBtn}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
    width: '100%',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },

  sectionLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    color: 'rgba(74,74,74,0.5)',
  },

  priceRow: {
    display: 'flex',
    gap: 'var(--space-3)',
    alignItems: 'flex-end',
  },

  priceField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },

  priceFieldLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
  },

  priceInput: {
    width: '80px',
    padding: '0.4rem 0.6rem',
    backgroundColor: 'var(--color-sand)',
    border: '1px solid rgba(74,74,74,0.2)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    boxSizing: 'border-box',
  },

  starsRow: {
    display: 'flex',
    gap: 'var(--space-1)',
    alignItems: 'center',
  },

  starBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 0,
    transition: 'transform var(--transition-fast)',
  },

  ratingHint: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'rgba(74,74,74,0.6)',
  },

  clearBtn: {
    background: 'none',
    border: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'rgba(74,74,74,0.6)',
    cursor: 'pointer',
    padding: 0,
    marginTop: 'var(--space-3)',
    textAlign: 'left',
    textDecoration: 'none',
  },
};
