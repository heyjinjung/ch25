문서 타입: 런북
버전: v1.0
작성일: 2026-01-09
작성자: BE팀 (Antigravity)
대상: BE 개발자, SRE
상태: SoT

# 🚀 Vultr Ubuntu 24.04 초기화 스크립트 실행 가이드 (v1.0)

## 1. 목적 (Purpose)
신규 서버 투입 시 보안 업데이트, Docker 설치, Swap 메모리 할당 등 필수 초기화 작업을 누락 없이 자동화하여 수행하기 위함입니다.

## 2. 범위 (Scope)
Ubuntu 24.04 LTS 운영체제를 탑재한 모든 Vultr 인스턴스의 초기 환경 설정에 적용됩니다.

## 3. 본문

### ## 1) 실행 전 주의사항
- 본 스크립트는 `root` 권한으로 실행해야 합니다.
- 실행 중 네트워크 끊김 방지를 위해 가급적 안정적인 환경에서 SSH 접속을 유지하세요.

### ## 2) 퀵 실행 명령어
```bash
# 원격 스크립트 직접 실행 (GitHub 저장소 연동 예정)
curl -sSL https://raw.githubusercontent.com/[REPO]/main/scripts/server_init.sh | sudo bash
```

### ## 3) 스크립트 주요 처리 내역
| 단계 | 작업 내용 | 상세 설명 |
| :--- | :--- | :--- |
| **Step 1** | OS 업데이트 | `apt update && apt upgrade`를 통한 보안 패치 적용 |
| **Step 2** | 보안 강화 | UFW 방화벽 활성화 (22, 80, 443 포트 오픈), Fail2Ban 설치 |
| **Step 3** | Docker 구성 | Docker 최신 버전 설치 및 컨테이너 로그 정책(Max 10MB) 설정 |
| **Step 4** | 자원 최적화 | RAM 8GB 보완을 위한 4GB Swap 공간 생성 |
| **Step 5** | 네트워크 가속 | Google BBR 커널 알고리즘 활성화 |

## 4. 운영/검증 (QA)
- **Docker 확인**: `docker info` 명령어로 로그 드라이버 정책 적용 여부 확인.
- **Swap 확인**: `free -h` 명령어로 Swap 4G 확보 여부 확인.
- **네트워크 확인**: `sysctl net.ipv4.tcp_congestion_control` 결과값이 `bbr`인지 확인.

---

## 📋 적용 결과 (2026-01-09)

### ✅ 신규 서버 구축 완료
- **서버 IP**: 158.247.222.179 (Seoul)
- **초기화 상태**: 모든 단계 성공
- **컨테이너 배포**: 6개 서비스 정상 실행

### 🔄 후속 작업 안내

본 스크립트 실행 후 아래 작업을 순차적으로 진행하세요:

#### 1단계: GitHub Secrets 등록
- `GH_TOKEN`: Personal Access Token
- `SERVER_IP`: 158.247.222.179
- `SSH_PRIVATE_KEY`: 비공개 키 전체 내용
- `JWT_SECRET`, `TELEGRAM_BOT_TOKEN` 등

#### 2단계: 자동 배포 실행
```bash
git push  # main 브랜치에 푸시하면 자동 배포 시작
```

#### 3단계: 프로덕션 전환 (선택)
전환 가이드는 [신규 서버 전환 완료 가이드](../../../.gemini/antigravity/brain/8ebc65a0-d5a8-4b99-81ea-2c6c81af5671/next_steps_server_migration.md)를 참조하세요.

> [!NOTE]
> 프로덕션 전환 시 SSL 인증서 발급, 도메인 DNS 변경, 이전 서버 종료 등 약 30분~1시간의 추가 작업이 필요합니다.

---

## 5. 변경 이력
- v1.0 (2026-01-09, Antigravity): Ubuntu 24.04 전용 초기화 런북 최초 작성
