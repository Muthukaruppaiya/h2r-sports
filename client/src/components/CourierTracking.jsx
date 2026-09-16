import { useState } from 'react';

function normalizeTrackingUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function getCourierDetails(order) {
  const courier = order?.courier || {};
  const trackingId = String(courier.trackingId || '').trim();
  if (!trackingId) return null;
  return {
    name: String(courier.name || '').trim() || 'Courier',
    trackingId,
    trackingUrl: normalizeTrackingUrl(courier.trackingUrl),
    notes: String(courier.notes || '').trim(),
  };
}

export default function CourierTracking({ order, compact = false }) {
  const [copied, setCopied] = useState(false);
  const details = getCourierDetails(order);
  if (!details) return null;

  const copyAwb = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(details.trackingId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  if (compact) {
    return (
      <span className="acct-order__ship">
        {details.name} · {details.trackingId}
      </span>
    );
  }

  return (
    <div className="acct-courier">
      <p className="acct-courier__kicker">Shipment tracking</p>
      <strong>{details.name}</strong>
      <p>
        Tracking / AWB: <span className="acct-courier__awb">{details.trackingId}</span>
      </p>
      {details.notes ? <p className="acct-courier__notes">{details.notes}</p> : null}
      <div className="acct-courier__actions">
        <button type="button" className="acct-link-btn" onClick={copyAwb}>
          {copied ? 'Copied' : 'Copy tracking ID'}
        </button>
        {details.trackingUrl ? (
          <a href={details.trackingUrl} target="_blank" rel="noreferrer">
            Track shipment →
          </a>
        ) : null}
      </div>
    </div>
  );
}
