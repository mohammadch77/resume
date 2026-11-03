#!/usr/bin/env bash
# READ-ONLY survey of a server before deploying (phase 8, step 1). It changes nothing: no writes outside stdout, no restart, no docker
# create/remove, no firewall change. It prints no secrets: no env files, no key files, no `docker inspect`, no config bodies (only the
# server_name / listen / upstream lines of proxy configs and the names of certificates).
# Run:  bash server-audit.sh 2>&1 | tee /tmp/scenestudio-audit.txt      (use sudo if you can; some sections need root and say so)
set -u
sec() { printf '\n===== %s =====\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

sec "OS / kernel / time"
(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"); uname -srm
have timedatectl && timedatectl 2>/dev/null | grep -E "Time zone|NTP|synchronized" || date
echo "user: $(id -un) (uid $(id -u)); sudo without password: $(sudo -n true 2>/dev/null && echo yes || echo no)"

sec "CPU / RAM / swap / load"
echo "cpus: $(nproc 2>/dev/null)"; free -m 2>/dev/null; uptime

sec "Disk"
df -h -x tmpfs -x devtmpfs -x overlay 2>/dev/null
have docker && (docker system df 2>/dev/null | head -8 || echo "docker system df: needs docker access")

sec "Docker"
if have docker; then
  docker --version; docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo "no compose"
  echo "--- running containers (name / image / status / ports)"; docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1 | head -60
  echo "--- compose projects"; docker compose ls 2>/dev/null | head -30
  echo "--- networks (names)"; docker network ls --format '{{.Name}}\t{{.Driver}}' 2>&1 | head -40
  echo "--- volumes (names only)"; docker volume ls --format '{{.Name}}' 2>&1 | head -60
  echo "--- daemon: storage driver, cgroup, data root"; docker info --format '{{.Driver}} | cgroup {{.CgroupVersion}} | root {{.DockerRootDir}} | mem {{.MemTotal}}' 2>&1
else
  echo "docker: NOT INSTALLED"
fi

sec "Listening ports (who owns 80, 443 and the 31xx range)"
(ss -tlnp 2>/dev/null || ss -tln) | head -50
echo "--- is 127.0.0.1:3190-3199 free? (we need one free port)"; for p in 3190 3191 3192 3193 3194 3195; do ss -tln 2>/dev/null | grep -q ":$p " && echo "$p busy" || echo "$p free"; done

sec "Reverse proxy on 80/443"
for s in nginx caddy traefik apache2 httpd haproxy; do systemctl is-active "$s" 2>/dev/null | sed "s/^/$s (systemd): /"; done
if have nginx; then
  nginx -v 2>&1
  echo "--- nginx vhosts: server_name / listen / proxy_pass / cert path lines only"
  grep -RhsE '^\s*(server_name|listen|proxy_pass|ssl_certificate |include /etc/nginx/(sites|conf)[^;]*;)' /etc/nginx/nginx.conf /etc/nginx/conf.d /etc/nginx/sites-enabled 2>/dev/null | sed 's/^\s*//' | sort | uniq -c | sort -rn | head -60
  echo "--- brotli module present?"; (nginx -V 2>&1 | grep -qi brotli && echo yes) || ls /etc/nginx/modules-enabled 2>/dev/null | grep -i brotli || echo "no"
  echo "--- conf test (read-only)"; nginx -t 2>&1 | head -3
fi
have caddy && (echo "--- caddy"; caddy version; grep -hsE '^[^ #{}][^{]*\{' /etc/caddy/Caddyfile 2>/dev/null | head -30)
docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -iE 'nginx|caddy|traefik|proxy' | sed 's/^/proxy container: /'

sec "TLS / certbot"
have certbot && (certbot --version 2>&1; certbot certificates 2>&1 | grep -E 'Certificate Name|Domains|Expiry' | head -30) || echo "certbot: not installed (or needs root)"
ls /etc/letsencrypt/live 2>/dev/null | head -20
systemctl list-timers 2>/dev/null | grep -iE 'certbot|acme' || echo "no certbot/acme systemd timer (cron may be used)"
have acme.sh && echo "acme.sh present"

sec "Outbound access (needed to build on the server)"
for u in https://registry.npmjs.org/ https://registry-1.docker.io/v2/ https://github.com https://deb.debian.org https://dl-cdn.alpinelinux.org/alpine/ https://acme-v02.api.letsencrypt.org/directory; do
  printf '%s -> ' "$u"; curl -s -o /dev/null -m 8 -w '%{http_code} in %{time_total}s\n' "$u" || echo "FAILED"
done
echo "--- DNS: www.scenestudio.ir / scenestudio.ir"; getent hosts www.scenestudio.ir scenestudio.ir || echo "no A record resolves from here"
echo "--- this server's public IP (compare with the A record)"; curl -s -m 6 https://api.ipify.org || echo "(no answer)"; echo

sec "Firewall (READ ONLY)"
have ufw && ufw status 2>&1 | head -20
have nft && (nft list ruleset 2>&1 | grep -cE 'dport|accept|drop' | sed 's/^/nft rule lines: /')
have iptables && (iptables -S 2>&1 | head -25)
have firewall-cmd && firewall-cmd --list-all 2>&1 | head -15

sec "Tools we may use"
for t in git curl rsync tar gzip pg_dump python3 node; do printf '%s: ' "$t"; command -v "$t" || echo "-"; done
echo "--- cron (names only, no contents)"; ls /etc/cron.d /etc/cron.daily 2>/dev/null | head -20
echo "--- existing project folders (names only)"; ls -1 /opt /srv /home 2>/dev/null | head -40
echo "--- is /opt/scenestudio already there?"; ls -ld /opt/scenestudio 2>&1

sec "done (nothing was changed)"
