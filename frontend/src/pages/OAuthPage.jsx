import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OAuthButton, getOAuthRedirectResult, useOAuthProviders } from '@voult/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ResponsePanel, { useApiAction } from '../components/ResponsePanel';
import { describeOAuthError } from '../lib/oauthErrors';

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
  const { refreshSession, authenticated } = useAuth();
  const { data, error, loading, run } = useApiAction();
  const { providers: readyProviders, loading: providersLoading, error: providersError } = useOAuthProviders();
  const [intent, setIntent] = useState('authenticate');
  const [provider, setProvider] = useState('google');
  const [manualForm, setManualForm] = useState({});

  // @voult/express redirects failures here as ?voult_error=…, and linking as ?voult_linked=…
  const redirect = getOAuthRedirectResult(`?${searchParams.toString()}`);
  const readyButtons = OAUTH_PROVIDERS.filter((item) => readyProviders.includes(item.id));
  const redirectError = redirect.error && describeOAuthError(redirect.error);

  const submitManual = async (e) => {
    e.preventDefault();
    const body = { ...manualForm };
    const result = await run(() =>
      api(`/auth/${provider}/${intent}`, { method: 'POST', body }),
    );
    await refreshSession();
    return result;
  };

  const loadLinked = () => run(() => api('/me/oauth-accounts')).catch(() => {});

  // After a successful link, show the updated list straight away.
  useEffect(() => {
    if (redirect.linked && authenticated) loadLinked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirect.linked, authenticated]);

  const unlinkProvider = () =>
    run(() => api(`/me/oauth-accounts/${provider}`, { method: 'DELETE' })).catch(() => {});

  return (
    <div className="page">
      <header className="page-header">
        <h1>OAuth</h1>
        <p>One-click sign-in for every Voult OAuth provider.</p>
      </header>

      {redirectError && (
        <section className={redirectError.cancelled ? 'form-card' : 'form-card danger-zone'}>
          <p className={redirectError.cancelled ? undefined : 'field-error'}>
            {redirectError.message}{' '}
            {authenticated ? 'Your account was not changed.' : "You're not signed in."}
          </p>
          <p className="hint">
            Code: <code>{redirect.error.code}</code>
          </p>
        </section>
      )}

      {redirect.linked && (
        <section className="form-card">
          <p>
            Linked <strong>{OAUTH_PROVIDERS.find((p) => p.id === redirect.linked)?.label.replace('Continue with ', '') ?? redirect.linked}</strong>{' '}
            to your account. You can now sign in with it as well as your password.
          </p>
        </section>
      )}

      <section className="form-card">
        <h2>Sign in with provider</h2>
        <p className="endpoint-hint">
          All providers are Voult-hosted: playground → Voult → provider → Voult → playground.
        </p>

        <p className="endpoint-hint">GET /api/auth/oauth/:provider/start (from @voult/express)</p>

        {providersLoading && <p className="hint">Loading providers…</p>}
        {providersError && <p className="field-error">Couldn't load providers: {providersError.message}</p>}
        {!providersLoading && !providersError && readyButtons.length === 0 && (
          <p className="hint">No providers are ready. Turn one on in the Voult dashboard (your app → Sign-in providers).</p>
        )}

        <div className="oauth-buttons">
          {readyButtons.map((item) => (
            <OAuthButton
              key={item.id}
              provider={item.id}
              returnTo="/account"
              className={`btn btn-oauth ${item.className}`}
            >
              {item.label}
            </OAuthButton>
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
        <p className="endpoint-hint">GET /api/auth/oauth/:provider/start?intent=link</p>
        {authenticated ? (
          <div className="oauth-buttons">
            {readyButtons.map((item) => (
              <OAuthButton
                key={item.id}
                provider={item.id}
                intent="link"
                returnTo="/oauth"
                className={`btn btn-oauth ${item.className}`}
              >
                {item.label.replace('Continue with', 'Link')}
              </OAuthButton>
            ))}
          </div>
        ) : (
          <p className="hint">Sign in (e.g. with your password) first to link a provider.</p>
        )}
        <div className="inline-actions">
          <button type="button" className="btn btn-secondary" onClick={loadLinked} disabled={!authenticated || loading}>
            List linked accounts
          </button>
          <button type="button" className="btn btn-ghost" onClick={unlinkProvider} disabled={!authenticated || loading}>
            Unlink {provider}
          </button>
        </div>
      </section>

      <ResponsePanel data={data} error={error} />
    </div>
  );
}
