import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ResponsePanel, { useApiAction } from '../components/ResponsePanel';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:2000';

const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Continue with Google', className: 'btn-google' },
  { id: 'github', label: 'Continue with GitHub', className: 'btn-github' },
  { id: 'facebook', label: 'Continue with Facebook', className: 'btn-facebook' },
  { id: 'linkedin', label: 'Continue with LinkedIn', className: 'btn-linkedin' },
  { id: 'microsoft', label: 'Continue with Microsoft', className: 'btn-microsoft' },
  { id: 'apple', label: 'Continue with Apple', className: 'btn-apple' },
];

const manualFields = {
  google: ['idToken', 'accessToken'],
  github: ['code', 'redirectUri'],
  facebook: ['accessToken'],
  linkedin: ['code'],
  microsoft: ['code'],
  apple: ['idToken', 'code', 'fullName', 'email'],
};

export default function OAuthPage() {
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();
  const { data, error, loading, run, reset } = useApiAction();
  const [config, setConfig] = useState({});
  const [intent, setIntent] = useState('authenticate');
  const [provider, setProvider] = useState('google');
  const [manualForm, setManualForm] = useState({});

  useEffect(() => {
    api('/oauth/config')
      .then(setConfig)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get('error')) reset();
  }, [searchParams, reset]);

  const oauthError = searchParams.get('error');

  const startOAuth = (selectedProvider) => {
    window.location.href = `${API_ORIGIN}/oauth/${selectedProvider}/start`;
  };

  const submitManual = async (e) => {
    e.preventDefault();
    const body = { ...manualForm };
    const result = await run(() =>
      api(`/auth/${provider}/${intent}`, { method: 'POST', body }),
    );
    await refreshSession();
    return result;
  };

  const linkProvider = () => run(() => api(`/oauth/${provider}/link`, { method: 'POST' }));
  const loadLinked = () => run(() => api('/me/oauth-accounts'));
  const unlinkProvider = () =>
    run(() => api(`/me/oauth-accounts/${provider}`, { method: 'DELETE' }));

  return (
    <div className="page">
      <header className="page-header">
        <h1>OAuth</h1>
        <p>One-click sign-in for every Voult OAuth provider.</p>
      </header>

      {oauthError && (
        <section className="form-card danger-zone">
          <p className="field-error">OAuth error: {oauthError}</p>
        </section>
      )}

      <section className="form-card">
        <h2>Sign in with provider</h2>
        <p className="endpoint-hint">
          All providers are Voult-hosted: playground → Voult → provider → Voult → playground.
        </p>

        <div className="oauth-buttons">
          {OAUTH_PROVIDERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn btn-oauth ${item.className}`}
              onClick={() => startOAuth(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="oauth-config-list">
          {OAUTH_PROVIDERS.map((item) => (
            <div key={item.id} className="oauth-config-item">
              <strong>{item.id}</strong>
              <span className="badge badge-muted">Voult hosted</span>
              {config[item.id]?.enabledInVoult ? (
                <span className="badge badge-ok">Enabled in Voult</span>
              ) : (
                <span className="badge badge-muted">Check Voult dashboard</span>
              )}
              <code className="callback-url">{config[item.id]?.callbackUrl}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="form-card">
        <h2>Advanced: manual token exchange</h2>
        <p className="hint">For testing Model A directly with tokens or codes you already have.</p>

        <div className="tab-row">
          {OAUTH_PROVIDERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={provider === item.id ? 'tab active' : 'tab'}
              onClick={() => {
                setProvider(item.id);
                setManualForm({});
              }}
            >
              {item.id}
            </button>
          ))}
        </div>

        <div className="tab-row">
          <button
            type="button"
            className={intent === 'authenticate' ? 'tab active' : 'tab'}
            onClick={() => setIntent('authenticate')}
          >
            Authenticate
          </button>
          <button
            type="button"
            className={intent === 'login' ? 'tab active' : 'tab'}
            onClick={() => setIntent('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={intent === 'register' ? 'tab active' : 'tab'}
            onClick={() => setIntent('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={submitManual}>
          {manualFields[provider].map((field) => (
            <label key={field}>
              {field}
              <input
                value={manualForm[field] || ''}
                onChange={(e) => setManualForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </label>
          ))}
          <button type="submit" className="btn btn-secondary" disabled={loading}>
            Manual {intent}
          </button>
        </form>
      </section>

      <section className="form-card">
        <h2>Account linking (authenticated)</h2>
        <div className="inline-actions">
          <button type="button" className="btn btn-secondary" onClick={linkProvider} disabled={loading}>
            Link {provider}
          </button>
          <button type="button" className="btn btn-secondary" onClick={loadLinked} disabled={loading}>
            List linked accounts
          </button>
          <button type="button" className="btn btn-ghost" onClick={unlinkProvider} disabled={loading}>
            Unlink {provider}
          </button>
        </div>
      </section>

      <ResponsePanel data={data} error={error} />
    </div>
  );
}
