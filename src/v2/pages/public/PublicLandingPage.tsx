import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/common/Button";

export default function PublicLandingPage() {
  const primaryCtaHref = "/home";

  const telegramHref = useMemo(() => {
    return "https://t.me/+IE0NYpuze_k1YWZk";
  }, []);

  const ccMainSiteHref = "https://ccc-010.com";

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text">
      {/* ───── Header ───── */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo_cc_v2.webp"
            alt="씨씨카지노 로고"
            className="h-8 w-8 object-contain"
            width={32}
            height={32}
          />
          <span className="text-sm font-semibold tracking-tight">
            씨씨카지노
          </span>
        </div>

        <nav className="flex items-center gap-2" aria-label="주요 메뉴">
          <Button asChild variant="figma-secondary" size="sm">
            <a href={telegramHref} target="_blank" rel="noreferrer">
              공식 텔레그램
            </a>
          </Button>
          <Button asChild variant="figma-primary" size="sm">
            <Link to={primaryCtaHref}>지금 시작하기</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        {/* ───── Hero ───── */}
        <section className="rounded-xl border border-obsidian-border bg-obsidian-surface px-6 py-12 md:py-16">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
            씨씨카지노 — 주사위·룰렛·복권·팀배틀까지
            <br className="hidden md:block" />
            텔레그램에서 즐기는 올인원 이벤트 플랫폼
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-obsidian-muted md:text-base">
            씨씨카지노(씨씨 카지노)는 텔레그램 미니앱 기반의 게임·이벤트
            플랫폼입니다. 지민코드로 가입하면 주사위 배틀, 룰렛 스핀, 복권 뽑기,
            팀배틀 등 다양한 게임을 즐기고, 금고에 쌓인 포인트를 기프티콘이나
            실적으로 교환할 수 있습니다.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="figma-primary" size="lg">
              <Link to={primaryCtaHref}>무료로 시작하기</Link>
            </Button>
            <Button asChild variant="figma-secondary" size="lg">
              <a href={telegramHref} target="_blank" rel="noreferrer">
                텔레그램 공식 채널
              </a>
            </Button>
            <Button asChild variant="figma-secondary" size="lg">
              <a href={ccMainSiteHref} target="_blank" rel="noreferrer">
                CC카지노 본사이트
              </a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {[
              "지민코드 전용",
              "텔레그램 미니앱",
              "매일 무료 보상",
              "기프티콘 교환",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-600 bg-zinc-800/60 px-3 py-1 text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* ───── 씨씨카지노란? ───── */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
          <h2 className="text-lg font-bold text-white">
            씨씨카지노(씨씨 카지노)란?
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-obsidian-muted">
            <p>
              씨씨카지노는 CC카지노 공식 지민코드 이벤트 플랫폼입니다. 텔레그램
              미니앱으로 제공되며, 별도 앱 설치 없이 텔레그램 안에서 바로 게임과
              이벤트에 참여할 수 있습니다.
            </p>
            <p>
              "씨씨 카지노", "CC카지노", "씨씨지민", "지민코드" 등의 키워드로
              검색해 오셨다면 올바른 페이지입니다. 가입부터 게임 플레이, 보상
              수령까지 모든 과정을 이 페이지에서 확인하실 수 있습니다.
            </p>
            <p>
              CC카지노 본사이트는{" "}
              <a
                href={ccMainSiteHref}
                target="_blank"
                rel="noreferrer"
                className="text-white underline hover:text-white/80"
              >
                ccc-010.com
              </a>
              이며, 지민코드 전용 이벤트와 혜택은 이 플랫폼에서 독점 제공됩니다.
            </p>
          </div>
        </section>

        {/* ───── 게임 소개 4종 ───── */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-white">
            씨씨카지노 게임 — 4가지 즐길 거리
          </h2>
          <p className="mt-2 text-sm text-obsidian-muted">
            씨씨카지노에서는 매일 무료 티켓으로 4종 게임을 플레이할 수 있습니다.
            승리 보상은 금고에 자동 적립됩니다.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              {
                emoji: "🎲",
                title: "주사위 배틀",
                desc: "1대1 주사위 대결! 3D 주사위를 굴려 상대보다 높은 숫자가 나오면 승리합니다. 승리 후 '더블업'에 도전하면 보상을 2배로 늘릴 수 있습니다.",
                ticket: "다이스 티켓 사용",
              },
              {
                emoji: "🚀",
                title: "룰렛 스핀",
                desc: "룰렛을 돌려 한방에 큰 보상을 노려보세요. 룰렛 티켓, 골드 열쇠, 다이아몬드 티켓, 체험 티켓 등 4종 티켓으로 각기 다른 보상 테이블에 도전할 수 있습니다.",
                ticket: "4종 티켓 지원",
              },
              {
                emoji: "🎱",
                title: "복권 뽑기",
                desc: "매일 복권을 긁어 대박을 노리세요! 복권 플레이 중 퍼즐 조각(C, C, J, M)을 수집하면 골드 열쇠 티켓으로 교환할 수 있는 보너스 시스템도 있습니다.",
                ticket: "복권 티켓 사용",
              },
              {
                emoji: "🏆",
                title: "팀배틀",
                desc: "레드팀 vs 블루팀! 시즌제 팀 대항전에 참여하세요. 주사위·룰렛·복권을 플레이할 때마다 소속 팀에 포인트가 기여되고, 시즌 종료 시 팀 순위에 따른 추가 보상이 지급됩니다.",
                ticket: "게임 플레이 시 자동 기여",
              },
            ].map((game) => (
              <article
                key={game.title}
                className="rounded-xl border border-obsidian-border bg-obsidian-surface p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl" role="img" aria-label={game.title}>
                    {game.emoji}
                  </span>
                  <h3 className="font-semibold text-white">{game.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-obsidian-muted">
                  {game.desc}
                </p>
                <span className="mt-3 inline-block rounded-full border border-obsidian-border px-3 py-0.5 text-xs text-obsidian-muted">
                  {game.ticket}
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* ───── 핵심 기능 ───── */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-white">
            씨씨카지노 핵심 시스템
          </h2>
          <p className="mt-2 text-sm text-obsidian-muted">
            게임만 있는 게 아닙니다. 금고, 미션, 이벤트, 레벨타워, 상점까지 —
            플레이할수록 쌓이는 혜택 시스템을 소개합니다.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                emoji: "💰",
                title: "금고 시스템",
                body: "게임에서 얻은 보상이 금고에 자동 적립됩니다. 목표 금액 달성 시 기프티콘 교환 또는 실적 전환을 신청할 수 있습니다. 골든아워가 활성화되면 적립 배율이 올라갑니다.",
              },
              {
                emoji: "🎯",
                title: "미션 & 출석 보상",
                body: "일일 미션, 주간 미션, 신규 유저 웰컴 미션, 레벨 미션 4가지 카테고리가 있습니다. 매일 접속하면 7일 연속출석 스트릭 보상도 받을 수 있습니다.",
              },
              {
                emoji: "🎉",
                title: "이벤트",
                body: "연속출석 보너스, 골든아워 배율 이벤트, 신규유저 웰컴 이벤트, 입금지연 보상 등 매일 터지는 이벤트로 추가 보상을 확보하세요.",
              },
              {
                emoji: "🏰",
                title: "레벨타워",
                body: "게임을 플레이하면 경험치(XP)가 쌓이고, 레벨이 올라갈 때마다 레벨타워에서 티켓·다이아몬드·금고 포인트 등 층별 보상을 수령할 수 있습니다.",
              },
              {
                emoji: "🛒",
                title: "상점 & 기프티콘",
                body: "보유 포인트로 게임 티켓을 구매하거나, 치킨·스타벅스·문화상품권 등 실물 기프티콘을 교환할 수 있습니다. 인벤토리에서 바로 수령하세요.",
              },
              {
                emoji: "🧩",
                title: "퍼즐 수집 시스템",
                body: "복권 플레이 중 획득하는 퍼즐 조각 4종(C, C, J, M)을 모두 모으면 골드 열쇠 티켓으로 교환됩니다. 골드 열쇠는 프리미엄 룰렛에 사용할 수 있습니다.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="rounded-xl border border-obsidian-border bg-obsidian-surface p-5"
              >
                <span className="text-xl" role="img" aria-label={feat.title}>
                  {feat.emoji}
                </span>
                <h3 className="mt-2 font-semibold text-white">{feat.title}</h3>
                <p className="mt-2 text-sm leading-6 text-obsidian-muted">
                  {feat.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── 시작 방법 ───── */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-white">
            씨씨카지노 시작하는 방법
          </h2>
          <p className="mt-2 text-sm text-obsidian-muted">
            누구나 3단계로 간단하게 시작할 수 있습니다. 별도 앱 설치가 필요
            없습니다.
          </p>

          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                step: "텔레그램 채널 입장",
                detail:
                  "아래 '텔레그램 공식 채널' 버튼을 눌러 씨씨카지노 공식 채널에 입장합니다. 텔레그램 계정만 있으면 됩니다.",
              },
              {
                step: "지민코드로 가입",
                detail:
                  "채널 내 안내에 따라 지민코드를 입력하고 가입을 완료합니다. 가입 즉시 신규유저 웰컴 보상과 무료 티켓이 지급됩니다.",
              },
              {
                step: "게임 플레이 & 보상 수령",
                detail:
                  "주사위·룰렛·복권·팀배틀 중 원하는 게임을 플레이하세요. 획득한 포인트는 금고에 적립되고, 기프티콘 교환이나 출금 신청에 사용됩니다.",
              },
            ].map((item, idx) => (
              <li
                key={item.step}
                className="rounded-xl border border-obsidian-border bg-obsidian-surface p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                  {idx + 1}
                </div>
                <h3 className="mt-3 font-semibold text-white">{item.step}</h3>
                <p className="mt-2 text-sm leading-6 text-obsidian-muted">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ───── 왜 씨씨카지노인가? ───── */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
          <h2 className="text-lg font-bold text-white">
            왜 씨씨카지노를 선택하나요?
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              {
                title: "텔레그램 네이티브",
                desc: "별도 앱 설치 없이 텔레그램 안에서 바로 플레이합니다. 햅틱 피드백과 네이티브 UI로 쾌적한 경험을 제공합니다.",
              },
              {
                title: "매일 무료 보상",
                desc: "일일 미션, 연속출석 스트릭, 이벤트를 통해 매일 무료 게임 티켓과 보너스 포인트를 받을 수 있습니다.",
              },
              {
                title: "실물 보상 교환",
                desc: "치킨, 스타벅스, 문화상품권 등 실물 기프티콘으로 교환 가능합니다. 금고에 쌓인 포인트가 실제 혜택이 됩니다.",
              },
              {
                title: "골든아워 배율 이벤트",
                desc: "랜덤으로 활성화되는 골든아워 동안 게임 보상이 배로 늘어납니다. 실시간 잔여시간 확인도 가능합니다.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-obsidian-muted">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───── FAQ ───── */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
          <h2 className="text-lg font-bold text-white">
            씨씨카지노 자주 묻는 질문 (FAQ)
          </h2>
          <div className="mt-4 space-y-5 text-sm">
            {[
              {
                q: "씨씨카지노(씨씨 카지노)는 무엇인가요?",
                a: "씨씨카지노는 CC카지노 공식 지민코드 이벤트 플랫폼입니다. 텔레그램 미니앱으로 운영되며 주사위 배틀, 룰렛, 복권, 팀배틀 등의 게임과 금고·미션·이벤트 시스템을 통해 포인트를 적립하고 기프티콘으로 교환할 수 있습니다.",
              },
              {
                q: "씨씨카지노 가입은 어떻게 하나요?",
                a: "텔레그램 공식 채널에 입장한 뒤 지민코드를 입력하면 바로 가입됩니다. 별도 앱 설치가 필요 없으며, 가입 즉시 무료 티켓과 신규유저 웰컴 보상이 지급됩니다.",
              },
              {
                q: "씨씨카지노에서 어떤 게임을 할 수 있나요?",
                a: "주사위 배틀(1대1 대결), 룰렛 스핀(4종 티켓), 복권 뽑기(퍼즐 수집), 팀배틀(시즌제 팀 대항전) 총 4종 게임을 즐길 수 있습니다.",
              },
              {
                q: "금고 포인트는 어떻게 사용하나요?",
                a: "게임 승리 시 금고에 자동 적립되는 포인트입니다. 목표 금액 달성 시 치킨·스타벅스·문화상품권 등 기프티콘 교환 또는 실적 전환을 신청할 수 있습니다.",
              },
              {
                q: "골든아워란 무엇인가요?",
                a: "랜덤으로 활성화되는 특별 시간대입니다. 골든아워가 켜지면 게임 보상 적립 배율이 올라가 같은 게임을 해도 더 많은 포인트를 받을 수 있습니다.",
              },
              {
                q: "퍼즐 조각은 어떻게 모으나요?",
                a: "복권 게임을 플레이하면 랜덤으로 퍼즐 조각(C, C, J, M)이 드롭됩니다. 4종을 모두 모으면 프리미엄 룰렛에 사용할 수 있는 골드 열쇠 티켓으로 교환됩니다.",
              },
              {
                q: "씨씨지민이 뭔가요? / 지민코드가 뭔가요?",
                a: "씨씨지민은 씨씨카지노의 공식 운영자이며, 지민코드는 씨씨카지노 이벤트 플랫폼에 가입할 때 사용하는 전용 코드입니다. 지민코드로 가입해야 전용 혜택과 이벤트를 받을 수 있습니다.",
              },
              {
                q: "CC카지노 본사이트와 씨씨카지노는 같은 건가요?",
                a: "CC카지노(ccc-010.com)는 본사이트이고, 씨씨카지노(cc-jm.com)는 지민코드 전용 이벤트·게임 플랫폼입니다. 씨씨카지노에서 지민코드 가입 후 게임과 이벤트에 참여하시면 됩니다.",
              },
              {
                q: "무료로 플레이할 수 있나요?",
                a: "네, 매일 일일 미션과 연속출석 보상을 통해 무료 게임 티켓을 받을 수 있습니다. 신규 가입 시에도 웰컴 보상으로 티켓이 지급됩니다.",
              },
              {
                q: "문의는 어디로 하나요?",
                a: "텔레그램 공식 채널에서 공지 확인과 문의가 가능하며, 1:1 상담은 텔레그램 @jm956으로 직접 연락하실 수 있습니다.",
              },
            ].map((faq, idx) => (
              <div key={idx}>
                <div className="font-semibold text-white">Q. {faq.q}</div>
                <div className="mt-1 leading-6 text-obsidian-muted">
                  A. {faq.a}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───── 키워드 안내 (자연스러운 SEO 텍스트) ───── */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-obsidian-surface p-6">
          <h2 className="text-lg font-bold text-white">검색 키워드 안내</h2>
          <p className="mt-3 text-sm leading-7 text-obsidian-muted">
            이 페이지는 <strong className="text-white">씨씨카지노</strong>,{" "}
            <strong className="text-white">씨씨 카지노</strong>,{" "}
            <strong className="text-white">CC카지노</strong>,{" "}
            <strong className="text-white">씨씨지민</strong>,{" "}
            <strong className="text-white">지민코드</strong> 등의 키워드로
            검색하시는 분들을 위한 공식 안내 페이지입니다. 어떤 키워드로
            유입하셨든 동일한 공식 정보를 확인하실 수 있으며, 위 안내에 따라
            텔레그램 채널 입장 → 지민코드 가입 → 게임 플레이 순서로 시작하시면
            됩니다.
          </p>
        </section>

        {/* ───── Final CTA ───── */}
        <section className="mt-10 rounded-xl border border-obsidian-border bg-gradient-to-r from-obsidian-surface to-obsidian-surface/80 px-6 py-10">
          <h2 className="text-xl font-bold text-white">
            지금 씨씨카지노를 시작하세요
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-obsidian-muted">
            텔레그램 채널 입장 후 지민코드로 가입하면 신규유저 웰컴 보상과 무료
            게임 티켓이 즉시 지급됩니다. 주사위, 룰렛, 복권, 팀배틀 — 지금 바로
            첫 게임을 시작해 보세요.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="figma-primary" size="lg">
              <Link to={primaryCtaHref}>무료로 시작하기</Link>
            </Button>
            <Button asChild variant="figma-secondary" size="lg">
              <a href={telegramHref} target="_blank" rel="noreferrer">
                텔레그램 공식 채널
              </a>
            </Button>
            <Button asChild variant="figma-secondary" size="lg">
              <a href={ccMainSiteHref} target="_blank" rel="noreferrer">
                CC카지노 본사이트
              </a>
            </Button>
          </div>
        </section>

        {/* ───── Footer ───── */}
        <footer className="mt-12 flex flex-col gap-3 border-t border-obsidian-border pt-6 text-xs text-obsidian-muted sm:flex-row sm:items-center sm:justify-between">
          <div>
            © {new Date().getFullYear()} 씨씨카지노 — CC카지노 지민코드 공식
            이벤트 플랫폼
          </div>
          <div className="flex gap-4">
            <a href="#terms" className="hover:text-white">
              이용약관
            </a>
            <a href="#privacy" className="hover:text-white">
              개인정보 처리방침
            </a>
          </div>
        </footer>

        <section id="terms" className="mt-8 text-xs text-obsidian-muted">
          <h2 className="font-semibold text-white">이용약관</h2>
          <p className="mt-2 leading-5">
            씨씨카지노 이벤트 플랫폼의 최신 이용약관과 정책은 공식 텔레그램
            채널을 통해 안내됩니다. 문의사항은 텔레그램 @jm956으로 연락해
            주세요.
          </p>
        </section>
        <section id="privacy" className="mt-6 text-xs text-obsidian-muted">
          <h2 className="font-semibold text-white">개인정보 처리방침</h2>
          <p className="mt-2 leading-5">
            씨씨카지노는 텔레그램 미니앱으로 운영되며, 개인정보 처리방침의 최신
            내용은 공식 채널을 통해 안내됩니다.
          </p>
        </section>
      </main>
    </div>
  );
}
