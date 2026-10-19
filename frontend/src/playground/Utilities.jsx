import { useState } from 'react';
import { useSession } from '@voult/react';
import { request, useAction } from '../lib.jsx';
import { PageHeader } from './ui.jsx';

// Router routes no other page shows, one card each. Every call also shows up in the API calls panel.

export default function Utilities() {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  return (
    <>
      <PageHeader title="Utilities" intro="More of the router, straight from the browser." routes={['GET /session', 'GET /oauth/providers', 'GET /user/activity']} />
      <Session />
      <Providers />
      {signedIn ? <Activity /> : <section><h2>My activity</h2><p><a href="/login?returnTo=/utilities">Sign in</a> to see your activity log.</p></section>}
    </>
  );
}

function Session() {
  const [session, setSession] = useState(null);
  const [run, note] = useAction();
  return (
    <section>
      <h2>Session</h2>
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
