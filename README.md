# Voult Auth Playground

Interactive playground for testing every authentication endpoint documented in `[docs/integration/VOULT_AUTH.md](docs/integration/VOULT_AUTH.md)`.

## Architecture

```
Browser (React)  →  Playground BFF (Express)  →  Voult API
                         ↑
                   holds CLIENT_SECRET
                   stores tokens in session cookie
```

The browser never sees your Voult client secret. The BFF proxies all auth calls using `voult-sdk`.

## Setup

1. Copy your Voult app credentials into `backend/.env`:

```bash
PORT=2000
VOULT_BASE_URL=https://api.voult.dev   # or your local Voult instance
APP_BASE_URL=http://localhost:5173
CLIENT_ID=app_...
CLIENT_SECRET=...
SESSION_SECRET=change-me
```

1. Add `http://localhost:5173/magic-callback` to your Voult app's allowed callback URLs if testing magic links.

2. One-click OAuth is **Voult-hosted** for every provider (Google, GitHub, Facebook, LinkedIn, Microsoft, Apple). Configure client id/secret on the Voult App, not in the playground `.env`.

Register this callback on each provider console (local default):

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

