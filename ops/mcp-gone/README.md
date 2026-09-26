# Retiring mcp.awesomenodeauth.com: 410 Gone

The hosted awesome-node-auth MCP server is being retired. Once its container has been stopped,
`mcp.awesomenodeauth.com` should answer every request with **410 Gone** and a one-line page
that points to the documentation, keeping its TLS certificate. A 410 tells clients and search
engines that the server is gone for good, not temporarily down.

Nothing here is deployed automatically: merging this folder changes nothing on the server.
Apply one of the two variants by hand, after the MCP container is stopped.

| Reverse proxy on the host | Use |
|---|---|
| Nginx Proxy Manager (the current VPS) | [`nginx-proxy-manager.md`](nginx-proxy-manager.md): a block to paste in the proxy host's Advanced tab |
| Traefik | [`traefik/`](traefik/): a small nginx container with the Traefik labels (below) |

Both variants return the same page with the same headers; the location block in
`traefik/nginx.conf` is the text pasted into Nginx Proxy Manager.

## Traefik

1. Stop the MCP stack first (`docker compose down` in its directory). Two routers with the
   same `Host()` rule would compete for the same requests.
2. Find the Docker network Traefik is attached to:

   ```bash
   docker inspect <traefik container> --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
   ```

3. From a checkout of this repository:

   ```bash
   cd ops/mcp-gone/traefik
   TRAEFIK_NETWORK=<that network> docker compose up -d
   ```

   Optional, with their defaults: `TRAEFIK_CERT_RESOLVER=myresolver` (must match a resolver in
   Traefik's static configuration), `TRAEFIK_ENTRYPOINT=websecure`,
   `TRAEFIK_HTTP_ENTRYPOINT=web`. The compose project is always `mcp-gone`.
4. Run the checks in [`nginx-proxy-manager.md` → Verify](nginx-proxy-manager.md#verify). The
   expected answers are the same, except that Traefik v3 redirects HTTP to HTTPS with
   `308 Permanent Redirect` instead of 301, and may answer over HTTP/2 (`HTTP/2 410`).

Rollback: `TRAEFIK_NETWORK=<that network> docker compose down` in the same folder.
