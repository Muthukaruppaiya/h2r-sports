import { useEffect } from 'react';
import { Routes, Route, useLocation, Link, useSearchParams } from 'react-router-dom';
import AnnouncementBar from './components/AnnouncementBar';import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartToast from './components/CartToast';
import WatchBuyVideo from './components/WatchBuyVideo';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Collection from './pages/Collection';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import MyOrders from './pages/MyOrders';
import Login from './pages/Login';
import Register from './pages/Register';
import Policy from './pages/Policy';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminInventory from './pages/admin/Inventory';
import AdminCustomers from './pages/admin/Customers';
import AdminReports from './pages/admin/Reports';
import AdminIntegrations from './pages/admin/Integrations';
import AdminMarketing from './pages/admin/Marketing';

function ScrollLock() {
  const { pathname } = useLocation();

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
  }, [pathname]);

  return null;
}

function PageShell({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isAdmin = pathname.startsWith('/admin');
  const isAdminLogin = pathname === '/login' && searchParams.get('redirect') === 'admin';
  const isProductDetail = /^\/shop\/[^/]+/.test(pathname);
  const hideVideo =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/order') ||
    pathname.startsWith('/cart') ||
    isProductDetail ||
    isAdmin;

  if (isAdmin) {
    const user = JSON.parse(localStorage.getItem('h2r_user') || '{}');
    if (user.role !== 'admin') {
      return (
        <div className="auth-page auth-page--denied">
          <div className="auth-page__card">
            <div className="auth-page__brand">
              <div className="auth-page__logo">H2R</div>
              <div>
                <p className="auth-page__eyebrow">Admin panel</p>
                <h1 className="auth-page__title">Access denied</h1>
              </div>
            </div>
            <p className="auth-page__lead">
              You must be logged in as an admin to view this page.
            </p>
            <Link to="/login?redirect=admin" className="btn btn-primary auth-page__submit">
              Admin log in
            </Link>
            <p className="auth-page__footer">
              <Link to="/">← Back to store</Link>
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="marketing" element={<AdminMarketing />} />
          <Route path="integrations" element={<AdminIntegrations />} />
        </Route>
      </Routes>
    );
  }

  if (isAdminLogin) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <>
      <ScrollLock />
      <AnnouncementBar />
      <Navbar />
      <CartToast />
      <PageShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/collections/:slug" element={<Collection />} />
          <Route path="/shop/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderSuccess />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/policies/:slug" element={<Policy />} />
        </Routes>
      </PageShell>
      <Footer />
      {!hideVideo && <WatchBuyVideo />}
    </>
  );
}
