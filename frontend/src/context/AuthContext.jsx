import { VoultProvider, useSession } from '@voult/react';
import { API_BASE } from '../lib/api';

// Session state comes from @voult/react (GET /api/auth/session via @voult/express).
// useAuth() keeps the shape the playground pages already use.

export function AuthProvider({ children }) {
  return <VoultProvider apiBase={`${API_BASE}/auth`}>{children}</VoultProvider>;
}

export function useAuth() {
  const { status, user, refresh } = useSession();
  return {
    authenticated: status === 'authenticated',
    user,
    mfaPending: status === 'mfa_required',
    loading: status === 'loading',
    refreshSession: refresh,
    // The server now tracks a pending MFA sign-in in a cookie, so re-reading the session is enough.
    setMfaPending: () => refresh(),
  };
}
