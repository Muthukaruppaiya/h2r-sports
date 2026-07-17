import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { STATUS_LABELS } from '../../utils/orderStatus';

const PAYMENT_LABELS = {
  cod: 'COD',
  upi: 'UPI',
  card: 'Card',
};

/** Only reports backed by live DB overview data */
const LIVE_REPORTS = [
  { id: 'sales-overview', name: 'Sales Overview', category: 'sales', createdBy: 'System Generated', view: 'overview' },
  { id: 'sales-by-customer', name: 'Sales by Customer', category: 'sales', createdBy: 'System Generated', view: 'customers' },
  { id: 'sales-by-items', name: 'Sales By Items', category: 'sales', createdBy: 'System Generated', view: 'products' },
  { id: 'sales-by-orders', name: 'Sales By Orders', category: 'sales', createdBy: 'System Generated', view: 'status' },
  { id: 'order-fulfillment', name: 'Order Fulfillment', category: 'sales', createdBy: 'System Generated', view: 'overview' },
  { id: 'payments-received', name: 'Payments Received', category: 'payments', createdBy: 'System Generated', view: 'payments' },
  { id: 'payment-methods', name: 'Payment Method Mix', category: 'payments', createdBy: 'System Generated', view: 'payments' },
  { id: 'customer-spend', name: 'Top Customers by Spend', category: 'customers', createdBy: 'System Generated', view: 'customers' },
  { id: 'activity-status', name: 'Order Status Activity', category: 'activity', createdBy: 'System Generated', view: 'status' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Reports', icon: 'list' },
  { id: 'sales', label: 'Sales', icon: 'folder' },
  { id: 'payments', label: 'Payments Received', icon: 'folder' },
  { id: 'activity', label: 'Activity', icon: 'folder' },
  { id: 'customers', label: 'Customers', icon: 'folder' },
];

const SIDE_ICONS = {
  list: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  folder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  ),
};

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

