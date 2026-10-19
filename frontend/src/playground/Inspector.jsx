import { useState, useSyncExternalStore } from 'react';
import { clearEntries, getEntries, subscribe } from './inspector.js';

const narrow = () => typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
const isSessionCheck = (e) => e.method === 'GET' && e.path === '/api/auth/session';

/** Docked panel: the latest /api/* calls, newest first; click one for its request and response. */
export default function Inspector() {
  const all = useSyncExternalStore(subscribe, getEntries);
  const [open, setOpen] = useState(() => !narrow());
  const [hideSession, setHideSession] = useState(false);
  const [selected, setSelected] = useState(null);
  const entries = hideSession ? all.filter((e) => !isSessionCheck(e)) : all;
  const shown = entries.find((e) => e.id === selected) ?? entries[0];

  return (
    <aside className="inspector" aria-label="API calls">
      <div className="inspector-bar">
        <button className="inspector-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? '▾' : '▸'} API calls <span className="pg-badge">{all.length}</span>
        </button>
        {open && all.length > 0 && (
          <>
            <label className="inspector-filter"><input type="checkbox" checked={hideSession} onChange={(e) => setHideSession(e.target.checked)} /> Hide session checks</label>
            <button className="inspector-clear" onClick={clearEntries}>Clear</button>
          </>
        )}
      </div>
      {open && (
        <div className="inspector-body">
          {entries.length === 0 && <p className="muted">{all.length === 0 ? 'Every call this page makes to /api/* shows up here.' : 'Only session checks so far.'}</p>}
          <ul className="inspector-list">
            {entries.map((e) => (
              <li key={e.id}>
                <button className={e === shown ? 'active' : ''} onClick={() => setSelected(e.id)}>
                  <span className={e.status >= 400 || e.status === 0 ? 'err' : 'ok'}>{e.status || 'ERR'}</span>{' '}
                  <b>{e.method}</b> {e.path} <span className="muted">{e.ms} ms</span>
                </button>
              </li>
            ))}
          </ul>
          {shown && (
            <div className="inspector-detail">
              {shown.request !== undefined && (<><h3>Request body</h3><pre>{JSON.stringify(shown.request, null, 2)}</pre></>)}
              <h3>Response · {shown.status || 'network error'}</h3>
              <pre>{JSON.stringify(shown.response, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
