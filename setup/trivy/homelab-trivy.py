#!/usr/bin/env python3
"""Weekly vulnerability scan of every Docker image running on my Pi.

Uses Trivy to look for known CVEs (HIGH and CRITICAL only, and only ones a
fix exists for, so I can act on every result). Saves a summary for the live
lab and sends it to my phone with ntfy. Runs from root's cron every Monday.
Code written by Claude (AI).
"""
import json
import os
import subprocess
import time
import urllib.request

OUT = "/var/lib/homelab-trivy/last.json"      # read by homelab-status
NTFY_FILE = "/etc/homelab-status/ntfy.json"    # same private topic as my other alerts


def images():
    out = subprocess.run(["docker", "ps", "--format", "{{.Image}}"], capture_output=True, text=True).stdout
    return sorted(set(out.split()))


def scan(image):
    r = subprocess.run(["trivy", "image", "--quiet", "--scanners", "vuln", "--severity", "HIGH,CRITICAL",
                        "--ignore-unfixed", "--format", "json", "--timeout", "15m", image],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return {"image": image.split("/")[-1], "error": (r.stderr.strip().splitlines() or ["scan failed"])[-1][:200]}
    vulns = [v for res in json.loads(r.stdout).get("Results") or [] for v in res.get("Vulnerabilities") or []]
    ids = {}
    for v in vulns:
        ids.setdefault(v["VulnerabilityID"], v["Severity"])   # count each CVE once per image
    crit = sorted(i for i, s in ids.items() if s == "CRITICAL")
    return {"image": image.split("/")[-1], "critical": len(crit),
            "high": sum(1 for s in ids.values() if s == "HIGH"), "examples": crit[:3]}


def ntfy(title, body, priority):
    try:
        cfg = json.load(open(NTFY_FILE))
    except (OSError, ValueError):
        return
    req = urllib.request.Request(cfg.get("server", "https://ntfy.sh").rstrip("/") + "/" + cfg["topic"],
                                 data=body.encode(), method="POST",
                                 headers={"Title": title, "Priority": priority, "Tags": "mag"})
    urllib.request.urlopen(req, timeout=10).read()


def main():
    results = [scan(i) for i in images()]
    crit = sum(r.get("critical", 0) for r in results)
    high = sum(r.get("high", 0) for r in results)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT + ".tmp", "w") as f:
        json.dump({"time": int(time.time()), "critical": crit, "high": high, "images": results}, f)
    os.chmod(OUT + ".tmp", 0o644)
    os.replace(OUT + ".tmp", OUT)
    lines = [f"{r['image']}: " + (r["error"] if "error" in r else f"{r['critical']} critical, {r['high']} high")
             for r in results]
    ntfy(f"Weekly scan: {crit} critical, {high} high (fixable)", "\n".join(lines),
         "high" if crit else "default")


if __name__ == "__main__":
    main()
