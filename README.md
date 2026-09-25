# awesome-node-auth Wiki

Documentation site for [awesome-node-auth](https://github.com/nik2208/awesome-node-auth), built with [Docusaurus](https://docusaurus.io/).

## Development

```bash
npm install
npm start
```

The site runs at http://localhost:3000/.

## AI Assistant Configuration

The documentation site includes a built-in AI assistant (floating button, bottom-right). All parameters are injected at **build time** via environment variables — nothing is stored in the browser.

**Step 1** — Copy the example env file:

```bash
cp .env.example .env
```

**Step 2** — Edit `wiki/.env`:

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

> Security note: MCP tool config, MCP bearer auth, and system prompt are injected server-side by `mcp-server` (`POST /tools/ai-proxy`). Do not put secrets in `wiki/.env`.

See [`.env.example`](.env.example) for the full reference with all comments.

**Step 3** — Rebuild:

```bash
npm run build
```

> **Note:** `wiki/.env` is gitignored. Never commit your API key.  
> The variables are passed to the image as build args by `docker-compose.yml` (Docusaurus inlines them into the static bundle at build time, so they must be present when the image is built, not when the container starts).

## Build

```bash
npm run build
```

The static output is in `build/`.

## Deploy

**The site is NOT published by GitHub Actions.** `.github/workflows/docs.yml` targets GitHub
Pages and is intentionally disabled (`on: push: branches: [never]`); the live site at
<https://www.awesomenodeauth.com/> is a Docker container built from this directory —
`Dockerfile` builds the static site and serves it with nginx (`nginx.conf`), behind the
reverse proxy that terminates TLS.

Deployment is therefore **manual**, and nothing reaches the site until someone runs it.
A stale deploy is invisible from the repository: check what is actually live with

```bash
curl -sSI https://www.awesomenodeauth.com/ | grep -i last-modified
```

### Redeploy

On the host, from a checkout of this repository:

```bash
cd wiki && docker compose up -d --build
```

`--build` is not optional: the AI-assistant and account API variables are baked into the
JS bundle at build time, so a plain restart republishes the previous bundle.

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
