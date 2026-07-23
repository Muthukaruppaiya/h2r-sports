import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: '7 days' },
];

function inferMediaType(url, mediaType) {
  if (mediaType === 'video' || mediaType === 'image') return mediaType;
  const path = String(url || '').split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return 'video';
  return 'image';
}

function isStatusExpired(status) {
  if (status?.isExpired === true) return true;
  if (status?.isExpired === false) {
    if (status.expiresAt && new Date(status.expiresAt) <= new Date()) return true;
    return false;
  }
  if (status?.expiresAt) return new Date(status.expiresAt) <= new Date();
  return false;
}

function formatExpiry(status) {
  if (!status?.expiresAt) return 'Not published';
  const end = new Date(status.expiresAt);
  const now = new Date();
  if (end <= now) return 'Expired';
  const hours = Math.max(1, Math.round((end - now) / 36e5));
  if (hours < 24) return `~${hours}h left`;
  const days = Math.ceil(hours / 24);
  return `~${days}d left`;
}

function normalizeStatuses(list = []) {
  const now = new Date();
  return list.map((s) => ({
    ...s,
    isExpired: !(s.active !== false && s.mediaUrl && s.expiresAt && new Date(s.expiresAt) > now),
    resetTimer: false,
  }));
}

function StatusMedia({ url, mediaType, className = '', autoPlay = false, loop = false }) {
  const [broken, setBroken] = useState(false);
  const src = mediaUrl(url);
  const type = inferMediaType(url, mediaType);

  useEffect(() => {
    setBroken(false);
  }, [url]);

  if (!url || broken) {
    return <div className={`mkt-media-broken ${className}`.trim()}>Re-upload</div>;
  }

  if (type === 'video') {
    return (
      <video
        className={className}
        src={src}
        muted
        playsInline
        autoPlay={autoPlay}
        loop={loop}
        preload="metadata"
        onError={() => setBroken(true)}
      />
    );
  }

  return <img className={className} src={src} alt="" onError={() => setBroken(true)} />;
}

