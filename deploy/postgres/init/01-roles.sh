#!/bin/sh
# Runs once on first start of an empty data volume. Creates the two least-privilege roles and
# hands the database to `migrator` (DDL). `app_rw` gets its table grants from migration 0003.
set -eu
: "${APP_RW_PASSWORD:?APP_RW_PASSWORD is required}"
: "${MIGRATOR_PASSWORD:?MIGRATOR_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE migrator LOGIN PASSWORD '${MIGRATOR_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE app_rw LOGIN PASSWORD '${APP_RW_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE "${POSTGRES_DB}" OWNER TO migrator;
REVOKE CONNECT ON DATABASE "${POSTGRES_DB}" FROM PUBLIC;
GRANT CONNECT ON DATABASE "${POSTGRES_DB}" TO app_rw;
SQL
