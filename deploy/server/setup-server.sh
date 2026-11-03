#!/usr/bin/env bash
# Scene Studio: one-time, step-by-step server setup. Run as root, one phase at a time:
#   setup-server.sh base | http | tls | https | owner | hsts | status
# Every phase is idempotent, says what it will change and asks y/N first.
#
# THE RULE: this script touches ONLY what is ours:
#   /opt/scenestudio, the system user "scenestudio", the PostgreSQL cluster "scenestudio" (port 5442, own data dir, own systemd unit),
#   the units scenestudio.service / scenestudio-backup.{service,timer} and one drop-in for our own postgres unit,
#   the nginx files conf.d/scenestudio-limits.conf, snippets/scenestudio-proxy.conf, sites-available/scenestudio (+ its symlink),
#   /var/www/scenestudio-acme and the certificate for our own two domains.
# It never restarts or edits anything else (nginx is only RELOADED, after `nginx -t` passes and after a backup of /etc/nginx).
# It does not touch ufw/iptables, cron, docker, other databases or other projects.
set -euo pipefail

BASE=/opt/scenestudio
APP_USER=scenestudio
APP_PORT=3190
PG_VER=16
PG_CLUSTER=scenestudio
PG_PORT=5442
WWW=www.scenestudio.ir
APEX=scenestudio.ir
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

