import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartToast() {
  const { toast, clearToast } = useCart();

  if (!toast) return null;

  return (
    <div className="cart-toast" role="status" aria-live="polite">
      <div className="cart-toast__body">
        <strong>✓ {toast.message}</strong>
        <span>{toast.name}</span>
      </div>
      <div className="cart-toast__actions">
        <Link to="/cart" className="cart-toast__link" onClick={clearToast}>
          View cart
        </Link>
        <button type="button" className="cart-toast__close" onClick={clearToast} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
