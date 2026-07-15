import { BRAND, formatINR } from '../utils/india';

export function buildWhatsAppOrderUrl({ product, size, qty = 1, pageUrl }) {
  const total = formatINR(size.price * qty);
  const lines = [
    `Hi ${BRAND.name}! 👋`,
    `I want to buy this bat:`,
    ``,
    `🏏 *${product.name}*`,
    `Size: ${size.label}`,
    `Qty: ${qty}`,
    `Price: ${total}`,
    product.willow ? `Willow: ${product.willow}` : null,
    pageUrl ? `Link: ${pageUrl}` : null,
    ``,
    `Please confirm availability & delivery.`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${BRAND.whatsapp}?text=${text}`;
}
