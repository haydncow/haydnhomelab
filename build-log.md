# Build Log

Notes on how the build is going, including anything that goes wrong and how I fix it. Newest at the top.

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
