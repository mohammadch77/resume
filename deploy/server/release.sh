#!/usr/bin/env bash
# Installs a release tarball built on the laptop (deploy/build-release.sh) and switches to it, with automatic rollback.
#   /opt/scenestudio/bin/release.sh /tmp/scenestudio-release.tar.gz
# Steps: unpack to releases/<stamp>, apply database migrations (migrator role, forward-only), switch the `current` symlink, restart ONLY
# scenestudio.service, health-check; if the check fails the previous release is put back. Other services are never touched.
set -euo pipefail
BASE=/opt/scenestudio
APP_PORT=3190
TAR="${1:-}"
[[ -f $TAR ]] || { echo "usage: $0 /path/to/scenestudio-release.tar.gz" >&2; exit 2; }
[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }

STAMP="$(date -u +%Y%m%d-%H%M%S)"
NEW="$BASE/releases/$STAMP"
PREV="$(readlink -f "$BASE/current" 2>/dev/null || true)"

echo "== unpacking into $NEW"
mkdir -p "$NEW"
tar -xzf "$TAR" -C "$NEW"
[[ -f $NEW/server.js && -d $NEW/tools && -d $NEW/drizzle/migrations ]] || { echo "this does not look like a Scene Studio release" >&2; rm -rf "$NEW"; exit 1; }
chown -R scenestudio:scenestudio "$NEW"
chmod -R go+rX "$NEW"

echo "== database migrations"
( set -a; . "$BASE/env/migrator.env"; set +a; cd "$NEW"; node tools/migrate.mjs ) || { echo "migration failed: nothing was switched" >&2; rm -rf "$NEW"; exit 1; }

echo "== switching"
ln -sfn "$NEW" "$BASE/current.new"
mv -Tf "$BASE/current.new" "$BASE/current"
systemctl restart scenestudio.service

healthy() {
  for _ in $(seq 1 30); do
    c1="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://127.0.0.1:$APP_PORT/" || true)"
    c2="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://127.0.0.1:$APP_PORT/admin/login" || true)"
    [[ $c1 == 200 && $c2 == 200 ]] && return 0
    sleep 1
  done
  return 1
}

if healthy; then
  echo "== OK: $(cat "$NEW/RELEASE" 2>/dev/null || echo "$STAMP") is live"
  # keep the 5 newest releases (never the one in use)
  ls -1dt "$BASE"/releases/*/ 2>/dev/null | tail -n +6 | while read -r old; do [[ "$(readlink -f "$old")" == "$(readlink -f "$BASE/current")" ]] || rm -rf "$old"; done
  exit 0
fi

echo "== HEALTH CHECK FAILED" >&2
if [[ -n $PREV && -d $PREV ]]; then
  echo "== rolling back to $PREV" >&2
  ln -sfn "$PREV" "$BASE/current.new"; mv -Tf "$BASE/current.new" "$BASE/current"
  systemctl restart scenestudio.service
  healthy && echo "== rolled back, the previous release is live again" >&2
else
  echo "== no previous release to go back to; the service is left as it is (journalctl -u scenestudio -n 50)" >&2
fi
exit 1
