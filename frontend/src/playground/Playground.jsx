import { useSession, useVoult } from '@voult/react';
import ForgotPassword from '../auth/ForgotPassword.jsx';
import ResetPassword from '../auth/ResetPassword.jsx';
import VerifyEmail from '../auth/VerifyEmail.jsx';
import { go } from '../lib.jsx';
import { lockReason } from './access.js';
import { AccountPage, EmailPage, MfaPage, SessionsPage } from './AccountPages.jsx';
import Home from './Home.jsx';
import Inspector from './Inspector.jsx';
import { PAGES } from './pages.js';
import { MagicLinkPage, OAuthPage, PasskeysPage, SignInPage, SignUpPage } from './SignInPages.jsx';
import Utilities from './Utilities.jsx';
import './playground.css';

// The playground's shell (rendered by main.jsx instead of the template's App.jsx): a sidebar of
// features, the page, and the API calls panel.

const COMPONENTS = {
  '/': Home,
  '/login': SignInPage,
  '/signup': SignUpPage,
  '/oauth': OAuthPage,
  '/magic-link': MagicLinkPage,
  '/passkeys': PasskeysPage,
  '/mfa': MfaPage,
  '/sessions': SessionsPage,
  '/account': AccountPage,
  '/email': EmailPage,
  '/utilities': Utilities,
  // Email links land on the template's own pages.
  '/forgot-password': ForgotPassword,
  '/reset-password': ResetPassword,
  '/verify-email': VerifyEmail,
};

export default function Playground() {
  const Page = COMPONENTS[location.pathname] ?? Home;
  return (
    <div className="pg-shell">
      <Sidebar />
      <div className="pg-main">
        <main className="pg-page"><Page /></main>
        <Inspector />
      </div>
    </div>
  );
}

function Sidebar() {
  const { status } = useSession();
  const groups = {};
  for (const p of PAGES) if (p.group) (groups[p.group] ??= []).push(p);
  return (
    <aside className="pg-sidebar">
      <a className="pg-brand" href="/">
        <img src="/images/favicon.svg" alt="" width="28" height="28" />
        <span><b>voult.dev</b><small>playground</small></span>
      </a>
      <nav aria-label="Features">
        {Object.entries(groups).map(([group, pages]) => (
          <div key={group} className="pg-nav-group">
            <p className="pg-nav-title">{group}</p>
            {pages.map((p) => {
              const locked = lockReason(p.access, status);
              const current = location.pathname === p.path;
              return (
                <a key={p.path} href={p.path} aria-current={current ? 'page' : undefined} className={`pg-nav-link${locked ? ' locked' : ''}`} title={locked ?? undefined}>
                  {p.label}{locked && <span className="pg-lock" aria-label={locked}>🔒</span>}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <SessionCard />
    </aside>
  );
}

function SessionCard() {
  const { status, user } = useSession();
  const { signOut } = useVoult();
  return (
    <div className="pg-session" aria-live="polite">
      {status === 'loading' && <span className="muted">Checking session…</span>}
      {status === 'authenticated' && (
        <>
          <span className="pg-badge ok">Signed in</span>
          <span className="pg-session-user">{user.email ?? user.username}</span>
          <button onClick={async () => { await signOut(); go('/'); }}>Sign out</button>
        </>
      )}
      {status === 'mfa_required' && <><span className="pg-badge warn">Waiting for MFA code</span><a href="/mfa">Enter it</a></>}
      {status === 'unauthenticated' && <><span className="pg-badge">Signed out</span><a href="/login">Sign in</a></>}
    </div>
  );
}
