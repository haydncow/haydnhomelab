# Website

Live at **[haydnhomelab.com](https://haydnhomelab.com)**, served from the Raspberry Pi through a Cloudflare Tunnel.

**Claude (an AI assistant) wrote all the code in this folder.** I described what I wanted, checked how it looked and set it up on the Pi with Claude's instructions.

| Address | What it is | Files |
|---|---|---|
| [haydnhomelab.com](https://haydnhomelab.com) | My apprenticeship portfolio | `index.html`, `portfolio.js`, `rack.jpg` |
| [haydnhomelab.com/lab](https://haydnhomelab.com/lab/) | The live dashboard for my homelab | `lab/index.html`, `lab/app.js` |
| [haydnhomelab.com/status](https://haydnhomelab.com/status/) | 90-day uptime for every service | `status/index.html`, `status/status.js` |
| [haydnhomelab.com/writeups](https://haydnhomelab.com/writeups/) | Write-ups of each thing I built and tested | `writeups/` |

`assets/site.css` and `assets/theme.js` are shared by the status page and write-ups (and `theme.js` by the lab too), so every page has the same look and light/dark mode.

Both pages read the same live data from the Pi. The code is in separate `.js` files so the Content Security Policy can block all inline scripts, which got the site an A+ on securityheaders.com.

## Portfolio (the homepage)

- Every claim on it has its evidence next to it: the real command I ran and its output, a before and after grade, or a link to the write-up.
- The photo of my rack has live readings from the Pi pinned to the hardware: uptime counting up every second, CPU temperature and the last backup.
- It also has the problems I fixed, a timeline of the build, my skills and how I used AI.
- Light and dark mode, works on phones, and prints as a clean 4 page PDF for applications.
- It used to be at `/about`. Caddy redirects that to the homepage so old links still work.

## Live lab (`/lab/`)

- It looks the same as the portfolio: same fonts, colours and light/dark mode, and the light/dark choice carries across both pages. The network map and attack map stay dark in both modes, like the terminal boxes on the portfolio.
- It starts with a power-on intro (a standby light, a CRT-style screen switching on and the rack drawing itself), then shows a one-screen dashboard of tiles: the rack (click a part to zoom in), ads blocked, uptime, a CPU temperature gauge, power and cost, DNS queries, security and what's running. Clicking a tile expands it into a full view with interactive graphs.
- Press **N** for an interactive network map. It has three traffic stories (visiting the site, my remote access over Tailscale, and Pi-hole blocking ads) that animate a packet along the real path step by step, and you can click any device to see what it does.
- Press **S** for the security history: 30 days of Cloudflare blocks, ads blocked, honeypot hits and uptime, plus the latest requests Cloudflare blocked (path, country and rule only, never IP addresses).
- Press **A** for the honeypot attack map, and **H** for **How it works**, a plain English explanation of the lab for people who aren't techy.
- The "What's running" tile is split into sections, most important first: security, network and DNS, apps, this website, and looking after the Pi. It checks 11 services with systemd and my 2 Docker apps (Homepage and Speedtest Tracker) with `docker inspect` and shows extra details: how many domains Pi-hole blocks, how many of my Tailscale devices are online, Fail2ban bans, when updates last ran, how many firewall rules there are, and how long each service has been up. It also shows the nightly backup and SD card health (data written, writes per day, card and filesystem errors, and whether it's gone read-only).

## How the live data works

- `homelab-status.py` runs every minute from cron (as root) and saves everything to `/srv/status/stats.json`, which both pages read. It checks each service with `systemctl is-active`, gets DNS history from Pi-hole's API, and keeps 24 hours of temperature, memory and power readings in `/var/lib/homelab-status/`.
- Power comes from the Pi 5's power chip (`vcgencmd pmic_read_adc`), which reports the volts and amps on each supply rail. Watts = volts x amps, added up. The yearly cost adds about 2 W for the switch and power supply losses, at about 25p per kWh.
- `homelab-live.py` runs all the time as a systemd service (`status-live.service`). Every 3 seconds it saves CPU use, temperature, power and memory to `/srv/status/live.json`, keeping the last 5 minutes, so the graphs keep moving. The service is locked down with systemd settings: it can only write to `/srv/status`, has no network access and can't gain extra privileges.
- It logs in to Pi-hole's API with an app password stored in a root-only file, then logs out again.
- It also writes tiny JSON files to `/srv/status/badges/` every minute. [shields.io](https://shields.io/badges/endpoint-badge) reads them from my domain to draw the live badges at the top of my GitHub README.
- **Visitor counts** come from Cloudflare's own analytics API, which already counts unique visitors to my domain. The script asks for the daily totals every 15 minutes using a read-only API token kept in a root-only file (`/etc/homelab-status/cloudflare.json`). The Pi never sees or stores anyone's IP address.
- **History:** every minute it also adds to `/var/lib/homelab-status/daily.json`, which keeps 90 days of uptime per service and daily totals (DNS lookups, ads blocked, honeypot hits, Cloudflare blocks, visitors), and publishes them as `/srv/status/history.json` for the status page and the lab. Services I've stopped on purpose can be listed in `/etc/homelab-status/maintenance.json`, so they show as maintenance instead of down.
- **Cloudflare blocks** come from Cloudflare's security events API every 5 minutes, using the same read-only token. Only the path (without anything after a `?`), method, country and which rule blocked it are kept. Never the IP address or browser details.
- It only shows harmless info. No IP addresses, hostnames or software versions, because those would help an attacker.

## Serving it

- **Caddy** serves `/srv/status`, but only on `127.0.0.1:8080`, so it isn't reachable from my network (see the [Caddyfile](../caddy/Caddyfile)). I started with Python's built-in web server, but it couldn't keep up once the page asked for new data every 3 seconds and Cloudflare kept showing "bad gateway".
- A **Cloudflare Tunnel** (`cloudflared`) connects out from the Pi to Cloudflare and puts the site on my domain. Nothing is port forwarded on my router.
- `robots.txt`, `sitemap.xml` and `og.jpg` help Google find the site and give it a nice preview when the link is shared.
- `favicon.ico`, `favicon.svg`, `icon-192.png` and `apple-touch-icon.png` are the site icon in the sizes browsers, phones and Google use. Google can't use an icon built into the page, so it showed a blank globe until these were added. The homepage also tells Google the site's name ("Haydn's Homelab") with a small block of structured data.

I used Tailscale Funnel for this at first, but switched to Cloudflare Tunnel so I could use my own domain.
