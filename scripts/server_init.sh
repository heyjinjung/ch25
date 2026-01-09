#!/bin/bash
set -e

echo "🚀 [1/6] 시스템 패키지 업데이트 및 필수 도구 설치..."
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y
apt-get install -y curl vim git ufw fail2ban htop

echo "🛡️ [2/6] 보안 설정: 방화벽 활성화 (SSH 22번 유지)..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "🐳 [3/6] Docker 및 Docker Compose 설치..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com/ | sh
fi

# 로그 컨테이너 제한 설정
mkdir -p /etc/docker
cat <<EOF > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

echo "📊 [4/6] 성능 최적화: Swap 메모리 4GB 생성..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

echo "🚀 [5/6] 네트워크 최적화: Google BBR 알고리즘 활성화..."
if ! grep -q "net.core.default_qdisc=fq" /etc/sysctl.conf; then
    echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
    echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
    sysctl -p
fi

echo "✅ [6/6] 모든 설정이 완료되었습니다!"
echo "----------------------------------------------------"
echo "시스템 사양: $(nproc) vCPUs, $(free -h | grep Mem | awk '{print $2}') RAM"
echo "상태: Docker 설치됨, 방화벽 활성화됨, Swap 4G 적용됨"
echo "----------------------------------------------------"
echo "안전한 적용을 위해 시스템을 재시작해 주세요 (명령어: reboot)"
