#!/usr/bin/env python3
"""Builds a small public status page for my homelab.

Runs every 5 minutes from cron and writes /srv/status/index.html,
which Tailscale Funnel shares on the internet.

It only shows harmless numbers (uptime, temperature, memory, ads blocked).
No IP addresses, hostnames or software versions, because those help attackers.
"""
import html
import json
import os
import time
import urllib.request

OUT_DIR = "/srv/status"
PASS_FILE = "/etc/homelab-status/pihole-app-password"  # root-only (chmod 600)
API = "http://127.0.0.1/api"  # Pi-hole's API, only asked from the Pi itself


def read(path):
    with open(path) as f:
        return f.read().strip()


def uptime():
    secs = int(float(read("/proc/uptime").split()[0]))
    days, rem = divmod(secs, 86400)
    hours, rem = divmod(rem, 3600)
    return f"{days}d {hours}h {rem // 60}m"


def cpu_temp():
    return f"{int(read('/sys/class/thermal/thermal_zone0/temp')) / 1000:.1f}°C"


def memory_used():
    info = {}
    for line in read("/proc/meminfo").splitlines():
        key, value = line.split(":")
        info[key] = int(value.split()[0])
    return f"{100 * (1 - info['MemAvailable'] / info['MemTotal']):.0f}%"


def cpu_load():
    return read("/proc/loadavg").split()[0]


def api(method, path, sid=None, body=None):
    headers = {"Content-Type": "application/json"}
    if sid:
        headers["X-FTL-SID"] = sid
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read() or b"{}")


def pihole_stats():
    # Log in with the app password, get the stats, then log out again
    # so old sessions don't build up.
    sid = api("POST", "/auth", body={"password": read(PASS_FILE)})["session"]["sid"]
    try:
        q = api("GET", "/stats/summary", sid=sid)["queries"]
        return f"{q['blocked']:,}", f"{q['total']:,}", f"{q['percent_blocked']:.1f}%"
    finally:
        try:
            api("DELETE", "/auth", sid=sid)
        except Exception:
            pass


def safe(fn):
    # If one reading fails, show "n/a" instead of breaking the whole page
    try:
        return fn()
    except Exception:
        return None


def main():
    stats = safe(pihole_stats) or ("n/a", "n/a", "n/a")
    rows = [
        ("Uptime", safe(uptime)),
        ("CPU temp", safe(cpu_temp)),
        ("CPU load", safe(cpu_load)),
        ("Memory used", safe(memory_used)),
        ("Ads blocked (24h)", stats[0]),
        ("DNS queries (24h)", stats[1]),
        ("Blocked", stats[2]),
    ]
    items = "\n".join(
        f'<div class="row"><span>{html.escape(k)}</span><b>{html.escape(v or "n/a")}</b></div>'
        for k, v in rows
    )
    updated = time.strftime("%d %b %Y, %H:%M")

    page = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="300">
<title>Haydn's homelab</title>
<style>
  body {{ margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #0d1117; color: #e6edf3; font: 16px/1.5 ui-monospace, Menlo, monospace; }}
  .card {{ width: min(420px, 92vw); border: 1px solid #30363d; border-radius: 12px;
          padding: 24px; background: #161b22; }}
  h1 {{ font-size: 18px; margin: 0 0 4px; }}
  .live {{ color: #3fb950; }}
  .sub {{ color: #8b949e; font-size: 13px; margin: 0 0 18px; }}
  .row {{ display: flex; justify-content: space-between; padding: 8px 0;
          border-bottom: 1px dashed #30363d; }}
  .row:last-child {{ border-bottom: 0; }}
  .row span {{ color: #8b949e; }}
  footer {{ color: #8b949e; font-size: 12px; margin-top: 16px; }}
  a {{ color: #58a6ff; }}
</style></head>
<body><div class="card">
<h1>&gt; haydn's homelab <span class="live">&#9679; online</span></h1>
<p class="sub">Raspberry Pi 5 in a 10 inch rack, running Pi-hole</p>
{items}
<footer>Updated {updated}, refreshes every 5 minutes.<br>
How it's built: <a href="https://github.com/haydncow/homelab-plan">github.com/haydncow/homelab-plan</a></footer>
</div></body></html>
"""
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(OUT_DIR, ".index.html.tmp")
    with open(tmp, "w") as f:
        f.write(page)
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(OUT_DIR, "index.html"))  # swap in one go


if __name__ == "__main__":
    main()
