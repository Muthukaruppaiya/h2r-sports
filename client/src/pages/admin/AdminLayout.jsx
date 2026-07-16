import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const ICONS = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
    </svg>
  ),
  items: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  sales: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H7" />
    </svg>
  ),
  store: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10 6 4h12l2 6" />
      <path d="M4 10v10h16V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  ),
  marketing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11v2a4 4 0 0 0 4 4h1" />
      <path d="M11 5l10 4v6l-10 4V5z" />
      <path d="M7 15v4" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
    </svg>
  ),
  plug: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 7v4" />
      <path d="M15 7v4" />
      <path d="M7 11h10v2a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5v-2z" />
      <path d="M12 18v3" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
};

const NAV = [
  { type: 'link', id: 'home', label: 'Home', to: '/admin', end: true, icon: 'home' },
  {
    type: 'group',
    id: 'items',
    label: 'Items',
    icon: 'items',
    children: [
      { label: 'Inventory', to: '/admin/inventory' },
      { label: 'Categories', to: '/admin/inventory' },
      { label: 'Collections', to: '/admin/inventory' },
    ],
  },
  {
    type: 'group',
    id: 'sales',
    label: 'Sales',
    icon: 'sales',
    children: [
      { label: 'Orders', to: '/admin/orders' },
      { label: 'Customers', to: '/admin/customers' },
    ],
  },
  {
    type: 'group',
    id: 'store',
    label: 'Online Store',
    icon: 'store',
    children: [
      { label: 'Visit Store', to: '/', external: true },
    ],
  },
  {
    type: 'group',
    id: 'marketing',
    label: 'Marketing',
    icon: 'marketing',
    children: [
      { label: 'Floating Video', to: '/admin/marketing' },
      { label: 'WhatsApp Status', to: '/admin/marketing' },
    ],
  },
  { type: 'link', id: 'reports', label: 'Reports', to: '/admin/reports', icon: 'reports' },
  { type: 'link', id: 'integrations', label: 'Integrations', to: '/admin/integrations', icon: 'plug' },
];

function pathMatches(pathname, to, end) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const initiallyOpen = useMemo(() => {
    const open = {};
    NAV.filter((n) => n.type === 'group').forEach((g) => {
      open[g.id] = g.children.some((c) => !c.external && pathMatches(pathname, c.to, false));
    });
    return open;
  }, [pathname]);

  const [openGroups, setOpenGroups] = useState(initiallyOpen);

  useEffect(() => {
    setOpenGroups((prev) => ({ ...prev, ...initiallyOpen }));
  }, [initiallyOpen]);

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="zoho-admin">
      <aside className="zoho-admin__sidebar">
        <div className="zoho-admin__brand">
          <div className="zoho-admin__brand-mark">H2R</div>
          <div>
            <strong>H2R Admin</strong>
            <span>Commerce</span>
          </div>
        </div>

        <nav className="zoho-admin__nav">
          {NAV.map((item) => {
            if (item.type === 'link') {
              const active = pathMatches(pathname, item.to, item.end);
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.end}
                  className={`zoho-admin__link${active ? ' is-active' : ''}`}
                >
                  <span className="zoho-admin__ico">{ICONS[item.icon]}</span>
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            const open = !!openGroups[item.id];
            const childActive = item.children.some((c) => !c.external && pathMatches(pathname, c.to, false));
            return (
              <div key={item.id} className="zoho-admin__group">
                <button
                  type="button"
                  className={`zoho-admin__group-btn${childActive ? ' is-active-parent' : ''}`}
                  onClick={() => toggleGroup(item.id)}
                >
                  <span className="zoho-admin__ico">{ICONS[item.icon]}</span>
                  <span className="zoho-admin__group-label">{item.label}</span>
                  <span className={`zoho-admin__chev${open ? ' is-open' : ''}`}>{ICONS.chevron}</span>
                </button>
                {open && (
                  <div className="zoho-admin__sub">
                    {item.children.map((child) =>
                      child.external ? (
                        <button
                          key={child.label}
                          type="button"
                          className="zoho-admin__sublink"
                          onClick={() => navigate(child.to)}
                        >
                          {child.label}
                        </button>
                      ) : (
                        <NavLink
                          key={child.label + child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            `zoho-admin__sublink${isActive ? ' is-active' : ''}`
                          }
                        >
                          {child.label}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="zoho-admin__section-label">APPS</div>
          <div className="zoho-admin__app-row">
            <span className="zoho-admin__app-dot">₹</span>
            <span>H2R Payments</span>
          </div>
        </nav>

        <button type="button" className="zoho-admin__store-btn" onClick={() => navigate('/')}>
          <span className="zoho-admin__store-ico">{ICONS.store}</span>
          <span>Store Actions</span>
          <span className="zoho-admin__chev is-open">{ICONS.chevron}</span>
        </button>
      </aside>

      <main className="zoho-admin__main">
        <Outlet />
      </main>
    </div>
  );
}
