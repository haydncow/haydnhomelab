# Media server

Jellyfin runs on the Pi with a 1TB WD My Passport plugged in, mounted at `/mnt/media`.

- `movies/` and `tv/` are for my own films and shows
- `free-films/` fills itself with free, legal films from the Internet Archive (below)
- It's only reachable from my home network and over Tailscale, not on my public domain
- A Samba share lets me drag films in from Finder or File Explorer

## Free films (`ia-films.py`)

Runs once a week and downloads two free, legal films from the Internet Archive into a "Free films" library.

By default it gets **newer films that their makers released under Creative Commons**, so they're free to share: Blender Studio's films (Sintel, Tears of Steel, Cosmos Laundromat, Sprite Fright and more), Sita Sings the Blues, The Internet's Own Boy, Star Wreck and a few documentaries. Before downloading it checks the Archive's copy actually has a Creative Commons licence, and skips it if not.

With `--classics` it gets old public domain films from the Archive's Feature Films collection instead.

Films are named so Jellyfin finds the poster and info:

```
/mnt/media/free-films/Sintel (2010)/Sintel (2010).mp4
```

- Remembers what it's already downloaded, so nothing comes down twice
- Only picks MP4 versions, which the Pi can play without converting
- Skips anything over 4 GB and stops if the drive gets below 100 GB free
- Downloads to a `.part` file first, so half-finished films never show up in Jellyfin
- Refuses to run if the drive isn't mounted, so it can never fill up the SD card by mistake (this happened on the first try)

Claude (AI) wrote this script. I set it up on the Pi.
