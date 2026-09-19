import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import GrnDocument from '../../components/admin/GrnDocument';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Grn() {
  const navigate = useNavigate();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [printGrn, setPrintGrn] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/grn');
        setGrns(res.data.grns || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grns;
    return grns.filter((g) =>
      [g.grnId, g.invoiceNumber, g.supplierName, ...(g.items || []).map((i) => i.itemName)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [grns, query]);

  if (loading) return <div className="adm-empty">Loading GRN…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page__head adm-page__head--slim">
        <div className="adm-page__actions">
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => navigate('/admin/grn/new')}>
            + New GRN
          </button>
        </div>
      </div>

      <div className="adm-filters">
        <div className="adm-field">
          <label>Search</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="GRN, invoice, supplier, bat…" />
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Goods receipt notes</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="adm-empty">No GRNs yet. Create one to inward stock.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>GRN</th>
                  <th>Invoice</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Qty in</th>
                  <th>Value</th>
                  <th>Received</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.grnId}>
                    <td>
                      <strong>{g.grnId}</strong>
                    </td>
                    <td>
                      {g.invoiceNumber || '—'}
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{formatDate(g.invoiceDate)}</div>
                    </td>
                    <td>{g.supplierName || '—'}</td>
                    <td>
                      {(g.items || []).map((line) => line.itemName).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>{g.totalQty}</td>
                    <td>{money(g.totalValue)}</td>
                    <td>{formatDate(g.receivedAt || g.createdAt)}</td>
                    <td>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setPrintGrn(g)}>
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {printGrn ? <GrnDocument grn={printGrn} onClose={() => setPrintGrn(null)} /> : null}
    </div>
  );
}
