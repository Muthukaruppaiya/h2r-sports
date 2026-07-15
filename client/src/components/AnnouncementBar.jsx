export default function AnnouncementBar() {
  const items = [
    '❤️ MOST LOVED CRICKET BATS — H2R SPORTS',
    '🚚 WE DELIVER ALL OVER INDIA',
    '✔️ TAMIL NADU CRICKET BATS',
    '💯 COD · UPI · CARDS',
  ];

  const line = [...items, ...items];

  return (
    <div className="announce" aria-label="Store announcements">
      <div className="announce__track">
        {line.map((text, i) => (
          <span key={`${text}-${i}`}>{text}</span>
        ))}
      </div>
    </div>
  );
}
