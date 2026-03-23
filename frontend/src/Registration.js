import React, { useState } from 'react';

function Register() {
  const [formData, setFormData] = useState({name: '', email: '', password: '', address: '', taxID: ''});
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log("Registering user:", formData);
  };

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '90vh',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    card: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '450px'
    },
    title: { textAlign: 'center', color: '#333', marginBottom: '25px', fontSize: '24px' },
    inputGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', color: '#555', fontWeight: '600', fontSize: '14px' },
    input: { width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box', fontSize: '15px' },
    button: { width: '100%', padding: '14px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <form onSubmit={handleRegister}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input name="name" type="text" onChange={handleChange} required style={styles.input} placeholder="John Doe" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input name="email" type="email" onChange={handleChange} required style={styles.input} placeholder="email@example.com" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input name="password" type="password" onChange={handleChange} required style={styles.input} placeholder="********" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Home Address</label>
            <input name="address" type="text" onChange={handleChange} required style={styles.input} placeholder="123 Street, City" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Tax ID</label>
            <input name="taxID" type="text" onChange={handleChange} required style={styles.input} placeholder="Enter your Tax ID" />
          </div>
          <button type="submit" style={styles.button}>Register</button>
        </form>
      </div>
    </div>
  );
}

export default Register;