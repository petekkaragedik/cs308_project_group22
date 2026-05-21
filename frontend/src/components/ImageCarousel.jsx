import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export default function ImageCarousel({ images = [], initialIndex = 0, onImageClick, children }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const thumbRowRef = useRef(null);
  const touchStartX = useRef(null);
  const mouseStartX = useRef(null);
  const wasDrag = useRef(false);

  // Auto-scroll thumbnail strip to keep active thumb visible
  useEffect(() => {
    const row = thumbRowRef.current;
    if (!row) return;
    const thumb = row.children[activeIndex];
    if (thumb) thumb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  const goTo = useCallback((i) => setActiveIndex(i), []);

  const goPrev = useCallback(() => {
    setActiveIndex((cur) => (cur > 0 ? cur - 1 : cur));
  }, []);

  const goNext = useCallback((len) => {
    setActiveIndex((cur) => (cur < len - 1 ? cur + 1 : cur));
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

  if (!images.length) return null;

  return (
    <>
      <style>{`
        .ic-thumb:hover { opacity: 0.8; }
        .ic-wrap:hover .ic-zoom-hint { opacity: 1 !important; }
        .ic-arrow { opacity: 0; transition: opacity var(--transition-base), background var(--transition-fast); }
        .ic-wrap:hover .ic-arrow { opacity: 1; }
        .ic-arrow:hover { background: rgba(255,255,255,0.92) !important; }
      `}</style>

      {/* Main image */}
      <div
        className="ic-wrap"
        style={{ ...styles.mainWrap, cursor: isDragging ? 'grabbing' : 'zoom-in' }}
        onMouseDown={images.length > 1 ? handleMouseDown : undefined}
        onMouseUp={images.length > 1 ? (e) => handleMouseUp(e, images.length) : undefined}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={images.length > 1 ? (e) => handleTouchEnd(e, images.length) : undefined}
      >
        <img
          src={images[activeIndex]}
          alt=""
          draggable="false"
          style={styles.mainImage}
          onClick={() => { if (!wasDrag.current && onImageClick) onImageClick(activeIndex); }}
        />

        {images.length > 1 && activeIndex > 0 && (
          <button
            className="ic-arrow"
            style={{ ...styles.arrow, left: 'var(--space-3)' }}
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {images.length > 1 && activeIndex < images.length - 1 && (
          <button
            className="ic-arrow"
            style={{ ...styles.arrow, right: 'var(--space-3)' }}
            onClick={(e) => { e.stopPropagation(); goNext(images.length); }}
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>
        )}

        <span className="ic-zoom-hint" style={styles.zoomHint}>
          <ZoomIn size={20} />
        </span>

        {children}
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div ref={thumbRowRef} style={styles.thumbRow}>
          {images.map((src, i) => (
            <button
              key={i}
              className="ic-thumb"
              onClick={() => goTo(i)}
              style={{
                ...styles.thumb,
                border: i === activeIndex
                  ? '2px solid var(--color-charcoal)'
                  : '2px solid transparent',
              }}
              aria-label={`View image ${i + 1}`}
            >
              <img src={src} alt="" style={styles.thumbImg} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const styles = {
  mainWrap: {
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
    cursor: 'inherit',
  },
  arrow: {
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
};
