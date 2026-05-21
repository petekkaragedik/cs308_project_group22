import { useState, useEffect } from 'react';
import { apiUrl } from '../apiBase';

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CampaignModal({ isOpen, onClose, onSuccess, editCampaign = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applyToTab, setApplyToTab] = useState('products');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchCategories();

      if (editCampaign) {
        setName(editCampaign.name || '');
        setDescription(editCampaign.description || '');
        setDiscountType(editCampaign.discount_type || 'percentage');
        setDiscountValue(editCampaign.discount_value?.toString() || '');
        setStartDate(formatDateTimeLocal(editCampaign.start_date) || '');
        setEndDate(formatDateTimeLocal(editCampaign.end_date) || '');
        if (editCampaign.products) {
          setSelectedProducts(editCampaign.products.map(p => p.id));
        }
        if (editCampaign.categories) {
          setSelectedCategories(editCampaign.categories);
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, editCampaign]);

  function formatDateTimeLocal(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  }

  function resetForm() {
    setName('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('');
    setStartDate('');
    setEndDate('');
    setSelectedProducts([]);
    setSelectedCategories([]);
    setProductSearch('');
    setError('');
  }

  async function fetchProducts() {
    try {
      const res = await fetch(apiUrl('/api/products'));
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(apiUrl('/api/products'));
      const data = await res.json();
      const uniqueCategories = [...new Set(data.map(p => p.categoryName))].filter(Boolean);
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

  function toggleCategory(categoryName) {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  }

  function validate() {
    if (!name.trim()) return 'Campaign name is required';
    if (!discountValue || Number(discountValue) <= 0) return 'Discount value must be greater than 0';
    if (discountType === 'percentage' && Number(discountValue) > 100) return 'Percentage cannot exceed 100';
    if (discountType === 'fixed_amount' && Number(discountValue) > 10000) return 'Fixed amount cannot exceed 10,000';
    if (!startDate) return 'Start date is required';
    if (!endDate) return 'End date is required';
    if (new Date(startDate) >= new Date(endDate)) return 'End date must be after start date';
    if (selectedProducts.length === 0 && selectedCategories.length === 0) {
      return 'Please select at least one product or category';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      is_active: true,
      product_ids: selectedProducts.length > 0 ? selectedProducts : undefined,
      category_names: selectedCategories.length > 0 ? selectedCategories : undefined
    };

    try {
      const url = editCampaign
        ? apiUrl(`/api/discounts/campaigns/${editCampaign.id}`)
        : apiUrl('/api/discounts/campaigns');
      const method = editCampaign ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save campaign');
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.model?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>{editCampaign ? 'Edit Campaign' : 'Create New Campaign'}</h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Campaign Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              maxLength={255}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...styles.input, minHeight: '80px' }}
              rows={3}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Discount Type *</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="percentage"
                  checked={discountType === 'percentage'}
                  onChange={(e) => setDiscountType(e.target.value)}
                />
                <span style={styles.radioText}>Percentage (%)</span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="fixed_amount"
                  checked={discountType === 'fixed_amount'}
                  onChange={(e) => setDiscountType(e.target.value)}
                />
                <span style={styles.radioText}>Fixed Amount (₺)</span>
              </label>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Discount Value * {discountType === 'percentage' ? '(0-100)' : '(₺)'}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              style={styles.input}
              min="0"
              step="0.01"
              required
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
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>End Date *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Apply To *</label>
            <div style={styles.tabs}>
              <button
                type="button"
                style={applyToTab === 'products' ? styles.tabActive : styles.tab}
                onClick={() => setApplyToTab('products')}
              >
                Products
              </button>
              <button
                type="button"
                style={applyToTab === 'categories' ? styles.tabActive : styles.tab}
                onClick={() => setApplyToTab('categories')}
              >
                Categories
              </button>
            </div>

            {applyToTab === 'products' && (
              <div style={styles.selectionArea}>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ ...styles.input, marginBottom: 'var(--space-3)' }}
                />
                <div style={styles.checkboxList}>
                  {filteredProducts.map(product => (
                    <label key={product.id} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                      />
                      <span style={styles.checkboxText}>
                        {product.name} - ₺{product.price}
                      </span>
                    </label>
                  ))}
                </div>
                <p style={styles.selectedCount}>{selectedProducts.length} product(s) selected</p>
              </div>
            )}

            {applyToTab === 'categories' && (
              <div style={styles.selectionArea}>
                <div style={styles.checkboxList}>
                  {categories.map(category => (
                    <label key={category} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <span style={styles.checkboxText}>{category}</span>
                    </label>
                  ))}
                </div>
                <p style={styles.selectedCount}>{selectedCategories.length} category(ies) selected</p>
              </div>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={loading}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : editCampaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--space-4)',
  },
  modal: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-8)',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
  },
  title: {
    margin: '0 0 var(--space-6) 0',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    color: 'var(--color-black)',
  },
  formGroup: {
    marginBottom: 'var(--space-5)',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)',
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-2)',
  },
  input: {
    width: '100%',
    padding: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxSizing: 'border-box',
  },
  radioGroup: {
    display: 'flex',
    gap: 'var(--space-4)',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  radioText: {
    marginLeft: 'var(--space-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal)',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-4)',
  },
  tab: {
    flex: 1,
    padding: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-white)',
    cursor: 'pointer',
  },
  tabActive: {
    flex: 1,
    padding: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid var(--color-black)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-sand)',
    cursor: 'pointer',
  },
  selectionArea: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
  },
  checkboxList: {
    maxHeight: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: 'var(--space-2)',
  },
  checkboxText: {
    marginLeft: 'var(--space-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  selectedCount: {
    marginTop: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
  },
  error: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-error)',
    marginBottom: 'var(--space-4)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-6)',
  },
  cancelBtn: {
    padding: 'var(--space-3) var(--space-6)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-white)',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: 'var(--space-3) var(--space-6)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-medium)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-yellow)',
    cursor: 'pointer',
  },
};