export default function Marketing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = tabParam === 'video' || tabParam === 'videos' ? 'videos' : 'statuses';

  const setTab = (next) => {
    setSearchParams(next === 'videos' ? { tab: 'video' } : { tab: 'status' }, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floatingVideos, setFloatingVideos] = useState([]);
  const [whatsappStatuses, setWhatsappStatuses] = useState([]);
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState(false);

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
        setWhatsappStatuses(normalizeStatuses(settings.whatsappStatuses || []));
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
      flash._t = window.setTimeout(() => setNotice({ type: '', text: '' }), 4000);
    }
  };

  const liveStatuses = useMemo(
    () =>
      whatsappStatuses.filter(
        (s) => s.active !== false && s.mediaUrl && !isStatusExpired(s)
      ),
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
      flash('error', 'Video too large (max 50MB).');
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
      flash('error', 'File too large (max 50MB).');
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
      flash('success', 'Media uploaded.');
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
      flash('error', 'Upload a video file.');
      return;
    }
    if (draft.instagramUrl && !isInstagramUrl(draft.instagramUrl)) {
      flash('error', 'Instagram link is invalid.');
      return;
    }
    if (!draft.productPath?.startsWith('/shop/')) {
      flash('error', 'Select a product.');
      return;
    }

    setFloatingVideos((prev) => {
      const exists = prev.some((v) => v.id === draft.id);
      if (exists) return prev.map((v) => (v.id === draft.id ? draft : v));
      return [...prev, draft];
    });
    setVideoModal(null);
    flash('success', 'Saved — click Publish to go live.');
  };

  const saveStatusModal = () => {
    const draft = statusModal?.draft;
    if (!draft) return;
    if (!draft.title.trim()) {
      flash('error', 'Enter a status name.');
      return;
    }
    if (!draft.mediaUrl) {
      flash('error', 'Upload a photo or video.');
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
    flash('success', 'Saved — click Publish to go live.');
  };

  const removeVideo = (id) => {
    if (!window.confirm('Remove this video?')) return;
    setFloatingVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const removeStatus = (id) => {
    if (!window.confirm('Remove this status?')) return;
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
        s.id === id ? { ...s, resetTimer: true, active: true, isExpired: false } : s
      )
    );
    flash('success', 'Timer will restart on Publish.');
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
      setWhatsappStatuses(normalizeStatuses(settings.whatsappStatuses || []));
      flash('success', 'Published.');
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to publish.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mkt-studio adm-page">
        <div className="mkt-skeleton mkt-skeleton--hero" />
        <div className="mkt-skeleton-grid">
          <div className="mkt-skeleton" />
          <div className="mkt-skeleton" />
          <div className="mkt-skeleton" />
          <div className="mkt-skeleton" />
        </div>
        <div className="mkt-skeleton mkt-skeleton--board" />
      </div>
    );
  }

  const sortedVideos = [...floatingVideos].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const sortedStatuses = [...whatsappStatuses].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const activeVideos = floatingVideos.filter((v) => v.active !== false).length;

  return (
    <div className="mkt-studio adm-page">
      <header className="mkt-studio__hero mkt-anim">
        <div className="mkt-studio__hero-copy">
          <h1>Marketing</h1>
          <p>Status rings & shoppable videos</p>
        </div>
        <div className="mkt-studio__hero-actions mkt-studio__hero-actions--desktop">
          <a className="adm-btn adm-btn--ghost" href="/" target="_blank" rel="noreferrer">
            Open store
          </a>
          <button type="button" className="adm-btn adm-btn--primary mkt-publish" onClick={publish} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish live'}
          </button>
        </div>
      </header>

      {notice.text && (
        <div className={`mkt-toast mkt-toast--${notice.type}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="adm-kpi-grid mkt-studio__kpis">
        {[
          { label: 'Live', value: liveStatuses.length, color: '#059669', glow: 'rgba(5,150,105,0.14)' },
          { label: 'Statuses', value: whatsappStatuses.length, color: '#0f172a', glow: 'rgba(15,23,42,0.08)' },
          { label: 'Videos', value: activeVideos, color: '#2563eb', glow: 'rgba(37,99,235,0.14)' },
          { label: 'Products', value: products.length, color: '#b45309', glow: 'rgba(180,83,9,0.12)' },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className="adm-kpi mkt-anim"
            style={{
              '--kpi-color': kpi.color,
              '--kpi-glow': kpi.glow,
              animationDelay: `${0.04 + i * 0.05}s`,
            }}
          >
            <div className="adm-kpi__label">{kpi.label}</div>
            <div className="adm-kpi__value">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="mkt-seg mkt-anim" style={{ animationDelay: '0.12s' }} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'statuses'}
          className={`mkt-seg__btn${tab === 'statuses' ? ' is-active' : ''}`}
          onClick={() => setTab('statuses')}
        >
          Status rings
          <em>{whatsappStatuses.length}</em>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'videos'}
          className={`mkt-seg__btn${tab === 'videos' ? ' is-active' : ''}`}
          onClick={() => setTab('videos')}
        >
          Floating videos
          <em>{floatingVideos.length}</em>
        </button>
      </div>

      {tab === 'statuses' && (
        <section className="mkt-board mkt-board--enter" key="statuses">
          <div className="mkt-board__bar">
            <div>
              <h2>Status rings</h2>
              <span>{liveStatuses.length} live on store</span>
            </div>
            <button type="button" className="adm-btn adm-btn--primary" onClick={openNewStatus}>
              + New status
            </button>
          </div>

          <div className="mkt-stage">
            <div className="mkt-stage__label">Storefront preview</div>
            {liveStatuses.length === 0 ? (
              <div className="mkt-stage__empty">No live rings yet</div>
            ) : (
              <div className="mkt-stage__rings">
                {liveStatuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="mkt-ring"
                    onClick={() => openEditStatus(s)}
                  >
                    <span className="mkt-ring__halo">
                      <span className="mkt-ring__media">
                        <StatusMedia url={s.mediaUrl} mediaType={s.mediaType} />
                      </span>
                    </span>
                    <span className="mkt-ring__name">{s.title || 'Update'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {sortedStatuses.length === 0 ? (
            <EmptyState title="Create your first status ring" actionLabel="Add status" onAction={openNewStatus} />
          ) : (
            <div className="mkt-gallery">
              {sortedStatuses.map((status, index) => {
                const expired = isStatusExpired(status);
                const type = inferMediaType(status.mediaUrl, status.mediaType);
                const state = expired ? 'expired' : status.active === false ? 'off' : 'live';
                return (
                  <article
                    key={status.id}
                    className={`mkt-tile mkt-tile--status is-${state} mkt-anim`}
                    style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                  >
                    <button type="button" className="mkt-tile__media" onClick={() => openEditStatus(status)}>
                      <StatusMedia url={status.mediaUrl} mediaType={status.mediaType} />
                      <span className="mkt-tile__ring-overlay" aria-hidden>
                        <span />
                      </span>
                      <span className={`mkt-chip mkt-chip--${state}`}>
                        {state === 'live' ? 'Live' : state === 'expired' ? 'Expired' : 'Off'}
                      </span>
                      <span className="mkt-chip mkt-chip--type">{type === 'video' ? 'Video' : 'Photo'}</span>
                    </button>
                    <div className="mkt-tile__body">
                      <h3>{status.title || 'Untitled'}</h3>
                      <p>
                        {status.durationDays || 1}d · {formatExpiry(status)}
                        {status.resetTimer ? ' · restart queued' : ''}
                      </p>
                      <div className="mkt-tile__actions">
                        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openEditStatus(status)}>
                          Edit
                        </button>
                        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => toggleStatusActive(status.id)}>
                          {status.active === false ? 'Activate' : 'Pause'}
                        </button>
                        {(expired || status.resetTimer) && (
                          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => republishStatus(status.id)}>
                            Restart
                          </button>
                        )}
                        <button type="button" className="adm-btn adm-btn--danger" onClick={() => removeStatus(status.id)}>
                          Delete
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
        <section className="mkt-board mkt-board--enter" key="videos">
          <div className="mkt-board__bar">
            <div>
              <h2>Floating videos</h2>
              <span>{activeVideos} active on store</span>
            </div>
            <button type="button" className="adm-btn adm-btn--primary" onClick={openNewVideo}>
              + New video
            </button>
          </div>

          {sortedVideos.length === 0 ? (
            <EmptyState title="Add a shoppable floating video" actionLabel="Add video" onAction={openNewVideo} />
          ) : (
            <div className="mkt-phone-grid">
              {sortedVideos.map((video, index) => (
                <article
                  key={video.id}
                  className={`mkt-phone${video.active === false ? ' is-off' : ''} mkt-anim`}
                  style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
                >
                  <button type="button" className="mkt-phone__screen" onClick={() => openEditVideo(video)}>
                    {video.videoUrl ? (
                      <StatusMedia url={video.videoUrl} mediaType="video" autoPlay loop />
                    ) : (
                      <div className="mkt-media-broken">Upload video</div>
                    )}
                    <div className="mkt-phone__shade" />
                    <span className={`mkt-chip mkt-chip--${video.active === false ? 'off' : 'live'}`}>
                      {video.active === false ? 'Off' : 'Live'}
                    </span>
                    <div className="mkt-phone__caption">
                      <strong>{video.title || 'Untitled'}</strong>
                      <span>{video.productName || 'No product'}</span>
                    </div>
                  </button>
                  <div className="mkt-phone__actions">
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openEditVideo(video)}>
                      Edit
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => toggleVideoActive(video.id)}>
                      {video.active === false ? 'Activate' : 'Pause'}
                    </button>
                    <button type="button" className="adm-btn adm-btn--danger" onClick={() => removeVideo(video.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mkt-mobile-bar" aria-label="Quick actions">
        <a className="adm-btn adm-btn--ghost" href="/" target="_blank" rel="noreferrer">
          Store
        </a>
        <button
          type="button"
          className="adm-btn adm-btn--ghost"
          onClick={tab === 'statuses' ? openNewStatus : openNewVideo}
        >
          {tab === 'statuses' ? '+ Status' : '+ Video'}
        </button>
        <button type="button" className="adm-btn adm-btn--primary" onClick={publish} disabled={saving}>
          {saving ? '…' : 'Publish'}
        </button>
      </div>

      {videoModal && (
        <StudioDrawer
          title={videoModal.mode === 'create' ? 'New floating video' : 'Edit floating video'}
          onClose={() => setVideoModal(null)}
          onSave={saveVideoModal}
          saveLabel={videoModal.mode === 'create' ? 'Save video' : 'Update video'}
          preview={
            <div className="mkt-drawer-preview mkt-drawer-preview--phone">
              {videoModal.draft.videoUrl ? (
                <video src={mediaUrl(videoModal.draft.videoUrl)} muted autoPlay loop playsInline />
              ) : (
                <div className="mkt-drawer-preview__empty">Upload to preview</div>
              )}
              <div className="mkt-drawer-preview__meta">
                <strong>{videoModal.draft.title || 'Title'}</strong>
                <span>{videoModal.draft.productName || 'Select product'}</span>
              </div>
            </div>
          }
        >
          <div className="adm-form-grid">
            <div className="adm-field adm-field--full">
              <label>Title</label>
              <input
                value={videoModal.draft.title}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, title: e.target.value } } : prev
                  )
                }
                placeholder="Thala Edition"
              />
            </div>
            <div className="adm-field adm-field--full">
              <label>Video file</label>
              <label className={`mkt-upload${uploadingVideo ? ' is-busy' : ''}`}>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  disabled={uploadingVideo}
                  onChange={(e) => uploadVideoFile(e.target.files?.[0])}
                />
                <strong>{uploadingVideo ? 'Uploading…' : videoModal.draft.videoUrl ? 'Replace video' : 'Choose video'}</strong>
                <span>MP4 / MOV · max 50MB</span>
              </label>
            </div>
            <div className="adm-field adm-field--full">
              <label>Product</label>
              <select
                value={videoModal.draft.productId || ''}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: applyProductToDraft(prev.draft, e.target.value) } : prev
                  )
                }
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{Number(p.price || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label>Instagram URL</label>
              <input
                value={videoModal.draft.instagramUrl || ''}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, instagramUrl: e.target.value } } : prev
                  )
                }
                placeholder="Optional"
              />
            </div>
            <div className="adm-field">
              <label>Sort</label>
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
            </div>
            <label className="mkt-switch adm-field--full">
              <input
                type="checkbox"
                checked={videoModal.draft.active !== false}
                onChange={(e) =>
                  setVideoModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, active: e.target.checked } } : prev
                  )
                }
              />
              <span>Show on storefront</span>
            </label>
          </div>
        </StudioDrawer>
      )}

      {statusModal && (
        <StudioDrawer
          title={statusModal.mode === 'create' ? 'New status ring' : 'Edit status ring'}
          onClose={() => setStatusModal(null)}
          onSave={saveStatusModal}
          saveLabel={statusModal.mode === 'create' ? 'Save status' : 'Update status'}
          preview={
            <div className="mkt-drawer-preview mkt-drawer-preview--ring">
              <div className="mkt-ring mkt-ring--lg">
                <span className="mkt-ring__halo">
                  <span className="mkt-ring__media">
                    {statusModal.draft.mediaUrl ? (
                      <StatusMedia
                        url={statusModal.draft.mediaUrl}
                        mediaType={statusModal.draft.mediaType}
                        autoPlay={inferMediaType(statusModal.draft.mediaUrl, statusModal.draft.mediaType) === 'video'}
                        loop
                      />
                    ) : (
                      <div className="mkt-media-broken">Media</div>
                    )}
                  </span>
                </span>
                <span className="mkt-ring__name">{statusModal.draft.title || 'Name'}</span>
              </div>
            </div>
          }
        >
          <div className="adm-form-grid">
            <div className="adm-field">
              <label>Name</label>
              <input
                value={statusModal.draft.title}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, title: e.target.value } } : prev
                  )
                }
                placeholder="New arrival"
              />
            </div>
            <div className="adm-field">
              <label>Duration</label>
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
            </div>
            <div className="adm-field adm-field--full">
              <label>Photo or video</label>
              <label className={`mkt-upload${uploadingStatus ? ' is-busy' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
                  disabled={uploadingStatus}
                  onChange={(e) => uploadStatusMedia(e.target.files?.[0])}
                />
                <strong>
                  {uploadingStatus
                    ? 'Uploading…'
                    : statusModal.draft.mediaUrl
                      ? 'Replace media'
                      : 'Choose photo / video'}
                </strong>
                <span>JPG, PNG, WEBP, MP4 · max 50MB</span>
              </label>
            </div>
            <div className="adm-field adm-field--full">
              <label>Caption</label>
              <input
                value={statusModal.draft.text}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, text: e.target.value } } : prev
                  )
                }
                placeholder="Optional"
              />
            </div>
            <div className="adm-field">
              <label>WhatsApp CTA</label>
              <input
                value={statusModal.draft.ctaText}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, ctaText: e.target.value } } : prev
                  )
                }
                placeholder="Message us"
              />
            </div>
            <div className="adm-field">
              <label>Sort</label>
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
            </div>
            <div className="adm-field adm-field--full">
              <label>WhatsApp prefill</label>
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
                placeholder="Hi H2R Sports!"
              />
            </div>
            <label className="mkt-switch adm-field--full">
              <input
                type="checkbox"
                checked={statusModal.draft.active !== false}
                onChange={(e) =>
                  setStatusModal((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, active: e.target.checked } } : prev
                  )
                }
              />
              <span>Show on storefront</span>
            </label>
            {statusModal.mode === 'edit' && (
              <label className="mkt-switch adm-field--full">
                <input
                  type="checkbox"
                  checked={!!statusModal.draft.resetTimer}
                  onChange={(e) =>
                    setStatusModal((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, resetTimer: e.target.checked } } : prev
                    )
                  }
                />
                <span>Restart timer on Publish</span>
              </label>
            )}
          </div>
        </StudioDrawer>
      )}
    </div>
  );
}

function EmptyState({ title, actionLabel, onAction }) {
  return (
    <div className="mkt-empty">
      <div className="mkt-empty__visual" aria-hidden />
      <h3>{title}</h3>
      <button type="button" className="adm-btn adm-btn--primary" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function StudioDrawer({ title, children, onClose, onSave, saveLabel, preview }) {
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
    <div className="adm-drawer-backdrop mkt-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="adm-drawer mkt-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mkt-drawer__handle" aria-hidden />
        <div className="adm-drawer__head">
          <strong>{title}</strong>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mkt-drawer__layout">
          <div className="mkt-drawer__preview-pane">{preview}</div>
          <div className="mkt-drawer__form-pane">
            {children}
            <div className="mkt-drawer__foot">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={onSave}>
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
