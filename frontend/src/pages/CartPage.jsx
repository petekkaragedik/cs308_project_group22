import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import mockProducts from '../data/mockProducts';

function formatPrice(price) {
  return '₺' + price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getProduct(productId) {
  return mockProducts.find((p) => p.id === productId) ?? null;
}

export default function CartPage() {
  const { cartItems, removeItem, updateItem } = useCart();

  const total = cartItems.reduce((sum, item) => {
    const p = getProduct(item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <h1 style={styles.heading}>Your Cart</h1>

        {cartItems.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Your cart is empty.</p>
            <Link to="/products" style={styles.shopLink}>Browse Products</Link>
          </div>
        ) : (
          <div style={styles.layout}>
            <div style={styles.itemList}>
              {cartItems.map((item) => {
                const product = getProduct(item.product_id);
                if (!product) return null;
                return (
                  <div key={item.id} style={styles.card}>
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      style={styles.image}
                    />
                    <div style={styles.info}>
                      <p style={styles.name}>{product.name}</p>
                      <p style={styles.meta}>{product.color} · Size {item.size}</p>
                      <p style={styles.price}>{formatPrice(product.price)}</p>
                      <div style={styles.qtyRow}>
                        <button
                          style={styles.qtyBtn}
                          onClick={() => item.quantity > 1 && updateItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span style={styles.qtyNum}>{item.quantity}</span>
                        <button
                          style={styles.qtyBtn}
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={styles.summary}>
              <h2 style={styles.summaryHeading}>Order Summary</h2>
              <div style={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Shipping</span>
                <span style={{ color: 'var(--color-charcoal)' }}>Calculated at checkout</span>
              </div>
              <div style={styles.divider} />
              <div style={{ ...styles.summaryRow, fontWeight: 'var(--weight-semibold)' }}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button style={styles.checkoutBtn}>Proceed to Checkout</button>
              <Link to="/products" style={styles.continueLink}>Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

const styles = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 'var(--space-8) var(--container-pad)',
    minHeight: '70vh',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-3xl)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-8)',
  },
  empty: {
    textAlign: 'center',
    paddingTop: 'var(--space-16)',
  },
  emptyText: {
    fontSize: 'var(--text-lg)',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-4)',
  },
  shopLink: {
    display: 'inline-block',
    padding: 'var(--space-3) var(--space-6)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 'var(--text-sm)',
  },
  layout: {
    display: 'flex',
    gap: 'var(--space-8)',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  itemList: {
    flex: 1,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  card: {
    display: 'flex',
    gap: 'var(--space-4)',
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: 'var(--space-4)',
    alignItems: 'flex-start',
  },
  image: {
    width: 100,
    height: 120,
    objectFit: 'cover',
    borderRadius: 'var(--radius-md)',
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-black)',
    fontWeight: 'var(--weight-regular)',
    marginBottom: 'var(--space-1)',
    lineHeight: 1.4,
  },
  meta: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-2)',
    fontFamily: 'var(--font-body)',
  },
  price: {
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-3)',
  },
  qtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-sand)',
    cursor: 'pointer',
    fontSize: 'var(--text-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-body)',
  },
  qtyNum: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
    padding: 'var(--space-1)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  summary: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: 'var(--space-6)',
    flexShrink: 0,
  },
  summaryHeading: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-4)',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-3)',
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--color-border)',
    margin: 'var(--space-3) 0',
  },
  checkoutBtn: {
    width: '100%',
    padding: 'var(--space-3) 0',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    marginTop: 'var(--space-4)',
    marginBottom: 'var(--space-3)',
  },
  continueLink: {
    display: 'block',
    textAlign: 'center',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    textDecoration: 'underline',
  },
};
