import { useEffect, useRef, useState } from 'react';
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
  const wrapRef = useRef(null);
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
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

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

  return (
    <div className="notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell__btn"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        onClick={toggleOpen}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell__dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
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
      )}
    </div>
  );
}
