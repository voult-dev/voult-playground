import { useEffect, useState } from 'react';
import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, platformAuthenticatorIsAvailable, startAuthentication } from '@simplewebauthn/browser';
import { OAuthButton, PASSWORD_REQUIREMENTS_MESSAGE, getOAuthRedirectResult, useOAuthProviders, useSession, useVoult } from '@voult/react';
import LinkedAccounts from '../auth/account/LinkedAccounts.jsx';
import MfaPrompt from '../auth/MfaPrompt.jsx';
import Passkeys from '../auth/account/Passkeys.jsx';
import SignIn from '../auth/SignIn.jsx';
import SignUp from '../auth/SignUp.jsx';
import { go, query, safePath, useAction } from '../lib.jsx';
import { Embed, Gate, PageHeader, useTabs } from './ui.jsx';

// The template's sign-in and sign-up pages, plus what the playground adds around them: username
// accounts, a magic-link page with a pasted-token option, OAuth intents, a passkey support check.

export function SignInPage() {
  const [tab, tabs] = useTabs(['Email', 'Username']);
  return (
    <>
      <PageHeader title="Sign in" intro="Password, Google/GitHub, a magic link or a passkey. Accounts with MFA get a code step." routes={['POST /email-login', 'POST /username-login', 'POST /mfa/verify', 'GET /oauth/:provider/start', 'POST /passkeys/login/options']} />
      <Gate access="guest">
        {tabs}
        {tab === 'Email' ? <Embed><SignIn /></Embed> : <UsernameSignIn />}
      </Gate>
    </>
  );
}

function UsernameSignIn() {
  const { status } = useSession();
  const { signIn } = useVoult();
  const [run, note] = useAction();
  const returnTo = safePath(query('returnTo'));
  if (status === 'mfa_required') return <MfaPrompt returnTo={returnTo} />;
  return (
    <section>
      <h2>With a username</h2>
      <form onSubmit={run(async ({ username, password }) => { const { mfaRequired } = await signIn({ username, password }); if (!mfaRequired) go(returnTo); })}>
        <input name="username" aria-label="Username" placeholder="Username" autoComplete="username" required />
        <input name="password" type="password" aria-label="Password" placeholder="Password" autoComplete="current-password" required />
        <button className="primary">Sign in</button>
      </form>
      {note}
    </section>
  );
}

export function SignUpPage() {
  const [tab, tabs] = useTabs(['Email', 'Username']);
  return (
    <>
      <PageHeader title="Create an account" intro="Email accounts can be asked to verify their address first (an app setting in the Voult dashboard)." routes={['POST /register', 'POST /username-register']} />
      <Gate access="guest">
        {tabs}
        {tab === 'Email' ? <Embed><SignUp /></Embed> : <UsernameSignUp />}
      </Gate>
    </>
  );
}

function UsernameSignUp() {
  const { signUp } = useVoult();
  const [run, note] = useAction();
  return (
    <section>
      <h2>With a username</h2>
      <form onSubmit={run(async ({ username, fullName, password }) => { await signUp({ username, fullName, password }); go('/account'); })}>
        <input name="fullName" aria-label="Full name" placeholder="Full name" autoComplete="name" required />
        <input name="username" aria-label="Username" placeholder="Username" autoComplete="username" required />
        <input name="password" type="password" aria-label="Password" placeholder="Password" autoComplete="new-password" required />
        <button className="primary">Create account</button>
      </form>
      <p className="muted">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
      {note}
    </section>
  );
}

export function MagicLinkPage() {
  const { magicLink } = useVoult();
  const [run, note] = useAction();
  const [runToken, tokenNote] = useAction();
  return (
    <>
      <PageHeader title="Magic link" intro="Voult emails a one-time link. Opening it signs the user in and redirects, like the OAuth callback." routes={['POST /magic-link', 'GET /magic-link/verify']} />
      <Gate access="guest">
        <section>
          <h2>Send a link</h2>
          <form onSubmit={run(async ({ email, returnTo }) => { await magicLink.send(email, { returnTo: safePath(returnTo, '/account') }); return 'If that email has an account, a link is on its way. It answers the same either way, so it can\'t be used to find accounts.'; })}>
            <input name="email" type="email" aria-label="Email" placeholder="Email" required />
            <input name="returnTo" aria-label="Page after sign-in" placeholder="Then go to /account" />
            <button className="primary">Send link</button>
          </form>
          {note}
        </section>
        <section>
          <h2>Have the token already?</h2>
          <p className="muted">Paste the <code>token</code> from the link (testing with a mail catcher, say). It goes through the same verify route the email link opens.</p>
          <form onSubmit={runToken(async ({ token }) => { location.assign(`/api/auth/magic-link/verify?${new URLSearchParams({ token: token.trim(), returnTo: '/account' })}`); })}>
            <input name="token" aria-label="Magic link token" placeholder="Token" required />
            <button>Sign in with it</button>
          </form>
          {tokenNote}
        </section>
      </Gate>
    </>
  );
}

