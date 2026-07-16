import { useEffect, useState } from 'react';
import { BRAND } from '../utils/india';

function buildStatusLink(prefillMessage) {
  const text = encodeURIComponent(prefillMessage || 'Hi H2R Sports! I need help choosing a bat.');
  return `https://wa.me/${BRAND.whatsapp}?text=${text}`;
}

export default function WhatsAppStatusBar() {
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchStatuses = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/marketing/public');
        const data = await res.json();
        if (!mounted) return;
        setStatuses(data.whatsappStatuses || []);
      } catch (_err) {
        if (!mounted) return;
        setStatuses([]);
      }
    };
    fetchStatuses();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (statuses.length > 0) {
      root.classList.add('has-wa-status');
    } else {
      root.classList.remove('has-wa-status');
    }
    return () => {
      root.classList.remove('has-wa-status');
    };
  }, [statuses]);

  if (!statuses.length) return null;

  return (
    <div className="wa-status-strip" aria-label="WhatsApp status updates">
      <div className="container wa-status-strip__inner">
        {statuses.map((status) => (
          <a
            key={status.id}
            className="wa-status-pill"
            href={buildStatusLink(status.prefillMessage)}
            target="_blank"
            rel="noreferrer"
          >
            <span className="wa-status-pill__dot" />
            <span className="wa-status-pill__text">{status.text}</span>
            <span className="wa-status-pill__cta">{status.ctaText || 'Message us'}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
