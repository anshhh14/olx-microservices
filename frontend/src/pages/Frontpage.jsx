import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GradWord } from '../components/ui';
import logoMark from '../assets/logo-mark.png';

function FloatingListingCard({ className = '', accent, emoji, title, price, delay = '0s', featured = false }) {
  return (
    <div
      className={`animate-floaty glass absolute w-40 rounded-2xl p-3.5 sm:w-48 sm:p-4 ${featured ? 'z-10 shadow-[0_28px_60px_-24px_rgba(23,23,23,0.22)]' : 'shadow-[0_20px_44px_-22px_rgba(23,23,23,0.16)]'} ${className}`}
      style={{ animationDelay: delay }}
    >
      <div
        className="flex h-16 w-full items-center justify-center rounded-xl text-2xl sm:h-20 sm:text-3xl"
        style={{ backgroundColor: `${accent}1A` }}
      >
        {emoji}
      </div>
      <p className="mt-2.5 truncate text-xs font-semibold text-[var(--color-fg)] sm:text-sm">{title}</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-display text-sm font-bold sm:text-base" style={{ color: accent }}>{price}</span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          New
        </span>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: 'Browse & discover',
    desc: 'Filter by category, location, price, and keyword — new listings surface automatically.',
  },
  {
    title: 'Chat, then decide',
    desc: 'Message sellers directly on the listing, negotiate a price, and pick up right where you left off.',
  },
  {
    title: 'Checkout with Stripe',
    desc: 'Real test-mode payments, delivery details captured up front, orders tracked for both sides.',
  },
];

export default function Frontpage() {
  const { isLoggedIn, mode } = useAuth();
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(false);

  const ctaLabel = isLoggedIn ? (mode ? 'Enter marketplace' : 'Choose your mode') : 'Get started';
  const ctaTo = isLoggedIn ? (mode ? '/browse' : '/choose-role') : '/login';

  const scrollToFeatures = () => {
    document.getElementById('frontpage-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* ---- Hero ---- */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Ambient backdrop — a tri-color wash (green / blue / violet), soft and layered */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[var(--color-bg)]">
          <div className="absolute left-[8%] top-[4%] h-[42vh] w-[42vw] rounded-[100%] bg-[#16A34A]/[0.07] blur-[100px]" />
          <div className="absolute right-[6%] top-[10%] h-[46vh] w-[46vw] rounded-[100%] bg-[#2563EB]/[0.07] blur-[110px]" />
          <div className="absolute bottom-0 left-1/2 h-[40vh] w-[55vw] -translate-x-1/2 rounded-[100%] bg-[#7C3AED]/[0.06] blur-[100px]" />
          <div className="accent-ring left-1/2 top-1/2 hidden h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 sm:block" />
          <div className="accent-ring left-1/2 top-1/2 hidden h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 sm:block" />
        </div>

        {/* Top bar */}
        <header className="relative z-10 flex items-center justify-between px-5 py-6 sm:px-10 sm:py-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={logoMark} alt="" className="h-6 w-auto" />
            <Link to="/browse" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-fg)]/70 hover:text-[var(--color-fg)]">
              Browse
            </Link>
            <span className="hidden text-[11px] uppercase tracking-[0.2em] text-[var(--color-fg)]/35 sm:inline">
              Buy · Sell · Chat
            </span>
          </div>

          <div className="flex items-center gap-5 sm:gap-7">
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-fg)]/70 transition hover:text-[var(--color-fg)]"
              aria-pressed={soundOn}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                {soundOn ? (
                  <path d="M3 10v4h4l5 4V6L7 10H3zM16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13" />
                ) : (
                  <path d="M3 10v4h4l5 4V6L7 10H3zM16 9l5 6M21 9l-5 6" />
                )}
              </svg>
              <span className="hidden sm:inline">Sound</span>
            </button>
            <button
              type="button"
              onClick={scrollToFeatures}
              className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-fg)]/70 transition hover:text-[var(--color-fg)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-fg)]/70" />
              Menu
            </button>
          </div>
        </header>

        {/* Wordmark */}
        <div className="relative z-10 mt-2 text-center sm:mt-4">
          <span className="fade-up mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-fg)]/60 shadow-[0_1px_2px_rgba(23,23,23,0.04)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            The marketplace that talks back
          </span>
          <h1 className="font-display leading-[0.95] tracking-tight">
            <span className="hero-grad-text block text-[15vw] sm:text-[8rem] lg:text-[9rem]">Mercato</span>
          </h1>
          <p className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-3 text-[2.6vw] font-semibold uppercase text-[var(--color-fg)]/60 sm:max-w-none sm:gap-4 sm:text-xs" style={{ letterSpacing: '0.25em' }}>
            <span className="h-px w-6 bg-[var(--color-fg)]/25 sm:w-10" />
            Where every price is a <span className="hero-grad-text">conversation</span>
            <span className="h-px w-6 bg-[var(--color-fg)]/25 sm:w-10" />
          </p>
        </div>

        {/* Floating listing cards, centerpiece — grounded, tangible, instead of an abstract cube */}
        <div className="relative z-10 flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="relative h-64 w-full max-w-xl sm:h-80">
            <FloatingListingCard
              className="left-[6%] top-[52%] -translate-y-1/2 -rotate-6 sm:left-[14%]"
              accent="#16A34A"
              emoji="📷"
              title="Vintage Film Camera"
              price="₹2,499"
              delay="0s"
            />
            <FloatingListingCard
              className="left-1/2 top-[8%] -translate-x-1/2 rotate-2"
              accent="#2563EB"
              emoji="🎧"
              title="Studio Headphones"
              price="₹4,200"
              delay="1.4s"
              featured
            />
            <FloatingListingCard
              className="right-[6%] top-[58%] -translate-y-1/2 rotate-3 sm:right-[14%]"
              accent="#7C3AED"
              emoji="🛋️"
              title="Mid-Century Chair"
              price="₹6,800"
              delay="2.8s"
            />
          </div>
        </div>

        {/* CTA + scroll indicator */}
        <div className="relative z-10 flex flex-col items-center gap-10 pb-10 sm:pb-14">
          <button
            type="button"
            onClick={() => navigate(ctaTo)}
            className="btn-grad rounded-full px-8 py-3 text-sm font-semibold uppercase tracking-widest"
          >
            {ctaLabel}
          </button>

          <button
            type="button"
            onClick={scrollToFeatures}
            className="group flex flex-col items-center gap-2 text-[var(--color-fg)]/50 transition hover:text-[var(--color-fg)]/80"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">Scroll down</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-bounce">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ---- Features / how it works ---- */}
      <section id="frontpage-features" className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="fade-up mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl sm:text-3xl">
            One account, <GradWord>buy or sell</GradWord>
          </h2>
          <p className="mt-3 text-[var(--color-fg)]/55">
            Pick a mode after logging in and switch anytime — Mercato adapts the whole app around it.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass glass-hover fade-up relative overflow-hidden rounded-3xl p-7">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)]/10 font-display text-sm font-bold text-[var(--color-accent)]">
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 className="font-display text-lg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg)]/55">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-[var(--color-fg)]/50">Ready to jump in?</p>
          <button
            type="button"
            onClick={() => navigate(ctaTo)}
            className="btn-grad rounded-full px-7 py-3 text-sm font-semibold"
          >
            {ctaLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
