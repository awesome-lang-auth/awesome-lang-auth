# awesome-lang-auth — site and docs

Website and documentation of the **awesome-lang-auth** family: the Node.js reference server
[awesome-node-auth](https://github.com/nik2208/awesome-node-auth) and its ports and clients in
other languages. Built with [Docusaurus](https://docusaurus.io/).

The site used to live in the `wiki/` folder of the owner's private development repository and
has moved here. It is still served at <https://www.awesomenodeauth.com/>: the old domain stays
until the switch to `awesomelangauth.com`, so canonical URLs, `robots.txt`, the sitemap and the
Traefik label below keep the old host for now.

## Development

Node.js 20 or later.

```bash
npm ci
npm start
```

The site runs at http://localhost:3000/.

## Build

```bash
npm ci && npm run build
```

The static output is in `build/`. The build needs no environment variable: without them the
AI assistant stays disabled and the account API script (`auth.js`) is not injected.

## AI Assistant Configuration

The documentation site includes a built-in AI assistant (floating button, bottom-right). All parameters are injected at **build time** via environment variables — nothing is stored in the browser.

**Step 1** — Copy the example env file:

```bash
cp .env.example .env
```

**Step 2** — Edit `.env`:

```bash
# Required — OpenAI Responses API endpoint (supports MCP servers)
AI_LLM_ENDPOINT=https://api.openai.com/v1/responses

# Model selection (leave empty for endpoint default)
AI_MODEL=gpt-4o-mini

# Sampling — 0.0 deterministic → 1.0 random (default: model default)
AI_TEMPERATURE=0.3

# Max tokens per reply (default: model default, typically 4096)
AI_MAX_TOKENS=2048
```

> Security note: MCP tool config, MCP bearer auth, and system prompt are injected server-side by `mcp-server` (`POST /tools/ai-proxy`). Do not put secrets in `.env`.

See [`.env.example`](.env.example) for the full reference with all comments.

**Step 3** — Rebuild:

```bash
npm run build
```

> **Note:** `.env` is gitignored. Never commit your API key.
> The variables are passed to the image as build args by `docker-compose.yml` (Docusaurus inlines them into the static bundle at build time, so they must be present when the image is built, not when the container starts).

## Deploy

**The site is not published by GitHub Actions.** The live site is a Docker container built
from this repository: `Dockerfile` builds the static site and serves it with nginx
(`nginx.conf`), behind the reverse proxy that terminates TLS.

Deployment is therefore **manual**, and nothing reaches the site until someone runs it.
A stale deploy is invisible from the repository: check what is actually live with

```bash
curl -sSI https://www.awesomenodeauth.com/ | grep -i last-modified
```

### Profiles

`docker-compose.yml` has one service per reverse proxy. Pick exactly one profile; without
`--profile` nothing starts.

| Profile | Service | For | What it sets |
|---|---|---|---|
| `npm` | `site-npm` | host behind Nginx Proxy Manager (the current VPS) | container `docusaurus_docs`, port `${PORT:-3000}:80`, network `awesome-node-auth`, no Traefik labels |
| `traefik` | `site-traefik` | host behind Traefik | the same, plus the router labels for `www.awesomenodeauth.com` (entrypoint `websecure`, resolver `myresolver`) |

Both services use the container name `docusaurus_docs`, so never enable both profiles at once.

On the host, from a checkout of this repository, with the build values in `.env` next to
`docker-compose.yml` (see above):

```bash
docker compose --profile npm up -d --build      # Nginx Proxy Manager
docker compose --profile traefik up -d --build  # Traefik
```

`--build` is not optional: the AI-assistant and account API variables are baked into the
JS bundle at build time, so a plain restart republishes the previous bundle.

### Replacing a container started from another checkout

Compose names the project, and therefore the network, after the checkout directory. The
container that runs today was started from the old `wiki/` folder, so it belongs to project
`wiki` and its network is `wiki_awesome-node-auth`. From this checkout (project
`awesome-lang-auth`) a plain `up` stops on the name conflict and leaves the old container
running. To replace it in place, with the same name, port and network:

```bash
# 1. Which project owns the running container? (prints e.g. "wiki")
docker inspect docusaurus_docs --format '{{ index .Config.Labels "com.docker.compose.project" }}'

# 2. Reuse the build values of the old checkout
cp /path/to/old/checkout/wiki/.env .env

# 3. Build, then swap the container inside that project
docker compose -p wiki --profile npm up -d --build --remove-orphans
```

`--remove-orphans` removes the old `docusaurus-wiki` service container of that project right
before `site-npm` is created with the same name; the network `wiki_awesome-node-auth` is reused.
Keep passing `-p wiki` (or set `COMPOSE_PROJECT_NAME=wiki` in `.env`) for every later
`up`, `down` or `logs` on that host.

### After every deploy — SEO checklist

1. `curl -sSI https://www.awesomenodeauth.com/ | grep -i last-modified` shows today's date.
2. Spot-check a page added since the last deploy (it must return `200`, not `404`).
3. `curl -s https://www.awesomenodeauth.com/sitemap.xml | grep -c '<loc>'` matches the number
   of routes you expect, and contains no URL that `robots.txt` disallows.
4. `/docs/` returns `301` to `/docs/intro/` (handled by `nginx.conf`).
5. In [Google Search Console](https://search.google.com/search-console): resubmit the sitemap,
   then run **URL Inspection → Request indexing** on the pages that changed.

### Known issue, outside this repository

`https://awesomenodeauth.com` (apex) and `https://www.awesomenodeauth.com` both answer `200`
with identical content — the canonical tag points at `www`, but the duplicate host still
wastes crawl budget and splits signals. The fix belongs to the openresty instance in front of
Traefik, which must answer the apex with a permanent redirect:

```nginx
server {
    server_name awesomenodeauth.com;
    return 301 https://www.awesomenodeauth.com$request_uri;
}
```
