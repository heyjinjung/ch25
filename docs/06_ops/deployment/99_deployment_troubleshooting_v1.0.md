# 🛠️ Deployment Troubleshooting Report (Vultr + GHCR)

신규 Vultr 서버로의 고속 배포 환경 구축 중 발생한 주요 장애와 해결 과정을 기록합니다.

## 1. 장애 이력 (Commit History 기반)

| 시점 | 이슈 내용 | 원인 | 해결책 |
| :--- | :--- | :--- | :--- |
| **1차** | 서버 측 설정 파일 부재 | `docker-compose.yml` 등 실행 청사진이 서버에 없음 | `scp-action`을 사용하여 설정 파일을 서버로 자동 전송 |
| **2차** | 파일 인식 오류 (`Dockerfile.frontend`) | YAML 인위적 인덴트 혼용으로 인한 워크플로우 해석 실패 | YAML 인덴트 표준화(2칸) 및 경로 명시 (`./`) |
| **3차** | 서버 측 이미지 빌드 시도 실패 | `docker-compose.yml`에 이미지 경로 미지정 | `image: ghcr.io/...` 경로 명시하여 빌드 대신 Pull 유도 |
| **4차** | `unauthorized` 권한 오류 | 서버에서 GHCR 이미지를 가져올 권한 부재 | 배포 스크립트에 `docker login` 단계 추가 |
| **5차** | `non-TTY` 로그인 실패 및 이미지 변환 오류 | `GH_TOKEN` 세션 미전달 및 SVG 파일의 PNG 사칭 | SSH 액션에 `env` 명시 및 이미지 변환기 헤더 체크 추가 |

## 2. 상세 분석 및 재발 방지책

### ❌ 이슈 A: 설계도(Config) 전송 누락 (1차 시도)
- **현상**: 서버 접속은 성공했으나 실행할 `docker-compose.yml`이 없음.
- **원인**: 코드 빌드만 신경 쓰고 실행에 필요한 설정 파일 전송(SCP)을 간과함.
- **방지책**: 배포 워크플로우에 `scp-action`을 포함하여 빌드 설정과 실행 설정을 동시 동기화.

### ❌ 이슈 B: YAML 문법 및 인덴트 오류 (2차 시도)
- **현상**: 파일이 있음에도 "No such file or directory" 혹은 문법 에러 발생.
- **원인**: GitHub Actions는 YAML 구조에 예민하여 들여쓰기 1칸 차이로 블록을 잘못 해석함.
- **방지책**: 항상 2칸 들여쓰기를 원칙으로 하고, VS Code의 YAML Linter 활용.

### ❌ 이슈 C: 깃허브 이미지 접근 권한 (`unauthorized`) (4차 시도)
- **현상**: 서버에서 `docker compose pull` 실행 시 권한 부족으로 실패.
- **원인**: 프라이빗 레지스트리의 경우 서버도 명시적인 로그인이 필요함.
- **방지책**: `docker login ghcr.io` 명령을 배포 스크립트 최상단에 배치.

### ❌ 이슈 D: SSH 세션 내 환경 변수 미전달 (5차 시도)
- **현상**: 로그인 시 비밀번호가 비어있어 `non-TTY` 에러 발생.
- **원인**: GitHub Secrets는 `ssh-action` 내부의 원격 쉘로 자동 전달되지 않음.
- **방지책**: `appleboy/ssh-action`에 `env:` 블록을 사용하여 시크릿 값을 명시적으로 맵핑.

### ❌ 이슈 E: 유령 이미지 (SVG disguised as PNG) (5차 시도)
- **현상**: 프론트엔드 빌드 중 이미지 변환 에러(`cannot identify image file`).
- **원인**: 디자인 에셋 일부가 실제로는 SVG 벡터 파일이나 확장자만 `.png`로 되어 있음.
- **방지책**: `convert_to_webp.py` 스크립트에서 파일 헤더를 읽어 `<svg` 감지 시 무시하는 로직 추가.

---

## 3. ✅ Post-Deployment Verification (정밀 검증 체크리스트)

이 단계는 **서버 내부(SSH)**와 **외부(PC 브라우저)** 두 환경에서 각각 나누어 진행합니다.

### 🏠 A. 서버 내부 검증 (SSH 접속 상태에서 실행)
> [!NOTE]
> 내부에서 `localhost`를 쓰는 이유는 Nginx나 외부 방화벽을 거치기 전, 컨테이너 자체가 정상적으로 살아서 통신하고 있는지 "내부 망" 상태를 먼저 확인하기 위함입니다.

#### STEP 1. 인프라 및 컨테이너 (Infrastructure)
| 검증 항목 | 명령어 | 기대 결과 |
| :--- | :--- | :--- |
| **컨테이너 생존** | `docker ps` | 6개 컨테이너(Nginx, BE, FE, DB, Redis, Bot) UP |
| **재부팅 로그** | `docker logs --tail 20 xmas-nginx` | `worker processes started` (정상 기동) |

#### STEP 2. 데이터베이스 및 Persistence
| 검증 항목 | 명령어 | 기대 결과 |
| :--- | :--- | :--- |
| **DB 연결** | `docker exec xmas-db mysqladmin ping -proot` | `mysqld is alive` |
| **마이그레이션** | `docker exec xmas-backend alembic current` | (head) 버전 표시됨 |

#### STEP 3. 백엔드 API 서비스 (Backend)
| 검증 항목 | 접근 주소 / 명령어 | 기대 결과 |
| :--- | :--- | :--- |
| **백엔드 직접 확인** | `curl http://localhost:8000/` | `{"message": "XMAS 1Week backend running"}` |
| **API 프록시 확인** | `curl http://localhost/api/health` | `{"status": "ok"}` (Nginx 연결 성공) |

---

### 🌍 B. 외부 접속 검증 (내 PC 브라우저에서 실행)

#### STEP 4. 유저 환경 및 프론트엔드 (Frontend)
| 검증 항목 | 확인 방법 | 기대 결과 |
| :--- | :--- | :--- |
| **IP 접속** | 브라우저 주소창: `http://158.247.222.179` | 화면 로드 성공 (Vite 환경변수 주입 확인) |
| **네트워크 통신** | 개발자 도구 (F12) -> Network 탭 | `/api/health` 호출이 200 OK |

---
**최종 업데이트**: 2026-01-09
**상태**: 5차 배포 대기 중 (Antigravity 검수 완료)
