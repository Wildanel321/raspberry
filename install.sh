#!/bin/bash

# PiControl Automated Installer
# Supported OS: Raspberry Pi OS / Debian-based Linux

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0;0m'

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}   PiControl Dashboard Installer - Raspberry Pi  ${NC}"
echo -e "${GREEN}==================================================${NC}"

# 1. Detect Linux OS
if [ ! -f /etc/debian_version ]; then
  echo -e "${RED}Error: This application requires a Debian-based Linux distribution.${NC}"
  exit 1
fi

# 2. Check for NodeJS
if ! command -v node &> /dev/null; then
  echo "Installing Node.js and packages dependencies..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs build-essential
else
  echo -e "Node.js detected: $(node -v)"
fi

# 3. Compile Backend
echo "Building backend..."
cd backend
npm install
npm run build
cd ..

# 4. Compile Frontend static export
echo "Building frontend static assets..."
cd frontend
npm install
npm run build
cd ..

# 5. Create dedicated system user
if ! id "picontrol" &>/dev/null; then
  echo "Creating system user picontrol..."
  sudo useradd -r -s /bin/false picontrol
fi

# Add user to hardware groups
sudo usermod -aG gpio,dialout picontrol || true

# 6. Copy build directory to /opt/picontrol
echo "Deploying applications folders to /opt/picontrol..."
sudo mkdir -p /opt/picontrol
sudo cp -r backend /opt/picontrol/
sudo cp -r frontend /opt/picontrol/
sudo cp picontrol.service /opt/picontrol/

# 6.5 Rebuild native dependencies for Linux ARM64
echo "Rebuilding native dependencies for Raspberry Pi..."
cd /opt/picontrol/backend
sudo npm rebuild
cd - > /dev/null

# Create settings data directory and set ownership
sudo mkdir -p /opt/picontrol/backend/data
sudo chown -R picontrol:picontrol /opt/picontrol


# 7. Configure passwordless privileges delegation for systemctl & apt
echo "Configuring secure sudoers rules for picontrol..."
sudo tee /etc/sudoers.d/picontrol > /dev/null <<EOF
picontrol ALL=(ALL) NOPASSWD: /usr/bin/systemctl
picontrol ALL=(ALL) NOPASSWD: /usr/bin/apt-get
picontrol ALL=(ALL) NOPASSWD: /usr/bin/dpkg
picontrol ALL=(ALL) NOPASSWD: /usr/sbin/reboot
picontrol ALL=(ALL) NOPASSWD: /usr/sbin/shutdown
EOF
sudo chmod 0440 /etc/sudoers.d/picontrol

# 8. Register and start systemd service
echo "Registering systemd service..."
sudo cp /opt/picontrol/picontrol.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable picontrol.service
sudo systemctl start picontrol.service

# Get local IP
IP_ADDR=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}PiControl installation completed successfully!     ${NC}"
echo -e ""
echo -e "Access the Management Dashboard at:"
echo -e "http://${IP_ADDR}:3000"
echo -e ""
echo -e "Service: picontrol.service"
echo -e "Status:  Running"
echo -e "==================================================${NC}"
