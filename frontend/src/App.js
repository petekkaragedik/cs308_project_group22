import React from 'react';
import Login from './Login';

function App() {
  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <h1 style={{ 
        textAlign: 'center', 
        paddingTop: '40px', 
        color: '#222', 
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' 
      }}>
        CS308 Online Store
      </h1>
      <Login />
    </div>
  );
}

export default App;