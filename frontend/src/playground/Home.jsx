import { useSession } from '@voult/react';
import { lockReason } from './access.js';
import { PAGES } from './pages.js';

export default function Home() {
  const { status, user } = useSession();
  return (
    <>
      <header className="pg-hero">
        <p className="pg-eyebrow">voult.dev</p>
        <h1>Auth playground</h1>
        <p className="pg-intro">
          Try every Voult feature against a real app, and watch each request in the <b>API calls</b> panel.
          It is the <code>express-react</code> template from <code>npx create-voult-app</code>, plus these extra pages.
        </p>
        <p>
          {status === 'authenticated'
            ? <>Signed in as <b>{user.email ?? user.username}</b>. <a href="/account">Your account</a></>
            : <><a className="button primary" href="/signup">Create a test account</a> <a className="button" href="/login">Sign in</a></>}
        </p>
      </header>

      <div className="pg-grid">
        {PAGES.filter((p) => p.blurb).map((p) => {
          const locked = lockReason(p.access, status);
          return (
            <a key={p.path} href={p.path} className={`pg-card${locked ? ' locked' : ''}`}>
              <span className="pg-card-title">{p.label}</span>
              <span className="pg-card-text">{p.blurb}</span>
              {locked && <span className="pg-card-lock">{locked}</span>}
            </a>
          );
        })}
      </div>

      <section className="pg-how">
        <h2>How it works</h2>
        <ol>
          <li>The React app calls <code>/api/auth/*</code> on its own server: no secrets in the browser, sessions in httpOnly cookies.</li>
          <li><code>backend/auth.js</code> mounts <code>@voult/express</code>, which serves every one of those routes. This server has no auth code of its own (CI checks it).</li>
          <li><code>@voult/express</code> calls the Voult API with your app's Client ID and Secret.</li>
        </ol>
        <p className="muted">Retired from the old playground: the manual OAuth token exchange (hosted OAuth replaced it) and account re-enable (deleting an account signs you out, so it couldn't be reached).</p>
      </section>
    </>
  );
}
