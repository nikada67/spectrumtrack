import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// ─── API config ───────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || res.statusText), { status: res.status });
  }
  return res.json();
}

async function refreshAccessToken() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Session expired');
  const data = await res.json();
  return data.accessToken;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon  = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" /><polyline points="9 22 9 12 15 12 15 22" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" /></svg>);
const PlusIcon  = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" /><path d="M12 8v8M8 12h8" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" /></svg>);
const BarIcon   = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" /></svg>);
const CheckIcon = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const GroupIcon = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const ShareIcon = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5"/><circle cx="6" cy="12" r="3" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5"/><circle cx="18" cy="19" r="3" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5"/></svg>);
const EyeIcon   = ({ on }) => (<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d={on ? "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" : "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"} stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />{on && <circle cx="12" cy="12" r="3" stroke="#aaa" strokeWidth="1.5" />}</svg>);

// ─── Theme ────────────────────────────────────────────────────────────────────
const light = {
  bg: 'white', surface: '#f9f9f9', border: '#e8e8e8', borderLight: '#f0f0f0',
  text: '#1a1a1a', textMuted: '#888', textFaint: '#aaa',
  primary: '#1D9E75', primaryBg: '#E1F5EE', primaryText: '#0F6E56',
  card: 'white', input: '#fafafa', inputBorder: '#ddd',
  tag: '#f0f0f0', tagText: '#666', tagBorder: '#e0e0e0',
};
const dark = {
  bg: '#121212', surface: '#1e1e1e', border: '#2a2a2a', borderLight: '#242424',
  text: '#f0f0f0', textMuted: '#999', textFaint: '#666',
  primary: '#1D9E75', primaryBg: '#0d3326', primaryText: '#5DCAA5',
  card: '#1a1a1a', input: '#1e1e1e', inputBorder: '#333',
  tag: '#252525', tagText: '#aaa', tagBorder: '#333',
};

// ─── Reusable components ──────────────────────────────────────────────────────
const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    green: { background: '#E1F5EE', color: '#0F6E56' },
    amber: { background: '#FAEEDA', color: '#854F0B' },
    red:   { background: '#FCEBEB', color: '#A32D2D' },
    blue:  { background: '#E6F1FB', color: '#185FA5' },
    gray:  { background: '#f0f0f0', color: '#666' },
  };
  return <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, fontWeight: 500, ...colors[color] }}>{children}</span>;
};

const Avatar = ({ initials, color = 'green', size = 40 }) => {
  const colors = { green: { background: '#E1F5EE', color: '#0F6E56' }, blue: { background: '#E6F1FB', color: '#185FA5' }, amber: { background: '#FAEEDA', color: '#854F0B' }, pink: { background: '#FBEAF0', color: '#993556' } };
  return <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: size * 0.35, flexShrink: 0, ...colors[color] }}>{initials}</div>;
};

const SectionLabel = ({ children, mt = 14, th }) => (
  <div style={{ fontSize: 10, fontWeight: 500, color: th?.textMuted || '#888', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8, marginTop: mt }}>{children}</div>
);

const BtnPrimary = ({ children, onClick, style = {}, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{ background: disabled ? '#aaa' : '#1D9E75', color: 'white', border: 'none', padding: '11px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', fontFamily: 'inherit', transition: 'background 0.15s', ...style }}>{children}</button>
);

