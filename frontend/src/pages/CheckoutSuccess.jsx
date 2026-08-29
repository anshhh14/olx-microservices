import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { API, apiFetch } from '../lib/api';
import { formatPrice } from '../lib/format';
import { Button, Spinner } from '../components/ui';

export default function CheckoutSuccess() {
  const [search] = useSearchParams();
  const { cartIds, wishlistIds, setCartIds, setWishlistIds } = useCart();
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [listings, setListings] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const sessionId = search.get('session_id');
  const listingId = search.get('listingId');

  useEffect(() => {
    if (!sessionId) { setStatus('missing'); return; }
    (async () => {
      try {
        const { listings: ls } = await apiFetch(`${API.listings}/orders/confirm?session_id=${encodeURIComponent(sessionId)}`);
        setListings(ls);
        const paidIds = ls.map((l) => String(l.id));
        setCartIds(cartIds.filter((id) => !paidIds.includes(id)));
        setWishlistIds(wishlistIds.filter((id) => !paidIds.includes(id)));
        setStatus('ok');
      } catch (err) {
        setErrorMsg(err.message);
        setStatus('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <div className="glass fade-up relative overflow-hidden rounded-3xl p-8 text-center">
        <div className="tag-hole" />
        {status === 'loading' && (
          <>
            <h1 className="font-display text-2xl">Confirming payment…</h1>
            <p className="mt-2 text-sm text-[var(--color-fg)]/50">Hang tight, this only takes a second.</p>
            <Spinner />
          </>
        )}
        {status === 'missing' && (
          <>
            <h1 className="font-display text-2xl">Something's missing</h1>
            <p className="mt-2 text-sm text-[var(--color-fg)]/50">No checkout session was found. If you completed a payment, check your Orders tab.</p>
            <Link to="/browse" className="mt-6 inline-block"><Button variant="outline">Back to browse</Button></Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="font-display text-2xl">Couldn't confirm payment</h1>
            <p className="mt-2 text-sm text-[var(--color-fg)]/50">{errorMsg}</p>
            <Link to={`/listing/${listingId || ''}`} className="mt-6 inline-block"><Button variant="outline">Back to listing</Button></Link>
          </>
        )}
        {status === 'ok' && (
          <>
            <h1 className="font-display text-2xl">Payment successful</h1>
            <p className="mt-2 text-sm text-[var(--color-fg)]/50">
              {listings.length > 1 ? `You bought ${listings.length} items` : 'You bought'} for a total of{' '}
              {formatPrice(listings.reduce((sum, l) => sum + Number(l.price), 0))}.
            </p>
            <div className="mt-5 space-y-2 text-left">
              {listings.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-fg)]/[0.06] bg-[var(--color-fg)]/[0.02] p-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--color-fg)]/[0.04]">
                    {l.image_url ? <img src={l.image_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <Link to={`/listing/${l.id}`} className="flex-1 truncate text-sm text-[var(--color-fg)]/80">{l.title}</Link>
                  <span className="text-sm font-semibold grad-text">{formatPrice(l.price)}</span>
                </div>
              ))}
            </div>
            <Link to="/orders" className="mt-6 inline-block"><Button>See your orders</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
