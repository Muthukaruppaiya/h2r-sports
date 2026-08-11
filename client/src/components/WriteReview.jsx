import { useEffect, useRef, useState } from 'react';
import { api } from '../api/store';

const MAX_FILES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

/**
 * Customer review form on product pages.
 * Submits as pending → admin decides post / don't post → approved shows in home marquee.
 */
export default function WriteReview({ productId, productName }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [files, setFiles] = useState([]); // [{ file, url, type }]
  const [submitting, setSubmitting] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetMedia = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
  };

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setError('');

    const next = [...files];
    for (const file of picked) {
      if (next.length >= MAX_FILES) {
        setError(`You can add up to ${MAX_FILES} photos/clips.`);
        break;
      }
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        setError('Only photos or short video clips are allowed.');
        continue;
      }
      const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > limit) {
        setError(`${file.name} is too large. Max ${Math.round(limit / (1024 * 1024))}MB.`);
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' });
    }
    setFiles(next);
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let media = [];
      if (files.length) {
        setUploadNote('Uploading photos/clips…');
        const uploadRes = await api.uploadReviewMedia(files.map((f) => f.file));
        media = uploadRes.media || [];
      }
      setUploadNote('');

      await api.submitReview({
        name,
        location,
        text,
        rating,
        productId,
        productName,
        media,
      });
      setDone(true);
      setName('');
      setLocation('');
      setText('');
      setRating(5);
      resetMedia();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not send review');
    } finally {
      setSubmitting(false);
      setUploadNote('');
    }
  };

  if (done) {
    return (
      <section className="write-review write-review--done" aria-live="polite">
        <h2>Thank you</h2>
        <p>
          Your review for <strong>{productName}</strong> was sent to H2R Sports.
          We’ll check it and, if approved, post it in the reviews section at the bottom of the
          homepage.
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => setDone(false)}>
          Write another review
        </button>
      </section>
    );
  }

  return (
    <section className="write-review" aria-label="Write a review">
      <div className="write-review__head">
        <h2>Write a review</h2>
        <p>Rate this bat. Your review goes to H2R for approval before it appears on the site.</p>
      </div>

      <form className="write-review__form" onSubmit={submit}>
        {error ? <p className="write-review__error">{error}</p> : null}

        <div className="write-review__stars" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= (hover || rating);
            return (
              <button
                key={n}
                type="button"
                className={`write-review__star${on ? ' is-on' : ''}`}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                aria-pressed={rating === n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            );
          })}
          <span className="write-review__rating-label">{rating} / 5</span>
        </div>

        <div className="write-review__grid">
          <label>
            Your name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
              maxLength={60}
            />
          </label>
          <label>
            City (optional)
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Chennai"
              maxLength={60}
            />
          </label>
        </div>

        <label>
          Your review
          <textarea
            required
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`How does the ${productName} feel in hand? Power, balance, sweet spot…`}
            maxLength={800}
          />
        </label>

        <div className="write-review__media">
          <span className="write-review__media-label">Add photos or a short clip (optional)</span>
          <div className="write-review__media-grid">
            {files.map((f, idx) => (
              <div key={f.url} className="write-review__media-item">
                {f.type === 'video' ? (
                  <video src={f.url} muted playsInline />
                ) : (
                  <img src={f.url} alt="" />
                )}
                {f.type === 'video' ? <span className="write-review__media-badge">▶ clip</span> : null}
                <button
                  type="button"
                  className="write-review__media-remove"
                  aria-label="Remove"
                  onClick={() => removeFile(idx)}
                >
                  ×
                </button>
              </div>
            ))}
            {files.length < MAX_FILES ? (
              <button
                type="button"
                className="write-review__media-add"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="write-review__media-add-icon">＋</span>
                Add photo / clip
              </button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={onPickFiles}
          />
          <span className="write-review__media-hint">
            Up to {MAX_FILES} files · photos ≤8MB · clips ≤25MB
          </span>
        </div>

        <button type="submit" className="btn btn--primary" disabled={submitting || text.trim().length < 10}>
          {submitting ? uploadNote || 'Sending…' : 'Submit for approval'}
        </button>
      </form>
    </section>
  );
}
