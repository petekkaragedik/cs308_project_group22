import { Link } from 'react-router-dom';
import { Search, Heart, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { cartCount } = useCart();
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
        <Link to="/cart" style={styles.cartBtn} aria-label="Cart">
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span style={styles.badge}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
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
  cartBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: 'var(--color-charcoal)',
    color: 'var(--color-sand)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    minWidth: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
};
