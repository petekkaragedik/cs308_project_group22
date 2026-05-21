import { useState, useEffect } from 'react';

const COLOR_LOOKUP = {
  White:  '#F5F5F0',
  Black:  '#1A1A1A',
  Brown:  '#8B6343',
  Beige:  '#D4B896',
  Green:  '#7A9E7E',
  Blue:   '#6B8CAE',
  Pink:   '#E8A0A0',
  Yellow: '#F0D060',
  Orange: '#E8935A',
  Red:    '#C25555',
  Purple: '#8B6BA8',
  Grey:   '#9A9A9A',
};

function toggleTrackStyle(on) {
  return {
    width: '36px',
    height: '20px',
    borderRadius: '10px',
    backgroundColor: on ? 'var(--color-charcoal)' : 'rgba(74,74,74,0.15)',
    position: 'relative',
    transition: 'background-color 0.2s ease',
    flexShrink: 0,
    cursor: 'pointer',
  };
}

function toggleThumbStyle(on) {
  return {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: 'white',
    position: 'absolute',
    top: '3px',
    left: '3px',
    transform: on ? 'translateX(16px)' : 'translateX(0)',
    transition: 'transform 0.2s ease',
    pointerEvents: 'none',
  };
}

const SLIDER_CSS = `
  .fp-slider-wrap {
    position: relative;
    height: 20px;
    display: flex;
    align-items: center;
  }
  .fp-track {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 2px;
    pointer-events: none;
  }
  .fp-range {
    position: absolute;
    left: 0;
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    pointer-events: none;
    outline: none;
    margin: 0;
    padding: 0;
    will-change: transform;
  }
  .fp-range::-webkit-slider-runnable-track {
    height: 4px;
    background: transparent;
  }
  .fp-range::-moz-range-track {
    height: 4px;
    background: transparent;
  }
  .fp-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-charcoal);
    cursor: grab;
    pointer-events: all;
    margin-top: -6px;
    position: relative;
    z-index: 2;
    border: none;
    box-shadow: none;
  }
  .fp-range::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-charcoal);
    cursor: grab;
    pointer-events: all;
    border: none;
  }
  .fp-range:active::-webkit-slider-thumb { cursor: grabbing; }
  .fp-range:active::-moz-range-thumb { cursor: grabbing; }
  .fp-input::-webkit-inner-spin-button,
  .fp-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .fp-input { -moz-appearance: textfield; }
  .fp-input:focus { outline: none; }
  .fp-clear:hover { opacity: 1 !important; }
  .fp-swatch-wrap { position: relative; display: inline-flex; }
  .fp-swatch-tip {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-black);
    color: var(--color-white);
    font-family: var(--font-body);
    font-size: 11px;
    white-space: nowrap;
    padding: 2px 6px;
    border-radius: 4px;
    pointer-events: none;
    z-index: 10;
  }
  .fp-swatch-wrap:hover .fp-swatch-tip { display: block; }
`;

