# How Voult Works in This Codebase

This document explains how the **Voult Auth Playground** integrates with the Voult API, what patterns it demonstrates for production apps, and how easy (or difficult) adoption is today.

It is written for developers who will ship Voult alongside their own product — the same audience as the public docs and this demo app.

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [The three layers](#3-the-three-layers)
4. [How the BFF talks to Voult](#4-how-the-bff-talks-to-voult)
5. [Authentication flows in detail](#5-authentication-flows-in-detail)
6. [Session and token management](#6-session-and-token-management)
7. [Response sanitization (playground-specific)](#7-response-sanitization-playground-specific)
8. [How to incorporate Voult in your own app](#8-how-to-incorporate-voult-in-your-own-app)
9. [Environment variables](#9-environment-variables)
10. [Ease vs difficulty today](#10-ease-vs-difficulty-today)
11. [Known gotchas](#11-known-gotchas)
12. [Recommended integration path](#12-recommended-integration-path)
13. [Related documentation](#13-related-documentation)

---

## 1. What this project is

The Voult Auth Playground is a **reference implementation**, not a library. It shows:

- Every major Voult auth feature (password, MFA, passkeys, magic link, OAuth, sessions, account management)
- The **recommended BFF (Backend-for-Frontend) pattern** — your app server holds the Voult client secret and stores tokens in a session cookie
- How **`voult-sdk`** wraps the HTTP API on the server side

Your product users never call Voult directly. They call **your** backend (`localhost:2000/api` in dev), which proxies to Voult (`VOULT_BASE_URL`).

```
Browser (React, :5173)  →  Playground BFF (Express, :2000)  →  Voult API
                                    ↑
                          CLIENT_ID + CLIENT_SECRET
                          access/refresh tokens in session
```

---

## 2. Architecture at a glance

| Layer | Tech | Role |
|-------|------|------|
| **Frontend** | React + Vite (`frontend/`) | Demo UI; calls only `/api/*` on the BFF with cookies |
| **BFF** | Express (`backend/`) | Holds secrets, runs `voult-sdk`, manages Express session |
| **Voult API** | External (`voult/` repo or hosted) | Identity: register, login, tokens, MFA, OAuth, audit |

**Important:** The browser never receives `CLIENT_SECRET` or raw Voult refresh tokens in API responses intended for the demo UI (tokens live server-side in the session).

---

## 3. The three layers

### 3.1 Frontend (`frontend/`)

- **Pages** under `frontend/src/pages/` — one page per auth feature (Sign up, Sign in, MFA, Passkeys, OAuth, Account, etc.)
- **`frontend/src/lib/api.js`** — thin `fetch` wrapper; all requests go to `/api` with `credentials: 'include'` so the BFF session cookie is sent
- **`frontend/src/context/AuthContext.jsx`** — loads `GET /api/auth/session` on mount to know if the user is signed in
- **`frontend/src/lib/navAccess.js`** — disables nav items based on auth state (guest vs signed-in flows)
- **Vite proxy** — in dev, `/api` is proxied to `http://localhost:2000`

The frontend is intentionally dumb about Voult: it does not know client IDs, secrets, or token formats. It only knows playground BFF routes.

### 3.2 BFF (`backend/`)

| File / folder | Purpose |
|---------------|---------|
| `src/app.js` | Express app factory (CORS, session, routes) — used by tests and `index.js` |
| `src/index.js` | Starts the server on `PORT` (default 2000) |
| `src/config/client.js` | Single shared `VoultClient` instance (`CLIENT_ID`, `CLIENT_SECRET`, `VOULT_BASE_URL`) |
| `src/config/session.js` | Express session cookie config |
| `src/routes/api.js` | Main BFF router — maps `/api/*` to `voult-sdk` functions |
| `src/routes/oauthFlow.js` | One-click OAuth redirect flow (Google, GitHub, etc.) |
| `src/middleware/syncVoultClient.js` | Syncs session tokens ↔ SDK client on every request |
| `src/middleware/requireAuth.js` | Blocks BFF routes that need a signed-in user |
| `src/utils/voultSession.js` | Persist/clear Voult auth on Express session |
| `src/utils/sanitizeResponse.js` | Strips internal fields from responses (demo-safe) |
| `src/middleware/errorHandler.js` | Normalizes SDK/Voult errors for the UI |

### 3.3 Voult API (external)

- Lives in the **`voult`** repository (or hosted at `api.voult.dev`, `staging.voult.dev`, etc.)
- Validates `X-Client-Id` / `X-Client-Secret` on server routes
- Issues JWT **access tokens** and rotating **refresh tokens**
- Enforces password rules, MFA, rate limits, OAuth provider config per App

---

## 4. How the BFF talks to Voult

### 4.1 SDK client setup

```js
// backend/src/config/client.js
import { VoultClient } from 'voult-sdk';

const client = new VoultClient({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  baseURL: process.env.VOULT_BASE_URL,
});
```

This repo links the SDK locally via `"voult-sdk": "file:../../voult-sdk"` in `backend/package.json` so playground changes stay in sync with SDK development. Published npm installs work the same way with a version pin.

### 4.2 Request headers (what Voult sees)

| Header | When | Set by |
|--------|------|--------|
| `X-Client-Id` | Almost all API calls | SDK interceptor |
| `X-Client-Secret` | Most mutating + authed calls | SDK `request()` (default on) |
| `Authorization: Bearer <accessToken>` | After login | SDK when `client.setSession()` has a token |

OAuth provider routes on Voult typically use **`X-Client-Id` only** (no secret). Password and account routes require **both** client ID and secret.

### 4.3 Typical BFF route pattern

```js
// Simplified from backend/src/routes/api.js
router.post('/auth/email-login', catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await signInWithEmailAndPassword(email, password, client);
  handleAuthResult(req, res, result);
}));

function handleAuthResult(req, res, result) {
  if (result?.mfaRequired) {
    persistMfaPending(req, result.mfaPendingToken);
    return res.json({ step: 'mfa', mfaRequired: true, ... });
  }
  persistVoultAuth(req, result);
  return sendSanitizedJson(res, result);
}
```

Every auth success path:

1. Calls the matching **`voult-sdk`** function with the shared `client`
2. Stores `accessToken`, `refreshToken`, and a sanitized user on **`req.session.voult`**
3. Returns a JSON shape the React UI can display in the response panel

Protected BFF routes use `requireAuth`, which checks `req.session.voult.accessToken` before calling Voult with `requireAuth: true` on SDK methods.

---

## 5. Authentication flows in detail

### 5.1 Password register / login

| User action | BFF route | Voult API | SDK function |
|-------------|-----------|-----------|--------------|
| Email sign up | `POST /api/auth/register` | `POST /api/auth/register` | `signUpWithEmailAndPassword` |
| Email sign in | `POST /api/auth/email-login` | `POST /api/auth/email-login` | `signInWithEmailAndPassword` |
| Username sign up | `POST /api/auth/username-register` | `POST /api/auth/username-register` | `signUpWithUsernameAndPassword` |
| Username sign in | `POST /api/auth/username-login` | `POST /api/auth/username-login` | `signInWithUsernameAndPassword` |
| Sign out | `POST /api/auth/logout` | `POST /api/auth/logout` | `signOut` |

**Password rules (enforced by Voult):** min 8 chars, upper, lower, number, and special from `@$!%*?&` only. The frontend validates this in `frontend/src/lib/password.js`.

**Email verification:** After register, Voult may require email verification before login. The Account page exposes `GET /api/user/verify-email?token=...&appId=...`.

### 5.2 MFA (TOTP)

1. Login returns `{ mfaRequired: true, mfaPendingToken }` instead of tokens
2. BFF stores `mfaPendingToken` on session
3. User submits TOTP on MFA page → `POST /api/auth/mfa/verify`
4. On success, full tokens are persisted like a normal login

Setup/disable/regenerate backup codes are authenticated BFF routes that proxy to `/api/auth/mfa/*`.

See also: [docs/TESTING_MFA_AND_PASSKEYS.md](../TESTING_MFA_AND_PASSKEYS.md).

### 5.3 Magic link

1. `POST /api/send-magic-link` with email + redirect URI (defaults to `{APP_BASE_URL}/magic-callback`)
2. User clicks link in email → frontend `/magic-callback?token=...`
3. `POST /api/validate-magic-link` → session established

Add your magic callback URL to the Voult App’s **allowed callback URLs** in the developer portal.

### 5.4 OAuth (one-click flow)

This is the most moving parts in the playground.

```
User clicks "Sign in with Google" on frontend
  → GET /oauth/google/start (BFF)
  → Redirect to Google consent
  → Google redirects to /oauth/callback/google?code=...&state=...
  → BFF exchanges code with Google (using GOOGLE_CLIENT_* in backend/.env)
  → BFF sends idToken/accessToken to Voult:
       POST /api/auth/google/authenticate  (preferred — find or create user)
  → Tokens stored in session → redirect to /account
```

**Why the BFF exchanges the OAuth code:** Provider client secrets stay in **your** `.env`, not on the Voult App record. The BFF sends the resulting token to Voult.

**Provider credentials:** Each provider needs `PROVIDER_CLIENT_ID` and `PROVIDER_CLIENT_SECRET` in `backend/.env`, plus callback URLs registered in the provider’s developer console (see README).

**Fallback for older Voult APIs:** If `/authenticate` is missing (e.g. older staging deploy), the BFF tries `login` then `register`. See `authenticateWithVoult()` in `backend/src/routes/oauthFlow.js`.

### 5.5 Passkeys (WebAuthn)

- Registration and login use `@simplewebauthn` patterns via SDK helpers
- `frontend/src/lib/webauthn.js` converts base64url options for `navigator.credentials`
- Voult must have `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` set to your frontend origin (e.g. `localhost` / `http://localhost:5173`)

### 5.6 Sessions, profile, account

| Feature | BFF | Voult |
|---------|-----|-------|
| List sessions | `GET /api/sessions` | `GET /api/sessions` |
| Revoke session | `GET /api/sessions/revoke/:id` | `GET /api/sessions/revoke/:sessionId` |
| Refresh tokens | `POST /api/sessions/refresh` | `POST /api/sessions/refresh` |
| Profile | `GET/PATCH /api/user/me` | `GET/PATCH /api/user/me` |
| Disable / re-enable | `POST /api/user/disable`, `/reenable` | same |
| Password reset | `POST /api/user/forgot-password`, `/reset-password` | same |
| Audit logs | `GET /api/audit-logs/me` | raw HTTP via `client.get()` |
| OAuth linking | `/api/oauth/:provider/link`, `/api/me/oauth-accounts` | same |

---

## 6. Session and token management

### 6.1 What is stored in the BFF session

```js
req.session.voult = {
  user: { email, username, name, ... },  // sanitized — no app id, no end-user id
  accessToken: '...',
  refreshToken: '...',
};
req.session.mfaPendingToken = '...';  // only during MFA step-up
```

### 6.2 syncVoultClient middleware

On **every** request:

1. If session has tokens → `client.setSession(user, accessToken, refreshToken)`
2. Else → `client.clearSession()`
3. After response, if SDK refreshed tokens → write back to session

This keeps one shared SDK client safe in a multi-request Express app.

### 6.3 Frontend session awareness

`GET /api/auth/session` returns:

```json
{
  "authenticated": true,
  "mfaPending": false,
  "user": { "email": "...", "name": "..." }
}
```

No tokens are exposed to the browser.

---

## 7. Response sanitization (playground-specific)

Because this app ships as a **public demo** next to Voult docs, the BFF redacts internal data from responses:

- **GET routes** — `sendSanitizedGet()` in `backend/src/utils/sanitizeResponse.js`
- **Auth/profile mutations** — `sendSanitizedJson()` strips sensitive fields from embedded `user` objects

Removed fields include: `app`, `appId`, `clientId`, internal Mongo ids, `isEmailVerified`, password/MFA secrets, tokens in GET payloads, etc.

**Your production app** may choose to expose more (e.g. a stable user id for your DB foreign key). The playground intentionally hides end-user ids in the UI response panel. You still receive tokens server-side for session management.

---

## 8. How to incorporate Voult in your own app

### 8.1 Minimum viable integration (password auth)

**Difficulty: Easy** (~1–2 days for a experienced backend dev)

1. Create a Voult App in the developer portal → copy `clientId` + `clientSecret`
2. Add a backend (Node, Python, Go, etc.) — **never** put the secret in a SPA
3. Install `voult-sdk` (or use raw HTTP with the same headers)
4. Implement four routes:

   | Your route | Voult / SDK |
   |------------|-------------|
   | `POST /auth/register` | `signUpWithEmailAndPassword` |
   | `POST /auth/login` | `signInWithEmailAndPassword` |
   | `GET /auth/me` | `getCurrentUser` |
   | `POST /auth/logout` | `signOut` + clear your session |

5. Store `accessToken` + `refreshToken` in **your** session store (Redis, encrypted cookie, DB)
6. On each authenticated request, set the token on the SDK client or pass `Authorization: Bearer`

Copy patterns directly from `backend/src/routes/api.js` and `backend/src/utils/voultSession.js`.

### 8.2 Recommended production architecture

**Difficulty: Easy to moderate**

Use the same BFF pattern as this playground:

```
Your React/Vue/mobile app  →  Your API (BFF)  →  Voult API
```

- Frontend: session cookie or your own JWT for *your* app session
- BFF: Voult tokens + client secret
- Your DB: product data keyed by Voult user id (store id server-side even if you hide it from the client)

### 8.3 Adding MFA, magic link, passkeys

**Difficulty: Moderate**

Each feature is a few extra BFF routes — the playground already lists them in `frontend/src/lib/api.js` `endpoints`. Copy the corresponding handlers from `backend/src/routes/api.js`.

MFA adds a **two-step login** branch (`mfaRequired`). Magic link and passkeys need **callback URLs** and WebAuthn env on Voult.

### 8.4 Adding OAuth (one-click)

**Difficulty: Moderate to hard**

You need:

1. OAuth apps at each provider (Google Cloud, GitHub, etc.)
2. Redirect URIs pointing at **your BFF** (e.g. `https://api.yourapp.com/oauth/callback/google`)
3. Provider secrets in server env
4. Either:
   - **Pattern A (this playground):** BFF exchanges code → sends token to Voult `authenticate` — secrets stay on your server
   - **Pattern B:** Configure provider credentials on the Voult App and use Voult-hosted OAuth (fewer moving parts on your side, more config in Voult dashboard)

Start with **one provider (Google)** by copying `backend/src/routes/oauthFlow.js`.

### 8.5 What you should NOT build

| Don't build | Use instead |
|-------------|-------------|
| Your own password hashing | Voult register/login |
| JWT signing for auth identity | Voult access tokens |
| OAuth token exchange duplicated in frontend | BFF + SDK |
| Storing client secret in React/React Native | Server-only env |
| CSRF token dance for Voult API from mobile | BFF with client credentials |

Product **authorization** (roles, permissions, billing) stays in your database. Voult only answers “who is this user?”

### 8.6 Mapping Voult users to your database

Typical pattern:

1. On first login/register, read Voult user from token response **on the server**
2. `UPSERT` into your `users` table with `voult_user_id` (or email as lookup)
3. Your app session references your internal user row

The playground skips this — it is auth-only with no product DB.

---

## 9. Environment variables

### 9.1 Required (BFF)

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | `2000` | BFF listen port |
| `VOULT_BASE_URL` | `http://localhost:3000` or `https://staging.voult.dev` | Voult API base (no trailing slash recommended) |
| `CLIENT_ID` | `app_...` | Voult App client ID |
| `CLIENT_SECRET` | `...` | Voult App secret — **server only** |
| `SESSION_SECRET` | random string | Express session signing |
| `APP_BASE_URL` | `http://localhost:5173` | Frontend URL for redirects |

### 9.2 OAuth one-click (optional per provider)

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, etc.

See `backend/.env` example in README.

### 9.3 Voult server (self-hosted)

For passkeys and some OAuth checks:

- `WEBAUTHN_RP_ID=localhost`
- `WEBAUTHN_ORIGIN=http://localhost:5173`

---

## 10. Ease vs difficulty today

| Area | Difficulty | Notes |
|------|------------|-------|
| **Password register/login/logout** | Easy | SDK + BFF routes are straightforward; well tested in this repo |
| **Session check / profile** | Easy | `GET /api/auth/session`, `GET /api/user/me` |
| **Email verification & password reset** | Easy | Needs allowed URLs + email delivery configured on Voult |
| **MFA setup & login step-up** | Moderate | Two-phase login; backup codes; SDK normalizes TOTP/backup validation |
| **Magic link** | Moderate | Callback URL allowlisting |
| **Passkeys** | Moderate | WebAuthn env + HTTPS in production |
| **OAuth (manual token paste in UI)** | Easy | POST body with idToken/code to BFF |
| **OAuth (one-click redirect)** | Hard | Provider consoles, redirect URIs, BFF callback handler, token exchange |
| **OAuth linking / set password** | Moderate | Authenticated routes; CSRF must be off on API (fixed in current voult) |
| **Audit logs & provider visibility** | Easy | Single GET proxies |
| **Deploying against hosted Voult** | Moderate | **API version must match** — see gotchas |
| **Production hardening** | Moderate | HTTPS, secure cookies, refresh rotation, rate-limit UX, IP allowlist |

**Overall:** Voult is **easy to integrate for core password auth** following this BFF pattern. **OAuth one-click and passkeys** are the main complexity spikes. The playground exists so you can copy working code instead of reading raw OpenAPI.

---

## 11. Known gotchas

### 11.1 API version / deployment mismatch

Hosted environments (e.g. `staging.voult.dev`) may lag behind the local `voult` repo. Symptoms:

| Symptom | Cause |
|---------|--------|
| `401 UNAUTHORIZED` on `POST /api/auth/google/authenticate` | `/authenticate` route not deployed yet |
| `403 EBADCSRFTOKEN` on OAuth or account routes | Old CSRF middleware on API routes |
| `404` on `GET /api/provider-visibility/...` | Route not mounted in that deploy |

**Fix:** Deploy latest Voult API, or point `VOULT_BASE_URL` to a current instance (local dev). See [docs/bug_fix/csrf_fix.md](../bug_fix/csrf_fix.md).

### 11.2 CSRF is for the Voult **developer portal**, not your BFF

Global CSRF in Voult applies to **web** routes (`/login`, `/register`, app creation). API routes under `/api` should use **client credentials**, not CSRF tokens. The SDK does not implement CSRF cookie flows — by design.

### 11.3 SDK package source

This monorepo uses `file:../../voult-sdk`. If you `npm install voult-sdk` from npm, ensure the published version exports helpers you need (`authenticateWithGoogle`, MFA fixes, etc.). When in doubt, link locally during development.

### 11.4 Password special characters

Only `@$!%*?&` are allowed. Common strong-password generators use `:` or `_` which **will fail** validation.

### 11.5 Staging vs production URLs

Double-check `VOULT_BASE_URL`, callback URLs in the Voult dashboard, and OAuth redirect URIs all refer to the **same environment**.

### 11.6 Token refresh

Voult rotates refresh tokens. After `POST /api/sessions/refresh`, always persist the **new** refresh token (the playground does this in `syncVoultClient` + session save).

---

## 12. Recommended integration path

For a new product using Voult:

1. **Week 1 — Core auth**
   - BFF with register, login, logout, session, `GET /me`
   - Copy from `backend/src/routes/api.js` + session helpers
   - Map Voult user → your DB on first login

2. **Week 2 — Account lifecycle**
   - Email verification, forgot/reset password
   - Profile update (`PATCH /me`)

3. **As needed**
   - MFA (if security requirements need it)
   - One OAuth provider via `oauthFlow.js` pattern
   - Magic link or passkeys for passwordless

4. **Before launch**
   - Run this playground against your target `VOULT_BASE_URL` and click through every flow
   - Enable IP allowlist / audit if your plan includes them
   - HTTPS, `secure: true` session cookies, secrets in a vault

---

## 13. Related documentation

| Document | Contents |
|----------|----------|
| [VOULT_AUTH.md](./VOULT_AUTH.md) | Canonical integration guide (BFF mental model, endpoint map, CSRF notes) |
| [README.md](../../README.md) | Quick start, OAuth callback URLs, scripts |
| [API_fUNCTIONS.md](../information/API_fUNCTIONS.md) | Full HTTP API reference |
| [SDK_FUNCTIONS.md](../information/SDK_FUNCTIONS.md) | SDK method reference |
| [TESTING_MFA_AND_PASSKEYS.md](../TESTING_MFA_AND_PASSKEYS.md) | Local testing for MFA & WebAuthn |
| [csrf_fix.md](../bug_fix/csrf_fix.md) | CSRF troubleshooting for API routes |
| [docs/bug_fix/](../bug_fix/) | Other integration issues encountered in this project |

---

## Summary

- **This codebase** = React demo UI + Express BFF + `voult-sdk` → Voult API.
- **Your app** should copy the **BFF + session** pattern, not call Voult from the browser.
- **Easiest path:** password auth and session management (~few routes).
- **Harder paths:** one-click OAuth, passkeys, keeping hosted API version in sync.
- **Use this playground** as living documentation: every button maps to a BFF route and a Voult endpoint listed in the UI and in `frontend/src/lib/api.js`.

When in doubt, trace: **Page → `api()` → BFF route in `api.js` → SDK function → Voult HTTP path.**
