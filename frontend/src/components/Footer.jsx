import { Camera, Music2, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <style>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--space-10);
          max-width: var(--container-max);
          margin: 0 auto;
          padding: var(--space-12) var(--container-pad) var(--space-10);
        }
        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: 1fr; text-align: center; }
          .footer-social { justify-content: center !important; }
        }
        .footer-link { color: var(--color-sand); opacity: 0.75; text-decoration: none; display: block; margin-bottom: var(--space-2); transition: opacity 150ms ease; }
        .footer-link:hover { opacity: 1; }
        .footer-icon-btn { background: none; border: none; cursor: pointer; color: var(--color-sand); opacity: 0.75; padding: 0; display: flex; align-items: center; transition: opacity 150ms ease; }
        .footer-icon-btn:hover { opacity: 1; }
      `}</style>

      <div className="footer-grid">
        {/* Left — Brand */}
        <div>
          <p style={styles.brand}>SCYLLA</p>
          <p style={styles.tagline}>Handcrafted for the shore</p>
        </div>

        {/* Center — Quick links */}
        <div>
          <p style={styles.colHeading}>Explore</p>
          <a href="/" className="footer-link" style={styles.link}>Home</a>
          <a href="/products" className="footer-link" style={styles.link}>Shop</a>
          <a href="/our-story" className="footer-link" style={styles.link}>Our Story</a>
        </div>

        {/* Right — Social */}
        <div>
          <p style={styles.colHeading}>Follow us</p>
          <div className="footer-social" style={styles.social}>
            <button className="footer-icon-btn" aria-label="Instagram">
              <Camera size={20} />
            </button>
            <button className="footer-icon-btn" aria-label="Pinterest">
              <Share2 size={20} />
            </button>
            <button className="footer-icon-btn" aria-label="TikTok">
              <Music2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <p style={styles.copyright}>© 2026 Scylla. All rights reserved.</p>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
  },
  brand: {
    margin: '0 0 var(--space-2)',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--weight-regular)',
    letterSpacing: 'var(--tracking-wider)',
    color: 'var(--color-sand)',
  },
  tagline: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontStyle: 'italic',
    color: 'var(--color-sand)',
    opacity: 0.65,
  },
  colHeading: {
    margin: '0 0 var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--color-sand)',
    opacity: 0.5,
  },
  link: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
  },
  social: {
    display: 'flex',
    gap: 'var(--space-4)',
    alignItems: 'center',
  },
  bottomBar: {
    borderTop: '1px solid rgba(245, 242, 237, 0.12)',
    padding: 'var(--space-4) var(--container-pad)',
    textAlign: 'center',
  },
  copyright: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-sand)',
    opacity: 0.4,
  },
};
