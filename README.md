# Voult Auth Playground

Interactive playground for testing every authentication endpoint documented in `[docs/integration/VOULT_AUTH.md](docs/integration/VOULT_AUTH.md)`.

Password auth, session cookies, and error handling come from [`@voult/express`](../voult-sdk/packages/express) (`createVoultRouter()`, mounted at `/api/auth` in `backend/src/routes/api.js`) — this repo is a **reference consumer** of that package, not the place to copy BFF code from. MFA, WebAuthn, OAuth, and social login stay local here until they graduate into the package (Phase 2+). Integrators should start at [`voult`'s quick-start doc](../voult/docs/integration/QUICK_START.md) or the standalone [`voult-demo`](../voult-demo) app instead.

## Architecture

```
Browser (React)  →  Playground BFF (Express, using @voult/express)  →  Voult API
                         ↑
                   holds CLIENT_SECRET
                   stores tokens in session cookie
```

The browser never sees your Voult client secret. The BFF proxies all auth calls using `voult-sdk`.

## Setup

1. Copy `backend/.env.example` to `backend/.env` and fill in your Voult app credentials (canonical `VOULT_*` names — legacy `CLIENT_ID`/`CLIENT_SECRET`/`SESSION_SECRET` still work with a deprecation warning):

```bash
PORT=2000
VOULT_BASE_URL=                        # optional: @voult/sdk ≥0.1.2 defaults to https://staging.voult.dev; set for a local Voult instance
APP_BASE_URL=http://localhost:5173
VOULT_CLIENT_ID=app_...
VOULT_CLIENT_SECRET=...
VOULT_SESSION_SECRET=change-me
```

1. Add `http://localhost:5173/magic-callback` to your Voult app's allowed callback URLs if testing magic links.

2. One-click OAuth is **Voult-hosted** for every provider (Google, GitHub, Facebook, LinkedIn, Microsoft, Apple). Configure client id/secret on the Voult App, not in the playground `.env`.

Register Voult's hosted callback on each provider console (`<VOULT_BASE_URL>/api/oauth/<provider>/callback`, e.g. `https://staging.voult.dev/api/oauth/github/callback`; local default shown below):

- `http://localhost:3000/api/oauth/google/callback`
- `http://localhost:3000/api/oauth/github/callback`
- `http://localhost:3000/api/oauth/facebook/callback`
- `http://localhost:3000/api/oauth/linkedin/callback`
- `http://localhost:3000/api/oauth/microsoft/callback`
- `http://localhost:3000/api/oauth/apple/callback`

Add the playground return URLs to the Voult app's allowed callback URLs:

- `http://localhost:2000/oauth/callback/google`
- `http://localhost:2000/oauth/callback/github`
- `http://localhost:2000/oauth/callback/facebook`
- `http://localhost:2000/oauth/callback/linkedin`
- `http://localhost:2000/oauth/callback/microsoft`
- `http://localhost:2000/oauth/callback/apple`

3. Install and run:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- BFF API: [http://localhost:2000/api](http://localhost:2000/api)



## Covered endpoints

All endpoints from VOULT_AUTH.md §11:


| Feature       | Endpoints                                                              |
| ------------- | ---------------------------------------------------------------------- |
| Password auth | register, username-register, email-login, username-login, logout       |
| MFA           | setup, enable, verify, status, disable, backup-codes/regenerate        |
| WebAuthn      | compatibility, register/login options & verify, credentials CRUD       |
| Sessions      | list, revoke, refresh                                                  |
| User          | me (GET/PATCH), verify-email, forgot/reset password, disable, reenable |
| Magic link    | send-magic-link, validate-magic-link                                   |
| OAuth         | google/github/facebook/linkedin/microsoft/apple login & register       |
| OAuth linking | link, oauth-accounts, unlink, set-password                             |
| Audit         | audit-logs/me                                                          |




## Password rules

Voult only accepts these special characters: `@$!%*?&`

Passwords like `V:ajRyizU7jt:_T` fail because `:` and `_` are not allowed, even though they look strong. Use something like `Str0ng!Pass` instead.

## Scripts

- `npm run dev` — start backend + frontend together
- `npm run dev:backend` — BFF only
- `npm run dev:frontend` — React UI only

