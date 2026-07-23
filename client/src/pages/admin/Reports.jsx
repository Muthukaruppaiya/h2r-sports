import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { STATUS_LABELS, getStatusLabel, getStatusStyle } from '../../utils/orderStatus';

const PAYMENT_LABELS = {
  cod: 'COD',
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
};

const LIVE_REPORTS = [
  { id: 'sales-overview', name: 'Sales Overview', category: 'sales', createdBy: 'BI Engine', startDim: 'overview' },
  { id: 'sales-by-day', name: 'Sales by Day', category: 'sales', createdBy: 'BI Engine', startDim: 'day' },
  { id: 'sales-by-customer', name: 'Sales by Customer', category: 'sales', createdBy: 'BI Engine', startDim: 'customer' },
  { id: 'sales-by-items', name: 'Sales By Items', category: 'sales', createdBy: 'BI Engine', startDim: 'product' },
  { id: 'sales-by-status', name: 'Sales By Order Status', category: 'sales', createdBy: 'BI Engine', startDim: 'status' },
  { id: 'order-fulfillment', name: 'Order Fulfillment', category: 'sales', createdBy: 'BI Engine', startDim: 'status' },
  { id: 'payments-received', name: 'Payments Received', category: 'payments', createdBy: 'BI Engine', startDim: 'payment' },
  { id: 'payment-methods', name: 'Payment Method Mix', category: 'payments', createdBy: 'BI Engine', startDim: 'payment' },
  { id: 'customer-spend', name: 'Top Customers by Spend', category: 'customers', createdBy: 'BI Engine', startDim: 'customer' },
  { id: 'activity-status', name: 'Order Status Activity', category: 'activity', createdBy: 'BI Engine', startDim: 'status' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Reports' },
  { id: 'sales', label: 'Sales' },
  { id: 'payments', label: 'Payments' },
  { id: 'activity', label: 'Activity' },
  { id: 'customers', label: 'Customers' },
];

function money(n) {
  return `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
}

function formatVisited(date) {
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDay(ymd) {
  if (!ymd) return ymd;
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function filterOrders(orders, filters) {
  return (orders || []).filter((o) => {
    if (filters.date && o.date !== filters.date) return false;
    if (filters.status && o.status !== filters.status) return false;
    if (filters.paymentMethod && o.paymentMethod !== filters.paymentMethod) return false;
    if (filters.customerEmail && o.customerEmail !== filters.customerEmail) return false;
    if (filters.productId && !(o.items || []).some((i) => i.id === filters.productId)) return false;
    return true;
  });
}

export default function Reports() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [drill, setDrill] = useState([]);
  const [lastVisited, setLastVisited] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('h2r_report_visits') || '{}');
    } catch {
      return {};
    }
  });

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LIVE_REPORTS.filter((r) => {
      const catOk = category === 'all' || r.category === category;
      const qOk = !q || r.name.toLowerCase().includes(q) || r.category.includes(q);
      return catOk && qOk;
    });
  }, [category, search]);

  const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

  useEffect(() => {
    if (!activeReport) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/admin/reports/overview?days=${days}`);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message || 'Failed to load report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeReport, days]);

  const openReport = (report) => {
    const now = formatVisited(new Date());
    const next = { ...lastVisited, [report.id]: now };
    setLastVisited(next);
    localStorage.setItem('h2r_report_visits', JSON.stringify(next));
    setActiveReport(report);
    setDrill([{ type: 'root', dim: report.startDim || 'overview', label: report.name }]);
  };

  const drillFilters = useMemo(() => {
    const filters = {};
    for (const step of drill) {
      if (step.type === 'day') filters.date = step.value;
      if (step.type === 'status') filters.status = step.value;
      if (step.type === 'payment') filters.paymentMethod = step.value;
      if (step.type === 'customer') filters.customerEmail = step.value;
      if (step.type === 'product') filters.productId = step.value;
    }
    return filters;
  }, [drill]);

  const currentLevel = drill[drill.length - 1] || { type: 'root', dim: 'overview' };

  const pushDrill = (step) => setDrill((prev) => [...prev, step]);
  const jumpTo = (index) => setDrill((prev) => prev.slice(0, index + 1));

  if (activeReport) {
    return (
      <div className="adm-page bi-report">
        <div className="adm-page__head">
          <div>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setActiveReport(null)}>
              ← Reports Center
            </button>
            <h1 style={{ marginTop: '0.75rem' }}>{activeReport.name}</h1>
            <p>Interactive BI report — click any KPI, bar, or row to drill down.</p>
          </div>
          <div className="adm-page__actions">
            <select
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value));
                setDrill([{ type: 'root', dim: activeReport.startDim || 'overview', label: activeReport.name }]);
              }}
              className="reports-center__range"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
            </select>
          </div>
        </div>

        <nav className="bi-crumb" aria-label="Drill path">
          {drill.map((step, index) => (
            <button
              key={`${step.type}-${step.value || step.dim}-${index}`}
              type="button"
              className={`bi-crumb__item${index === drill.length - 1 ? ' is-current' : ''}`}
              onClick={() => jumpTo(index)}
            >
              {step.label}
            </button>
          ))}
        </nav>

        {loading && <div className="adm-empty">Loading BI data…</div>}
        {error && <div className="reports-center__error">{error}</div>}
        {!loading && !error && data && (
          <BiExplorer
            data={data}
            days={days}
            level={currentLevel}
            filters={drillFilters}
            onDrill={pushDrill}
          />
        )}
      </div>
    );
  }

  return (
    <div className="reports-center reports-center--split">
      <aside className="reports-center__side">
        <h2>BI Reports</h2>
        <p className="bi-side-note">All reports support drill-down</p>
        <div className="reports-center__cat-label">REPORT CATEGORY</div>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`reports-center__cat${category === c.id ? ' is-active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </aside>

      <section className="reports-center__content">
        <div className="reports-center__search-wrap">
          <span className="reports-center__search-ico" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className="reports-center__search"
            placeholder="Search BI reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="reports-center__heading">
          <h1>{category === 'all' ? 'All BI Reports' : categoryLabel(category)}</h1>
          <span className="reports-center__count">{filteredReports.length}</span>
        </div>

        <div className="reports-center__table-wrap">
          <table className="reports-center__table">
            <thead>
              <tr>
                <th>REPORT NAME</th>
                <th>CATEGORY</th>
                <th>TYPE</th>
                <th>LAST VISITED</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <button type="button" className="reports-center__name" onClick={() => openReport(report)}>
                      <span className="reports-center__star">◈</span>
                      {report.name}
                    </button>
                  </td>
                  <td>{categoryLabel(report.category)}</td>
                  <td>
                    <span className="adm-pill" style={{ background: '#dbeafe', color: '#1e40af' }}>
                      Drill-down BI
                    </span>
                  </td>
                  <td>{lastVisited[report.id] || '—'}</td>
                </tr>
              ))}
              {!filteredReports.length && (
                <tr>
                  <td colSpan={4} className="reports-center__empty-row">
                    No reports match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BiExplorer({ data, days, level, filters, onDrill }) {
  const orders = useMemo(() => filterOrders(data.drillOrders || [], filters), [data.drillOrders, filters]);
  const maxRevenue = Math.max(...(data.dailyTrend || []).map((d) => d.revenue), 1);

  const scopedKpis = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const count = orders.length;
    return {
      revenue,
      orders: count,
      aov: count ? Math.round(revenue / count) : 0,
    };
  }, [orders]);

  if (level.type === 'order') {
    const order = (data.drillOrders || []).find((o) => o.orderId === level.value);
    if (!order) return <div className="adm-empty">Order not found in this range.</div>;
    return <OrderDrillDetail order={order} />;
  }

  if (level.type === 'orders' || ['day', 'status', 'payment', 'customer', 'product'].includes(level.type)) {
    // If we drilled into a dimension value, show order list for that slice
    if (level.type !== 'orders' && level.value) {
      return (
        <OrdersDrillTable
          orders={orders}
          title={`${level.label} — ${orders.length} orders`}
          onOpenOrder={(order) =>
            onDrill({
              type: 'order',
              value: order.orderId,
              label: `#${String(order.orderId).slice(0, 10)}`,
            })
          }
        />
      );
    }
  }

  const dim = level.dim || 'overview';

  return (
    <div className="bi-explorer">
      <div className="adm-kpi-grid">
        <button
          type="button"
          className="adm-kpi bi-kpi"
          onClick={() => onDrill({ type: 'root', dim: 'day', label: 'By Day' })}
        >
          <div className="adm-kpi__label">Revenue {Object.keys(filters).length ? '(scoped)' : ''}</div>
          <div className="adm-kpi__value" style={{ color: '#1e40af' }}>{money(scopedKpis.revenue || data.kpis?.totalRevenue)}</div>
          <div className="adm-kpi__hint">Click to drill by day →</div>
        </button>
        <button
          type="button"
          className="adm-kpi bi-kpi"
          onClick={() => onDrill({ type: 'root', dim: 'status', label: 'By Status' })}
        >
          <div className="adm-kpi__label">Orders</div>
          <div className="adm-kpi__value" style={{ color: '#166534' }}>{scopedKpis.orders || data.kpis?.totalOrders || 0}</div>
          <div className="adm-kpi__hint">Click to drill by status →</div>
        </button>
        <button
          type="button"
          className="adm-kpi bi-kpi"
          onClick={() => onDrill({ type: 'root', dim: 'customer', label: 'By Customer' })}
        >
          <div className="adm-kpi__label">Avg Order Value</div>
          <div className="adm-kpi__value" style={{ color: '#9f1239' }}>{money(scopedKpis.aov || data.kpis?.avgOrderValue)}</div>
          <div className="adm-kpi__hint">Click to drill by customer →</div>
        </button>
        <button
          type="button"
          className="adm-kpi bi-kpi"
          onClick={() => onDrill({ type: 'root', dim: 'payment', label: 'By Payment' })}
        >
          <div className="adm-kpi__label">Payment success</div>
          <div className="adm-kpi__value" style={{ color: '#6b21a8' }}>{data.kpis?.paymentSuccessRate || 0}%</div>
          <div className="adm-kpi__hint">Click to drill by method →</div>
        </button>
      </div>

      <p className="bi-hint">{days}-day BI view · Click any chart row or bar to drill into orders</p>

      {(dim === 'overview' || dim === 'day') && (
        <div className="adm-panel" style={{ marginBottom: '1rem' }}>
          <div className="adm-panel__head">
            <h2>Revenue by day</h2>
            <span className="bi-hint-inline">Drill level 1</span>
          </div>
          <div className="bi-bars">
            {(data.dailyTrend || []).map((d) => {
              const pct = Math.max(4, Math.round((d.revenue / maxRevenue) * 100));
              return (
                <button
                  key={d.date}
                  type="button"
                  className="bi-bars__col"
                  title={`${formatDay(d.date)} · ${money(d.revenue)} · ${d.orders} orders`}
                  onClick={() =>
                    onDrill({
                      type: 'day',
                      value: d.date,
                      label: formatDay(d.date),
                    })
                  }
                >
                  <div className="bi-bars__fill" style={{ height: `${pct}%` }} />
                  <span>{d.date.slice(5)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bi-grid">
        {(dim === 'overview' || dim === 'status') && (
          <DrillList
            title="By order status"
            rows={(data.statusBreakdown || []).map((s) => ({
              key: s.status,
              label: STATUS_LABELS[s.status] || s.status,
              value: s.count,
              sub: `${s.pct}%`,
              onClick: () =>
                onDrill({ type: 'status', value: s.status, label: getStatusLabel(s.status) }),
            }))}
          />
        )}

        {(dim === 'overview' || dim === 'payment') && (
          <DrillList
            title="By payment method"
            rows={(data.paymentBreakdown || []).map((p) => ({
              key: p.method,
              label: PAYMENT_LABELS[p.method] || p.method,
              value: p.count,
              sub: money(p.revenue || 0),
              onClick: () =>
                onDrill({
                  type: 'payment',
                  value: p.method,
                  label: PAYMENT_LABELS[p.method] || p.method,
                }),
            }))}
          />
        )}

        {(dim === 'overview' || dim === 'product') && (
          <DrillList
            title="By product"
            rows={(data.topProducts || []).slice(0, 12).map((p) => ({
              key: p.id,
              label: p.name,
              value: money(p.revenue),
              sub: `${p.units} units · ${p.orders} orders`,
              onClick: () => onDrill({ type: 'product', value: p.id, label: p.name }),
            }))}
          />
        )}

        {(dim === 'overview' || dim === 'customer') && (
          <DrillList
            title="By customer"
            rows={(data.topCustomers || []).slice(0, 12).map((c) => ({
              key: c.email,
              label: c.name,
              value: money(c.spend),
              sub: `${c.orders} orders · ${c.email}`,
              onClick: () =>
                onDrill({ type: 'customer', value: c.email, label: c.name }),
            }))}
          />
        )}
      </div>
    </div>
  );
}

function DrillList({ title, rows }) {
  return (
    <div className="adm-panel">
      <div className="adm-panel__head">
        <h2>{title}</h2>
        <span className="bi-hint-inline">Click to drill</span>
      </div>
      <div className="bi-drill-list">
        {rows.length === 0 ? (
          <div className="adm-empty">No data</div>
        ) : (
          rows.map((row) => (
            <button key={row.key} type="button" className="bi-drill-row" onClick={row.onClick}>
              <div>
                <strong>{row.label}</strong>
                <div className="bi-muted">{row.sub}</div>
              </div>
              <div className="bi-drill-row__right">
                <span>{row.value}</span>
                <span aria-hidden>›</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function OrdersDrillTable({ orders, title, onOpenOrder }) {
  return (
    <div className="adm-panel">
      <div className="adm-panel__head">
        <h2>{title}</h2>
        <span className="bi-hint-inline">Drill level · orders</span>
      </div>
      {orders.length === 0 ? (
        <div className="adm-empty">No orders in this slice.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const style = getStatusStyle(order.status);
                return (
                  <tr key={order.orderId}>
                    <td style={{ fontWeight: 700 }}>#{String(order.orderId).slice(0, 12)}</td>
                    <td>{formatDay(order.date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                      <div className="bi-muted">{order.customerEmail}</div>
                    </td>
                    <td>
                      <span className="adm-pill" style={{ background: style.bg, color: style.color }}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</td>
                    <td style={{ fontWeight: 750 }}>{money(order.total)}</td>
                    <td>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onOpenOrder(order)}>
                        Drill
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrderDrillDetail({ order }) {
  const style = getStatusStyle(order.status);
  return (
    <div className="adm-panel">
      <div className="adm-panel__head">
        <h2>Order #{String(order.orderId).slice(0, 14)}</h2>
        <span className="adm-pill" style={{ background: style.bg, color: style.color }}>
          {getStatusLabel(order.status)}
        </span>
      </div>
      <div className="adm-drawer__body">
        <div className="bi-grid" style={{ marginBottom: '1rem' }}>
          <div>
            <div className="bi-muted">Customer</div>
            <strong>{order.customerName}</strong>
            <div className="bi-muted">{order.customerEmail}</div>
            <div className="bi-muted">{order.customerPhone}</div>
          </div>
          <div>
            <div className="bi-muted">Payment</div>
            <strong>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</strong>
            <div className="bi-muted">{order.paymentStatus}</div>
            <div style={{ marginTop: 8, fontWeight: 800 }}>{money(order.total)}</div>
          </div>
        </div>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, idx) => (
              <tr key={`${item.id}-${idx}`}>
                <td>
                  {item.name}
                  <div className="bi-muted">
                    {[item.sizeLabel, item.weightLabel].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td>{item.qty}</td>
                <td>{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
