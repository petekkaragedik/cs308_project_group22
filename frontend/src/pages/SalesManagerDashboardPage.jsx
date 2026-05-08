import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function authHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const NAV_CARDS = [
  {
    key: 'discounts',
    label: 'Discount Management',
    description: 'Set and manage product discounts and promotional pricing.',
    path: '/sales-manager/discounts',
  },
  {
    key: 'invoices',
    label: 'Invoice Management',
    description: 'View and download customer invoices for all orders.',
    path: '/sales-manager/invoices',
  },
  {
    key: 'revenue',
    label: 'Revenue & Profit Chart',
    description: 'Analyse revenue trends and profit margins over time.',
    path: '/sales-manager/revenue',
  },
  {
    key: 'refunds',
    label: 'Refund Requests',
    description: 'Review and process customer refund requests.',
    path: '/sales-manager/refunds',
  },
];

export default function SalesManagerDashboardPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login?next=/sales-manager/dashboard');
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
            This page is only available to sales managers.
          </p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <style>{`
        .sm-nav-card { cursor: pointer; transition: box-shadow var(--transition-base), transform var(--transition-base); }
        .sm-nav-card:hover { box-shadow: var(--shadow-md) !important; transform: translateY(-2px); }
      `}</style>

      <Navbar />

      <div style={styles.page}>
        <h1 style={styles.title}>Sales Manager Dashboard</h1>
        <p style={styles.subtitle}>
          Manage discounts, invoices, revenue analytics, and customer refunds.
        </p>

        <div style={styles.navGrid}>
          {NAV_CARDS.map((card) => (
            <button
              key={card.key}
              className="sm-nav-card"
              style={styles.navCard}
              onClick={() => navigate(card.path)}
            >
              <div style={styles.cardLabel}>{card.label}</div>
              <div style={styles.cardDescription}>{card.description}</div>
              <div style={styles.cardArrow}>→</div>
            </button>
          ))}
        </div>
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
    margin: 'var(--space-2) 0 var(--space-8) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  navGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 'var(--space-5)',
  },
  navCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    cursor: 'pointer',
  },
  cardLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-black)',
  },
  cardDescription: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    flex: 1,
  },
  cardArrow: {
    marginTop: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    color: 'var(--color-charcoal)',
    alignSelf: 'flex-end',
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
