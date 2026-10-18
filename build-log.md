# Build Log

Notes on how the build is going, including anything that goes wrong and how I fix it. Newest at the top.

## 18 October 2026

- Fitted the Pi and switch in the rack. The Pi is in the KKSB panel at the top, the switch is on the shelf under it.
- Updated the rack layout diagram to match how it actually looks.
- Bought my own domain, haydnhomelab.com, from Cloudflare. I nearly bought it on Wix, but Wix doesn't let you move the domain's nameservers to Cloudflare, which the tunnel needs.
- Set up a Cloudflare Tunnel so the status page is on my domain. The Pi connects out to Cloudflare, so I still haven't opened any ports on my router.
- Made a small web server (`status-web`) that only listens on the Pi itself, for the tunnel to use.
- Problem: the site worked on my Mac but nowhere else. The DNS record was called `http.haydnhomelab.com` because I'd typed "http" in the subdomain box. Fixed it, added `www` too, then cleared the old "not found" answers my devices had saved.
- Rebuilt the status page with a power-on intro, clickable zoom, live service status, 24 hour graphs and a security section.
- Turned off key expiry for the Pi in Tailscale so it doesn't drop off my network after 6 months.
- Set up Fail2ban. If an IP gets the SSH login wrong 5 times in 10 minutes it gets banned in UFW for an hour, and longer each time it comes back. It reads the logs from systemd's journal because that's where my Pi's OS keeps them.
- Tested it by trying to log in as a fake user from my Kali VM. After 5 tries the VM's IP was banned, then I unbanned it with `fail2ban-client`.
- Backed up Pi-hole with Teleporter and saved the zip off the Pi. It has my password hashes in, so it doesn't go on GitHub.

- Decided to only use Pi-hole on my own devices (PC and Mac) instead of the whole house. With one Pi, if it goes down every device using it loses DNS, so this way the rest of the house isn't affected. A second Pi-hole in the spare slot would fix that later.

- Problem: my Mac couldn't reach the Pi (ping timed out) but the website still worked. The website works because the Pi connects out to Cloudflare, so the Pi was fine. Restarting the TP-Link wireless box between my switch and the router fixed it. If it happens again, that's the first thing to restart.
- Ran a Lynis security audit. Score was 63. Hardened SSH, added a login banner, turned off unused network protocols, tightened file permissions and kernel network settings, then rebooted. New score: 75. Full list of what I fixed and what I skipped (and why) is in the [security plan](security-plan.md#lynis-audit-18-october-2026).
- One Lynis warning was a false positive: it said I had no security updates repository, but I checked and `trixie-security` is there. Lynis just doesn't read Debian 13's newer file format.

**Next:** point my PC at Pi-hole, set up VLANs on the switch, and set up Jellyfin with my NAS.

## 17 October 2026

- Plugged the Pi in through a TP-Link instead of straight into the router. It still worked, but SSH said `Permission denied (publickey)` again.
- Worked out why with `ssh-keygen -lf` and `ssh -v`: the key my Mac was offering didn't match the one on the Pi. I'd run `ssh-copy-id` before making my new key, so the Pi had my old one. With password login turned off I was locked out, which is the security setting working properly.
- Reflashed the card and did it in the right order this time: log in with password, `ssh-copy-id`, check key login works, then turn password login off.
- Updated everything with `sudo apt update && sudo apt full-upgrade`.
- Set up the UFW firewall: block everything coming in by default, and only allow SSH from my home network (`192.168.1.0/24`).
- Turned on automatic security updates with `unattended-upgrades`.
- Gave the Pi a fixed IP (`192.168.1.5`) with `nmcli`. I couldn't reserve it on my EE hub because the Pi didn't show up in the hub's device list behind the TP-Link. The hub hands out `.10` to `.253`, so `.5` can't clash with anything.
- Installed Pi-hole. Downloaded the install script and read it first instead of piping it straight into bash. Opened DNS (port 53) and the admin page (80/443) to my home network only.
- Tested Pi-hole on my Mac first. `dig doubleclick.net @192.168.1.5` gave back `0.0.0.0` and the ads were blocked.
- Installed Tailscale and allowed SSH and the Pi-hole admin page over Tailscale only. Tested from my phone on mobile data and the dashboard loaded, with no ports forwarded on my router.

**Lessons:** make the SSH key once, save the passphrase in a password manager, and only turn password login off after key login works.

**Next:** Nmap scan to check only the ports I opened are showing, use Pi-hole for the whole house, and fit everything in the rack.

### Later on 17 October: Nmap scan

- Scanned the Pi with Nmap from my Mac to check the firewall is doing what I think it is.
- `nmap 192.168.1.5` (the 1000 most common ports): only 22, 53, 80 and 443 open.
- `sudo nmap -p- 192.168.1.5` (all 65,535 ports, took about 10 minutes): same 4 open, the other 65,531 filtered.
- `sudo nmap -sU -p 53 192.168.1.5`: DNS over UDP open, which Pi-hole needs.
- The ports show as filtered, not closed, because UFW drops the packets without replying. That's what I wanted.
- Scanned over Tailscale too: only 22, 80 and 443, no DNS, which matches my UFW rules.
- Full results are in the [security plan](security-plan.md#nmap-results-home-network).

**Next:** use Pi-hole for the whole house, and fit everything in the rack.

## 16 October 2026

- Flashed Raspberry Pi OS Lite (64-bit) onto the SD card with Raspberry Pi Imager 2.0. Set the hostname to `homelab`, made my own user, left Wi-Fi off (the Pi uses Ethernet) and turned on SSH with key login only.
- The Pi booted and showed up on my network as `homelab.local`, but SSH kept saying `Permission denied (publickey)`.
- Ran `ssh -v` to see what was going on. My Mac was offering the right key, but the Pi was rejecting it.
- Checked the setup file Imager writes to the SD card (`user-data`). My key was in it and the fingerprint matched, so Imager had done its part. Something went wrong on the Pi during first boot. I didn't get to the bottom of it because reflashing wiped the Pi's logs.
- Fix: reflashed with password login on, logged in, copied my key over with `ssh-copy-id`, checked key login worked, then turned password login off with a settings file in `/etc/ssh/sshd_config.d/`.
- Tested it: `ssh -o PubkeyAuthentication=no haydn@homelab.local` now gives `Permission denied (publickey)`, so nobody can log in with just a password.
- Also made a new SSH key because I'd forgotten the passphrase for the first one.

**Next:** update the Pi, then set up the UFW firewall and automatic security updates.

## 15 October 2026

- The DeskPi RackMate T0 arrived, with the shelf and blank panel in.
- Took some photos of it against a white background (in [photos](photos/)).

<img src="photos/rack-angle.jpg" alt="Rack from an angle" width="360">

**Next:** flash the SD card, boot the Pi for the first time, then fit the Pi and switch in the rack.

## 14 October 2026

- Ordered all the parts from The Pi Hut and Amazon (see the [parts list](parts-list.md)).
- Wanted the 1GB Pi 5 to save money but it was out of stock, so went with the 2GB.
- Swapped the SBC shelf for a KKSB 1U rack panel so the Pi's ports face the front. It also has space for a second Pi.
- Made an SSH key on my Mac ready to put on the Pi.
- Turned on 2FA for the account I'll use to log in to Tailscale.
- Updated the rack layout and network diagram to match the parts I actually bought.

**Next:** wait for delivery, then flash the SD card and boot the Pi for the first time.
