#!/usr/bin/env python3
"""Collects live stats for my homelab status page.

Runs every minute from cron and writes /srv/status/stats.json.
index.html (in the same folder) reads it, and Tailscale Funnel
shares the folder on the internet.

It only shows harmless numbers (uptime, temperature, memory, ads blocked).
No IP addresses, hostnames or software versions, because those help attackers.
"""
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
    blocked, queries, percent = safe(pihole_stats) or (None, None, None)
    now = time.time()
    data = {
        "updated": int(now),
        "updated_text": time.strftime("%d %b %Y, %H:%M", time.localtime(now)),
        "uptime": safe(uptime),
        "temp": safe(cpu_temp),
        "load": safe(cpu_load),
        "memory": safe(memory_used),
        "blocked": blocked,
        "queries": queries,
        "percent": percent,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(OUT_DIR, ".stats.json.tmp")
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(OUT_DIR, "stats.json"))  # swap in one go


if __name__ == "__main__":
    main()
