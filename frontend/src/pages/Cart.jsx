import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { API, apiFetch } from '../lib/api';
import { formatPrice } from '../lib/format';
import { PageHeader, Button, EmptyState, Spinner, GradWord } from '../components/ui';
import RestrictedNotice, { LoginLink } from '../components/RestrictedNotice';

function CartRow({ listing, forWishlist, onChanged }) {
  const { removeFromCart, addToCart, addToWishlist, removeFromWishlist } = useCart();
  const { showToast } = useToast();
  const hasDiscount = Number(listing.effectivePrice) !== Number(listing.price);

  const move = () => {
    if (forWishlist) {
      removeFromWishlist(listing.id);
      addToCart(listing.id);
      showToast('Moved to cart');
    } else {
      removeFromCart(listing.id);
      addToWishlist(listing.id);
      showToast('Saved for later');
    }
    onChanged();
  };
  const remove = () => {
    if (forWishlist) removeFromWishlist(listing.id); else removeFromCart(listing.id);
    showToast('Removed');
    onChanged();
  };

  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-3">
      <Link to={`/listing/${listing.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--color-fg)]/[0.04]">
        {listing.image_url ? (
          <img src={listing.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] uppercase text-[var(--color-fg)]/25">No photo</div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/listing/${listing.id}`} className="block truncate font-medium text-[var(--color-fg)]/90">{listing.title}</Link>
        <div className="mt-1 flex items-center gap-2 text-sm">
          {hasDiscount && <span className="text-[var(--color-fg)]/35 line-through">{formatPrice(listing.price)}</span>}
          <span className="font-semibold grad-text">{formatPrice(listing.effectivePrice)}</span>
          {hasDiscount && <span className="rounded-full bg-[var(--color-sale)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-sale)]">Negotiated</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" onClick={move} className="!px-3 !py-1.5 text-xs">
          {forWishlist ? 'Move to cart' : 'Save for later'}
        </Button>
        <Button variant="danger" onClick={remove} className="!px-3 !py-1.5 text-xs">Remove</Button>
      </div>
    </div>
  );
}

export default function Cart() {
  const { auth, isLoggedIn, mode } = useAuth();
  const { cartIds, wishlistIds, setCartIds, setWishlistIds } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cartListings, setCartListings] = useState([]);
  const [wishlistListings, setWishlistListings] = useState([]);
  const [reloadTick, setReloadTick] = useState(0);

  const loadListings = useCallback(async (ids) => {
    const results = await Promise.all(ids.map(async (id) => {
      let listing;
      try { listing = await apiFetch(`${API.listings}/${id}`); } catch { return null; }
      if (listing.is_sold) return null;
      let effectivePrice = Number(listing.price);
      try {
        const negotiated = await apiFetch(`${API.listings}/${id}/negotiated-price/${auth.id}`);
        effectivePrice = Number(negotiated.price);
      } catch { /* no negotiated price */ }
      return { ...listing, effectivePrice };
    }));
    return results.filter(Boolean);
  }, [auth?.id]);

  useEffect(() => {
    if (!isLoggedIn || mode !== 'buyer') { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [c, w] = await Promise.all([loadListings(cartIds), loadListings(wishlistIds)]);
      if (cancelled) return;
      setCartListings(c);
      setWishlistListings(w);
      setCartIds(c.map((l) => l.id));
      setWishlistIds(w.map((l) => l.id));
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, mode, reloadTick]);

  if (!isLoggedIn) return <RestrictedNotice>You need to <LoginLink /> to see your cart.</RestrictedNotice>;
  if (mode !== 'buyer') {
    return (
      <RestrictedNotice>
        You're currently in selling mode. <Link to="/choose-role" className="grad-text font-semibold">Switch to buying</Link> to use your cart.
      </RestrictedNotice>
    );
  }
  if (loading) return <Spinner />;

  const total = cartListings.reduce((sum, l) => sum + Number(l.effectivePrice), 0);
  const onChanged = () => setReloadTick((t) => t + 1);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Buyer" title={<>Your <GradWord>cart</GradWord></>} sub="Cart on the left, saved-for-later on the right — move items between them anytime." />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-display text-lg">🛒 Cart</h2>
          {cartListings.length === 0 ? (
            <EmptyState>Your cart is empty — <Link to="/browse" className="grad-text font-semibold">browse listings</Link> to add something.</EmptyState>
          ) : (
            <>
              <div className="space-y-3">
                {cartListings.map((l) => <CartRow key={l.id} listing={l} forWishlist={false} onChanged={onChanged} />)}
              </div>
              <div className="glass mt-5 rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-[var(--color-fg)]/60">Total</span>
                  <span className="font-display text-xl grad-text">{formatPrice(total)}</span>
                </div>
                <Button className="w-full" onClick={() => navigate('/checkout-details/cart')}>Checkout with Stripe</Button>
              </div>
            </>
          )}
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg">☆ Save for later</h2>
          {wishlistListings.length === 0 ? (
            <EmptyState>Nothing saved yet — tap ☆ on a listing to keep it here for later.</EmptyState>
          ) : (
            <div className="space-y-3">
              {wishlistListings.map((l) => <CartRow key={l.id} listing={l} forWishlist onChanged={onChanged} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
