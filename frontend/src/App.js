import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Registration';

function App() {
  return (
    <Router>
    <div style={{ margin: 0, padding: 0, backgroundColor: '#f4f7f6', minHeight: '100vh' }}>

      <h1 style={{textAlign: 'center', paddingTop: '40px', color: '#222', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      CS308 Online Store - Group 22
      </h1>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </div>
    </Router>
  );
}

export default App;
