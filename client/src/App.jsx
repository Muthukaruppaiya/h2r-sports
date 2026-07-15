import { useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import AnnouncementBar from './components/AnnouncementBar';
import Navbar from './components/Navbar';
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

function ScrollLock() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
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
  const isAdmin = pathname.startsWith('/admin');
  const hideVideo =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/order') ||
    pathname.startsWith('/cart') ||
    isAdmin;

  if (isAdmin) {
    const user = JSON.parse(localStorage.getItem('h2r_user') || '{}');
    if (user.role !== 'admin') {
      return <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You must be logged in as an admin to view this page.</p>
        <Link to="/login" style={{ color: 'var(--accent)' }}>Go to Login</Link>
      </div>;
    }
    
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="customers" element={<AdminCustomers />} />
        </Route>
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
