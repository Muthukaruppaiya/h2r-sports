import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const key = `${action.item.id}:${action.item.sizeId}`;
      const existing = state.items.find((i) => i.key === key);
      const items = existing
        ? state.items.map((i) =>
            i.key === key ? { ...i, qty: i.qty + (action.item.qty || 1) } : i
          )
        : [...state.items, { ...action.item, key, qty: action.item.qty || 1 }];

      return {
        ...state,
        items,
        toast: {
          id: Date.now(),
          message: 'Added to cart',
          name: action.item.name,
        },
      };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.key !== action.key) };
    case 'SET_QTY':
      return {
        ...state,
        items: state.items
          .map((i) => (i.key === action.key ? { ...i, qty: Math.max(1, action.qty) } : i))
          .filter((i) => i.qty > 0),
      };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    toast: null,
  });

  useEffect(() => {
    if (!state.toast) return undefined;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2800);
    return () => clearTimeout(t);
  }, [state.toast]);

  const value = useMemo(() => {
    const count = state.items.reduce((sum, i) => sum + i.qty, 0);
    const total = state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return {
      items: state.items,
      toast: state.toast,
      count,
      total,
      addItem: (item) => dispatch({ type: 'ADD', item }),
      removeItem: (key) => dispatch({ type: 'REMOVE', key }),
      setQty: (key, qty) => dispatch({ type: 'SET_QTY', key, qty }),
      clear: () => dispatch({ type: 'CLEAR' }),
      clearToast: () => dispatch({ type: 'CLEAR_TOAST' }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
