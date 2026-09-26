# awesome-lang-auth — site and docs

Website and documentation of the **awesome-lang-auth** family: the Node.js reference server
[awesome-node-auth](https://github.com/nik2208/awesome-node-auth) and its ports and clients in
other languages. Built with [Docusaurus](https://docusaurus.io/).

The site used to live in the `wiki/` folder of the owner's private development repository and
has moved here. It is served at <https://awesomelangauth.com/> by GitHub Pages. The old
domain, `awesomenodeauth.com` and `www.awesomenodeauth.com`, answers every URL with one 301 to
the same path on the new host (see [The old domain](#the-old-domain)).

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

**GitHub Pages.** Every push to `main` builds the site and publishes it at
<https://awesomelangauth.com/> ([`.github/workflows/pages.yml`](.github/workflows/pages.yml));
the workflow can also be started by hand from the Actions tab. The repository's Pages
settings use the source **GitHub Actions** and the custom domain `awesomelangauth.com`.
`static/CNAME` names the same domain, but with a deployment from Actions GitHub reads the
setting, not the file. Check what is live with

```bash
curl -sSI https://awesomelangauth.com/ | grep -i last-modified
```

GitHub Pages serves the build as plain files, so `nginx.conf` does not apply there. The one
visible difference: `/docs/` has no page of its own and answers 404 on GitHub Pages, while the
Docker image below redirects it to `/docs/intro/`.

### Docker (self-hosting or rollback)

The `Dockerfile` builds the same site and serves it with nginx (`nginx.conf`), behind a
reverse proxy that terminates TLS. It is not how the live site is published; it is how to
host the site on a server of your own, or to bring it back to the VPS. Deployment with Docker
is **manual**: nothing reaches that server until someone runs it.

#### Profiles

`docker-compose.yml` has one service per reverse proxy. Pick exactly one profile; without
`--profile` nothing starts.

| Profile | Service | For | What it sets |
|---|---|---|---|
| `npm` | `site-npm` | host behind Nginx Proxy Manager (like the VPS) | container `docusaurus_docs`, port `${PORT:-3000}:80`, network `awesome-node-auth` (alias `docusaurus-wiki`, the old service name), no Traefik labels |
| `traefik` | `site-traefik` | host behind Traefik | the same, plus the router labels for `awesomelangauth.com` (entrypoint `websecure`, resolver `myresolver`) |

Both services use the container name `docusaurus_docs`, so never enable both profiles at once.

On the host, from a checkout of this repository, with the optional values in `.env` next to
`docker-compose.yml` (see [Build](#build)):

```bash
docker compose --profile npm up -d --build      # Nginx Proxy Manager
docker compose --profile traefik up -d --build  # Traefik
```

`--build` is not optional: the image contains the built site (and `.env` is read at build
time), so a plain restart republishes the previous build.

#### Replacing a container started from another checkout

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

1. The **Deploy to GitHub Pages** run of the push is green, and
   `curl -sSI https://awesomelangauth.com/ | grep -i last-modified` shows its date.
2. Spot-check a page added since the last deploy (it must return `200`, not `404`).
3. `curl -s https://awesomelangauth.com/sitemap.xml | grep -o '<loc>' | wc -l` matches the number
   of routes you expect, and contains no URL that `robots.txt` disallows.
4. The old domain redirects that page too: `curl -sI https://www.awesomenodeauth.com/<path>/`
   answers `301` with `Location: https://awesomelangauth.com/<path>/`.
5. In [Google Search Console](https://search.google.com/search-console): resubmit the sitemap,
   then run **URL Inspection → Request indexing** on the pages that changed.

## The old domain

`awesomenodeauth.com` and `www.awesomenodeauth.com` are no longer served from this
repository. The VPS answers every URL on them with one 301 to the same path and query on
`https://awesomelangauth.com`, and GitHub Pages redirects `www.awesomelangauth.com` to the
apex. The reverse proxy configuration (Nginx Proxy Manager or Traefik) and the order of the
switch are in [`ops/domain-switch/`](ops/domain-switch/).
