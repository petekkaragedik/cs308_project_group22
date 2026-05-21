import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const DASHBOARD_TABS = [
  { key: 'stock', label: 'Stock Management' },
  { key: 'deliveries', label: 'Deliveries' },
  { key: 'comments', label: 'Comment Moderation' },
];

const ORDER_STATUS_FILTERS = [
  { key: 'processing', label: 'Processing' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'all', label: 'All' },
];

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function getStockStatus(quantity) {
  if (quantity === 0) return 'out';
  if (quantity < 10) return 'low';
  return 'good';
}

function stockBadgeStyle(quantity) {
  const base = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-black)',
  };
  const status = getStockStatus(quantity);
  if (status === 'good') return { ...base, backgroundColor: 'var(--color-success)' };
  if (status === 'low') return { ...base, backgroundColor: 'var(--color-warning)' };
  return { ...base, backgroundColor: 'var(--color-error)' };
}

function orderStatusBadge(status) {
  const base = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-black)',
  };
  if (status === 'processing') return { ...base, backgroundColor: 'var(--color-warning)' };
  if (status === 'in_transit') return { ...base, backgroundColor: 'var(--color-blue)' };
  if (status === 'delivered') return { ...base, backgroundColor: 'var(--color-success)' };
  if (status === 'cancelled') return { ...base, backgroundColor: 'var(--color-error)' };
  return { ...base, backgroundColor: 'var(--color-border)' };
}

