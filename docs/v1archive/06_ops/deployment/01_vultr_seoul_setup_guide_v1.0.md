문서 타입: 가이드
버전: v1.0
작성일: 2026-01-09
작성자: BE팀 (Antigravity)
대상: BE 개발자, SRE
상태: SoT

# 🛠️ Vultr 서울 리전 서버 구축 가이드 (v1.0)

## 1. 목적 (Purpose)
Vultr 서울 리전에 신규 서버를 구축할 때 일관된 보안 수준과 성능 최적화 상태를 유지하고, 불필요한 추가 비용 발생을 방지하기 위함입니다.

## 2. 범위 (Scope)
Vultr 인스턴스 구매 옵션 선택부터 SSH 키 등록, OS 초기 보안 설정까지의 전 과정을 다룹니다.

## 3. 용어 정의 (Definitions)
- **SSH Key**: 비밀번호 인증 방식보다 보안이 뛰어난 공개키 기반 인증 수단.
- **VPC (Virtual Private Cloud)**: 서버 간 통신을 위한 격리된 가상 네트워크.
- **BBR (Bottleneck Bandwidth and RTT)**: Google에서 개발한 TCP 혼잡 제어 알고리즘.

## 4. 본문

### ## 1) 운영체제(OS) 및 하드웨어 사양
*   **권장 OS**: `Ubuntu 24.04 LTS x64`
    *   최신 보안 패치 및 Docker 런타임 최적화를 위해 최신 LTS 버전을 사용합니다.
*   **권장 사양**: 2 vCPUs / 8GB RAM (High Frequency 또는 Optimized Cloud Compute)

### ## 2) Vultr 구매 옵션 (비용 최적화)
서버 구매 시 다음 Additional Features를 반드시 확인하여 불필요한 비용을 차단합니다.
- **Automatic Backups**: **OFF** ($12.00/mo 절약) - 자체 백업 스크립트로 대체.
- **DDoS Protection**: **OFF** ($10.00/mo 절약) - 기본 방화벽으로 대응.
- **Public IPv4**: **ON** (서버 접속을 위한 고정 IP 확보)

### ## 3) 보안 설정: SSH 키 등록
비밀번호 기반 로그인은 브루트포스 공격에 취약하므로 SSH Key 인증을 강제합니다.
1.  **로컬 키 생성**: `ssh-keygen -t ed25519`
2.  **공개키 추출**: `~/.ssh/id_ed25519.pub` 내용 복사.
3.  **Vultr 등록**: [Account] -> [SSH Keys] 메뉴에 붙여넣기.
4.  **배포 시 선택**: Instance 구매 화면에서 해당 키를 지정.

## 5. 운영/검증 (QA)
- [ ] 서버 배포 후 비밀번호 입력 없이 SSH Key로 접속 가능한지 확인.
- [ ] `ufw status`를 통해 22, 80, 443 포트 외에 외부 접근이 차단되었는지 검증.
- [ ] `Additional Features` 비용이 청구 항목에 포함되지 않았는지 대시보드 확인.

## 6. 변경 이력
- v1.0 (2026-01-09, Antigravity): Vultr 서울 인프라 구축 표준안 최초 작성
