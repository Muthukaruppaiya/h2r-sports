import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: 'var(--navy)',
        color: 'white',
        padding: '2rem 0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '0 2rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>H2R Admin</h2>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <AdminNavLink to="/admin" end>Dashboard</AdminNavLink>
          <AdminNavLink to="/admin/orders">Orders</AdminNavLink>
          <AdminNavLink to="/admin/inventory">Inventory</AdminNavLink>
          <AdminNavLink to="/admin/customers">Customers</AdminNavLink>
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 2rem' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.2)', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: '6px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            ← Back to Store
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

function AdminNavLink({ to, end, children }) {
  return (
    <NavLink 
      to={to} 
      end={end}
      style={({ isActive }) => ({
        padding: '0.75rem 2rem',
        textDecoration: 'none',
        color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
        background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderLeft: isActive ? '4px solid var(--accent)' : '4px solid transparent',
        display: 'block',
        transition: 'all 0.2s'
      })}
    >
      {children}
    </NavLink>
  );
}
