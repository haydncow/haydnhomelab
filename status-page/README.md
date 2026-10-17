# Status page

A small public page showing my homelab is up, with a few live stats (uptime, CPU temp, memory, ads blocked by Pi-hole).

- `homelab-status.py` runs every 5 minutes from cron and writes a static `index.html` to `/srv/status`.
- Tailscale Funnel shares that folder on the internet over HTTPS, so I didn't need to open any ports on my router.
- It logs in to Pi-hole's API with an app password stored in a root-only file, then logs out again.
- It only shows harmless numbers. No IP addresses, hostnames or software versions, because those would help an attacker.
