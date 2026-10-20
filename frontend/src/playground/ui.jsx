import { useEffect, useState } from 'react';
import { useSession, useVoult } from '@voult/react';
import { go } from '../lib.jsx';
import { pageState } from './access.js';

/** Title, one line about the feature, and the router routes the page calls. */
export function PageHeader({ title, intro, routes = [] }) {
  return (
    <header className="pg-header">
      <h1>{title}</h1>
      {intro && <p className="pg-intro">{intro}</p>}
      {routes.length > 0 && (
        <ul className="pg-routes" aria-label="Routes this page uses">
          {routes.map((r) => {
            const [method, path] = r.split(' ');
            return <li key={r}><span className={`pg-method pg-${method.toLowerCase()}`}>{method}</span><code>/api/auth{path}</code></li>;
          })}
        </ul>
      )}
    </header>
  );
}

/** Renders the page when the session allows it, else says what to do first. */
export function Gate({ access, children }) {
  const { status } = useSession();
  const { signOut } = useVoult();
  const state = pageState(access, status);
  if (state === 'loading') return <p className="muted">Checking your session…</p>;
  if (state === 'ok') return children;
  const here = encodeURIComponent(location.pathname);
  return (
    <div className="pg-gate">
      {state === 'sign-in' && <><p>This needs a signed-in user.</p><a className="button primary" href={`/login?returnTo=${here}`}>Sign in</a> <a className="button" href="/signup">Create an account</a></>}
      {state === 'sign-out' && <><p>You're signed in. Sign out to try this flow from the start.</p><button className="primary" onClick={async () => { await signOut(); go(location.pathname); }}>Sign out</button></>}
      {state === 'finish-mfa' && <><p>A sign-in is waiting for its two-factor code.</p><a className="button primary" href="/mfa">Enter the code</a></>}
    </div>
  );
}

/** voult.dev's wordmark (voult-landing/views/partials/logo.ejs). */
export const Wordmark = () => (
  <svg width="22" height="18" viewBox="5 8 22 17" aria-hidden="true" focusable="false">
    <path d="M6 9 L12 24 H14.2 L8.2 9 H6Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M17.8 9 L23.8 24 H26 L20 9 H17.8Z" fill="currentColor" />
  </svg>
);

const Icon = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const LockIcon = () => <Icon size={13}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>;

/** Light/dark toggle, same behaviour and storage key as voult.dev (index.html applies it before paint). */
export function ThemeToggle() {
  const root = document.documentElement;
  const [theme, setTheme] = useState(root.dataset.theme);
  useEffect(() => {
    // Follow the OS until the user picks a theme explicitly.
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      let saved = null;
      try { saved = localStorage.getItem('voult-theme'); } catch {}
      if (!saved) { root.dataset.theme = e.matches ? 'dark' : 'light'; setTheme(root.dataset.theme); }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [root]);
  const next = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('theme-switching');
      setTimeout(() => root.classList.remove('theme-switching'), 250);
    }
    root.dataset.theme = next;
    try { localStorage.setItem('voult-theme', next); } catch {}
    setTheme(next);
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${next} theme`}>
      <span className="theme-icon-light"><Icon><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Icon></span>
      <span className="theme-icon-dark"><Icon><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon></span>
    </button>
  );
}

/** Small segmented control: `const [tab, tabs] = useTabs(['Email', 'Username']);` */
export function useTabs(labels) {
  const [tab, setTab] = useState(labels[0]);
  const tabs = (
    <div className="pg-tabs" role="tablist">
      {labels.map((label) => (
        <button key={label} role="tab" aria-selected={tab === label} className={tab === label ? 'active' : ''} onClick={() => setTab(label)}>{label}</button>
      ))}
    </div>
  );
  return [tab, tabs];
}

/** A template page embedded under the playground's own header (its h1 is hidden, the header has one). */
export const Embed = ({ children }) => <div className="pg-embed">{children}</div>;
