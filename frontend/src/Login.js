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
  };

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    },
    card: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '420px',
    },
    title: {
      textAlign: 'center',
      color: '#333',
      marginBottom: '25px',
      fontSize: '24px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    inputGroup: {
      display: 'flex',
      alignItems: 'center',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '10px 12px',
    },
    icon: {
      marginRight: '10px',
      flexShrink: 0,
    },
    input: {
      border: 'none',
      outline: 'none',
      width: '100%',
      fontSize: '15px',
    },
    button: {
      width: '100%',
      padding: '14px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '4px',
    },
    footerText: {
      textAlign: 'center',
      marginTop: '16px',
      fontSize: '14px',
      color: '#555',
    },
    link: {
      color: '#007bff',
      textDecoration: 'none',
      fontWeight: '600',
    },
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Welcome Back</h2>

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
              Sign in
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

export default Login;
