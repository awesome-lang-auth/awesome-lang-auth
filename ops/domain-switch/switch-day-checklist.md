# Switch day checklist

The order matters: the new site first, the old domain's redirects last. Until step 6 the
old domain keeps serving the old site from the VPS, so nobody who follows an old link sees
an outage, and every step before it can be undone by putting DNS back.

Every step ends with a check. The checks are bash commands (`curl`, `grep`, `nslookup`): on
Windows, run them in Git Bash. Most `curl` checks print the status code and, for a redirect,
where it points (`-w '%{http_code} %{redirect_url}\n'`), so the expected line is the same
whatever HTTP version your `curl` speaks. A check that still shows the old answer right after
a DNS change may come from the local DNS cache: `ipconfig /flushdns` on Windows, then retry.

## Before the day

These must all be true before step 1. Each has its check.

1. **The domain is verified for the organization in GitHub Pages** (organization settings →
   Pages → Verified domains). It stops anyone else from claiming `awesomelangauth.com` on
   GitHub Pages.

   ```bash
   nslookup -type=TXT _github-pages-challenge-awesome-lang-auth.awesomelangauth.com 8.8.8.8
   #   a TXT record with the value shown in the settings
   ```

2. **Both domains are Domain properties in Search Console, verified by DNS.** After step 6
   the verification file on the old host is a redirect to the new host, so a property of the
   old domain verified only by that file may lose its verification, and Change of Address
   (step 7) needs the old property verified.

   ```bash
   nslookup -type=TXT awesomelangauth.com 8.8.8.8
   nslookup -type=TXT awesomenodeauth.com 8.8.8.8
   #   each lists a google-site-verification=… record
   ```

3. **The new domain redirects with 302, never 301, until the day.** Browsers keep a 301 for
   as long as they like. A cached `awesomelangauth.com` → `www.awesomelangauth.com` 301 would
   loop forever with GitHub's `www` → apex redirect after the switch. The earlier they are
   302, the fewer browsers keep an old 301.

   ```bash
   curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://awesomelangauth.com/
   curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.awesomelangauth.com/
   #   both: 302 and the URL it points to (not 301, not 200)
   ```

4. **DNS TTL lowered, at least a day before.** At IONOS, set the TTL of the A/AAAA records of
   `awesomelangauth.com` and of `www.awesomelangauth.com` to 5 minutes, so the DNS change on
   the day reaches everyone quickly.

   ```bash
   nslookup -debug awesomelangauth.com 8.8.8.8 | grep -i ttl
   #   ttl = 300 or less (once the old, longer TTL has expired)
   ```

5. **No CAA record blocks Let's Encrypt**, which issues the GitHub Pages certificate.

   ```bash
   nslookup -type=CAA awesomelangauth.com 8.8.8.8
   #   no CAA record, or one that lists letsencrypt.org
   ```

## On the day

### 1. GitHub Pages settings

Repository `awesome-lang-auth/awesome-lang-auth` → **Settings → Pages**:

- **Build and deployment → Source**: **GitHub Actions**.
- **Custom domain**: `awesomelangauth.com` → **Save**. The DNS check fails until step 2:
  that is expected. With a GitHub Actions deployment this setting is what counts; the
  `static/CNAME` file in the repository is ignored by GitHub.
- **Enforce HTTPS**: not yet (step 4).

```bash
gh api repos/awesome-lang-auth/awesome-lang-auth/pages --jq '.build_type + " " + .cname'
#   workflow awesomelangauth.com      (the same two values are on the Settings → Pages page)
```

### 2. DNS at IONOS (`awesomelangauth.com`)

- Delete every **A** and **AAAA** record of `awesomelangauth.com` (`@`) and of `www`, and any
  `www` CNAME: they point at the VPS today.
- Apex (`@`), four **A** records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
  `185.199.111.153`.
- Apex (`@`), four **AAAA** records: `2606:50c0:8000::153`, `2606:50c0:8001::153`,
  `2606:50c0:8002::153`, `2606:50c0:8003::153`.
- `www`: one **CNAME** to `awesome-lang-auth.github.io`.
- Keep every TXT record (Search Console, GitHub Pages challenge) and the mail records.

Repeat until the answers match, on two public resolvers:

```bash
nslookup -type=A awesomelangauth.com 8.8.8.8        # only the four 185.199.10x.153
nslookup -type=AAAA awesomelangauth.com 8.8.8.8     # only the four 2606:50c0:800x::153
nslookup -type=CNAME www.awesomelangauth.com 8.8.8.8  # awesome-lang-auth.github.io
nslookup -type=A awesomelangauth.com 1.1.1.1        # the same four
```

### 3. Merge the pull request

The pull request is a draft, and its own build check (**Deploy to GitHub Pages / build**, run
on every push to the pull request) must be green. On the pull request page: **Ready for
review**, then **Squash and merge**, right after step 2. The **Deploy to GitHub Pages**
workflow runs on the push to `main` and publishes the site (Actions tab: both jobs green,
about 5 minutes).

