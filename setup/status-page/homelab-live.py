#!/usr/bin/env python3
"""Live stats for my homelab status page.

Runs all the time as a systemd service (status-live) and every 3 seconds
writes /srv/status/live.json with the last 5 minutes of readings:
CPU use, temperature, power and memory. The page reads it every 3 seconds
so the graphs keep moving.

The slower stuff (Pi-hole stats, services, 24 hour history) is still done
once a minute by homelab-status.py.
"""
import json
import os
import subprocess
import time
from collections import deque

OUT = "/srv/status/live.json"
EVERY = 3            # seconds between readings
KEEP = 100           # 100 readings x 3 seconds = 5 minutes


def read(path):
    with open(path) as f:
        return f.read().strip()


def cpu_times():
    # First line of /proc/stat: time the CPU has spent doing each kind of work
    parts = [int(x) for x in read("/proc/stat").splitlines()[0].split()[1:]]
    idle = parts[3] + parts[4]  # idle + waiting for disk
    return sum(parts), idle


def temp_c():
    return int(read("/sys/class/thermal/thermal_zone0/temp")) / 1000


def memory_pct():
    info = {}
    for line in read("/proc/meminfo").splitlines():
        key, value = line.split(":")
        info[key] = int(value.split()[0])
    return 100 * (1 - info["MemAvailable"] / info["MemTotal"])


def power_watts():
    # Volts x amps on each of the Pi 5's power rails, added up
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


def safe(fn):
    try:
        return fn()
    except Exception:
        return None


def main():
    points = deque(maxlen=KEEP)
    last_total, last_idle = cpu_times()
    tmp = OUT + ".tmp"
    while True:
        time.sleep(EVERY)
        total, idle = cpu_times()
        busy = 100 * (1 - (idle - last_idle) / max(1, total - last_total))
        last_total, last_idle = total, idle
        t, w, m = safe(temp_c), safe(power_watts), safe(memory_pct)
        points.append([
            int(time.time()),
            round(busy, 1),
            round(t, 1) if t is not None else None,
            round(w, 2) if w is not None else None,
            round(m, 1) if m is not None else None,
        ])
        with open(tmp, "w") as f:
            json.dump({"every": EVERY, "points": list(points)}, f)
        os.chmod(tmp, 0o644)
        os.replace(tmp, OUT)


if __name__ == "__main__":
    main()
