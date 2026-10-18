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
- [Diagrams](diagrams/) - network diagram and rack layout
- [Status page](status-page/) - live at [haydnhomelab.com](https://haydnhomelab.com), served from the Pi through a Cloudflare Tunnel

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
- [ ] Pi-hole for the whole house
- [x] Security testing (Nmap scan, only the ports I opened show up)
- [ ] Fit everything in the rack
      
I'll keep this updated as I go.
