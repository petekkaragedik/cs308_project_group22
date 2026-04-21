import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PasswordConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setState({ status: 'error', message: 'Missing token.' });
      return;
    }
    fetch('/api/password/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Confirmation failed');
        setState({ status: 'success' });
      })
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [params]);

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.card}>
          {state.status === 'loading' && (
            <>
              <Loader size={40} style={styles.iconPending} />
              <h1 style={styles.title}>Confirming your change...</h1>
              <p style={styles.body}>Just a moment while we verify your request.</p>
            </>
          )}

          {state.status === 'success' && (
            <>
              <div style={styles.iconWrap}><div style={{ ...styles.halo, backgroundColor: 'var(--color-success)' }} />
                <CheckCircle2 size={44} strokeWidth={1.5} style={{ position: 'relative', color: '#166534' }} />
              </div>
              <h1 style={styles.title}>Password updated</h1>
              <p style={styles.body}>You can now sign in with your new password.</p>
              <button style={styles.btnPrimary} onClick={() => navigate('/login')}>
                SIGN IN
              </button>
            </>
          )}

          {state.status === 'error' && (
            <>
              <div style={styles.iconWrap}><div style={{ ...styles.halo, backgroundColor: 'var(--color-error)' }} />
                <AlertCircle size={44} strokeWidth={1.5} style={{ position: 'relative', color: '#991b1b' }} />
              </div>
              <h1 style={styles.title}>Couldn't confirm</h1>
              <p style={styles.body}>{state.message} The link may have expired or already been used.</p>
              <button style={styles.btnPrimary} onClick={() => navigate('/profile')}>
                BACK TO PROFILE
              </button>
            </>
          )}
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-12) var(--container-pad)',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-12) var(--space-10)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-card)',
    maxWidth: 460,
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
  },
  iconWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute', inset: 0, borderRadius: '50%', opacity: 0.35 },
  iconPending: { color: 'var(--color-charcoal-light)' },
  title: {
    margin: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    letterSpacing: 'var(--tracking-tight)',
  },
  body: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
    lineHeight: 1.6,
    maxWidth: 340,
  },
  btnPrimary: {
    marginTop: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-8)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
};
