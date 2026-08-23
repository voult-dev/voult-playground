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

2. GitHub one-click login is **Voult-hosted**. Enable GitHub on the App in the Voult dashboard and register this callback on the GitHub OAuth app (not the playground):

- `{VOULT_BASE_URL}/api/oauth/github/callback` (local default: `http://localhost:3000/api/oauth/github/callback`)

Also add the playground return URL to the Voult app's allowed callback URLs:

- `http://localhost:2000/oauth/callback/github`

Do not put `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in the playground `.env`. Those belong on the Voult App record.

3. For other one-click providers (Google, Facebook, …), add credentials to `backend/.env`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
```

Register callback URLs in each provider's developer console:
- `http://localhost:2000/oauth/callback/google`
- `http://localhost:2000/oauth/callback/facebook`
- `http://localhost:2000/oauth/callback/linkedin`
- `http://localhost:2000/oauth/callback/microsoft`
- `http://localhost:2000/oauth/callback/apple` (Apple uses POST callback)

Also enable each provider in your **Voult app dashboard**.

4. Install and run:

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

