# Status page

Live at **[haydnhomelab.com](https://haydnhomelab.com)**. A public page showing my homelab is up, with live stats.

**Claude (an AI assistant) wrote all the code in this folder.** I described what I wanted, checked how it looked and set it up on the Pi with Claude's instructions.

- `index.html` is the page. It starts with a power-on intro (a standby light, a CRT-style screen switching on and the rack drawing itself), then shows a one-screen dashboard of tiles: the rack (click a part to zoom in), ads blocked, uptime, a CPU temperature gauge, power and cost, DNS queries, security and what's running. Clicking a tile expands it into a full view with interactive graphs.
- Press **N** for an interactive network map. It has three traffic stories (visiting the site, my remote access over Tailscale, and Pi-hole blocking ads) that animate a packet along the real path step by step, and you can click any device to see what it does.
- `homelab-status.py` runs every minute from cron (as root) and saves everything to `/srv/status/stats.json`, which the page reads. It checks each service with `systemctl is-active`, gets DNS history from Pi-hole's API, and keeps 24 hours of temperature, memory and power readings in `/var/lib/homelab-status/`.
- Power comes from the Pi 5's power chip (`vcgencmd pmic_read_adc`), which reports the volts and amps on each supply rail. Watts = volts x amps, added up. The yearly cost adds about 2 W for the switch and power supply losses, at about 25p per kWh.
- `homelab-live.py` runs all the time as a systemd service (`status-live.service`). Every 3 seconds it saves CPU use, temperature, power and memory to `/srv/status/live.json`, keeping the last 5 minutes, so the page's graphs keep moving. The service is locked down with systemd settings: it can only write to `/srv/status`, has no network access and can't gain extra privileges.
- **Caddy** serves `/srv/status`, but only on `127.0.0.1:8080`, so it isn't reachable from my network. I started with Python's built-in web server, but it couldn't keep up once the page asked for new data every 3 seconds and Cloudflare kept showing "bad gateway".
- The "What's running" tile is split into sections, most important first: security, network and DNS, apps, this website, and looking after the Pi. It checks 11 services with systemd and my 2 Docker apps (Homepage and Speedtest Tracker) with `docker inspect` and shows extra details: how many domains Pi-hole blocks, how many of my Tailscale devices are online, Fail2ban bans, when updates last ran, how many firewall rules there are, and how long each service has been up. It also shows the nightly backup and SD card health (data written, writes per day, card and filesystem errors, and whether it's gone read-only).
- A **Cloudflare Tunnel** (`cloudflared`) connects out from the Pi to Cloudflare and puts the page on my domain. Nothing is port forwarded on my router.
- It logs in to Pi-hole's API with an app password stored in a root-only file, then logs out again.
- It also writes tiny JSON files to `/srv/status/badges/` every minute. [shields.io](https://shields.io/badges/endpoint-badge) reads them from my domain to draw the live badges at the top of my GitHub README.
- It only shows harmless info. No IP addresses, hostnames or software versions, because those would help an attacker.

I used Tailscale Funnel for this at first, but switched to Cloudflare Tunnel so I could use my own domain.
