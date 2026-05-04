import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Registration';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import LandingPage from './pages/LandingPage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import InvoicePage from './pages/InvoicePage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import AdminModerationPage from './pages/AdminModerationPage';
import ProductManagerDashboardPage from './pages/ProductManagerDashboardPage';
import { CartProvider } from './context/CartContext';

function App() {
  return (
    <CartProvider>
      <Router>
        <div style={{ margin: 0, padding: 0 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/products" element={<ProductListingPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/invoice/:orderId" element={<InvoicePage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin/moderation" element={<AdminModerationPage />} />
            <Route path="/product-manager/dashboard" element={<ProductManagerDashboardPage />} />
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;