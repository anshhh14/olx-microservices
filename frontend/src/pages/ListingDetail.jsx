import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { API, apiFetch } from '../lib/api';
import { formatPrice } from '../lib/format';
import { Button, Spinner, EmptyState, ImageWithFallback } from '../components/ui';

export default function ListingDetail() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const { auth, mode } = useAuth();
  const { isInCart, isInWishlist, addToCart, removeFromCart, addToWishlist, removeFromWishlist } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [negotiatedPrice, setNegotiatedPrice] = useState(null);
  const chatRef = useRef(null);

  const isOwner = auth && listing && String(auth.id) === String(listing.user_id);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const l = await apiFetch(`${API.listings}/${id}`);
      setListing(l);
      if (auth && String(auth.id) !== String(l.user_id) && mode !== 'seller') {
        try {
          const negotiated = await apiFetch(`${API.listings}/${id}/negotiated-price/${auth.id}`);
          setNegotiatedPrice(Number(negotiated.price));
        } catch {
          setNegotiatedPrice(null);
        }
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, auth, mode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (search.get('focus') === 'chat' && chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [search, listing]);

  const markSold = async () => {
    try {
      await apiFetch(`${API.listings}/${id}/sold`, { method: 'PATCH' });
      showToast('Marked as sold');
      load();
    } catch (err) {
      showToast(err.message, true);
    }
  };
  const deleteListing = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await fetch(`${API.listings}/${id}`, { method: 'DELETE' });
      showToast('Listing deleted');
      navigate('/browse');
    } catch (err) {
      showToast(err.message, true);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return <div className="mx-auto max-w-3xl px-5 py-16"><EmptyState>{loadError}</EmptyState></div>;
  if (!listing) return null;

  const inCart = isInCart(id);
  const inWishlist = isInWishlist(id);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        {/* Listing card */}
        <div className="glass fade-up relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="tag-hole" />
          <div className="relative mb-6 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[var(--color-fg)]/[0.03]">
            <ImageWithFallback src={listing.image_url} />
          </div>
          {listing.category && (
            <span className="mb-3 inline-block rounded-full border border-[var(--color-fg)]/15 bg-[var(--color-fg)]/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg)]/70">
              {listing.category}
            </span>
          )}
          <h1 className="font-display text-2xl sm:text-3xl">{listing.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {negotiatedPrice != null ? (
              <>
                <span className="font-display text-xl text-[var(--color-fg)]/35 line-through sm:text-2xl">{formatPrice(listing.price)}</span>
                <span className="font-display text-2xl grad-text sm:text-3xl">{formatPrice(negotiatedPrice)}</span>
                <span className="rounded-full border border-[var(--color-sale)]/25 bg-[var(--color-sale)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-sale)]">
                  Your negotiated price
                </span>
              </>
            ) : (
              <span className="font-display text-2xl grad-text sm:text-3xl">{formatPrice(listing.price)}</span>
            )}
          </div>

          <p className="mt-2 text-sm text-[var(--color-fg)]/45">{listing.location || 'Location not specified'}</p>
          <p className="mt-4 whitespace-pre-line text-[var(--color-fg)]/70">{listing.description || 'No description provided.'}</p>

          {listing.is_sold && (
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sale)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--color-sale)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-sale)]" />
              Sold
            </p>
          )}

          {isOwner ? (
            <>
              <p className="mt-6 text-sm text-[var(--color-fg)]/45">
                This is your own listing, so you'll always see seller tools here — Buying/Selling mode only changes navigation, not ownership.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={markSold}>Mark as sold</Button>
                <Button variant="danger" onClick={deleteListing}>Delete</Button>
              </div>
            </>
          ) : !listing.is_sold ? (
            !auth ? (
              <p className="mt-6 text-sm text-[var(--color-fg)]/50">
                <Link to="/login" className="grad-text font-semibold">Log in</Link> to buy this listing.
              </p>
            ) : mode === 'seller' ? (
              <p className="mt-6 text-sm text-[var(--color-fg)]/50">
                You're in selling mode. <Link to="/choose-role" className="grad-text font-semibold">Switch to buying</Link> to purchase this.
              </p>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => navigate(`/checkout-details/listing/${id}`)}>Buy now</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (inCart) { removeFromCart(id); showToast('Removed from cart'); }
                    else { addToCart(id); showToast('Added to cart'); }
                  }}
                >
                  {inCart ? '✓ In cart' : 'Add to cart'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (inWishlist) { removeFromWishlist(id); showToast('Removed from saved items'); }
                    else { addToWishlist(id); showToast('Saved for later'); }
                  }}
                >
                  {inWishlist ? '★ Saved' : '☆ Save for later'}
                </Button>
              </div>
            )
          ) : null}
        </div>

        {/* Chat */}
        <div ref={chatRef}>
          <ChatPanel listing={listing} isOwner={isOwner} partnerParam={search.get('partner')} auth={auth} onOfferAccepted={load} />
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ listing, isOwner, partnerParam, auth, onOfferAccepted }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  const partnerId = isOwner ? partnerParam : listing.user_id;
  const myId = auth ? String(auth.id) : null;

  const loadMessages = useCallback(async () => {
    if (!auth || !partnerId) return;
    try {
      const msgs = await apiFetch(`${API.chat}/messages/${listing.id}/${myId}/${partnerId}`);
      setMessages(msgs);
    } catch {
      // stay quiet on poll errors
    }
  }, [auth, partnerId, listing.id, myId]);

  useEffect(() => {
    if (!auth || !partnerId) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [auth, partnerId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!auth) {
    return (
      <div className="glass fade-up rounded-3xl p-6 sm:p-8">
        <h2 className="font-display text-lg">Message the seller</h2>
        <p className="mt-4 text-sm text-[var(--color-fg)]/50">
          <Link to="/login" className="grad-text font-semibold">Log in</Link> to message the seller.
        </p>
      </div>
    );
  }
  if (isOwner && !partnerParam) {
    return (
      <div className="glass fade-up rounded-3xl p-6 sm:p-8">
        <h2 className="font-display text-lg">Message the seller</h2>
        <p className="mt-4 text-sm text-[var(--color-fg)]/50">Reply to buyers from your Messages tab.</p>
      </div>
    );
  }

  const sendMessage = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    try {
      await apiFetch(`${API.chat}/messages`, {
        method: 'POST',
        body: JSON.stringify({ listingId: String(listing.id), senderId: myId, receiverId: String(partnerId), text: value }),
      });
      setText('');
      loadMessages();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const sendOffer = async (e) => {
    e.preventDefault();
    if (!offerAmount || Number(offerAmount) <= 0) return;
    try {
      await apiFetch(`${API.chat}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          listingId: String(listing.id), senderId: myId, receiverId: String(partnerId),
          text: `Offered ${formatPrice(offerAmount)}`, type: 'offer', amount: offerAmount,
        }),
      });
      setOfferAmount('');
      setOfferOpen(false);
      showToast('Offer sent to seller');
      loadMessages();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const respondToOffer = async (messageId, status, buyerId, amount) => {
    try {
      await apiFetch(`${API.chat}/messages/${messageId}/respond`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (status === 'accepted') {
        await apiFetch(`${API.listings}/${listing.id}/negotiated-price`, {
          method: 'POST',
          body: JSON.stringify({ buyerId, price: amount }),
        });
        showToast(`Offer accepted — this buyer now sees ${formatPrice(amount)}`);
        onOfferAccepted?.();
      } else {
        showToast('Offer rejected');
      }
      loadMessages();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="glass fade-up flex h-[520px] flex-col overflow-hidden rounded-3xl">
      <div className="border-b border-[var(--color-fg)]/[0.06] px-6 py-4">
        <h2 className="font-display text-lg">Message the seller</h2>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-sm text-[var(--color-fg)]/35">Say hello to get the conversation started.</p>
        )}
        {messages.map((m) =>
          m.type === 'offer' ? (
            <OfferBubble key={m._id} m={m} mine={String(m.senderId) === myId} isOwner={isOwner} onRespond={respondToOffer} />
          ) : (
            <div
              key={m._id}
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                String(m.senderId) === myId
                  ? 'ml-auto btn-grad rounded-br-sm'
                  : 'mr-auto rounded-bl-sm border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04] text-[var(--color-fg)]/85'
              }`}
            >
              {m.text}
            </div>
          )
        )}
      </div>

      {offerOpen && (
        <form onSubmit={sendOffer} className="flex gap-2 border-t border-[var(--color-fg)]/[0.06] px-4 pt-3">
          <input
            type="number"
            min="1"
            placeholder="Your offer (₹)"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            className="flex-1 rounded-xl border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]/60"
          />
          <Button variant="outline" type="submit">Send offer</Button>
        </form>
      )}

      <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-4">
        <input
          type="text"
          placeholder="Say hello…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]/60"
        />
        {!isOwner && (
          <button
            type="button"
            title="Make an offer"
            onClick={() => setOfferOpen((v) => !v)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-fg)]/15 text-sm hover:border-[var(--color-fg)]/35"
          >
            💰
          </button>
        )}
        <Button type="submit" className="shrink-0">Send</Button>
      </form>
    </div>
  );
}

function OfferBubble({ m, mine, isOwner, onRespond }) {
  const canRespond = isOwner && !mine && m.status === 'pending';
  return (
    <div className={`max-w-[80%] rounded-2xl border p-3 text-sm ${mine ? 'ml-auto border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10' : 'mr-auto border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04]'}`}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-fg)]/45">{mine ? 'You offered' : 'Buyer offered'}</div>
      <div className="mt-0.5 font-display text-lg grad-text">{formatPrice(m.amount)}</div>
      {canRespond ? (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onRespond(m._id, 'accepted', m.senderId, m.amount)}
            className="rounded-full bg-[var(--color-success)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-success)] hover:bg-[var(--color-success)]/25"
          >
            Accept
          </button>
          <button
            onClick={() => onRespond(m._id, 'rejected', m.senderId, m.amount)}
            className="rounded-full border border-[var(--color-sale)]/30 px-3 py-1 text-xs font-semibold text-[var(--color-sale)] hover:bg-[var(--color-sale)]/10"
          >
            Reject
          </button>
        </div>
      ) : (
        <span className="mt-1 inline-block text-xs capitalize text-[var(--color-fg)]/40">{m.status}</span>
      )}
    </div>
  );
}
