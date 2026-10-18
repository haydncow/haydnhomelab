# Parts List

Budget: £200-300

Prices checked mid October 2026. Raspberry Pi put prices up on 1 October because of RAM costs, and SD cards have gone up too, so this is more than I first planned.

| Part | Why I need it | Where | Price |
|------|---------------|-------|-------|
| Raspberry Pi 5 (2GB) | Runs Pi-hole and Tailscale. The 1GB would be enough but it's out of stock | The Pi Hut | £74.40 |
| DeskPi RackMate T0 (4U, 10 inch) | Holds everything. Comes with a 1U shelf and a blank panel | Amazon UK | £79.99 |
| TP-Link TL-SG105E (5 port managed switch) | Connects the Pi and future devices to my router, and lets me set up VLANs | Amazon UK | £17.99 |
| Raspberry Pi 27W USB-C power supply | Official PSU recommended for the Pi 5 | The Pi Hut | £11.50 |
| SanDisk Ultra 32GB microSD card | Storage for the operating system | Amazon UK | £19.95 |
| UGREEN USB card reader | So I can flash the OS from my PC | Amazon UK | £6.34 |
| Active cooler for Pi 5 | Keeps the Pi cool inside the rack | The Pi Hut | £4.80 |
| KKSB 10" 1U rack panel | Mounts the Pi in the rack with the ports at the front. Holds 2 Pis so there's space for another one later | The Pi Hut | £17.20 |
| Cable Matters Cat6 patch cables (x5, 0.3m) | Tidy connections inside the rack | Amazon UK | £7.99 |

**Total:** £240.16 (plus Pi Hut delivery)

## Things I already had

- **WD My Passport 1TB:** portable hard drive, plugged into the Pi for Jellyfin films and backups.

## Why these choices

- **Pi 5 2GB:** I wanted the 1GB (£43.20) to save money, but it's out of stock at The Pi Hut. The 2GB gives me more room to add services later anyway.
- **4U rack:** enough room for a switch, the Pi and space to add more later. Amazon and The Pi Hut are about the same price now.
- **Managed switch:** I was going to get the unmanaged TL-SG105 first and upgrade later, but the managed TL-SG105E is about the same price. It means I can try VLANs straight away.
- **Pi Hut for the small bits:** buying the Pi, PSU, cooler and rack panel in one order saves on delivery.

## Possible upgrades later

- **SSD instead of microSD** for better reliability.
- **A second Pi** for running more services.

## Builds I looked at for ideas

- [kevsrobots 10 inch Pi mini rack](https://www.kevsrobots.com/projects/mini-rack/)
- [ServeTheHome RackMate T0 review](https://www.servethehome.com/deskpi-rackmate-t0-4u-10in-rack-mini-review/)
- [Computingforgeeks 10 inch rack build guide](https://computingforgeeks.com/build-10-inch-mini-rack-homelab/)
- r/homelab
