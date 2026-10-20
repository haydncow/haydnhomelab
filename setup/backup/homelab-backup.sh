#!/bin/bash
# Nightly backup of my homelab Pi to the media drive.
# Runs at 4am from a systemd timer (homelab-backup.timer).
#
# Saves one encrypted .tar.gz.age per night to /mnt/media/backups and keeps
# the last 14. The backups contain secrets (SSH keys, Tailscale key, tunnel
# token, password hashes), so each one is encrypted with age before it touches
# the drive. The Pi only has the public key, which can lock backups but not
# open them. The private key is kept off the Pi.
# The folder and files are also root-only.
set -euo pipefail

MOUNT=/mnt/media
DEST=$MOUNT/backups
KEEP=14
RECIPIENTS=/etc/homelab-backup/recipients.txt
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

# Never write an unencrypted backup
command -v age >/dev/null || fail "age is not installed"
[ -s "$RECIPIENTS" ] || fail "no public key in $RECIPIENTS"

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

OUT="$DEST/homelab-$DATE.tar.gz.age"
# tar | age, so the unencrypted archive is never saved anywhere
tar --create --gzip --file - \
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
  | age --encrypt --recipients-file "$RECIPIENTS" --output "$OUT.part" \
  || { if [ "$JELLY_WAS_RUNNING" = yes ]; then systemctl start jellyfin; fi; rm -f "$OUT.part"; fail "backup failed"; }

if [ "$JELLY_WAS_RUNNING" = yes ]; then systemctl start jellyfin; fi

mv "$OUT.part" "$OUT"
chmod 600 "$OUT"

# The Pi can't open the backup (no private key), so check it at least looks
# like a finished age file. I test a real restore on my Mac.
head -c 21 "$OUT" | grep -q "age-encryption.org/v1" || fail "backup file is not encrypted properly"
[ "$(stat -c %s "$OUT")" -gt 1000000 ] || fail "backup file is too small"

# Delete backups older than the newest $KEEP
ls -1t "$DEST"/homelab-*.tar.gz.age 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

SIZE=$(du -h "$OUT" | cut -f1)
COUNT=$(ls -1 "$DEST"/homelab-*.tar.gz.age | wc -l)
mkdir -p "$STATE"
echo "{\"time\": $(date +%s), \"ok\": true, \"size\": \"$SIZE\", \"count\": $COUNT}" > "$STATE/last.json"
log "Backup done: $OUT ($SIZE), keeping $COUNT"
