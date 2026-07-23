import { BRAND, formatINR } from '../utils/india';

function waLink(text) {
  return `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Product buy / shopping redirect on WhatsApp */
export function buildWhatsAppOrderUrl({ product, size, weight, qty = 1, pageUrl }) {
  const total = formatINR(size.price * qty);
  const lines = [
    `Hi ${BRAND.name}!`,
    `I want to buy this bat:`,
    ``,
    `*${product.name}*`,
    `Size: ${size.label}`,
    weight?.label
      ? `Weight: ${weight.from && weight.to ? `${weight.from}g – ${weight.to}g` : weight.label}`
      : null,
    `Qty: ${qty}`,
    `Price: ${total}`,
    product.willow ? `Willow: ${product.willow}` : null,
    pageUrl ? `Link: ${pageUrl}` : null,
    ``,
    `Please confirm availability & delivery.`,
  ].filter(Boolean);

  return waLink(lines.join('\n'));
}

/** General enquiry from floating WhatsApp button */
export function buildWhatsAppEnquiryUrl(message) {
  const text =
    message ||
    `Hi ${BRAND.name}! I want to enquire about your cricket bats. Please help me choose.`;
  return waLink(text);
}
