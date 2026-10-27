# Homepage

A private dashboard for my homelab using [Homepage](https://gethomepage.dev). It shows all my services with live info (Pi-hole stats, what's playing on Jellyfin, CPU, memory and disk space) plus my bookmarks.

New in October 2026: a Security group (honeypot alerts, visitors and power, read from my own stats.json), a weather widget, tabs (Lab and Remote), status dots for each service, and quick search: press any key on the page to search my services and bookmarks.

It's **private**: only reachable from my home network and over Tailscale, on port 3000. My public dashboard is the [live lab](https://haydnhomelab.com/lab/).

## How it's set up

- Runs in **Docker** with `docker-compose.yml`
- **Docker and UFW:** normally Docker publishes ports with its own firewall rules that go around UFW, so a container can end up open even when UFW says it isn't. I used `network_mode: host` so the container uses the Pi's own network and UFW stays in control, then only allowed port 3000 from my home network and Tailscale
- `HOMEPAGE_ALLOWED_HOSTS` makes it refuse requests for any address that isn't mine, which stops DNS rebinding attacks
- The list of allowed addresses, the Pi-hole app password and the API keys are in a `.env` file on the Pi (root-only). Only `.env.example` is on GitHub
- Limited to 256 MB of memory, can't gain extra privileges, and only gets read-only access to the media drive (just to show free space)

Claude (AI) wrote these config files. I set it up on the Pi.
