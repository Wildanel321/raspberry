#!/bin/bash

# PiControl Uninstaller
# Safe cleanup script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0;0m'

echo -e "${RED}==================================================${NC}"
echo -e "${RED}           PiControl Cleanup & Uninstaller        ${NC}"
echo -e "${RED}==================================================${NC}"

# 1. Stop and disable service
if systemctl is-active --quiet picontrol.service; then
  echo "Stopping PiControl service..."
  sudo systemctl stop picontrol.service
fi

if systemctl is-enabled --quiet picontrol.service; then
  echo "Disabling PiControl service..."
  sudo systemctl disable picontrol.service
fi

# Remove systemd files
echo "Deleting systemd configuration..."
sudo rm -f /etc/systemd/system/picontrol.service
sudo systemctl daemon-reload

# 2. Remove sudoers configurations
echo "Removing sudoers access..."
sudo rm -f /etc/sudoers.d/picontrol

# 3. Ask to remove database data
read -p "Do you want to delete the configuration database and audit logs in /opt/picontrol? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Removing all files in /opt/picontrol..."
  sudo rm -rf /opt/picontrol
else
  echo "Retaining settings database. Deleting codebase files only..."
  sudo rm -rf /opt/picontrol/backend/dist
  sudo rm -rf /opt/picontrol/frontend
fi

# 4. Remove system user optionally
read -p "Do you want to delete the system user 'picontrol'? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Deleting user picontrol..."
  sudo userdel picontrol || true
fi

echo -e "${GREEN}PiControl has been successfully uninstalled from this system.${NC}"
EOF
