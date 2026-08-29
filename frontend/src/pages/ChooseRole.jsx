import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GradWord } from '../components/ui';

export default function ChooseRole() {
  const { setMode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const pick = (role) => {
    setMode(role);
    showToast(role === 'seller' ? 'Switched to selling' : 'Switched to buying');
    navigate(role === 'seller' ? '/sell' : '/browse');
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="fade-up font-display text-3xl sm:text-4xl leading-tight">
        How are you using <GradWord>Mercato</GradWord> today?
      </h1>
      <p className="mt-3 text-[var(--color-fg)]/50">You can switch anytime from the top bar.</p>

      <div className="mt-10 grid w-full gap-5 sm:grid-cols-2">
        {[
          { role: 'buyer', label: 'Buyer', desc: <>Browse <span className="grad-text">listings</span>, chat with sellers, and buy.</> },
          { role: 'seller', label: 'Seller', desc: 'Post listings, chat with buyers, and manage sales.' },
        ].map((r) => (
          <button
            key={r.role}
            onClick={() => pick(r.role)}
            className="glass glass-hover fade-up relative flex flex-col items-start gap-2 overflow-hidden rounded-3xl p-8 text-left"
          >
            <div className="tag-hole" />
            <span className="font-display text-2xl">{r.label}</span>
            <span className="text-sm text-[var(--color-fg)]/55">{r.desc}</span>
            <span className="mt-4 text-sm font-semibold grad-text">Continue →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
