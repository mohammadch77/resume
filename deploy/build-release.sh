#!/usr/bin/env bash
# Run on the LAPTOP (needs Docker Desktop): builds the release tarball for the server and writes ./scenestudio-release.tar.gz.
# Then send it with:   scp scenestudio-release.tar.gz root@<server>:/tmp/    and on the server:   /opt/scenestudio/bin/release.sh /tmp/scenestudio-release.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."
docker build -f deploy/Dockerfile.release --target out --output type=local,dest=. .
ls -lh scenestudio-release.tar.gz
