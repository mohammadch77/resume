#!/usr/bin/env bash
# Puts the previous release back (the newest one that is not `current`) and restarts ONLY scenestudio.service.
# Note: database migrations are forward-only and additive, so older code keeps working on a newer schema; a data restore is a separate step (RUNBOOK).
set -euo pipefail
BASE=/opt/scenestudio
[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }
CUR="$(readlink -f "$BASE/current")"
PREV="$(ls -1dt "$BASE"/releases/*/ | while read -r d; do [[ "$(readlink -f "$d")" != "$CUR" ]] && { echo "${d%/}"; break; }; done)"
[[ -n ${PREV:-} ]] || { echo "no other release to go back to" >&2; exit 1; }
echo "current: $CUR"; echo "going back to: $PREV"
read -r -p "Roll back? [y/N] " a; [[ $a == y || $a == Y ]] || exit 1
ln -sfn "$PREV" "$BASE/current.new"; mv -Tf "$BASE/current.new" "$BASE/current"
systemctl restart scenestudio.service
for _ in $(seq 1 30); do [[ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' http://127.0.0.1:3190/ || true)" == 200 ]] && { echo "OK: rolled back"; exit 0; }; sleep 1; done
echo "the rolled-back release did not answer 200: journalctl -u scenestudio -n 50" >&2; exit 1
