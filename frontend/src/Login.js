import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { apiUrl } from './apiBase';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function getPostLoginTarget(search) {
  const raw = new URLSearchParams(search).get('next');
  if (raw && /^\/[^/]/.test(raw)) return raw;
  return '/products';
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const location = useLocation();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    fetch(apiUrl("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem("token", data.token);
          window.location.href = getPostLoginTarget(location.search);
        } else {
          setError(data.message || 'Invalid email or password.');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Something went wrong. Please try again.');
      });
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <img src="/scylla_logo.png" alt="Scylla Logo" style={styles.logo} />
        <div style={styles.card}>
          <div style={styles.header}>
            <h2 style={styles.title}>Welcome back!</h2>
            <p style={styles.subtitle}>Sign in to your account</p>
          </div>

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
              />
            </div>

            <div style={styles.inputGroup}>
              <Lock size={20} color="var(--color-charcoal-light)" style={styles.icon} />
              <input
                type="password"
                placeholder="Password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div style={styles.forgotPassword}>
              <Link to="/forgot-password" style={styles.forgotLink}>
                Forgot Password?
              </Link>
            </div>

            {error && <p style={styles.errorBanner}>{error}</p>}

            <button type="submit" style={styles.button}>
              SIGN IN
            </button>
          </form>
          <p style={styles.footerText}>
            If you don't have an account <Link to="/register" style={styles.link}>click here to register</Link>
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
  errorBanner: {
    margin: 0,
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-error)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-black)',
    textAlign: 'center',
  },
  forgotPassword: {
    textAlign: 'right',
    marginTop: 'var(--space-1)',
  },
  forgotLink: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-charcoal-light)',
    textDecoration: 'none',
    borderBottom: '1px solid transparent',
    transition: 'all var(--transition-fast)',
    ':hover': {
      color: 'var(--color-charcoal)',
      borderBottom: '1px solid var(--color-charcoal)',
    }
  }
};

export default Login;
