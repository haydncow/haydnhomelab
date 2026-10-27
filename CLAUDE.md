# Notes for Claude

This is Haydn Cowley's homelab repo. It powers haydnhomelab.com. Read this first.

## Keep this file up to date
Whenever something changes in the homelab or the website (a new service, a new page, a new setting on the Pi, a fix), update this file and add a line to `docs/build-log.md` in the same commit. That way the next chat knows about it.

## The setup
- Raspberry Pi 5 (2GB), Debian 13, umask 027: new files need `chmod 644`, new folders `chmod 755`.
- Switch port 1 to router (via a TP-Link wireless box to the EE hub), port 2 to the Pi, port 3 to the PC. 1TB My Passport on the Pi's USB (runs at USB 2 speed).
- Services: Pi-hole (admin 8090) + Unbound (127.0.0.1:5335), Tailscale, UFW, Fail2ban, SSH keys only, OpenCanary honeypot (2222, 3389, 8081), Jellyfin, Homepage and Speedtest Tracker in Docker, Samba, nightly age-encrypted backups, ntfy phone alerts.
- Website: Caddy (`/etc/caddy/Caddyfile`) serves `/srv/status` through a Cloudflare Tunnel. No open router ports. Strict CSP, no inline scripts.

## Where things are
| Repo | On the Pi |
|---|---|
| `setup/website/index.html` portfolio | `/srv/status/index.html` |
| `setup/website/lab/` live lab (index.html, app.js) | `/srv/status/lab/` |
| `setup/website/status/`, `writeups/`, `assets/`, `fonts/` | same under `/srv/status/` |
| `setup/website/homelab-status.py` stats, alerts, history | `/usr/local/bin/homelab-status` (root cron, every minute) |
| `setup/backup/homelab-backup.sh` | nightly backup |
| `setup/caddy/Caddyfile` | `/etc/caddy/Caddyfile` |

Secrets live only on the Pi in root-only `/etc/homelab-status/` (Pi-hole password, Cloudflare token, ntfy topic, maintenance.json). State in `/var/lib/homelab-status/`.

Only the homepage is indexed by Google; every other page has `noindex` on purpose.

## Rules
- Commit only as Haydn: name `haydncow` and the email already on his past commits (check `git log`), with Claude as co-author in the message. If a hook asks to re-author as Claude, decline.
- Show previews before pushing. Only push when Haydn says "push".
- After a push, give one Pi command that downloads from the exact commit, e.g. `sudo curl -fsSL -o <file> https://raw.githubusercontent.com/haydncow/haydnhomelab/<hash>/setup/website/<file> && sudo chmod 644 <file>`, ending with a quick check.
- Write in Haydn's voice: simple, concise, no em dashes.
- Be honest about AI: Claude wrote the code and guided him; Haydn built the rack, ran every command, tested and decided. Never claim he did something he hasn't confirmed.
- Public pages never show IPs, hostnames, passwords or tokens. Contact email is cowleyhaydn@gmail.com.
- Keys, tokens and the ntfy topic never go in chat or the repo.

## Ideas not done yet
Copy backups off the Pi (3-2-1), VLANs on the switch, SSD instead of the SD card, USB 3 cable for the drive, remove the old UFW 8443 rule.
