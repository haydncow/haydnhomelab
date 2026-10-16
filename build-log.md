# Build Log

Notes on how the build is going, including anything that goes wrong and how I fix it. Newest at the top.

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
