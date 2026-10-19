// Who can use which playground page. Plain data + one function, so the sidebar and the pages
// agree and it can be tested without React.

/** @typedef {'always' | 'guest' | 'signed-in' | 'signed-in-or-mfa'} Access */

/**
 * @param {Access} access
 * @param {'loading' | 'authenticated' | 'unauthenticated' | 'mfa_required' | string} status from useSession()
 * @returns {'ok' | 'loading' | 'sign-in' | 'sign-out' | 'finish-mfa'}
 */
export function pageState(access, status) {
  if (status === 'loading') return 'loading';
  if (access === 'always') return 'ok';
  if (access === 'guest') {
    if (status === 'authenticated') return 'sign-out';
    return status === 'mfa_required' ? 'finish-mfa' : 'ok';
  }
  if (access === 'signed-in-or-mfa') return status === 'authenticated' || status === 'mfa_required' ? 'ok' : 'sign-in';
  if (status === 'authenticated') return 'ok';
  return status === 'mfa_required' ? 'finish-mfa' : 'sign-in';
}

/** Why a sidebar item is dimmed, or null when it's usable now. */
export function lockReason(access, status) {
  const state = pageState(access, status);
  if (state === 'sign-in') return 'Sign in to try this';
  if (state === 'sign-out') return 'Sign out to try this';
  if (state === 'finish-mfa') return 'Finish signing in (MFA) first';
  return null;
}
