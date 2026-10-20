// The playground's "what just happened" log: every /api/* call the page makes (the template's
// pages, @voult/react, the Utilities page), with its request and the JSON that came back.
// Playground-only. The template's own files stay untouched; this watches fetch from outside.

const MAX_ENTRIES = 25;
const SECRET = /password|secret|token/i;
const STORAGE_KEY = 'voult-playground:calls';

// Kept in sessionStorage: the template does a full page load after sign-in and sign-out, and the
// log should survive it (same tab only).
const storage = (() => {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
})();

let entries = [];
try {
  entries = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
} catch { /* unreadable: start empty */ }
let nextId = Math.max(0, ...entries.map((e) => e.id)) + 1;
const listeners = new Set();

/** Request bodies are shown on screen, so typed passwords and tokens are masked. */
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET.test(k) ? '••••' : redact(v)]));
}

function parseBody(body) {
  if (typeof body !== 'string') return undefined;
  try {
    return redact(JSON.parse(body));
  } catch {
    return body;
  }
}

function setEntries(next) {
  entries = next;
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* full or blocked: the in-memory log still works */ }
  for (const listener of listeners) listener();
}

const record = (entry) => setEntries([{ id: nextId++, ...entry }, ...entries].slice(0, MAX_ENTRIES));

export const getEntries = () => entries;
export const clearEntries = () => setEntries([]);

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Wraps `target.fetch` (window in the browser) so calls to /api/* are recorded. */
export function installInspector(target = globalThis) {
  const realFetch = target.fetch.bind(target);
  // A full page load (after sign-in, say) cancels calls in flight: not failures, so not logged.
  let leaving = false;
  target.addEventListener?.('pagehide', () => { leaving = true; });
  target.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, target.location?.href ?? 'http://localhost/');
    if (!url.pathname.startsWith('/api/')) return realFetch(input, init);

    const method = (init.method ?? input.method ?? 'GET').toUpperCase();
    const started = Date.now();
    const base = { method, path: url.pathname + url.search, request: parseBody(init.body) };
    try {
      const res = await realFetch(input, init);
      const text = await res.clone().text();
      let response = text;
      try { response = text ? JSON.parse(text) : null; } catch { /* not JSON: keep the text */ }
      record({ ...base, status: res.status, ms: Date.now() - started, response });
      return res;
    } catch (err) {
      if (!leaving) record({ ...base, status: 0, ms: Date.now() - started, response: { networkError: String(err.message ?? err) } });
      throw err;
    }
  };
}

// Keyboard shortcut for the API calls panel, like the terminal toggle in VS Code and Cursor:
// Cmd+J on Mac, Ctrl+J elsewhere. Shift/Alt combos are left alone (Cmd+Shift+J is Chrome's
// Downloads on Mac), and so is the other platform's modifier.
export const isMacPlatform = (nav = globalThis.navigator) =>
  /Mac|iPhone|iPad|iPod/.test(nav?.userAgentData?.platform || nav?.platform || nav?.userAgent || '');

export const toggleShortcutLabel = (mac) => (mac ? '⌘J' : 'Ctrl+J');
export const toggleShortcutAria = (mac) => (mac ? 'Meta+J' : 'Control+J');

/** @param {{ key: string, code?: string, metaKey: boolean, ctrlKey: boolean, shiftKey: boolean, altKey: boolean }} e */
export function isToggleShortcut(e, mac) {
  if (e.shiftKey || e.altKey) return false;
  if (mac ? !e.metaKey || e.ctrlKey : !e.ctrlKey || e.metaKey) return false;
  // code catches non-Latin layouts, where key isn't "j".
  return e.key?.toLowerCase() === 'j' || e.code === 'KeyJ';
}
