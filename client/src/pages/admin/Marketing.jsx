import { useEffect, useState } from 'react';
import api from '../../api/client';
import { isInstagramUrl } from '../../utils/instagram';

const emptyVideo = () => ({
  id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  videoUrl: '',
  instagramUrl: '',
  productPath: '/shop',
  productName: '',
  productId: '',
  active: true,
  sortOrder: 1,
});

const emptyStatus = () => ({
  id: `status-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  text: '',
  ctaText: 'Message us',
  prefillMessage: '',
  active: true,
  sortOrder: 1,
});

export default function Marketing() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floatingVideos, setFloatingVideos] = useState([]);
  const [whatsappStatuses, setWhatsappStatuses] = useState([]);
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [marketingRes, productsRes] = await Promise.all([
          api.get('/admin/marketing'),
          api.get('/products'),
        ]);
        const settings = marketingRes.data.settings || {};
        setFloatingVideos(settings.floatingVideos || []);
        setWhatsappStatuses(settings.whatsappStatuses || []);
        setProducts(productsRes.data.products || []);
      } catch (_err) {
        setNotice('Failed to load marketing settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectProduct = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    setFloatingVideos((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (!product) {
          return { ...item, productId: '', productPath: '/shop', productName: '' };
        }
        return {
          ...item,
          productId: product.id,
          productPath: `/shop/${product.id}`,
          productName: product.name,
        };
      })
    );
  };

  const uploadVideoFile = async (index, file) => {
    if (!file) return;
    setUploadingIndex(index);
    setNotice('');
    try {
      const data = new FormData();
      data.append('video', file);
      const res = await api.post('/admin/marketing/upload-video', data);
      updateArray(setFloatingVideos, index, 'videoUrl', res.data.url);
      setNotice('Video uploaded. Click "Save Marketing" to publish (autoplay).');
    } catch (err) {
      setNotice(err.response?.data?.error || err.message || 'Video upload failed.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setNotice('');
    const invalidIg = floatingVideos.find((v) => v.instagramUrl && !isInstagramUrl(v.instagramUrl));
    if (invalidIg) {
      setNotice('One or more Instagram links are invalid.');
      setSaving(false);
      return;
    }
    const missingVideo = floatingVideos.some((v) => (v.title || v.instagramUrl) && !v.videoUrl);
    if (missingVideo) {
      setNotice('Upload a local video file for each entry (needed for autoplay).');
      setSaving(false);
      return;
    }
    const missingProduct = floatingVideos.some((v) => v.videoUrl && !v.productPath?.startsWith('/shop/'));
    if (missingProduct) {
      setNotice('Select a product for each video (Buy Now destination).');
      setSaving(false);
      return;
    }
    try {
      const activeVideos = floatingVideos.filter((v) => v.videoUrl?.trim() || v.title?.trim());
      await api.put('/admin/marketing', { floatingVideos: activeVideos, whatsappStatuses });
      setNotice('Marketing settings updated successfully.');
    } catch (err) {
      setNotice(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading marketing module...</div>;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.85rem', fontWeight: '800' }}>Marketing</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>
            Upload video + assign a product. Buy Now opens that product page.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            padding: '0.7rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Marketing'}
        </button>
      </div>

      {notice ? <div style={{ marginBottom: '1rem', color: notice.includes('successfully') || notice.includes('uploaded') ? '#166534' : '#991b1b' }}>{notice}</div> : null}

      <SectionCard
        title="Floating Autoplay Video"
        subtitle="Upload mp4, pick a product from dropdown. Click video on site → full size + Buy Now."
        actionLabel="+ Add Video"
        onAdd={() => setFloatingVideos((prev) => [...prev, { ...emptyVideo(), sortOrder: prev.length + 1 }])}
      >
        {floatingVideos.length === 0 && (
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            No videos yet. Click + Add Video and upload an mp4 from your PC.
          </p>
        )}
        {floatingVideos.map((video, index) => {
          const selectedId =
            video.productId ||
            (video.productPath?.startsWith('/shop/') ? video.productPath.replace('/shop/', '') : '');
          return (
            <div key={video.id} style={itemCardStyle}>
              <div style={gridStyle}>
                <Field label="Title">
                  <input value={video.title} onChange={(e) => updateArray(setFloatingVideos, index, 'title', e.target.value)} style={inputStyle} placeholder="e.g. Thala Edition" />
                </Field>
                <Field label="Video file (mp4 — autoplay)">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    disabled={uploadingIndex === index}
                    onChange={(e) => uploadVideoFile(index, e.target.files?.[0])}
                    style={{ ...inputStyle, padding: '0.35rem' }}
                  />
                  {uploadingIndex === index && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Uploading...</span>}
                  {video.videoUrl && (
                    <span style={{ fontSize: '0.75rem', color: '#166534', wordBreak: 'break-all' }}>
                      ✓ {video.videoUrl.split('/').pop()}
                    </span>
                  )}
                </Field>
                <Field label="Instagram URL (optional)">
                  <input
                    value={video.instagramUrl || ''}
                    onChange={(e) => updateArray(setFloatingVideos, index, 'instagramUrl', e.target.value)}
                    style={inputStyle}
                    placeholder="https://www.instagram.com/reel/XXXXX/"
                  />
                </Field>
                <Field label="Product (Buy Now destination)">
                  <select
                    value={selectedId}
                    onChange={(e) => selectProduct(index, e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{Number(p.price || 0).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                  {video.productPath?.startsWith('/shop/') && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Path: {video.productPath}
                    </span>
                  )}
                </Field>
                <Field label="Sort Order">
                  <input type="number" value={video.sortOrder} onChange={(e) => updateArray(setFloatingVideos, index, 'sortOrder', Number(e.target.value) || 1)} style={inputStyle} />
                </Field>
              </div>

              {video.videoUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Preview (autoplay muted)</p>
                  <video
                    src={`http://localhost:5000${video.videoUrl}`}
                    muted
                    autoPlay
                    loop
                    playsInline
                    style={{ width: '120px', height: '180px', objectFit: 'cover', borderRadius: '10px', background: '#000' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" checked={video.active !== false} onChange={(e) => updateArray(setFloatingVideos, index, 'active', e.target.checked)} />
                  Active
                </label>
                <button type="button" onClick={() => setFloatingVideos((prev) => prev.filter((_, i) => i !== index))} style={dangerBtnStyle}>
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </SectionCard>

      <SectionCard
        title="WhatsApp Status Bar"
        subtitle="Short CTA cards shown under the navbar."
        actionLabel="+ Add Status"
        onAdd={() => setWhatsappStatuses((prev) => [...prev, { ...emptyStatus(), sortOrder: prev.length + 1 }])}
      >
        {whatsappStatuses.map((status, index) => (
          <div key={status.id} style={itemCardStyle}>
            <div style={gridStyle}>
              <Field label="Status Text">
                <input value={status.text} onChange={(e) => updateArray(setWhatsappStatuses, index, 'text', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="CTA Text">
                <input value={status.ctaText} onChange={(e) => updateArray(setWhatsappStatuses, index, 'ctaText', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Prefill WhatsApp Message">
                <input value={status.prefillMessage} onChange={(e) => updateArray(setWhatsappStatuses, index, 'prefillMessage', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Sort Order">
                <input type="number" value={status.sortOrder} onChange={(e) => updateArray(setWhatsappStatuses, index, 'sortOrder', Number(e.target.value) || 1)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input type="checkbox" checked={status.active !== false} onChange={(e) => updateArray(setWhatsappStatuses, index, 'active', e.target.checked)} />
                Active
              </label>
              <button type="button" onClick={() => setWhatsappStatuses((prev) => prev.filter((_, i) => i !== index))} style={dangerBtnStyle}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, subtitle, actionLabel, onAdd, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{title}</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{subtitle}</p>
        </div>
        <button type="button" onClick={onAdd} style={lightBtnStyle}>{actionLabel}</button>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: '#475569' }}>
      {label}
      {children}
    </label>
  );
}

function updateArray(setter, index, key, value) {
  setter((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
}

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' };
const itemCardStyle = { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.8rem', marginBottom: '0.7rem' };
const inputStyle = { padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' };
const lightBtnStyle = { padding: '0.45rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' };
const dangerBtnStyle = { padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' };
