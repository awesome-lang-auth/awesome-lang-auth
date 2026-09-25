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

The static output is in `build/`. The build needs no environment variable. The optional ones
(Google Analytics, and the host port and project name for `docker compose`) are listed in
[`.env.example`](.env.example): copy it to `.env`, which is gitignored, and rebuild.

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
| `npm` | `site-npm` | host behind Nginx Proxy Manager (the current VPS) | container `docusaurus_docs`, port `${PORT:-3000}:80`, network `awesome-node-auth` (alias `docusaurus-wiki`, the old service name), no Traefik labels |
| `traefik` | `site-traefik` | host behind Traefik | the same, plus the router labels for `www.awesomenodeauth.com` (entrypoint `websecure`, resolver `myresolver`) |

Both services use the container name `docusaurus_docs`, so never enable both profiles at once.

On the host, from a checkout of this repository, with the optional values in `.env` next to
`docker-compose.yml` (see [Build](#build)):

```bash
docker compose --profile npm up -d --build      # Nginx Proxy Manager
docker compose --profile traefik up -d --build  # Traefik
```

`--build` is not optional: the image contains the built site (and `.env` is read at build
time), so a plain restart republishes the previous build.

### Replacing a container started from another checkout

Compose names the project, and therefore the network, after the checkout directory. The
container that runs today was probably started from the old `wiki/` folder (the old README
said `cd wiki && docker compose up -d --build`), which would make its project `wiki` and its
network `wiki_awesome-node-auth`; step 1 below checks it. From this checkout (project
`awesome-lang-auth`) a plain `up` stops on the name conflict and leaves the old container
running. It does create a network first: if you ran it, remove that network with
`docker network rm awesome-lang-auth_awesome-node-auth`.

To replace the container in place, with the same name, port and network:

```bash
# 1. Which project owns the running container?
P=$(docker inspect docusaurus_docs --format '{{ index .Config.Labels "com.docker.compose.project" }}')
echo "$P"                                   # e.g. wiki

# 2. What --remove-orphans will delete: this must list only docusaurus_docs
docker ps -a --filter "label=com.docker.compose.project=$P" --format '{{.Names}}'

# 3. Reuse only what compose and the site still read (PORT, GOOGLE_ANALYTICS_ID,
#    COMPOSE_PROJECT_NAME): no AI assistant or account API setting or key is carried over.
#    If none of them is set, .env ends up empty, which is fine.
grep -E '^(PORT|GOOGLE_ANALYTICS_ID|COMPOSE_PROJECT_NAME)=' /path/to/old/checkout/wiki/.env > .env

# 4. Build, then swap the container inside that project
docker compose -p "$P" --profile npm up -d --build --remove-orphans
```

`--remove-orphans` removes the containers listed in step 2 (the old `docusaurus-wiki` service)
right before `site-npm` is created with the same name. The network `${P}_awesome-node-auth` is
reused, and the container still answers to `docusaurus-wiki` on it. On a Traefik host, use
`--profile traefik` in step 4. Keep passing `-p "$P"` (or set `COMPOSE_PROJECT_NAME` to that
value in `.env`) for every later `up`, `down` or `logs` on that host.

**Rollback.** Step 4 builds a new image (`$P-site-npm`) and leaves the old one
(`$P-docusaurus-wiki`) on disk. To go back to it:

```bash
docker compose -p "$P" -f /path/to/old/checkout/wiki/docker-compose.yml up -d --no-build --remove-orphans
```

Once the new container is verified, remove the old image with
`docker image rm "$P-docusaurus-wiki"`.

**Switching profile on a host.** Both profiles use the same container name, so a direct
`--profile traefik up` on a host that runs `site-npm` stops on the name conflict. Stop the
running profile first: `docker compose -p "$P" --profile npm down`, then
`docker compose -p "$P" --profile traefik up -d --build`.

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
wastes crawl budget and splits signals. The fix belongs to the reverse proxy in front of the
container, which must answer the apex with a permanent redirect. On the current VPS that is
Nginx Proxy Manager: add a *Redirection Host* for `awesomenodeauth.com` →
`https://www.awesomenodeauth.com` (301, *Preserve Path*). On a plain nginx/openresty front
end, use this block:

```nginx
server {
    server_name awesomenodeauth.com;
    return 301 https://www.awesomenodeauth.com$request_uri;
}
```
