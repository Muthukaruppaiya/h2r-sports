/** H2R Sports — Tamil Nadu cricket bats (@h2r_sports_) */
export const BRAND = {
  name: 'H2R Sports',
  shortName: 'H2R',
  tagline: 'Tamil Nadu Cricket Bats',
  instagram: 'https://www.instagram.com/h2r_sports_/',
  instagramHandle: '@h2r_sports_',
  logo: '/h2r-crest.png',
  phone: '+91 93618 13878',
  email: 'orders@h2rsports.in',
  whatsapp: '919361813878',
  address: 'Tamil Nadu, India',
  facebook: 'https://www.facebook.com/',
  youtube: 'https://www.youtube.com/',
  social: {
    instagram: 'https://www.instagram.com/h2r_sports_/',
    facebook: 'https://www.facebook.com/',
    youtube: 'https://www.youtube.com/',
  },
  currency: 'INR',
  gstNote: 'Inclusive of GST',
  shippingNote: 'All India Free Shipping',
  returnsNote: '6 months handle warranty · Prepaid orders',
};

export function formatINR(amount) {
  const value = Number(amount) || 0;
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function savePercent(price, compareAt) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/** @deprecated use BRAND */
export const INDIA = {
  currency: 'INR',
  currencySymbol: '₹',
  country: 'India',
  gstNote: BRAND.gstNote,
  freeShippingAbove: 0,
  shippingNote: BRAND.shippingNote,
  returnsNote: BRAND.returnsNote,
  supportPhone: BRAND.phone,
  supportEmail: BRAND.email,
  address: BRAND.address,
  checkoutUrl: '/checkout',
};
