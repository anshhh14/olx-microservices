import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API, apiFetch } from '../lib/api';
import { PageHeader, EmptyState, Spinner } from '../components/ui';
import RestrictedNotice, { LoginLink } from '../components/RestrictedNotice';

export default function Messages() {
  const { auth, isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    (async () => {
      try {
        const data = await apiFetch(`${API.chat}/conversations/${auth.id}`);
        setConversations(data);
      } catch (err) {
        showToast(err.message, true);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth?.id, isLoggedIn, showToast]);

  if (!isLoggedIn) return <RestrictedNotice>You need to <LoginLink /> to see your messages.</RestrictedNotice>;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <PageHeader title="Messages" sub="Your recent conversations." />
      {loading ? (
        <Spinner />
      ) : conversations.length === 0 ? (
        <EmptyState>No conversations yet — go message a seller from a listing.</EmptyState>
      ) : (
        <div className="space-y-3">
          {conversations.map((c, i) => (
            <Link
              key={i}
              to={`/listing/${c.listingId}?partner=${encodeURIComponent(c.partner)}`}
              className="glass glass-hover flex items-center justify-between rounded-2xl p-4"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-[var(--color-fg)]/90">Conversation about listing #{c.listingId}</div>
                <div className="truncate text-sm text-[var(--color-fg)]/45">{c.lastMessage}</div>
              </div>
              <span className="grad-text text-lg">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
