import { useState } from 'react';
import { useSession } from '@voult/react';
import { request, useAction } from '../lib.jsx';

// Router routes the template's pages don't use, one card each. Every call also shows up in the
// API calls panel below. All of them are served by @voult/express: the playground's server has
// no auth routes of its own (CI checks that).

export default function Utilities() {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  return (
    <>
      <h1>Utilities</h1>
      <p className="muted">More of the router, straight from the browser. Watch the API calls panel.</p>
      <Session />
      <Providers />
      {signedIn ? <><Activity /><SetPassword /></> : <p><a href="/login?returnTo=/utilities">Sign in</a> for your activity log and to set a password.</p>}
    </>
  );
}

function Session() {
  const [session, setSession] = useState(null);
  const [run, note] = useAction();
  return (
    <section>
      <h2>Session</h2>
      <p className="endpoint">GET /api/auth/session</p>
      <button onClick={run(async () => { setSession(await request('/session')); })}>Check session</button>
      {session && <p>{session.authenticated ? `Signed in as ${session.user?.email ?? session.user?.username}` : session.mfaPending ? 'Waiting for an MFA code' : 'Signed out'}</p>}
      {note}
    </section>
  );
}

function Providers() {
  const [providers, setProviders] = useState(null);
  const [run, note] = useAction();
  return (
    <section>
      <h2>Sign-in providers</h2>
      <p className="endpoint">GET /api/auth/oauth/providers</p>
      <button onClick={run(async () => { setProviders((await request('/oauth/providers')).providers); })}>Which providers are on?</button>
      {providers && <p>{Object.entries(providers).filter(([, on]) => on).map(([name]) => name).join(', ') || 'None yet: turn them on in the Voult dashboard.'}</p>}
      {note}
    </section>
  );
}

function Activity() {
  const [logs, setLogs] = useState(null);
  const [run, note] = useAction();
  return (
    <section>
      <h2>My activity</h2>
      <p className="endpoint">GET /api/auth/user/activity?limit=10</p>
      <button onClick={run(async () => { const data = await request('/user/activity?limit=10'); setLogs(data.logs); })}>Show my last 10 events</button>
      {logs && (logs.length === 0 ? <p>No activity yet.</p> : (
        <table className="activity">
          <thead><tr><th>When</th><th>What</th><th>Result</th></tr></thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log._id ?? i}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.action}</td>
                <td className={log.status === 'FAILURE' ? 'err' : ''}>{log.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {note}
    </section>
  );
}

function SetPassword() {
  const [run, note] = useAction();
  return (
    <section>
      <h2>Set a password</h2>
      <p className="endpoint">POST /api/auth/user/password</p>
      <p className="muted">For an account made with Google or GitHub: add a password so email + password sign-in works too.</p>
      <form onSubmit={run(async ({ password }) => { await request('/user/password', { method: 'POST', body: { password } }); return 'Password set. You can now sign in with your email and this password.'; })}>
        <input name="password" type="password" autoComplete="new-password" placeholder="New password (8+ characters)" required minLength={8} />
        <button>Set password</button>
      </form>
      {note}
    </section>
  );
}
