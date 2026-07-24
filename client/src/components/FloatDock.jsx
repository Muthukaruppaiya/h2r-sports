import FloatingWhatsApp from './FloatingWhatsApp';
import WatchBuyVideo from './WatchBuyVideo';

/**
 * WhatsApp stays bottom-right; Watch & Buy sits above it and can be dragged freely.
 */
export default function FloatDock({ showVideo }) {
  return (
    <div
      className={`float-dock${showVideo ? '' : ' float-dock--wa-only'}`}
      aria-label="Quick actions"
    >
      {showVideo ? <WatchBuyVideo docked /> : null}
      <FloatingWhatsApp />
    </div>
  );
}
