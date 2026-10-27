# CrowdSec

[CrowdSec](https://crowdsec.net) reads my logs, spots attacks like SSH brute forcing and port scans, and blocks the attacker's IP in the firewall. It also shares what it sees with other CrowdSec users and gets a blocklist of known attackers back.

To be honest about how much it does here: my router has no open ports, so attackers on the internet can't reach SSH in the first place, and Cloudflare filters the website before it gets to the Pi. CrowdSec mainly covers my home network and Tailscale, alongside Fail2ban. I added it to learn how a modern, crowd-sourced intrusion prevention tool works, because it's the kind of thing real companies use.

## Setup notes

- Installed `crowdsec` and the nftables firewall bouncer (the part that actually blocks IPs).
- **Port clash:** CrowdSec's local API wants port 8080 by default, which Caddy already uses for my website. I moved it to 127.0.0.1:8085 in `/etc/crowdsec/config.yaml`, `/etc/crowdsec/local_api_credentials.yaml` and the bouncer's config.
- It found my SSH logs by itself and installed the Linux and SSH detection rules. Private home addresses are whitelisted, so it won't ban my own devices.
- Shows on the live lab and status page as "CrowdSec", with how many IPs it's blocking.

Useful commands: `sudo cscli metrics` (what it's reading), `sudo cscli alerts list` (what it caught), `sudo cscli decisions list` (who's blocked).

Claude (AI) guided the setup. I ran it on the Pi.
