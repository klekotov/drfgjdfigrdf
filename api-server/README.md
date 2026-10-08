# Multi Tool API Server

This Express service handles Cookie Checker requests directly. It calls Roblox
from the server and does not require a Cloudflare Worker, `WORKER_URL`, or
`RELAY_TOKEN`. Game analytics include configured PlayTime, InGame Donate,
owned Game Passes, and badges.

## Local workspace

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
PORT=8080 pnpm --filter @workspace/api-server run start
```

The web app uses the configured Bothost API URL by default. Run the API locally
only when you want to test the server in this workspace:

```sh
PORT=8080 pnpm --filter @workspace/api-server run dev
```

The Vite web workflow runs on port 5000 and sends Cookie Checker requests to
`https://bot-1788812847-5100-s4234sfdsfsdf.bothost.tech/api`. Set
`VITE_RELAY_URL` at build time to override that URL.

## Timeweb deployment

Use a Timeweb VPS or another Node.js host that can run a persistent Node
process. From the repository root, build and start the API service:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
PORT=8080 NODE_ENV=production ALLOWED_ORIGIN=https://your-web-domain.example \
  pnpm --filter @workspace/api-server run start
```

If the frontend and API use different domains, build the frontend with its API
base URL:

```sh
VITE_RELAY_URL=https://your-api-domain.example/api
```

Put the API behind HTTPS. `ALLOWED_ORIGIN` accepts a comma-separated list of
web origins. CORS only controls browser access; it is not authentication.
The API does not persist cookie values or include request bodies in logs.

## Routes

- `GET /api/healthz`
- `POST /api/validate` — `{ "cookie": "..." }`
- `POST /api/validate-batch` — `{ "cookies": ["..."] }`
- `POST /api/refresh` — `{ "cookie": "..." }`
- `POST /api/refresh-batch` — `{ "cookies": ["..."] }`
- `POST /api/check-full` — `{ "cookie": "...", "gameIds": [] }`
- `POST /api/check-full-batch` — `{ "cookies": ["..."], "gameIds": [] }`

For Game Pass and badge checks, both full-check routes also accept
`gameChecks: [{ "gameId": 123, "gamepassIds": [456], "badgeIds": [789] }]`.
The arrays are optional; each game supports up to 50 Game Pass IDs and 100
badge IDs. Badge matching also includes badges awarded by the configured game.

Game IDs for PlayTime and InGame Donate may be universe IDs or place IDs. The
API resolves the universe, game name, and thumbnail. PlayTime uses Roblox's
weekly screen-time endpoint and is available only when Roblox returns that
account's screen-time data. Purchase history is paginated (up to ten pages) to
find configured games.