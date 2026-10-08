# Multi Tool on Replit

## Start the web app

Install the workspace dependencies and start the frontend on port 5000:

```sh
pnpm install --frozen-lockfile
PORT=5000 pnpm --filter @workspace/multi-tool run dev
```

The Cookie Checker sends requests to the configured Bothost Node API at
`https://bot-1788812847-5100-s4234sfdsfsdf.bothost.tech/api`. To use a different
API, set `VITE_RELAY_URL` when building the frontend.

## Cookie Checker analytics

Add universe IDs or place IDs under **Settings → Игры для аналитики** for
PlayTime and InGame Donate. Add per-game Game Pass IDs and badge IDs in the
second settings section to check those collections. The checker displays
Roblox game names, icons, account names, and the matching amounts/items.

Cookies are sent over HTTPS to the configured API for validation and are not
saved in browser storage. The API does not log request bodies or persist cookie
values. Configure `ALLOWED_ORIGIN` on the API host if that deployment restricts
cross-origin requests.
