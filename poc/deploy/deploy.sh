#!/usr/bin/env bash
# Run LOCALLY:  make deploy VM=user@ip   (or ./poc/deploy/deploy.sh user@ip from the repo root)
# Copies the repo (+ poc/.env) to the VM and starts the Docker stack behind Caddy HTTPS.
set -euo pipefail
TARGET="${1:?usage: deploy.sh user@ip}"
cd "$(dirname "$0")/../.."

ssh "$TARGET" 'mkdir -p ~/supplyguard'
rsync -az --delete --exclude .git --exclude .venv --exclude node_modules --exclude web/dist --exclude .cache \
  --exclude __pycache__ --exclude poc/data/web_raw --exclude UI_first_draft ./ "$TARGET:~/supplyguard/"
ssh "$TARGET" 'bash ~/supplyguard/poc/deploy/setup_vm.sh'
