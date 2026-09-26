# mcp.awesomenodeauth.com → 410 Gone with Nginx Proxy Manager

The hosted MCP server has been retired. Once its container is stopped, the proxy host
`mcp.awesomenodeauth.com` in Nginx Proxy Manager (NPM) should stop forwarding and answer every
request with **410 Gone** and a one-line page that points to the documentation.

**Apply this only after the MCP container has been stopped.** Before that, it cuts off a server
that still answers. Between the stop and this change, NPM answers 502 Bad Gateway.

What changes: every path, with every method, gets 410 and the page below. What stays: the
proxy host itself, its Let's Encrypt certificate (it keeps renewing) and the HTTP → HTTPS
redirect.

## Steps

1. Open the NPM admin UI and go to **Hosts → Proxy Hosts**.
2. On the row `mcp.awesomenodeauth.com`, open the **⋮** menu and choose **Edit**.
3. **Details** tab: leave the domain name, the scheme and the forward hostname/port as they
   are. Make sure **Cache Assets** is **off**. Leave the other switches as they are.
4. **Custom locations** tab: it must be empty. If it lists a location, write down what it
   says (for a rollback), then delete it.
5. **SSL** tab: change nothing. The certificate stays the Let's Encrypt one for
   `mcp.awesomenodeauth.com`, and **Force SSL** stays on.
6. **Advanced** tab: if the **Custom Nginx Configuration** box already has text, copy it
   somewhere first (for a rollback). Then replace the whole content of the box with the text in
   [Text to paste](#text-to-paste), exactly as it is.
7. Click **Save**. Back in the list, the host must still show **Online**. If it shows
   **Offline**, see [If something goes wrong](#if-something-goes-wrong).
8. Run the checks in [Verify](#verify).

## Text to paste

Paste this into **Advanced → Custom Nginx Configuration**. The first line must stay
`location / {`: NPM looks for that line and, when it finds it, leaves out its own proxy
location, so nothing is forwarded to the stopped container any more.

```nginx
location / {
    default_type text/html;
    charset utf-8;
    add_header Cache-Control "public, max-age=86400" always;
    return 410 '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>MCP server retired</title></head><body><h1>MCP server retired</h1><p>The hosted awesome-node-auth MCP server has been permanently shut down: the library is unaffected and its documentation is at <a href="https://www.awesomenodeauth.com/docs/intro/">www.awesomenodeauth.com/docs/intro/</a>.</p></body></html>\n';
}
```

## Verify

From any machine:

```bash
# 1. The status line is 410 (curl -I sends a HEAD request)
curl -sI https://mcp.awesomenodeauth.com/
#   HTTP/1.1 410 Gone
#   Content-Type: text/html; charset=utf-8
#   Cache-Control: public, max-age=86400

# 2. The old health check now returns the page, not {"status":"ok"}
curl -s https://mcp.awesomenodeauth.com/health
#   <!doctype html>…<title>MCP server retired</title>…

# 3. HTTP still redirects to HTTPS
curl -sI http://mcp.awesomenodeauth.com/
#   HTTP/1.1 301 Moved Permanently
#   Location: https://mcp.awesomenodeauth.com/

# 4. Asset-looking paths get 410 too (proves Cache Assets is off; with it on, this is 502)
curl -sI https://mcp.awesomenodeauth.com/app.js
#   HTTP/1.1 410 Gone

# 5. Status code only
curl -s -o /dev/null -w '%{http_code}\n' https://mcp.awesomenodeauth.com/
#   410
```

## If something goes wrong

- **The host shows Offline after Save**, or NPM reports an nginx error mentioning
  `duplicate location "/"`: this NPM version does not detect `location /` in the Advanced
  tab and still adds its own proxy location. Roll back (below) and report the NPM version
  shown at the bottom of the admin UI.
- **Check 4 returns 502**: Cache Assets is still on. Turn it off (step 3) and save again.
- **Rollback**: empty the Advanced box (or paste back what you copied in step 6), restore any
  custom location you deleted in step 4, and save. NPM forwards to the container again, which
  answers 502 while it is stopped.

## Why it is built this way

- **`location /`, not a bare `return 410`.** NPM places the Advanced text inside the
  host's `server { }` block. A `return` at that level runs before nginx picks a location, so
  it would also answer 410 on `/.well-known/acme-challenge/`, the path Let's Encrypt uses to
  renew the certificate. Inside `location /` it does not: NPM serves that path from a more
  specific location (`^~ /.well-known/acme-challenge/`), which wins over `/`. The certificate
  in use on 2026-09-26 expires on 2026-10-29, and renewal runs in its last 30 days.
- **No proxy location left.** NPM omits its own `location / { … proxy … }` when the Advanced
  text contains a line starting with `location /` followed by `{`.
- **Cache Assets off.** With it on, NPM adds a location for `.js`, `.css`, images and fonts
  that nginx evaluates before `location /` and that forwards to the container. Those
  paths would get 502 instead of 410.
- **`always`.** Without it, nginx adds `add_header` headers only to 2xx and 3xx responses, so
  the 410 would go out without `Cache-Control`.
- **`max-age=86400`.** Caches may store a 410 even without the header; one day keeps that
  bounded, so a change to the page reaches everyone within a day.
- **HSTS.** It is off on this host (checked on 2026-09-26). If it is ever turned on, add
  `add_header Strict-Transport-Security "max-age=63072000; preload" always;` inside the
  block: an `add_header` in a location replaces the ones set at server level.
- **The link.** `https://www.awesomenodeauth.com/docs/intro/` keeps working after the switch
  to the new domain, which redirects the old host with the path preserved.
