import json
import urllib.request

URL = "http://localhost:3000/assets/index-DjBSb8K1.js.map"
NEEDLE = "src/admin/pages/ExternalRankingPage.tsx"
CHECKS = [
    "랭킹 입력",
    "행 검색(적용형)",
    "전체 저장",
    "변경사항",
    "페이지 크기",
]


def main() -> int:
    with urllib.request.urlopen(URL) as r:
        data = r.read()

    obj = json.loads(data)
    sources = obj.get("sources", [])
    contents = obj.get("sourcesContent", [])

    idx = None
    for i, s in enumerate(sources):
        if isinstance(s, str) and s.endswith(NEEDLE):
            idx = i
            break

    print("downloaded", len(data), "bytes")
    print("sources", len(sources), "contents", len(contents))
    print("idx", idx)

    if idx is None:
        print("NOT_FOUND")
        return 2

    content = contents[idx] or ""
    print("content_length", len(content))
    for k in CHECKS:
        print(f"{k}: {k in content}")

    # show a short snippet for sanity
    snippet = content[:300].replace("\n", "\\n")
    print("snippet", snippet)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