const oauthResult = getOAuthRedirectResult();
const INTENTS = {
  authenticate: 'Sign in, or create the account if it\'s new',
  login: 'Sign in only (fails for a new account)',
  register: 'Create an account only (fails if it exists)',
};

export function OAuthPage() {
  const { status } = useSession();
  const { providers, loading } = useOAuthProviders();
  const [intent, setIntent] = useState('authenticate');
  return (
    <>
      <PageHeader title="Google, GitHub & co." intro="Hosted OAuth: Voult talks to the provider, your server only sees the callback. Providers are turned on in the Voult dashboard, with no keys in your .env." routes={['GET /oauth/providers', 'GET /oauth/:provider/start', 'GET /oauth/callback', 'GET /oauth/linked', 'DELETE /oauth/linked/:provider']} />
      {oauthResult.error && <p className="err" role="alert">{oauthResult.error.description ?? oauthResult.error.code}</p>}
      {status === 'authenticated' ? (
        <>
          <p className="muted">You're signed in, so here you can link more providers to this account (or unlink them).</p>
          <LinkedAccounts />
        </>
      ) : (
        <Gate access="guest">
          <section>
            <h2>Continue with a provider</h2>
            <div className="pg-choices" role="radiogroup" aria-label="What should happen">
              {Object.entries(INTENTS).map(([value, label]) => (
                <label key={value}><input type="radio" name="intent" value={value} checked={intent === value} onChange={() => setIntent(value)} /> <code>{value}</code> {label}</label>
              ))}
            </div>
            {loading ? <p className="muted">Loading providers…</p> : providers.length === 0
              ? <p className="muted">No providers are on yet. Turn them on in the Voult dashboard → your app → Sign-in providers.</p>
              : <div className="pg-row">{providers.map((p) => <OAuthButton key={p} provider={p} intent={intent} returnTo="/account" className="button">Continue with {p}</OAuthButton>)}</div>}
          </section>
        </Gate>
      )}
    </>
  );
}

export function PasskeysPage() {
  const { status } = useSession();
  return (
    <>
      <PageHeader title="Passkeys" intro="Touch ID, Face ID, Windows Hello or a security key instead of a password. Add one while signed in, then sign in with it." routes={['POST /passkeys/register/options', 'POST /passkeys/register/verify', 'GET /passkeys', 'PATCH /passkeys/:id', 'DELETE /passkeys/:id', 'POST /passkeys/login/options', 'POST /passkeys/login/verify']} />
      <Support />
      {status === 'authenticated' ? <Passkeys /> : <Gate access="guest"><PasskeySignIn /></Gate>}
    </>
  );
}

function Support() {
  const [support, setSupport] = useState(null);
  useEffect(() => {
    Promise.all([browserSupportsWebAuthn(), platformAuthenticatorIsAvailable(), browserSupportsWebAuthnAutofill()])
      .then(([webauthn, platform, autofill]) => setSupport({ webauthn, platform, autofill }));
  }, []);
  if (!support) return null;
  const row = (ok, text) => <li className={ok ? 'ok' : 'muted'}>{ok ? '✓' : '✗'} {text}</li>;
  return (
    <section>
      <h2>This browser</h2>
      <ul className="pg-checks">
        {row(support.webauthn, 'Supports passkeys (WebAuthn)')}
        {row(support.platform, 'Has a built-in authenticator (Touch ID, Face ID, Windows Hello)')}
        {row(support.autofill, 'Can suggest passkeys in the email field (autofill)')}
      </ul>
    </section>
  );
}

function PasskeySignIn() {
  const { status } = useSession();
  const { passkeys } = useVoult();
  const [run, note] = useAction();
  if (status === 'mfa_required') return <MfaPrompt />;
  return (
    <section>
      <h2>Sign in with a passkey</h2>
      <form onSubmit={run(async ({ email }) => {
        const { options } = await passkeys.loginOptions(email || undefined);
        const { mfaRequired } = await passkeys.signIn(await startAuthentication({ optionsJSON: options }));
        if (!mfaRequired) go('/account');
      })}>
        <input name="email" type="email" aria-label="Email (optional)" placeholder="Email (optional: limits the choice to that account)" autoComplete="username webauthn" />
        <button className="primary">Use a passkey</button>
      </form>
      <p className="muted">No passkey yet? Sign in another way, then add one on this page.</p>
      {note}
    </section>
  );
}
