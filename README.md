# Voult playground

The [`express-react` template](https://github.com/voult-dev/voult-sdk/tree/main/templates/express-react) (what `npx create-voult-app` gives you) plus a few showcase extras, so you can try every Voult feature and see the API calls behind it.

- **Every page of the template:** sign-up/in (password, Google/GitHub/LinkedIn, magic link, passkey), MFA, sessions, linked accounts, password reset, email verification, account deletion.
- **API calls panel** (bottom of every page): each `/api/*` call the page makes, with its request (passwords masked) and the JSON that came back. It survives the full page load after sign-in.
- **Utilities page** (`/utilities`): router routes the template's pages don't use: the raw session, which providers are on, your activity log, and setting a password on a Google/GitHub-only account.

The server has **no auth code of its own**: `backend/auth.js` mounts `@voult/express`, which serves every auth route. CI fails if that changes (`npm run check:backend`).

## Run it

```bash
npm install
npx voult init     # writes .env with your app's Client ID and Secret (once)
npm run dev        # API on :3000, app on http://localhost:5173
```

In the Voult dashboard, add `http://localhost:5173/api/auth/oauth/callback` under **Callback URLs** (it also covers magic links), turn on providers under **Sign-in providers**, then `npm run doctor`.

## Where things are

```
backend/                  the template's server, unchanged
frontend/src/             the template's frontend, unchanged except:
  App.jsx, main.jsx       + the Utilities page, the API calls panel and the fetch recorder
  playground/             everything playground-only
    inspector.js          records /api/* calls (wraps fetch; masks passwords and tokens)
    Inspector.jsx         the API calls panel
    Utilities.jsx         the /utilities page
scripts/check-backend.mjs CI guard: no auth routes in backend/ besides the router mount
```

To pick up template changes, copy `backend/` and `frontend/` from the template again and re-apply the two small edits in `App.jsx` and `main.jsx` (and the `<title>` in `index.html`).

## Production

```bash
npm run build && npm start   # one server on $PORT serves the API and the app
```

Set `VOULT_CLIENT_ID`, `VOULT_CLIENT_SECRET`, `VOULT_SESSION_SECRET` and `NODE_ENV=production` on the host, add `https://<host>/api/auth/oauth/callback` under Callback URLs, and check with `npx voult doctor --production`.

## Tests

```bash
npm test               # the backend guard and the API calls recorder
npm run check:backend  # the guard alone
```
