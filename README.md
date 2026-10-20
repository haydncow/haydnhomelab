# Raspberry Pi Homelab Plan 

This is where I planned my first home lab, and now I'm using it to document the build. I want to use it to learn more about networking and security in a hands-on way, instead of just reading about it. 

## Why I'm building it 

- To learn how networks work in practice 

- To block ads and trackers across my home network 

- To practise securing devices and remote access 

- To have a safe space to test things as I learn cyber security 

## The plan 

- **Budget:** £200-300 

- **Hardware:** Raspberry Pis in a 10 inch rack 

- **Services:** Pi-hole for network-wide ad blocking, plus secure remote access so I can manage it from outside my home network 

I designed the rack layout and network first so I knew exactly what to buy. 

## Build so far

<p align="center">
  <img src="photos/rack-front.jpg" alt="Rack from the front" height="240">
  <img src="photos/rack-angle.jpg" alt="Rack from an angle" height="240">
  <img src="photos/rack-top.jpg" alt="Rack from above" height="240">
</p>

The DeskPi RackMate T0 with the shelf and blank panel in. The Pi and switch go in next.

## What's in this repo 

- [Parts list](parts-list.md) - what I plan to buy and why
- [Security plan](security-plan.md) - how I'll keep it secure
- [Research notes](research-notes.md) - what I've learned while planning
- [Build log](build-log.md) - how the build is going, problems and fixes
- [Photos](photos/) - photos of the build as it goes
- [Media](media/) - Jellyfin media server
- [Backup](backup/) - nightly backups and how to restore
- [Diagrams](diagrams/) - network diagram and rack layout
- [Status page](status-page/) - live at [haydnhomelab.com](https://haydnhomelab.com), served from the Pi through a Cloudflare Tunnel

## How I built this

I used Claude (an AI assistant) a lot on this project, so I want to be clear about who did what.

- **Claude wrote all the code** for the status page website (`index.html`) and the stats script (`homelab-status.py`). I don't have the coding skills to write those myself yet.
- **Claude guided me through the setup** step by step, and gave me the commands for the Pi: SSH keys, UFW, Pi-hole, Tailscale, Fail2ban, Nmap and the Cloudflare Tunnel.
- **Claude made the diagrams** and cleaned up the rack photos, and helped me write up these notes.
- **I** chose and bought the parts, built the rack, ran every command on the Pi myself, tested that things worked (like the Nmap scans and the Fail2ban test), and decided how the lab is set up, like only using Pi-hole on my own devices.

Commits that Claude helped with have Claude listed as a co-author.

## Progress

- [x] Decide on budget and goals
- [x] Learn networking basics
- [x] Research Pi-hole and DNS
- [x] Research remote access (VPNs)
- [x] Research hardware
- [x] Finish parts list
- [x] Draw network diagram
- [x] Design rack layout
- [x] Write security plan
- [x] Buy parts
- [x] Flash the SD card and set up SSH with keys
- [x] Firewall (UFW) and automatic security updates
- [x] Pi-hole (tested on my Mac)
- [x] Tailscale remote access
- [x] Live status page
- [ ] Pi-hole on my own devices (PC and Mac)
- [x] Security testing (Nmap scan, only the ports I opened show up)
- [x] Fail2ban
- [x] Lynis security audit (hardening score 63 to 75)
- [x] Jellyfin media server with a 1TB drive
- [x] Nightly backups
- [ ] Fit everything in the rack
      
I'll keep this updated as I go.
