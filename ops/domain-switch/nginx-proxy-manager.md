# Old domain → awesomelangauth.com with Nginx Proxy Manager

After the switch, `awesomenodeauth.com` and `www.awesomenodeauth.com` answer every request
with **one 301** to the same path and query on `https://awesomelangauth.com`. In Nginx Proxy
Manager (NPM) that is **one Redirection Host for both old names**, with a Let's Encrypt
certificate that covers both.

**Apply this only after the new site answers on `https://awesomelangauth.com`**
([`switch-day-checklist.md`](switch-day-checklist.md), steps 1 to 5). Before that, it
would send every visitor to a site that is not there yet.

| Before | After |
|---|---|
| Proxy Host `www.awesomenodeauth.com` → the site container | gone |
| Redirection Host `awesomenodeauth.com` → `www.awesomenodeauth.com` | Redirection Host `awesomenodeauth.com` + `www.awesomenodeauth.com` → `https://awesomelangauth.com`, 301, Preserve Path |
| temporary redirection hosts `awesomelangauth.com` and `www.awesomelangauth.com` → the old site | gone: those names point at GitHub now |

NPM refuses a domain name that another host already uses, even a disabled one. That is why
the steps below delete before they edit.

## Steps

### A. Delete the temporary hosts of the new domain

Do this first, and only when the checklist's step 2 shows the GitHub addresses for
`awesomelangauth.com`. If the old domain started redirecting while these hosts still exist,
a visitor whose DNS still points the new domain at this server would bounce between the two
domains.

1. Open the NPM admin UI, **Hosts → Redirection Hosts**.
2. For every row whose domain is `awesomelangauth.com` or `www.awesomelangauth.com`: **⋮ →
   Delete**, and confirm. Look in **Hosts → Proxy Hosts** too, and delete any row with those
   names there.
3. **Certificates**: delete each certificate of `awesomelangauth.com` /
   `www.awesomelangauth.com` that now shows **Not Used** (**⋮ → Delete**, confirm). Those
   names point at GitHub now, so every automatic renewal here would fail.

### B. Request one certificate for both old names

