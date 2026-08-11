import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';

const EMPTY = {
  name: '',
  text: '',
  rating: 5,
  location: '',
  productName: '',
  status: 'approved',
  featured: false,
  sortOrder: 0,
};

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/admin/reviews');
      const list = res.data.reviews || [];
      setReviews(list);
      const pendingCount = list.filter((r) => r.status === 'pending').length;
      setFilter((prev) => {
        if (prev === 'pending' && pendingCount === 0 && list.length) return 'all';
        return prev;
      });
    } catch (err) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    return reviews.filter((r) => r.status === filter);
  }, [reviews, filter]);

  const counts = useMemo(() => {
    const c = { all: reviews.length, approved: 0, pending: 0, hidden: 0 };
    reviews.forEach((r) => {
      if (c[r.status] != null) c[r.status] += 1;
    });
    return c;
  }, [reviews]);

  const openCreate = () => {
    setEditing('new');
    setForm(EMPTY);
    setError('');
  };

  const openEdit = (review) => {
    setEditing(review.id);
    setForm({
      name: review.name || '',
      text: review.text || '',
      rating: review.rating || 5,
      location: review.location || '',
      productName: review.productName || '',
      status: review.status || 'approved',
      featured: !!review.featured,
      sortOrder: review.sortOrder || 0,
    });
    setError('');
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await api.post('/admin/reviews', form);
      } else {
        await api.put(`/admin/reviews/${editing}`, form);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.put(`/admin/reviews/${id}`, { status });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update status');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete');
    }
  };

  if (loading) return <div className="adm-muted">Loading reviews…</div>;

  return (
    <div className="adm-reviews">
      <p className="adm-reviews__lead">
        Customer reviews arrive as <strong>Pending</strong>. Choose whether to{' '}
        <strong>post on the website</strong> (shows in the home marquee) or hide / delete.
      </p>

      <div className="adm-reviews__toolbar">
        <div className="adm-reviews__filters">
          {[
            { id: 'pending', label: 'Needs decision' },
            { id: 'approved', label: 'Posted on site' },
            { id: 'hidden', label: 'Not posted' },
            { id: 'all', label: 'All' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`adm-chip${filter === f.id ? ' is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label} ({f.id === 'all' ? counts.all : counts[f.id] ?? 0})
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + Add review
        </button>
      </div>

      {error && !editing ? <p className="adm-error">{error}</p> : null}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Bat / review</th>
              <th>Stars</th>
              <th>Status</th>
              <th>Post on website?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="adm-muted">
                  {filter === 'pending'
                    ? 'No pending customer reviews right now.'
                    : 'No reviews in this filter.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className={r.status === 'pending' ? 'adm-reviews__row--pending' : ''}>
                  <td>
                    <strong>{r.name}</strong>
                    {r.location ? <div className="adm-muted">{r.location}</div> : null}
                    <div className="adm-muted">
                      {r.source === 'customer' ? 'Customer submission' : r.source || 'Admin'}
                    </div>
                  </td>
                  <td className="adm-reviews__text">
                    {r.productName ? (
                      <div className="adm-reviews__product">
                        Bat: <strong>{r.productName}</strong>
                      </div>
                    ) : null}
                    <div>{r.text}</div>
                    {Array.isArray(r.media) && r.media.length ? (
                      <div className="adm-reviews__media">
                        {r.media.map((m, idx) => (
                          <a
                            key={`${m.url}-${idx}`}
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="adm-reviews__media-thumb"
                            title={m.type === 'video' ? 'Open clip' : 'Open photo'}
                          >
                            {m.type === 'video' ? (
                              <video src={m.url} muted playsInline />
                            ) : (
                              <img src={m.url} alt="" />
                            )}
                            {m.type === 'video' ? (
                              <span className="adm-reviews__media-play">▶</span>
                            ) : null}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td>{'★'.repeat(r.rating || 5)}</td>
                  <td>
                    <span className={`adm-status adm-status--${r.status}`}>{r.status}</span>
                  </td>
                  <td>
                    {r.status === 'pending' ? (
                      <div className="adm-reviews__decide">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => setStatus(r.id, 'approved')}
                        >
                          Yes — post on site
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setStatus(r.id, 'hidden')}
                        >
                          No — don’t post
                        </button>
                        <button type="button" className="adm-link" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="adm-reviews__actions">
                        {r.status === 'approved' ? (
                          <span className="adm-muted">Live on home marquee</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => setStatus(r.id, 'approved')}
                          >
                            Post on site
                          </button>
                        )}
                        {r.status === 'approved' ? (
                          <button type="button" className="adm-link" onClick={() => setStatus(r.id, 'hidden')}>
                            Unpublish
                          </button>
                        ) : null}
                        <button type="button" className="adm-link" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                        <button type="button" className="adm-link adm-link--danger" onClick={() => remove(r.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="adm-drawer-backdrop" onClick={closeForm}>
          <div className="adm-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="adm-drawer__head">
              <h2>{editing === 'new' ? 'Add review' : 'Edit review'}</h2>
              <button type="button" className="adm-drawer__close" onClick={closeForm} aria-label="Close">
                ✕
              </button>
            </div>
            <form className="adm-drawer__body" onSubmit={save}>
              {error ? <p className="adm-error">{error}</p> : null}
              <label className="adm-field">
                Customer name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="adm-field">
                Location (optional)
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Chennai, TN"
                />
              </label>
              <label className="adm-field">
                Review text
                <textarea
                  required
                  rows={4}
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                />
              </label>
              <div className="adm-field-row">
                <label className="adm-field">
                  Rating
                  <select
                    value={form.rating}
                    onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} ★
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adm-field">
                  Post on website?
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="approved">Yes — show on site</option>
                    <option value="pending">Wait — needs decision</option>
                    <option value="hidden">No — don’t post</option>
                  </select>
                </label>
              </div>
              <label className="adm-field">
                Product name (optional)
                <input
                  value={form.productName}
                  onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                />
              </label>
              <label className="adm-field">
                Sort order
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                />
              </label>
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                />
                Featured on home
              </label>
              <div className="adm-drawer__actions">
                <button type="button" className="btn btn--ghost" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
