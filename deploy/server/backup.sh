#!/usr/bin/env bash
# Daily backup (systemd timer scenestudio-backup.timer): a custom-format dump of the database + the uploads folder, kept 7 days.
# Writes only into /opt/scenestudio/backups (root-only). Restore test: restore-test.sh.
set -euo pipefail
BASE=/opt/scenestudio
PG_PORT=5442
DIR="$BASE/backups/$(date -u +%Y%m%d-%H%M)"
umask 077
mkdir -p "$DIR"
runuser -u postgres -- pg_dump -p "$PG_PORT" -Fc scenestudio > "$DIR/db.dump"
tar -C "$BASE/data" -czf "$DIR/uploads.tar.gz" uploads
sha256sum "$DIR/db.dump" "$DIR/uploads.tar.gz" > "$DIR/SHA256SUMS"
# keep 7 days of backups (our own folder only; nginx-before-* config backups are kept separately)
find "$BASE/backups" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
echo "backup ok: $DIR ($(du -sh "$DIR" | cut -f1))"
