import { useState } from 'react';
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
