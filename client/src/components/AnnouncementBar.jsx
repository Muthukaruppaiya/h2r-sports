export default function AnnouncementBar({ variant = 'fixed' }) {
  const items = [
    '❤️ MOST LOVED CRICKET BATS — H2R SPORTS',
    '🚚 WE DELIVER ALL OVER INDIA',
    '✔️ FREE SHIPPING · UPI · CARDS',
    '💯 TAMIL NADU CRICKET BATS',
  ];

  const line = [...items, ...items];
  const className = variant === 'inline' ? 'announce announce--inline' : 'announce';

  return (
    <div className={className} aria-label="Store announcements">
      <div className="announce__track">
        {line.map((text, i) => (
          <span key={`${text}-${i}`}>{text}</span>
        ))}
      </div>
    </div>
  );
}