die() { echo "ERROR: $*" >&2; exit 1; }
note() { printf '\n== %s\n' "$*"; }
confirm() { local a; read -r -p "$1 [y/N] " a; [[ "$a" == y || "$a" == Y ]] || { echo "Stopped. Nothing further was changed."; exit 1; }; }
need_root() { [[ $EUID -eq 0 ]] || die "run as root"; }
port_free() { ! ss -tln 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$1$"; }
rand() { openssl rand -hex "$1"; }
others_ok() {
  note "Other projects (must stay active)"
  for u in nginx avina-shop liateam-dashboard liateam-messenger liateam-orders liateam-worker libbot postgresql@16-main; do
    printf '%-28s %s\n' "$u" "$(systemctl is-active "$u" 2>/dev/null || echo n/a)"
  done
}

phase_base() {
  note "PHASE base: user, folders, our own PostgreSQL cluster, our units. Nothing public yet."
  port_free "$APP_PORT" || die "port $APP_PORT is busy"
  if ! pg_lsclusters | awk '{print $1" "$2}' | grep -q "^$PG_VER $PG_CLUSTER$"; then port_free "$PG_PORT" || die "port $PG_PORT is busy"; fi
  cat <<EOF
It will:
  1. create the system user '$APP_USER' (no login) and the folders in $BASE (releases, data/uploads, backups, env, bin)
  2. create the PostgreSQL $PG_VER cluster '$PG_CLUSTER' on 127.0.0.1:$PG_PORT (own data dir, own unit, 128 MB buffers, max 30 connections,
     memory capped by systemd). The existing cluster '$PG_VER/main' is NOT touched.
  3. create the roles migrator and app_rw (random passwords, kept only in $BASE/env, root-only) and the database 'scenestudio'
  4. install scenestudio.service, the backup service/timer and the postgres memory drop-in (enabled, not started yet)
EOF
  confirm "Go ahead?"

  id "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$BASE" --shell /usr/sbin/nologin "$APP_USER"
  install -d -m 755 "$BASE" "$BASE/releases" "$BASE/bin"
  install -d -m 755 -o "$APP_USER" -g "$APP_USER" "$BASE/data" "$BASE/data/uploads"
  install -d -m 700 "$BASE/backups" "$BASE/env"
  for f in release.sh rollback.sh backup.sh restore-test.sh setup-server.sh; do install -m 750 "$SRC/$f" "$BASE/bin/$f"; done

  # secrets: created once, never printed
  if [[ ! -f $BASE/env/scenestudio.env ]]; then
    local pg_mig pg_app
    pg_mig="$(rand 24)"; pg_app="$(rand 24)"
    local old_umask; old_umask="$(umask)"; umask 077   # restored right after the secret files, so nothing else we write becomes unreadable
    cat > "$BASE/env/scenestudio.env" <<EOF
NODE_ENV=production
PORT=$APP_PORT
HOSTNAME=127.0.0.1
NEXT_TELEMETRY_DISABLED=1
SITE_URL=https://$WWW
DATABASE_URL=postgres://app_rw:$pg_app@127.0.0.1:$PG_PORT/scenestudio
SESSION_SECRET=$(rand 32)
UPLOADS_DIR=$BASE/data/uploads
TRUST_PROXY=true
LOGIN_RATE_LIMIT_PER_MIN=20
EOF
    cat > "$BASE/env/migrator.env" <<EOF
MIGRATOR_DATABASE_URL=postgres://migrator:$pg_mig@127.0.0.1:$PG_PORT/scenestudio
EOF
    chmod 600 "$BASE/env/scenestudio.env" "$BASE/env/migrator.env"
    umask "$old_umask"
    echo "secrets written to $BASE/env (root only, not shown)"
  else
    echo "env files exist: kept"
  fi
  # shellcheck disable=SC1091
  local pg_app_pw pg_mig_pw
  pg_app_pw="$(sed -n 's#^DATABASE_URL=postgres://app_rw:\([^@]*\)@.*#\1#p' "$BASE/env/scenestudio.env")"
  pg_mig_pw="$(sed -n 's#^MIGRATOR_DATABASE_URL=postgres://migrator:\([^@]*\)@.*#\1#p' "$BASE/env/migrator.env")"
  [[ -n $pg_app_pw && -n $pg_mig_pw ]] || die "could not read the database passwords from the env files"

  if ! pg_lsclusters | awk '{print $1" "$2}' | grep -q "^$PG_VER $PG_CLUSTER$"; then
    pg_createcluster "$PG_VER" "$PG_CLUSTER" --port "$PG_PORT" -- --auth-local=peer --auth-host=scram-sha-256
  fi
  install -d -m 755 "/etc/postgresql/$PG_VER/$PG_CLUSTER/conf.d"
  cat > "/etc/postgresql/$PG_VER/$PG_CLUSTER/conf.d/10-scenestudio.conf" <<EOF
listen_addresses = '127.0.0.1'
port = $PG_PORT
max_connections = 30
shared_buffers = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 512MB
password_encryption = 'scram-sha-256'
log_min_duration_statement = 1000
EOF
  chmod 644 "/etc/postgresql/$PG_VER/$PG_CLUSTER/conf.d/10-scenestudio.conf"   # postgres must be able to read it
  install -D -m 644 "$SRC/postgresql-limits.conf" "/etc/systemd/system/postgresql@$PG_VER-$PG_CLUSTER.service.d/limits.conf"
  install -m 644 "$SRC/scenestudio.service" /etc/systemd/system/scenestudio.service
  install -m 644 "$SRC/scenestudio-backup.service" /etc/systemd/system/scenestudio-backup.service
  install -m 644 "$SRC/scenestudio-backup.timer" /etc/systemd/system/scenestudio-backup.timer
  systemctl daemon-reload
  systemctl restart "postgresql@$PG_VER-$PG_CLUSTER"   # our own unit (applies the limits and conf.d)
  for _ in $(seq 1 20); do runuser -u postgres -- pg_isready -p "$PG_PORT" -q && break; sleep 1; done
  runuser -u postgres -- pg_isready -p "$PG_PORT" -q || die "the new cluster did not come up (see: journalctl -u postgresql@$PG_VER-$PG_CLUSTER)"

  # roles + database; passwords go through stdin, not through the command line
  runuser -u postgres -- psql -p "$PG_PORT" -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migrator') THEN CREATE ROLE migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN CREATE ROLE app_rw LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE; END IF;
END \$\$;
ALTER ROLE migrator PASSWORD '$pg_mig_pw';
ALTER ROLE app_rw PASSWORD '$pg_app_pw';
SELECT 'CREATE DATABASE scenestudio OWNER migrator' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'scenestudio')\gexec
REVOKE ALL ON DATABASE scenestudio FROM PUBLIC;
GRANT CONNECT ON DATABASE scenestudio TO app_rw;
SQL
  systemctl enable scenestudio.service scenestudio-backup.timer >/dev/null 2>&1
  systemctl start scenestudio-backup.timer
  echo "base is ready. Next: send the first release (RUNBOOK), then: setup-server.sh http"
  others_ok
}

