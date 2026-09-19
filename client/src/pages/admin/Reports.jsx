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
  { id: 'stock-valuation', name: 'Stock Valuation (Qty × Purchase)', category: 'inventory', kind: 'stock' },
  { id: 'margin-profit', name: 'Margin & Profit (Sale − Purchase)', category: 'inventory', kind: 'margin' },
  { id: 'grn-inward', name: 'GRN / Purchase Inward', category: 'inventory', kind: 'grn' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Reports' },
  { id: 'sales', label: 'Sales' },
  { id: 'payments', label: 'Payments' },
  { id: 'activity', label: 'Activity' },
  { id: 'customers', label: 'Customers' },
  { id: 'inventory', label: 'Stock & Margin' },
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

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(title, headers, rows) {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) {
    alert('Allow pop-ups to export PDF');
    return;
  }
  const head = headers.map((h) => `<th>${h}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`)
    .join('');
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:16px;color:#111}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#0a2540;color:#fff}
    </style></head><body>
    <h1>${title}</h1>
    <p>${rows.length} rows · ${new Date().toLocaleString('en-IN')}</p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState('');
  const [stockOnly, setStockOnly] = useState(false);
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
        let res;
        if (activeReport.kind === 'stock') {
          res = await api.get('/admin/reports/stock');
        } else if (activeReport.kind === 'margin' || activeReport.kind === 'grn') {
          const params = new URLSearchParams();
          if (fromDate) params.set('from', fromDate);
          if (toDate) params.set('to', toDate);
          const path = activeReport.kind === 'grn' ? '/admin/reports/grn' : '/admin/reports/margin';
          res = await api.get(`${path}?${params.toString()}`);
        } else {
          const params = new URLSearchParams({ days: String(days) });
          if (fromDate) params.set('from', fromDate);
          if (toDate) params.set('to', toDate);
          res = await api.get(`/admin/reports/overview?${params.toString()}`);
        }
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
  }, [activeReport, days, fromDate, toDate]);

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

  const filterBar = (
    <div className="adm-filters" style={{ margin: '0.75rem 0 1rem' }}>
      {activeReport?.kind !== 'stock' ? (
        <>
          <div className="adm-field">
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="adm-field">
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </>
      ) : null}
      {activeReport?.kind !== 'stock' && activeReport?.kind !== 'margin' && activeReport?.kind !== 'grn' ? (
        <div className="adm-field">
          <label>Preset</label>
          <select
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setFromDate('');
              setToDate('');
              setDrill([{ type: 'root', dim: activeReport.startDim || 'overview', label: activeReport.name }]);
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </div>
      ) : null}
      <div className="adm-field">
        <label>Search</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Product, customer…" />
      </div>
      {activeReport?.kind === 'stock' ? (
        <div className="adm-field">
          <label>Stock</label>
          <select value={stockOnly ? 'in' : 'all'} onChange={(e) => setStockOnly(e.target.value === 'in')}>
            <option value="all">All SKUs</option>
            <option value="in">In stock only</option>
          </select>
        </div>
      ) : null}
    </div>
  );

  if (activeReport) {
    return (
      <div className="adm-page bi-report">
        <div className="adm-page__head">
          <div>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setActiveReport(null)}>
              ← Reports Center
            </button>
            <h1 style={{ marginTop: '0.75rem' }}>{activeReport.name}</h1>
            <p>
              {activeReport.kind === 'stock'
                ? 'Current stock × last purchase price from GRN.'
                : activeReport.kind === 'margin'
                  ? 'Sold qty × (sale price − purchase price). Example: buy ₹2,500, sell ₹3,000 → ₹500 profit per bat.'
                  : activeReport.kind === 'grn'
                    ? 'Goods receipts in the date range: qty in, purchase value, supplier, invoice.'
                    : 'Filters + download apply to the current view.'}
            </p>
          </div>
        </div>

        {filterBar}

        {!activeReport.kind && (
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
        )}

        {loading && <div className="adm-empty">Loading report…</div>}
        {error && <div className="reports-center__error">{error}</div>}
        {!loading && !error && data && activeReport.kind === 'stock' && (
          <StockValuationReport data={data} query={query} stockOnly={stockOnly} />
        )}
        {!loading && !error && data && activeReport.kind === 'margin' && (
          <MarginReport data={data} query={query} />
        )}
        {!loading && !error && data && activeReport.kind === 'grn' && (
          <GrnInwardReport data={data} query={query} />
        )}
        {!loading && !error && data && !activeReport.kind && (
          <BiExplorer
            data={data}
            days={days}
            level={currentLevel}
            filters={drillFilters}
            query={query}
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

function BiExplorer({ data, days, level, filters, query, onDrill }) {
  const q = String(query || '').trim().toLowerCase();
  const orders = useMemo(() => {
    return filterOrders(data.drillOrders || [], filters).filter((o) => {
      if (!q) return true;
      return [o.orderId, o.customerName, o.customerEmail, o.customerPhone, ...(o.items || []).map((i) => i.name)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [data.drillOrders, filters, q]);
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

      <p className="bi-hint">{days}-day BI view · Search + dates in the filter bar · Click to drill</p>

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
  const exportRows = () =>
    orders.map((o, i) => [
      i + 1,
      o.orderId,
      formatDay(o.date),
      o.customerName,
      o.customerEmail,
      o.customerPhone,
      getStatusLabel(o.status),
      PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod,
      o.total,
    ]);
  const headers = ['S.No', 'Order', 'Date', 'Customer', 'Email', 'Phone', 'Status', 'Payment', 'Total'];
  return (
    <div className="adm-panel">
      <div className="adm-panel__head">
        <h2>{title}</h2>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('h2r-sales.csv', headers, exportRows())}>
            Excel
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadPdf('H2R sales', headers, exportRows())}>
            PDF
          </button>
        </div>
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

function StockValuationReport({ data, query, stockOnly }) {
  const q = String(query || '').trim().toLowerCase();
  const rows = (data.rows || []).filter((r) => {
    if (stockOnly && !(r.stock > 0)) return false;
    if (!q) return true;
    return [r.name, r.sizeLabel, r.collection, r.category].join(' ').toLowerCase().includes(q);
  });
  const kpis = rows.reduce(
    (acc, r) => {
      acc.totalStock += r.stock;
      acc.totalValue += r.stockValue;
      return acc;
    },
    { totalStock: 0, totalValue: 0 }
  );
  const headers = ['S.No', 'Product', 'Size', 'Stock', 'Purchase price', 'Stock value', 'Selling price'];
  const exportRows = () =>
    rows.map((r, i) => [i + 1, r.name, r.sizeLabel, r.stock, r.purchasePrice, r.stockValue, r.sellingPrice]);

  return (
    <div>
      <div className="adm-kpi-grid">
        <div className="adm-kpi">
          <div className="adm-kpi__label">SKUs</div>
          <div className="adm-kpi__value">{rows.length}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Total qty</div>
          <div className="adm-kpi__value">{kpis.totalStock}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Stock value (qty × purchase)</div>
          <div className="adm-kpi__value" style={{ color: '#1e40af' }}>{money(kpis.totalValue)}</div>
        </div>
      </div>
      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Stock valuation</h2>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('h2r-stock-valuation.csv', headers, exportRows())}>
              Excel
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadPdf('Stock valuation', headers, exportRows())}>
              PDF
            </button>
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product</th>
                <th>Size</th>
                <th>Stock</th>
                <th>Purchase ₹</th>
                <th>Value</th>
                <th>Selling ₹</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.productId}-${r.sizeId}-${i}`}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="bi-muted">{r.category}</div>
                  </td>
                  <td>{r.sizeLabel}</td>
                  <td>{r.stock}</td>
                  <td>{money(r.purchasePrice)}</td>
                  <td style={{ fontWeight: 750 }}>{money(r.stockValue)}</td>
                  <td>{money(r.sellingPrice)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="reports-center__empty-row">
                    No stock rows. Inward a GRN with purchase price first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarginReport({ data, query }) {
  const q = String(query || '').trim().toLowerCase();
  const rows = (data.rows || []).filter((r) => {
    if (!q) return true;
    return [r.name, r.sizeLabel].join(' ').toLowerCase().includes(q);
  });
  const kpis = rows.reduce(
    (acc, r) => {
      acc.qty += r.qty;
      acc.revenue += r.revenue;
      acc.cogs += r.cogs;
      acc.profit += r.profit;
      return acc;
    },
    { qty: 0, revenue: 0, cogs: 0, profit: 0 }
  );
  kpis.marginPct = kpis.revenue ? Math.round((kpis.profit / kpis.revenue) * 1000) / 10 : 0;
  const headers = [
    'S.No',
    'Product',
    'Size',
    'Qty sold',
    'Purchase ₹',
    'Avg sale ₹',
    'Revenue',
    'Cost',
    'Profit',
    'Margin %',
  ];
  const exportRows = () =>
    rows.map((r, i) => [
      i + 1,
      r.name,
      r.sizeLabel,
      r.qty,
      r.purchasePrice,
      Math.round(r.sellingAvg),
      r.revenue,
      r.cogs,
      r.profit,
      r.marginPct,
    ]);

  return (
    <div>
      <div className="adm-kpi-grid">
        <div className="adm-kpi">
          <div className="adm-kpi__label">Bats sold</div>
          <div className="adm-kpi__value">{kpis.qty}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Revenue</div>
          <div className="adm-kpi__value" style={{ color: '#1e40af' }}>{money(kpis.revenue)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Purchase cost</div>
          <div className="adm-kpi__value">{money(kpis.cogs)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Profit (sale − purchase)</div>
          <div className="adm-kpi__value" style={{ color: '#166534' }}>{money(kpis.profit)}</div>
          <div className="adm-kpi__hint">{kpis.marginPct}% margin</div>
        </div>
      </div>
      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Margin by item</h2>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('h2r-margin.csv', headers, exportRows())}>
              Excel
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadPdf('Margin & profit', headers, exportRows())}>
              PDF
            </button>
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product</th>
                <th>Size</th>
                <th>Qty sold</th>
                <th>Buy ₹</th>
                <th>Sell avg ₹</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.productId}-${r.sizeLabel}-${i}`}>
                  <td>{i + 1}</td>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.sizeLabel}</td>
                  <td>{r.qty}</td>
                  <td>{money(r.purchasePrice)}</td>
                  <td>{money(r.sellingAvg)}</td>
                  <td>{money(r.revenue)}</td>
                  <td>{money(r.cogs)}</td>
                  <td style={{ fontWeight: 750, color: r.profit >= 0 ? '#166534' : '#9f1239' }}>{money(r.profit)}</td>
                  <td>{r.marginPct}%</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={10} className="reports-center__empty-row">
                    No sales in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GrnInwardReport({ data, query }) {
  const q = String(query || '').trim().toLowerCase();
  const rows = (data.rows || []).filter((r) => {
    if (!q) return true;
    return [r.grnId, r.invoiceNumber, r.supplierName, r.itemName, r.sizeLabel]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });
  const docs = (data.documents || []).filter((d) => {
    if (!q) return true;
    return rows.some((r) => r.grnId === d.grnId) ||
      [d.grnId, d.invoiceNumber, d.supplierName].join(' ').toLowerCase().includes(q);
  });
  const kpis = rows.reduce(
    (acc, r) => {
      acc.qty += r.qty;
      acc.value += r.lineTotal;
      return acc;
    },
    { qty: 0, value: 0 }
  );
  const headers = [
    'S.No',
    'GRN',
    'Date',
    'Invoice',
    'Supplier',
    'Item',
    'Size',
    'Qty in',
    'Purchase ₹',
    'Value',
  ];
  const exportRows = () =>
    rows.map((r, i) => [
      i + 1,
      r.grnId,
      formatDay(r.date),
      r.invoiceNumber,
      r.supplierName,
      r.itemName,
      r.sizeLabel,
      r.qty,
      r.purchasePrice,
      r.lineTotal,
    ]);
  const docHeaders = ['S.No', 'GRN', 'Date', 'Invoice', 'Supplier', 'Lines', 'Qty in', 'Value'];
  const exportDocs = () =>
    docs.map((d, i) => [
      i + 1,
      d.grnId,
      formatDay(d.date),
      d.invoiceNumber,
      d.supplierName,
      d.itemCount,
      d.totalQty,
      d.totalValue,
    ]);

  return (
    <div>
      <div className="adm-kpi-grid">
        <div className="adm-kpi">
          <div className="adm-kpi__label">GRNs</div>
          <div className="adm-kpi__value">{docs.length}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Qty inwarded</div>
          <div className="adm-kpi__value">{kpis.qty}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Purchase value</div>
          <div className="adm-kpi__value" style={{ color: '#1e40af' }}>{money(kpis.value)}</div>
        </div>
      </div>
      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>GRN lines</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('h2r-grn-lines.csv', headers, exportRows())}>
              Excel lines
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadPdf('GRN lines', headers, exportRows())}>
              PDF lines
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('h2r-grn-summary.csv', docHeaders, exportDocs())}>
              Excel GRNs
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadPdf('GRN summary', docHeaders, exportDocs())}>
              PDF GRNs
            </button>
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>GRN</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Item</th>
                <th>Qty in</th>
                <th>Buy ₹</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.grnId}-${i}`}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{r.grnId}</strong>
                    <div className="bi-muted">{r.invoiceNumber || 'No invoice'}</div>
                  </td>
                  <td>{formatDay(r.date)}</td>
                  <td>{r.supplierName || '—'}</td>
                  <td>
                    {r.itemName}
                    <div className="bi-muted">{r.sizeLabel}</div>
                  </td>
                  <td>{r.qty}</td>
                  <td>{money(r.purchasePrice)}</td>
                  <td style={{ fontWeight: 750 }}>{money(r.lineTotal)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="reports-center__empty-row">
                    No GRNs in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
