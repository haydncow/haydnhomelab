# Build Log

Notes on how the build is going, including anything that goes wrong and how I fix it. Newest at the top.

**Jump to:** [30 Oct](#30-october-2026) | [28 Oct](#28-october-2026) | [27 Oct](#27-october-2026) | [23 Oct](#23-october-2026) | [21 Oct](#21-october-2026) | [20 Oct](#20-october-2026) | [18 Oct](#18-october-2026) | [17 Oct](#17-october-2026) | [16 Oct](#16-october-2026) | [15 Oct](#15-october-2026) | [14 Oct](#14-october-2026)

## 30 October 2026

- Redesigned my homepage for employers. Claude researched what they look for first: recruiters spend about 7 seconds on a first look (Ladders' 2018 eye-tracking study), Level 6 cyber apprenticeships are built on the ST0409 Cyber Security Technical Professional standard, interviews use "tell me about a time" questions, and UK employers know Cyber Essentials. The first version looked too AI-made to me, so we started again and built it around my actual rack:
  - My name in big type, what I'm applying for, and the rack photo cut out of its background so it stands on a line like it's on a desk. Under the line: where I'm based, my course, GCSEs and EPQ.
  - The first sentence is live. It's built from my Cloudflare firewall log, like "5 minutes ago, a computer in the United States tried to open /wp-login.php, a WordPress login page. My firewall rule blocked it before it reached the Pi." It explains the path in plain English and never shows IP addresses. Paths come from strangers, so they're only added to the page as plain text, never as code.
  - A front photo of the rack labelled by rack unit (U1 to U4) with live readings. The lights on the switch and Pi come on when you scroll to it, and only blink while the Pi is online.
  - Four STAR case studies, and a test log where every claim opens to show its proof: real terminal output, the securityheaders.com F and A+ screenshots (IP blurred) and Cloudflare's log from my rate limit test.
  - My work matched to six ST0409 competencies and the behaviours, a Cyber Essentials v3.3 self-check (four controls met, malware protection only partly), the two-week timeline, things that broke, skills, how I used AI and how to contact me.
  - Colour only means status: green for working or passed, red for attacks, amber for partly. One typeface, Archivo, served from the Pi. It prints as a 3-page summary for applications.
- Gave the write-ups, status page and live lab the same top bar, with my full name, and the write-ups and status page the same type and colours. Their fonts come from the Pi now instead of Google Fonts. The live lab is a little wider so it lines up with the rest of the site.
- Redesigned the live lab to match, replacing the "control room" look from 27 October. It follows the light/dark setting now like every other page. The panels sit in a ruled grid instead of glowing cards: the headline numbers along the top, then my rack, security and what's running, then Pi-hole and the Pi. The rack is the real front photo, every part can still be clicked to zoom in, and its lights only blink while the Pi is online. The security panel shows Cloudflare's blocks for the last 14 days next to the latest blocked requests, and the Pi panel lists each reading with a small line showing the last few minutes. Took out the boot screen, the ticker and the numbers counting up, so the rack's lights are the only thing that moves by itself.
- Small fixes to my homepage: the rack photo no longer sticks out past the end of the line and sits in the middle next to the text, the case studies have a simpler intro, and the "good things to ask me about" list is gone. In its place there's a Write-ups section listing all 11, newest first, each with its result.
- Retook the screenshots on my GitHub page (portfolio, live lab, attack map and network map) so they show the new design, in dark mode, and made a new banner for the top of it in the same style.

## 28 October 2026

- Cloudflare emailed every Tunnel user: eight eMudhra security certificates had been made with private keys so weak they could be worked out, and cloudflared versions before 2026.10.2 still trusted them. Before acting on it, Claude checked it matched Cloudflare's own blog post, in case it was phishing. My Pi was on 2026.10.1, so I upgraded through apt to 2026.10.5. The site was only down for the few seconds the tunnel took to restart, and came straight back. My tunnel talks to Caddy over plain HTTP on the Pi itself, so the warning about HTTPS origin certificates didn't affect me. Wrote it up as [a write-up](https://haydnhomelab.com/writeups/cloudflared-emudhra/).

## 27 October 2026

- Found out why CrowdSec and the CVE scan kept disappearing from the live lab. Cron runs `/usr/local/bin/homelab-status.py`, but I'd been installing the new versions as `homelab-status` (no `.py`), so a minute after each update the old script overwrote the stats. It also meant the phone alerts hadn't been running. Copied the new script over the one cron uses and deleted the extra copy.
- Gave the live lab its own "control room" look, like a security operations centre screen: always dark, a faint grid in the background, glass panels with green corner brackets, instrument-style labels, glowing status lights and graphs, a blinking cursor after the title and a slow scan line over the rack. The rest of the site keeps its normal look.
- Restyled the network map and attack map to match. The network map is on a green grid with rounded, glowing nodes and blue dashed zones. The attack map is now a green radar with a pulsing OpenCanary core, and anything that touches a trap lights up pink. Also made the green corner marks on the tiles follow the rounded corners instead of being square.
- Gave the website a big refresh, same style. The portfolio now has a "Live from the Pi" strip that counts up real numbers (attacks blocked in 30 days, ads blocked today, average uptime, critical vulnerabilities), sections that slide in as you scroll, terminal output that prints line by line, bars that grow, grades and failed logins that pop in, and a reading progress bar. The live lab has a ticker in the header of the latest blocked attacks and honeypot hits, numbers that count up and bump when they change, and bars and blocked requests that animate in. Anything that moves respects the "reduce motion" setting.
- Made the site easier to use on phones. Phones always get dark mode now (the theme button is hidden there), the live lab shows the headline numbers, security and services first with the rack drawing further down, labels wrap instead of getting cut off, and long pages like the portfolio and write-ups get a back-to-top button.
- Added a weekly vulnerability scan. Trivy checks every Docker image on the Pi for known CVEs each Monday and sends the result to my phone. It only counts HIGH and CRITICAL ones that already have a fix, so everything it reports is something I can act on. It would have caught the PHP problem in Speedtest by itself. The first scan found 2 critical and 15 high in my Homepage and Speedtest images. Updating both brought it down to 0 critical and 6 high; the rest are waiting on the apps' makers to release new images. Wrote it up as [a write-up](https://haydnhomelab.com/writeups/trivy-scan/).
- Added CrowdSec, which spots attacks in my logs and blocks them, with a shared blocklist from other users. Its local API wanted port 8080, which Caddy already uses, so I moved it to 8085. Both CrowdSec and Trivy also show on my private Homepage dashboard now. With no open ports it mostly covers my home network and Tailscale, but I wanted to learn how it works.
- Made my private Homepage dashboard more useful: a Security group showing honeypot alerts, website visitors and power use (read from the same stats.json as the live lab), a weather widget, Lab and Remote tabs, status dots on every service, and quick search (press any key to search). Also moved the list of allowed addresses out of the Docker Compose file and into the private `.env`, so my home and Tailscale IPs aren't on GitHub any more.
- Speedtest Tracker is back. PHP 8.5.12 fixed the two flaws from the NCSC alert, so I pulled the newest image, checked its PHP version without starting it, then started it again and took it out of maintenance. It was stopped for 6 days.
- Added phone alerts with ntfy. The stats script that runs every minute now sends a notification to my phone if a service fails 2 checks in a row (so a quick restart doesn't set it off), when it comes back up, when the honeypot is touched, and if the Pi goes over 75°C. Services I've stopped on purpose don't alert. The topic name works like a password, so it's in a root-only file on the Pi, not in this repo. Claude tested it against fake data first: a service going down and back up, an old honeypot hit that shouldn't alert, and a new one that should.

## 23 October 2026

- Redesigned the live lab layout so security and uptime come first. A row of headline numbers at the top (attacks Cloudflare blocked today, honeypot alerts, ads blocked, uptime and services running), then a Security tile with 14 days of Cloudflare blocks, the latest blocked requests and my defences, next to what's running and its uptime. The live lab now uses the same top bar as the rest of my site, so "Haydn" and the links line up on every page.
- Tidied it again after looking at it live: the Raspberry Pi stats were three separate boxes that overlapped and jumped about when hovered, so now they're one tile with the temperature gauge, uptime, power, CPU and RAM, and a CPU graph underneath. Uptime is shorter too ("104d 6h" instead of days, hours and minutes) so it still fits after months. The History button moved into the Security tile, since that's what it shows.
- Tidied the network map: every link is now a straight line (no more diagonal to my PC), the rack outline covers the switch, Pi and drive, both tunnels say the Pi started them, and there's a dot grid and a key for cable, Wi-Fi, USB and tunnels.
- Spotted a real attack in the new blocked-request feed: a scanner on a rented Google Cloud server in France tried dozens of `phpinfo.php`, `.env` and `.bak` paths in about 10 seconds, pretending to be Chrome on Windows. My Cloudflare attack-path rule blocked every request, and my site has no PHP anyway. Over 5 days Cloudflare blocked about 3,400 requests, 785 of them my own rate limit test. Wrote it up as [a write-up](https://haydnhomelab.com/writeups/phpinfo-scanner/).
- Cloudflare refused the first version of the feed with "does not have access to the path". Asking its API which data my plan includes showed the free plan does have the blocked-request list (30 days of it), just not one of the summary tables. Switched to the one it allows.
- Redrew the rack on the live lab with more detail: shading, rack unit numbers, Phillips screws, a vented floor, the Pi's board edge, RJ45 plugs in the switch ports with a light for each connected port, and plugs where the cables go into the Pi. Added the new black cable from switch port 3 to my PC, with traffic dots on it.
- Tidied the live lab's header: the four views (How it works, Network map, Attack map, History) are plain text links now instead of six bordered buttons, the "updated" time sits inside the online badge, and the duplicate Portfolio button is gone because "Haydn" already links there. On phones the links are one row you can swipe.
- Made the write-ups and status page easier to find: the portfolio's top bar now only has Write-ups and Status, and they stay visible on phones.
- Made the website more advanced:
  - **Write-ups** at [haydnhomelab.com/writeups](https://haydnhomelab.com/writeups/): eight short articles about things I built and tested, like SSH, the Cloudflare firewall rules, the honeypot, the encrypted backups and the NCSC PHP alert. Each one has what went wrong and what I learned, and says how I used AI.
  - **Status page** at [haydnhomelab.com/status](https://haydnhomelab.com/status/) with 90-day uptime bars for every service, like big companies have. Services I've stopped on purpose (like Speedtest) show as maintenance with the reason, not as down.
  - **Security history** on the live lab (press S): 30 days of Cloudflare blocks, ads blocked, honeypot hits and uptime, plus a feed of the latest requests Cloudflare blocked. It shows the path, country and rule only, never IP addresses.
  - The stats script now keeps 90 days of daily history. Claude tested it against fake data (including Cloudflare refusing a long time range) before it went on the Pi.
- Added secret scanning to this repo. A GitHub Actions workflow runs gitleaks on every push and every Monday, and scans the whole history, not just the newest commit. The first scan checked all 88 commits and found nothing. To make sure it actually catches things, Claude committed a fake GitHub token to a throwaway repo and gitleaks flagged it. The download is checked against the official checksum so it can't be swapped for something else. There's a "Secret scan" badge on the README that goes red if it ever finds something.

## 21 October 2026

- The NCSC put out a warning about two critical PHP flaws (CVE-2026-109618 and CVE-2026-109619) that could let an attacker run code on a web server. Claude helped me check what was affected. My website has no PHP, Pi-hole v6 doesn't use it, and Cloudflare already blocks `.php` addresses. But Speedtest Tracker is a PHP app, and its container had PHP 8.5.11 from 25 September, before the fix. It can only be reached from my home network and Tailscale, so the risk was low. I pulled the newest image, but no fixed one was out yet, so I stopped the container until there is one. "Speedtest" will show as down on the live lab until then.
- Added two HaGeZi blocklists to Pi-hole: Pro for ads and tracking, and Threat Intelligence Feeds (Medium) for known malware, phishing and scam domains. Blocked domains went from about 71,500 to 851,589. I picked the Medium threat list over the full one (1.9 million domains) to go easy on the Pi's 2GB of RAM. My first attempt failed because HaGeZi had moved its files, so `pihole -g` said "Not found". The new addresses use the adblock format, which Pi-hole v6 understands.
- The site showed up on Google, but it looked unfinished: a blank globe icon, "haydnhomelab.com" as the name, and the old pages from before the portfolio became the homepage. Added proper icon files (Google can't use an icon built into the page), told Google the site's name with structured data, and asked it to look at the pages again in Search Console.
- Restyled the live lab to match my portfolio, so the two pages feel like one site. Same fonts, colours, header and light/dark mode (the choice is shared between pages), with colour only used for pass, fail and live like on the portfolio. All the features stayed: the tiles, graphs, network map, attack map and the power-on intro.

## 20 October 2026

- Had Claude check the whole repo history for leaked secrets: no keys, passwords or tokens in any commit. I was also worried my backups were a weak spot, and they were. They hold my Tailscale key, tunnel token and password hashes, and root-only permissions don't protect them if someone just takes the drive. Now every backup is encrypted with `age` on its way to the drive. The Pi only has the public key, so it can lock backups but not open them, and the private key stays on my Mac and in my password manager. Tested a restore on my Mac (the SHA-256 of my UFW rules matched the Pi's), then shredded the old unencrypted backup.
- Made the portfolio my homepage, so haydnhomelab.com is the first thing employers see. The live dashboard moved to [haydnhomelab.com/lab](https://haydnhomelab.com/lab/) and looks the same, and `/about` redirects to the homepage. Claude tested the new Caddyfile on a real copy of Caddy before it went on the Pi, which caught a mistake: the `*.js` no-cache rule was valid but wasn't matching anything. A named matcher (`@scripts path *.js`) fixed it.
- Made an apprenticeship portfolio page at [haydnhomelab.com/about](https://haydnhomelab.com/about/). It shows what I've built with the proof next to each part (the command I ran and what it gave back), the problems I fixed, a timeline of the build, my skills and how I used AI. The photo of my rack has live readings from the Pi on it, and it prints as a PDF for applications. Added `boot` (the exact time the Pi started) to my stats so the uptime can count up every second.
- Made the site findable on Google: a clearer title and description, `robots.txt`, a `sitemap.xml` and a share image so the link previews nicely. Verified the domain in Google Search Console with a DNS TXT record in Cloudflare, submitted the sitemap (it needs the full `https://` address for a Domain property) and requested indexing.
- Added Cloudflare WAF rules: block common attack paths (WordPress, PHP, `.env`, `.git`), only allow GET and HEAD, and rate limit to 100 requests per 10 seconds per IP. Tested with `curl` from my Mac: attack paths and POST got 403. The rate limit didn't trigger at first because I'd used `wildcard "/"`, which only matches the homepage. Changed it to `/*` and 1,000 requests got 785 blocked with 429. Details in the [security plan](security-plan.md#cloudflare-waf-20-october-2026).
- Got the security headers up to **A+**. It was capped at A because the page's code was inline, so the policy had to allow inline scripts. Moved the code into `app.js` and blocked inline scripts completely, so even injected code wouldn't run. The first rescan still showed the old result, but `curl -sI` on the Pi proved the new header was live, and scanning over https gave A+.
- Added security headers to the status page in Caddy: HSTS, a Content Security Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy, and hid the Server header. securityheaders.com went from an **F to an A**. The CSP only lets the page load things from itself and Google Fonts, so injected code can't pull in scripts from anywhere else.
- Set up Unbound so Pi-hole stops sending my lookups to Google or Cloudflare. It asks the root DNS servers, then `.com`, then the site's own server, and checks DNSSEC. It only listens on the Pi (`127.0.0.1:5335`), so no new firewall rules. Tested before switching Pi-hole over: a normal lookup worked, `dnssec.works` came back with the `ad` (authenticated) flag, and the deliberately broken `fail01.dnssec.works` gave SERVFAIL, so faked answers get refused.
- Took proper photos of the finished rack. Moved the My Passport onto the shelf, on top of the switch, plugged into the Pi's USB 3 port. Updated the rack drawing on the status page and the rack layout diagram to match, and the drive can be clicked on the site now.
- Added a honeypot attack map to the status page (press A). It replays the last 7 days of honeypot hits, then watches live. Still never shows IPs or passwords, and test hits are clearly marked as not real.
- Installed the Jellyfin app on our LG TV from the LG Content Store. It uses the Pi's IP, not `jellyfin.lan`, because the TV doesn't use my Pi-hole.
- Problem: video and audio froze for about a second every few seconds. The playback quality was set higher than my connection could keep up with (the Pi reaches the router through a wireless link). Lowering the quality in the player fixed it.
- Gave my private services proper names: `jellyfin.lan`, `dashboard.lan`, `speed.lan` and `pihole.lan`. Pi-hole's local DNS points them all at the Pi, and Caddy on port 80 sends each one to the right service. I moved Pi-hole's own web page to 8090 (not 8081, the honeypot uses that) so Caddy could have port 80. For my phone away from home, the Pi advertises a Tailscale route to just `192.168.1.5`. See the [Caddyfile](../setup/caddy/Caddyfile).
- Added the Speedtest Tracker tile to Homepage with a read-only API token.
- Set up Speedtest Tracker in Docker to test my broadband every 2 hours. Its port clashed with Pi-hole, so it only listens on the Pi itself and Caddy passes it through on 8766, with UFW allowing that from home and Tailscale only. Changed the default admin login straight away. See [speedtest](../setup/speedtest/).
- Problem: Caddy wouldn't reload. I'd lost the closing `}` on the first block, so Caddy read the new site as a setting inside it. `caddy validate` showed the line. The old config kept running, so the website stayed up.
- Added an animated network map to the status page (press N). I tried a hidden terminal too but took it out, it didn't fit the look I wanted.
- Changed my mind about Pi-hole on my phone and set it up through Tailscale: UFW allows DNS on `tailscale0`, Pi-hole listens on all interfaces (UFW still decides who can reach it), the Pi doesn't use Tailscale DNS itself, and the Pi is the global nameserver in Tailscale with "Override DNS servers" on. Ads are blocked on my phone anywhere, even on mobile data. Checked the exit node too: with it on, "what is my IP" shows my home IP.
- Set up Homepage, a private dashboard for all my services, running in Docker. Used `network_mode: host` because Docker normally publishes ports with its own firewall rules that skip UFW. Secrets are in a `.env` file on the Pi, not on GitHub. See [homepage](../setup/homepage/).
- Problems getting Homepage going: my user couldn't `cd` into `/opt/homepage` (the stricter default permissions again), the Jellyfin key was in `.env` without its variable name so Homepage sent the placeholder text instead, and my Jellyfin version needed the widget's `version: 2` because it removed the old `/emby` API paths (that was the 404). The Pi-hole status dot also errored because Pi-hole's web server sends a reply Node's HTTP parser doesn't like, so I removed that check. The Pi-hole tile shows live stats anyway.
- Learned that API keys are like passwords: I'd pasted mine into a chat, so I made a new one.
- Docker warned that memory limits weren't working. Raspberry Pi OS turns off the memory cgroup by default, which also meant my honeypot's 200 MB limit wasn't being enforced. Fixed by adding `cgroup_enable=memory cgroup_memory=1` to `/boot/firmware/cmdline.txt`.
- Set up an OpenCanary honeypot on my home network: fake SSH, Telnet, FTP, MySQL, Remote Desktop, VNC, Redis and a NAS login page. Kept it home network only so nothing is open to the internet. See [honeypot](../setup/honeypot/).
- Problem: `opencanaryd --copyconfig` couldn't find OpenCanary because it ran the system Python instead of the one in its virtual environment. Then my own user couldn't even read `/opt/opencanary`, because the stricter default permissions from the Lynis fixes made the install root-only. Fixed with `chmod -R a+rX` and copied the default config by hand.
- Problem: the service kept crashing with "no new privileges flag is set, which prevents sudo". OpenCanary's start script tries to use sudo, and my systemd sandbox blocks that on purpose. Fixed it by running the twistd engine directly as the `canary` user, which doesn't need root at all.
- Tested it from my Kali VM: SSH to the fake server on port 2222 and logging in to the fake NAS page both got logged straight away.
- Noticed I'd typed my email into the fake NAS login, and the status page would have shown it. Changed it so the public page only shows common attacker usernames like root or admin, and anything else just says "tried logging in".
- Made the Pi a Tailscale exit node, so my phone or laptop can send all its traffic through my home connection on public Wi-Fi, like a free VPN. Needed IP forwarding turned on, and a UFW route rule that only allows forwarding from Tailscale out to the internet. Tested on mobile data: "what is my IP" showed my home IP.
- Rebuilt the network map with zones, device icons, clickable devices and three animated traffic stories that explain how the tunnels and Pi-hole work.
- Gave the status page a sleeker look: Inter font, calmer background, glassier tiles and a spotlight on the rack.
- Set up nightly backups of all my settings, scripts, Jellyfin and Pi-hole to the media drive, keeping 14 days. See [backup](../setup/backup/).
- First backup was 31 MB. Tested restoring my UFW rules from it into a temporary folder and compared them with `diff`: identical, so the backups actually work.
- Added SD card health checks. Normal SD cards can't report their own health like hard drives do, so it watches the warning signs instead: total data written (from ext4's lifetime write counter), how much gets written per day, card errors in the kernel log, filesystem errors from `tune2fs`, and whether the card has gone read-only. It shows in "What's running" on the status page.

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
- Two Lynis warnings were false positives. It said I had no security updates repository, but `trixie-security` is there (Lynis doesn't read Debian 13's newer file format). It also said I needed a reboot, but `needrestart -k -b` showed I'm running the Pi 5 build of the latest kernel, and it was just seeing the build for older Pis.
- Measured how much power the Pi uses with `vcgencmd pmic_read_adc`: about 1.7 W. With the switch and power supply losses the whole rack is about 3.7 W, which is roughly £8 a year. Added power use and the cost to the status page.
- Redesigned the status page as a one-screen dashboard with tiles you can click to expand, instead of one long scrolling page.
- Made the stats live. Cron can only run once a minute, so I added a small service that takes a reading every 3 seconds and keeps the last 5 minutes. It's sandboxed with systemd so it can only write to the status folder and has no network access.
- Problem: the site kept showing Cloudflare's "bad gateway" error. Python's simple web server couldn't keep up with the page asking for new data every 3 seconds, so I swapped it for Caddy.
- Problem: ads blocked and DNS queries kept dropping to 0. When Pi-hole didn't answer in time, the script saved nothing and the page counted down to 0. Now it keeps the last numbers and writes the error to a log.
- Added Fail2ban, SSH, Caddy and the live stats service to "What's running", with extra details for each.
- Plugged a 1TB WD My Passport into the Pi for media. It was formatted for Windows (NTFS) and empty, so I wiped it and formatted it as ext4, the Linux format. It mounts automatically at `/mnt/media` using its UUID in `/etc/fstab`, with `nofail` so the Pi still boots if the drive is unplugged.
- Installed Jellyfin, my own Netflix-style media server. I checked the install script's checksum and read it before running it.
- Problem: the installer said `/tmp` was too small. On the Pi, `/tmp` lives in RAM and is capped at about 1GB, so I made it bigger until the next reboot with `mount -o remount,size=1500M /tmp`.
- Problem: Jellyfin couldn't open the films folder. My stricter default permissions from the Lynis fixes meant other users couldn't read it. Fixed it by giving the folders to the jellyfin group, with the setgid bit (`2775`) so new files get the right group too.
- Jellyfin is only open to my home network and Tailscale in UFW, not on my public domain.
- Problem: "What's running" was empty, but worked when I ran the script by hand. The error log showed `No such file or directory: 'ufw'`. Cron runs scripts with a much shorter PATH that doesn't include `/usr/sbin`, where `ufw` lives. Fixed it by setting the full PATH at the top of the script.
- Set up a Samba share so I can drag films onto the drive from my Mac or PC. Only my user can log in, only from home or Tailscale, and new files automatically get the jellyfin group.
- Added a script that downloads free public domain films from the Internet Archive every week into a "Classics" library.
- Problem: the film script said only 25 GB was free. That's the SD card, so the drive wasn't mounted. The Pi had restarted and the drive had vanished. `lsusb` could still see the My Passport, so the cable and power were fine, but the USB storage driver hadn't loaded, so there was no `sda`. Loading it with `modprobe usb-storage` brought the drive back, and I added it to `/etc/modules-load.d/` so it loads on every boot.
- Changed the film script so it refuses to run if the drive isn't mounted, so it can never fill up the SD card.
- Removed the free films script in the end. The films available legally for free weren't really what I wanted to watch.

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
- Took some photos of it against a white background (in [images](../images/)).

<img src="../images/rack-angle.jpg" alt="Rack from an angle" width="360">

**Next:** flash the SD card, boot the Pi for the first time, then fit the Pi and switch in the rack.

## 14 October 2026

- Ordered all the parts from The Pi Hut and Amazon (see the [parts list](parts-list.md)).
- Wanted the 1GB Pi 5 to save money but it was out of stock, so went with the 2GB.
- Swapped the SBC shelf for a KKSB 1U rack panel so the Pi's ports face the front. It also has space for a second Pi.
- Made an SSH key on my Mac ready to put on the Pi.
- Turned on 2FA for the account I'll use to log in to Tailscale.
- Updated the rack layout and network diagram to match the parts I actually bought.

**Next:** wait for delivery, then flash the SD card and boot the Pi for the first time.
