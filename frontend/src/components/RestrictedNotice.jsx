import { Link } from 'react-router-dom';

export default function RestrictedNotice({ children }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <div className="glass fade-up rounded-2xl px-8 py-14 text-[var(--color-fg)]/60">{children}</div>
    </div>
  );
}

export function LoginLink({ children = 'Log in' }) {
  return (
    <Link to="/login" className="grad-text font-semibold">
      {children}
    </Link>
  );
}
