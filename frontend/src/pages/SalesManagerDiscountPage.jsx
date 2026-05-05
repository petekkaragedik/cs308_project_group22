import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SalesManagerDiscountPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');

  useEffect(() => {
    const token = localStorage.getItem('token');
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
        <p style={styles.subtitle}>Set and manage product discounts and promotional pricing.</p>
        <div style={styles.placeholder}>
          <p style={styles.placeholderText}>Coming soon — this section is under construction.</p>
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
    margin: 'var(--space-2) 0 var(--space-8) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  placeholder: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-10)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  placeholderText: {
    fontFamily: 'var(--font-heading)',
    fontStyle: 'italic',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-charcoal-light)',
    margin: 0,
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
