import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BRAND } from '../../utils/india';

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
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
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
      { label: 'Inventory', to: '/admin/inventory', tab: 'products' },
      { label: 'Categories', to: '/admin/inventory?tab=categories', tab: 'categories' },
      { label: 'Collections', to: '/admin/inventory?tab=collections', tab: 'collections' },
    ],
  },
  {
    type: 'group',
    id: 'sales',
    label: 'Sales',
    icon: 'sales',
    children: [
      { label: 'Online Orders', to: '/admin/orders' },
      { label: 'Store Billing', to: '/admin/store-billing' },
      { label: 'Online Billing', to: '/admin/billing' },
      { label: 'Customers', to: '/admin/customers' },
    ],
  },
  {
    type: 'group',
    id: 'store',
    label: 'Online Store',
    icon: 'store',
    children: [{ label: 'Visit Store', to: '/', external: true }],
  },
  {
    type: 'group',
    id: 'marketing',
    label: 'Marketing',
    icon: 'marketing',
    children: [
      { label: 'Floating Video', to: '/admin/marketing?tab=video', tab: 'video' },
      { label: 'WhatsApp Status', to: '/admin/marketing?tab=status', tab: 'status' },
    ],
  },
  { type: 'link', id: 'reports', label: 'Reports', to: '/admin/reports', icon: 'reports' },
  { type: 'link', id: 'integrations', label: 'Integrations', to: '/admin/integrations', icon: 'plug' },
];

const PAGE_META = [
  { match: '/admin/store-billing', title: 'Store Billing', subtitle: 'Physical shop / walk-in sales' },
  { match: '/admin/billing', title: 'Online Billing', subtitle: 'Website order payments' },
  { match: '/admin/orders', title: 'Online Orders', subtitle: 'Fulfillment pipeline' },
  { match: '/admin/inventory', title: 'Items', subtitle: 'Catalogue, categories & collections' },
  { match: '/admin/customers', title: 'Customers', subtitle: 'Buyer directory' },
  { match: '/admin/marketing', title: 'Marketing', subtitle: 'Status rings & floating videos' },
  { match: '/admin/reports', title: 'Reports', subtitle: 'Sales intelligence' },
  { match: '/admin/integrations', title: 'Integrations', subtitle: 'Connected tools' },
  { match: '/admin', title: 'Dashboard', subtitle: 'Store overview', exact: true },
];

function pathMatches(pathname, to, end) {
  const base = String(to).split('?')[0];
  if (end) return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function childIsActive(pathname, searchParams, child) {
  if (child.external) return false;
  const base = String(child.to).split('?')[0];
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return false;

  if (child.tab) {
    const currentTab = searchParams.get('tab');
    if (child.tab === 'products') {
      return !currentTab || currentTab === 'products';
    }
    if (child.tab === 'video') {
      return currentTab === 'video' || currentTab === 'videos';
    }
    if (child.tab === 'status') {
      return !currentTab || currentTab === 'status' || currentTab === 'statuses';
    }
    return currentTab === child.tab;
  }

  // Exact path match without shared siblings stealing active state
  return pathname === base || pathname.startsWith(`${base}/`);
}

function resolvePageMeta(pathname) {
  return (
    PAGE_META.find((p) => (p.exact ? pathname === p.match : pathMatches(pathname, p.match, false))) ||
    PAGE_META[PAGE_META.length - 1]
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = resolvePageMeta(pathname);
  const user = JSON.parse(localStorage.getItem('h2r_user') || '{}');

  const initiallyOpen = useMemo(() => {
    const open = {};
    NAV.filter((n) => n.type === 'group').forEach((g) => {
      open[g.id] = g.children.some((c) => childIsActive(pathname, searchParams, c));
    });
    return open;
  }, [pathname, searchParams]);

  const [openGroups, setOpenGroups] = useState(initiallyOpen);

  useEffect(() => {
    setOpenGroups((prev) => ({ ...prev, ...initiallyOpen }));
  }, [initiallyOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const logout = () => {
    localStorage.removeItem('h2r_token');
    localStorage.removeItem('h2r_user');
    navigate('/login?redirect=admin');
  };

  return (
    <div className="zoho-admin">
      <header className="zoho-admin__mobile-bar">
        <button
          type="button"
          className="zoho-admin__menu-btn"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span className="zoho-admin__menu-icon" aria-hidden="true" />
        </button>
        <div className="zoho-admin__mobile-title">
          <strong>H2R Admin</strong>
          <span>{page.title}</span>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="zoho-admin__backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`zoho-admin__sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="zoho-admin__sidebar-head">
          <div className="zoho-admin__brand">
            <img
              src={BRAND.logo}
              alt=""
              width="40"
              height="40"
              className="zoho-admin__brand-mark"
            />
            <div>
              <strong>H2R Admin</strong>
              <span>Commerce control</span>
            </div>
          </div>
          <button
            type="button"
            className="zoho-admin__close-btn"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
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
            const childActive = item.children.some((c) => childIsActive(pathname, searchParams, c));
            return (
              <div key={item.id} className={`zoho-admin__group${open ? ' is-open' : ''}`}>
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
                          className={() =>
                            `zoho-admin__sublink${
                              childIsActive(pathname, searchParams, child) ? ' is-active' : ''
                            }`
                          }
                        >
                          <span className="zoho-admin__sub-dot" aria-hidden="true" />
                          {child.label}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="zoho-admin__section-label">QUICK APPS</div>
          <NavLink
            to="/admin/store-billing"
            className={({ isActive }) => `zoho-admin__app-row${isActive ? ' is-active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <span className="zoho-admin__app-dot">₹</span>
            <span>Store Billing</span>
          </NavLink>
          <NavLink
            to="/admin/billing"
            className={({ isActive }) => `zoho-admin__app-row${isActive ? ' is-active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <span
              className="zoho-admin__app-dot"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}
            >
              O
            </span>
            <span>Online Billing</span>
          </NavLink>
        </nav>

        <button type="button" className="zoho-admin__store-btn" onClick={() => navigate('/')}>
          <span className="zoho-admin__store-ico">{ICONS.store}</span>
          <span>Open storefront</span>
          <span className="zoho-admin__chev is-open">{ICONS.chevron}</span>
        </button>
      </aside>

      <main className="zoho-admin__main">
        <div className="zoho-admin__topbar">
          <div className="zoho-admin__topbar-title">
            <strong>{page.title}</strong>
            <span>{page.subtitle}</span>
          </div>
          <div className="zoho-admin__topbar-actions">
            <span className="zoho-admin__user-chip">{user.name || user.email || 'Admin'}</span>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/')}>
              Store
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
