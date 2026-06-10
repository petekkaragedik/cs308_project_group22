import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SalesManagerBulkPricingPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [actionMode, setActionMode] = useState('price');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  // Price update state
  const [priceAction, setPriceAction] = useState('set');
  const [priceValue, setPriceValue] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('percentage');

  // Campaign creation state
  const [campaignName, setCampaignName] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [resultMessage, setResultMessage] = useState(null);

  // Auth check
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login?next=/sales-manager/bulk-pricing');
      return;
    }
    fetch(apiUrl('/api/profile'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (data?.role === 'sales_manager') {
          setAuthState('authorized');
        } else {
          setAuthState('unauthorized');
        }
      })
      .catch(() => setAuthState('unauthorized'));
  }, [navigate]);

  // Fetch products and categories
  useEffect(() => {
    if (authState === 'authorized') {
      fetchProducts();
      fetchCategories();
    }
  }, [authState]);

  async function fetchProducts() {
    try {
      const res = await fetch(apiUrl('/api/products?limit=500'));
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setProducts(list);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(apiUrl('/api/products?limit=500'));
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data ?? []);
      const uniqueCategories = [...new Set(list.map(p => p.categoryName))].filter(Boolean);
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }

  function toggleProduct(productId) {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  function toggleAll() {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  }

  async function handleBulkPriceUpdate() {
    if (selectedProducts.length === 0) {
      setResultMessage({ type: 'error', text: 'Please select at least one product' });
      return;
    }

    setLoading(true);
    setResultMessage(null);

    try {
      const updates = selectedProducts.map(productId => {
        const product = products.find(p => p.id === productId);
        let newPrice;

        if (priceAction === 'set') {
          newPrice = Number(priceValue);
        } else {
          // adjust
          const currentPrice = Number(product.price);
          if (adjustmentType === 'percentage') {
            const adjustment = (currentPrice * Number(priceValue)) / 100;
            newPrice = currentPrice + adjustment;
          } else {
            newPrice = currentPrice + Number(priceValue);
          }
        }

        return {
          productId,
          newPrice: Math.max(0, newPrice).toFixed(2)
        };
      });

      const res = await fetch(apiUrl('/api/products/bulk-price-update'), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update prices');
      }

      setResultMessage({
        type: 'success',
        text: `Successfully updated ${data.results.successful.length} product(s). ${
          data.results.failed.length > 0 ? `${data.results.failed.length} failed.` : ''
        }`
      });

      // Refresh products
      await fetchProducts();
      setSelectedProducts([]);
      setPriceValue('');

    } catch (err) {
      setResultMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkCampaignCreate() {
    if (selectedProducts.length === 0) {
      setResultMessage({ type: 'error', text: 'Please select at least one product' });
      return;
    }

    if (!campaignName.trim()) {
      setResultMessage({ type: 'error', text: 'Campaign name is required' });
      return;
    }

    if (!startDate || !endDate) {
      setResultMessage({ type: 'error', text: 'Start and end dates are required' });
      return;
    }

    setLoading(true);
    setResultMessage(null);

    try {
      const payload = {
        name: campaignName.trim(),
        description: `Bulk discount campaign created from bulk pricing`,
        discount_type: discountType,
        discount_value: Number(discountValue),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        is_active: true,
        product_ids: selectedProducts
      };

      const res = await fetch(apiUrl('/api/discounts/campaigns'), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create campaign');
      }

      setResultMessage({
        type: 'success',
        text: `Campaign "${campaignName}" created successfully for ${selectedProducts.length} product(s)`
      });

      setSelectedProducts([]);
      setCampaignName('');
      setDiscountValue('');
      setStartDate('');
      setEndDate('');

    } catch (err) {
      setResultMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.categoryName === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (authState === 'checking') {
    return (
      <>
        <Navbar />
        <div style={styles.center}><span>Loading...</span></div>
        <Footer />
      </>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <>
        <Navbar />
        <div style={styles.center}>
          <h1>Access Denied</h1>
          <p>This page is only available to sales managers.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{ ...styles.page, paddingBottom: selectedProducts.length > 0 ? 200 : undefined }}>
        <button style={styles.backBtn} onClick={() => navigate('/sales-manager/dashboard')}>
          ← Back to Dashboard
        </button>

        <h1 style={styles.title} id="bulk-top">Bulk Pricing Manager</h1>
        <p style={styles.subtitle}>
          Select multiple products to update prices or create discount campaigns.
        </p>

        {/* Filters */}
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={styles.categorySelect}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Selection Count */}
        <div style={styles.selectionBar}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={
                filteredProducts.length > 0 &&
                selectedProducts.length === filteredProducts.length
              }
              onChange={toggleAll}
            />
            <span style={styles.selectionText}>
              {selectedProducts.length} of {filteredProducts.length} product(s) selected
            </span>
          </label>
        </div>

        {/* Product Table */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Select</th>
                <th style={styles.th}>Product Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Current Price</th>
                <th style={styles.th}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} style={styles.tr}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                  </td>
                  <td style={styles.td}>
                    <Link to={`/products/${product.id}`} style={styles.productLink} target="_blank" rel="noopener noreferrer">
                      {product.name}
                    </Link>
                  </td>
                  <td style={styles.td}>{product.categoryName || '-'}</td>
                  <td style={styles.td}>₺{product.price}</td>
                  <td style={styles.td}>{product.quantityInStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Panel — fixed to bottom */}
        {selectedProducts.length > 0 && (
          <div style={styles.actionPanel}>
            <div style={styles.actionPanelInner}>
            <h2 style={styles.actionTitle}>
              Bulk Actions
              <span style={styles.selectedCount}>{selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected</span>
            </h2>

            <div style={styles.tabs}>
              <button
                style={actionMode === 'price' ? styles.tabActive : styles.tab}
                onClick={() => setActionMode('price')}
              >
                Update Prices
              </button>
              <button
                style={actionMode === 'campaign' ? styles.tabActive : styles.tab}
                onClick={() => setActionMode('campaign')}
              >
                Create Discount Campaign
              </button>
            </div>

            {actionMode === 'price' && (
              <div style={styles.actionContent}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Action</label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        value="set"
                        checked={priceAction === 'set'}
                        onChange={(e) => setPriceAction(e.target.value)}
                      />
                      <span>Set to fixed price</span>
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        value="adjust"
                        checked={priceAction === 'adjust'}
                        onChange={(e) => setPriceAction(e.target.value)}
                      />
                      <span>Adjust current price</span>
                    </label>
                  </div>
                </div>

                {priceAction === 'set' ? (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>New Price (₺)</label>
                    <input
                      type="number"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      style={styles.input}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ) : (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Adjustment Type</label>
                      <div style={styles.radioGroup}>
                        <label style={styles.radioLabel}>
                          <input
                            type="radio"
                            value="percentage"
                            checked={adjustmentType === 'percentage'}
                            onChange={(e) => setAdjustmentType(e.target.value)}
                          />
                          <span>Percentage (%)</span>
                        </label>
                        <label style={styles.radioLabel}>
                          <input
                            type="radio"
                            value="fixed"
                            checked={adjustmentType === 'fixed'}
                            onChange={(e) => setAdjustmentType(e.target.value)}
                          />
                          <span>Fixed Amount (₺)</span>
                        </label>
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Adjustment Value {adjustmentType === 'percentage' ? '(%)' : '(₺)'}
                      </label>
                      <input
                        type="number"
                        value={priceValue}
                        onChange={(e) => setPriceValue(e.target.value)}
                        style={styles.input}
                        placeholder={adjustmentType === 'percentage' ? '10' : '5.00'}
                        step="0.01"
                      />
                      <p style={styles.hint}>
                        Use positive values to increase, negative to decrease
                      </p>
                    </div>
                  </>
                )}

                <button
                  style={styles.submitBtn}
                  onClick={handleBulkPriceUpdate}
                  disabled={loading || !priceValue}
                >
                  {loading ? 'Processing...' : `Update ${selectedProducts.length} Product(s)`}
                </button>
              </div>
            )}

            {actionMode === 'campaign' && (
              <div style={styles.actionContent}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Campaign Name *</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    style={styles.input}
                    placeholder="e.g., Summer Sale 2026"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Discount Type</label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        value="percentage"
                        checked={discountType === 'percentage'}
                        onChange={(e) => setDiscountType(e.target.value)}
                      />
                      <span>Percentage (%)</span>
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        value="fixed_amount"
                        checked={discountType === 'fixed_amount'}
                        onChange={(e) => setDiscountType(e.target.value)}
                      />
                      <span>Fixed Amount (₺)</span>
                    </label>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Discount Value * {discountType === 'percentage' ? '(%)' : '(₺)'}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    style={styles.input}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date *</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date *</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <button
                  style={styles.submitBtn}
                  onClick={handleBulkCampaignCreate}
                  disabled={loading || !campaignName || !discountValue || !startDate || !endDate}
                >
                  {loading ? 'Creating...' : `Create Campaign for ${selectedProducts.length} Product(s)`}
                </button>
              </div>
            )}
              {resultMessage && (
                <div style={{
                  ...styles.resultMessage,
                  backgroundColor: resultMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'
                }}>
                  {resultMessage.text}
                </div>
              )}
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
    minHeight: '70vh',
    backgroundColor: 'var(--color-sand)',
    padding: 'var(--space-10) var(--container-pad)',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    padding: '0 0 var(--space-4) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    color: 'var(--color-black)',
  },
  subtitle: {
    margin: 'var(--space-2) 0 var(--space-6) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  filters: {
    display: 'flex',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  },
  searchInput: {
    flex: 1,
    padding: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  },
  categorySelect: {
    padding: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    minWidth: '200px',
  },
  selectionBar: {
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-blue)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  selectionText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
  },
  tableContainer: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 'var(--space-6)',
    boxShadow: 'var(--shadow-card)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: 'var(--space-4)',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
    backgroundColor: 'var(--color-sand)',
    borderBottom: '2px solid var(--color-border)',
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: 'var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  actionPanel: {
    position: 'fixed',
    bottom: 'var(--space-6)',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(calc(100vw - 48px), 920px)',
    backgroundColor: 'var(--color-charcoal)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.30)',
    zIndex: 100,
  },
  actionPanelInner: {
    padding: 'var(--space-4) var(--space-6)',
  },
  actionTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-3)',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-sand)',
  },
  selectedCount: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--color-charcoal)',
    backgroundColor: 'var(--color-yellow)',
    padding: '2px var(--space-3)',
    borderRadius: 'var(--radius-full)',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-4)',
  },
  tab: {
    flex: 1,
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
  },
  tabActive: {
    flex: 1,
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid var(--color-sand)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-sand)',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
  },
  actionContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 140px',
  },
  formRow: {
    display: 'contents',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-medium)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 'var(--space-1)',
  },
  input: {
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: 'var(--color-sand)',
  },
  radioGroup: {
    display: 'flex',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-1)',
    flexWrap: 'wrap',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'rgba(255,255,255,0.85)',
  },
  hint: {
    marginTop: 'var(--space-1)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'rgba(255,255,255,0.45)',
  },
  submitBtn: {
    padding: 'var(--space-2) var(--space-5)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-charcoal)',
    cursor: 'pointer',
    alignSelf: 'flex-end',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  resultMessage: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    marginTop: 'var(--space-3)',
  },
  center: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productLink: {
    color: 'var(--color-charcoal)',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-border)',
  },
};
