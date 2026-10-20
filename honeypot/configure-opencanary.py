#!/usr/bin/env python3
"""Turns OpenCanary's default config into my home honeypot config.

Run after `opencanaryd --copyconfig` has made /etc/opencanary/opencanary.conf.
Every fake service is on a port my real services don't use, and UFW only
lets my home network reach them.
"""
import json

PATH = "/etc/opencanary/opencanary.conf"
cfg = json.load(open(PATH))

# Turn everything off first, then switch on the ones I want
for key in list(cfg):
    if key.endswith(".enabled"):
        cfg[key] = False

cfg.update({
    "device.node_id": "homelab-canary",
    "ftp.enabled": True, "ftp.port": 21, "ftp.banner": "FTP server ready",
    "telnet.enabled": True, "telnet.port": 23, "telnet.banner": "",
    "ssh.enabled": True, "ssh.port": 2222, "ssh.version": "SSH-2.0-OpenSSH_5.1p1 Debian-4",
    "mysql.enabled": True, "mysql.port": 3306, "mysql.banner": "5.5.43-0ubuntu0.14.04.1",
    "rdp.enabled": True, "rdp.port": 3389,
    "vnc.enabled": True, "vnc.port": 5900,
    "redis.enabled": True, "redis.port": 6379,
    "http.enabled": True, "http.port": 8081, "http.banner": "Apache/2.2.22 (Ubuntu)", "http.skin": "nasLogin",
})

# Write events as one JSON object per line to a log file
cfg["logger"] = {
    "class": "PyLogger",
    "kwargs": {
        "formatters": {"plain": {"format": "%(message)s"}},
        "handlers": {"file": {"class": "logging.FileHandler", "filename": "/var/log/opencanary/opencanary.log"}},
    },
}

json.dump(cfg, open(PATH, "w"), indent=2)
on = sorted(k[:-8] for k, v in cfg.items() if k.endswith(".enabled") and v)
print("Honeypot services on:", ", ".join(on))
