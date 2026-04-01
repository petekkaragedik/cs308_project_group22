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
    // API call - daha sonra gelecek bu?
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back</h2>
        <form onSubmit={handleLogin}>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="Enter your email"
            />
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
              Sign in
            </button>
          </form>

          <p style={styles.footerText}>
            If you don't have an account <Link to="/register" style={styles.link}>click here to registwr</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Login;
