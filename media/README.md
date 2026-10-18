# Media server

Jellyfin runs on the Pi with a 1TB WD My Passport plugged in, mounted at `/mnt/media`.

- `movies/` and `tv/` are for my own films and shows
- `classics/` fills itself with free films from the Internet Archive (below)
- It's only reachable from my home network and over Tailscale, not on my public domain
- A Samba share lets me drag films in from Finder or File Explorer

## Free classic films (`ia-films.py`)

The Internet Archive has a "Feature Films" collection of old films that are in the public domain, so they're free to share and the Archive lets you download them. This script runs once a week, picks the most popular ones I don't have yet, downloads two, and names them so Jellyfin finds the poster and info:

```
/mnt/media/classics/Night of the Living Dead (1968)/Night of the Living Dead (1968).mp4
```

- Remembers what it's already downloaded, so nothing comes down twice
- Only picks MP4 versions, which the Pi can play without converting
- Skips anything over 4 GB and stops if the drive gets below 100 GB free
- Downloads to a `.part` file first, so half-finished films never show up in Jellyfin
- Refuses to run if the drive isn't mounted, so it can never fill up the SD card by mistake (this happened on the first try)

Claude (AI) wrote this script. I set it up on the Pi.
