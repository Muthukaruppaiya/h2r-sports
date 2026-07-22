import FloatingWhatsApp from './FloatingWhatsApp';
import WatchBuyVideo from './WatchBuyVideo';

/**
 * Stacks WhatsApp above Watch & Buy so they never overlap.
 */
export default function FloatDock({ showVideo }) {
  return (
    <div
      className={`float-dock${showVideo ? '' : ' float-dock--wa-only'}`}
      aria-label="Quick actions"
    >
      <FloatingWhatsApp />
      {showVideo ? <WatchBuyVideo docked /> : null}
    </div>
  );
}
