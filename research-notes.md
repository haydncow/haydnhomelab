# Research Notes

Things I've learned while planning my homelab.

## Networking basics

- **IP address:** a number that identifies a device on a network. Home networks
  usually use private addresses like 192.168.1.x.
- **Router:** connects my home network to the internet. It usually also hands
  out IP addresses and acts as the firewall.
- **Switch:** connects multiple wired devices together on the same network.
  My Pi plugs into one.
- **DHCP:** automatically gives devices an IP address when they join the network.
- **DNS:** turns website names (like google.com) into IP addresses. Without it
  you'd have to remember numbers for every site.
- **Static IP:** an IP address that doesn't change. Servers like Pi-hole need
  one so other devices can always find them.

## What is a homelab?

A homelab is a setup at home for learning and testing IT skills. It can be anything from one Raspberry Pi to a full rack of servers. It is used as a safe place to practise things like networking and security without breaking anything important.

## What does a Pi-hole do?

Pi-hole is a DNS server that blocks ads and trackers for every device on the network.

How it works:
1. A device asks Pi-hole for the IP address of a website.
2. Pi-hole checks the domain against blocklists.
3. If it's an ad or tracker domain, Pi-hole blocks it so it never loads.
4. If it's fine, Pi-hole looks up the real address and passes it back.

Things to know:
- It needs a static IP address.
- The router needs setting up to use Pi-hole as the DNS server.
- It has a dashboard showing every DNS request, which is useful for seeing what devices on my network are contacting.
- It can't block everything, e.g. YouTube ads come from the same domain as the videos.

## Remote access

I want to manage my homelab from outside my house, but it needs doing safely.
- **Port forwarding** opens a port on the router to the internet. This is
  risky because bots constantly scan the internet for open ports.
- **VPN** creates an encrypted tunnel into my network, so services aren't
  exposed to the whole internet.

### WireGuard vs Tailscale

| | WireGuard | Tailscale |
|---|---|---|
| What it is | A modern, fast VPN protocol | A service built on WireGuard |
| Setup | Manual, I set up keys myself | Easy, log in on each device |
| Port forwarding | Usually needs one port open | Not needed |
| Cost | Free | Free for personal use |

Tailscale is easier and doesn't need any ports opening. WireGuard teaches me
more about how VPNs actually work.

## Hardware

- **Raspberry Pi 4 or 5:** either works. The Pi 5 is faster but needs its own
  27W power supply. Pi-hole is lightweight so even a cheaper Pi would run it.
- **Storage:** microSD cards are cheap but can wear out. An SSD is more reliable.
- **PoE (Power over Ethernet):** powers the Pi through the network cable, which
  means fewer cables. Needs a PoE switch and a PoE HAT for each Pi, so it costs more.
- **10 inch rack:** a smaller version of a server rack, made for homelabs.
  Good for keeping everything tidy.

## Sources

- Professor Messer, CompTIA Network+ videos (YouTube)
- TryHackMe: "What is Networking?" and "Intro to LAN"
- Pi-hole documentation: docs.pi-hole.net
- Tailscale: "How Tailscale works"
- Raspberry Pi documentation: raspberrypi.com/documentation
- r/homelab
