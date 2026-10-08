# Bothost Node API

This package replaces the old Worker-forwarding relay with the direct Node.js
Cookie Checker API. It calls Roblox from the Bothost server and does not use
`WORKER_URL`, `RELAY_TOKEN`, or `WEBSHARE_*` settings.

## Install

1. Upload and extract all files from the ZIP into the Docker build directory.
   Keep `Dockerfile`, `package.json`, `index.js`, `index.mjs`, and the Pino
   worker `.mjs` files together.
2. Build and start the service from the included Dockerfile, or use Node.js 20+
   with `node index.js`.
3. Keep the port assigned by Bothost in `PORT` and set `NODE_ENV=production`.
4. If the service uses a CORS allowlist, set `ALLOWED_ORIGIN` to the exact
   frontend origin. Multiple origins can be comma-separated.
5. Rebuild and restart the service.

The frontend may keep using the same Bothost hostname. Its
`VITE_RELAY_URL` can be the hostname alone or the hostname with `/api`; this
server supports both path forms. `VITE_RELAY_URL` is a frontend build-time
setting, so rebuild the frontend if its current build points elsewhere.

The bundled build shipped with this project accepts the `gameChecks` property
on `/api/check-full` and `/api/check-full-batch` for owned Game Pass and badge
checks. Each entry uses `{ "gameId": 123, "gamepassIds": [456], "badgeIds":
[789] }`; omit either ID list when it is not needed. The game ID can be a
universe ID or place ID.

## Health and API paths

Health checks are available at `/health`, `/api/health`, `/healthz`, and
`/api/healthz`. Cookie Checker routes work both with and without the `/api`
prefix, including `/check-full-batch` and `/api/check-full-batch`.

Full-check routes accept `gameIds` for PlayTime and InGame Donate and an
optional `gameChecks` array for Game Pass and badge ownership:

```json
{
  "gameIds": [123],
  "gameChecks": [
    { "gameId": 123, "gamepassIds": [456], "badgeIds": [789] }
  ]
}
```

Keep the service behind HTTPS. `ALLOWED_ORIGIN` controls browser CORS; it does
not authenticate direct requests. The service does not persist cookie values
or log request bodies.