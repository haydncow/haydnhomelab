# Weekly vulnerability scan (Trivy)

After the NCSC PHP alert I found out the hard way that a Docker image can have an old, vulnerable version of something inside it. So now the Pi checks every Docker image it runs for known vulnerabilities (CVEs) every Monday.

- [Trivy](https://trivy.dev) scans each running image. I only count HIGH and CRITICAL problems that already have a fix, so every result is something I can act on.
- The result goes to my phone with ntfy (same private topic as my other alerts), and shows on the live lab and status page as "Vulnerability scan".
- `homelab-trivy.py` saves a summary to `/var/lib/homelab-trivy/last.json`. It only has image names and CVE numbers, nothing private.

## Setup

```
sudo apt install -y wget gnupg
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo chmod 644 /usr/share/keyrings/trivy.gpg /etc/apt/sources.list.d/trivy.list   # my Pi's umask 027 makes them root-only, and apt can't read them
sudo apt update && sudo apt install -y trivy
sudo curl -fsSL -o /usr/local/bin/homelab-trivy https://raw.githubusercontent.com/haydncow/haydnhomelab/main/setup/trivy/homelab-trivy.py
sudo chmod 755 /usr/local/bin/homelab-trivy
echo "23 7 * * 1 root /usr/local/bin/homelab-trivy" | sudo tee /etc/cron.d/homelab-trivy
sudo chmod 644 /etc/cron.d/homelab-trivy
```

## First scan

On its very first run it found **2 critical and 15 high** vulnerabilities, mostly in the JavaScript libraries inside my Homepage dashboard image. I pulled the newest Homepage and Speedtest images and scanned again: **0 critical, 6 high**. The 6 left have fixes in the libraries, but the apps' makers haven't released new images with them yet. Both apps are only reachable from my home network and Tailscale, so I'm keeping an eye on it with the weekly scan.

## What went wrong

`apt update` said the Trivy repository "is not signed". The real error was "Permission denied" on the key file: my Pi's umask makes new files readable by root only, and apt checks signatures as a different user. `chmod 644` on the key fixed it.

Claude (AI) wrote the script and tested it against fake Trivy output first. I set it up on the Pi.