export default function Reports() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
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
  };

  const maxRevenueInTrend = useMemo(() => {
    if (!data?.dailyTrend?.length) return 1;
    return Math.max(...data.dailyTrend.map((d) => d.revenue), 1);
  }, [data]);

  if (activeReport) {
    return (
      <div className="reports-center">
        <div className="reports-center__toolbar">
          <button type="button" className="reports-center__back" onClick={() => setActiveReport(null)}>
            ← Reports Center
          </button>
          <div>
            <h1>{activeReport.name}</h1>
            <p>
              {categoryLabel(activeReport.category)} · {activeReport.createdBy}
            </p>
          </div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="reports-center__range">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>
        </div>

        {loading && <div className="reports-center__empty">Loading report…</div>}
        {error && <div className="reports-center__error">{error}</div>}
        {!loading && !error && data && (
          <ReportDetail view={activeReport.view} data={data} days={days} maxRevenueInTrend={maxRevenueInTrend} />
        )}
      </div>
    );
  }

  return (
    <div className="reports-center reports-center--split">
      <aside className="reports-center__side">
        <h2>Reports Center</h2>
        <div className="reports-center__cat-label">REPORT CATEGORY</div>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`reports-center__cat${category === c.id ? ' is-active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            <span>{SIDE_ICONS[c.icon]}</span> {c.label}
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
            placeholder="Search reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="reports-center__heading">
          <h1>{category === 'all' ? 'All Reports' : categoryLabel(category)}</h1>
          <span className="reports-center__count">{filteredReports.length}</span>
        </div>

        <div className="reports-center__table-wrap">
          <table className="reports-center__table">
            <thead>
              <tr>
                <th>REPORT NAME</th>
                <th>REPORT CATEGORY</th>
                <th>CREATED BY</th>
                <th>LAST VISITED</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <button type="button" className="reports-center__name" onClick={() => openReport(report)}>
                      <span className="reports-center__star">☆</span>
                      {report.name}
                    </button>
                  </td>
                  <td>{categoryLabel(report.category)}</td>
                  <td>{report.createdBy}</td>
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

function ReportDetail({ view, data, days, maxRevenueInTrend }) {
  const { kpis, statusBreakdown, paymentBreakdown, topProducts, topCustomers, dailyTrend } = data;

  return (
    <div className="report-detail">
      {(view === 'overview' || view === 'status') && (
        <div className="report-detail__kpis">
          <KpiCard title="Revenue" value={`₹${(kpis?.totalRevenue || 0).toLocaleString('en-IN')}`} hint={`${days} day GMV`} />
          <KpiCard title="Orders" value={(kpis?.totalOrders || 0).toLocaleString('en-IN')} hint="Total orders" />
          <KpiCard title="Avg Order Value" value={`₹${(kpis?.avgOrderValue || 0).toLocaleString('en-IN')}`} hint="AOV" />
          <KpiCard title="Fulfillment Rate" value={`${kpis?.fulfillmentRate || 0}%`} hint="Delivered / Total" />
          <KpiCard title="Cancellation Rate" value={`${kpis?.cancellationRate || 0}%`} hint="Cancelled / Total" />
          <KpiCard title="Payment Success" value={`${kpis?.paymentSuccessRate || 0}%`} hint="Paid / Total" />
        </div>
      )}

      {view === 'overview' && (
        <div className="report-detail__grid">
          <Panel title="Revenue Trend">
            <div className="report-detail__bars">
              {dailyTrend?.map((d) => {
                const pct = Math.max(5, Math.round((d.revenue / maxRevenueInTrend) * 100));
                return (
                  <div key={d.date} title={`${d.date} • ₹${d.revenue.toLocaleString('en-IN')} • ${d.orders} orders`} className="report-detail__bar">
                    <div style={{ height: `${pct}%` }} />
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Payment Mix">
            {(paymentBreakdown || []).map((p) => (
              <RowBar key={p.method} label={PAYMENT_LABELS[p.method] || p.method} count={p.count} pct={p.pct} />
            ))}
          </Panel>
        </div>
      )}

      {(view === 'overview' || view === 'status') && (
        <Panel title="Order Status Breakdown">
          {(statusBreakdown || []).map((s) => (
            <RowBar key={s.status} label={STATUS_LABELS[s.status] || s.status} count={s.count} pct={s.pct} />
          ))}
        </Panel>
      )}

      {view === 'payments' && (
        <Panel title="Payment Mix">
          {(paymentBreakdown || []).map((p) => (
            <RowBar key={p.method} label={PAYMENT_LABELS[p.method] || p.method} count={p.count} pct={p.pct} />
          ))}
        </Panel>
      )}

      {(view === 'overview' || view === 'customers') && (
        <Panel title="Top Customers">
          <table className="report-detail__table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Orders</th>
                <th>Spend</th>
              </tr>
            </thead>
            <tbody>
              {(topCustomers || []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="reports-center__empty-row">
                    No customer data in this range.
                  </td>
                </tr>
              ) : (
                (topCustomers || []).map((c) => (
                  <tr key={c.email}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="report-detail__muted">{c.email}</div>
                    </td>
                    <td>{c.orders}</td>
                    <td>₹{Math.round(c.spend).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
      )}

      {(view === 'overview' || view === 'products') && (
        <Panel title="Top Products (Revenue)">
          <table className="report-detail__table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Units</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(topProducts || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="reports-center__empty-row">
                    No product sales in this range.
                  </td>
                </tr>
              ) : (
                (topProducts || []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.units}</td>
                    <td>{p.orders}</td>
                    <td>₹{Math.round(p.revenue).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function KpiCard({ title, value, hint }) {
  return (
    <div className="report-detail__kpi">
      <div className="report-detail__kpi-title">{title}</div>
      <div className="report-detail__kpi-value">{value}</div>
      <div className="report-detail__muted">{hint}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="report-detail__panel">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function RowBar({ label, count, pct }) {
  return (
    <div className="report-detail__rowbar">
      <div>
        <span>{label}</span>
        <span>
          {count} ({pct}%)
        </span>
      </div>
      <div className="report-detail__track">
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
