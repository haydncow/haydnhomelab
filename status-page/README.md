# Status page

A small public page showing my homelab is up, with a few live stats (uptime, CPU temp, memory, ads blocked by Pi-hole).

- `index.html` is an interactive drawing of my rack. Click a part to see what it does, or click the Pi to see live stats.
- `homelab-status.py` runs every minute from cron and saves the stats to `/srv/status/stats.json`, which the page reads.
- Tailscale Funnel shares that folder on the internet over HTTPS, so I didn't need to open any ports on my router.
- It logs in to Pi-hole's API with an app password stored in a root-only file, then logs out again.
- It only shows harmless numbers. No IP addresses, hostnames or software versions, because those would help an attacker.
