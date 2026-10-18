#!/usr/bin/env python3
"""Adds free classic films from the Internet Archive to Jellyfin.

The Internet Archive's "Feature Films" collection is old films that are in
the public domain (free to share) and the Archive lets you download them.
Each run this picks the most popular ones I don't have yet, downloads a
couple, and names them the way Jellyfin likes:

    /mnt/media/classics/Night of the Living Dead (1968)/Night of the Living Dead (1968).mp4

Run it weekly from cron. To grab more on the first run:
    python3 ia-films.py --count 5
"""
import argparse
import json
import os
import re
import shutil
import sys
import time
import urllib.parse
import urllib.request

MOUNT = "/mnt/media"
DEST = os.path.join(MOUNT, "classics")
STATE = os.path.join(DEST, ".downloaded.json")   # films already got, so they aren't downloaded twice
KEEP_FREE_GB = 100      # stop if the drive has less than this free
MAX_FILM_GB = 4         # skip anything bigger than this
SEARCH = "https://archive.org/advancedsearch.php"
UA = {"User-Agent": "haydnhomelab-ia-films/1.0 (personal Jellyfin library)"}

# Best video formats first. All of these play on the Pi without converting.
FORMATS = ["h.264 HD", "h.264", "MPEG4", "512Kb MPEG4"]


def log(*msg):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *msg, flush=True)


def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def popular_films(rows=200):
    # Most downloaded films in the Feature Films collection
    params = urllib.parse.urlencode([
        ("q", "collection:feature_films AND mediatype:movies"),
        ("fl[]", "identifier"), ("fl[]", "title"), ("fl[]", "year"),
        ("sort[]", "downloads desc"), ("rows", rows), ("output", "json"),
    ])
    return get_json(f"{SEARCH}?{params}")["response"]["docs"]


def best_file(identifier):
    # Pick the best quality MP4 the Archive has for this film
    files = get_json(f"https://archive.org/metadata/{identifier}").get("files", [])
    for fmt in FORMATS:
        for f in files:
            if f.get("format") == fmt and f.get("name", "").lower().endswith(".mp4"):
                return f["name"], int(f.get("size") or 0)
    return None, 0


def clean(text):
    # Remove characters that aren't allowed in file names
    text = re.sub(r'[\\/:*?"<>|]', "", str(text)).strip()
    return re.sub(r"\s+", " ", text)[:120]


def download(url, path):
    tmp = path + ".part"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as out:
        shutil.copyfileobj(r, out, length=1024 * 1024)
    os.replace(tmp, path)   # only appears in Jellyfin once it's fully downloaded


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=2, help="how many films to add this run")
    args = ap.parse_args()

    # If the drive isn't plugged in, /mnt/media is just an empty folder on the
    # SD card. Never download in that case or it would fill the SD card.
    if not os.path.ismount(MOUNT):
        log(f"Stopping: the media drive isn't mounted at {MOUNT}")
        return 1

    os.umask(0o002)   # so the jellyfin group can read new files
    os.makedirs(DEST, exist_ok=True)
    try:
        done = set(json.load(open(STATE)))
    except (FileNotFoundError, ValueError):
        done = set()

    added = 0
    for film in popular_films():
        if added >= args.count:
            break
        ident = film.get("identifier")
        if not ident or ident in done:
            continue

        free_gb = shutil.disk_usage(DEST).free / 1e9
        if free_gb < KEEP_FREE_GB:
            log(f"Stopping: only {free_gb:.0f} GB free on the drive")
            break

        title = clean(film.get("title") or ident)
        year = str(film.get("year") or "")[:4]
        name = f"{title} ({year})" if year.isdigit() else title

        try:
            fname, size = best_file(ident)
            if not fname:
                log(f"Skipping {name}: no MP4 version")
                done.add(ident)
                continue
            if size > MAX_FILM_GB * 1e9:
                log(f"Skipping {name}: too big ({size / 1e9:.1f} GB)")
                done.add(ident)
                continue

            folder = os.path.join(DEST, name)
            os.makedirs(folder, exist_ok=True)
            url = f"https://archive.org/download/{ident}/{urllib.parse.quote(fname)}"
            log(f"Downloading {name} ({size / 1e6:.0f} MB)")
            download(url, os.path.join(folder, f"{name}.mp4"))
            done.add(ident)
            added += 1
            log(f"Added {name}")
        except Exception as e:
            log(f"Failed {name}: {e}")   # try again next run

        with open(STATE, "w") as f:
            json.dump(sorted(done), f)
        time.sleep(5)   # be polite to the Archive's servers

    log(f"Done. Added {added} film(s).")


if __name__ == "__main__":
    sys.exit(main())
