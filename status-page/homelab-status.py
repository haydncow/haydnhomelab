#!/usr/bin/env python3
"""Collects live stats for my homelab status page.

Runs every minute from cron (as root) and writes /srv/status/stats.json.
index.html (in the same folder) reads it, and a Cloudflare Tunnel
shares the page on the internet.

It only shows harmless info (uptime, temperature, memory, ads blocked,
whether each service is running). No IP addresses, hostnames, ports or
software versions, because those help attackers.
"""
import json
import os
import subprocess
import time
import urllib.request

OUT_DIR = "/srv/status"
STATE_DIR = "/var/lib/homelab-status"  # keeps 24 hours of temp/memory readings
PASS_FILE = "/etc/homelab-status/pihole-app-password"  # root-only (chmod 600)
API = "http://127.0.0.1/api"  # Pi-hole's API, only asked from the Pi itself

# What shows in the "What's running" panel: (name on the page, systemd service)
SERVICES = [
    ("Pi-hole", "pihole-FTL"),
    ("Tailscale", "tailscaled"),
    ("Cloudflare Tunnel", "cloudflared"),
    ("Web server", "status-web"),
    ("Auto updates", "unattended-upgrades"),
]
SAMPLE_EVERY = 300  # save a reading for the graphs every 5 minutes
KEEP = 24 * 3600


def read(path):
    with open(path) as f:
        return f.read().strip()


def uptime():
    secs = int(float(read("/proc/uptime").split()[0]))
    days, rem = divmod(secs, 86400)
    hours, rem = divmod(rem, 3600)
    return f"{days}d {hours}h {rem // 60}m"


def temp_c():
    return int(read("/sys/class/thermal/thermal_zone0/temp")) / 1000


def memory_pct():
    info = {}
    for line in read("/proc/meminfo").splitlines():
        key, value = line.split(":")
        info[key] = int(value.split()[0])
    return 100 * (1 - info["MemAvailable"] / info["MemTotal"])


def cpu_load():
    return read("/proc/loadavg").split()[0]


def services():
    out = []
    for name, unit in SERVICES:
        r = subprocess.run(["systemctl", "is-active", unit], capture_output=True, text=True)
        out.append({"name": name, "up": r.stdout.strip() == "active"})
    r = subprocess.run(["ufw", "status"], capture_output=True, text=True)
    out.append({"name": "Firewall (UFW)", "up": "Status: active" in r.stdout})
    return out


def api(method, path, sid=None, body=None):
    headers = {"Content-Type": "application/json"}
    if sid:
        headers["X-FTL-SID"] = sid
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read() or b"{}")


def pihole():
    # Log in with the app password, get the stats, then log out again
    # so old sessions don't build up.
    sid = api("POST", "/auth", body={"password": read(PASS_FILE)})["session"]["sid"]
    try:
        q = api("GET", "/stats/summary", sid=sid)["queries"]
        hist = api("GET", "/history", sid=sid).get("history", [])
        # 10 minute buckets for the last 24 hours: [time, total, blocked]
        dns = [[h["timestamp"], h["total"], h["blocked"]] for h in hist]
        return {
            "blocked": f"{q['blocked']:,}",
            "queries": f"{q['total']:,}",
            "percent": f"{q['percent_blocked']:.1f}%",
            "dns_history": dns,
        }
    finally:
        try:
            api("DELETE", "/auth", sid=sid)
        except Exception:
            pass


def safe(fn, default=None):
    # If one reading fails, show "n/a" instead of breaking the whole page
    try:
        return fn()
    except Exception:
        return default


def history(now, temp, mem):
    # Keep a reading every 5 minutes for the temperature and memory graphs
    path = os.path.join(STATE_DIR, "history.json")
    hist = safe(lambda: json.load(open(path)), [])
    if temp is not None and (not hist or now - hist[-1][0] >= SAMPLE_EVERY):
        hist.append([int(now), round(temp, 1), round(mem or 0)])
    hist = [h for h in hist if now - h[0] <= KEEP]
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(hist, f)
    return hist


def main():
    now = time.time()
    temp = safe(temp_c)
    mem = safe(memory_pct)
    ph = safe(pihole, {})
    data = {
        "updated": int(now),
        "updated_text": time.strftime("%d %b %Y, %H:%M", time.localtime(now)),
        "uptime": safe(uptime),
        "temp": f"{temp:.1f}°C" if temp is not None else None,
        "load": safe(cpu_load),
        "memory": f"{mem:.0f}%" if mem is not None else None,
        "blocked": ph.get("blocked"),
        "queries": ph.get("queries"),
        "percent": ph.get("percent"),
        "services": safe(services, []),
        "dns_history": ph.get("dns_history", []),
        "pi_history": safe(lambda: history(now, temp, mem), []),
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(OUT_DIR, ".stats.json.tmp")
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(OUT_DIR, "stats.json"))  # swap in one go


if __name__ == "__main__":
    main()
