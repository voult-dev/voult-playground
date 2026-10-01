// Codes providers send when the user backs out of the consent screen.
const CANCEL_CODES = ['access_denied', 'user_cancelled_login', 'user_cancelled_authorize', 'consent_required'];

/**
 * A message a person can read for a hosted-OAuth redirect error (?voult_error=…).
 * @param {{ code: string, description: string | null }} error
 */
export function describeOAuthError({ code, description }) {
  if (CANCEL_CODES.includes(code)) {
    return { cancelled: true, message: 'Sign-in was cancelled, so nothing changed.' };
  }
  if (code === 'INVALID_OAUTH_STATE') {
    return { cancelled: false, message: 'That sign-in link expired. Please try again.' };
  }
  if (code === 'PROVIDER_ALREADY_LINKED_TO_ANOTHER_USER') {
    return { cancelled: false, message: 'That provider account is already linked to a different user.' };
  }
  return { cancelled: false, message: description || 'Sign-in failed. Please try again.' };
}
