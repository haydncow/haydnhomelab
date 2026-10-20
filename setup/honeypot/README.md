# Honeypot

[OpenCanary](https://github.com/thinkst/opencanary) runs on the Pi as a tripwire inside my home network. It pretends to be services that nothing should ever use, so if anything connects to them, something is wrong (or it's me testing it from Kali).

| Fake service | Port |
|---|---|
| Old SSH server | 2222 |
| Telnet | 23 |
| FTP | 21 |
| MySQL | 3306 |
| Remote Desktop | 3389 |
| VNC | 5900 |
| Redis | 6379 |
| NAS login page | 8081 |

## Why home network only

A honeypot on the internet would catch real attackers, but it means opening a port on my router and exposing my home IP, and if the honeypot software had a bug, the attacker would be on the same Pi as everything else. Inside my network, it can't be reached from the internet at all, and it still catches anything that gets onto my network and starts scanning around.

## How it's locked down

- UFW only allows the honeypot ports from my home network (`192.168.1.0/24`)
- It runs as its own `canary` user with no login, not root
- systemd sandboxing: it can only write to its own log folder, can't see home folders, can't gain privileges, and is limited to 200 MB of memory. It gets one extra permission, to use ports below 1024 (FTP and Telnet)
- Logs rotate weekly so they can't fill the SD card

## On my website

The stats script reads the honeypot log, and the [live lab](https://haydnhomelab.com/lab/) shows how many alerts there have been and which fake services were touched. Press A there for the attack map. It never shows IP addresses or passwords, because I might type a real password by accident while testing. Usernames are escaped so a username like `<script>` can't run as code on the page.

## Files

- `configure-opencanary.py` turns OpenCanary's default config into mine
- `opencanary.service` runs it with systemd
- `opencanary.logrotate` rotates the log

Claude (AI) wrote these files. I installed it and tested it.
