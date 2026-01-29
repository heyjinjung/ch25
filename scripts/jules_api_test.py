import os
import requests
import subprocess
import sys

def load_env(filepath=".env.local"):
    """
    외부 라이브러리 없이 .env 파일을 읽어 os.environ에 등록합니다.
    """
    if not os.path.exists(filepath):
        if filepath == ".env.local":
            filepath = ".env"
            if not os.path.exists(filepath):
                print(f"[{filepath}] 파일을 찾을 수 없습니다. 기존 환경 변수를 사용합니다.")
                return
        else:
            return

    print(f"[{filepath}] 로딩 중...")
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                # 따옴표 제거
                value = value.strip().strip("'").strip('"')
                os.environ[key.strip()] = value

# 스크립트 실행 전 환경 변수 로드
load_env()

JULES_API_KEY = os.getenv("JULES_API_KEY")
BASE_URL = "https://jules.googleapis.com/v1alpha"

if not JULES_API_KEY:
    print("⚠️ JULES_API_KEY가 설정되지 않았습니다. .env.local 파일 또는 환경 변수를 확인하세요.")
else:
    print(f"✅ JULES_API_KEY 로드 완료 (길이: {len(JULES_API_KEY)})")

headers = {
    "x-goog-api-key": JULES_API_KEY,
    "Content-Type": "application/json"
}

def list_sources():
    print(f"Fetching sources from {BASE_URL}/sources...")
    resp = requests.get(f"{BASE_URL}/sources", headers=headers)
    print("[Sources Status]", resp.status_code)
    try:
        data = resp.json()
        print("[Sources Data]", data)
        return data
    except Exception:
        print("[Sources Error Body]", resp.text)
        return {}

def create_session(source_name):
    data = {
        "prompt": "Create a boba app!",
        "sourceContext": {
            "source": source_name,
            "githubRepoContext": {"startingBranch": "main"}
        },
        "automationMode": "AUTO_CREATE_PR",
        "title": "Boba App"
    }
    print(f"Creating session for {source_name}...")
    resp = requests.post(f"{BASE_URL}/sessions", headers=headers, json=data)
    print("[Session Status]", resp.status_code)
    try:
        result = resp.json()
        print("[Session Data]", result)
        return result
    except Exception:
        print("[Session Error Body]", resp.text)
        return None

def register_source(owner, repo, env_info=None):
    """
    Jules API v1alpha에서 /sources에 대한 POST는 404가 발생할 수 있습니다.
    공식 문서에 따르면 Source는 Jules 웹앱에서 GitHub App 설치를 통해 자동 생성됩니다.
    """
    data = {
        "githubRepo": {
            "owner": owner,
            "repo": repo
        }
    }
    if env_info:
        data["environment"] = env_info

    print(f"Checking/Registering source: {owner}/{repo}...")
    # POST /sources가 지원되지 않을 경우를 대비해 예외 처리 강화
    try:
        resp = requests.post(f"{BASE_URL}/sources", headers=headers, json=data)
        print("[Register Source Status]", resp.status_code)
        if resp.status_code == 404:
            print("ℹ️  'POST /sources' 엔드포인트를 찾을 수 없습니다. (v1alpha 정책 확인 필요)")
            print("ℹ️  Jules 웹앱(https://jules.google.com)에서 GitHub App이 설치되어 있는지 확인하세요.")
            return None
        return resp.json()
    except Exception as e:
        print(f"Register Source 중 오류 발생: {e}")
        return None

def get_git_origin_and_branch():
    try:
        origin_url = subprocess.check_output(["git", "remote", "get-url", "origin"], stderr=subprocess.STDOUT).decode().strip()
        branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.STDOUT).decode().strip()

        # https://github.com/owner/repo(.git) 또는 git@github.com:owner/repo.git 대응
        clean_url = origin_url.replace(".git", "")
        if clean_url.startswith("http"):
            parts = clean_url.split("/")
            owner, repo = parts[-2], parts[-1]
        elif ":" in clean_url:
            parts = clean_url.split(":")[-1].split("/")
            owner, repo = parts[0], parts[1]
        else:
            owner, repo = "", ""
        return owner, repo, branch
    except Exception as e:
        print(f"Git 정보 획득 실패: {e}")
        return "owner", "repo", "main"

def load_env_vars():
    env_keys = [
        "DATABASE_URL", "JWT_SECRET", "JWT_ALGORITHM", "JWT_EXPIRE_MINUTES", "ENV", "CORS_ORIGINS", "LOG_LEVEL", "TIMEZONE"
    ]
    env_info = {k: os.getenv(k) for k in env_keys if os.getenv(k)}
    return env_info

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--list-only":
        list_sources()
        sys.exit(0)

    owner, repo, branch = get_git_origin_and_branch()
    print(f"[GIT] owner={owner}, repo={repo}, branch={branch}")

    env_info = load_env_vars()
    print(f"[ENV] {len(env_info)} variables found")

    # 1. Source 등록/업데이트
    reg_result = register_source(owner, repo, env_info)

    # 2. Source 목록 조회 후 세션 생성
    sources_resp = list_sources()
    source_name = None

    # Google API 응답 구조에 따라 'sources' 키가 있을 것으로 예상
    for s in sources_resp.get("sources", []):
        github = s.get("githubRepo", {})
        if github.get("owner") == owner and github.get("repo") == repo:
            source_name = s["name"]
            break

    if source_name:
        create_session(source_name)
    else:
        print("❌ 등록된 Source를 찾을 수 없거나 생성에 실패했습니다. API 응답을 확인하세요.")
