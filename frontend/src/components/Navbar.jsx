import { Link } from 'react-router-dom';
import { Search, Heart, ShoppingCart, User } from 'lucide-react';

export default function Navbar() {
  return (
    <nav style={styles.navbar}>
      <Link to="/products" style={styles.navBrand}>SCYLLA</Link>
      <div style={styles.navIcons}>
        <button style={styles.iconBtn} aria-label="Search">
          <Search size={22} />
        </button>
        <Link to="/wishlist" style={styles.iconBtn} aria-label="Wishlist">
          <Heart size={22} />
        </Link>
        <Link to="/cart" style={styles.iconBtn} aria-label="Cart">
          <ShoppingCart size={22} />
        </Link>
        <Link to="/login" style={styles.iconBtn} aria-label="Account">
          <User size={22} />
        </Link>
      </div>
    </nav>
  );
}

const styles = {
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
};
