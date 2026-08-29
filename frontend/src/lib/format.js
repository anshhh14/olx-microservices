export function formatPrice(price) {
  const n = Number(price);
  return '₹' + (Number.isFinite(n) ? n.toLocaleString('en-IN') : price);
}

export function isNewListing(listing) {
  if (!listing.created_at) return false;
  const ageMs = Date.now() - new Date(listing.created_at).getTime();
  return ageMs >= 0 && ageMs <= 1000 * 60 * 60 * 48; // 48 hours
}

export const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'books', label: 'Books' },
  { value: 'other', label: 'Other' },
];
