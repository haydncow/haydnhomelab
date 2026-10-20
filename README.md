# Raspberry Pi Homelab

![homelab](https://img.shields.io/endpoint?url=https%3A%2F%2Fhaydnhomelab.com%2Fbadges%2Fstatus.json)
![services](https://img.shields.io/endpoint?url=https%3A%2F%2Fhaydnhomelab.com%2Fbadges%2Fservices.json)
![uptime](https://img.shields.io/endpoint?url=https%3A%2F%2Fhaydnhomelab.com%2Fbadges%2Fuptime.json)
![ads blocked](https://img.shields.io/endpoint?url=https%3A%2F%2Fhaydnhomelab.com%2Fbadges%2Fblocked.json)
![CPU temp](https://img.shields.io/endpoint?url=https%3A%2F%2Fhaydnhomelab.com%2Fbadges%2Ftemp.json)
![power](https://img.shields.io/endpoint?url=https%3A%2F%2Fhaydnhomelab.com%2Fbadges%2Fpower.json)
![Lynis](https://img.shields.io/badge/Lynis%20score-75-blue)

My first homelab: a Raspberry Pi 5 in a 10 inch rack. I started this repo to plan it and now use it to document the build. I'm doing it to learn networking and security hands-on, instead of just reading about it. The badges above are live from the Pi.

**Live status page: [haydnhomelab.com](https://haydnhomelab.com)**

<p align="center">
  <img src="images/rack-front.jpg" alt="Rack from the front" height="240">
  <img src="images/rack-angle.jpg" alt="Rack from an angle" height="240">
  <img src="images/rack-top.jpg" alt="Rack from above" height="240">
</p>

## Why I'm building it

- To learn how networks work in practice
- To block ads and trackers on my devices
- To practise securing devices and remote access
- To have a safe space to test things as I learn cyber security

## What it runs

- **Hardware:** Raspberry Pi 5 (2GB), TP-Link managed switch and a 1TB drive in a DeskPi RackMate T0. About £240
- **Pi-hole** to block ads on my own devices, including my phone anywhere over Tailscale
- **Unbound** so DNS lookups go straight to the internet's own DNS servers, with DNSSEC checks, instead of through Google or Cloudflare
- **Tailscale** for remote access and as an exit node, with no ports forwarded on my router
- **Security:** UFW, Fail2ban, Lynis hardening, automatic updates and an OpenCanary honeypot
- **Jellyfin** media server, with a Samba share to copy films on from my Mac
- **Homepage** private dashboard and **Speedtest Tracker**, both in Docker
- **Caddy** so my private services have names like `jellyfin.lan` instead of IP addresses and ports
- **Nightly backups** to the media drive, with a tested restore
- **A public status page** through a Cloudflare Tunnel

## What's in this repo

**Start here:**

- [Build log](docs/build-log.md): everything I did, including what went wrong and how I fixed it
- [Security plan](docs/security-plan.md): how the lab is secured, plus my Nmap, Fail2ban, Lynis and honeypot testing
- [Parts list](docs/parts-list.md): what I bought and why
- [Research notes](docs/research-notes.md): what I learned while planning

**Setup files** (configs and scripts, in [setup](setup/)):

| Folder | What's in it |
|---|---|
| [status-page](setup/status-page/) | The website at haydnhomelab.com and the scripts that feed it live stats |
| [honeypot](setup/honeypot/) | Fake services that alert me if anything pokes around my network |
| [backup](setup/backup/) | Nightly backups and how to restore |
| [homepage](setup/homepage/) | My private dashboard |
| [speedtest](setup/speedtest/) | Tests my broadband every 2 hours |
| [caddy](setup/caddy/) | Web server config for the status page and the `.lan` names |

## How I built this

I used Claude (an AI assistant) a lot on this project, so I want to be clear about who did what.

- **Claude wrote all the code** in this repo: the status page website and its stats scripts, the backup script, the honeypot setup and the Docker and Caddy configs. I don't have the coding skills to write those myself yet.
- **Claude guided me through the setup** step by step, and gave me the commands for the Pi: SSH keys, UFW, Pi-hole, Tailscale, Fail2ban, Lynis, Jellyfin, Docker, the honeypot and the Cloudflare Tunnel.
- **Claude made the diagrams** and cleaned up the rack photos, and helped me write up these notes.
- **I** chose and bought the parts, built the rack, ran every command on the Pi myself, tested that things worked (like the Nmap scans and the Fail2ban test), and decided how the lab is set up, like only using Pi-hole on my own devices.

Commits that Claude helped with have Claude listed as a co-author.

## Done so far

- [x] Planning: budget, research, parts list, rack layout, security plan
- [x] Built the rack and set up the Pi with SSH keys only
- [x] UFW firewall and automatic security updates
- [x] Pi-hole on my Mac, PC and phone (anywhere, over Tailscale)
- [x] Tailscale remote access and exit node
- [x] Nmap scans to check only the ports I opened show up
- [x] Fail2ban, tested from Kali
- [x] Lynis audit and hardening (score 63 to 75)
- [x] Live status page on my own domain
- [x] Jellyfin media server with a 1TB drive
- [x] Nightly backups, with a restore tested
- [x] OpenCanary honeypot, tested from Kali
- [x] Homepage and Speedtest Tracker in Docker
- [x] `.lan` names for my services
- [x] Unbound for private DNS lookups
- [x] Live badges on this README

## Next

- VLANs on the managed switch
- Copy backups off the Pi (3-2-1 rule)
- Alerts to my phone if something goes down
- An SSD instead of the SD card