backup_nginx() { tar -C / -czf "$BASE/backups/nginx-before-$STAMP.tar.gz" etc/nginx; echo "nginx config backed up: $BASE/backups/nginx-before-$STAMP.tar.gz"; }
nginx_reload_safe() {
  if nginx -t 2>&1; then systemctl reload nginx; else
    echo "nginx -t FAILED: removing our files, nothing was reloaded"
    rm -f /etc/nginx/sites-enabled/scenestudio /etc/nginx/sites-available/scenestudio /etc/nginx/conf.d/scenestudio-limits.conf /etc/nginx/snippets/scenestudio-proxy.conf /etc/nginx/snippets/scenestudio-realip.conf
    nginx -t 2>&1 | tail -1; die "reverted"
  fi
}

phase_http() {
  note "PHASE http: port-80 vhost for $WWW and $APEX (ACME challenge + a redirect to https). Other vhosts are not edited."
  [[ -d /etc/nginx ]] || die "nginx not found"
  cat <<EOF
It will add (new files only): /etc/nginx/conf.d/scenestudio-limits.conf, /etc/nginx/sites-available/scenestudio (+ symlink),
/var/www/scenestudio-acme. It backs up /etc/nginx first, runs nginx -t, and only RELOADS nginx (no restart).
EOF
  confirm "Go ahead?"
  backup_nginx
  install -d -m 755 /var/www/scenestudio-acme
  install -m 644 "$SRC/nginx/scenestudio-limits.conf" /etc/nginx/conf.d/scenestudio-limits.conf
  install -m 644 "$SRC/nginx/scenestudio-http.conf" /etc/nginx/sites-available/scenestudio
  ln -sfn /etc/nginx/sites-available/scenestudio /etc/nginx/sites-enabled/scenestudio
  nginx_reload_safe
  echo "port 80 is serving our ACME folder. Make sure DNS for $WWW and $APEX points to this server, then: setup-server.sh tls"
  others_ok
}

phase_tls() {
  note "PHASE tls: Let's Encrypt certificate for $WWW and $APEX (webroot, auto-renewed by the existing certbot.timer)"
  command -v certbot >/dev/null || die "certbot is not installed"
  echo "token" > /var/www/scenestudio-acme/ss-ping.txt
  for d in "$WWW" "$APEX"; do
    local got; got="$(curl -s -m 8 "http://$d/ss-ping.txt" || true)"
    [[ "$got" == token ]] || { rm -f /var/www/scenestudio-acme/ss-ping.txt; die "http://$d/ does not reach THIS nginx yet: fix the DNS A record first (it must point to this server), wait, run again"; }
  done
  rm -f /var/www/scenestudio-acme/ss-ping.txt
  echo "DNS reaches this server for both names."
  read -r -p "E-mail for certificate expiry notices (empty = none): " mail
  confirm "Request the certificate now?"
  local mailopt=(--register-unsafely-without-email); [[ -n $mail ]] && mailopt=(-m "$mail")
  certbot certonly --webroot -w /var/www/scenestudio-acme -d "$WWW" -d "$APEX" --cert-name "$WWW" --non-interactive --agree-tos "${mailopt[@]}" \
    --deploy-hook "systemctl reload nginx"
  echo "certificate ready. Next: setup-server.sh https"
}

