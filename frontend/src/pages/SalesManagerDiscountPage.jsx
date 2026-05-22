import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CampaignModal from '../components/CampaignModal';

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SalesManagerDiscountPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login?next=/sales-manager/discounts');
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

  useEffect(() => {
    if (authState === 'authorized') {
      fetchCampaigns();
    }
  }, [authState, activeTab]);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/discounts/campaigns?status=${activeTab}`), {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Fetch campaigns error:', err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCampaign(null);
    setShowModal(true);
  }

  async function openEditModal(campaign) {
    try {
      const res = await fetch(apiUrl(`/api/discounts/campaigns/${campaign.id}`), {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch campaign details');
      const fullCampaign = await res.json();
      setEditingCampaign(fullCampaign);
      setShowModal(true);
    } catch (err) {
      console.error('Fetch campaign details error:', err);
      alert('Failed to load campaign details');
    }
  }

  async function handleToggleActive(campaignId, currentlyActive) {
    try {
      const res = await fetch(apiUrl(`/api/discounts/campaigns/${campaignId}`), {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentlyActive })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update campaign');
      }

      fetchCampaigns();
    } catch (err) {
      console.error('Toggle campaign error:', err);
      alert(err.message);
    }
  }

  async function handleDelete(campaignId) {
    try {
      const res = await fetch(apiUrl(`/api/discounts/campaigns/${campaignId}`), {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete campaign');
      }

      setDeleteConfirm(null);
      fetchCampaigns();
    } catch (err) {
      console.error('Delete campaign error:', err);
      alert(err.message);
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getStatusBadgeStyle(status) {
    const base = {
      display: 'inline-block',
      padding: 'var(--space-1) var(--space-3)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-medium)',
      fontFamily: 'var(--font-body)',
    };

    switch (status) {
      case 'active':
        return { ...base, backgroundColor: 'var(--color-success)', color: 'var(--color-black)' };
      case 'upcoming':
        return { ...base, backgroundColor: 'var(--color-blue)', color: 'var(--color-black)' };
      case 'expired':
        return { ...base, backgroundColor: 'var(--color-border)', color: 'var(--color-charcoal)' };
      case 'deleted':
        return { ...base, backgroundColor: '#fee', color: '#c00' };
      case 'inactive':
        return { ...base, backgroundColor: 'var(--color-error)', color: 'var(--color-white)' };
      default:
        return base;
    }
  }

  if (authState === 'checking') {
    return (
      <>
        <Navbar />
        <div style={styles.center}><span style={styles.centerText}>Loading...</span></div>
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
          <p style={styles.deniedText}>This page is only available to sales managers.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <button style={styles.backBtn} onClick={() => navigate('/sales-manager/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>Discount Management</h1>
        <p style={styles.subtitle}>Create and manage promotional campaigns.</p>

        <button style={styles.createBtn} onClick={openCreateModal}>
          + Create New Campaign
        </button>

        <div style={styles.tabs}>
          {['active', 'upcoming', 'expired', 'deleted'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={styles.loadingText}>Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              No {activeTab === 'all' ? '' : activeTab} campaigns found.
            </p>
            {activeTab === 'active' && (
              <button style={styles.createBtnSecondary} onClick={openCreateModal}>
                Create Your First Campaign
              </button>
            )}
          </div>
        ) : (
          <div style={styles.campaignList}>
            {campaigns.map(campaign => (
              <div key={campaign.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>{campaign.name}</h3>
                    <span style={getStatusBadgeStyle(campaign.status)}>
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.status !== 'deleted' && (
                    <div style={styles.cardActions}>
                      <button style={styles.editBtn} onClick={() => openEditModal(campaign)}>
                        Edit
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => setDeleteConfirm(campaign.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {campaign.description && (
                  <p style={styles.description}>{campaign.description}</p>
                )}

                <div style={styles.cardDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Discount:</span>
                    <span style={styles.detailValue}>
                      {campaign.discount_type === 'percentage'
                        ? `${campaign.discount_value}% off`
                        : `₺${campaign.discount_value} off`}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Period:</span>
                    <span style={styles.detailValue}>
                      {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Products:</span>
                    <span style={styles.detailValue}>{campaign.product_count || 0}</span>
                  </div>
                  {campaign.categories && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Categories:</span>
                      <span style={styles.detailValue}>{campaign.categories}</span>
                    </div>
                  )}
                </div>

                {deleteConfirm === campaign.id && (
                  <div style={styles.confirmDelete}>
                    <p style={styles.confirmText}>Are you sure you want to delete this campaign?</p>
                    <div style={styles.confirmActions}>
                      <button
                        style={styles.confirmCancelBtn}
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                      <button
                        style={styles.confirmDeleteBtn}
                        onClick={() => handleDelete(campaign.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />

      <CampaignModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCampaign(null);
        }}
        onSuccess={fetchCampaigns}
        editCampaign={editingCampaign}
      />
    </>
  );
}

const styles = {
  page: {
    minHeight: '70vh',
    backgroundColor: 'var(--color-sand)',
    padding: 'var(--space-10) var(--container-pad)',
    maxWidth: '1200px',
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
    display: 'block',
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
  createBtn: {
    padding: 'var(--space-3) var(--space-6)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-medium)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-yellow)',
    cursor: 'pointer',
    marginBottom: 'var(--space-6)',
  },
  createBtnSecondary: {
    padding: 'var(--space-3) var(--space-6)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid var(--color-black)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-white)',
    cursor: 'pointer',
    marginTop: 'var(--space-4)',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-6)',
    flexWrap: 'wrap',
  },
  tab: {
    padding: 'var(--space-3) var(--space-5)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-white)',
    cursor: 'pointer',
  },
  tabActive: {
    padding: 'var(--space-3) var(--space-5)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid var(--color-black)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-sand)',
    cursor: 'pointer',
  },
  loadingText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
    textAlign: 'center',
    padding: 'var(--space-10)',
  },
  emptyState: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-10)',
    textAlign: 'center',
    border: '1px solid var(--color-border)',
  },
  emptyText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
    margin: 0,
  },
  campaignList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
    position: 'relative',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-4)',
    gap: 'var(--space-4)',
  },
  cardTitle: {
    margin: '0 0 var(--space-2) 0',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-black)',
  },
  cardActions: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  toggleBtn: {
    padding: 'var(--space-2) var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid var(--color-blue)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-blue)',
    cursor: 'pointer',
  },
  editBtn: {
    padding: 'var(--space-2) var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-white)',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: 'var(--space-2) var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-error)',
    cursor: 'pointer',
  },
  description: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    marginBottom: 'var(--space-4)',
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  detailRow: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  detailLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-charcoal)',
    minWidth: '100px',
  },
  detailValue: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  confirmDelete: {
    marginTop: 'var(--space-4)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-sand)',
    borderRadius: 'var(--radius-md)',
  },
  confirmText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    margin: '0 0 var(--space-3) 0',
  },
  confirmActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    justifyContent: 'flex-end',
  },
  confirmCancelBtn: {
    padding: 'var(--space-2) var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-white)',
    cursor: 'pointer',
  },
  confirmDeleteBtn: {
    padding: 'var(--space-2) var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-error)',
    color: 'var(--color-white)',
    cursor: 'pointer',
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
};
