import { useState, useEffect } from 'react';

export function PageHeader({ eyebrow, title, sub }) {
  return (
    <div className="mb-8 fade-up">
      {eyebrow && (
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-fg)]/45">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-3xl sm:text-4xl leading-tight tracking-tight">{title}</h1>
      {sub && <p className="mt-2 max-w-xl text-[var(--color-fg)]/55">{sub}</p>}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]/70">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04] px-3.5 py-2.5 text-sm text-[var(--color-fg)] placeholder-[var(--color-fg)]/30 outline-none transition focus:border-[var(--color-accent)]/60 focus:bg-[var(--color-fg)]/[0.06]';

export function Input(props) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}
export function Textarea(props) {
  return <textarea {...props} className={`${inputCls} resize-none ${props.className || ''}`} />;
}
export function Select(props) {
  return (
    <select {...props} className={`${inputCls} ${props.className || ''}`}>
      {props.children}
    </select>
  );
}

export function Button({ variant = 'primary', className = '', children, ...rest }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'btn-grad',
    outline: 'border border-[var(--color-fg)]/15 text-[var(--color-fg)]/85 hover:border-[var(--color-fg)]/35 hover:bg-[var(--color-fg)]/[0.04]',
    danger: 'border border-[var(--color-sale)]/30 text-[var(--color-sale)] hover:border-[var(--color-sale)]/60 hover:bg-[var(--color-sale)]/10',
    ghost: 'text-[var(--color-fg)]/60 hover:text-[var(--color-fg)]',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-[var(--color-sale)]">{children}</p>;
}

export function EmptyState({ children }) {
  return (
    <div className="glass fade-up rounded-2xl px-6 py-16 text-center text-[var(--color-fg)]/55">
      {children}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-fg)]/15 border-t-[var(--color-accent)]" />
    </div>
  );
}

export function ImageWithFallback({ src, alt = '', className = '', imgClassName = '' }) {
  const [status, setStatus] = useState(src ? 'loading' : 'empty');

  useEffect(() => {
    setStatus(src ? 'loading' : 'empty');
  }, [src]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {status !== 'empty' && status !== 'error' && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-[var(--color-fg)]/[0.05]" />
      )}
      {(status === 'empty' || status === 'error') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[var(--color-fg)]/25">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2.5" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            {status === 'error' ? 'Couldn’t load' : 'No photo'}
          </span>
        </div>
      )}
    </div>
  );
}

export function GradWord({ children }) {
  return <span className="grad-text">{children}</span>;
}

export function StatCard({ label, value }) {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg)]/45">{label}</div>
      <div className="mt-1 font-display text-2xl grad-text">{value}</div>
    </div>
  );
}
