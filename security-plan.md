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
- [x] Back up Pi-hole with Teleporter (kept off the Pi and off GitHub, because it has password hashes in it)
- [x] Nmap scan from my Mac on the home network (results below)
- [ ] VLANs on the managed switch
- [x] Fail2ban: bans an IP in UFW after 5 failed SSH logins in 10 minutes (tested)

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
- Nightly backups of the whole Pi config to the media drive, root-only, kept for 14 days (see [backup](backup/))
- Keep a copy of my setup notes in this repo so I can rebuild it

## Future improvements

- Get a managed switch and use **VLANs** to separate the lab from my
  other home devices
- Look at Pi-hole logs to see what my devices are contacting

## Testing

- [x] Password login over SSH is blocked. `ssh -o PubkeyAuthentication=no` gets `Permission denied (publickey)`
- [x] Nmap scan from my Mac on the home network (17 October 2026)
- [x] Nmap scan over Tailscale (17 October 2026)
- [x] Fail2ban: 5 fake logins from my Kali VM got its IP banned straight away (18 October 2026)
- [x] Lynis security audit: hardening score went from 63 to 75 (18 October 2026)

### Nmap results (home network)

| Scan | Command | Result |
|------|---------|--------|
| Top 1000 TCP ports | `nmap 192.168.1.5` | 22, 53, 80, 443 open. 996 filtered |
| All 65,535 TCP ports | `sudo nmap -p- 192.168.1.5` | 22, 53, 80, 443 open. 65,531 filtered |
| DNS over UDP | `sudo nmap -sU -p 53 192.168.1.5` | 53/udp open |
| Over Tailscale | `nmap <Pi's Tailscale IP>` | 22, 80, 443 open. No 53 |

Only the ports I opened in UFW show up. Everything else is "filtered", which means the firewall drops it without replying, so a scan can't even tell if anything is there.

Over Tailscale, DNS (53) doesn't show because I only allowed it from my home network.

### Lynis audit (18 October 2026)

[Lynis](https://cisofy.com/lynis/) checks hundreds of security settings and gives a hardening score out of 100.

**Score: 63 before, 75 after.**

What I fixed:

| Lynis test | What I did |
|------------|------------|
| SSH-7408 | Hardened SSH: no root login, only my user allowed, max 3 login tries, no forwarding, idle sessions time out, verbose logging |
| BANN-7126/7130 | Added an "authorised access only" login banner |
| AUTH-9328 | Made default file permissions stricter (umask 027) |
| NETW-3200 | Turned off network protocols I don't use (dccp, sctp, rds, tipc) and firewire |
| KRNL-6000 | Kernel hardening with sysctl: ignore ICMP redirects and source routing, log suspicious packets, hide kernel pointers. I left the settings Tailscale needs alone |
| DEB / PKGS / ACCT | Installed libpam-tmpdir, needrestart, debsums, apt-show-versions, sysstat and process accounting |

What I checked and didn't change, and why:

- **PKGS-7388 "no security repository":** false positive. My Pi does get `trixie-security` updates, but Debian 13 uses a newer sources file format that this version of Lynis doesn't read.
- **KRNL-5830 "reboot needed":** also a false positive. Raspberry Pi OS installs two builds of the same kernel (`6.18.50`): one for the Pi 5 (`rpi-2712`) and a general one for older Pis (`rpi-v8`). My Pi 5 is running the right one, but Lynis and needrestart see the other build and think it's newer. I checked with `needrestart -k -b`.
- **Changing the SSH port:** hiding SSH on another port doesn't make it more secure. It's already key-only, firewalled and protected by Fail2ban.
- **Password age, strength and expiry rules:** I only log in with SSH keys, so passwords aren't used for SSH.
- **Separate /home and /var partitions:** would mean rebuilding the SD card, not worth it on a Pi.
- **Disabling USB storage:** I might plug in a drive for a media server later.
- **Malware scanner, file integrity tool, auditd:** too heavy for a 2GB Pi running Pi-hole. Something to look at on bigger hardware.
- **Remote logging:** a future project, sending logs to my NAS.

