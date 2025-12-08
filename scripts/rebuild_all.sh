#!/bin/bash
# 소스 변경 후 백엔드/프론트엔드 컨테이너를 강제로 재빌드 및 재시작하는 자동화 스크립트

set -e

echo "[INFO] 도커 전체 강제 재빌드 및 재시작 시작..."
docker compose build --no-cache

echo "[INFO] 도커 서비스 재시작..."
docker compose up -d

echo "[INFO] 모든 서비스가 최신 소스로 재시작되었습니다."
