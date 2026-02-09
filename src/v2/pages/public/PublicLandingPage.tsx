import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/common/Button";

export default function PublicLandingPage() {
  const primaryCtaHref = "/home";

  const telegramHref = useMemo(() => {
    return "https://t.me/+IE0NYpuze_k1YWZk";
  }, []);

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo_cc_v2.webp"
            alt="씨씨카지노"
            className="h-8 w-8 object-contain"
          />
          <span className="text-sm font-semibold tracking-tight">
            씨씨카지노
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="figma-secondary" size="sm">
            <a href={telegramHref} target="_blank" rel="noreferrer">
              공식 채널
            </a>
          </Button>
          <Button asChild variant="figma-primary" size="sm">
            <Link to={primaryCtaHref}>지금 시작하기</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        {/* Hero */}
        <section className="rounded-xl border border-obsidian-border bg-obsidian-surface px-6 py-10">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
            씨씨카지노(씨씨 카지노) 한 페이지 소개
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-obsidian-muted md:text-base">
            필요한 정보만 빠르게 확인하고, 공식 채널/앱으로 바로 시작할 수
            있도록 정리했습니다.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="figma-primary" size="lg">
              <Link to={primaryCtaHref}>지금 시작하기</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/10"
            >
              <a href={telegramHref} target="_blank" rel="noreferrer">
                공식 채널로 문의
              </a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-obsidian-muted">
            <span className="rounded-full border border-obsidian-border px-3 py-1">
              H1 1개 유지
            </span>
            <span className="rounded-full border border-obsidian-border px-3 py-1">
              Canonical: / (루트)
            </span>
            <span className="rounded-full border border-obsidian-border px-3 py-1">
              구조화 데이터(JSON-LD)
            </span>
          </div>
        </section>

        {/* Problem / Solution */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
            <h2 className="text-lg font-bold text-white">현재 문제</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-obsidian-muted">
              <li>필요한 정보를 찾기 어렵고, 경로가 분산됨</li>
              <li>시작/문의/다음 단계가 명확하지 않음</li>
              <li>핵심 기능이 한눈에 요약되지 않음</li>
            </ul>
          </div>
          <div className="rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
            <h2 className="text-lg font-bold text-white">해결 방식</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-obsidian-muted">
              <li>핵심 기능/흐름/FAQ를 한 페이지에 정리</li>
              <li>공식 채널과 앱 진입 CTA를 단일화</li>
              <li>검색/공유를 위한 메타/OG/캐노니컬 표준 적용</li>
            </ul>
          </div>
        </section>

        {/* Features */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-white">핵심 기능/혜택</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "한눈에 보는 정보",
                body: "중요 내용만 요약해 빠르게 확인합니다.",
              },
              {
                title: "명확한 다음 단계",
                body: "시작/문의/이동 경로를 CTA로 고정합니다.",
              },
              {
                title: "표준 SEO 메타",
                body: "title/description/OG/Twitter/JSON-LD를 유지합니다.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-obsidian-border bg-obsidian-surface p-5"
              >
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-obsidian-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof (minimal) */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
          <h2 className="text-lg font-bold text-white">신뢰 요소</h2>
          <p className="mt-3 text-sm text-obsidian-muted">
            공식 채널을 통해 공지/문의가 가능하며, 페이지 메타/캐노니컬 정책을
            고정해 중복/혼선을 줄입니다.
          </p>
        </section>

        {/* How it works */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-white">작동 방식</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "확인",
                body: "핵심 정보/FAQ를 빠르게 확인합니다.",
              },
              {
                title: "시작",
                body: "앱으로 이동해 필요한 기능을 사용합니다.",
              },
              {
                title: "문의",
                body: "공식 채널에서 안내를 받습니다.",
              },
            ].map((step, idx) => (
              <li
                key={step.title}
                className="rounded-xl border border-obsidian-border bg-obsidian-surface p-5"
              >
                <div className="text-xs font-semibold text-obsidian-muted">
                  STEP {idx + 1}
                </div>
                <h3 className="mt-1 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-obsidian-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
          <h2 className="text-lg font-bold text-white">FAQ</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="font-semibold text-white">
                Q. 씨씨카지노는 무엇인가요?
              </div>
              <div className="mt-1 text-obsidian-muted">
                A. 씨씨카지노(씨씨 카지노) 서비스/브랜드 소개 페이지입니다.
              </div>
            </div>
            <div>
              <div className="font-semibold text-white">
                Q. 어디서 시작하나요?
              </div>
              <div className="mt-1 text-obsidian-muted">
                A. 상단의 “지금 시작하기” 버튼을 눌러 앱으로 이동합니다.
              </div>
            </div>
            <div>
              <div className="font-semibold text-white">
                Q. 문의는 어디로 하나요?
              </div>
              <div className="mt-1 text-obsidian-muted">
                A. “공식 채널”에서 안내를 받을 수 있습니다.
              </div>
            </div>
            <div>
              <div className="font-semibold text-white">
                Q. 씨씨지민 키워드는 어떻게 대응하나요?
              </div>
              <div className="mt-1 text-obsidian-muted">
                A. 검색 의도(엔티티)가 랜딩과 다르면 별도 페이지로 분리하는 것을
                원칙으로 합니다.
              </div>
            </div>
            <div>
              <div className="font-semibold text-white">
                Q. 검색 반영(인덱싱)은 어떻게 확인하나요?
              </div>
              <div className="mt-1 text-obsidian-muted">
                A. GSC(서치콘솔)에서 색인 상태와 쿼리 성과를 확인합니다.
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-obsidian-surface px-6 py-8">
          <h2 className="text-lg font-bold text-white">지금 시작하기</h2>
          <p className="mt-2 text-sm text-obsidian-muted">
            한 페이지에서 확인 후, 앱 또는 공식 채널로 이동하세요.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="figma-primary" size="lg">
              <Link to={primaryCtaHref}>지금 시작하기</Link>
            </Button>
            <Button asChild variant="figma-secondary" size="lg">
              <a href={telegramHref} target="_blank" rel="noreferrer">
                공식 채널
              </a>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 flex flex-col gap-3 border-t border-obsidian-border pt-6 text-xs text-obsidian-muted sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} 씨씨카지노</div>
          <div className="flex gap-4">
            <a href="#terms" className="hover:text-white">
              이용약관
            </a>
            <a href="#privacy" className="hover:text-white">
              개인정보 처리방침
            </a>
          </div>
        </footer>

        {/* Minimal policy anchors (placeholders) */}
        <section id="terms" className="mt-8 text-xs text-obsidian-muted">
          <h2 className="font-semibold text-white">이용약관</h2>
          <p className="mt-2">
            이용약관 상세는 공식 채널을 통해 최신본으로 안내됩니다.
          </p>
        </section>
        <section id="privacy" className="mt-6 text-xs text-obsidian-muted">
          <h2 className="font-semibold text-white">개인정보 처리방침</h2>
          <p className="mt-2">
            개인정보 처리방침 상세는 공식 채널을 통해 최신본으로 안내됩니다.
          </p>
        </section>
      </main>
    </div>
  );
}
