#!/bin/bash
# 소스 변경 후 백엔드/프론트엔드 컨테이너를 강제로 재빌드 및 재시작하는 자동화 스크립트
# 2026-02-01: Nginx 재시작 추가 (DNS 캐시 불일치로 인한 502 에러 방지)

set -e

echo "[INFO] 도커 전체 강제 재빌드 및 재시작 시작..."
docker compose build --no-cache

echo "[INFO] 도커 서비스 재시작..."
docker compose up -d

echo "[INFO] 백엔드 헬스체크 대기 (5초)..."
sleep 5

echo "[INFO] Nginx 재시작 (DNS 캐시 초기화)..."
docker restart xmas-nginx

echo "[INFO] Nginx 시작 대기 (3초)..."
sleep 3

echo "[INFO] 헬스체크 검증..."
if curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/v2/health | grep -q "200"; then
    echo "[SUCCESS] 백엔드 헬스체크 통과!"
else
    echo "[WARNING] 백엔드 헬스체크 실패 - 로그를 확인하세요: docker compose logs backend"
fi

echo "[INFO] 모든 서비스가 최신 소스로 재시작되었습니다."
