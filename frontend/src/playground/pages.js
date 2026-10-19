// Sidebar and routes in one table. `access` is checked by access.js; pages without a `group`
// are link targets (from emails, OAuth) that aren't in the sidebar.

/** @type {Array<{ path: string, label: string, group?: string, access: import('./access.js').Access, blurb?: string }>} */
export const PAGES = [
  { path: '/', label: 'Overview', group: 'Start', access: 'always' },
  { path: '/login', label: 'Sign in', group: 'Sign in', access: 'guest', blurb: 'Email or username + password, with the MFA step when it\'s on.' },
  { path: '/signup', label: 'Create account', group: 'Sign in', access: 'guest', blurb: 'Email or username accounts, with email verification.' },
  { path: '/oauth', label: 'Google, GitHub & co.', group: 'Sign in', access: 'always', blurb: 'Hosted OAuth sign-in, and linking providers to an account.' },
  { path: '/magic-link', label: 'Magic link', group: 'Sign in', access: 'guest', blurb: 'A one-time sign-in link by email.' },
  { path: '/passkeys', label: 'Passkeys', group: 'Sign in', access: 'always', blurb: 'Add a passkey, then sign in with Touch ID or a security key.' },
  { path: '/mfa', label: 'Two-factor (MFA)', group: 'Your account', access: 'signed-in-or-mfa', blurb: 'Authenticator-app codes and backup codes.' },
  { path: '/sessions', label: 'Sessions', group: 'Your account', access: 'signed-in', blurb: 'Every signed-in device; sign any of them out.' },
  { path: '/account', label: 'Account', group: 'Your account', access: 'signed-in', blurb: 'Profile, a password for OAuth accounts, sign out, delete.' },
  { path: '/email', label: 'Email & reset', group: 'Your account', access: 'always', blurb: 'Email verification and password reset.' },
  { path: '/utilities', label: 'Utilities', group: 'Explore', access: 'always', blurb: 'Raw session, enabled providers, your activity log.' },
  { path: '/forgot-password', label: 'Forgot password', access: 'always' },
  { path: '/reset-password', label: 'Reset password', access: 'always' },
  { path: '/verify-email', label: 'Verify email', access: 'always' },
];
