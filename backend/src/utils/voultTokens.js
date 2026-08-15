import { sanitizeUserProfile } from './sanitizeResponse.js';
import { signPayload, verifySignedPayload, getCookieSecret } from './signedCookie.js';

export const ACCESS_COOKIE = 'voult_access';
export const REFRESH_COOKIE = 'voult_refresh';
export const USER_COOKIE = 'voult_user';
export const MFA_COOKIE = 'voult_mfa_pending';
export const OAUTH_COOKIE = 'voult_oauth';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

function clearCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
}

function cookieOptions(maxAge) {
  return {
    ...clearCookieOptions(),
    maxAge,
  };
}

export function readVoultTokens(req) {
  let user = null;

  if (req.cookies?.[USER_COOKIE]) {
    try {
      user = JSON.parse(req.cookies[USER_COOKIE]);
    } catch {
      user = null;
    }
  }

  return {
    accessToken: req.cookies?.[ACCESS_COOKIE] || null,
    refreshToken: req.cookies?.[REFRESH_COOKIE] || null,
    mfaPendingToken: req.cookies?.[MFA_COOKIE] || null,
    user,
  };
}

export function applyVoultTokensFromCookies(req, client) {
  const tokens = readVoultTokens(req);

  if (tokens.accessToken) {
    client.setSession(tokens.user, tokens.accessToken, tokens.refreshToken);
  } else if (tokens.refreshToken) {
    client.setSession(tokens.user, null, tokens.refreshToken);
  } else {
    client.clearSession();
  }

  return tokens;
}

export function persistVoultAuth(res, result) {
  if (!res || !result || res.headersSent) return;

  const accessToken = result.accessToken || result.token;
  if (!accessToken) return;

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ONE_HOUR_MS));

  if (result.refreshToken) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions(SEVEN_DAYS_MS));
  }

  const user = sanitizeUserProfile(result.user);
  if (user) {
    res.cookie(USER_COOKIE, JSON.stringify(user), cookieOptions(SEVEN_DAYS_MS));
  }

  res.clearCookie(MFA_COOKIE, clearCookieOptions());
}

export function clearVoultAuth(res) {
  if (!res) return;

  const opts = clearCookieOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
  res.clearCookie(USER_COOKIE, opts);
  res.clearCookie(MFA_COOKIE, opts);
}

export function persistMfaPending(res, mfaPendingToken) {
  if (!res || !mfaPendingToken) return;
  res.cookie(MFA_COOKIE, mfaPendingToken, cookieOptions(TEN_MINUTES_MS));
}

export function setOAuthState(res, { provider, state, redirectUri }) {
  const payload = {
    provider,
    state,
    redirectUri,
    exp: Date.now() + TEN_MINUTES_MS,
  };

  res.cookie(OAUTH_COOKIE, signPayload(payload), cookieOptions(TEN_MINUTES_MS));
}

export function readOAuthState(req) {
  const raw = req.cookies?.[OAUTH_COOKIE];
  if (!raw) return null;

  const payload = verifySignedPayload(raw, getCookieSecret());
  if (!payload || payload.exp < Date.now()) return null;

  return payload;
}

export function clearOAuthState(res) {
  if (!res) return;
  res.clearCookie(OAUTH_COOKIE, clearCookieOptions());
}
