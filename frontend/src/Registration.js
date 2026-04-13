import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function Registration() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, email, password })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (data.token) {
          localStorage.setItem("token", data.token);
          window.location.href = "/products";
        } else {
          setError(data.message || "Registration failed");
        }
      })
      .catch(() => {
        setLoading(false);
        setError("Something went wrong. Please try again.");
      });
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <img src="/scylla_logo.png" alt="Scylla Logo" style={styles.logo} />
        
        <div style={styles.card}>
          <div style={styles.header}>
            <h2 style={styles.title}>Welcome!</h2>
            <p style={styles.subtitle}>Create your account</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <p style={styles.error}>{error}</p>}
            {/* Full Name Input */}
            <div style={styles.inputGroup}>
              <User size={20} color="var(--color-charcoal-light)" style={styles.icon} />
              <input 
                type="text" 
                placeholder="Full Name" 
                style={styles.input} 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Email Input */}
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

            {/* Password Input */}
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

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={styles.footerText}>
            If you already have an account <Link to="/login" style={styles.link}>click here to sign in</Link>
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
    width: '120px', // Matches the fixed size we discussed
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
    textTransform: 'uppercase', // Added to match SCYLLA "Shop Now" style
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
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
  error: {
    color: '#c0392b',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    textAlign: 'center',
    margin: 0,
  }
};

export default Registration;