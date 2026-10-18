# Status page

Live at **[haydnhomelab.com](https://haydnhomelab.com)**. A public page showing my homelab is up, with live stats.

- `index.html` is the page. It starts with a power-on intro (a standby light, a CRT-style screen switching on and the rack drawing itself), then shows a drawing of my rack where you can click a part to zoom in, little packets moving along the cables (faster when Pi-hole is busier), which services are running, graphs of the last 24 hours and a security section.
- `homelab-status.py` runs every minute from cron (as root) and saves everything to `/srv/status/stats.json`, which the page reads. It checks each service with `systemctl is-active`, gets DNS history from Pi-hole's API, and keeps 24 hours of temperature and memory readings in `/var/lib/homelab-status/`.
- A small Python web server (`status-web` systemd service) serves `/srv/status`, but only on `127.0.0.1:8080`, so it isn't reachable from my network.
- A **Cloudflare Tunnel** (`cloudflared`) connects out from the Pi to Cloudflare and puts the page on my domain. Nothing is port forwarded on my router.
- It logs in to Pi-hole's API with an app password stored in a root-only file, then logs out again.
- It only shows harmless info. No IP addresses, hostnames or software versions, because those would help an attacker.

I used Tailscale Funnel for this at first, but switched to Cloudflare Tunnel so I could use my own domain.
