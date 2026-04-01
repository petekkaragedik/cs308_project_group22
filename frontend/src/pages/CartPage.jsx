import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import mockProducts from '../data/mockProducts';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeItem, updateItem } = useCart();

  const productMap = useMemo(() => {
    const map = {};
    mockProducts.forEach((p) => { map[p.id] = p; });
    return map;
  }, []);

  const rows = useMemo(
    () =>
      cartItems.map((item) => ({
        ...item,
        product: productMap[item.product_id],
      })),
    [cartItems, productMap]
  );

  const total = rows.reduce(
    (sum, r) => sum + (r.product ? r.product.price * r.quantity : 0),
    0
  );

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        <h1 style={styles.heading}>Your Cart</h1>

        {rows.length === 0 ? (
          <div style={styles.empty}>
            <ShoppingCart size={48} color="var(--color-charcoal-light)" />
            <p style={styles.emptyText}>Your cart is empty</p>
            <button style={styles.ctaBtn} onClick={() => navigate('/products')}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div style={styles.list}>
              {rows.map((row) => {
                if (!row.product) return null;
                const { product } = row;
                return (
                  <div key={row.id} style={styles.row}>
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      style={styles.thumb}
                      onClick={() => navigate(`/products/${product.id}`)}
                    />

                    <div style={styles.info}>
                      <p style={styles.name}>{product.name}</p>
                      <p style={styles.meta}>Size: {row.size}</p>
                      <p style={styles.price}>
                        {(product.price * row.quantity).toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        })}
                      </p>
                    </div>

                    <div style={styles.actions}>
                      <div style={styles.stepper}>
                        <button
                          style={styles.stepBtn}
                          onClick={() => updateItem(row.id, row.quantity - 1)}
                          disabled={row.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={styles.qty}>{row.quantity}</span>
                        <button
                          style={styles.stepBtn}
                          onClick={() => updateItem(row.id, row.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        style={styles.removeBtn}
                        onClick={() => removeItem(row.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.summary}>
              <span style={styles.totalLabel}>Order Total</span>
              <span style={styles.totalValue}>
                {total.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                })}
              </span>
            </div>

            <button
              style={styles.shopBtn}
              onClick={() => navigate('/products')}
            >
              Continue Shopping
            </button>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

/* ─── Styles (design tokens) ─────────────────────────── */

const styles = {
  page: {
    backgroundColor: 'var(--color-sand)',
    minHeight: '100vh',
  },
  container: {
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: 'var(--space-8) var(--container-pad)',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    marginBottom: 'var(--space-6)',
  },

  /* Empty state */
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-16) 0',
  },
  emptyText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    color: 'var(--color-charcoal-light)',
  },
  ctaBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-semibold)',
    padding: 'var(--space-3) var(--space-6)',
    backgroundColor: 'var(--color-yellow)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },

  /* Item list */
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-card)',
  },
  thumb: {
    width: 90,
    height: 90,
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-black)',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    margin: 'var(--space-1) 0',
  },
  price: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
    margin: 0,
  },

  /* Quantity stepper + remove */
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px',
  },
  stepBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'var(--color-charcoal)',
  },
  qty: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-error)',
    display: 'flex',
    alignItems: 'center',
  },

  /* Summary */
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'var(--space-6)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
  },
  totalLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-black)',
  },
  totalValue: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-charcoal)',
  },
  shopBtn: {
    display: 'block',
    margin: 'var(--space-4) auto 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
