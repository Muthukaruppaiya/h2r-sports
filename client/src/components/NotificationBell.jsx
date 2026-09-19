import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 56, right: 16 });
  const btnRef = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get('/admin/notifications?limit=20');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      /* silent — bell is a convenience, not critical path */
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(380, window.innerWidth - 16);
      let right = window.innerWidth - r.right;
      if (right + width > window.innerWidth - 8) {
        right = 8;
      }
      setPanelPos({
        top: Math.min(r.bottom + 8, window.innerHeight - 120),
        right: Math.max(8, right),
        width,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await api.put('/admin/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const openNotification = async (n) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      api.put(`/admin/notifications/${n._id}/read`, {}).catch(() => {});
    }
    setOpen(false);
    if (n.orderId) {
      navigate(`/admin/orders?highlight=${encodeURIComponent(n.orderId)}`);
    }
  };

  const panel = open
    ? createPortal(
        <>
          <button
            type="button"
            className="notif-backdrop"
            aria-label="Close notifications"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            className="notif-panel"
            role="dialog"
            aria-label="Notifications"
            style={{ top: panelPos.top, right: panelPos.right, width: panelPos.width }}
          >
            <div className="notif-panel__head">
              <strong>Notifications</strong>
              <button
                type="button"
                className="notif-panel__mark"
                onClick={markAllRead}
                disabled={loading || unreadCount === 0}
              >
                Mark all read
              </button>
            </div>
            <div className="notif-panel__list">
              {notifications.length === 0 ? (
                <div className="notif-panel__empty">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <button
                    type="button"
                    key={n._id}
                    className={`notif-item${n.read ? '' : ' is-unread'}`}
                    onClick={() => openNotification(n)}
                  >
                    <span className="notif-item__dot" aria-hidden="true" />
                    <span className="notif-item__body">
                      <span className="notif-item__title">{n.title}</span>
                      <span className="notif-item__msg">{n.message}</span>
                      <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="notif-bell">
      <button
        type="button"
        ref={btnRef}
        className="notif-bell__btn"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell__dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {panel}
    </div>
  );
}
