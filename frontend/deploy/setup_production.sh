#!/usr/bin/env bash
set -euo pipefail

# =========================
# CONFIG
# =========================
DOMAIN="Winza-linera.xyz"
EMAIL="egor4042007@gmail.com"
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"
BUILD_DIR="$WORK_DIR/build"

# =========================
# INSTALL SYSTEM PACKAGES
# =========================
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg ufw nodejs nginx certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# =========================
# UFW FIREWALL
# =========================
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw --force enable

# =========================
# INSTALL DEPENDENCIES
# =========================
cd "$WORK_DIR"
npm ci

cd "$WORK_DIR/orchestrator"
npm ci
cd "$WORK_DIR"


# =========================
# BUILD FRONTEND
# =========================
echo ">>> Building frontend"
cd "$WORK_DIR"
export VITE_POCKETBASE_URL="https://$DOMAIN/pb"
npm run build

sudo mkdir -p /var/www/$DOMAIN
sudo rm -rf /var/www/$DOMAIN/*
sudo cp -r "$WORK_DIR/dist/"* /var/www/$DOMAIN/

# =========================
# NGINX CONFIG
# =========================
sudo cp "$WORK_DIR/deploy/nginx-site-template.conf" "/etc/nginx/sites-available/$DOMAIN"
sudo sed -i "s|__DOMAIN__|$DOMAIN|g" "/etc/nginx/sites-available/$DOMAIN"

sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
sudo nginx -t
sudo systemctl reload nginx

# =========================
# LET'S ENCRYPT SSL
# =========================
sudo certbot --nginx -n --agree-tos -m "$EMAIL" -d "$DOMAIN" --redirect

# Fix SSL config to preserve all headers
sudo cp "$WORK_DIR/deploy/nginx-site-template.conf" "/etc/nginx/sites-available/$DOMAIN"
sudo sed -i "s|__DOMAIN__|$DOMAIN|g" "/etc/nginx/sites-available/$DOMAIN"

sudo nginx -t
sudo systemctl reload nginx

# =========================
# SYSTEMD SERVICES
# =========================
# Orchestrator
sudo bash -c "cat > /etc/systemd/system/Winza-orchestrator.service <<EOF
[Unit]
Description=Winza Linera Orchestrator
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node orchestrator.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Lottery Orchestrator
sudo bash -c "cat > /etc/systemd/system/Winza-lottery-orchestrator.service <<EOF
[Unit]
Description=Winza Lottery Orchestrator
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node lottery-orchestrator.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Supabase Sync
  sudo bash -c "cat > /etc/systemd/system/Winza-sync.service <<EOF
[Unit]
Description=Winza Supabase Sync Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node supabase-sync.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Lottery Sync
  sudo bash -c "cat > /etc/systemd/system/Winza-lottery-sync.service <<EOF
[Unit]
Description=Winza Lottery Sync Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node lottery-supabase-sync.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Leaderboard PocketBase Sync
sudo bash -c "cat > /etc/systemd/system/Winza-leaderboard-sync.service <<EOF
[Unit]
Description=Winza Leaderboard PocketBase Sync
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node leaderboard-pb-sync.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Lottery Bot tickets purchaser
sudo bash -c "cat > /etc/systemd/system/Winza-lottery-bot.service <<EOF
[Unit]
Description=Winza Lottery Bot Buyer
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node bot-buy-tickets2.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable --now Winza-orchestrator.service Winza-sync.service Winza-lottery-orchestrator.service Winza-lottery-sync.service Winza-leaderboard-sync.service Winza-lottery-bot.service

echo "====================================="
echo " Deployment completed successfully!  "
echo " Visit: https://$DOMAIN/"
echo "====================================="