const BtnSecondary = ({ children, onClick, style = {}, th }) => (
  <button onClick={onClick} style={{ background: th?.surface || '#f5f5f5', color: th?.text || '#1a1a1a', border: `0.5px solid ${th?.inputBorder || '#ddd'}`, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', ...style }}>{children}</button>
);

const BtnBack = ({ onClick, th }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', fontSize: 13, color: '#1D9E75', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Back</button>
);

const Card = ({ children, style = {}, th }) => (
  <div style={{ background: th?.card || 'white', border: `0.5px solid ${th?.border || '#e8e8e8'}`, borderRadius: 12, padding: '13px 15px', marginBottom: 10, ...style }}>{children}</div>
);

const StatGrid  = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>{children}</div>;
const StatCard  = ({ number, label, numberColor, th }) => (
  <div style={{ background: th?.surface || '#f9f9f9', borderRadius: 8, padding: '11px 13px' }}>
    <div style={{ fontSize: 22, fontWeight: 500, color: numberColor || (th?.text || '#1a1a1a') }}>{number}</div>
    <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>{label}</div>
  </div>
);
const LogItem   = ({ time, behavior, detail, dotColor, th }) => (
  <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `0.5px solid ${th?.borderLight || '#f0f0f0'}` }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 4, flexShrink: 0 }} />
    <div>
      <div style={{ fontSize: 11, color: th?.textMuted || '#888' }}>{time}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{behavior}</div>
      <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 1 }}>{detail}</div>
    </div>
  </div>
);
const ErrorBanner   = ({ message }) => message ? <div style={{ background: '#FCEBEB', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#A32D2D' }}>{message}</div> : null;
const SuccessBanner = ({ message }) => message ? <div style={{ background: '#E1F5EE', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#0F6E56' }}>{message}</div> : null;
const Spinner = ({ th }) => <div style={{ textAlign: 'center', padding: 40, color: th?.textMuted || '#888', fontSize: 13 }}>Loading…</div>;

const Topbar = ({ title, subtitle, left, right, th }) => (
  <div style={{ padding: '14px 18px 12px', borderBottom: `0.5px solid ${th?.border || '#e8e8e8'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: th?.bg || 'white' }}>
    <div>{left || <><div style={{ fontSize: 16, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{title}</div>{subtitle && <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>{subtitle}</div>}</>}</div>
    {right}
  </div>
);

const BottomNav = ({ current, navigate, th }) => {
  const tabs = [
    { id: 'home',          label: 'Caseload',   Icon: HomeIcon },
    { id: 'log',           label: 'Log',         Icon: PlusIcon },
    { id: 'analytics',     label: 'Insights',    Icon: BarIcon },
    { id: 'interventions', label: 'Strategies',  Icon: CheckIcon },
    { id: 'parent',        label: 'Family',      Icon: GroupIcon },
    { id: 'share',         label: 'Share',       Icon: ShareIcon },
  ];
  return (
    <div style={{ borderTop: `0.5px solid ${th?.border || '#e8e8e8'}`, display: 'flex', padding: '6px 0 2px', flexShrink: 0, background: th?.bg || 'white' }}>
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => navigate(id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', fontFamily: 'inherit' }}>
          <Icon active={current === id} />
          <span style={{ fontSize: 9, color: current === id ? '#1D9E75' : (th?.textMuted || '#888'), fontWeight: current === id ? 500 : 400 }}>{label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── Sign out modal ───────────────────────────────────────────────────────────
const SignOutModal = ({ onConfirm, onCancel, th }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div style={{ background: th?.card || 'white', borderRadius: 14, padding: '24px 22px', width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: th?.text || '#1a1a1a', marginBottom: 8 }}>Sign out?</div>
      <div style={{ fontSize: 13, color: th?.textMuted || '#888', marginBottom: 22, lineHeight: 1.5 }}>You'll need to sign in again to access SpectrumTrack.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <BtnSecondary onClick={onCancel} style={{ flex: 1 }} th={th}>Cancel</BtnSecondary>
        <button onClick={onConfirm} style={{ flex: 1, background: '#E24B4A', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '9px 0' }}>Sign out</button>
      </div>
    </div>
  </div>
);

// ─── Profile dropdown ─────────────────────────────────────────────────────────
const ProfileDropdown = ({ user, navigate, darkMode, onToggleDark, onSignOutRequest, th }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const isAdmin = ['admin','bcba'].includes(user?.role);
  const menuBtn = (onClick, children, color) => (
    <button onClick={onClick} style={{ width: '100%', background: 'none', border: 'none', borderTop: `0.5px solid ${th?.borderLight || '#f0f0f0'}`, cursor: 'pointer', fontFamily: 'inherit', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: color || (th?.text || '#1a1a1a'), textAlign: 'left' }}>{children}</button>
  );
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
        <Avatar initials={getInitials(user?.name || '?')} color="green" size={30} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 38, width: 210, background: th?.card || 'white', border: `0.5px solid ${th?.border || '#e0e0e0'}`, borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.15)', zIndex: 500, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${th?.borderLight || '#f0f0f0'}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2, textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={() => { onToggleDark(); setOpen(false); }} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: th?.text || '#1a1a1a' }}>
            <span>{darkMode ? '☀️  Light mode' : '🌙  Dark mode'}</span>
            <span style={{ fontSize: 11, color: th?.textFaint || '#aaa' }}>{darkMode ? 'On' : 'Off'}</span>
          </button>
          {isAdmin && menuBtn(() => { navigate('admin'); setOpen(false); }, '🛠️  Admin panel')}
          {['admin','bcba','teacher'].includes(user?.role) && menuBtn(() => { navigate('addstudent'); setOpen(false); }, '👤  Add student')}
          {menuBtn(() => { onSignOutRequest(); setOpen(false); }, '🚪  Sign out', '#E24B4A')}
        </div>
      )}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = '') { return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
const AVATAR_COLORS = ['green', 'blue', 'amber', 'pink'];
function avatarColor(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function formatTime(ts) {
  if (!ts) return '---';
  const d = new Date(ts), now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}
function intensityColor(n) { return { 1: '#5DCAA5', 2: '#5DCAA5', 3: '#EF9F27', 4: '#E24B4A', 5: '#E24B4A' }[n] || '#888'; }

// ─── SCREEN: Login / Register + Join Code ─────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [tab,       setTab]       = useState('login');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [regEmail,  setRegEmail]  = useState('');
  const [regPw,     setRegPw]     = useState('');
  const [regPw2,    setRegPw2]    = useState('');
  const [role,      setRole]      = useState('aide');
  const [showRegPw, setShowRegPw] = useState(false);
  // Join code tab state
  const [joinCode,       setJoinCode]       = useState('');
  const [joinToken,      setJoinToken]      = useState(null); // temp token after register
  const [joinLoading,    setJoinLoading]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

  const inp = { width: '100%', padding: '11px 13px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 13, fontFamily: 'inherit', background: '#fafafa', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 11, color: '#888', display: 'block', marginBottom: 4 };

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      onLogin(data.accessToken, data.user);
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !regEmail || !regPw) { setError('All fields are required'); return; }
    if (regPw !== regPw2) { setError('Passwords do not match'); return; }
    if (regPw.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName, lastName, email: regEmail, password: regPw, role }) });
      // Auto-login to get token for join step
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: regEmail, password: regPw }) });
      setJoinToken(data.accessToken);
      setSuccess('Account created! Enter your class or student code below to get access.');
      switchTab('join');
    } catch (err) { setError(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError('Please enter a code'); return; }
    setJoinLoading(true); setError('');
    try {
      const result = await apiFetch('/api/auth/join', { method: 'POST', body: JSON.stringify({ code: joinCode }) }, joinToken);
      setSuccess(`✓ ${result.message}. Signing you in…`);
      // Re-fetch me to get updated user
      const me = await apiFetch('/api/auth/me', {}, joinToken);
      setTimeout(() => onLogin(joinToken, me), 1200);
    } catch (err) { setError(err.message || 'Invalid code'); }
    finally { setJoinLoading(false); }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'white' }}>
      <div style={{ padding: '36px 32px 24px', textAlign: 'center', borderBottom: '0.5px solid #f0f0f0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white" opacity="0.3"/><path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 600, color: '#1D9E75', letterSpacing: -0.5 }}>Spectrum<span style={{ color: '#1a1a1a' }}>Track</span></span>
        </div>
        <div style={{ fontSize: 12, color: '#aaa' }}>Track. Understand. Support.</div>
      </div>

      <div style={{ display: 'flex', margin: '20px 24px 0', background: '#f5f5f5', borderRadius: 10, padding: 3 }}>
        {['login', 'register', 'join'].map(t => (
          <button key={t} onClick={() => switchTab(t)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, background: tab === t ? 'white' : 'transparent', color: tab === t ? '#1a1a1a' : '#888', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {t === 'login' ? 'Sign in' : t === 'register' ? 'Register' : 'Join class'}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 24px 32px' }}>
        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        {tab === 'login' && (
          <>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Email address</label><input type="text" placeholder="you@school.edu" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inp} /></div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ ...inp, paddingRight: 40 }} />
                <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><EyeIcon on={showPw} /></button>
              </div>
            </div>
            <BtnPrimary onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</BtnPrimary>
          </>
        )}

        {tab === 'register' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label style={lbl}>First name</label><input type="text" placeholder="Maria" value={firstName} onChange={e => setFirstName(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Last name</label><input type="text" placeholder="Santos" value={lastName} onChange={e => setLastName(e.target.value)} style={inp} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Email address</label><input type="text" placeholder="you@school.edu" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={inp} /></div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>I am a…</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inp, background: 'white' }}>
                <option value="aide">Paraprofessional / Aide</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent / Guardian</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showRegPw ? 'text' : 'password'} placeholder="••••••••" value={regPw} onChange={e => setRegPw(e.target.value)} style={{ ...inp, paddingRight: 40 }} />
                <button onClick={() => setShowRegPw(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><EyeIcon on={showRegPw} /></button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Confirm password</label>
              <input type="password" placeholder="••••••••" value={regPw2} onChange={e => setRegPw2(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} style={{ ...inp, borderColor: regPw2 && regPw !== regPw2 ? '#E24B4A' : '#ddd' }} />
              {regPw2 && regPw !== regPw2 && <div style={{ fontSize: 11, color: '#E24B4A', marginTop: 4 }}>Passwords don't match</div>}
            </div>
            {regPw && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1,2,3].map(n => <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: regPw.length >= n * 4 ? (n === 1 ? '#EF9F27' : n === 2 ? '#5DCAA5' : '#1D9E75') : '#e0e0e0' }} />)}
                </div>
                <div style={{ fontSize: 10, color: '#aaa' }}>{regPw.length < 4 ? 'Weak' : regPw.length < 8 ? 'Fair' : 'Good'}</div>
              </div>
            )}
            <BtnPrimary onClick={handleRegister} disabled={loading || (regPw2 !== '' && regPw !== regPw2)}>{loading ? 'Creating account…' : 'Create account'}</BtnPrimary>
            <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>BCBA / admin accounts are created by your school administrator.</div>
          </>
        )}

        {tab === 'join' && (
          <>
            <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '14px', marginBottom: 16, fontSize: 12, color: '#666', lineHeight: 1.6 }}>
              Enter the <strong>class code</strong> given by your teacher (to see all students), or a <strong>student code</strong> shared by the admin (to link to a specific child as a parent).
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Your code</label>
              <input type="text" placeholder="e.g. TRK4821" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ ...inp, textTransform: 'uppercase', letterSpacing: 2, fontSize: 16, textAlign: 'center' }} />
            </div>
            <BtnPrimary onClick={handleJoin} disabled={joinLoading}>{joinLoading ? 'Verifying…' : 'Join'}</BtnPrimary>
            {joinToken && (
              <button onClick={() => { const me = apiFetch('/api/auth/me',{},joinToken).then(u => onLogin(joinToken,u)); }} style={{ marginTop: 12, background: 'none', border: 'none', fontSize: 12, color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'center' }}>
                Skip for now →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── SCREEN: Home ─────────────────────────────────────────────────────────────
const HomeScreen = ({ navigate, token, user, onSignOutRequest, darkMode, onToggleDark, th }) => {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    apiFetch('/api/students', {}, token)
      .then(setStudents).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [token]);

  function badgeColor(count) {
    if (count >= 5) return 'red'; if (count >= 2) return 'amber'; if (count === 0) return 'gray'; return 'green';
  }

  return (
    <>
      <Topbar th={th}
        left={<div><div style={{ fontSize: 17, fontWeight: 500, color: '#1D9E75', letterSpacing: -0.5 }}>Spectrum<span style={{ color: th?.text || '#1a1a1a' }}>Track</span></div><div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>{new Date().toDateString()} · {user?.name || '…'}</div></div>}
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{ cursor: 'pointer' }} onClick={() => navigate('alerts')}>
              <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke={th?.textMuted || '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <ProfileDropdown user={user} navigate={navigate} darkMode={darkMode} onToggleDark={onToggleDark} onSignOutRequest={onSignOutRequest} th={th} />
          </div>
        }
      />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        {loading ? <Spinner th={th} /> : (
          <>
            <SectionLabel mt={0} th={th}>My caseload ({students.length})</SectionLabel>
            {students.length === 0 && !error && <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '20px 0', textAlign: 'center' }}>No students assigned yet.</div>}
            {students.map(s => (
              <div key={s.id} onClick={() => navigate('student', s)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: `0.5px solid ${th?.borderLight || '#f0f0f0'}`, cursor: 'pointer' }}>
                <Avatar initials={getInitials(`${s.first_name} ${s.last_name}`)} color={avatarColor(s.id)} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                  <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>{s.last_log_time ? `Last: ${formatTime(s.last_log_time)}` : 'No logs yet'}</div>
                </div>
                <Badge color={badgeColor(s.logs_today || 0)}>{s.logs_today || 0} today</Badge>
              </div>
            ))}
            <div style={{ marginTop: 14 }}><BtnPrimary onClick={() => navigate('log')}>+ Log a behavior</BtnPrimary></div>
          </>
        )}
      </div>
      <BottomNav current="home" navigate={navigate} th={th} />
    </>
  );
};

// ─── SCREEN: Student Profile ──────────────────────────────────────────────────
const StudentScreen = ({ navigate, token, student, th }) => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!student?.id) return;
    apiFetch(`/api/logs?student_id=${student.id}&limit=5`, {}, token)
      .then(setLogs).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [student, token]);

  if (!student) return <div style={{ padding: 20, color: th?.textMuted || '#888' }}>No student selected.</div>;

  const iepGoals    = student.iep_goals      ? (typeof student.iep_goals      === 'string' ? JSON.parse(student.iep_goals)      : student.iep_goals)      : [];
  const sensory     = student.sensory_profile ? (typeof student.sensory_profile === 'string' ? JSON.parse(student.sensory_profile) : student.sensory_profile) : {};
  const reinforcers = student.reinforcers     ? (typeof student.reinforcers     === 'string' ? JSON.parse(student.reinforcers)     : student.reinforcers)     : [];
  const sensoryTags = Object.entries(sensory).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '));

  return (
    <>
      <Topbar th={th}
        left={<div><BtnBack onClick={() => navigate('home')} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>{student.first_name} {student.last_name}</div></div>}
        right={<BtnPrimary onClick={() => navigate('log', student)} style={{ width: 'auto', padding: '7px 13px', fontSize: 12 }}>+ Log</BtnPrimary>}
      />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
          <Avatar initials={getInitials(`${student.first_name} ${student.last_name}`)} color={avatarColor(student.id)} size={50} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: th?.text || '#1a1a1a' }}>
              {student.first_name} {student.last_name}
              {student.date_of_birth && <span style={{ fontWeight: 400, color: th?.textMuted || '#888' }}>, age {new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()}</span>}
            </div>
            {reinforcers.length > 0 && <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>Reinforcers: {reinforcers.join(', ')}</div>}
          </div>
        </div>
        {sensoryTags.length > 0 && (
          <>
            <SectionLabel mt={0} th={th}>Sensory profile</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {sensoryTags.map(tag => <span key={tag} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: th?.tag || '#f0f0f0', color: th?.tagText || '#666', border: `0.5px solid ${th?.tagBorder || '#e0e0e0'}`, textTransform: 'capitalize' }}>{tag}</span>)}
            </div>
          </>
        )}
        {iepGoals.length > 0 && (
          <>
            <SectionLabel mt={0} th={th}>IEP goals</SectionLabel>
            {iepGoals.map((g, i) => (
              <div key={i} style={{ borderLeft: '3px solid #1D9E75', paddingLeft: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{g.name}</div>
                {g.target && <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>{g.target}</div>}
              </div>
            ))}
          </>
        )}
        <SectionLabel mt={0} th={th}>Recent logs</SectionLabel>
        {loading ? <Spinner th={th} /> : logs.length === 0
          ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '12px 0' }}>No logs yet.</div>
          : logs.map(log => <LogItem key={log.id} time={formatTime(log.start_time)} behavior={`${log.behavior_type}${log.intensity ? ` · Intensity ${log.intensity}` : ''}`} detail={[log.antecedent, log.consequence, log.intervention_used].filter(Boolean).join(' · ')} dotColor={intensityColor(log.intensity)} th={th} />)
        }
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <BtnSecondary onClick={() => navigate('calendar', student)} style={{ width: '100%' }} th={th}>View calendar</BtnSecondary>
          <BtnSecondary onClick={() => navigate('analytics', student)} style={{ width: '100%' }} th={th}>View insights</BtnSecondary>
        </div>
      </div>
    </>
  );
};

// ─── SCREEN: Log Behavior ─────────────────────────────────────────────────────
const LogScreen = ({ navigate, token, initialStudent, th }) => {
  const [selectedStudent, setSelectedStudent] = useState(initialStudent || null);
  const [students,        setStudents]        = useState([]);
  const [selBeh,          setSelBeh]          = useState('');
  const [selInt,          setSelInt]          = useState(null);
  const [antecedent,      setAntecedent]      = useState('');
  const [consequence,     setConsequence]     = useState('');
  const [location,        setLocation]        = useState('classroom');
  const [activity,        setActivity]        = useState('');
  const [interventionUsed,    setInterventionUsed]    = useState('');
  const [interventionSuccess, setInterventionSuccess] = useState(null); // true/false/null
  const [notes,    setNotes]    = useState('');
  const [timerSecs,setTimerSecs]= useState(0);
  const [running,  setRunning]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    setSelectedStudent(initialStudent || null);
    setSelBeh(''); setSelInt(null); setAntecedent(''); setConsequence('');
    setLocation('classroom'); setActivity(''); setInterventionUsed(''); setInterventionSuccess(null);
    setNotes(''); setTimerSecs(0); setRunning(false);
  }, [initialStudent]);

  useEffect(() => {
    if (!initialStudent) apiFetch('/api/students', {}, token).then(setStudents).catch(() => {});
  }, [initialStudent, token]);

  const startTimeRef = useRef(new Date());
  const intervalRef  = useRef(null);

  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleTimerToggle = () => {
    if (!running && timerSecs === 0) startTimeRef.current = new Date();
    setRunning(r => !r);
  };
  const resetTimer = () => { setRunning(false); setTimerSecs(0); startTimeRef.current = new Date(); };
  const mins = Math.floor(timerSecs / 60), secs = timerSecs % 60;

  const behaviors = [
    { id: 'aggression',  icon: '⚡', label: 'Aggression' },
    { id: 'elopement',   icon: '🚪', label: 'Elopement' },
    { id: 'stimming',    icon: '🔄', label: 'Stimming' },
    { id: 'shutdown',    icon: '💤', label: 'Shutdown' },
    { id: 'self_injury', icon: '🛑', label: 'Self-injury' },
    { id: 'other',       icon: '+',  label: 'Other' },
  ];

  const interventionOptions = [
    'Sensory break', 'Verbal redirect', 'First/Then board', 'Visual schedule',
    'Calm-down corner', 'Deep pressure', 'Token economy', 'Choice board',
    'Time-out', 'Guided back', 'Ignored', 'Praise/reinforcement',
  ];

  const intColors  = ['','#085041','#633806','#712B13','#791F1F','#501313'];
  const intBgs     = ['','#E1F5EE','#FAEEDA','#FAECE7','#FCEBEB','#FCEBEB'];
  const intBorders = ['','#9FE1CB','#FAC775','#F0997B','#F09595','#E24B4A'];

  const sel = { padding: '9px 11px', borderRadius: 8, border: `0.5px solid ${th?.inputBorder || '#ddd'}`, fontSize: 13, fontFamily: 'inherit', background: th?.input || '#fafafa', color: th?.text || '#1a1a1a', width: '100%' };

  const handleSave = async () => {
    if (!selBeh) { setError('Please select a behavior type'); return; }
    if (!selectedStudent?.id) { setError('No student selected'); return; }
    setLoading(true); setError('');
    try {
      const endTime = running ? new Date() : (timerSecs > 0 ? new Date(startTimeRef.current.getTime() + timerSecs * 1000) : null);
      await apiFetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudent.id, behavior_type: selBeh, intensity: selInt,
          start_time: startTimeRef.current.toISOString(), end_time: endTime?.toISOString() || null,
          antecedent: antecedent || null, consequence: consequence || null,
          location: location || null, activity: activity || null,
          intervention_used: interventionUsed || null,
          intervention_successful: interventionSuccess,
          notes: notes || null,
        }),
      }, token);
      navigate('saved', selectedStudent);
    } catch (err) { setError(err.message || 'Failed to save log'); }
    finally { setLoading(false); }
  };

  const handleBack = () => {
    if (initialStudent) navigate('student', initialStudent);
    else if (selectedStudent) { setSelectedStudent(null); setSelBeh(''); setSelInt(null); setAntecedent(''); setConsequence(''); setLocation('classroom'); setActivity(''); setInterventionUsed(''); setInterventionSuccess(null); setNotes(''); setTimerSecs(0); setRunning(false); }
    else navigate('home');
  };

  return (
    <>
      <Topbar th={th}
        left={<div><BtnBack onClick={handleBack} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Log behavior</div></div>}
        right={selectedStudent && <span style={{ fontSize: 11, color: '#1D9E75' }}>{selectedStudent.first_name} {selectedStudent.last_name}</span>}
      />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        {!selectedStudent && (
          <>
            <SectionLabel mt={0} th={th}>Select student</SectionLabel>
            {students.length === 0 ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '12px 0' }}>No students assigned yet.</div>
              : students.map(s => (
                <div key={s.id} onClick={() => { setSelectedStudent(s); startTimeRef.current = new Date(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: `0.5px solid ${th?.borderLight || '#f0f0f0'}`, cursor: 'pointer' }}>
                  <Avatar initials={getInitials(`${s.first_name} ${s.last_name}`)} color={avatarColor(s.id)} size={36} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                </div>
              ))}
          </>
        )}

        {selectedStudent && (
          <>
            <SectionLabel mt={0} th={th}>Behavior type</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 14 }}>
              {behaviors.map(b => (
                <button key={b.id} onClick={() => setSelBeh(b.id)} style={{ padding: '11px 6px', borderRadius: 8, border: `1.5px solid ${selBeh === b.id ? '#1D9E75' : (th?.border || '#e0e0e0')}`, background: selBeh === b.id ? '#E1F5EE' : (th?.surface || 'white'), cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 500, color: selBeh === b.id ? '#0F6E56' : (th?.text || '#1a1a1a'), fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 16, display: 'block', marginBottom: 3 }}>{b.icon}</span>{b.label}
                </button>
              ))}
            </div>

            <SectionLabel mt={0} th={th}>Duration timer</SectionLabel>
            <div style={{ background: th?.surface || '#f9f9f9', borderRadius: 8, padding: 12, textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: 2, marginBottom: 8, color: th?.text || '#1a1a1a' }}>{mins}:{secs < 10 ? '0' : ''}{secs}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <BtnSecondary onClick={handleTimerToggle} style={{ padding: '7px 18px', fontSize: 12 }} th={th}>{running ? 'Stop' : timerSecs > 0 ? 'Resume' : 'Start'}</BtnSecondary>
                <BtnSecondary onClick={resetTimer} style={{ padding: '7px 14px', fontSize: 12 }} th={th}>Reset</BtnSecondary>
              </div>
            </div>

            <SectionLabel mt={0} th={th}>Intensity (1–5)</SectionLabel>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setSelInt(n)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1.5px solid ${selInt === n ? intBorders[n] : (th?.border || '#e0e0e0')}`, background: selInt === n ? intBgs[n] : 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: selInt === n ? intColors[n] : (th?.textMuted || '#888'), fontFamily: 'inherit' }}>{n}</button>
              ))}
            </div>

            <SectionLabel mt={0} th={th}>Antecedent &amp; location</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
              <select value={antecedent} onChange={e => setAntecedent(e.target.value)} style={sel}>
                <option value="">-- Trigger --</option>
                <option value="transition">Transition</option>
                <option value="task_demand">Task demand</option>
                <option value="loud_noise">Loud noise</option>
                <option value="unexpected_change">Unexpected change</option>
                <option value="sensory_overload">Sensory overload</option>
                <option value="peer_conflict">Peer conflict</option>
              </select>
              <select value={location} onChange={e => setLocation(e.target.value)} style={sel}>
                <option value="classroom">Classroom</option>
                <option value="hallway">Hallway</option>
                <option value="cafeteria">Cafeteria</option>
                <option value="playground">Playground</option>
                <option value="therapy_room">Therapy room</option>
              </select>
            </div>

            <SectionLabel mt={0} th={th}>Consequence &amp; activity</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
              <select value={consequence} onChange={e => setConsequence(e.target.value)} style={sel}>
                <option value="">-- Consequence --</option>
                <option value="sensory_break">Sensory break given</option>
                <option value="verbal_redirect">Verbal redirect</option>
                <option value="ignored">Ignored</option>
                <option value="first_then_board">First/Then board</option>
                <option value="time_out">Time-out</option>
                <option value="guided_back">Guided back</option>
              </select>
              <select value={activity} onChange={e => setActivity(e.target.value)} style={sel}>
                <option value="">-- Activity --</option>
                <option value="math">Math</option>
                <option value="reading">Reading</option>
                <option value="circle_time">Circle time</option>
                <option value="recess">Recess</option>
                <option value="lunch">Lunch</option>
                <option value="art">Art</option>
              </select>
            </div>

            <SectionLabel mt={0} th={th}>Intervention used</SectionLabel>
            <select value={interventionUsed} onChange={e => setInterventionUsed(e.target.value)} style={{ ...sel, marginBottom: 10 }}>
              <option value="">-- None / select --</option>
              {interventionOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            {interventionUsed && (
              <>
                <SectionLabel mt={0} th={th}>Was it successful?</SectionLabel>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[{ v: true, label: '✓ Yes', color: '#1D9E75', bg: '#E1F5EE', border: '#9FE1CB' }, { v: false, label: '✗ No', color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setInterventionSuccess(interventionSuccess === opt.v ? null : opt.v)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1.5px solid ${interventionSuccess === opt.v ? opt.border : (th?.border || '#e0e0e0')}`, background: interventionSuccess === opt.v ? opt.bg : 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: interventionSuccess === opt.v ? opt.color : (th?.textMuted || '#888'), fontFamily: 'inherit' }}>{opt.label}</button>
                  ))}
                </div>
              </>
            )}

            <SectionLabel mt={0} th={th}>Notes</SectionLabel>
            <textarea placeholder="Type notes here…" value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 14, background: th?.input || '#fafafa', color: th?.text || '#1a1a1a', border: `0.5px solid ${th?.inputBorder || '#ddd'}` }} />
            <BtnPrimary onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save behavior log'}</BtnPrimary>
          </>
        )}
      </div>
    </>
  );
};

// ─── SCREEN: Saved ────────────────────────────────────────────────────────────
const SavedScreen = ({ navigate, student, th }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', background: th?.bg || 'white' }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
    <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8, color: th?.text || '#1a1a1a' }}>Behavior logged</div>
    <div style={{ fontSize: 13, color: th?.textMuted || '#888', lineHeight: 1.6, marginBottom: 24 }}>{student ? `Entry saved to ${student.first_name}'s timeline.` : 'Entry saved.'}</div>
    {student && <BtnPrimary onClick={() => navigate('student', student)} style={{ marginBottom: 9 }}>View {student.first_name}'s profile</BtnPrimary>}
    <BtnSecondary onClick={() => navigate('home')} style={{ width: '100%' }} th={th}>Back to caseload</BtnSecondary>
  </div>
);

// ─── SCREEN: Analytics ────────────────────────────────────────────────────────
const AnalyticsScreen = ({ navigate, token, student, th }) => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [range,   setRange]   = useState('7');

  useEffect(() => {
    if (!student?.id) { setLoading(false); return; }
    apiFetch(`/api/logs?student_id=${student.id}&limit=200`, {}, token)
      .then(setLogs).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [student, token]);

  const cutoff   = new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000);
  const filtered = logs.filter(l => new Date(l.start_time) >= cutoff);
  const counts   = filtered.reduce((acc, l) => { acc[l.behavior_type] = (acc[l.behavior_type] || 0) + 1; return acc; }, {});
  const sorted   = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] || 1;
  const bColors  = { aggression: '#E24B4A', elopement: '#EF9F27', stimming: '#5DCAA5', shutdown: '#378ADD', self_injury: '#9B59B6', other: '#888' };

  return (
    <>
      <Topbar th={th} title="Insights" subtitle={student ? `${student.first_name} ${student.last_name} · Last ${range} days` : 'Select a student'}
        right={<select value={range} onChange={e => setRange(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '4px 8px', background: th?.input || 'white', color: th?.text || '#1a1a1a', border: `0.5px solid ${th?.inputBorder || '#ddd'}`, borderRadius: 6 }}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select>}
      />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        {loading ? <Spinner th={th} /> : !student
          ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '20px 0', textAlign: 'center' }}>Go to a student profile and tap "View insights".</div>
          : <>
            <StatGrid>
              <StatCard number={filtered.length} label={`Incidents (${range}d)`} th={th} />
              <StatCard number={sorted[0]?.[0] || '—'} label="Top behavior" numberColor="#A32D2D" th={th} />
              <StatCard number={filtered.filter(l => l.intervention_successful).length} label="Successful interventions" numberColor="#1D9E75" th={th} />
              <StatCard number={filtered.filter(l => l.intensity >= 4).length} label="High intensity (4–5)" numberColor="#854F0B" th={th} />
            </StatGrid>
            <SectionLabel mt={0} th={th}>Behavior breakdown</SectionLabel>
            {sorted.length === 0
              ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '12px 0' }}>No incidents in this period.</div>
              : sorted.map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: th?.textMuted || '#888', width: 80, flexShrink: 0, textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</span>
                  <div style={{ flex: 1, height: 7, background: th?.surface || '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, borderRadius: 4, background: bColors[type] || '#888' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, width: 20, textAlign: 'right', color: th?.text || '#1a1a1a' }}>{count}</span>
                </div>
              ))
            }
            <div style={{ marginTop: 14 }}><BtnPrimary onClick={() => navigate('interventions', student)}>View intervention tracker</BtnPrimary></div>
          </>
        }
      </div>
      <BottomNav current="analytics" navigate={navigate} th={th} />
    </>
  );
};

// ─── SCREEN: Interventions ────────────────────────────────────────────────────
const InterventionsScreen = ({ navigate, token, student, th }) => {
  const [tab,     setTab]     = useState('eff');
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!student?.id) { setLoading(false); return; }
    apiFetch(`/api/logs?student_id=${student.id}&limit=200`, {}, token)
      .then(setLogs).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [student, token]);

  const strategyMap = {};
  logs.filter(l => l.intervention_used).forEach(l => {
    if (!strategyMap[l.intervention_used]) strategyMap[l.intervention_used] = { used: 0, successful: 0 };
    strategyMap[l.intervention_used].used++;
    if (l.intervention_successful) strategyMap[l.intervention_used].successful++;
  });
  const strategies = Object.entries(strategyMap)
    .map(([name, { used, successful }]) => ({ name, used, rate: Math.round((successful / used) * 100) }))
    .sort((a, b) => b.rate - a.rate);

  function rateColor(r) { if (r >= 60) return 'green'; if (r >= 40) return 'amber'; return 'red'; }
  const barColor = { green: '#1D9E75', amber: '#EF9F27', red: '#E24B4A' };

  return (
    <>
      <Topbar th={th} left={<div><BtnBack onClick={() => navigate('analytics', student)} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Intervention strategies</div></div>} />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        <div style={{ display: 'flex', border: `0.5px solid ${th?.border || '#e0e0e0'}`, borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
          {['eff','ab'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 8, background: tab === t ? '#1D9E75' : 'none', border: 'none', fontSize: 12, fontWeight: 500, color: tab === t ? 'white' : (th?.textMuted || '#888'), cursor: 'pointer', fontFamily: 'inherit' }}>
              {t === 'eff' ? 'Effectiveness' : 'A/B test'}
            </button>
          ))}
        </div>
        {tab === 'eff' && (
          <>
            <SectionLabel mt={0} th={th}>Ranked by success rate</SectionLabel>
            {loading ? <Spinner th={th} /> : strategies.length === 0
              ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '12px 0' }}>No intervention data yet. Log behaviors with an intervention selected to see effectiveness.</div>
              : strategies.map(s => {
                const rc = rateColor(s.rate);
                return (
                  <div key={s.name} style={{ border: `0.5px solid ${th?.border || '#e8e8e8'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, background: th?.card || 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{s.name}</div>
                      <Badge color={rc}>{s.rate}%</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>Used {s.used}x</div>
                    <div style={{ height: 6, background: th?.surface || '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ height: '100%', width: `${s.rate}%`, borderRadius: 4, background: barColor[rc] }} />
                    </div>
                  </div>
                );
              })
            }
          </>
        )}
        {tab === 'ab' && (
          <>
            <SectionLabel mt={0} th={th}>A/B comparison (top 2 strategies)</SectionLabel>
            {strategies.length < 2
              ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '12px 0' }}>Need at least 2 different interventions logged.</div>
              : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
                {strategies.slice(0, 2).map((s, i) => (
                  <Card key={s.name} style={{ border: i === 0 ? '1.5px solid #1D9E75' : undefined, marginBottom: 0 }} th={th}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: i === 0 ? '#1D9E75' : (th?.textMuted || '#888'), marginBottom: 6 }}>Strategy {i === 0 ? 'A (best)' : 'B'}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{s.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: i === 0 ? '#1D9E75' : '#EF9F27', margin: '6px 0' }}>{s.rate}%</div>
                    <div style={{ fontSize: 11, color: th?.textMuted || '#888' }}>Used {s.used}x</div>
                  </Card>
                ))}
              </div>
            }
          </>
        )}
      </div>
      <BottomNav current="interventions" navigate={navigate} th={th} />
    </>
  );
};

// ─── SCREEN: Family / Parent view ─────────────────────────────────────────────
const ParentScreen = ({ navigate, token, student: initialStudent, th }) => {
  const [students,       setStudents]       = useState([]);
  const [student,        setStudent]        = useState(initialStudent || null);
  const [logs,           setLogs]           = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [studentsLoading,setStudentsLoading]= useState(true);
  const [error,          setError]          = useState('');

  // Load student list so family can pick directly
  useEffect(() => {
    apiFetch('/api/students', {}, token)
      .then(setStudents).catch(() => {}).finally(() => setStudentsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!student?.id) return;
    setLoading(true);
    apiFetch(`/api/logs?student_id=${student.id}&limit=50`, {}, token)
      .then(setLogs).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [student, token]);

  const today    = new Date().toDateString();
  const todayLogs= logs.filter(l => new Date(l.start_time).toDateString() === today);
  const weekAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekLogs = logs.filter(l => new Date(l.start_time) >= weekAgo);
  const bestIntervention = (() => {
    const map = {};
    logs.filter(l => l.intervention_used && l.intervention_successful).forEach(l => { map[l.intervention_used] = (map[l.intervention_used] || 0) + 1; });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  })();

  return (
    <>
      <Topbar th={th} title="Family view" subtitle={student ? `${student.first_name} ${student.last_name} · Read-only` : 'Select a student'} />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />

        {/* Student picker */}
        {!student && (
          <>
            <SectionLabel mt={0} th={th}>Select a student</SectionLabel>
            {studentsLoading ? <Spinner th={th} /> : students.length === 0
              ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '12px 0' }}>No students available. Use a student code to get access.</div>
              : students.map(s => (
                <div key={s.id} onClick={() => setStudent(s)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: `0.5px solid ${th?.borderLight || '#f0f0f0'}`, cursor: 'pointer' }}>
                  <Avatar initials={getInitials(`${s.first_name} ${s.last_name}`)} color={avatarColor(s.id)} size={40} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                    <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>{s.logs_today || 0} incidents today</div>
                  </div>
                </div>
              ))
            }
          </>
        )}

        {student && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Avatar initials={getInitials(`${student.first_name} ${student.last_name}`)} color={avatarColor(student.id)} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{student.first_name} {student.last_name}</div>
              </div>
              <BtnSecondary onClick={() => setStudent(null)} style={{ fontSize: 11, padding: '5px 10px' }} th={th}>Change</BtnSecondary>
            </div>
            <SectionLabel mt={0} th={th}>Today's summary</SectionLabel>
            <Card th={th}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: th?.text || '#1a1a1a' }}>{new Date().toDateString()}</div>
              {[
                { label: 'Total incidents', value: String(todayLogs.length) },
                { label: 'Best strategy today', value: bestIntervention ? <span style={{ color: '#1D9E75', fontWeight: 500 }}>{bestIntervention}</span> : '—' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < 1 ? `0.5px solid ${th?.borderLight || '#f0f0f0'}` : 'none' }}>
                  <span style={{ fontSize: 13, color: th?.textMuted || '#888' }}>{r.label}</span>
                  <span style={{ fontSize: 13, color: th?.text || '#1a1a1a' }}>{r.value}</span>
                </div>
              ))}
            </Card>
            {bestIntervention && (
              <>
                <SectionLabel mt={0} th={th}>Reinforcement tip for home</SectionLabel>
                <Card style={{ background: th?.surface }} th={th}>
                  <div style={{ fontSize: 13, color: th?.text || '#1a1a1a', lineHeight: 1.6 }}>
                    {student.first_name} responded well to <span style={{ fontWeight: 500, color: '#1D9E75' }}>{bestIntervention}</span> recently. Try using this at home too.
                  </div>
                </Card>
              </>
            )}
            <SectionLabel mt={0} th={th}>This week at a glance</SectionLabel>
            <StatGrid>
              <StatCard number={weekLogs.length} label="Total incidents" th={th} />
              <StatCard number={weekLogs.filter(l => l.intervention_successful).length} label="Successful interventions" numberColor="#1D9E75" th={th} />
            </StatGrid>
          </>
        )}
      </div>
      <BottomNav current="parent" navigate={navigate} th={th} />
    </>
  );
};

// ─── SCREEN: Share / Codes ────────────────────────────────────────────────────
const ShareScreen = ({ navigate, token, user, th }) => {
  const [codes,   setCodes]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState('');
  const isAdmin = ['admin','bcba'].includes(user?.role);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    apiFetch('/api/auth/codes', {}, token)
      .then(setCodes).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [token, isAdmin]);

  const copyCode = (code, label) => {
    navigator.clipboard.writeText(code).then(() => { setCopied(label); setTimeout(() => setCopied(''), 2000); });
  };

  // QR placeholder — a simple grid pattern suggesting a QR code
  const QRPlaceholder = ({ code }) => (
    <div style={{ display: 'inline-block', background: 'white', padding: 10, borderRadius: 8, border: '0.5px solid #e0e0e0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,8px)', gap: 1 }}>
        {Array.from({ length: 49 }).map((_, i) => {
          const isCorner = (r => (r < 2 || r > 4) && ([0,1,5,6].includes(i % 7)))(Math.floor(i / 7));
          const seed = (i * 13 + code.charCodeAt(i % code.length)) % 3;
          return <div key={i} style={{ width: 8, height: 8, background: isCorner || seed === 0 ? '#1a1a1a' : 'white', borderRadius: 1 }} />;
        })}
      </div>
      <div style={{ fontSize: 10, textAlign: 'center', marginTop: 6, letterSpacing: 2, fontWeight: 600, color: '#1a1a1a' }}>{code}</div>
    </div>
  );

  return (
    <>
      <Topbar th={th} title="Share access" subtitle="Codes for teachers & parents" />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        {!isAdmin ? (
          <div style={{ background: th?.surface || '#f9f9f9', borderRadius: 10, padding: 16, fontSize: 13, color: th?.textMuted || '#888', lineHeight: 1.6 }}>
            Ask your admin or BCBA for the class code (teachers) or your child's student code (parents), then go to <strong>Sign in → Join class</strong> to enter it.
          </div>
        ) : loading ? <Spinner th={th} /> : (
          <>
            {/* Class / Teacher code */}
            <SectionLabel mt={0} th={th}>Teacher / class code</SectionLabel>
            <Card th={th} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: th?.textMuted || '#888', marginBottom: 12 }}>Share this with teachers — gives access to all students</div>
              {codes?.classCode ? (
                <>
                  <QRPlaceholder code={codes.classCode} />
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <BtnSecondary onClick={() => copyCode(codes.classCode, 'class')} style={{ fontSize: 12, padding: '6px 14px' }} th={th}>
                      {copied === 'class' ? '✓ Copied!' : 'Copy code'}
                    </BtnSecondary>
                  </div>
                </>
              ) : <div style={{ color: th?.textMuted || '#888', fontSize: 13 }}>No class code set. Run the migration SQL to generate one.</div>}
            </Card>

            {/* Per-student parent codes */}
            <SectionLabel mt={0} th={th}>Student codes (for parents)</SectionLabel>
            {codes?.students?.length === 0
              ? <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '12px 0' }}>No students yet.</div>
              : codes?.students?.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: `0.5px solid ${th?.borderLight || '#f0f0f0'}` }}>
                  <Avatar initials={getInitials(`${s.first_name} ${s.last_name}`)} color={avatarColor(s.id)} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: th?.text || '#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                    <div style={{ fontSize: 12, letterSpacing: 2, color: '#1D9E75', fontWeight: 600, marginTop: 2 }}>{s.parent_code || '—'}</div>
                  </div>
                  {s.parent_code && (
                    <BtnSecondary onClick={() => copyCode(s.parent_code, `student-${s.id}`)} style={{ fontSize: 11, padding: '5px 10px' }} th={th}>
                      {copied === `student-${s.id}` ? '✓' : 'Copy'}
                    </BtnSecondary>
                  )}
                </div>
              ))
            }
          </>
        )}
      </div>
      <BottomNav current="share" navigate={navigate} th={th} />
    </>
  );
};

// ─── SCREEN: Calendar ─────────────────────────────────────────────────────────
const CalendarScreen = ({ navigate, token, student, th }) => {
  const [logs,         setLogs]         = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (!student?.id) { setLoading(false); return; }
    apiFetch(`/api/logs?student_id=${student.id}&limit=500`, {}, token)
      .then(setLogs).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [student, token]);

  const now = new Date(), year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
  const countsByDate = logs.reduce((acc, l) => { const d = new Date(l.start_time).toDateString(); acc[d] = (acc[d] || 0) + 1; return acc; }, {});
  const selectedLogs = selectedDate ? logs.filter(l => new Date(l.start_time).toDateString() === selectedDate.toDateString()) : [];

  const dayCells = [];
  for (let i = 0; i < firstDay; i++) dayCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) dayCells.push(new Date(year, month, d));

  function dayType(d) {
    if (!d) return 'empty';
    const count = countsByDate[d.toDateString()] || 0;
    if (count === 0) return 'none'; if (count >= 4) return 'high'; return 'has';
  }
  const dayBg    = { empty: 'transparent', none: 'transparent', has: '#E1F5EE', high: '#FCEBEB' };
  const dayColor = { empty: 'transparent', none: th?.textFaint || '#ccc', has: '#085041', high: '#791F1F' };

  return (
    <>
      <Topbar th={th} left={<div><BtnBack onClick={() => navigate('student', student)} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Calendar — {now.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div></div>} />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        {loading ? <Spinner th={th} /> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: 10, color: th?.textMuted || '#888', textAlign: 'center', padding: '3px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 12 }}>
              {dayCells.map((d, i) => {
                const type = dayType(d);
                const isToday = d && d.toDateString() === now.toDateString();
                const isSel   = d && selectedDate && d.toDateString() === selectedDate.toDateString();
                return (
                  <div key={i} onClick={() => d && type !== 'none' && setSelectedDate(d)} style={{ height: 34, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: d && type !== 'none' ? 'pointer' : 'default', background: dayBg[type], fontSize: 12, color: dayColor[type], fontWeight: (type !== 'empty' && type !== 'none') ? 500 : 400, border: isSel ? '1.5px solid #1D9E75' : isToday ? `1.5px solid ${th?.textMuted || '#aaa'}` : 'none' }}>
                    {d?.getDate()}
                    {(type === 'has' || type === 'high') && <div style={{ width: 4, height: 4, borderRadius: '50%', background: type === 'high' ? '#E24B4A' : '#1D9E75', marginTop: 1 }} />}
                  </div>
                );
              })}
            </div>
            {selectedDate && (
              <>
                <SectionLabel mt={0} th={th}>Selected: {selectedDate.toLocaleDateString([], { month: 'long', day: 'numeric' })}</SectionLabel>
                {selectedLogs.length === 0
                  ? <div style={{ fontSize: 13, color: th?.textMuted || '#888' }}>No logs for this day.</div>
                  : selectedLogs.map(log => <LogItem key={log.id} time={formatTime(log.start_time)} behavior={`${log.behavior_type}${log.intensity ? ` · Intensity ${log.intensity}` : ''}`} detail={[log.antecedent, log.consequence].filter(Boolean).join(' · ')} dotColor={intensityColor(log.intensity)} th={th} />)
                }
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ─── SCREEN: Alerts ───────────────────────────────────────────────────────────
const AlertsScreen = ({ navigate, token, user, th }) => {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const loadAlerts = useCallback(() => {
    apiFetch('/api/alerts', {}, token).then(setAlerts).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const toggleAlert = async (alert) => {
    try {
      await apiFetch(`/api/alerts/${alert.id}`, { method: 'PATCH', body: JSON.stringify({ active: !alert.active }) }, token);
      loadAlerts();
    } catch (err) { setError(err.message); }
  };

  const active = alerts.filter(a => a.active), paused = alerts.filter(a => !a.active);

  return (
    <>
      <Topbar th={th} left={<div><BtnBack onClick={() => navigate('home')} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Alert rules</div></div>} />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        {loading ? <Spinner th={th} /> : (
          <>
            <SectionLabel mt={0} th={th}>Active rules ({active.length})</SectionLabel>
            {active.length === 0 && <div style={{ fontSize: 13, color: th?.textMuted || '#888', padding: '8px 0' }}>No active alert rules.</div>}
            {active.map(a => {
              const cond = a.rule_condition || {}, action = a.rule_action || {};
              return (
                <div key={a.id} style={{ borderLeft: '3px solid #E24B4A', paddingLeft: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize', color: th?.text || '#1a1a1a' }}>{(cond.behavior || 'Alert').replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 11, color: th?.textMuted || '#888', marginTop: 2 }}>{cond.threshold && `≥${cond.threshold} incidents in ${cond.window_minutes || 60} min → notify ${action.notify_role || 'team'}`}</div>
                      {a.last_triggered && <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>Last triggered: {formatTime(a.last_triggered)}</div>}
                    </div>
                    <Badge color="green">Active</Badge>
                  </div>
                  <BtnSecondary style={{ fontSize: 11, padding: '5px 11px' }} onClick={() => toggleAlert(a)} th={th}>Disable</BtnSecondary>
                </div>
              );
            })}
            {paused.length > 0 && (
              <>
                <SectionLabel mt={0} th={th}>Paused ({paused.length})</SectionLabel>
                {paused.map(a => {
                  const cond = a.rule_condition || {};
                  return (
                    <div key={a.id} style={{ opacity: 0.6, borderLeft: '3px solid #888', paddingLeft: 10, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize', color: th?.text || '#1a1a1a' }}>{(cond.behavior || 'Alert').replace(/_/g, ' ')}</div>
                        <Badge color="gray">Paused</Badge>
                      </div>
                      <BtnSecondary style={{ fontSize: 11, padding: '5px 11px' }} onClick={() => toggleAlert(a)} th={th}>Enable</BtnSecondary>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ─── SCREEN: Add Student ──────────────────────────────────────────────────────
const AddStudentScreen = ({ navigate, token, user, th }) => {
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [dob,         setDob]         = useState('');
  const [commLevel,   setCommLevel]   = useState('');
  const [reinforcers, setReinforcers] = useState('');
  const [sensory,     setSensory]     = useState([]);
  const [iepGoals,    setIepGoals]    = useState([{ name: '', target: '' }]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const sensoryOptions = ['Auditory sensitivity','Tactile avoidance','Visual overstimulation','Proprioceptive seeking','Vestibular seeking','Oral sensitivity'];
  const toggleSensory  = (s) => setSensory(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const addGoal        = () => setIepGoals(g => [...g, { name: '', target: '' }]);
  const updateGoal     = (i, field, val) => setIepGoals(g => g.map((goal, idx) => idx === i ? { ...goal, [field]: val } : goal));
  const removeGoal     = (i) => setIepGoals(g => g.filter((_, idx) => idx !== i));

  const canAdd = ['admin','teacher','bcba'].includes(user?.role);
  if (!canAdd) return (
    <>
      <Topbar th={th} left={<div><BtnBack onClick={() => navigate('home')} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Add student</div></div>} />
      <div className="scroll" style={{ background: th?.bg }}><div style={{ background:'#FCEBEB', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#A32D2D' }}>Only admins, teachers, and BCBAs can add students.</div></div>
    </>
  );

  const handleSave = async () => {
    if (!firstName || !lastName) { setError('First and last name are required'); return; }
    setLoading(true); setError('');
    try {
      const sensoryProfile = {};
      sensoryOptions.forEach(s => { sensoryProfile[s.toLowerCase().replace(/ /g,'_')] = sensory.includes(s); });
      const reinforcerList = reinforcers.split(',').map(r => r.trim()).filter(Boolean);
      const goals          = iepGoals.filter(g => g.name.trim());
      const student        = await apiFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim(), date_of_birth: dob || null, reinforcers: reinforcerList, sensory_profile: sensoryProfile, iep_goals: goals }),
      }, token);
      navigate('student', student);
    } catch (err) { setError(err.message || 'Failed to add student'); }
    finally { setLoading(false); }
  };

  const inp = { width:'100%', padding:'9px 11px', borderRadius:8, border:`0.5px solid ${th?.inputBorder || '#ddd'}`, fontSize:13, fontFamily:'inherit', outline:'none', background: th?.input || '#fafafa', color: th?.text || '#1a1a1a' };
  const lbl = { fontSize:11, color: th?.textMuted || '#888', display:'block', marginBottom:4 };

  return (
    <>
      <Topbar th={th} left={<div><BtnBack onClick={() => navigate('home')} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Add student</div></div>} />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        <SectionLabel mt={0} th={th}>Basic info</SectionLabel>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
          <div><label style={lbl}>First name *</label><input type="text" placeholder="Emma" value={firstName} onChange={e => setFirstName(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Last name *</label><input type="text" placeholder="Johnson" value={lastName} onChange={e => setLastName(e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginBottom:10 }}><label style={lbl}>Date of birth</label><input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inp} /></div>
        <div style={{ marginBottom:10 }}>
          <label style={lbl}>Communication level</label>
          <select value={commLevel} onChange={e => setCommLevel(e.target.value)} style={{ ...inp, background: th?.card || 'white' }}>
            <option value="">-- Select --</option>
            <option value="Verbal">Verbal</option>
            <option value="Limited verbal">Limited verbal</option>
            <option value="AAC device">AAC device</option>
            <option value="Sign language">Sign language</option>
            <option value="Non-verbal">Non-verbal</option>
          </select>
        </div>
        <div style={{ marginBottom:14 }}><label style={lbl}>Reinforcers (comma separated)</label><input type="text" placeholder="fidget toys, music, stickers" value={reinforcers} onChange={e => setReinforcers(e.target.value)} style={inp} /></div>
        <SectionLabel mt={0} th={th}>Sensory profile</SectionLabel>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
          {sensoryOptions.map(s => <button key={s} onClick={() => toggleSensory(s)} style={{ fontSize:11, padding:'5px 10px', borderRadius:20, cursor:'pointer', fontFamily:'inherit', background: sensory.includes(s) ? '#E1F5EE' : (th?.tag || '#f5f5f5'), color: sensory.includes(s) ? '#0F6E56' : (th?.tagText || '#666'), border: sensory.includes(s) ? '1px solid #9FE1CB' : `0.5px solid ${th?.tagBorder || '#e0e0e0'}` }}>{s}</button>)}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, marginTop:14 }}>
          <SectionLabel mt={0} th={th}>IEP goals</SectionLabel>
          <button onClick={addGoal} style={{ fontSize:11, color:'#1D9E75', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>+ Add goal</button>
        </div>
        {iepGoals.map((goal, i) => (
          <div key={i} style={{ border:`0.5px solid ${th?.border || '#e8e8e8'}`, borderRadius:10, padding:'10px 12px', marginBottom:8, background: th?.card || 'white' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, color: th?.textMuted || '#888' }}>Goal {i+1}</span>
              {iepGoals.length > 1 && <button onClick={() => removeGoal(i)} style={{ fontSize:11, color:'#A32D2D', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Remove</button>}
            </div>
            <input type="text" placeholder="e.g. Reduce elopement" value={goal.name} onChange={e => updateGoal(i,'name',e.target.value)} style={{ ...inp, marginBottom:6 }} />
            <input type="text" placeholder="Target: ≤2x/day" value={goal.target} onChange={e => updateGoal(i,'target',e.target.value)} style={inp} />
          </div>
        ))}
        <div style={{ marginTop:16 }}><BtnPrimary onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Add student'}</BtnPrimary></div>
      </div>
    </>
  );
};

// ─── SCREEN: Admin Panel ──────────────────────────────────────────────────────
const AdminScreen = ({ navigate, token, user, th }) => {
  const [students, setStudents] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [tab,      setTab]      = useState('students');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const isAdmin = ['admin','bcba'].includes(user?.role);

  // Hooks always called — role check only affects rendering
  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    Promise.all([
      apiFetch('/api/students/all', {}, token),
      apiFetch('/api/users', {}, token),
    ]).then(([s, u]) => { setStudents(s); setUsers(u); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, isAdmin]);

  const deleteStudent = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/students/${id}`, { method: 'DELETE' }, token);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err) { setError(err.message); }
  };

  if (!isAdmin) return (
    <>
      <Topbar th={th} left={<div><BtnBack onClick={() => navigate('home')} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Admin panel</div></div>} />
      <div className="scroll" style={{ background: th?.bg }}><div style={{ background:'#FCEBEB', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#A32D2D' }}>Admin access only.</div></div>
    </>
  );

  return (
    <>
      <Topbar th={th}
        left={<div><BtnBack onClick={() => navigate('home')} th={th} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: th?.text || '#1a1a1a' }}>Admin panel</div></div>}
        right={<BtnPrimary onClick={() => navigate('addstudent')} style={{ width:'auto', padding:'7px 13px', fontSize:12 }}>+ Student</BtnPrimary>}
      />
      <div className="scroll" style={{ background: th?.bg }}>
        <ErrorBanner message={error} />
        <div style={{ display:'flex', border:`0.5px solid ${th?.border || '#e0e0e0'}`, borderRadius:8, overflow:'hidden', marginBottom:14 }}>
          {['students','users'].map(t => <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:8, background: tab===t ? '#1D9E75' : 'none', border:'none', fontSize:12, fontWeight:500, color: tab===t ? 'white' : (th?.textMuted || '#888'), cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{t}</button>)}
        </div>
        {loading ? <Spinner th={th} /> : tab === 'students' ? (
          <>
            <SectionLabel mt={0} th={th}>All students ({students.length})</SectionLabel>
            {students.length === 0 && <div style={{ fontSize:13, color: th?.textMuted || '#888', padding:'12px 0' }}>No students yet.</div>}
            {students.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:`0.5px solid ${th?.borderLight || '#f0f0f0'}` }}>
                <Avatar initials={getInitials(`${s.first_name} ${s.last_name}`)} color={avatarColor(s.id)} size={38} />
                <div style={{ flex:1, cursor:'pointer' }} onClick={() => navigate('student', s)}>
                  <div style={{ fontSize:14, fontWeight:500, color: th?.text || '#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                  <div style={{ fontSize:11, color: th?.textMuted || '#888', marginTop:2 }}>{s.logs_today || 0} logs today · Code: <span style={{ color:'#1D9E75', fontWeight:600 }}>{s.parent_code || '—'}</span></div>
                </div>
                <button onClick={() => deleteStudent(s.id, `${s.first_name} ${s.last_name}`)} style={{ background:'#FCEBEB', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, color:'#A32D2D', cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
              </div>
            ))}
          </>
        ) : (
          <>
            <SectionLabel mt={0} th={th}>All users ({users.length})</SectionLabel>
            {users.map(u => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:`0.5px solid ${th?.borderLight || '#f0f0f0'}` }}>
                <Avatar initials={getInitials(u.name || u.email)} color="blue" size={38} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500, color: th?.text || '#1a1a1a' }}>{u.name}</div>
                  <div style={{ fontSize:11, color: th?.textMuted || '#888', marginTop:2 }}>{u.email}</div>
                </div>
                <span style={{ fontSize:11, padding:'2px 7px', borderRadius:20, fontWeight:500, background:'#E6F1FB', color:'#185FA5', textTransform:'capitalize' }}>{u.role}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,      setScreen]      = useState('login');
  const [token,       setToken]       = useState(null);
  const [user,        setUser]        = useState(null);
  const [ctx,         setCtx]         = useState({});
  const [darkMode,    setDarkMode]    = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  const th = darkMode ? dark : light;

  useEffect(() => {
    refreshAccessToken()
      .then(accessToken => { setToken(accessToken); return apiFetch('/api/auth/me', {}, accessToken); })
      .then(me => { setUser(me); setScreen('home'); })
      .catch(() => setScreen('login'));
  }, []);

  const handleLogin = (accessToken, userData) => { setToken(accessToken); setUser(userData); setScreen('home'); };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setToken(null); setUser(null); setCtx({});
    setScreen('login'); setShowSignOut(false);
  };

  const navigate = (dest, payload = null) => {
    if (dest === 'log' && payload === null) setCtx(c => ({ ...c, student: null }));
    else if (payload !== null) setCtx(c => ({ ...c, student: payload }));
    setScreen(dest);
  };

  const shared = { navigate, token, user, th };

  const screens = {
    login:         <LoginScreen onLogin={handleLogin} />,
    home:          <HomeScreen  {...shared} darkMode={darkMode} onToggleDark={() => setDarkMode(v => !v)} onSignOutRequest={() => setShowSignOut(true)} />,
    student:       <StudentScreen        {...shared} student={ctx.student} />,
    log:           <LogScreen            {...shared} initialStudent={ctx.student} />,
    saved:         <SavedScreen          {...shared} student={ctx.student} />,
    analytics:     <AnalyticsScreen      {...shared} student={ctx.student} />,
    interventions: <InterventionsScreen  {...shared} student={ctx.student} />,
    parent:        <ParentScreen         {...shared} student={ctx.student} />,
    share:         <ShareScreen          {...shared} />,
    calendar:      <CalendarScreen       {...shared} student={ctx.student} />,
    alerts:        <AlertsScreen         {...shared} />,
    addstudent:    <AddStudentScreen     {...shared} />,
    admin:         <AdminScreen          {...shared} />,
  };

  return (
    <div style={{ width: 430, background: th.bg, borderRadius: 16, border: `0.5px solid ${th.border}`, overflow: 'hidden', minHeight: 720, display: 'flex', flexDirection: 'column', color: th.text, fontFamily: 'inherit' }}>
      {screens[screen] || <div style={{ padding: 20, color: th.textMuted }}>Unknown screen.</div>}
      {showSignOut && <SignOutModal onConfirm={handleLogout} onCancel={() => setShowSignOut(false)} th={th} />}
    </div>
  );
}
