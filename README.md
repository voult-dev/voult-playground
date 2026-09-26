# Voult Auth Playground

Interactive playground for testing every authentication endpoint documented in `[docs/integration/VOULT_AUTH.md](docs/integration/VOULT_AUTH.md)`.

Password auth, sessions, MFA verification and **hosted OAuth** come from [`@voult/express`](../voult-sdk/packages/express) (`createVoultRouter()`, mounted at `/api/auth` in `backend/src/routes/api.js`); the frontend's session state and OAuth buttons come from [`@voult/react`](../voult-sdk/packages/react). This repo is a **reference consumer** of those packages, not the place to copy BFF code from. MFA setup, WebAuthn and the manual token-exchange tool stay local here. Integrators should start at [`voult`'s quick-start doc](../voult/docs/integration/QUICK_START.md) or the standalone [`voult-demo`](../voult-demo) app instead.

## Architecture

```
Browser (React + @voult/react)  →  Playground BFF (Express + @voult/express)  →  Voult API
                                        ↑
                                  holds CLIENT_SECRET
                                  stores tokens in httpOnly cookies
```

The browser never sees your Voult client secret. The BFF proxies all auth calls using `voult-sdk`.

## Setup

1. Copy `backend/.env.example` to `backend/.env` and fill in your Voult app credentials (canonical `VOULT_*` names — legacy `CLIENT_ID`/`CLIENT_SECRET`/`SESSION_SECRET` still work with a deprecation warning):

```bash
PORT=2000
VOULT_BASE_URL=                        # optional: @voult/sdk ≥0.1.2 defaults to https://staging.voult.dev; set for a local Voult instance
VOULT_APP_URL=http://localhost:5173    # OAuth sends users back to the frontend
VOULT_CLIENT_ID=app_...
VOULT_CLIENT_SECRET=...
VOULT_SESSION_SECRET=change-me
```

1. Add `http://localhost:5173/magic-callback` to your Voult app's allowed callback URLs if testing magic links.

2. One-click OAuth is **Voult-hosted**: no provider keys in `.env`.
   - In the Voult dashboard, open your app → **Sign-in providers**, paste each provider's Client ID and Secret, and register the callback URL shown there (e.g. `https://staging.voult.dev/api/oauth/github/callback`) with the provider.
   - Under **Callback URLs**, add `http://localhost:2000/api/auth/oauth/callback` (while the list is empty, localhost is accepted anyway).
   - The OAuth page shows a button for every provider that's on **and** configured. Successful sign-ins land on `/account`, MFA users on `/mfa`, and errors back on `/oauth?voult_error=…`.
   - Run `npx voult doctor` in `backend/` to check all of the above.

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

