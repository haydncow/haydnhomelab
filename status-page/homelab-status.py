#!/usr/bin/env python3
"""Collects live stats for my homelab status page.

Runs every minute from cron (as root) and writes /srv/status/stats.json.
index.html (in the same folder) reads it, and a Cloudflare Tunnel
shares the page on the internet.

It only shows harmless info (uptime, temperature, memory, power use,
ads blocked, whether each service is running). No IP addresses, hostnames, ports or
software versions, because those help attackers.
"""
import json
import os
import subprocess
import sys
import time
import traceback
import urllib.request

OUT_DIR = "/srv/status"
STATE_DIR = "/var/lib/homelab-status"  # keeps 24 hours of temp/memory readings
PASS_FILE = "/etc/homelab-status/pihole-app-password"  # root-only (chmod 600)
API = "http://127.0.0.1/api"  # Pi-hole's API, only asked from the Pi itself

# What shows in the "What's running" panel:
# (name on the page, systemd service(s) to check, extra detail function name)
SERVICES = [
    ("Pi-hole", ["pihole-FTL"], "pihole"),
    ("Tailscale", ["tailscaled"], "tailscale"),
    ("Cloudflare Tunnel", ["cloudflared"], None),
    ("Web server (Caddy)", ["caddy", "status-web"], None),
    ("Live stats", ["status-live"], None),
    ("SSH", ["ssh"], None),
    ("Fail2ban", ["fail2ban"], "fail2ban"),
    ("Auto updates", ["unattended-upgrades"], "updates"),
]

# Power cost estimate. The Pi only measures its own board, so add a rough
# figure for the switch and the power supply's losses.
EXTRA_WATTS = 2.0
PRICE_PER_KWH = 0.25  # pounds, roughly what I pay
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


def power_watts():
    # The Pi 5's power chip reports the volts and amps on each supply rail.
    # Watts = volts x amps, added up across all the rails.
    out = subprocess.run(["vcgencmd", "pmic_read_adc"], capture_output=True, text=True).stdout
    amps, volts = {}, {}
    for line in out.splitlines():
        parts = line.split()
        if len(parts) != 2 or "=" not in parts[1]:
            continue
        name, value = parts[0], float(parts[1].split("=")[1].rstrip("AV"))
        if name.endswith("_A"):
            amps[name[:-2]] = value
        elif name.endswith("_V"):
            volts[name[:-2]] = value
    return sum(amps[k] * volts[k] for k in amps if k in volts)


def run(*cmd):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=15).stdout


def ago(secs):
    # 200000 -> "2d 7h", 4000 -> "1h 6m", 300 -> "5m"
    secs = int(max(0, secs))
    d, rem = divmod(secs, 86400)
    h, rem = divmod(rem, 3600)
    m = rem // 60
    if d:
        return f"{d}d {h}h"
    if h:
        return f"{h}h {m}m"
    return f"{m}m"


def running_for(unit):
    # How long the service has been running, using time since boot so
    # time zones don't matter
    mono = run("systemctl", "show", unit, "-p", "ActiveEnterTimestampMonotonic", "--value").strip()
    boot_secs = float(read("/proc/uptime").split()[0])
    if not mono or mono == "0":
        return None
    return ago(boot_secs - int(mono) / 1e6)


def detail_tailscale():
    # Count how many of my devices are online, without showing their names or IPs
    status = json.loads(run("tailscale", "status", "--json"))
    peers = list((status.get("Peer") or {}).values())
    online = 1 + sum(1 for p in peers if p.get("Online"))
    return f"{online} of {len(peers) + 1} devices online"


def detail_fail2ban():
    out = run("fail2ban-client", "status", "sshd")
    nums = {}
    for line in out.splitlines():
        for key in ("Currently banned", "Total banned"):
            if key in line:
                nums[key] = int(line.split(":")[-1].strip())
    return f"{nums.get('Currently banned', 0)} banned now, {nums.get('Total banned', 0)} in total"


def detail_updates():
    stamp = "/var/lib/apt/periodic/unattended-upgrades-stamp"
    return f"last checked {ago(time.time() - os.path.getmtime(stamp))} ago"


def detail_firewall():
    rules = [l for l in run("ufw", "status", "numbered").splitlines() if l.strip().startswith("[")]
    return f"{len(rules)} rules"


