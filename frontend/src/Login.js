import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Logging in with:", email, password);
    //API call buraya gelecek
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
  }
};

export default Login;
