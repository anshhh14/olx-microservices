import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API, apiFetch } from '../lib/api';
import { formatPrice } from '../lib/format';
import { PageHeader, StatCard, EmptyState, Spinner, GradWord } from '../components/ui';
import RestrictedNotice, { LoginLink } from '../components/RestrictedNotice';

function OrderRow({ order, label }) {
  const delivery = label === 'Sold' && order.buyer_name
    ? (order.delivery_method === 'pickup'
        ? `Pickup: ${order.buyer_name} · ${order.buyer_phone || ''} · at ${order.pickup_location || ''}`
        : `Ship to: ${order.buyer_name} · ${order.buyer_phone || ''} · ${order.buyer_address || ''}`)
    : null;

  return (
    <Link to={`/listing/${order.listing_id}`} className="glass glass-hover flex items-center justify-between gap-4 rounded-2xl p-4">
      <div className="min-w-0">
        <div className="truncate font-medium text-[var(--color-fg)]/90">{order.title}</div>
        <div className="truncate text-sm text-[var(--color-fg)]/45">{label} — {formatPrice(order.amount)}</div>
        {delivery && <div className="mt-1 truncate text-xs text-[var(--color-fg)]/35">{delivery}</div>}
      </div>
      <span className="grad-text shrink-0 text-lg">→</span>
    </Link>
  );
}

export default function Orders() {
  const { auth, isLoggedIn, mode } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        if (mode === 'seller') {
          const [e, s] = await Promise.all([
            apiFetch(`${API.listings}/orders/earnings/${auth.id}`),
            apiFetch(`${API.listings}/orders/selling/${auth.id}`),
          ]);
          setEarnings(e);
          setSales(s);
        } else {
          const p = await apiFetch(`${API.listings}/orders/mine/${auth.id}`);
          setPurchases(p);
        }
      } catch (err) {
        showToast(err.message, true);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth?.id, isLoggedIn, mode, showToast]);

  if (!isLoggedIn) return <RestrictedNotice>You need to <LoginLink /> to see your orders.</RestrictedNotice>;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <PageHeader title={<>Your <GradWord>orders</GradWord></>} sub="Everything you've bought and sold." />

      {loading ? (
        <Spinner />
      ) : mode === 'seller' ? (
        <>
          {earnings && (
            <div className="mb-8 grid grid-cols-2 gap-4 sm:max-w-md">
              <StatCard label="Total earned" value={formatPrice(earnings.total)} />
              <StatCard label="Items sold" value={earnings.count} />
            </div>
          )}
          <h2 className="mb-4 font-display text-lg">Sales</h2>
          {sales.length === 0 ? (
            <EmptyState>Nothing sold yet.</EmptyState>
          ) : (
            <div className="space-y-3">{sales.map((o) => <OrderRow key={o.id} order={o} label="Sold" />)}</div>
          )}
        </>
      ) : (
        <>
          <h2 className="mb-4 font-display text-lg">Purchases</h2>
          {purchases.length === 0 ? (
            <EmptyState>Nothing bought yet — go find something on Browse.</EmptyState>
          ) : (
            <div className="space-y-3">{purchases.map((o) => <OrderRow key={o.id} order={o} label="Bought" />)}</div>
          )}
        </>
      )}
    </div>
  );
}