export default function ProductManagerDashboardPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');
  const [activeTab, setActiveTab] = useState('stock');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Stock state
  const [products, setProducts] = useState([]);
  const [editingStockId, setEditingStockId] = useState(null);
  const [editStockValue, setEditStockValue] = useState('');

  // Delivery state
  const [orders, setOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('processing');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Comment moderation state
  const [commentStatus, setCommentStatus] = useState('pending');
  const [comments, setComments] = useState([]);
  const [commentBusyId, setCommentBusyId] = useState(null);

  // Stock alerts state
  const [stockAlerts, setStockAlerts] = useState({ outOfStock: [], lowStock: [], totalAlerts: 0 });
  const [stockAlertsLoading, setStockAlertsLoading] = useState(false);
  const [stockAlertsError, setStockAlertsError] = useState('');
  const [outOfStockExpanded, setOutOfStockExpanded] = useState(false);
  const [lowStockExpanded, setLowStockExpanded] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login?next=/product-manager/dashboard');
      return;
    }
    fetch(apiUrl('/api/profile'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (data?.role === 'product_manager') {
          setAuthState('authorized');
        } else {
          setAuthState('unauthorized');
        }
      })
      .catch(() => setAuthState('unauthorized'));
  }, [navigate]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/product-manager/dashboard-summary'), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      /* keep existing summary */
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/product-manager/stock-overview'), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Could not load products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = commentStatus === 'all'
        ? apiUrl('/api/admin/comments')
        : apiUrl(`/api/admin/comments?status=${encodeURIComponent(commentStatus)}`);
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Could not load comments. Please try again.');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [commentStatus]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = apiUrl(`/api/product-manager/deliveries?status=${encodeURIComponent(orderStatusFilter)}`);
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Could not load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [orderStatusFilter]);

  const loadStockAlerts = useCallback(async () => {
    setStockAlertsLoading(true);
    setStockAlertsError('');
    try {
      const res = await fetch(apiUrl('/api/admin/stock-alerts'), { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStockAlerts({
        outOfStock: Array.isArray(data.outOfStock) ? data.outOfStock : [],
        lowStock: Array.isArray(data.lowStock) ? data.lowStock : [],
        totalAlerts: typeof data.totalAlerts === 'number' ? data.totalAlerts : 0,
      });
    } catch {
      setStockAlertsError('Could not load stock alerts.');
    } finally {
      setStockAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState === 'authorized') {
      loadSummary();
      if (activeTab === 'stock') loadProducts();
      if (activeTab === 'deliveries') loadOrders();
      if (activeTab === 'comments') loadComments();
    }
  }, [authState, activeTab, loadSummary, loadProducts, loadOrders, loadComments]);

  useEffect(() => {
    if (authState === 'authorized') {
      loadStockAlerts();
    }
  }, [authState, loadStockAlerts]);

  async function updateStock(productId, newStock) {
    try {
      const res = await fetch(apiUrl(`/api/product-manager/products/${productId}/stock`), {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityInStock: newStock }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadProducts();
      await loadSummary();
      setEditingStockId(null);
      setEditStockValue('');
    } catch (e) {
      setError('Failed to update stock.');
    }
  }

  function startEditStock(product) {
    setEditingStockId(product.id);
    setEditStockValue(String(product.quantityInStock));
  }

  function cancelEditStock() {
    setEditingStockId(null);
    setEditStockValue('');
  }

  function saveStock(productId) {
    const val = Number(editStockValue);
    if (!Number.isInteger(val) || val < 0) {
      setError('Stock must be a non-negative integer.');
      return;
    }
    updateStock(productId, val);
  }

  async function updateOrderStatus(orderId, newStatus) {
    setUpdatingOrderId(orderId);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/product-manager/orders/${orderId}/status`), {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to update order status`);
      }

      await loadOrders();
      await loadSummary();
    } catch (e) {
      setError(e.message || 'Failed to update order status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function actOnComment(id, action) {
    setCommentBusyId(id);
    setError('');
    try {
      const isDelete = action === 'delete';
      const url = isDelete
        ? apiUrl(`/api/admin/comments/${id}`)
        : apiUrl(`/api/admin/comments/${id}/${action}`);
      const res = await fetch(url, {
        method: isDelete ? 'DELETE' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadComments();
      await loadSummary();
    } catch (e) {
      setError(`Failed to ${action} comment.`);
    } finally {
      setCommentBusyId(null);
    }
  }

  function getNextStatuses(currentStatus) {
    const statusFlow = {
      'processing': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };
    return statusFlow[currentStatus] || [];
  }

  if (authState === 'checking') {
    return (
      <>
        <Navbar />
        <div style={styles.center}>
          <span style={styles.centerText}>Loading...</span>
        </div>
        <Footer />
      </>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <>
        <Navbar />
        <div style={styles.center}>
          <h1 style={styles.deniedTitle}>Access Denied</h1>
          <p style={styles.deniedText}>
            This page is only available to product managers.
          </p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <style>{`
        .pm-tab { cursor: pointer; }
        .pm-tab:hover { background-color: var(--color-blue) !important; }
        .pm-tab.active { background-color: var(--color-charcoal) !important; color: var(--color-sand) !important; }
        .pm-filter-tab { cursor: pointer; }
        .pm-filter-tab:hover { background-color: var(--color-blue) !important; }
        .pm-filter-tab.active { background-color: var(--color-charcoal) !important; color: var(--color-sand) !important; }
        .stock-edit-btn:hover { background-color: var(--color-blue) !important; }
        .stock-save-btn:hover { background-color: var(--color-success) !important; }
        .stock-cancel-btn:hover { background-color: var(--color-error) !important; }
        .status-update-btn:hover:not(:disabled) { background-color: var(--color-blue) !important; color: var(--color-white) !important; }
        .status-update-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mod-tab { cursor: pointer; }
        .mod-tab:hover { background-color: var(--color-blue) !important; }
        .mod-tab.active { background-color: var(--color-charcoal) !important; color: var(--color-sand) !important; }
        .mod-approve:hover:not(:disabled) { background-color: var(--color-success) !important; }
        .mod-reject:hover:not(:disabled) { background-color: var(--color-warning) !important; }
        .mod-delete:hover:not(:disabled) { background-color: var(--color-error) !important; }
        .mod-approve:disabled, .mod-reject:disabled, .mod-delete:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes pm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .alerts-skeleton { animation: pm-pulse 1.5s ease-in-out infinite; }
        .alerts-expand-btn:hover { text-decoration: underline; }
      `}</style>

      <Navbar />

      <div style={styles.page}>
        <h1 style={styles.title}>Product Manager Dashboard</h1>
        <p style={styles.subtitle}>
          Manage product stock, track deliveries, and moderate customer comments.
        </p>

        {/* Summary Cards */}
        {summary && (
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Products</div>
              <div style={styles.summaryValue}>{summary.total_products || 0}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Pending Comments</div>
              <div style={styles.summaryValue}>{summary.pending_comments || 0}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Processing Orders</div>
              <div style={styles.summaryValue}>{summary.processing_orders || 0}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>In Transit</div>
              <div style={styles.summaryValue}>{summary.in_transit_orders || 0}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Low Stock</div>
              <div style={styles.summaryValue}>{summary.low_stock || 0}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Out of Stock</div>
              <div style={styles.summaryValue}>{summary.out_of_stock || 0}</div>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <div style={styles.tabs}>
          {DASHBOARD_TABS.map((t) => (
            <button
              key={t.key}
              className={`pm-tab${activeTab === t.key ? ' active' : ''}`}
              style={styles.tab}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {t.key === 'stock' && stockAlerts.totalAlerts > 0 && (
                <span style={styles.alertBadge}>{stockAlerts.totalAlerts}</span>
              )}
              {t.key === 'comments' && summary?.pending_comments > 0 && (
                <span style={styles.badge}>{summary.pending_comments}</span>
              )}
            </button>
          ))}
        </div>

        {/* Stock Alerts Section */}
        <div style={styles.alertsSection}>
          <div style={styles.alertsSectionHeader}>
            <AlertTriangle size={18} color="var(--color-charcoal)" />
            <span style={styles.alertsSectionTitle}>Stock Alerts</span>
          </div>

          {stockAlertsLoading ? (
            <div className="alerts-skeleton" style={styles.alertsSkeleton} />
          ) : stockAlertsError ? (
            <div style={styles.alertsInlineError}>{stockAlertsError}</div>
          ) : stockAlerts.totalAlerts === 0 ? (
            <div style={styles.alertsAllGood}>
              <CheckCircle size={16} color="var(--color-charcoal)" style={{ opacity: 0.6, flexShrink: 0 }} />
              <span>All products are well-stocked</span>
            </div>
          ) : (
            <>
              {stockAlerts.outOfStock.length > 0 && (
                <div style={styles.alertsGroup}>
                  <div style={styles.alertsSubHeaderOut}>Out of Stock</div>
                  {(outOfStockExpanded ? stockAlerts.outOfStock : stockAlerts.outOfStock.slice(0, 5)).map((p) => (
                    <div key={p.productId} style={styles.alertRowOut}>
                      {p.firstImage && (
                        <img src={p.firstImage} alt="" style={styles.alertThumb} />
                      )}
                      <div style={styles.alertRowMain}>
                        <Link to={`/products/${p.productId}`} style={styles.alertProductName}>{p.name}</Link>
                        <span style={styles.alertProductModel}>{p.model}</span>
                      </div>
                      <div style={styles.alertRowMeta}>
                        <span style={styles.alertCategoryPill}>{p.categoryName || '—'}</span>
                        <span style={styles.alertStockBadgeOut}>OUT OF STOCK</span>
                        <span style={styles.alertPrice}>₺{Number(p.price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {stockAlerts.outOfStock.length > 5 && (
                    <button
                      className="alerts-expand-btn"
                      style={styles.alertsExpandBtn}
                      onClick={() => setOutOfStockExpanded((v) => !v)}
                    >
                      {outOfStockExpanded ? 'Show less' : `Show ${stockAlerts.outOfStock.length - 5} more`}
                    </button>
                  )}
                </div>
              )}

              {stockAlerts.lowStock.length > 0 && (
                <div style={styles.alertsGroup}>
                  <div style={styles.alertsSubHeaderLow}>Low Stock (≤5 remaining)</div>
                  {(lowStockExpanded ? stockAlerts.lowStock : stockAlerts.lowStock.slice(0, 5)).map((p) => (
                    <div key={p.productId} style={styles.alertRowLow}>
                      {p.firstImage && (
                        <img src={p.firstImage} alt="" style={styles.alertThumb} />
                      )}
                      <div style={styles.alertRowMain}>
                        <Link to={`/products/${p.productId}`} style={styles.alertProductName}>{p.name}</Link>
                        <span style={styles.alertProductModel}>{p.model}</span>
                      </div>
                      <div style={styles.alertRowMeta}>
                        <span style={styles.alertCategoryPill}>{p.categoryName || '—'}</span>
                        <span style={styles.alertStockBadgeLow}>{p.quantityInStock} left</span>
                        <span style={styles.alertPrice}>₺{Number(p.price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {stockAlerts.lowStock.length > 5 && (
                    <button
                      className="alerts-expand-btn"
                      style={styles.alertsExpandBtn}
                      onClick={() => setLowStockExpanded((v) => !v)}
                    >
                      {lowStockExpanded ? 'Show less' : `Show ${stockAlerts.lowStock.length - 5} more`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Stock Management Tab */}
        {activeTab === 'stock' && (
          <>
            {loading ? (
              <div style={styles.center}><span style={styles.centerText}>Loading...</span></div>
            ) : products.length === 0 ? (
              <div style={styles.empty}>No products found.</div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Model</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Color</th>
                      <th style={styles.th}>Price (TRY)</th>
                      <th style={styles.th}>Stock</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.stockProductCell}>
                            {p.firstImage && (
                              <img src={p.firstImage} alt="" style={styles.alertThumb} />
                            )}
                            <Link to={`/products/${p.id}`} style={styles.productLink}>{p.name}</Link>
                          </div>
                        </td>
                        <td style={styles.td}>{p.model || '-'}</td>
                        <td style={styles.td}>{p.categoryName || '-'}</td>
                        <td style={styles.td}>{p.color || '-'}</td>
                        <td style={styles.td}>₺{Number(p.price).toFixed(2)}</td>
                        <td style={styles.td}>
                          {editingStockId === p.id ? (
                            <input
                              type="number"
                              min="0"
                              value={editStockValue}
                              onChange={(e) => setEditStockValue(e.target.value)}
                              style={styles.stockInput}
                            />
                          ) : (
                            p.quantityInStock
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={stockBadgeStyle(p.quantityInStock)}>
                            {getStockStatus(p.quantityInStock)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {editingStockId === p.id ? (
                            <div style={styles.stockActions}>
                              <button
                                className="stock-save-btn"
                                style={styles.stockBtn}
                                onClick={() => saveStock(p.id)}
                              >
                                Save
                              </button>
                              <button
                                className="stock-cancel-btn"
                                style={styles.stockBtn}
                                onClick={cancelEditStock}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="stock-edit-btn"
                              style={styles.stockBtn}
                              onClick={() => startEditStock(p)}
                            >
                              Edit Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <>
            <div style={styles.filterTabs}>
              {ORDER_STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`pm-filter-tab${orderStatusFilter === f.key ? ' active' : ''}`}
                  style={styles.filterTab}
                  onClick={() => setOrderStatusFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={styles.center}><span style={styles.centerText}>Loading...</span></div>
            ) : orders.length === 0 ? (
              <div style={styles.empty}>No orders in this category.</div>
            ) : (
              <div style={styles.list}>
                {orders.map((o) => {
                  const nextStatuses = getNextStatuses(o.status);
                  const canUpdate = nextStatuses.length > 0;
                  const isUpdating = updatingOrderId === o.id;

                  return (
                    <div key={o.id} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <div>
                          <div style={styles.invoiceNumber}>#{o.invoice_number}</div>
                          <div style={styles.orderMeta}>
                            {o.customer_name} · {o.customer_email}
                          </div>
                        </div>
                        <span style={orderStatusBadge(o.status)}>
                          {String(o.status).replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={styles.orderDetails}>
                        <div style={styles.orderDetail}>
                          <span style={styles.orderLabel}>Total:</span>
                          <span style={styles.orderValue}>
                            ₺{Number(o.total_amount).toFixed(2)} {o.currency || 'TRY'}
                          </span>
                        </div>
                        <div style={styles.orderDetail}>
                          <span style={styles.orderLabel}>Items:</span>
                          <span style={styles.orderValue}>{o.item_count}</span>
                        </div>
                        <div style={styles.orderDetail}>
                          <span style={styles.orderLabel}>Date:</span>
                          <span style={styles.orderValue}>{formatDate(o.created_at)}</span>
                        </div>
                      </div>

                      {canUpdate && (
                        <div style={styles.statusUpdateSection}>
                          <div style={styles.statusUpdateLabel}>Update Status:</div>
                          <div style={styles.statusUpdateActions}>
                            {nextStatuses.map((status) => (
                              <button
                                key={status}
                                className="status-update-btn"
                                style={styles.statusUpdateBtn}
                                onClick={() => updateOrderStatus(o.id, status)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? 'Updating...' : `Mark as ${String(status).replace(/_/g, ' ')}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Comment Moderation Tab */}
        {activeTab === 'comments' && (
          <>
            <div style={styles.filterTabs}>
              {[
                { key: 'pending', label: 'Pending' },
                { key: 'approved', label: 'Approved' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'all', label: 'All' },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`mod-tab${commentStatus === t.key ? ' active' : ''}`}
                  style={styles.filterTab}
                  onClick={() => setCommentStatus(t.key)}
                >
                  {t.label}
                  {t.key === 'pending' && summary?.pending_comments > 0 && (
                    <span style={styles.badge}>{summary.pending_comments}</span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={styles.center}><span style={styles.centerText}>Loading...</span></div>
            ) : comments.length === 0 ? (
              <div style={styles.empty}>No comments in this category.</div>
            ) : (
              <div style={styles.list}>
                {comments.map((c) => (
                  <div key={c.id} style={styles.card}>
                    <div style={styles.commentCardHeader}>
                      <div style={styles.commentMeta}>
                        <span style={styles.commentUser}>{c.user_name || `User #${c.user_id}`}</span>
                        <span style={styles.commentMetaSep}>·</span>
                        <span style={styles.commentMuted}>{c.user_email}</span>
                      </div>
                      <span style={commentStatusBadge(c.status)}>{c.status}</span>
                    </div>
                    <div style={styles.commentProductLine}>
                      Product: <span style={styles.commentProductId}>{c.product_id}</span>
                    </div>
                    <p style={styles.commentBody}>{c.body}</p>
                    <div style={styles.commentFooter}>
                      <span style={styles.commentDate}>{formatDate(c.created_at)}</span>
                      <div style={styles.commentActions}>
                        {c.status !== 'approved' && (
                          <button
                            className="mod-approve"
                            style={styles.stockBtn}
                            disabled={commentBusyId === c.id}
                            onClick={() => actOnComment(c.id, 'approve')}
                          >
                            {commentBusyId === c.id ? '...' : 'Approve'}
                          </button>
                        )}
                        {c.status !== 'rejected' && (
                          <button
                            className="mod-reject"
                            style={styles.stockBtn}
                            disabled={commentBusyId === c.id}
                            onClick={() => actOnComment(c.id, 'reject')}
                          >
                            {commentBusyId === c.id ? '...' : 'Reject'}
                          </button>
                        )}
                        <button
                          className="mod-delete"
                          style={styles.stockBtn}
                          disabled={commentBusyId === c.id}
                          onClick={() => actOnComment(c.id, 'delete')}
                        >
                          {commentBusyId === c.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </>
  );
}

function commentStatusBadge(s) {
  const base = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-black)',
  };
  if (s === 'approved') return { ...base, backgroundColor: 'var(--color-success)' };
  if (s === 'rejected') return { ...base, backgroundColor: 'var(--color-error)' };
  return { ...base, backgroundColor: 'var(--color-warning)' };
}

const styles = {
  page: {
    minHeight: '70vh',
    backgroundColor: 'var(--color-sand)',
    padding: 'var(--space-10) var(--container-pad)',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    letterSpacing: 'var(--tracking-wide)',
  },
  subtitle: {
    margin: 'var(--space-2) 0 var(--space-6) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  },
  summaryCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  summaryLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    marginBottom: 'var(--space-2)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
  },
  summaryValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-6)',
    flexWrap: 'wrap',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-warning)',
    color: 'var(--color-black)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-bold)',
    letterSpacing: 'var(--tracking-normal)',
  },
  alertBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 18,
    padding: '0 4px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-error, #e53e3e)',
    color: '#ffffff',
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    fontWeight: 'var(--weight-bold)',
    letterSpacing: 'var(--tracking-normal)',
  },
  alertsSection: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-xl)',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 'var(--space-6)',
  },
  alertsSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-4)',
  },
  alertsSectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-black)',
    margin: 0,
  },
  alertsSkeleton: {
    backgroundColor: 'var(--color-sand)',
    borderRadius: 'var(--radius-sm)',
    height: 80,
  },
  alertsInlineError: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    opacity: 0.7,
  },
  alertsAllGood: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    opacity: 0.6,
  },
  alertsGroup: {
    marginBottom: 'var(--space-4)',
  },
  alertsSubHeaderOut: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--color-error)',
    marginBottom: 'var(--space-2)',
  },
  alertsSubHeaderLow: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--color-warning)',
    marginBottom: 'var(--space-2)',
  },
  alertRowOut: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'rgba(229, 62, 62, 0.06)',
    borderBottom: '1px solid var(--color-border)',
  },
  alertRowLow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'rgba(236, 153, 75, 0.06)',
    borderBottom: '1px solid var(--color-border)',
  },
  alertThumb: {
    width: 36,
    height: 44,
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    flexShrink: 0,
  },
  alertRowMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1,
    minWidth: 0,
  },
  alertProductName: {
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  alertProductModel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    opacity: 0.6,
  },
  alertRowMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  alertCategoryPill: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal)',
    backgroundColor: 'var(--color-sand)',
    borderRadius: 'var(--radius-full)',
    padding: '2px var(--space-2)',
  },
  alertStockBadgeOut: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-error)',
  },
  alertStockBadgeLow: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-bold)',
    color: '#D97706',
  },
  alertPrice: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    textAlign: 'right',
  },
  alertsExpandBtn: {
    display: 'block',
    background: 'none',
    border: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    opacity: 0.6,
    cursor: 'pointer',
    padding: '0.5rem 0',
    textDecoration: 'none',
  },
  filterTabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-4)',
    flexWrap: 'wrap',
  },
  filterTab: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  tableContainer: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-body)',
  },
  th: {
    backgroundColor: 'var(--color-sand)',
    padding: 'var(--space-3) var(--space-4)',
    textAlign: 'left',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    borderBottom: '2px solid var(--color-border)',
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
  },
  productLink: {
    color: 'inherit',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-border)',
  },
  stockProductCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  stockInput: {
    width: '80px',
    padding: 'var(--space-1) var(--space-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
  },
  stockActions: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  stockBtn: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-1) var(--space-3)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5) var(--space-6)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-4)',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  invoiceNumber: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
  },
  orderMeta: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    marginTop: 'var(--space-1)',
  },
  orderDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  orderDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  orderValue: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
  },
  statusUpdateSection: {
    marginTop: 'var(--space-4)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--color-border)',
  },
  statusUpdateLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-charcoal-light)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    marginBottom: 'var(--space-2)',
  },
  statusUpdateActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  statusUpdateBtn: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  commentCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-2)',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  commentUser: {
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-black)',
  },
  commentMetaSep: { color: 'var(--color-charcoal-light)' },
  commentMuted: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  commentProductLine: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    marginBottom: 'var(--space-3)',
  },
  commentProductId: {
    color: 'var(--color-charcoal)',
    fontWeight: 'var(--weight-medium)',
  },
  commentBody: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal)',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  commentFooter: {
    marginTop: 'var(--space-4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  commentDate: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-charcoal-light)',
  },
  commentActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  empty: {
    padding: 'var(--space-10) 0',
    textAlign: 'center',
    fontFamily: 'var(--font-heading)',
    fontStyle: 'italic',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-charcoal-light)',
  },
  center: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'var(--space-10) var(--container-pad)',
  },
  centerText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-charcoal-light)',
  },
  deniedTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    color: 'var(--color-black)',
    margin: 0,
  },
  deniedText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
    marginTop: 'var(--space-2)',
  },
  errorBox: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-error)',
    color: '#991b1b',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    marginBottom: 'var(--space-4)',
  },
};
