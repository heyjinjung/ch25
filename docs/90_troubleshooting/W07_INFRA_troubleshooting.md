# [INFRA] 트러블슈팅 가이드

**작성일:** 2026-02-12
**우선순위:** P1

## 증상 정의 (필수)
| 항목 | 내용 |
|---|---|
| 대상 기능 | CI/CD 배포 파이프라인 |
| HTTP Status | N/A (Process Exit) |
| 영향 범위 | 전체 배포 실패 |
| 재현 빈도 | 간헐적/항상 (리소스 부족 시) |

## 증상
- 배포 스크립트 실행 중 `Process exited with status 137` 발생.
- 주로 `npm run build` 이후 또는 컨테이너(`xmas-backend`, `xmas-celery-worker`) 시작 직후 발생.
- 로그 예시:
```
out: [MIGRATION] Running alembic upgrade head...
out: 20260215_0900 (head)
2026/02/12 09:52:33 Process exited with status 137
```

## 근본 원인 (증거 기반)
- **Exit Code 137**: Linux OOM Killer가 프로세스를 강제 종료시킴 (Out Of Memory).
- **Frontend Build**: `npm run build`는 Node.js 힙 메모리를 많이 사용함.
- **Micro VPS**: 1GB/2GB RAM 인스턴스에서 백엔드, 프론트엔드, DB, Celery 등을 동시에 띄우거나 빌드할 경우 메모리 부족 발생.

## 해결 방법
### Immediate Fix
1. **Docker System Prune**: 불필요한 이미지/컨테이너 정리로 디스크 및 캐시 공간 확보.
   ```bash
   docker system prune -a --volumes -f
   ```
2. **Swap 파일 생성**: 메모리 부족 시 디스크를 사용하도록 스왑 설정 (2GB 권장).
   ```bash
   # 스왑 파일 생성 확인
   free -h
   # 스왑이 없다면:
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

### Long-term Fix
- **빌드 서버 분리**: 무거운 `npm run build` 작업을 배포 서버가 아닌 CI 워커(GitHub Actions 등)에서 수행하고, 결과물(image/artifact)만 배포 서버로 전송.
- **인스턴스 스케일 업**: 배포 서버의 RAM 용량 증설.

## 검증 방법
- `docker stats` 명령어로 컨테이너 메모리 사용량 모니터링.
- `free -h`로 배포 중 여유 메모리 확인.

## 관련 문서 (SoT/learned)
- [Docker Exit Code 137](https://docs.docker.com/engine/reference/run/#exit-status)
