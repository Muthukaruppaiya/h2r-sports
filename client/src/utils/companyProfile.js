import api from '../api/client';
import { BRAND } from './india';

export const EMPTY_COMPANY = {
  name: BRAND.name,
  legalName: '',
  tagline: BRAND.tagline,
  phone: BRAND.phone,
  email: BRAND.email,
  whatsapp: BRAND.phone,
  website: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan: '',
  invoiceNote: '',
  invoiceTerms: ['', '', ''],
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
};

export const DEFAULT_INVOICE_TERMS = [
  'Prices shown on this bill are final.',
  'Check the item (size, weight and quantity) before leaving the shop.',
  'Goods once sold cannot be returned unless agreed at the counter.',
];

export function normalizeInvoiceTerms(value) {
  const list = Array.isArray(value) ? value : [];
  return [0, 1, 2].map((i) => String(list[i] || '').trim());
}

export function mergeCompany(raw = {}) {
  const next = { ...EMPTY_COMPANY };
  Object.keys(EMPTY_COMPANY).forEach((key) => {
    if (key === 'invoiceTerms') return;
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      next[key] = String(value).trim();
    }
  });
  const savedTerms = normalizeInvoiceTerms(raw.invoiceTerms);
  next.invoiceTerms = savedTerms.some(Boolean) ? savedTerms : [...DEFAULT_INVOICE_TERMS];
  if (!next.name) next.name = BRAND.name;
  if (!next.phone) next.phone = BRAND.phone;
  if (!next.whatsapp) next.whatsapp = BRAND.phone;
  if (!next.email) next.email = BRAND.email;
  if (!next.tagline) next.tagline = BRAND.tagline;
  return next;
}

export function companyHasAddress(company) {
  return Boolean(company?.line1 || company?.city || company?.pincode);
}

export function companyAddressText(company) {
  const c = mergeCompany(company);
  return [
    c.line1,
    c.line2,
    [c.city, c.state].filter(Boolean).join(', ') + (c.pincode ? ` — ${c.pincode}` : ''),
  ]
    .filter((line) => String(line).trim() && line !== ' — ')
    .join('\n');
}

export async function fetchCompany() {
  try {
    const res = await api.get('/admin/settings/store-address');
    return mergeCompany(res.data?.storeAddress || {});
  } catch {
    return mergeCompany();
  }
}
