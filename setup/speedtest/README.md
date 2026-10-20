# Speedtest Tracker

[Speedtest Tracker](https://github.com/alexjustesen/speedtest-tracker) runs a broadband speed test every 2 hours and keeps 90 days of results, so I can see if my internet is slow at certain times of day.

It's private, like Homepage: only reachable from my home network and over Tailscale, at `http://speed.lan`.

## How it's set up

- Runs in Docker with `docker-compose.yml`
- Its web page is on port 80 inside the container, which Pi-hole already uses, so it only listens on `127.0.0.1:8765`. Binding to `127.0.0.1` also means Docker's own firewall rules can't open it to my network
- **Caddy** passes it through at `http://speed.lan` and on port 8766 (see the [Caddyfile](../caddy/Caddyfile)), and UFW only allows 8766 from my home network and `tailscale0`, so UFW stays in control
- The `APP_KEY` that encrypts its data is in a `.env` file on the Pi (root-only). Only `.env.example` is on GitHub
- Changed the default login straight away
- Limited to 384 MB of memory and can't gain extra privileges

## Problem I hit

Caddy wouldn't reload after I added the new site. The first block had lost its closing `}`, so Caddy read `:8766` as a setting inside it. `caddy validate` showed the exact line, and the old config kept running until I fixed it, so my website never went down.

Claude (AI) wrote these config files. I set it up on the Pi.
