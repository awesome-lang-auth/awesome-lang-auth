# Domain switch: awesomenodeauth.com → awesomelangauth.com

From the switch day the site lives at **https://awesomelangauth.com** (the apex is the
canonical host), published by GitHub Pages from this repository
([`.github/workflows/pages.yml`](../../.github/workflows/pages.yml)).

| Host | Answers | Served by |
|---|---|---|
| `awesomelangauth.com` | the site | GitHub Pages |
| `www.awesomelangauth.com` | one 301 to the apex, same path | GitHub Pages (automatic when the apex is the custom domain) |
| `awesomenodeauth.com` | one 301 to the apex, same path and query | the VPS (this folder) |
| `www.awesomenodeauth.com` | one 301 to the apex, same path and query | the VPS (this folder) |

The order of the day, with a check for every step, is in
[`switch-day-checklist.md`](switch-day-checklist.md). Nothing in this folder is deployed
automatically: merging it changes nothing on the VPS.

For the old domain, use the variant that matches the reverse proxy on the VPS:

| Reverse proxy on the host | Use |
|---|---|
| Nginx Proxy Manager (the current VPS) | [`nginx-proxy-manager.md`](nginx-proxy-manager.md): one Redirection Host for both old names |
| Traefik v3 | [`traefik/`](traefik/): a `redirectRegex` middleware on a router for both old names (below) |

## Traefik

Apply it at the same point of the day as the Nginx Proxy Manager variant: after the new
site answers on `https://awesomelangauth.com` (checklist step 5).

1. Remove whatever Traefik routes `awesomelangauth.com` or `www.awesomelangauth.com` on this
   host: from the switch day those names point at GitHub, not here.
2. Find the Docker network Traefik is attached to:

   ```bash
   docker inspect <traefik container> --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
   ```

3. From a checkout of this repository:

   ```bash
   cd ops/domain-switch/traefik
   TRAEFIK_NETWORK=<that network> docker compose up -d
   ```

   Optional, with their defaults: `TRAEFIK_CERT_RESOLVER=myresolver` (must match a resolver in
   Traefik's static configuration: it issues one certificate for both old names),
   `TRAEFIK_ENTRYPOINT=websecure`, `TRAEFIK_HTTP_ENTRYPOINT=web`. The compose project is
   always `old-domain-redirect`. Its routers have priority 1000, so they take both old names
   over at once, even while the old site container is still running.
4. Run the checks in [`nginx-proxy-manager.md` → Verify](nginx-proxy-manager.md#verify). They
   all send a GET, and that matters here: Traefik v3 answers **301 to GET** but **308 to
   HEAD** and every other method, so `curl -I` (a HEAD) would show 308. Browsers and crawlers
   use GET and get the 301. Check 6 (`http://`) also shows a single hop, unless Traefik's
   static configuration redirects the `web` entry point to `websecure` for every host; then
   it shows two.
5. Only when the checks pass, stop the old site container (`docker stop docusaurus_docs`).

Rollback: start the old site container again, then `TRAEFIK_NETWORK=<that network> docker
compose down` in `ops/domain-switch/traefik`.
