import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import SalesManagerDashboardPage from './pages/SalesManagerDashboardPage';
import SalesManagerDiscountPage from './pages/SalesManagerDiscountPage';
import SalesManagerInvoicePage from './pages/SalesManagerInvoicePage';
import SalesManagerRevenuePage from './pages/SalesManagerRevenuePage';
import SalesManagerRefundsPage from './pages/SalesManagerRefundsPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import { CartProvider } from './context/CartContext';

const PAGE_TITLES = {
  '/': 'Scylla',
  '/login': 'Scylla | Login',
  '/register': 'Scylla | Register',
  '/forgot-password': 'Scylla | Forgot Password',
  '/reset-password': 'Scylla | Reset Password',
  '/products': 'Scylla | Products',
  '/cart': 'Scylla | Cart',
  '/checkout': 'Scylla | Checkout',
  '/wishlist': 'Scylla | Wishlist',
  '/profile': 'Scylla | Profile',
  '/orders': 'Scylla | Orders',
  '/admin/moderation': 'Scylla | Moderation',
  '/product-manager/dashboard': 'Scylla | PM Dashboard',
  '/sales-manager/dashboard': 'Scylla | SM Dashboard',
  '/sales-manager/discounts': 'Scylla | Discounts',
  '/sales-manager/invoices': 'Scylla | Invoices',
  '/sales-manager/revenue': 'Scylla | Revenue',
  '/sales-manager/refunds': 'Scylla | Refunds',
};

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const base = '/' + pathname.split('/')[1];
    document.title = PAGE_TITLES[pathname] ?? PAGE_TITLES[base] ?? 'Scylla';
  }, [pathname]);
  return null;
}

function App() {
  return (
    <CartProvider>
      <Router>
        <PageTitle />
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
            <Route path="/orders" element={<OrderHistoryPage />} />
            <Route path="/admin/moderation" element={<AdminModerationPage />} />
            <Route path="/product-manager/dashboard" element={<ProductManagerDashboardPage />} />
            <Route path="/sales-manager/dashboard" element={<SalesManagerDashboardPage />} />
            <Route path="/sales-manager/discounts" element={<SalesManagerDiscountPage />} />
            <Route path="/sales-manager/invoices" element={<SalesManagerInvoicePage />} />
            <Route path="/sales-manager/revenue" element={<SalesManagerRevenuePage />} />
            <Route path="/sales-manager/refunds" element={<SalesManagerRefundsPage />} />
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;