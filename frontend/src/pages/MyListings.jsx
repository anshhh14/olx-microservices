import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API, apiFetch } from '../lib/api';
import { formatPrice } from '../lib/format';
import { PageHeader, StatCard, EmptyState, Spinner, GradWord } from '../components/ui';
import ListingCard from '../components/ListingCard';
import RestrictedNotice, { LoginLink } from '../components/RestrictedNotice';

export default function MyListings() {
  const { auth, isLoggedIn, mode } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || mode !== 'seller') { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [e, l] = await Promise.all([
          apiFetch(`${API.listings}/orders/earnings/${auth.id}`),
          apiFetch(`${API.listings}/mine/${auth.id}`),
        ]);
        if (!cancelled) { setEarnings(e); setListings(l); }
      } catch (err) {
        if (!cancelled) showToast(err.message, true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.id, isLoggedIn, mode, showToast]);

  if (!isLoggedIn) return <RestrictedNotice>You need to <LoginLink /> to see your listings.</RestrictedNotice>;
  if (mode !== 'seller') {
    return (
      <RestrictedNotice>
        You're currently in buying mode. <Link to="/choose-role" className="grad-text font-semibold">Switch to selling</Link> to manage your listings.
      </RestrictedNotice>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Seller" title={<>My <GradWord>listings</GradWord></>} sub="Everything you've tagged for sale — active and sold." />

      {loading ? (
        <Spinner />
      ) : (
        <>
          {earnings && (
            <div className="mb-8 grid grid-cols-2 gap-4 sm:max-w-md">
              <StatCard label="Total earned" value={formatPrice(earnings.total)} />
              <StatCard label="Items sold" value={earnings.count} />
            </div>
          )}
          {listings.length === 0 ? (
            <EmptyState>You haven't posted anything yet — <Link to="/sell" className="grad-text font-semibold">tag something for sale</Link>.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
