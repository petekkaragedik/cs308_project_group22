import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { apiUrl } from './apiBase';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    fetch(apiUrl("/api/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        setSubmitted(true);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setError("Something went wrong. Please try again.");
      });
  };

  if (submitted) {
    return (
      <>
        <Navbar />
        <div style={styles.page}>
          <img src="/scylla_logo.png" alt="Scylla Logo" style={styles.logo} />
          <div style={styles.card}>
            <div style={styles.header}>
              <h2 style={styles.title}>Check your email</h2>
              <p style={styles.subtitle}>
                If an account exists with that email, we sent a password reset link.
              </p>
            </div>
            <div style={styles.successBox}>
              <p style={styles.successText}>
                The link will expire in 1 hour. Check your spam folder if you don't see it.
              </p>
            </div>
            <p style={styles.footerText}>
              <Link to="/login" style={styles.link}>Return to sign in</Link>
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <img src="/scylla_logo.png" alt="Scylla Logo" style={styles.logo} />
        <div style={styles.card}>
          <div style={styles.header}>
            <h2 style={styles.title}>Forgot your password?</h2>
            <p style={styles.subtitle}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <Mail size={20} color="var(--color-charcoal-light)" style={styles.icon} />
              <input
                type="email"
                placeholder="Email Address"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
          </form>

          <p style={styles.footerText}>
            Remember your password? <Link to="/login" style={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}

const styles = {
  page: {
    minHeight: '80vh',
    backgroundColor: 'var(--color-sand)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'var(--space-10) var(--container-pad)',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-10)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-card)',
    width: '100%',
    maxWidth: '450px',
    marginTop: 'var(--space-4)',
  },
  logo: {
    width: '120px',
    height: 'auto',
    marginBottom: 'var(--space-6)',
    display: 'block',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--space-8)',
  },
  title: {
    margin: '0 0 var(--space-2) 0',
    fontFamily: 'var(--font-heading)',
    fontSize: '2rem',
    fontWeight: 'var(--weight-regular)',
    color: 'var(--color-black)',
    letterSpacing: 'var(--tracking-wide)',
  },
  subtitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-charcoal-light)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-white)',
    transition: 'border-color var(--transition-fast)',
  },
  icon: {
    flexShrink: 0,
  },
  input: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    marginLeft: 'var(--space-3)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    letterSpacing: 'var(--tracking-wide)',
    color: 'var(--color-charcoal)',
  },
  button: {
    width: '100%',
    padding: 'var(--space-4) 0',
    marginTop: 'var(--space-2)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    textTransform: 'uppercase',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 'var(--space-6)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
  },
  link: {
    color: 'var(--color-charcoal)',
    textDecoration: 'none',
    fontWeight: 'var(--weight-semibold)',
    borderBottom: '1px solid var(--color-charcoal)',
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
  successBox: {
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-blue)',
    marginBottom: 'var(--space-6)',
  },
  successText: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal)',
    lineHeight: 1.6,
  }
};

export default ForgotPassword;
