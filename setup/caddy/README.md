# Caddy

[Caddy](https://caddyserver.com) is the web server on the Pi. The [Caddyfile](Caddyfile) does three jobs:

- **Serves my website** (the portfolio at `/` and the live lab at `/lab/`) only on `127.0.0.1:8080`, so it can't be reached from my network. The Cloudflare Tunnel is the only way in.
- **Sends security headers** with every page: HSTS, a strict Content Security Policy with no inline scripts, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy. That took the site from F to A+ on securityheaders.com.
- **Gives my private services proper names** like `jellyfin.lan` and `dashboard.lan`. Pi-hole's local DNS points them at the Pi, and Caddy passes each one to the right port. Port 80 is only open to my home network and Tailscale.

It also stops Cloudflare caching old copies of the live data and scripts, and redirects the old `/about` address to the homepage.

## Testing changes

Before putting a new Caddyfile on the Pi, I check it with:

```
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

If it's not valid, Caddy keeps running the old config, so the site stays up. Validating isn't the whole story though: a rule can be valid and still not match anything. That happened with the no-cache rule for scripts. Claude caught it by running the Caddyfile on a real copy of Caddy and checking the headers with `curl -sI` before it went on the Pi.

Claude (AI) wrote this config. I set it up on the Pi.
