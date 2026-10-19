import { useState, useSyncExternalStore } from 'react';
import { clearEntries, getEntries, subscribe } from './inspector.js';
import './playground.css';

/** Bottom panel: the latest /api/* calls, newest first; click one for its request and response. */
export default function Inspector() {
  const entries = useSyncExternalStore(subscribe, getEntries);
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(null);
  const shown = entries.find((e) => e.id === selected) ?? entries[0];

  return (
    <aside className="inspector" aria-label="API calls">
      <button className="inspector-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} API calls ({entries.length})
      </button>
      {open && (
        <div className="inspector-body">
          {entries.length === 0
            ? <p className="muted">Every call this page makes to /api/* shows up here.</p>
            : <button onClick={clearEntries}>Clear</button>}
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
              <h3>Response</h3>
              <pre>{JSON.stringify(shown.response, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
