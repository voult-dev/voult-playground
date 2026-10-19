import { useState } from 'react';
import { PASSWORD_REQUIREMENTS_MESSAGE, useSession, useVoult } from '@voult/react';
import Danger from '../auth/account/Danger.jsx';
import ForgotPassword from '../auth/ForgotPassword.jsx';
import MfaPrompt from '../auth/MfaPrompt.jsx';
import MfaSettings from '../auth/account/MfaSettings.jsx';
import Sessions from '../auth/account/Sessions.jsx';
import { request, useAction } from '../lib.jsx';
import { Embed, Gate, PageHeader } from './ui.jsx';

// Signed-in features: MFA, sessions, profile, set password, sign out / delete; plus the email
// flows (verify, forgot, reset) whose links land on the template's own pages.

export function MfaPage() {
  const { status } = useSession();
  return (
    <>
      <PageHeader title="Two-factor authentication" intro="An authenticator-app code (TOTP) after the password, OAuth, magic link or passkey step. Backup codes cover a lost phone." routes={['GET /mfa/status', 'POST /mfa/setup', 'POST /mfa/enable', 'POST /mfa/disable', 'POST /mfa/backup-codes', 'POST /mfa/verify', 'POST /mfa/cancel']} />
      <Gate access="signed-in-or-mfa">
        {status === 'mfa_required' ? <MfaPrompt /> : <MfaSettings />}
      </Gate>
    </>
  );
}

export function SessionsPage() {
  const { refresh } = useVoult();
  const [run, note] = useAction();
  return (
    <>
      <PageHeader title="Sessions" intro="Every device signed in to this account. Signing out this browser's own session signs you out here too." routes={['GET /sessions', 'DELETE /sessions/:id', 'POST /sessions/refresh']} />
      <Gate access="signed-in">
        <Sessions />
        <section>
          <h2>Refresh the access token</h2>
          <p className="muted">Happens on its own when the 15-minute access token expires. This does it now, so you can watch the refresh-token rotation in the API calls panel.</p>
          <button onClick={run(async () => { await request('/sessions/refresh', { method: 'POST' }); await refresh(); return 'New access and refresh tokens are in the cookies.'; })}>Refresh now</button>
          {note}
        </section>
      </Gate>
    </>
  );
}

export function AccountPage() {
  return (
    <>
      <PageHeader title="Account" intro="The signed-in user's profile, a password for Google/GitHub-only accounts, and signing out or deleting the account." routes={['GET /user/me', 'PATCH /user/me', 'POST /user/password', 'POST /logout', 'DELETE /user/me']} />
      <Gate access="signed-in">
        <Profile />
        <SetPassword />
        <Danger />
      </Gate>
    </>
  );
}

function Profile() {
  const { user, refresh } = useSession();
  const [editing, setEditing] = useState(false);
  const [run, note] = useAction();
  return (
    <section>
      <h2>Profile</h2>
      <dl className="pg-facts">
        <dt>Name</dt><dd>{user.fullName || '–'}</dd>
        <dt>Email</dt><dd>{user.email || '–'} {user.email && (user.isEmailVerified ? <span className="pg-badge ok">verified</span> : <span className="pg-badge warn">not verified</span>)}</dd>
        {user.username && <><dt>Username</dt><dd>{user.username}</dd></>}
        <dt>User ID</dt><dd><code>{user.id}</code></dd>
      </dl>
      {editing ? (
        <form onSubmit={run(async ({ fullName }) => { await request('/user/me', { method: 'PATCH', body: { fullName } }); await refresh(); setEditing(false); return 'Saved.'; })}>
          <input name="fullName" aria-label="Full name" defaultValue={user.fullName} required />
          <button className="primary">Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : <button onClick={() => setEditing(true)}>Edit name</button>}
      {note}
    </section>
  );
}

function SetPassword() {
  const [run, note] = useAction();
  return (
    <section>
      <h2>Set a password</h2>
      <p className="muted">For an account made with Google or GitHub: add a password so email + password sign-in works too.</p>
      <form onSubmit={run(async ({ password }) => { await request('/user/password', { method: 'POST', body: { password } }); return 'Password set. You can now sign in with your email and this password.'; })}>
        <input name="password" type="password" aria-label="New password" placeholder="New password" autoComplete="new-password" required minLength={8} />
        <button className="primary">Set password</button>
      </form>
      <p className="muted">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
      {note}
    </section>
  );
}

export function EmailPage() {
  const [run, note] = useAction();
  return (
    <>
      <PageHeader title="Email & password reset" intro="Voult sends the emails. Their links open this app's /verify-email and /reset-password pages, which call the router." routes={['GET /user/verify-email', 'POST /user/forgot-password', 'POST /user/reset-password']} />
      <section>
        <h2>Forgot password</h2>
        <Embed><ForgotPassword /></Embed>
      </section>
      <section>
        <h2>Have a token from an email?</h2>
        <p className="muted">Paste the <code>token</code> (and <code>appId</code>, if the link has one) to open the page the link would.</p>
        <form onSubmit={run(async ({ kind, token, appId }) => { location.assign(`/${kind}?${new URLSearchParams({ token: token.trim(), ...(appId && { appId: appId.trim() }) })}`); })}>
          <select name="kind" aria-label="Which email"><option value="verify-email">Verify email</option><option value="reset-password">Reset password</option></select>
          <input name="token" aria-label="Token" placeholder="token" required />
          <input name="appId" aria-label="appId" placeholder="appId (optional)" />
          <button>Open</button>
        </form>
        {note}
      </section>
    </>
  );
}
