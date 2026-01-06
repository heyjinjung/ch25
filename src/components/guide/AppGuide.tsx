// src/components/guide/AppGuide.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, Styles, TooltipRenderProps } from "react-joyride";
import { useGuide } from "../../contexts/GuideContext";
import { useNavigate, useLocation } from "react-router-dom";

// 시니어 친화적 큰 글씨, 명확한 한글 안내
// 전체 플로우(최신): 홈 → 게임 → 금고 → (금고 하단) 보상함 버튼 → 보상함 → 상점 → 이벤트/미션
const guideSteps: Step[] = [
  {
    target: '[data-tour="nav-home"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🏠 홈</div>
        <div className="text-sm leading-snug break-keep">
          여기는 <strong>홈</strong>입니다. 게임 목록과 주요 기능을 볼 수 있어요.
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-games"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🎮 게임</div>
        <div className="text-sm leading-snug break-keep">
          <strong>룰렛, 주사위, 복권</strong> 게임을 하려면 여기를 누르세요.
          <div className="mt-2 text-amber-400">💡 티켓이 있어야 게임을 할 수 있어요.</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-vault"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🔐 금고</div>
        <div className="text-sm leading-snug break-keep">
          <strong>내 보상 금액</strong>을 확인하려면 여기를 눌러 금고로 가세요.
          <div className="mt-2 text-emerald-400">✨ 게임에서 얻은 보상이 여기에 쌓여요.</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 금고 페이지 내 보상함 버튼
  {
    target: '[data-tour="vault-inventory-btn"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">📦 금고 → 보상함</div>
        <div className="text-sm leading-snug break-keep">
          <strong>여기를 눌러 보상함으로 이동</strong>해요.
          <div className="mt-2">금고 화면 맨 아래에 있는 버튼입니다.</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 보상함(아이템/티켓) 안내
  {
    target: '[data-tour="inventory-items-tab"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🎒 보유 아이템 / 🎫 티켓 지갑</div>
        <div className="text-sm leading-snug break-keep">
          <strong>보유함</strong>에서 교환권/기프티콘을 확인하고, <strong>지갑</strong>에서 티켓 수량을 확인해요.
          <div className="mt-2 text-amber-400 font-bold">💡 상점에서 구매하면 바로 지갑에 들어옵니다.</div>
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  // 상점 페이지
  {
    target: '[data-tour="shop-link"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🛒 상점</div>
        <div className="text-sm leading-snug break-keep">
          <strong>다이아로 티켓/키</strong>를 살 수 있어요.
          <div className="mt-2 text-white/70">기프티콘은 지급대기 후 관리자 승인 처리</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 이벤트/미션
  {
    target: '[data-tour="nav-events"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">⭐ 이벤트 / 미션</div>
        <div className="text-sm leading-snug break-keep">
          <strong>일일 미션</strong>과 <strong>출석 보상</strong>을 여기서 확인하고 받을 수 있어요.
          <div className="mt-2 text-white/70">
            완료된 미션은 <span className="text-amber-300 font-black">트로피(받기)</span> 버튼을 누르면 보상이 들어옵니다.
          </div>
          <div className="mt-2 text-red-400 font-bold">🎁 매일 보상을 놓치지 마세요.</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
];

const scrollToSelector = (selector: string, behavior: ScrollBehavior = "smooth") => {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return false;
  el.scrollIntoView({ behavior, block: "center" });
  return true;
};

// 타겟이 실제로 화면에 보일 때까지 폴링 (sr-only 제외)
const waitForVisibleTarget = (
  selector: string,
  maxWait = 2000,
  interval = 100
): Promise<HTMLElement | null> => {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      // sr-only 클래스가 없고 offsetParent가 있으면 화면에 보이는 것
      if (el && !el.classList.contains("sr-only") && el.offsetParent !== null) {
        resolve(el);
        return;
      }
      if (Date.now() - start < maxWait) {
        setTimeout(check, interval);
      } else {
        resolve(null);
      }
    };
    check();
  });
};

// 시니어 친화적 스타일 (큰 글씨, 높은 대비, 넓은 버튼)
const joyrideStyles: Partial<Styles> = {
  options: {
    backgroundColor: "#1a1a1a",
    textColor: "#ffffff",
    primaryColor: "#22c55e",
    arrowColor: "#1a1a1a",
    overlayColor: "rgba(0, 0, 0, 0.85)",
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 18,
    padding: 18,
    fontSize: 14,
  },
  tooltipContent: {
    padding: "12px 6px",
  },
  buttonNext: {
    backgroundColor: "#22c55e",
    color: "#000",
    fontWeight: 900,
    fontSize: 15,
    padding: "12px 22px",
    borderRadius: 12,
  },
  buttonBack: {
    color: "#9ca3af",
    fontWeight: 700,
    fontSize: 14,
    marginRight: 12,
  },
  buttonSkip: {
    color: "#6b7280",
    fontSize: 13,
  },
  buttonClose: {
    display: "none",
  },
  spotlight: {
    borderRadius: 16,
  },
};

// 커스텀 툴팁 (시니어 친화적 큰 버튼)
const CustomTooltip: React.FC<TooltipRenderProps> = ({
  continuous,
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
}) => {
  return (
    <div
      {...tooltipProps}
      className="bg-[#1a1a1a] border border-white/20 rounded-3xl p-5 max-w-[300px] shadow-2xl break-keep whitespace-normal"
    >
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-white/40 tracking-wider">
          {index + 1} / {size}
        </span>
        <button
          {...skipProps}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          건너뛰기
        </button>
      </div>

      {/* Content */}
      <div className="text-white mb-6">
        {step.content}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        {index > 0 && (
          <button
            {...backProps}
            className="text-white/60 hover:text-white text-sm font-bold px-3 py-2 transition-colors"
          >
            ← 이전
          </button>
        )}
        <div className="flex-1" />
        <button
          {...primaryProps}
          className="bg-emerald-500 hover:bg-emerald-400 text-black text-base font-black px-6 py-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-900/30"
        >
          {continuous && index < size - 1 ? "다음 →" : "완료! ✓"}
        </button>
      </div>
    </div>
  );
};

const AppGuide: React.FC = () => {
  const { isGuideRunning, stepIndex, stopGuide, setStepIndex, markGuideSeen } = useGuide();
  const navigate = useNavigate();
  const location = useLocation();
  const errorRetryRef = useRef<Set<number>>(new Set());
  const [isTargetReady, setIsTargetReady] = useState(true);

  // 스텝별 페이지 이동 로직
  useEffect(() => {
    if (!isGuideRunning) return;

    // 스텝 0~2: 하단 네비 (어느 페이지든 OK)
    // 스텝 3: 금고 페이지의 인벤토리 버튼 → /vault로 이동
    if (stepIndex === 3) {
      if (!location.pathname.startsWith("/vault")) {
        navigate("/vault");
      }
    }
    // 스텝 4: 보상함 페이지 → /rewards로 이동
    if (stepIndex === 4) {
      if (!location.pathname.startsWith("/rewards")) {
        navigate("/rewards");
      }
    }
    // 스텝 5: 상점 페이지 → /shop로 이동
    if (stepIndex === 5) {
      if (!location.pathname.startsWith("/shop")) {
        navigate("/shop");
      }
    }
    // 스텝 6: 이벤트 (하단 네비, 어느 페이지든 OK)
  }, [stepIndex, isGuideRunning, navigate, location.pathname]);

  // 페이지 이동이 필요한 스텝에서 타겟이 준비될 때까지 Joyride 일시 정지
  useEffect(() => {
    if (!isGuideRunning) return;

    // 스텝 3~5: 페이지 이동 후 타겟 대기 필요
    if (stepIndex >= 3 && stepIndex <= 5) {
      const selector = guideSteps[stepIndex]?.target;
      if (typeof selector !== "string") return;

      // 일단 Joyride 멈춤
      setIsTargetReady(false);

      let cancelled = false;
      (async () => {
        // 실제 타겟이 렌더될 때까지 최대 3초 대기
        const el = await waitForVisibleTarget(selector, 3000, 100);
        if (cancelled) return;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // 스크롤 완료 후 약간 대기
          await new Promise(r => setTimeout(r, 300));
        }
        if (!cancelled) {
          setIsTargetReady(true);
        }
      })();

      return () => { cancelled = true; };
    } else {
      setIsTargetReady(true);
    }
  }, [isGuideRunning, stepIndex]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      // 타겟을 못 찾으면 한 번 더 스크롤 후 재시도, 그다음에만 패스
      if (type === "error:target_not_found") {
        const selector = guideSteps[index]?.target;
        const alreadyRetried = errorRetryRef.current.has(index);

        if (!alreadyRetried) {
          errorRetryRef.current.add(index);
          if (typeof selector === "string") {
            window.setTimeout(() => scrollToSelector(selector, "auto"), 50);
          }
          window.setTimeout(() => setStepIndex(index), 120);
          return;
        }

        const nextIndex = Math.min(index + 1, guideSteps.length - 1);
        setStepIndex(nextIndex);
        return;
      }

      // 완료 또는 스킵
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        errorRetryRef.current.clear();
        stopGuide();
        markGuideSeen();
        return;
      }

      // 닫기 버튼
      if (action === ACTIONS.CLOSE) {
        stopGuide();
        return;
      }

      // 스텝 변경
      if (type === "step:after") {
        if (action === ACTIONS.NEXT) {
          setStepIndex(index + 1);
        } else if (action === ACTIONS.PREV) {
          setStepIndex(index - 1);
        }
      }
    },
    [stopGuide, markGuideSeen, setStepIndex]
  );

  if (!isGuideRunning) return null;

  return (
    <Joyride
      steps={guideSteps}
      stepIndex={stepIndex}
      run={isGuideRunning && isTargetReady}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep={false}
      disableScrollParentFix
      disableOverlayClose
      disableCloseOnEsc={false}
      spotlightClicks={false}
      callback={handleCallback}
      styles={joyrideStyles}
      tooltipComponent={CustomTooltip}
      locale={{
        back: "이전",
        close: "닫기",
        last: "완료",
        next: "다음",
        skip: "건너뛰기",
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};

export default AppGuide;
