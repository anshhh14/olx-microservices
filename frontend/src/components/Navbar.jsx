import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import logoMark from '../assets/logo-mark.png';

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative px-1 py-1 text-sm font-medium transition-colors ${
          isActive ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg)]/55 hover:text-[var(--color-fg)]/90'
        }`
      }
    >
      {({ isActive }) => (
        <span className="relative">
          {children}
          {isActive && (
            <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-[var(--color-accent)]" />
          )}
        </span>
      )}
    </NavLink>
  );
}

function MobileNavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-[var(--color-fg)]/[0.06] text-[var(--color-fg)]' : 'text-[var(--color-fg)]/60 hover:bg-[var(--color-fg)]/[0.04] hover:text-[var(--color-fg)]/90'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { auth, isLoggedIn, mode, logout } = useAuth();
  const { cartCount } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    showToast('Logged out');
    closeMenu();
    navigate('/browse');
  };

  const handleSwitchRole = () => {
    closeMenu();
    navigate('/choose-role');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-fg)]/[0.06] bg-[var(--color-bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <NavLink to="/browse" className="flex items-center gap-2 shrink-0">
          <img src={logoMark} alt="" className="h-7 w-auto" />
          <span className="font-display text-lg tracking-tight grad-text">MERCATO</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-7">
          <NavItem to="/browse">Browse</NavItem>
          {isLoggedIn && mode === 'seller' && <NavItem to="/sell">Sell</NavItem>}
          {isLoggedIn && mode === 'seller' && <NavItem to="/my-listings">My Listings</NavItem>}
          {isLoggedIn && mode === 'buyer' && (
            <NavLink to="/cart" className={({ isActive }) => `relative text-sm font-medium ${isActive ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg)]/55 hover:text-[var(--color-fg)]/90'}`}>
              Cart
              {cartCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </NavLink>
          )}
          {isLoggedIn && <NavItem to="/messages">Messages</NavItem>}
          {isLoggedIn && <NavItem to="/orders">{mode === 'seller' ? 'Sales' : 'Orders'}</NavItem>}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {isLoggedIn ? (
            <>
              {mode && (
                <button
                  onClick={handleSwitchRole}
                  className="hidden sm:inline-flex items-center rounded-full border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg)]/70 transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-fg)]"
                >
                  {mode === 'seller' ? 'Selling' : 'Buying'} · Switch
                </button>
              )}
              <span className="hidden sm:inline text-sm text-[var(--color-fg)]/60 max-w-[10rem] truncate">
                {auth?.name || auth?.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-[var(--color-fg)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-fg)]/80 transition hover:border-[var(--color-fg)]/30 hover:text-[var(--color-fg)]"
              >
                Log out
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="btn-grad rounded-full px-4 py-2 text-xs font-semibold"
            >
              Log in
            </NavLink>
          )}

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04] text-[var(--color-fg)]/80 transition hover:border-[var(--color-fg)]/30 hover:text-[var(--color-fg)] md:hidden"
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--color-fg)]/[0.06] bg-[var(--color-bg)]/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3 sm:px-8">
            <MobileNavItem to="/browse" onClick={closeMenu}>Browse</MobileNavItem>
            {isLoggedIn && mode === 'seller' && (
              <MobileNavItem to="/sell" onClick={closeMenu}>Sell</MobileNavItem>
            )}
            {isLoggedIn && mode === 'seller' && (
              <MobileNavItem to="/my-listings" onClick={closeMenu}>My Listings</MobileNavItem>
            )}
            {isLoggedIn && mode === 'buyer' && (
              <MobileNavItem to="/cart" onClick={closeMenu}>
                Cart{cartCount > 0 ? ` (${cartCount})` : ''}
              </MobileNavItem>
            )}
            {isLoggedIn && (
              <MobileNavItem to="/messages" onClick={closeMenu}>Messages</MobileNavItem>
            )}
            {isLoggedIn && (
              <MobileNavItem to="/orders" onClick={closeMenu}>
                {mode === 'seller' ? 'Sales' : 'Orders'}
              </MobileNavItem>
            )}

            {isLoggedIn && (
              <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-fg)]/[0.06] pt-3 sm:hidden">
                {mode && (
                  <button
                    onClick={handleSwitchRole}
                    className="flex-1 rounded-full border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.04] px-3 py-2 text-xs font-medium text-[var(--color-fg)]/70 transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-fg)]"
                  >
                    {mode === 'seller' ? 'Selling' : 'Buying'} · Switch
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-full border border-[var(--color-fg)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-fg)]/80 transition hover:border-[var(--color-fg)]/30 hover:text-[var(--color-fg)]"
                >
                  Log out
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
