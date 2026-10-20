# Backups

Every night at 4am a systemd timer runs `homelab-backup.sh`, which saves a `.tar.gz` of the Pi's important files to the media drive at `/mnt/media/backups`. It keeps the last 14.

## What's in each backup

- `/etc`: all settings, including SSH, UFW, Fail2ban, Caddy, Pi-hole, Samba, Cloudflare Tunnel and fstab
- A Pi-hole Teleporter export
- `/var/lib/jellyfin`: Jellyfin's library and settings (it stops Jellyfin for a moment so the database copies cleanly)
- `/var/lib/tailscale`: so the Pi keeps the same identity on my tailnet
- `/usr/local/bin` and `/srv/status`: my scripts and the website
- `/home`: my home folder, including SSH authorised keys
- Root's and my crontabs, and a list of every installed package

The films themselves aren't backed up. They're on the same drive and too big.

## Safety

- The backups contain secrets (SSH host keys, the tunnel token, password hashes), so the folder and files are **root-only**. My Samba login can't open them.
- It refuses to run if the drive isn't mounted, so it never fills the SD card.
- It checks each archive opens before counting it as a good backup.
- The time of the last backup shows in "What's running" on the status page, and it shows as down if a night gets missed.

## Restoring

If the SD card dies:

1. Flash Raspberry Pi OS Lite again and set up SSH like the first time.
2. Plug the drive in and mount it:
   ```
   sudo mkdir -p /mnt/media && sudo mount /dev/sda1 /mnt/media
   ```
3. Reinstall the packages I had:
   ```
   sudo apt update
   tar -xzf /mnt/media/backups/homelab-YYYY-MM-DD.tar.gz extra/packages-manual.txt -O | xargs sudo apt install -y
   ```
4. Restore the files and reboot:
   ```
   sudo tar -xzpf /mnt/media/backups/homelab-YYYY-MM-DD.tar.gz -C /
   sudo reboot
   ```

To restore just one file, for example my UFW rules:
```
sudo tar -xzpf /mnt/media/backups/homelab-YYYY-MM-DD.tar.gz -C / etc/ufw
```

## Still to do

The backups are on a drive plugged into the same Pi, so a fire, theft or power surge could take out both. The next step is copying them somewhere else as well (the 3-2-1 rule: 3 copies, 2 different devices, 1 off-site).

Claude (AI) wrote this script. I set it up and tested restoring from it.