phase_https() {
  note "PHASE https: the full vhost (proxy to 127.0.0.1:$APP_PORT, /uploads from disk, gzip, security headers, rate limits)"
  [[ -f /etc/letsencrypt/live/$WWW/fullchain.pem ]] || die "no certificate yet: run the tls phase first"
  [[ -L $BASE/current ]] || die "no release deployed yet (send the first release first)"
  confirm "Replace our port-80 vhost with the full one (backup + nginx -t + reload)?"
  backup_nginx
  # ArvanCloud sits in front: trust X-Forwarded-For ONLY from its published ranges, so rate limits and the lead IP hash see the visitor, not the CDN
  local ips; ips="$(curl -fsS -m 15 https://www.arvancloud.ir/en/ips.txt | tr -d '\r' | grep -E '^[0-9a-fA-F:.]+/[0-9]+$' || true)"
  [[ $(printf '%s\n' "$ips" | grep -c .) -ge 5 ]] || die "could not read ArvanCloud's IP list (https://www.arvancloud.ir/en/ips.txt): not changing nginx"
  install -d -m 755 /etc/nginx/snippets
  { echo "# generated by setup-server.sh ($STAMP) from https://www.arvancloud.ir/en/ips.txt; direct visitors are unaffected (only these ranges are trusted)"
    printf 'set_real_ip_from %s;\n' $ips
    echo "real_ip_header X-Forwarded-For;"; echo "real_ip_recursive on;"; } > /etc/nginx/snippets/scenestudio-realip.conf
  install -d -m 755 /etc/nginx/snippets
  install -m 644 "$SRC/nginx/scenestudio-proxy.conf" /etc/nginx/snippets/scenestudio-proxy.conf
  install -m 644 "$SRC/nginx/scenestudio-https.conf" /etc/nginx/sites-available/scenestudio
  nginx_reload_safe
  echo "check:  curl -sI https://$WWW/ | head -5"
  others_ok
}

phase_hsts() {
  note "PHASE hsts: Strict-Transport-Security for $WWW only (1 year, no includeSubDomains, no preload). Do this only after https works."
  curl -fsS -m 10 -o /dev/null "https://$WWW/" || die "https://$WWW/ does not answer: not enabling HSTS"
  confirm "Enable HSTS?"
  backup_nginx
  sed -i 's|^\(\s*\)# HSTS_PLACEHOLDER.*|\1add_header Strict-Transport-Security "max-age=31536000" always;|' /etc/nginx/sites-available/scenestudio
  grep -q 'Strict-Transport-Security' /etc/nginx/sites-available/scenestudio || die "placeholder not found in the vhost"
  nginx_reload_safe
  echo "HSTS on."
}

phase_owner() {
  note "PHASE owner: first admin + site settings + the four real services. The password is generated here and written to a root-only file."
  [[ -L $BASE/current ]] || die "no release deployed yet"
  read -r -p "Owner e-mail (login name; it is not printed anywhere else): " OWNER_EMAIL
  [[ $OWNER_EMAIL == *@*.* ]] || die "that does not look like an e-mail"
  confirm "Create the owner and seed the settings/services?"
  OWNER_PASSWORD="$(rand 12)"
  export OWNER_EMAIL OWNER_PASSWORD
  (
    set -a; . "$BASE/env/migrator.env"; set +a
    cd "$BASE/current"
    node tools/seed-owner.mjs
    node tools/seed-settings.mjs
    node tools/seed-services.mjs
  )
  umask 077
  printf 'email: %s\npassword: %s\n' "$OWNER_EMAIL" "$OWNER_PASSWORD" > "$BASE/env/owner-initial.txt"
  unset OWNER_PASSWORD
  echo "Initial login saved in $BASE/env/owner-initial.txt (root only)."
  echo "Read it once (cat), log in at https://$WWW/admin/login, CHANGE THE PASSWORD, then delete the file (shred -u)."
  echo "Do not paste the password anywhere."
}

phase_status() {
  note "Scene Studio"
  for u in scenestudio postgresql@$PG_VER-$PG_CLUSTER scenestudio-backup.timer; do printf '%-34s %s\n' "$u" "$(systemctl is-active "$u" 2>/dev/null || echo n/a)"; done
  [[ -L $BASE/current ]] && echo "current release: $(readlink -f "$BASE/current")"
  curl -s -o /dev/null -m 6 -w "app  http://127.0.0.1:$APP_PORT/  -> %{http_code}\n" "http://127.0.0.1:$APP_PORT/" || true
  curl -s -o /dev/null -m 8 -w "site https://$WWW/  -> %{http_code}\n" "https://$WWW/" || true
  others_ok
}

need_root
case "${1:-}" in
  base) phase_base ;;
  http) phase_http ;;
  tls) phase_tls ;;
  https) phase_https ;;
  hsts) phase_hsts ;;
  owner) phase_owner ;;
  status) phase_status ;;
  *) echo "usage: $0 base | http | tls | https | owner | hsts | status"; exit 2 ;;
esac
