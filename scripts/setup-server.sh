#!/bin/bash
export DEBIAN_FRONTEND=noninteractive

echo "=================================================="
echo "🛠 Preparing Server Environment & Installing Docker..."
echo "=================================================="

# 1. Ensure UFW and iptables allow incoming traffic on HTTP (port 80) and SSH (port 22)
echo "🔓 Ensuring UFW firewall and iptables allow HTTP and SSH..."
ufw allow 80/tcp || true
ufw allow 22/tcp || true
ufw allow 4000/tcp || true
ufw allow 3000/tcp || true
iptables -I INPUT -p tcp --dport 80 -j ACCEPT || true
iptables -I INPUT -p tcp --dport 4000 -j ACCEPT || true
iptables -I INPUT -p tcp --dport 3000 -j ACCEPT || true

# 2. Update package lists
apt-get update -y -qq

# 3. Check & Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed successfully!"
else
    echo "✅ Docker is already installed."
fi

# 4. Check & Install Docker Compose
if ! docker compose version &> /dev/null; then
    echo "🐳 Installing Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin
    echo "✅ Docker Compose plugin installed!"
else
    echo "✅ Docker Compose is ready."
fi

echo "=================================================="
echo "🎉 Server Environment Ready!"
echo "=================================================="
