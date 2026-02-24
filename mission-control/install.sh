#!/bin/bash
set -e

echo "Installing Mission Control..."

# Install dependencies
npm install

# Create data directory
mkdir -p data

# Copy systemd service
cp mission-control.service /etc/systemd/system/

# Enable and start
systemctl daemon-reload
systemctl enable mission-control
systemctl start mission-control

echo "Mission Control installed on port 3456"
echo "View logs: journalctl -u mission-control -f"
