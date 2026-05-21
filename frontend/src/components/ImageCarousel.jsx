import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

const LENS_W = 200;
const LENS_H = 200;

export default function ImageCarousel({ images = [], initialIndex = 0, onImageClick, children }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const thumbRowRef = useRef(null);
  const touchStartX = useRef(null);
  const mouseStartX = useRef(null);
  const wasDrag = useRef(false);
  const mainImgRef = useRef(null);
  const lensRef = useRef(null);
  const zoomPanelRef = useRef(null);

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

  const handleWrapMouseMove = useCallback((e) => {
    if (!mainImgRef.current) return;

    const rect = mainImgRef.current.getBoundingClientRect();
    const imgW = rect.width;
    const imgH = rect.height;

    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Clamp lens so it never goes outside the image
    const lensLeft = Math.max(0, Math.min(cursorX - LENS_W / 2, imgW - LENS_W));
    const lensTop  = Math.max(0, Math.min(cursorY - LENS_H / 2, imgH - LENS_H));

    if (lensRef.current) {
      lensRef.current.style.left = `${lensLeft}px`;
      lensRef.current.style.top  = `${lensTop}px`;
    }

    if (zoomPanelRef.current) {
      const panelW = zoomPanelRef.current.offsetWidth;
      const panelH = zoomPanelRef.current.offsetHeight;
      if (panelW && panelH) {
        const zoomX = panelW / LENS_W;
        const zoomY = panelH / LENS_H;
        zoomPanelRef.current.style.backgroundSize     = `${imgW * zoomX}px ${imgH * zoomY}px`;
        zoomPanelRef.current.style.backgroundPosition = `-${lensLeft * zoomX}px -${lensTop * zoomY}px`;
      }
    }
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
    setIsHovering(false);
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

  const showZoom = isHovering && !isDragging;

  return (
    <>
      <style>{`
        .ic-thumb:hover { opacity: 0.8; }
        .ic-wrap:hover .ic-zoom-hint { opacity: 1 !important; }
        .ic-zooming .ic-zoom-hint { opacity: 0 !important; }
        .ic-arrow { opacity: 0; transition: opacity var(--transition-base), background var(--transition-fast); }
        .ic-wrap:hover .ic-arrow { opacity: 1; }
        .ic-arrow:hover { background: rgba(255,255,255,0.92) !important; }
      `}</style>

      {/* Wrapper gives position:relative so the zoom panel can be placed via absolute */}
      <div style={styles.zoomWrapper}>

        {/* Main image */}
        <div
          className={`ic-wrap${showZoom ? ' ic-zooming' : ''}`}
          style={{ ...styles.mainWrap, cursor: isDragging ? 'grabbing' : showZoom ? 'crosshair' : 'zoom-in' }}
          onMouseMove={handleWrapMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseDown={images.length > 1 ? handleMouseDown : undefined}
          onMouseUp={images.length > 1 ? (e) => handleMouseUp(e, images.length) : undefined}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={images.length > 1 ? (e) => handleTouchEnd(e, images.length) : undefined}
        >
          <img
            ref={mainImgRef}
            src={images[activeIndex]}
            alt=""
            draggable="false"
            style={styles.mainImage}
            onClick={() => { if (!wasDrag.current && onImageClick) onImageClick(activeIndex); }}
          />

          {/* Lens rectangle — always in DOM so lensRef is stable */}
          <div ref={lensRef} style={{ ...styles.lens, opacity: showZoom ? 1 : 0 }} />

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

        {/* Zoom panel — sibling to ic-wrap (outside overflow:hidden), always in DOM for stable ref */}
        <div
          ref={zoomPanelRef}
          style={{
            ...styles.zoomPanel,
            backgroundImage: `url(${images[activeIndex]})`,
            opacity: showZoom ? 1 : 0,
            pointerEvents: 'none',
            transition: 'opacity 0.12s ease',
          }}
        />
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
  zoomWrapper: {
    position: 'relative',
  },
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
  lens: {
    position: 'absolute',
    width: LENS_W,
    height: LENS_H,
    border: '1.5px solid rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    pointerEvents: 'none',
    zIndex: 20,
    boxSizing: 'border-box',
    borderRadius: 'var(--radius-sm)',
    transition: 'opacity 0.12s ease',
  },
  zoomPanel: {
    position: 'absolute',
    left: 'calc(100% + var(--space-3))',
    top: 0,
    width: '100%',
    aspectRatio: '3 / 4',
    backgroundRepeat: 'no-repeat',
    borderRadius: 'var(--radius-xl)',
    zIndex: 100,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
    backgroundColor: 'var(--color-sand)',
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
