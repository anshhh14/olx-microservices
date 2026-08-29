import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input, Button, ErrorText } from '../components/ui';
import logoMark from '../assets/logo-mark.png';

export default function Login() {
  const [tab, setTab] = useState('login');
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [regData, setRegData] = useState({ name: '', email: '', password: '' });
  const [regError, setRegError] = useState('');
  const [regBusy, setRegBusy] = useState(false);

  const submitLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const me = await login(loginData.email, loginData.password);
      showToast(`Welcome back, ${me.name || me.email}`);
      navigate('/choose-role');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginBusy(false);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegBusy(true);
    try {
      const me = await register(regData.name, regData.email, regData.password);
      showToast(`Account created — welcome, ${me.name || me.email}`);
      navigate('/choose-role');
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      {/* Ambient hero backdrop — layered soft accent glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]/[0.07] blur-[120px]" />
        <div className="accent-ring left-1/4 top-1/3 hidden h-72 w-72 sm:block" />
      </div>

      <Link to="/" className="absolute left-6 top-6 flex items-center gap-2 sm:left-10 sm:top-10">
        <img src={logoMark} alt="" className="h-7 w-auto" />
        <span className="font-display text-lg tracking-tight grad-text">MERCATO</span>
      </Link>

      <div className="grid w-full max-w-5xl items-center gap-14 lg:grid-cols-2">
        {/* Decorative rotating glass cube, restyled clean/flat */}
        <div className="order-2 hidden justify-center lg:order-1 lg:flex">
          <div className="relative h-72 w-72" style={{ perspective: '900px' }}>
            <div className="absolute inset-0 animate-spin-slow">
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl border border-[var(--color-border)] bg-white p-10 shadow-[0_20px_50px_-20px_rgba(23,23,23,0.15)]">
                <img src={logoMark} alt="" className="h-full w-full object-contain" />
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center rounded-3xl border border-[var(--color-border)] opacity-40"
                style={{ transform: 'translateZ(60px)' }}
              >
                <img src={logoMark} alt="" className="h-2/3 w-2/3 object-contain" />
              </div>
              <div
                className="absolute inset-0 rounded-3xl border border-[var(--color-border)] bg-[var(--color-fg)]/5"
                style={{ transform: 'rotateY(90deg) translateZ(60px)' }}
              />
            </div>
            <div className="absolute -bottom-6 left-1/2 h-16 w-56 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-2xl" />
            <p className="absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs uppercase tracking-[0.3em] text-[var(--color-fg)]/35">
              Buy · Sell · Chat
            </p>
          </div>
        </div>

        {/* Auth card */}
        <div className="order-1 lg:order-2">
          <div className="glass fade-up relative overflow-hidden rounded-3xl p-8 sm:p-10">
            <div className="tag-hole" />
            <h1 className="font-display text-2xl sm:text-3xl leading-tight">
              {tab === 'login' ? (
                <>Welcome back to <span className="grad-text">Mercato</span></>
              ) : (
                <>Join <span className="grad-text">Mercato</span> today</>
              )}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-fg)]/50">
              {tab === 'login' ? 'Log in to browse, sell, and chat.' : 'Create an account — takes less than a minute.'}
            </p>

            <div className="mt-6 mb-6 inline-flex rounded-full border border-[var(--color-fg)]/10 bg-[var(--color-fg)]/[0.03] p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  tab === 'login' ? 'btn-grad' : 'text-[var(--color-fg)]/55 hover:text-[var(--color-fg)]'
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  tab === 'register' ? 'btn-grad' : 'text-[var(--color-fg)]/55 hover:text-[var(--color-fg)]'
                }`}
              >
                Sign up
              </button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={submitLogin} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]/70">Email</span>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData((d) => ({ ...d, email: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]/70">Password</span>
                  <Input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginData.password}
                    onChange={(e) => setLoginData((d) => ({ ...d, password: e.target.value }))}
                  />
                </label>
                <Button type="submit" disabled={loginBusy} className="w-full">
                  {loginBusy ? 'Logging in…' : 'Log in'}
                </Button>
                <ErrorText>{loginError}</ErrorText>
              </form>
            ) : (
              <form onSubmit={submitRegister} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]/70">Name</span>
                  <Input
                    type="text"
                    autoComplete="name"
                    value={regData.name}
                    onChange={(e) => setRegData((d) => ({ ...d, name: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]/70">Email</span>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={regData.email}
                    onChange={(e) => setRegData((d) => ({ ...d, email: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]/70">Password</span>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regData.password}
                    onChange={(e) => setRegData((d) => ({ ...d, password: e.target.value }))}
                  />
                </label>
                <Button type="submit" disabled={regBusy} className="w-full">
                  {regBusy ? 'Creating account…' : 'Create account'}
                </Button>
                <ErrorText>{regError}</ErrorText>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
