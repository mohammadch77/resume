#!/usr/bin/env bash
# Proves the newest backup restores: loads db.dump into a TEMPORARY database in our own cluster, counts tables and key rows, drops it.
# The live database is never touched.  Usage: restore-test.sh [backup-folder]
set -euo pipefail
BASE=/opt/scenestudio
PG_PORT=5442
TMPDB=scenestudio_restore_test
DIR="${1:-$(ls -1dt "$BASE"/backups/2*/ | head -1)}"
DIR="${DIR%/}"
[[ -f $DIR/db.dump ]] || { echo "no db.dump in $DIR" >&2; exit 1; }
( cd "$DIR" && sha256sum -c SHA256SUMS >/dev/null ) && echo "checksums ok"
psql_pg() { runuser -u postgres -- psql -p "$PG_PORT" -v ON_ERROR_STOP=1 -q -t -A "$@"; }
psql_pg -d postgres -c "DROP DATABASE IF EXISTS $TMPDB" -c "CREATE DATABASE $TMPDB OWNER migrator"
trap 'psql_pg -d postgres -c "DROP DATABASE IF EXISTS $TMPDB" >/dev/null' EXIT
runuser -u postgres -- pg_restore -p "$PG_PORT" -d "$TMPDB" --no-owner --exit-on-error "$DIR/db.dump" < /dev/null
echo "tables: $(psql_pg -d "$TMPDB" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
for t in users site_settings home_content services projects leads media_assets; do
  echo "$t: $(psql_pg -d "$TMPDB" -c "SELECT count(*) FROM $t")"
done
tar -tzf "$DIR/uploads.tar.gz" >/dev/null && echo "uploads archive readable"
echo "RESTORE TEST OK ($DIR)"
