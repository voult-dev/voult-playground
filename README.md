# Voult playground

A feature explorer for Voult: try every sign-in method and account feature against a real app, and watch the API call behind each click. It is built on the [`express-react` template](https://github.com/voult-dev/voult-sdk/tree/main/templates/express-react) (what `npx create-voult-app` gives you): the template's server and components, unchanged, inside a playground shell.

- **Sidebar of features**, grouped (Sign in · Your account · Explore). Items that need you signed in, or signed out, are dimmed with the reason; the session card shows who's signed in.
- **Every page lists the router routes it calls**, and the **API calls panel** shows each `/api/*` request and response (passwords and tokens masked, kept across the full page load after sign-in, session checks hideable).
- **Pages:** sign in and sign up (email or username), Google/GitHub & co. (sign-in intents, linking), magic link (send, or paste a token), passkeys (browser support check, sign in, add/rename/remove), two-factor (set up, backup codes, turn off, the sign-in code step), sessions (sign out any device, refresh tokens now), account (profile, edit name, set a password, sign out, delete), email & reset (forgot password, open a verify/reset link from its token), utilities (raw session, enabled providers, your activity log).

The server has **no auth code of its own**: `backend/auth.js` mounts `@voult/express`, which serves every auth route. CI fails if that changes (`npm run check:backend`). Retired from the old playground: the manual OAuth token exchange (hosted OAuth replaced it) and account re-enable (deletion signs you out first).

## Run it

```bash
npm install
npx voult init     # writes .env with your app's Client ID and Secret (once)
npm run dev        # API on :3000, app on http://localhost:5173
```

In the Voult dashboard, add `http://localhost:5173/api/auth/oauth/callback` under **Callback URLs** (it also covers magic links), turn on providers under **Sign-in providers**, then `npm run doctor`.

## Where things are

```
backend/                   the template's server, unchanged
frontend/src/              the template's frontend, unchanged (App.jsx, pages/ are the template's, unused here)
  main.jsx                 renders the playground instead of App, and starts the API call recorder
  playground/
    Playground.jsx         the shell: sidebar, session card, page, API calls panel
    pages.js               the sidebar/route table (label, group, who can use it)
    access.js              signed in / signed out / mid-MFA rules for each page (tested)
    SignInPages.jsx        sign in, sign up, OAuth, magic link, passkeys
    AccountPages.jsx       MFA, sessions, account, email & reset
    Home.jsx, Utilities.jsx
    ui.jsx                 page header with routes, gate, tabs
    inspector.js           records /api/* calls (wraps fetch; masks secrets; tested)
    Inspector.jsx          the API calls panel
    playground.css         the playground's look (light and dark)
scripts/check-backend.mjs  CI guard: no auth routes in backend/ besides the router mount
```

To pick up template changes, copy `backend/` and `frontend/` (except `main.jsx` and `index.html`) from the template again; the playground only adds files under `frontend/src/playground/`.

## Production

```bash
npm run build && npm start   # one server on $PORT serves the API and the app
```

Set `VOULT_CLIENT_ID`, `VOULT_CLIENT_SECRET`, `VOULT_SESSION_SECRET` and `NODE_ENV=production` on the host, add `https://<host>/api/auth/oauth/callback` under Callback URLs, and check with `npx voult doctor --production`.

## Tests

```bash
npm test               # the backend guard, the access rules and the API calls recorder
npm run check:backend  # the guard alone
```
