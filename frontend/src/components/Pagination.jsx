function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages]);
  for (let p = currentPage - 1; p <= currentPage + 1; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const items = getPageNumbers(currentPage, totalPages);

  return (
    <>
      <style>{`
        .pag-btn { background-color: transparent; }
        .pag-btn:hover:not(:disabled) { background-color: var(--color-sand); }
      `}</style>
      <nav style={styles.container} aria-label="Pagination">
        {currentPage > 1 && (
          <button className="pag-btn" onClick={() => onPageChange(1)} style={styles.btn}>
            « First
          </button>
        )}

        <button
          className="pag-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ ...styles.btn, ...(currentPage === 1 ? styles.disabled : {}) }}
        >
          Previous
        </button>

        {items.map((item, i) =>
          item === '...' ? (
            <span key={`ellipsis-${i}`} style={styles.ellipsis}>…</span>
          ) : (
            <button
              key={item}
              className={item === currentPage ? undefined : 'pag-btn'}
              onClick={() => onPageChange(item)}
              style={{
                ...styles.btn,
                ...(item === currentPage ? styles.active : styles.inactive),
              }}
            >
              {item}
            </button>
          )
        )}

        <button
          className="pag-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ ...styles.btn, ...(currentPage === totalPages ? styles.disabled : {}) }}
        >
          Next
        </button>

        {currentPage < totalPages && (
          <button className="pag-btn" onClick={() => onPageChange(totalPages)} style={styles.btn}>
            Last »
          </button>
        )}
      </nav>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '2rem',
  },
  btn: {
    minWidth: '36px',
    height: '36px',
    padding: '0 var(--space-3)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background-color var(--transition-fast)',
    color: 'var(--color-charcoal)',
  },
  active: {
    backgroundColor: 'var(--color-charcoal)',
    color: 'white',
    borderRadius: 'var(--radius-sm)',
    cursor: 'default',
  },
  inactive: {
    color: 'var(--color-charcoal)',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'default',
  },
  ellipsis: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    lineHeight: '36px',
    userSelect: 'none',
    padding: '0 var(--space-1)',
  },
};
