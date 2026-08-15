import crypto from 'crypto';

export function getCookieSecret() {
  return process.env.SESSION_SECRET || process.env.SECRET || 'voult-playground-dev-secret';
}

export function signPayload(payload, secret = getCookieSecret()) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySignedPayload(token, secret = getCookieSecret()) {
  if (!token || typeof token !== 'string') return null;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const data = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
