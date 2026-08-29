import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { API, apiFetch } from '../lib/api';
import { formatPrice } from '../lib/format';
import { Field, Input, Textarea, Select, Button, ErrorText, EmptyState, Spinner, GradWord } from '../components/ui';
import RestrictedNotice, { LoginLink } from '../components/RestrictedNotice';

function getSavedShipping() {
  try { return JSON.parse(localStorage.getItem('tagg_shipping') || 'null'); } catch { return null; }
}
function saveShipping(phone, address) {
  localStorage.setItem('tagg_shipping', JSON.stringify({ phone, address }));
}

export default function CheckoutDetails({ mode: checkoutMode }) {
  // checkoutMode: 'listing' | 'cart'
  const { id: listingId } = useParams();
  const { auth, isLoggedIn, mode } = useAuth();
  const { cartIds } = useCart();
  const navigate = useNavigate();

  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ buyerName: '', buyerPhone: '', buyerAddress: '', deliveryMethod: 'delivery', pickupLocation: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || mode === 'seller') return;
    const withEffectivePrice = async (listing) => {
      let effectivePrice = Number(listing.price);
      try {
        const negotiated = await apiFetch(`${API.listings}/${listing.id}/negotiated-price/${auth.id}`);
        effectivePrice = Number(negotiated.price);
      } catch { /* none */ }
      return { ...listing, effectivePrice };
    };

    (async () => {
      try {
        if (checkoutMode === 'listing') {
          const listing = await apiFetch(`${API.listings}/${listingId}`);
          if (listing.is_sold) { setLoadError('Sorry, that listing was just sold.'); return; }
          if (String(listing.user_id) === String(auth.id)) { setLoadError("That's your own listing — you can't buy it."); return; }
          setItems([await withEffectivePrice(listing)]);
        } else {
          const results = await Promise.all(cartIds.map(async (cid) => {
            try {
              const listing = await apiFetch(`${API.listings}/${cid}`);
              if (listing.is_sold) return null;
              return await withEffectivePrice(listing);
            } catch { return null; }
          }));
          const filtered = results.filter(Boolean);
          if (filtered.length === 0) { setLoadError('EMPTY_CART'); return; }
          setItems(filtered);
        }
      } catch (err) {
        setLoadError(err.message);
      }
    })();
  }, [checkoutMode, listingId, isLoggedIn, mode, auth?.id, cartIds]);

  useEffect(() => {
    if (!auth) return;
    const saved = getSavedShipping();
    setForm((f) => ({ ...f, buyerName: auth.name || '', buyerPhone: saved?.phone || '', buyerAddress: saved?.address || '' }));
  }, [auth]);

  if (!isLoggedIn) return <RestrictedNotice>You need to <LoginLink /> before checking out.</RestrictedNotice>;
  if (mode === 'seller') {
    return (
      <RestrictedNotice>
        You're currently in selling mode. <Link to="/choose-role" className="grad-text font-semibold">Switch to buying</Link> to check out.
      </RestrictedNotice>
    );
  }
  if (loadError === 'EMPTY_CART') {
    return <div className="mx-auto max-w-2xl px-5 py-16"><EmptyState>Your cart is empty — <Link to="/cart" className="grad-text font-semibold">go back to your cart</Link>.</EmptyState></div>;
  }
  if (loadError) return <div className="mx-auto max-w-2xl px-5 py-16"><EmptyState>{loadError}</EmptyState></div>;
  if (!items) return <Spinner />;

  const total = items.reduce((sum, l) => sum + Number(l.effectivePrice), 0);
  const pickupLocations = checkoutMode === 'listing'
    ? [items[0].pickup_location_1, items[0].pickup_location_2, items[0].pickup_location_3].filter(Boolean)
    : [];
  const isPickup = pickupLocations.length > 0 && form.deliveryMethod === 'pickup';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const buyerName = form.buyerName.trim();
    const buyerPhone = form.buyerPhone.trim();
    const buyerAddress = form.buyerAddress.trim();

    if (!buyerName || !buyerPhone) { setError('Please fill in your name and phone number.'); return; }
    if (isPickup && !form.pickupLocation) { setError('Please choose a pickup spot.'); return; }
    if (!isPickup && !buyerAddress) { setError('Please fill in your delivery address.'); return; }

    setBusy(true);
    try {
      const deliveryMethod = isPickup ? 'pickup' : 'delivery';
      const body = checkoutMode === 'listing'
        ? { buyerId: auth.id, buyerName, buyerPhone, buyerAddress, deliveryMethod, pickupLocation: isPickup ? form.pickupLocation : undefined }
        : { buyerId: auth.id, listingIds: items.map((i) => i.id), buyerName, buyerPhone, buyerAddress };
      const endpoint = checkoutMode === 'listing'
        ? `${API.listings}/${listingId}/checkout`
        : `${API.listings}/checkout/cart`;

      const { url } = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
      if (!isPickup) saveShipping(buyerPhone, buyerAddress);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <div className="glass fade-up relative overflow-hidden rounded-3xl p-8">
        <div className="tag-hole" />
        <h1 className="font-display text-2xl sm:text-3xl">Delivery &amp; <GradWord>contact</GradWord> details</h1>
        <p className="mt-1 text-sm text-[var(--color-fg)]/50">The seller needs this to get your item to you — you'll go to payment right after.</p>

        <div className="mt-6 space-y-2 rounded-2xl border border-[var(--color-fg)]/[0.06] bg-[var(--color-fg)]/[0.02] p-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--color-fg)]/[0.04]">
                {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <span className="flex-1 truncate text-sm text-[var(--color-fg)]/80">{item.title}</span>
              <span className="text-sm font-semibold grad-text">{formatPrice(item.effectivePrice)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-[var(--color-fg)]/[0.06] pt-2 text-sm font-semibold">
            <span>Total</span>
            <span className="grad-text">{formatPrice(total)}</span>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <Field label="Full name">
            <Input required maxLength={120} value={form.buyerName} onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))} />
          </Field>
          <Field label="Phone number">
            <Input type="tel" required maxLength={20} placeholder="e.g. 98765 43210" value={form.buyerPhone} onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))} />
          </Field>

          {pickupLocations.length > 0 && (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!isPickup} onChange={() => setForm((f) => ({ ...f, deliveryMethod: 'delivery' }))} />
                Deliver to my location
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={isPickup} onChange={() => setForm((f) => ({ ...f, deliveryMethod: 'pickup' }))} />
                Pick up myself
              </label>
            </div>
          )}

          {!isPickup ? (
            <Field label="Delivery address">
              <Textarea rows={3} maxLength={500} placeholder="House / street, area, city, PIN code" value={form.buyerAddress} onChange={(e) => setForm((f) => ({ ...f, buyerAddress: e.target.value }))} />
            </Field>
          ) : (
            <div>
              <Field label="Pickup spot">
                <Select value={form.pickupLocation} onChange={(e) => setForm((f) => ({ ...f, pickupLocation: e.target.value }))}>
                  <option value="">Choose a spot</option>
                  {pickupLocations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                </Select>
              </Field>
              <p className="mt-2 text-xs text-[var(--color-fg)]/40">Arrange the exact pickup time with the seller.</p>
              <Link to={`/listing/${listingId}?focus=chat`} className="mt-3 block">
                <Button type="button" variant="outline" className="w-full">Message the seller</Button>
              </Link>
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Redirecting to payment…' : 'Continue to payment'}
          </Button>
          <ErrorText>{error}</ErrorText>
        </form>
      </div>
    </div>
  );
}
