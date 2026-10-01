import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ResponsePanel, { useApiAction } from '../components/ResponsePanel';
import PasswordField from '../components/PasswordField';

export default function MfaPage() {
  const { refreshSession, authenticated, mfaPending } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, run } = useApiAction();
  const [verifyForm, setVerifyForm] = useState({ mfaPendingToken: '', mfaToken: '' });
  const [enableToken, setEnableToken] = useState('');
  const [disableForm, setDisableForm] = useState({ password: '', mfaToken: '' });
  const [regenToken, setRegenToken] = useState('');
  const [setupResult, setSetupResult] = useState(null);

  const verifyLogin = async (e) => {
    e.preventDefault();
    // An empty token would override the pending-MFA cookie @voult/express set (e.g. after Google sign-in).
    const body = verifyForm.mfaPendingToken
      ? verifyForm
      : { mfaToken: verifyForm.mfaToken };
    try {
      await run(() => api('/auth/mfa/verify', { method: 'POST', body }));
    } catch {
      return; // shown in the response panel
    }
    await refreshSession();
    navigate('/account');
  };

  const loadStatus = () => run(() => api('/auth/mfa/status'));

  const startSetup = async () => {
    const result = await run(() => api('/auth/mfa/setup', { method: 'POST' }));
    setSetupResult(result);
  };

  const enableMfa = async (e) => {
    e.preventDefault();
    await run(() => api('/auth/mfa/enable', { method: 'POST', body: { token: enableToken } }));
    await refreshSession();
  };

  const disableMfa = async (e) => {
    e.preventDefault();
    await run(() =>
      api('/auth/mfa/disable', { method: 'POST', body: disableForm }),
    );
    await refreshSession();
  };

  const regenerate = async (e) => {
    e.preventDefault();
    await run(() =>
      api('/auth/mfa/backup-codes/regenerate', {
        method: 'POST',
        body: { token: regenToken },
      }),
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>MFA (TOTP)</h1>
        <p>All endpoints under <code>/api/auth/mfa/*</code></p>
      </header>

      <section className="form-card">
        <h2>{mfaPending ? 'Enter your verification code' : 'Login step-up'}</h2>
        {mfaPending && (
          <p className="hint">
            Your sign-in needs a second step. Enter the code from your authenticator app to finish.
          </p>
        )}
        <p className="endpoint-hint">POST /api/auth/mfa/verify</p>
        <form onSubmit={verifyLogin}>
          <label>
            MFA pending token{mfaPending && ' (optional, already saved from your sign-in)'}
            <input
              value={verifyForm.mfaPendingToken}
              onChange={(e) =>
                setVerifyForm((f) => ({ ...f, mfaPendingToken: e.target.value }))
              }
              placeholder="From email-login response"
            />
          </label>
          <label>
            TOTP (6 digits) or backup code (8 characters)
            <input
              value={verifyForm.mfaToken}
              onChange={(e) => setVerifyForm((f) => ({ ...f, mfaToken: e.target.value }))}
              placeholder="123456 or A1B2C3D4"
              autoComplete="one-time-code"
              autoFocus={mfaPending}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Verify MFA
          </button>
        </form>
      </section>

      <section className="form-card">
        <h2>Status</h2>
        <p className="endpoint-hint">GET /api/auth/mfa/status</p>
        <button type="button" className="btn btn-secondary" onClick={loadStatus} disabled={!authenticated || loading}>
          Get MFA status
        </button>
      </section>

      <section className="form-card">
        <h2>Enable MFA</h2>
        <p className="endpoint-hint">POST /api/auth/mfa/setup → POST /api/auth/mfa/enable</p>
        <button type="button" className="btn btn-secondary" onClick={startSetup} disabled={!authenticated || loading}>
          Start setup
        </button>
        {setupResult?.qrCode && (
          <div className="qr-block">
            <img src={setupResult.qrCode} alt="MFA QR code" width={200} height={200} />
            <p>
              <strong>Secret:</strong> <code>{setupResult.secret}</code>
            </p>
            {setupResult.backupCodes?.length > 0 && (
              <div>
                <strong>Backup codes (save now):</strong>
                <ul>
                  {setupResult.backupCodes.map((code) => (
                    <li key={code}>
                      <code>{code}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <form onSubmit={enableMfa}>
          <label>
            6-digit TOTP to confirm
            <input value={enableToken} onChange={(e) => setEnableToken(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!authenticated || loading}>
            Enable MFA
          </button>
        </form>
      </section>

      <section className="form-card">
        <h2>Disable MFA</h2>
        <p className="endpoint-hint">POST /api/auth/mfa/disable</p>
        <p className="hint">
          Email/password accounts need your password plus a TOTP or backup code.
          OAuth-only accounts can leave password blank and use TOTP or a backup code only.
        </p>
        <form onSubmit={disableMfa}>
          <PasswordField
            label="Password (optional for OAuth-only accounts)"
            name="password"
            value={disableForm.password}
            onChange={(e) => setDisableForm((f) => ({ ...f, password: e.target.value }))}
            showHint={false}
            required={false}
          />
          <label>
            TOTP (6 digits) or backup code (8 characters)
            <input
              value={disableForm.mfaToken}
              onChange={(e) => setDisableForm((f) => ({ ...f, mfaToken: e.target.value }))}
              placeholder="123456 or A1B2C3D4"
              required
            />
          </label>
          <button type="submit" className="btn btn-secondary" disabled={!authenticated || loading}>
            Disable MFA
          </button>
        </form>
      </section>

      <section className="form-card">
        <h2>Regenerate backup codes</h2>
        <p className="endpoint-hint">POST /api/auth/mfa/backup-codes/regenerate</p>
        <form onSubmit={regenerate}>
          <label>
            Current TOTP
            <input value={regenToken} onChange={(e) => setRegenToken(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-secondary" disabled={!authenticated || loading}>
            Regenerate
          </button>
        </form>
      </section>

      <ResponsePanel data={data} error={error} />
    </div>
  );
}
