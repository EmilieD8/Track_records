#!/usr/bin/env bash
# Runs ON the Nebius VM (Ubuntu 24.04): installs Docker + Caddy, starts the stack, HTTPS on <ip>.sslip.io
set -euo pipefail
cd "$HOME/supplyguard"
[ -f poc/.env ] || { echo "Missing poc/.env"; exit 1; }

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi
sudo docker compose up -d --build

if ! command -v caddy >/dev/null; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -y && sudo apt-get install -y caddy
fi
HOST="$(curl -s https://api.ipify.org | tr . -).sslip.io"
sudo tee /etc/caddy/Caddyfile >/dev/null <<CADDY
$HOST {
    reverse_proxy 127.0.0.1:8090 {
        flush_interval -1
    }
}
CADDY
sudo systemctl restart caddy
echo "SupplyGuard: https://$HOST   (logs: sudo docker compose -f ~/supplyguard/docker-compose.yml logs -f)"