def services(gravity=None):
    details = {
        "tailscale": detail_tailscale,
        "fail2ban": detail_fail2ban,
        "updates": detail_updates,
        "pihole": lambda: f"blocking {gravity:,} domains" if gravity else None,
    }
    out = []
    for name, units, extra in SERVICES:
        # use the first unit that's running (the web server could be Caddy or the old one)
        unit = next((u for u in units if run("systemctl", "is-active", u).strip() == "active"), None)
        out.append({
            "name": name,
            "up": unit is not None,
            "detail": safe(details[extra]) if (extra and unit) else None,
            "for": safe(lambda: running_for(unit)) if unit else None,
        })
    fw = run("ufw", "status")
    out.append({"name": "Firewall (UFW)", "up": "Status: active" in fw,
                "detail": safe(detail_firewall), "for": None})
    return out


def api(method, path, sid=None, body=None):
    headers = {"Content-Type": "application/json"}
    if sid:
        headers["X-FTL-SID"] = sid
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read() or b"{}")


def pihole():
    # Log in with the app password, get the stats, then log out again
    # so old sessions don't build up.
    sid = api("POST", "/auth", body={"password": read(PASS_FILE)})["session"]["sid"]
    try:
        summary = api("GET", "/stats/summary", sid=sid)
        q = summary["queries"]
        hist = api("GET", "/history", sid=sid).get("history", [])
        # 10 minute buckets for the last 24 hours: [time, total, blocked]
        dns = [[h["timestamp"], h["total"], h["blocked"]] for h in hist]
        return {
            "blocked": f"{q['blocked']:,}",
            "queries": f"{q['total']:,}",
            "percent": f"{q['percent_blocked']:.1f}%",
            "dns_history": dns,
            "gravity": summary.get("gravity", {}).get("domains_being_blocked"),
        }
    finally:
        try:
            api("DELETE", "/auth", sid=sid)
        except Exception:
            pass


def safe(fn, default=None):
    # If one reading fails, carry on instead of breaking the whole page,
    # but write the error to the log so I can see what went wrong
    try:
        return fn()
    except Exception:
        print(time.strftime("%Y-%m-%d %H:%M:%S"), f"{getattr(fn, '__name__', 'reading')} failed:", file=sys.stderr)
        traceback.print_exc()
        return default


def history(now, temp, mem, watts):
    # Keep a reading every 5 minutes for the temperature and memory graphs
    path = os.path.join(STATE_DIR, "history.json")
    hist = safe(lambda: json.load(open(path)), [])
    if temp is not None and (not hist or now - hist[-1][0] >= SAMPLE_EVERY):
        hist.append([int(now), round(temp, 1), round(mem or 0), round(watts or 0, 2)])
    hist = [h for h in hist if now - h[0] <= KEEP]
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(hist, f)
    return hist


def main():
    now = time.time()
    temp = safe(temp_c)
    mem = safe(memory_pct)
    watts = safe(power_watts)
    ph = safe(pihole, {})
    if not ph:
        # Pi-hole didn't answer this time, so keep the last numbers it gave
        old = safe(lambda: json.load(open(os.path.join(OUT_DIR, "stats.json"))), {})
        ph = {k: old.get(k) for k in ("blocked", "queries", "percent", "dns_history", "gravity")}
        ph["dns_history"] = ph["dns_history"] or []
    data = {
        "updated": int(now),
        "updated_text": time.strftime("%d %b %Y, %H:%M", time.localtime(now)),
        "uptime": safe(uptime),
        "temp": f"{temp:.1f}°C" if temp is not None else None,
        "load": safe(cpu_load),
        "memory": f"{mem:.0f}%" if mem is not None else None,
        "power": f"{watts:.1f} W" if watts else None,
        "cost_year": f"£{(watts + EXTRA_WATTS) * 24 * 365 / 1000 * PRICE_PER_KWH:.2f}" if watts else None,
        "blocked": ph.get("blocked"),
        "queries": ph.get("queries"),
        "percent": ph.get("percent"),
        "gravity": ph.get("gravity"),
        "services": safe(lambda: services(ph.get("gravity")), []),
        "dns_history": ph.get("dns_history", []),
        "pi_history": safe(lambda: history(now, temp, mem, watts), []),
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(OUT_DIR, ".stats.json.tmp")
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(OUT_DIR, "stats.json"))  # swap in one go


if __name__ == "__main__":
    main()