export default function FilterPanel({
  minPrice,
  maxPrice,
  priceFloor,
  priceCeiling,
  minRating,
  onPriceChange,
  onRatingChange,
  onClearFilters,
  inStockOnly = false,
  onInStockChange,
  selectedColors = [],
  onColorsChange,
  availableColors = [],
}) {
  const [draftMin, setDraftMin] = useState(String(minPrice));
  const [draftMax, setDraftMax] = useState(String(maxPrice));
  const [hoverRating, setHoverRating] = useState(0);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  // Sync text inputs live with slider position
  useEffect(() => { setDraftMin(String(localMin)); }, [localMin]);
  useEffect(() => { setDraftMax(String(localMax)); }, [localMax]);
  // Sync local slider position when parent resets externally
  useEffect(() => { setLocalMin(minPrice); }, [minPrice]);
  useEffect(() => { setLocalMax(maxPrice); }, [maxPrice]);

  const range = (priceCeiling - priceFloor) || 1;
  const leftPct = ((localMin - priceFloor) / range) * 100;
  const rightPct = ((localMax - priceFloor) / range) * 100;

  const isFiltered =
    localMin !== priceFloor ||
    localMax !== priceCeiling ||
    minRating > 0 ||
    inStockOnly ||
    selectedColors.length > 0;

  function handleMinSlider(e) {
    const clamped = Math.min(Number(e.target.value), localMax);
    setLocalMin(clamped);
  }

  function handleMaxSlider(e) {
    const clamped = Math.max(Number(e.target.value), localMin);
    setLocalMax(clamped);
  }

  function handleSliderCommit() {
    onPriceChange(localMin, localMax);
  }

  function handleMinBlur() {
    const val = parseFloat(draftMin);
    const resolved = Number.isFinite(val)
      ? Math.max(priceFloor, Math.min(val, maxPrice))
      : priceFloor;
    setDraftMin(String(resolved));
    onPriceChange(resolved, maxPrice);
  }

  function handleMaxBlur() {
    const val = parseFloat(draftMax);
    const resolved = Number.isFinite(val)
      ? Math.min(priceCeiling, Math.max(val, minPrice))
      : priceCeiling;
    setDraftMax(String(resolved));
    onPriceChange(minPrice, resolved);
  }

  function toggleColor(color) {
    if (!onColorsChange) return;
    if (selectedColors.includes(color)) {
      onColorsChange(selectedColors.filter((c) => c !== color));
    } else {
      onColorsChange([...selectedColors, color]);
    }
  }

  const anyColorSelected = selectedColors.length > 0;

  return (
    <div style={styles.panel}>
      <style>{SLIDER_CSS}</style>

      {/* ── PRICE ── */}
      <div style={styles.section}>
        <span style={styles.label}>PRICE</span>

        <div className="fp-slider-wrap">
          <div
            className="fp-track"
            style={{
              background: `linear-gradient(to right,
                rgba(74,74,74,0.15) 0%,
                rgba(74,74,74,0.15) ${leftPct}%,
                var(--color-charcoal) ${leftPct}%,
                var(--color-charcoal) ${rightPct}%,
                rgba(74,74,74,0.15) ${rightPct}%,
                rgba(74,74,74,0.15) 100%)`,
            }}
          />
          <input
            className="fp-range"
            type="range"
            min={priceFloor}
            max={priceCeiling}
            value={localMin}
            onChange={handleMinSlider}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            style={{ zIndex: localMin >= localMax ? 5 : 3 }}
          />
          <input
            className="fp-range"
            type="range"
            min={priceFloor}
            max={priceCeiling}
            value={localMax}
            onChange={handleMaxSlider}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            style={{ zIndex: localMin >= localMax ? 3 : 5 }}
          />
        </div>

        <div style={styles.priceInputRow}>
          <label style={styles.priceField}>
            <span style={styles.priceFieldLabel}>Min ₺</span>
            <input
              className="fp-input"
              type="number"
              value={draftMin}
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
              onChange={(e) => setDraftMax(e.target.value)}
              onBlur={handleMaxBlur}
              style={styles.priceInput}
            />
          </label>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── MIN RATING ── */}
      <div style={styles.section}>
        <span style={styles.label}>MIN RATING</span>
        <div
          style={styles.starsRow}
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const isHovering = hoverRating > 0;
            const lit = isHovering ? n <= hoverRating : n <= minRating;
            const opacity = lit ? (isHovering ? 0.6 : 1) : 0.18;
            return (
              <span
                key={n}
                style={{ ...styles.star, opacity }}
                onMouseEnter={() => setHoverRating(n)}
                onClick={() => onRatingChange(minRating === n ? 0 : n)}
              >
                ★
              </span>
            );
          })}
        </div>
        {minRating > 0 && (
          <span style={styles.ratingHint}>{minRating}★ &amp; up</span>
        )}
      </div>

      <div style={styles.divider} />

      {/* ── AVAILABILITY ── */}
      <div style={styles.section}>
        <span style={styles.label}>AVAILABILITY</span>
        <div
          style={styles.toggleRow}
          onClick={() => onInStockChange && onInStockChange(!inStockOnly)}
        >
          <div style={toggleTrackStyle(inStockOnly)}>
            <div style={toggleThumbStyle(inStockOnly)} />
          </div>
          <span style={styles.toggleLabel}>In stock only</span>
        </div>
      </div>

      {availableColors.length > 0 && (
        <>
          <div style={styles.divider} />

          {/* ── COLOR ── */}
          <div style={styles.section}>
            <span style={styles.label}>COLOR</span>
            <div style={styles.swatchesRow}>
              {availableColors.map((color) => {
                const bg = COLOR_LOOKUP[color] ?? 'rgba(74,74,74,0.3)';
                const isSelected = selectedColors.includes(color);
                return (
                  <div key={color} className="fp-swatch-wrap">
                    <button
                      onClick={() => toggleColor(color)}
                      style={{
                        ...styles.swatch,
                        backgroundColor: bg,
                        outline: isSelected
                          ? '2px solid var(--color-charcoal)'
                          : '2px solid transparent',
                        outlineOffset: '2px',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        opacity: anyColorSelected && !isSelected ? 0.75 : 1,
                      }}
                      aria-label={color}
                    />
                    <span className="fp-swatch-tip">{color}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {isFiltered && (
        <button
          className="fp-clear"
          onClick={onClearFilters}
          style={styles.clearBtn}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    width: '100%',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    paddingBottom: '1rem',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(74,74,74,0.08)',
    border: 'none',
    margin: '0 0 1rem 0',
    flexShrink: 0,
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'rgba(74,74,74,0.45)',
  },
  priceInputRow: {
    display: 'flex',
    gap: 'var(--space-3)',
    alignItems: 'flex-start',
  },
  priceField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  priceFieldLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'rgba(74,74,74,0.5)',
  },
  priceInput: {
    width: '70px',
    border: 'none',
    borderBottom: '1px solid rgba(74,74,74,0.2)',
    background: 'transparent',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    textAlign: 'center',
    padding: '2px 0',
    boxSizing: 'border-box',
  },
  starsRow: {
    display: 'flex',
    gap: 'var(--space-2)',
    alignItems: 'center',
  },
  star: {
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    lineHeight: 1,
    userSelect: 'none',
    transition: 'opacity 100ms ease',
  },
  ratingHint: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'rgba(74,74,74,0.5)',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  toggleLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  swatchesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
    alignItems: 'center',
  },
  swatch: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    cursor: 'pointer',
    border: '1.5px solid rgba(74,74,74,0.28)',
    padding: 0,
    flexShrink: 0,
    transition: 'transform 0.15s ease, opacity 0.15s ease',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'rgba(74,74,74,0.5)',
    cursor: 'pointer',
    padding: 0,
    marginTop: 'var(--space-4)',
    display: 'block',
    textDecoration: 'underline',
    opacity: 0.8,
    textAlign: 'left',
  },
};
