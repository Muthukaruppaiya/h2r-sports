import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import Policy from './pages/Policy';

function ScrollLock() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [pathname]);

  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const hideVideo =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/order') ||
    pathname.startsWith('/cart');

  return (
    <>
      <ScrollLock />
      <AnnouncementBar />
      <Navbar />
      <CartToast />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/collections/:slug" element={<Collection />} />
        <Route path="/shop/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:id" element={<OrderSuccess />} />
        <Route path="/policies/:slug" element={<Policy />} />
      </Routes>
      <Footer />
      {!hideVideo && <WatchBuyVideo />}
    </>
  );
}
