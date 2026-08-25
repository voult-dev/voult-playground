const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

export function getFrontendUrl() {
  const configured =
    process.env.FRONTEND_URL ||
    process.env.VOULT_APP_URL ||
    process.env.APP_BASE_URL ||
    DEFAULT_FRONTEND_URL;

  return configured.replace(/\/$/, '');
}

/** @deprecated Prefer getFrontendUrl for user-facing redirects */
export function getAppBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }

  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}
