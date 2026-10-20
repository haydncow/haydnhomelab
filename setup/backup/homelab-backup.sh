#!/bin/bash
# Nightly backup of my homelab Pi to the media drive.
# Runs at 4am from a systemd timer (homelab-backup.timer).
#
# Saves one .tar.gz per night to /mnt/media/backups and keeps the last 14.
# The backups contain secrets (SSH keys, tunnel token, password hashes), so
# the folder and files are root-only.
set -euo pipefail

MOUNT=/mnt/media
DEST=$MOUNT/backups
KEEP=14
STATE=/var/lib/homelab-backup
DATE=$(date +%F)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

log() { echo "$(date '+%F %T') $*"; }
fail() {
  log "FAILED: $*"
  mkdir -p "$STATE"
  echo "{\"time\": $(date +%s), \"ok\": false, \"error\": \"$*\"}" > "$STATE/last.json"
  exit 1
}

# Never back up to the SD card if the drive isn't plugged in
mountpoint -q "$MOUNT" || fail "media drive not mounted"

umask 077
mkdir -p "$DEST" && chmod 700 "$DEST"

# Things that aren't plain files: crontabs, package lists, Pi-hole export
mkdir -p "$WORK/extra"
crontab -l > "$WORK/extra/root-crontab.txt" 2>/dev/null || true
crontab -u haydn -l > "$WORK/extra/haydn-crontab.txt" 2>/dev/null || true
dpkg --get-selections > "$WORK/extra/packages.txt"
apt-mark showmanual > "$WORK/extra/packages-manual.txt"
(cd "$WORK/extra" && pihole-FTL --teleporter >/dev/null 2>&1) || log "warning: Pi-hole export failed"

# Stop Jellyfin for a moment so its database is copied cleanly
JELLY_WAS_RUNNING=no
if systemctl is-active --quiet jellyfin; then
  JELLY_WAS_RUNNING=yes
  systemctl stop jellyfin
fi

OUT="$DEST/homelab-$DATE.tar.gz"
tar --create --gzip --file "$OUT.part" \
    --warning=no-file-changed --ignore-failed-read \
    --exclude='/var/lib/jellyfin/transcodes' \
    --exclude='/home/*/.cache' \
    /etc \
    /usr/local/bin \
    /srv/status \
    /var/lib/homelab-status \
    /var/lib/jellyfin \
    /var/lib/tailscale \
    /home \
    -C "$WORK" extra \
  || { if [ "$JELLY_WAS_RUNNING" = yes ]; then systemctl start jellyfin; fi; fail "tar failed"; }

if [ "$JELLY_WAS_RUNNING" = yes ]; then systemctl start jellyfin; fi

mv "$OUT.part" "$OUT"
chmod 600 "$OUT"

# Check the archive actually opens before trusting it
tar --list --gzip --file "$OUT" > /dev/null || fail "backup file is corrupt"

# Delete backups older than the newest $KEEP
ls -1t "$DEST"/homelab-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

SIZE=$(du -h "$OUT" | cut -f1)
COUNT=$(ls -1 "$DEST"/homelab-*.tar.gz | wc -l)
mkdir -p "$STATE"
echo "{\"time\": $(date +%s), \"ok\": true, \"size\": \"$SIZE\", \"count\": $COUNT}" > "$STATE/last.json"
log "Backup done: $OUT ($SIZE), keeping $COUNT"
