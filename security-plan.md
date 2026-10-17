# Security Plan

How I plan to keep my homelab secure. I'll update this as I build it and
learn more.

## Status (17 October 2026)

- [x] Tailscale for remote access, with no port forwarding on my router
- [x] SSH keys only, password login over SSH turned off and tested
- [x] UFW blocks everything coming in except what's needed:
  - SSH from my home network and over Tailscale
  - DNS (53) from my home network for Pi-hole
  - Pi-hole admin page (80/443) from my home network and over Tailscale
- [x] Pi-hole admin page has a password
- [x] Automatic security updates (`unattended-upgrades`)
- [x] Fixed IP for the Pi (`192.168.1.5`)
- [ ] Back up Pi-hole with Teleporter
- [ ] Nmap scan from another device
- [ ] VLANs on the managed switch
- [ ] Fail2ban

## What I'm protecting against

- Someone accessing my Pi from the internet
- Weak or default passwords being guessed
- Out of date software with known vulnerabilities
- Losing my Pi-hole settings if something breaks

## Remote access

- Use **Tailscale** to access the lab from outside my house
- **No port forwarding** on my router, so nothing is exposed to the internet
- Turn on two-factor authentication (2FA) on my Tailscale account

## Logging in to the Pi

- Set my own username and a strong password when installing the OS
  (using Raspberry Pi Imager)
- Use **SSH keys** instead of passwords
- Once keys work, turn off password login for SSH
- Don't allow logging in directly as root

## Pi-hole

- Set a strong password for the Pi-hole admin page
- Only access the admin page from my home network or through Tailscale
- Keep blocklists updated

## Firewall

- Use **UFW** (Uncomplicated Firewall) on the Pi
- Block everything by default and only allow what's needed:
  - SSH
  - DNS (port 53) for Pi-hole
  - Pi-hole web admin page

## Updates

- Update the Pi regularly
- Turn on automatic security updates (unattended-upgrades)
- Keep Pi-hole and Tailscale updated

## Router

- Change the router's default admin password
- Check the router firmware is up to date

## Backups

- Back up Pi-hole settings using its built-in Teleporter feature
- Keep a copy of my setup notes in this repo so I can rebuild it

## Future improvements

- Get a managed switch and use **VLANs** to separate the lab from my
  other home devices
- Set up Fail2ban to block repeated failed login attempts
- Look at Pi-hole logs to see what my devices are contacting

## Testing

Once it's built, I'll check my security by:
- Scanning the Pi with Nmap from another device to see which ports are open
- Making sure password login over SSH is actually blocked