4. **Certificates → Add Certificate → Let's Encrypt via HTTP** (not "via DNS").
5. **Domain Names**: type `awesomenodeauth.com`, press Enter, type `www.awesomenodeauth.com`,
   press Enter. Leave **Key Type** at its default if the form shows it. **Test** is optional:
   it checks from outside that both names reach this server. **Save**. Both names still point
   at this server and are still served by it, so the validation passes. The list then shows
   one certificate with both names.

   *(Before version 2.13 of NPM the menu was **SSL Certificates → Add SSL Certificate → Let's
   Encrypt**, and the form also asked for an email and the Let's Encrypt terms.)*

### C. One Redirection Host for both names

6. **Hosts → Proxy Hosts**, row `www.awesomenodeauth.com`: **⋮ → Edit**, and write down the
   forward hostname and port (for a rollback), then **Cancel**. Now **⋮ → Delete**, and
   confirm. From here until step 8 is saved (about a minute), `https://www.awesomenodeauth.com`
   refuses the connection (and `http://` shows NPM's default page).
7. **Hosts → Redirection Hosts**, row `awesomenodeauth.com`: **⋮ → Edit**.
   - **Details** tab:
     - **Domain Names**: keep `awesomenodeauth.com`, add `www.awesomenodeauth.com`;
     - **Scheme**: `https`;
     - **Forward Domain**: `awesomelangauth.com` (no `https://`, no path, no trailing slash);
     - **HTTP Code**: `301 Moved Permanently`;
     - **Preserve Path**: **on**;
     - **Block Common Exploits**: **off**. With it on, NPM answers 403 instead of the 301 to
       the few URLs whose query string looks like an attack.
   - **SSL** tab:
     - **SSL Certificate**: the certificate from step 5 (both names);
     - **Force SSL**: **off**. With it on, NPM would first send `http://` to `https://` on
       the old host and only then to the new host: two hops instead of one. With it off,
       `http://` also gets the single 301 straight to `https://awesomelangauth.com`;
     - **HTTP/2 Support**: on;
     - **HSTS Enabled**: off (NPM greys it out while Force SSL is off), and **HSTS
       Sub-domains** off.
8. **Save**. Back in the list, the host must show **Online**. In NPM 2.13 and later that
   only means the host is enabled: the checks in [Verify](#verify) are the real test.

### D. Verify, then stop the old site

9. Run the checks in [Verify](#verify).
10. Only when they all pass, stop the old site container on the VPS:
    `docker stop docusaurus_docs`. Keep its image for a few weeks, for a rollback.

## Verify

From any machine, in a bash shell (Git Bash on Windows). Each check prints the status code
and, for a redirect, where it points, so the output is the same whatever HTTP version your
`curl` speaks.

```bash
# 1. The old apex: one 301 to the same path and query on the new host
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://awesomenodeauth.com/docs/intro/?q=1'
#   301 https://awesomelangauth.com/docs/intro/?q=1

# 2. The old www: the same
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://www.awesomenodeauth.com/docs/intro/?q=1'
#   301 https://awesomelangauth.com/docs/intro/?q=1

# 3. The home page
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.awesomenodeauth.com/
#   301 https://awesomelangauth.com/

# 4. Exactly one hop, and the destination answers 200
curl -sL -o /dev/null -w '%{num_redirects} %{http_code} %{url_effective}\n' 'https://www.awesomenodeauth.com/docs/intro/?q=1'
#   1 200 https://awesomelangauth.com/docs/intro/?q=1

# 5. The certificate is valid for both names (without -k, curl fails on a bad certificate)
curl -s -o /dev/null -w '%{http_code}\n' https://awesomenodeauth.com/
curl -s -o /dev/null -w '%{http_code}\n' https://www.awesomenodeauth.com/
#   301 and 301 (000 means a certificate or connection error)

# 6. Plain HTTP: also one hop, straight to the new host
curl -sL -o /dev/null -w '%{num_redirects} %{http_code} %{url_effective}\n' 'http://www.awesomenodeauth.com/docs/intro/?q=1'
#   1 200 https://awesomelangauth.com/docs/intro/?q=1
```

If check 6 shows `2`, Force SSL is on: turn it off (step 7).

## If something goes wrong

- **Save says a domain name is already in use**: another host still has that name, possibly
  a disabled one. Find it in Proxy Hosts, Redirection Hosts or 404 Hosts and delete it.
- **The certificate request fails**: both old names must resolve to this server and port 80
  must be reachable. Retry step 5; the hosts from step 6 onwards are untouched until then.
- **Rollback**: edit the Redirection Host, remove `www.awesomenodeauth.com` and set the
  Forward Domain back to `www.awesomenodeauth.com`; add a Proxy Host for
  `www.awesomenodeauth.com` with the forward hostname and port written down in step 6 and the
  certificate from step 5. This needs the old site container, which is why step 10 comes
  last.

## Why it is built this way

- **One hop.** Every redirect in a chain costs a request and delays the move; one 301 from
  each old URL to its final URL (the apex, HTTPS, same path) is the clearest signal for
  search engines and for Search Console's Change of Address.
- **Preserve Path.** NPM then redirects to `https://awesomelangauth.com$request_uri`:
  `$request_uri` is the path and the query string exactly as the client sent them,
  percent-encoding included.
- **301.** The permanent redirect that Change of Address expects. nginx sends it to every
  method, HEAD included, so `curl -I` shows it.
- **Force SSL off.** This host never serves a page, over `http://` or `https://`: it only
  redirects, and always to `https://awesomelangauth.com`. Off, `http://` URLs take the same
  single hop as `https://` ones.
- **Delete the new-domain hosts first.** See step A: it removes any chance of a loop between
  the two domains while DNS caches expire.
- **The certificate before the delete.** Requesting it while both names are still served
  keeps `www.awesomenodeauth.com` without a host for about a minute only.
