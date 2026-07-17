import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { mediaUrl } from '../../config/api.js';
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
  title: '',
  text: '',
  mediaUrl: '',
  mediaType: 'image',
  durationDays: 1,
  publishedAt: null,
  expiresAt: null,
  ctaText: 'Message us',
  prefillMessage: '',
  active: true,
  sortOrder: 1,
  resetTimer: true,
});

const DURATION_OPTIONS = [
  { value: 1, label: '1 day (default)' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: '7 days (max)' },
];

function formatExpiry(status) {
  if (!status?.expiresAt) return 'Not published yet';
  const end = new Date(status.expiresAt);
  const now = new Date();
  if (end <= now) return 'Expired';
  const hours = Math.max(1, Math.round((end - now) / 36e5));
  if (hours < 24) return `Expires in ~${hours}h`;
  const days = Math.ceil(hours / 24);
  return `Expires in ~${days} day${days > 1 ? 's' : ''}`;
}

export default function Marketing() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floatingVideos, setFloatingVideos] = useState([]);
  const [whatsappStatuses, setWhatsappStatuses] = useState([]);
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState(false);
  const [tab, setTab] = useState('statuses');

  const [videoModal, setVideoModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);

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
        flash('error', 'Failed to load marketing settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const flash = (type, text) => {
    setNotice({ type, text });
    if (text) {
      window.clearTimeout(flash._t);
      flash._t = window.setTimeout(() => setNotice({ type: '', text: '' }), 5000);
    }
  };

  const liveStatuses = useMemo(
    () => whatsappStatuses.filter((s) => s.active !== false && s.mediaUrl && !s.isExpired),
    [whatsappStatuses]
  );

  const openNewVideo = () => {
    setVideoModal({
      mode: 'create',
      draft: { ...emptyVideo(), sortOrder: floatingVideos.length + 1 },
    });
  };

  const openEditVideo = (video) => {
    setVideoModal({
      mode: 'edit',
      draft: {
        ...video,
        productId:
          video.productId ||
          (video.productPath?.startsWith('/shop/') ? video.productPath.replace('/shop/', '') : ''),
      },
    });
  };

  const openNewStatus = () => {
    setStatusModal({
      mode: 'create',
      draft: { ...emptyStatus(), sortOrder: whatsappStatuses.length + 1 },
    });
  };

  const openEditStatus = (status) => {
    setStatusModal({
      mode: 'edit',
      draft: {
        ...emptyStatus(),
        ...status,
        resetTimer: false,
      },
    });
  };

  const applyProductToDraft = (draft, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { ...draft, productId: '', productPath: '/shop', productName: '' };
    }
    return {
      ...draft,
      productId: product.id,
      productPath: `/shop/${product.id}`,
      productName: product.name,
    };
  };

  const uploadVideoFile = async (file) => {
    if (!file || !videoModal) return;
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      flash('error', 'Video is too large (max 50MB). Compress it or use a shorter clip.');
      return;
    }
    setUploadingVideo(true);
    try {
      const data = new FormData();
      data.append('video', file, file.name || 'video.mp4');
      const res = await api.post('/admin/marketing/upload-video', data);
      setVideoModal((prev) =>
        prev ? { ...prev, draft: { ...prev.draft, videoUrl: res.data.url } } : prev
      );
      flash('success', 'Video uploaded.');
    } catch (err) {
      flash('error', err.response?.data?.error || err.message || 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const uploadStatusMedia = async (file) => {
    if (!file || !statusModal) return;
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      flash('error', 'File is too large (max 50MB). Use a smaller photo/video.');
      return;
    }
    setUploadingStatus(true);
    try {
      const data = new FormData();
      data.append('media', file, file.name || 'status-media');
      const res = await api.post('/admin/marketing/upload-status-media', data);
      setStatusModal((prev) =>
        prev
          ? {
              ...prev,
              draft: {
                ...prev.draft,
                mediaUrl: res.data.url,
                mediaType: res.data.mediaType,
                resetTimer: true,
              },
            }
          : prev
      );
      flash('success', `${res.data.mediaType === 'video' ? 'Video' : 'Photo'} uploaded.`);
    } catch (err) {
      flash('error', err.response?.data?.error || err.message || 'Upload failed.');
    } finally {
      setUploadingStatus(false);
    }
  };

  const saveVideoModal = () => {
    const draft = videoModal?.draft;
    if (!draft) return;
    if (!draft.title.trim()) {
      flash('error', 'Enter a video title.');
      return;
    }
    if (!draft.videoUrl) {
      flash('error', 'Upload a video file (needed for autoplay).');
      return;
    }
    if (draft.instagramUrl && !isInstagramUrl(draft.instagramUrl)) {
      flash('error', 'Instagram link is invalid.');
      return;
    }
    if (!draft.productPath?.startsWith('/shop/')) {
      flash('error', 'Select a product for Buy Now.');
      return;
    }

    setFloatingVideos((prev) => {
      const exists = prev.some((v) => v.id === draft.id);
      if (exists) return prev.map((v) => (v.id === draft.id ? draft : v));
      return [...prev, draft];
    });
    setVideoModal(null);
    flash('success', 'Video saved in draft. Click Publish to go live.');
  };

  const saveStatusModal = () => {
    const draft = statusModal?.draft;
    if (!draft) return;
    if (!draft.title.trim()) {
      flash('error', 'Enter a short status name (shown under the circle).');
      return;
    }
    if (!draft.mediaUrl) {
      flash('error', 'Upload a photo or video for the status ring.');
      return;
    }

    const nextDraft = {
      ...draft,
      text: draft.text || draft.title,
      durationDays: Math.min(7, Math.max(1, Number(draft.durationDays) || 1)),
      isExpired: false,
    };

    setWhatsappStatuses((prev) => {
      const exists = prev.some((s) => s.id === nextDraft.id);
      if (exists) return prev.map((s) => (s.id === nextDraft.id ? nextDraft : s));
      return [...prev, nextDraft];
    });
    setStatusModal(null);
    flash('success', 'Status saved in draft. Click Publish to go live on the store.');
  };

  const removeVideo = (id) => {
    if (!window.confirm('Remove this floating video?')) return;
    setFloatingVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const removeStatus = (id) => {
    if (!window.confirm('Remove this WhatsApp status?')) return;
    setWhatsappStatuses((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleVideoActive = (id) => {
    setFloatingVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: v.active === false } : v))
    );
  };

  const toggleStatusActive = (id) => {
    setWhatsappStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: s.active === false } : s))
    );
  };

  const republishStatus = (id) => {
    setWhatsappStatuses((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, resetTimer: true, active: true, isExpired: false }
          : s
      )
    );
    flash('success', 'Timer will restart on Publish (fresh duration from now).');
  };

  const publish = async () => {
    setSaving(true);
    try {
      const activeVideos = floatingVideos.filter((v) => v.videoUrl?.trim() || v.title?.trim());
      const res = await api.put('/admin/marketing', {
        floatingVideos: activeVideos,
        whatsappStatuses,
      });
      const settings = res.data.settings || {};
      setFloatingVideos(settings.floatingVideos || []);
      const now = new Date();
      setWhatsappStatuses(
        (settings.whatsappStatuses || []).map((s) => ({
          ...s,
          isExpired: !(s.active !== false && s.mediaUrl && s.expiresAt && new Date(s.expiresAt) > now),
          resetTimer: false,
        }))
      );
      flash('success', 'Published! Open the storefront to see live statuses and videos.');
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to publish settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mkt-page__loading">Loading marketing module…</div>;
  }

  const sortedVideos = [...floatingVideos].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const sortedStatuses = [...whatsappStatuses].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="mkt-page">
      <header className="mkt-page__header">
        <div>
          <p className="mkt-page__eyebrow">Client testing ready</p>
          <h1>Marketing Studio</h1>
          <p className="mkt-page__sub">
            Manage WhatsApp-style status rings (photo/video + expiry) and floating shoppable videos.
            Changes go live only after you click Publish.
          </p>
        </div>
        <div className="mkt-page__header-actions">
          <a className="mkt-btn mkt-btn--ghost" href="/" target="_blank" rel="noreferrer">
            Preview store
          </a>
          <button type="button" className="mkt-btn mkt-btn--primary" onClick={publish} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish Changes'}
          </button>
        </div>
      </header>

      {notice.text && (
        <div className={`mkt-toast mkt-toast--${notice.type}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="mkt-guide">
        <div>
          <strong>How status works</strong>
          <p>Upload a photo or video → it shows as a round ring on top of the store → expires after the days you set (default 1).</p>
        </div>
        <div>
          <strong>How floating video works</strong>
          <p>Upload an mp4, link a product, publish. Shoppers tap the bubble for full video + Buy Now.</p>
        </div>
        <div>
          <strong>Testing tip</strong>
          <p>Use 1-day expiry for real campaigns. For demos, set 2–7 days so the client can review longer.</p>
        </div>
      </div>

      <div className="mkt-stats">
        <div className="mkt-stat">
          <span>Live statuses</span>
          <strong>{liveStatuses.length}</strong>
        </div>
        <div className="mkt-stat">
          <span>All statuses</span>
          <strong>{whatsappStatuses.length}</strong>
        </div>
        <div className="mkt-stat">
          <span>Floating videos</span>
          <strong>{floatingVideos.filter((v) => v.active !== false).length}</strong>
        </div>
        <div className="mkt-stat">
          <span>Products</span>
          <strong>{products.length}</strong>
        </div>
      </div>

      <div className="mkt-tabs">
        <button
          type="button"
          className={`mkt-tabs__btn${tab === 'statuses' ? ' is-active' : ''}`}
          onClick={() => setTab('statuses')}
        >
          WhatsApp Status Rings
        </button>
        <button
          type="button"
          className={`mkt-tabs__btn${tab === 'videos' ? ' is-active' : ''}`}
          onClick={() => setTab('videos')}
        >
          Floating Videos
        </button>
      </div>

      {tab === 'statuses' && (
        <section className="mkt-panel">
          <div className="mkt-panel__head">
            <div>
              <h2>WhatsApp Status Rings</h2>
              <p>Round photo/video stories at the top of the storefront — like WhatsApp status.</p>
            </div>
            <button type="button" className="mkt-btn mkt-btn--ghost" onClick={openNewStatus}>
              + Add Status
            </button>
          </div>

          {liveStatuses.length > 0 && (
            <div className="mkt-preview-row" aria-label="Storefront preview">
              <p className="mkt-preview-row__label">Live preview (storefront rings)</p>
              <div className="mkt-preview-row__rings">
                {liveStatuses.map((s) => (
                  <div key={s.id} className="mkt-preview-ring">
                    <span className="mkt-preview-ring__halo">
                      <span className="mkt-preview-ring__media">
                        {s.mediaType === 'video' ? (
                          <video src={mediaUrl(s.mediaUrl)} muted playsInline />
                        ) : (
                          <img src={mediaUrl(s.mediaUrl)} alt="" />
                        )}
                      </span>
                    </span>
                    <span>{s.title || 'Update'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedStatuses.length === 0 ? (
            <EmptyState
              title="No status rings yet"
              text="Add a photo or video status. It appears as a circle on top of the website."
              actionLabel="Add first status"
              onAction={openNewStatus}
            />
          ) : (
            <div className="mkt-status-cards">
              {sortedStatuses.map((status) => {
                const expired = status.isExpired || (status.expiresAt && new Date(status.expiresAt) <= new Date());
                return (
                  <article
                    key={status.id}
                    className={`mkt-status-card${status.active === false || expired ? ' is-off' : ''}`}
                  >
                    <div className="mkt-status-card__thumb">
                      {status.mediaUrl ? (
                        status.mediaType === 'video' ? (
                          <video src={mediaUrl(status.mediaUrl)} muted playsInline />
                        ) : (
                          <img src={mediaUrl(status.mediaUrl)} alt="" />
                        )
                      ) : (
                        <div className="mkt-status-card__empty">No media</div>
                      )}
                      <span className="mkt-status-card__type">
                        {status.mediaType === 'video' ? 'Video' : 'Photo'}
                      </span>
                    </div>
                    <div className="mkt-status-card__body">
                      <div className="mkt-status-card__top">
                        <h3>{status.title || 'Untitled'}</h3>
                        <span
                          className={`mkt-badge${
                            expired ? ' mkt-badge--warn' : status.active === false ? ' mkt-badge--muted' : ''
                          }`}
                        >
                          {expired ? 'Expired' : status.active === false ? 'Inactive' : 'Live'}
                        </span>
                      </div>
                      <p>
                        Shows for <strong>{status.durationDays || 1} day{(status.durationDays || 1) > 1 ? 's' : ''}</strong>
                        {' · '}
                        {formatExpiry(status)}
                      </p>
                      {status.text && status.text !== status.title && <p className="mkt-status-card__caption">{status.text}</p>}
                      <div className="mkt-status-card__actions">
                        <button type="button" className="mkt-btn mkt-btn--sm" onClick={() => openEditStatus(status)}>
                          Edit
                        </button>
                        <button type="button" className="mkt-btn mkt-btn--sm" onClick={() => toggleStatusActive(status.id)}>
                          {status.active === false ? 'Activate' : 'Deactivate'}
                        </button>
                        {(expired || status.resetTimer) && (
                          <button type="button" className="mkt-btn mkt-btn--sm" onClick={() => republishStatus(status.id)}>
                            Restart timer
                          </button>
                        )}
                        <button
                          type="button"
                          className="mkt-btn mkt-btn--sm mkt-btn--danger"
                          onClick={() => removeStatus(status.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'videos' && (
        <section className="mkt-panel">
          <div className="mkt-panel__head">
            <div>
              <h2>Floating Autoplay Video</h2>
              <p>Upload mp4 → assign product → shoppers tap for full video + Buy Now.</p>
            </div>
            <button type="button" className="mkt-btn mkt-btn--ghost" onClick={openNewVideo}>
              + Add Video
            </button>
          </div>

          {sortedVideos.length === 0 ? (
            <EmptyState
              title="No floating videos yet"
              text="Add a short vertical video and link it to a product."
              actionLabel="Add first video"
              onAction={openNewVideo}
            />
          ) : (
            <div className="mkt-video-grid">
              {sortedVideos.map((video) => (
                <article key={video.id} className={`mkt-video-card${video.active === false ? ' is-off' : ''}`}>
                  <div className="mkt-video-card__media">
                    {video.videoUrl ? (
                      <video src={mediaUrl(video.videoUrl)} muted autoPlay loop playsInline />
                    ) : (
                      <div className="mkt-video-card__placeholder">No video</div>
                    )}
                    <span className={`mkt-badge${video.active === false ? ' mkt-badge--muted' : ''}`}>
                      {video.active === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <div className="mkt-video-card__body">
                    <h3>{video.title || 'Untitled video'}</h3>
                    <p className="mkt-video-card__meta">
                      {video.productName || 'No product'} · Sort {video.sortOrder || 1}
                    </p>
                    {video.productPath?.startsWith('/shop/') && (
                      <p className="mkt-video-card__path">{video.productPath}</p>
                    )}
                    <div className="mkt-video-card__actions">
                      <button type="button" className="mkt-btn mkt-btn--sm" onClick={() => openEditVideo(video)}>
                        Edit
                      </button>
                      <button type="button" className="mkt-btn mkt-btn--sm" onClick={() => toggleVideoActive(video.id)}>
                        {video.active === false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        type="button"
                        className="mkt-btn mkt-btn--sm mkt-btn--danger"
                        onClick={() => removeVideo(video.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {videoModal && (
        <Modal
          title={videoModal.mode === 'create' ? 'Add floating video' : 'Edit floating video'}
          onClose={() => setVideoModal(null)}
          onSave={saveVideoModal}
          saveLabel={videoModal.mode === 'create' ? 'Add Video' : 'Update Video'}
        >
          <div className="mkt-modal__grid">
            <label className="mkt-field">
              <span>Title</span>
              <input
                value={videoModal.draft.title}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, title: e.target.value } } : prev
                  )
                }
                placeholder="e.g. Thala Edition"
              />
            </label>

            <label className="mkt-field">
              <span>Video file (mp4 / mov, max 50MB)</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                disabled={uploadingVideo}
                onChange={(e) => uploadVideoFile(e.target.files?.[0])}
              />
              {uploadingVideo && <em className="mkt-field__hint">Uploading…</em>}
              {videoModal.draft.videoUrl && (
                <em className="mkt-field__hint mkt-field__hint--ok">
                  ✓ {videoModal.draft.videoUrl.split('/').pop()}
                </em>
              )}
              <em className="mkt-field__hint">Tip: compress long phone videos before upload.</em>
            </label>

            <label className="mkt-field">
              <span>Instagram URL (optional)</span>
              <input
                value={videoModal.draft.instagramUrl || ''}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, instagramUrl: e.target.value } } : prev
                  )
                }
                placeholder="https://www.instagram.com/reel/XXXXX/"
              />
            </label>

            <label className="mkt-field">
              <span>Product (Buy Now)</span>
              <select
                value={videoModal.draft.productId || ''}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: applyProductToDraft(prev.draft, e.target.value) } : prev
                  )
                }
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{Number(p.price || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
              {videoModal.draft.productPath?.startsWith('/shop/') && (
                <em className="mkt-field__hint">Path: {videoModal.draft.productPath}</em>
              )}
              {!products.length && (
                <em className="mkt-field__hint mkt-field__hint--warn">Add products in Inventory first.</em>
              )}
            </label>

            <label className="mkt-field">
              <span>Sort order</span>
              <input
                type="number"
                min={1}
                value={videoModal.draft.sortOrder}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev
                      ? { ...prev, draft: { ...prev.draft, sortOrder: Number(e.target.value) || 1 } }
                      : prev
                  )
                }
              />
            </label>

            <label className="mkt-check">
              <input
                type="checkbox"
                checked={videoModal.draft.active !== false}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, active: e.target.checked } } : prev
                  )
                }
              />
              Active on storefront
            </label>
          </div>

          {videoModal.draft.videoUrl && (
            <div className="mkt-modal__preview">
              <p>Preview</p>
              <video src={mediaUrl(videoModal.draft.videoUrl)} muted autoPlay loop playsInline />
            </div>
          )}
        </Modal>
      )}

      {statusModal && (
        <Modal
          title={statusModal.mode === 'create' ? 'Add status ring' : 'Edit status ring'}
          onClose={() => setStatusModal(null)}
          onSave={saveStatusModal}
          saveLabel={statusModal.mode === 'create' ? 'Add Status' : 'Update Status'}
        >
          <div className="mkt-modal__grid">
            <label className="mkt-field">
              <span>Name under circle</span>
              <input
                value={statusModal.draft.title}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, title: e.target.value } } : prev
                  )
                }
                placeholder="New bat / Offer / Sale"
              />
            </label>

            <label className="mkt-field">
              <span>How many days to show</span>
              <select
                value={statusModal.draft.durationDays || 1}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          draft: {
                            ...prev.draft,
                            durationDays: Number(e.target.value) || 1,
                            resetTimer: true,
                          },
                        }
                      : prev
                  )
                }
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <em className="mkt-field__hint">Default is 1 day. Max 7 days. Timer starts on Publish / media change.</em>
            </label>

            <label className="mkt-field mkt-field--full">
              <span>Photo or video</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
                disabled={uploadingStatus}
                onChange={(e) => uploadStatusMedia(e.target.files?.[0])}
              />
              {uploadingStatus && <em className="mkt-field__hint">Uploading…</em>}
              {statusModal.draft.mediaUrl && (
                <em className="mkt-field__hint mkt-field__hint--ok">
                  ✓ {statusModal.draft.mediaType} · {statusModal.draft.mediaUrl.split('/').pop()}
                </em>
              )}
            </label>

            <label className="mkt-field mkt-field--full">
              <span>Caption (optional)</span>
              <input
                value={statusModal.draft.text}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, text: e.target.value } } : prev
                  )
                }
                placeholder="Shown inside the full-screen viewer"
              />
            </label>

            <label className="mkt-field">
              <span>WhatsApp CTA text</span>
              <input
                value={statusModal.draft.ctaText}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, ctaText: e.target.value } } : prev
                  )
                }
                placeholder="Message us"
              />
            </label>

            <label className="mkt-field">
              <span>Sort order</span>
              <input
                type="number"
                min={1}
                value={statusModal.draft.sortOrder}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev
                      ? { ...prev, draft: { ...prev.draft, sortOrder: Number(e.target.value) || 1 } }
                      : prev
                  )
                }
              />
            </label>

            <label className="mkt-field mkt-field--full">
              <span>Prefill WhatsApp message</span>
              <textarea
                rows={2}
                value={statusModal.draft.prefillMessage}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev
                      ? { ...prev, draft: { ...prev.draft, prefillMessage: e.target.value } }
                      : prev
                  )
                }
                placeholder="Hi H2R Sports! I saw your status."
              />
            </label>

            <label className="mkt-check">
              <input
                type="checkbox"
                checked={statusModal.draft.active !== false}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, active: e.target.checked } } : prev
                  )
                }
              />
              Active on storefront
            </label>

            {statusModal.mode === 'edit' && (
              <label className="mkt-check">
                <input
                  type="checkbox"
                  checked={!!statusModal.draft.resetTimer}
                  onChange={(e) =>
                    setStatusModal((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, resetTimer: e.target.checked } } : prev
                    )
                  }
                />
                Restart expiry timer from now (on Publish)
              </label>
            )}
          </div>

          {statusModal.draft.mediaUrl && (
            <div className="mkt-modal__preview mkt-modal__preview--ring">
              <p>Ring preview</p>
              <div className="mkt-preview-ring">
                <span className="mkt-preview-ring__halo">
                  <span className="mkt-preview-ring__media">
                    {statusModal.draft.mediaType === 'video' ? (
                      <video src={mediaUrl(statusModal.draft.mediaUrl)} muted autoPlay loop playsInline />
                    ) : (
                      <img src={mediaUrl(statusModal.draft.mediaUrl)} alt="" />
                    )}
                  </span>
                </span>
                <span>{statusModal.draft.title || 'Update'}</span>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="mkt-empty">
      <div className="mkt-empty__icon" aria-hidden>
        +
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button type="button" className="mkt-btn mkt-btn--primary" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function Modal({ title, children, onClose, onSave, saveLabel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="mkt-overlay" role="presentation" onClick={onClose}>
      <div
        className="mkt-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mkt-modal__head">
          <h2>{title}</h2>
          <button type="button" className="mkt-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="mkt-modal__body">{children}</div>
        <div className="mkt-modal__foot">
          <button type="button" className="mkt-btn mkt-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="mkt-btn mkt-btn--primary" onClick={onSave}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
