# Backups

Every night at 4am a systemd timer runs `homelab-backup.sh`, which saves an encrypted `.tar.gz.age` of the Pi's important files to the media drive at `/mnt/media/backups`. It keeps the last 14.

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

- The backups contain secrets (SSH host keys, the Tailscale key, the tunnel token, password hashes), so every backup is **encrypted with [age](https://github.com/FiloSottile/age)** before it's written to the drive. Root-only permissions only work while the drive is in the Pi. Anyone who took the drive could read it on their own computer, so encryption is what actually protects it.
- The Pi only has the **public key** (`/etc/homelab-backup/recipients.txt`). It can lock backups but can't open them, so even someone who broke into the Pi couldn't read old backups. The private key is on my Mac and in my password manager, never on the Pi or GitHub.
- The archive goes straight from `tar` into `age`, so an unencrypted copy is never saved anywhere. If `age` or the public key is missing, the backup fails instead of saving it unencrypted.
- The folder and files are still **root-only** as well. My Samba login can't open them.
- It refuses to run if the drive isn't mounted, so it never fills the SD card.
- The Pi can't open its own backups, so it checks each one is a complete age file. I test a real restore on my Mac.
- The time of the last backup shows in "What's running" on the live lab, and it shows as down if a night gets missed.

## Restoring

If the SD card dies:

1. Flash Raspberry Pi OS Lite again and set up SSH like the first time.
2. Plug the drive in, mount it and install age:
   ```
   sudo mkdir -p /mnt/media && sudo mount /dev/sda1 /mnt/media
   sudo apt update && sudo apt install -y age
   ```
3. Copy the private key over from my Mac for the restore only:
   ```
   scp ~/homelab-backup-key.txt haydn@homelab.local:
   ```
4. Reinstall the packages I had:
   ```
   sudo age -d -i ~/homelab-backup-key.txt /mnt/media/backups/homelab-YYYY-MM-DD.tar.gz.age | tar -xzf - extra/packages-manual.txt -O | xargs sudo apt install -y
   ```
5. Restore the files, delete the key from the Pi and reboot:
   ```
   sudo age -d -i ~/homelab-backup-key.txt /mnt/media/backups/homelab-YYYY-MM-DD.tar.gz.age | sudo tar -xzpf - -C /
   shred -u ~/homelab-backup-key.txt
   sudo reboot
   ```

To restore just one file, for example my UFW rules, add its path to the end of the `tar` command (`... -C / etc/ufw`).

## Still to do

The backups are on a drive plugged into the same Pi, so a fire, theft or power surge could take out both. The next step is copying them somewhere else as well (the 3-2-1 rule: 3 copies, 2 different devices, 1 off-site).

## Tested

20 October 2026: restored `etc/ufw/user.rules` from the first backup into a temporary folder and compared it with the real file using `diff`. Identical.

Claude (AI) wrote this script. I set it up and tested restoring from it.
