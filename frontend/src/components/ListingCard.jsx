import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, isNewListing } from '../lib/format';
import { ImageWithFallback } from './ui';

export default function ListingCard({ listing }) {
  const { auth, mode } = useAuth();
  const { isInCart, isInWishlist, addToCart, removeFromCart, addToWishlist, removeFromWishlist } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const canQuickAct =
    auth && mode === 'buyer' && !listing.is_sold && String(auth.id) !== String(listing.user_id);

  const inCart = canQuickAct && isInCart(listing.id);
  const inWishlist = canQuickAct && isInWishlist(listing.id);

  const onCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInCart(listing.id)) {
      removeFromCart(listing.id);
      showToast('Removed from cart');
    } else {
      addToCart(listing.id);
      showToast('Added to cart');
    }
  };
  const onWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(listing.id)) {
      removeFromWishlist(listing.id);
      showToast('Removed from saved items');
    } else {
      addToWishlist(listing.id);
      showToast('Saved for later');
    }
  };
  const onMessage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/listing/${listing.id}?focus=chat`);
  };

  return (
    <div className="glass glass-hover group relative overflow-hidden rounded-2xl">
      <Link to={`/listing/${listing.id}`} className="block">
        <div className="tag-hole" />
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-fg)]/[0.03]">
          <ImageWithFallback
            src={listing.image_url}
            imgClassName="transition duration-500 group-hover:scale-105"
          />
          {listing.category && (
            <span className="absolute left-3 top-3 rounded-full border border-[var(--color-fg)]/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg)]/75 backdrop-blur">
              {listing.category}
            </span>
          )}
          {listing.is_sold ? (
            <span className="absolute right-3 top-3 rounded-full bg-[var(--color-sale)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Sold
            </span>
          ) : isNewListing(listing) ? (
            <span className="absolute right-3 top-3 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              New
            </span>
          ) : null}
        </div>
        <div className="p-4">
          <h3 className="truncate font-semibold text-[var(--color-fg)]/95">{listing.title}</h3>
          <p className="mt-0.5 truncate text-sm text-[var(--color-fg)]/45">{listing.location || '—'}</p>
          <p className="mt-2 font-display text-lg grad-text">{formatPrice(listing.price)}</p>
        </div>
      </Link>

      {canQuickAct && (
        <div className="absolute right-3 bottom-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onCart}
            title={inCart ? 'In cart' : 'Add to cart'}
            className={`grid h-8 w-8 place-items-center rounded-full border text-sm backdrop-blur transition ${
              inCart ? 'border-[var(--color-accent)]/60 bg-[var(--color-accent)] text-white' : 'border-[var(--color-fg)]/15 bg-black/40 text-[var(--color-fg)]/80 hover:border-[var(--color-fg)]/35'
            }`}
          >
            🛒
          </button>
          <button
            type="button"
            onClick={onWishlist}
            title={inWishlist ? 'Saved for later' : 'Save for later'}
            className={`grid h-8 w-8 place-items-center rounded-full border text-sm backdrop-blur transition ${
              inWishlist ? 'border-[var(--color-sale)]/60 bg-[var(--color-sale)] text-white' : 'border-[var(--color-fg)]/15 bg-black/40 text-[var(--color-fg)]/80 hover:border-[var(--color-fg)]/35'
            }`}
          >
            {inWishlist ? '★' : '☆'}
          </button>
          <button
            type="button"
            onClick={onMessage}
            title="Message seller"
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--color-fg)]/15 bg-black/40 text-sm text-[var(--color-fg)]/80 backdrop-blur transition hover:border-[var(--color-fg)]/35"
          >
            💬
          </button>
        </div>
      )}
    </div>
  );
}
