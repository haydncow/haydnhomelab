#!/usr/bin/env python3
"""Collects live stats for my homelab status page.

Runs every minute from cron (as root) and writes /srv/status/stats.json.
My portfolio (/) and the live lab (/lab/) both read it, and a Cloudflare
Tunnel shares them on the internet.

It only shows harmless info (uptime, temperature, memory, power use,
ads blocked, whether each service is running). It also writes history.json:
90 days of uptime and daily totals for /status/ and the lab, plus the paths
Cloudflare blocked recently. No IP addresses, hostnames, ports or
software versions, because those help attackers.
"""
import calendar
import json
import os
import subprocess
import sys
import time
import traceback
import urllib.request

# Cron runs with a very short PATH that doesn't include /usr/sbin, where
# ufw lives, so set the full one here instead of relying on cron
os.environ["PATH"] = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

OUT_DIR = "/srv/status"
STATE_DIR = "/var/lib/homelab-status"  # keeps 24 hours of temp/memory readings
PASS_FILE = "/etc/homelab-status/pihole-app-password"  # root-only (chmod 600)
API = "http://127.0.0.1:8090/api"  # Pi-hole's API (moved to 8090 so Caddy can have port 80)

# What shows in the "What's running" panel:
# (name on the page, systemd service(s) to check, extra detail function name)
SERVICES = [
    ("Pi-hole", ["pihole-FTL"], "pihole"),
    ("Unbound", ["unbound"], None),
    ("Tailscale", ["tailscaled"], "tailscale"),
    ("Cloudflare Tunnel", ["cloudflared"], None),
    ("Web server (Caddy)", ["caddy", "status-web"], None),
    ("Live stats", ["status-live"], None),
    ("SSH", ["ssh"], None),
    ("Fail2ban", ["fail2ban"], "fail2ban"),
    ("Jellyfin", ["jellyfin"], None),
    ("Honeypot", ["opencanary"], "honeypot"),
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


# Apps that run in Docker instead of systemd: (name on the page, container name)
DOCKER = [("Homepage", "homepage"), ("Speedtest Tracker", "speedtest-tracker")]


def docker_services():
    out = []
    for name, container in DOCKER:
        info = run("docker", "inspect", "-f", "{{.State.Running}} {{.State.StartedAt}}", container).split()
        up = bool(info) and info[0] == "true"
        since = None
        if up:
            started = calendar.timegm(time.strptime(info[1][:19], "%Y-%m-%dT%H:%M:%S"))
            since = ago(time.time() - started)
        out.append({"name": name, "up": up, "detail": None, "for": since})
    return out


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


CANARY_LOG = "/var/log/opencanary/opencanary.log"
CANARY_PORTS = {21: "Fake FTP", 23: "Fake Telnet", 2222: "Fake SSH", 3306: "Fake MySQL", 3389: "Fake Remote Desktop",
                5900: "Fake VNC", 6379: "Fake Redis", 8081: "Fake NAS login page"}


# Only these usernames are shown on the public page. Anything else someone
# types (like a real email or name) just shows as "a username".
SAFE_USERS = {"root", "admin", "administrator", "user", "pi", "test", "guest", "ubuntu", "oracle",
              "postgres", "ftp", "support", "default", "sa", "mysql", "operator", "nas"}


def honeypot():
    # Read the honeypot's log. Only says which fake service was touched and
    # when, never IP addresses or passwords (I might type a real one testing it).
    # Each connection counts once, even though it logs several lines.
    conns = {}
    with open(CANARY_LOG) as f:
        for line in f:
            try:
                e = json.loads(line)
            except ValueError:
                continue
            if int(e.get("logtype", 0)) < 2000 or not e.get("src_host"):
                continue   # 1xxx are OpenCanary's own start-up messages
            key = (e.get("src_host"), e.get("src_port"), e.get("dst_port"))
            when = calendar.timegm(time.strptime(e["utc_time"][:19], "%Y-%m-%d %H:%M:%S"))
            user = (e.get("logdata") or {}).get("USERNAME")
            c = conns.setdefault(key, {"time": int(when), "service": CANARY_PORTS.get(e.get("dst_port"), "another port"),
                                       "port": e.get("dst_port"), "user": None})
            if user:
                c["user"] = str(user) if str(user).lower() in SAFE_USERS else "a username"
    events = sorted(conns.values(), key=lambda c: c["time"])
    now = time.time()
    day = [e for e in events if now - e["time"] < 86400]
    week = [e for e in events if now - e["time"] < 7 * 86400]
    # "week" feeds the attack map on the page: the last 7 days, newest last
    return {"today": len(day), "total": len(events), "recent": events[-8:][::-1], "week": week[-150:]}


def detail_honeypot():
    h = honeypot()
    if not h["total"]:
        return "watching, nothing touched it yet"
    last = h["recent"][0]
    return f"{h['today']} alerts in 24h, last: {last['service']} {ago(time.time() - last['time'])} ago"


def detail_firewall():
    rules = [l for l in run("ufw", "status", "numbered").splitlines() if l.strip().startswith("[")]
    return f"{len(rules)} rules"


def backup_status():
    # Written by homelab-backup.sh after each nightly backup
    last = json.load(open("/var/lib/homelab-backup/last.json"))
    age = time.time() - last["time"]
    ok = last.get("ok") and age < 36 * 3600   # counts as down if it's missed a night
    detail = f"last ran {ago(age)} ago" + (f", {last['size']}, keeping {last['count']}" if last.get("ok") else ", failed")
    return {"name": "Nightly backup", "up": bool(ok), "detail": detail, "for": None}


def sd_health():
    # Normal SD cards can't report their own health, so watch the warning signs:
    # how much has been written (cards wear out from writing), errors from the
    # card, filesystem errors, and whether Linux has made it read-only.
    written_gb = int(read("/sys/fs/ext4/mmcblk0p2/lifetime_write_kbytes")) / 1e6

    # Work out GB written per day by comparing with a reading from a while ago
    path = os.path.join(STATE_DIR, "sd.json")
    now = time.time()
    first = safe(lambda: json.load(open(path))) if os.path.exists(path) else None
    if not first:
        first = {"time": now, "gb": written_gb}
        os.makedirs(STATE_DIR, exist_ok=True)
        json.dump(first, open(path, "w"))
    days = (now - first["time"]) / 86400
    per_day = (written_gb - first["gb"]) / days if days >= 0.25 else None

    card_errors = sum(1 for l in run("journalctl", "-k", "-b", "--no-pager", "-q").splitlines()
                      if "mmc" in l and ("error" in l.lower() or "timeout" in l.lower()))
    fs_errors = 0
    for line in run("tune2fs", "-l", "/dev/mmcblk0p2").splitlines():
        if line.startswith("FS Error count"):
            fs_errors = int(line.split(":")[1])
    read_only = any(l.split()[1] == "/" and "ro" in l.split()[3].split(",")
                    for l in read("/proc/mounts").splitlines())

    problems = []
    if read_only:
        problems.append("READ-ONLY, replace the card")
    if card_errors:
        problems.append(f"{card_errors} card error{'s' if card_errors != 1 else ''} since boot")
    if fs_errors:
        problems.append(f"{fs_errors} filesystem error{'s' if fs_errors != 1 else ''}")
    detail = f"{written_gb:,.0f} GB written"
    if per_day is not None:
        detail += f", about {per_day:.1f} GB a day"
    detail += ", " + (", ".join(problems) if problems else "no errors")
    return {"name": "SD card", "up": not problems, "detail": detail, "for": None,
            "sd": {"written_gb": round(written_gb, 1), "per_day": round(per_day, 2) if per_day is not None else None,
                   "card_errors": card_errors, "fs_errors": fs_errors, "read_only": read_only}}


def services(gravity=None):
    details = {
        "tailscale": detail_tailscale,
        "fail2ban": detail_fail2ban,
        "updates": detail_updates,
        "pihole": lambda: f"blocking {gravity:,} domains" if gravity else None,
        "honeypot": detail_honeypot,
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
    out += safe(docker_services, [])
    backup = safe(backup_status)
    if backup:
        out.append(backup)
    sd = safe(sd_health)
    if sd:
        out.append(sd)
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


def write_badges(data):
    """Small JSON files for the live badges on my GitHub README.

    shields.io reads these from haydnhomelab.com/badges/ and draws the badge.
    Same rule as the page: only harmless info.
    """
    svcs = data["services"] or []
    up = sum(1 for x in svcs if x["up"])
    temp = float(data["temp"][:-2]) if data["temp"] else None
    badges = {
        "status": ("homelab", "online", "brightgreen"),
        "services": ("services", f"{up}/{len(svcs)} up",
                     "brightgreen" if svcs and up == len(svcs) else "orange"),
        "uptime": ("uptime", " ".join((data["uptime"] or "unknown").split()[:2]), "blue"),
        "blocked": ("ads blocked (24h)", data["blocked"] or "unknown", "red"),
        "temp": ("CPU temp", data["temp"] or "unknown",
                 "lightgrey" if temp is None else "brightgreen" if temp < 60 else "orange" if temp < 75 else "red"),
        "power": ("power", data["power"] or "unknown", "yellow"),
    }
    folder = os.path.join(OUT_DIR, "badges")
    os.makedirs(folder, exist_ok=True)
    os.chmod(folder, 0o755)
    for name, (label, message, color) in badges.items():
        tmp = os.path.join(folder, f".{name}.tmp")
        with open(tmp, "w") as f:
            json.dump({"schemaVersion": 1, "label": label, "message": message,
                       "color": color, "cacheSeconds": 300}, f)
        os.chmod(tmp, 0o644)
        os.replace(tmp, os.path.join(folder, f"{name}.json"))


# Visitor counts come from Cloudflare, which already counts unique visitors to
# my domain. The Pi never sees or stores anyone's IP address, only the totals.
CF_FILE = "/etc/homelab-status/cloudflare.json"   # {"token": "...", "zone": "..."}, root-only
CF_CACHE = os.path.join(STATE_DIR, "visitors.json")
CF_QUERY = """query($zone: String!, $since: Date!) {
  viewer { zones(filter: {zoneTag: $zone}) {
    httpRequests1dGroups(limit: 31, filter: {date_geq: $since}, orderBy: [date_ASC]) {
      dimensions { date } uniq { uniques } sum { pageViews }
    }
  } }
}"""


def cf_days(days):
    cfg = json.load(open(CF_FILE))
    since = time.strftime("%Y-%m-%d", time.gmtime(time.time() - (days - 1) * 86400))
    body = json.dumps({"query": CF_QUERY, "variables": {"zone": cfg["zone"], "since": since}}).encode()
    req = urllib.request.Request("https://api.cloudflare.com/client/v4/graphql", data=body, method="POST",
                                 headers={"Authorization": "Bearer " + cfg["token"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        out = json.load(r)
    if out.get("errors"):
        raise RuntimeError(out["errors"][0].get("message", "Cloudflare API error"))
    rows = out["data"]["viewer"]["zones"][0]["httpRequests1dGroups"]
    return [[g["dimensions"]["date"], g["uniq"]["uniques"], g["sum"]["pageViews"]] for g in rows]


def visitors():
    # Only ask Cloudflare every 15 minutes, the numbers don't change faster than that
    try:
        cached = json.load(open(CF_CACHE))
        if time.time() - cached["fetched"] < 900:
            return cached["data"]
    except (OSError, ValueError, KeyError):
        cached = None
    try:
        try:
            days = cf_days(30)
        except RuntimeError:
            days = cf_days(7)   # the free plan might only allow a shorter range
    except Exception:
        traceback.print_exc()   # cron sends this to the error log
        return cached["data"] if cached else None
    today = time.strftime("%Y-%m-%d", time.gmtime())
    data = {
        "today": sum(d[1] for d in days if d[0] == today),
        "week": sum(d[1] for d in days[-7:]),
        "month": sum(d[1] for d in days),
        "views_month": sum(d[2] for d in days),
        "days": days,
    }
    os.makedirs(STATE_DIR, exist_ok=True)
    json.dump({"fetched": time.time(), "data": data}, open(CF_CACHE, "w"))
    return data


# ---------- 90-day history, for the status page and the lab's security history ----------
# Every minute this adds one "check" for today and records which services were up.
# Daily totals (DNS lookups, ads blocked, honeypot hits, Cloudflare blocks, visitors)
# come from 24 hour windows that slide along, so each day keeps the biggest
# number it has seen. Kept for 90 days in /var/lib/homelab-status/daily.json.
DAILY_FILE = os.path.join(STATE_DIR, "daily.json")
KEEP_DAYS = 90
# Optional: services I've stopped on purpose, so they show as "maintenance"
# instead of "down". Example: {"Speedtest Tracker": "Stopped until PHP is patched"}
MAINT_FILE = "/etc/homelab-status/maintenance.json"


def maintenance():
    try:
        m = json.load(open(MAINT_FILE))
    except (OSError, ValueError):
        return {}
    return {str(k)[:60]: str(v)[:200] for k, v in m.items()} if isinstance(m, dict) else {}


def day_of(ts):
    return time.strftime("%Y-%m-%d", time.localtime(ts))


def update_daily(data, now, firewall):
    days = (safe(lambda: json.load(open(DAILY_FILE)), {}) if os.path.exists(DAILY_FILE) else {}) or {}
    maint = maintenance()

    def entry(day):
        return days.setdefault(day, {"checks": 0, "up": {}, "maint": {}})

    def keep_max(day, key, value):
        if value is not None:
            e = entry(day)
            e[key] = max(e.get(key, 0), int(value))

    today = entry(day_of(now))
    today["checks"] += 1
    for svc in data.get("services") or []:
        name = svc["name"]
        if svc["up"]:
            today["up"][name] = today["up"].get(name, 0) + 1
        elif name in maint:
            today["maint"][name] = today["maint"].get(name, 0) + 1
        else:
            today["up"].setdefault(name, 0)

    sums = {}
    for ts, total, blocked in data.get("dns_history") or []:
        q, b = sums.get(day_of(ts), (0, 0))
        sums[day_of(ts)] = (q + total, b + blocked)
    for day, (q, b) in sums.items():
        keep_max(day, "queries", q)
        keep_max(day, "blocked", b)

    hits = {}
    for e in (data.get("honeypot") or {}).get("week", []):
        hits[day_of(e["time"])] = hits.get(day_of(e["time"]), 0) + 1
    for day, n in hits.items():
        keep_max(day, "honeypot", n)

    for date, uniques, _views in (data.get("visitors") or {}).get("days", []):
        keep_max(date, "visitors", uniques)

    for date, n in (firewall or {}).get("per_day", {}).items():
        keep_max(date, "cf_blocked", n)

    keep = sorted(days)[-KEEP_DAYS:]
    days = {d: days[d] for d in keep}
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = DAILY_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(days, f)
    os.replace(tmp, DAILY_FILE)
    return days, maint


# Requests Cloudflare blocked before they reached the Pi. Only the path, country,
# method and which rule stopped it. Never the IP address or browser details.
CF_FW_CACHE = os.path.join(STATE_DIR, "firewall.json")
CF_FW_QUERY = """query($zone: String!, $since: Time!) {
  viewer { zones(filter: {zoneTag: $zone}) {
    events: firewallEventsAdaptive(limit: 60, filter: {datetime_geq: $since}, orderBy: [datetime_DESC]) {
      datetime action source clientCountryName clientRequestPath clientRequestHTTPMethodName
    }
    groups: firewallEventsAdaptiveGroups(limit: 50, filter: {datetime_geq: $since}, orderBy: [date_ASC]) {
      count dimensions { date action }
    }
  } }
}"""
BLOCKING = {"block", "drop", "managed_challenge", "challenge", "jschallenge", "connection_close"}
RULE_NAMES = {"firewallCustom": "My firewall rule", "firewallrules": "My firewall rule", "ratelimit": "Rate limit",
              "firewallManaged": "Managed rules", "waf": "Managed rules", "securitylevel": "Security level",
              "securityLevel": "Security level", "bic": "Browser check", "l7ddos": "DDoS protection",
              "botFight": "Bot fight mode", "uablock": "User agent block", "validation": "Bad request"}


def clean_path(p):
    p = (p or "/").split("?")[0]
    p = "".join(ch for ch in p if 32 < ord(ch) < 127) or "/"
    return p[:60] + "..." if len(p) > 60 else p


def cf_firewall_fetch(hours):
    cfg = json.load(open(CF_FILE))
    since = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - hours * 3600))
    body = json.dumps({"query": CF_FW_QUERY, "variables": {"zone": cfg["zone"], "since": since}}).encode()
    req = urllib.request.Request("https://api.cloudflare.com/client/v4/graphql", data=body, method="POST",
                                 headers={"Authorization": "Bearer " + cfg["token"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        out = json.load(r)
    if out.get("errors"):
        raise RuntimeError(out["errors"][0].get("message", "Cloudflare API error"))
    zone = out["data"]["viewer"]["zones"][0]
    feed = []
    for e in zone["events"]:
        if e.get("action") not in BLOCKING:
            continue
        feed.append({
            "time": calendar.timegm(time.strptime(e["datetime"][:19], "%Y-%m-%dT%H:%M:%S")),
            "path": clean_path(e.get("clientRequestPath")),
            "method": str(e.get("clientRequestHTTPMethodName") or "")[:8],
            "country": str(e.get("clientCountryName") or "")[:2].upper(),
            "rule": RULE_NAMES.get(e.get("source"), "Cloudflare"),
        })
    per_day = {}
    for g in zone["groups"]:
        if g["dimensions"]["action"] in BLOCKING:
            d = g["dimensions"]["date"]
            per_day[d] = per_day.get(d, 0) + g["count"]
    return {"feed": feed[:25], "per_day": per_day, "hours": hours}


def cf_firewall():
    # Ask Cloudflare every 5 minutes. Free plans can only look back a limited
    # time, so try a day first, then shorter windows.
    try:
        cached = json.load(open(CF_FW_CACHE))
        if time.time() - cached["fetched"] < 300:
            return cached["data"]
    except (OSError, ValueError, KeyError):
        cached = None
    data = None
    for hours in (24, 6, 1):
        try:
            data = cf_firewall_fetch(hours)
            break
        except RuntimeError:
            continue
        except Exception:
            traceback.print_exc()
            break
    if data is None:
        return cached["data"] if cached else None
    os.makedirs(STATE_DIR, exist_ok=True)
    json.dump({"fetched": time.time(), "data": data}, open(CF_FW_CACHE, "w"))
    return data


def write_history(data, now):
    firewall = safe(cf_firewall) if os.path.exists(CF_FILE) else None
    days, maint = update_daily(data, now, firewall)
    names = [s["name"] for s in data.get("services") or []]
    out_days = []
    for date in sorted(days):
        d = days[date]
        checks = d.get("checks", 0)
        uptime = {}
        for name in names:
            m = d.get("maint", {}).get(name, 0)
            if name not in d.get("up", {}) and not m:
                uptime[name] = None          # not tracked that day
            elif checks - m <= 0:
                uptime[name] = "maint"       # stopped on purpose all day
            else:
                uptime[name] = round(100 * d["up"].get(name, 0) / (checks - m), 2)
        out_days.append({"date": date, "checks": checks, "uptime": uptime,
                         "maint": {k: v for k, v in d.get("maint", {}).items() if k in names},
                         **{k: d[k] for k in ("queries", "blocked", "honeypot", "cf_blocked", "visitors") if k in d}})
    public = {
        "updated": int(now),
        "services": [{"name": s["name"], "up": s["up"], "maint": maint.get(s["name"]) if not s["up"] else None}
                     for s in data.get("services") or []],
        "days": out_days,
        "firewall": firewall,
    }
    tmp = os.path.join(OUT_DIR, ".history.json.tmp")
    with open(tmp, "w") as f:
        json.dump(public, f)
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(OUT_DIR, "history.json"))


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
        # exact time the Pi started, so pages can count the uptime up every second
        "boot": safe(lambda: int(now - float(read("/proc/uptime").split()[0]))),
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
        "honeypot": safe(honeypot) if os.path.exists(CANARY_LOG) else None,
        "dns_history": ph.get("dns_history", []),
        "pi_history": safe(lambda: history(now, temp, mem, watts), []),
        "visitors": safe(visitors) if os.path.exists(CF_FILE) else None,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(OUT_DIR, ".stats.json.tmp")
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(OUT_DIR, "stats.json"))  # swap in one go
    safe(lambda: write_badges(data))
    safe(lambda: write_history(data, now))


if __name__ == "__main__":
    main()