```bash
curl -s -o /dev/null -D - http://awesomelangauth.com/ | grep -iE '^(HTTP|server)'
#   the status line ends in 200, and "Server: GitHub.com" (the name may be lowercase)
curl -s http://awesomelangauth.com/ | grep -o 'rel="canonical" href="[^"]*"'
#   rel="canonical" href="https://awesomelangauth.com/"
```

### 4. Wait for the certificate, then Enforce HTTPS

In **Settings → Pages**, the DNS check turns green, then GitHub requests the certificate
(usually minutes; GitHub says it can take up to 24 hours). When **Enforce HTTPS** can be
ticked, tick it. If it is still greyed out after a few hours, remove the custom domain, save,
add it again and save.

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://awesomelangauth.com/
#   200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'http://awesomelangauth.com/docs/intro/?q=1'
#   301 https://awesomelangauth.com/docs/intro/?q=1
```

### 5. Verify the new site

```bash
# The www host redirects to the apex in one hop, path and query preserved
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://www.awesomelangauth.com/docs/intro/?q=1'
#   301 https://awesomelangauth.com/docs/intro/?q=1

# Canonical URLs on the apex
curl -s https://awesomelangauth.com/docs/intro/ | grep -o 'rel="canonical" href="[^"]*"'
#   rel="canonical" href="https://awesomelangauth.com/docs/intro/"

# A path without the trailing slash gets it; a missing page is a real 404
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://awesomelangauth.com/docs/intro
#   301 https://awesomelangauth.com/docs/intro/
curl -s -o /dev/null -w '%{http_code}\n' https://awesomelangauth.com/no-such-page/
#   404

# robots.txt, the sitemap, llms.txt and the Search Console file are served
curl -s https://awesomelangauth.com/robots.txt | grep Sitemap
#   Sitemap: https://awesomelangauth.com/sitemap.xml
curl -s https://awesomelangauth.com/sitemap.xml | grep -o '<loc>https://awesomelangauth.com/' | wc -l
#   the number of pages of the build (69 when this was written)
curl -s https://awesomelangauth.com/sitemap.xml | grep -o '<loc>[^<]*' | grep -vc 'https://awesomelangauth.com/'
#   0
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://awesomelangauth.com/llms.txt
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://awesomelangauth.com/llms-full.txt
#   200 text/plain; charset=utf-8
curl -s https://awesomelangauth.com/google635c063a344579f7.html
#   google-site-verification: google635c063a344579f7.html

# Every page of the sitemap answers 200 (bash; no output means all good)
for u in $(curl -s https://awesomelangauth.com/sitemap.xml | grep -o '<loc>[^<]*' | cut -c6-); do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$u"); [ "$c" = 200 ] || echo "$c $u"
done
```

If anything here is wrong, stop: the old domain still serves the old site. To undo steps 1
to 4, put the DNS records of step 2 back as they were.

### 6. The old domain: one 301 to the new host

Only when step 5 is all green. On the VPS with Nginx Proxy Manager follow
[`nginx-proxy-manager.md`](nginx-proxy-manager.md); with Traefik,
[`README.md` → Traefik](README.md#traefik). The old site container is stopped at the end of
that procedure, after its checks.

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://awesomenodeauth.com/docs/intro/?q=1'
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://www.awesomenodeauth.com/docs/intro/?q=1'
#   both: 301 https://awesomelangauth.com/docs/intro/?q=1
curl -sL -o /dev/null -w '%{num_redirects} %{http_code} %{url_effective}\n' 'https://www.awesomenodeauth.com/'
#   1 200 https://awesomelangauth.com/
curl -sL -o /dev/null -w '%{num_redirects} %{http_code} %{url_effective}\n' 'http://awesomenodeauth.com/'
#   1 200 https://awesomelangauth.com/
```

### 7. Search Console: Change of Address

Only after step 6. In Search Console, open the **old** property (`awesomenodeauth.com`) →
**Settings → Change of address** → choose `awesomelangauth.com` → **Validate and update**.
If the tool is not offered for the Domain property, use the URL-prefix property
`https://www.awesomenodeauth.com/`, then repeat for `https://awesomenodeauth.com/` (verify
it first if needed): Google asks for every variant of the old domain, with and without
`www`. Then, in the new property:

- **Sitemaps**: submit `https://awesomelangauth.com/sitemap.xml`;
- **URL Inspection** → **Request indexing** for `https://awesomelangauth.com/`,
  `https://awesomelangauth.com/docs/intro/` and `https://awesomelangauth.com/llms.txt`.

Leave the old property as it is: do not delete it, nor the sitemap it has.

The Change of Address validation fetches the old home page and expects exactly this:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.awesomenodeauth.com/
#   301 https://awesomelangauth.com/
```

## After the day

- **Keep the old domain redirecting for at least a year**, ideally for good: keep
  `awesomenodeauth.com` registered (auto-renew on) and the Redirection Host (or the Traefik
  router) running. Google asks to keep the redirects for at least 180 days after the Change
  of Address, and for as long as possible, generally at least a year; if the old domain
  lapses or stops redirecting, the move is undone.
- **Umami**: in the Umami dashboard, change the website's domain to `awesomelangauth.com`.
  The tracking script and its website id in `docusaurus.config.ts` do not change.
