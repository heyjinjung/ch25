// src/components/guide/AppGuide.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, Styles, TooltipRenderProps } from "react-joyride";
import { useGuide } from "../../contexts/GuideContext";
import { useNavigate, useLocation } from "react-router-dom";

// 시니어 친화적 큰 글씨, 명확한 한글 안내
// 전체 플로우(최신): 홈 → 게임 → 금고 → 출금조건버튼 → 출금안내 → 상점 → 보상함 → 이벤트 → 미션 → 보상수령
const guideSteps: Step[] = [
  // 1. 홈
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
  // 2. 게임
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
  // 3. 금고
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
  // 4. 금고 출금 조건 버튼 (금고 페이지 내)
  {
    target: '[data-tour="vault-condition-btn"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">📋 출금 조건</div>
        <div className="text-sm leading-snug break-keep">
          상금을 출금하려면 조건이 필요해요.
          <br />
          <strong>이 버튼</strong>을 눌러 현재 달성 현황을 확인할 수 있습니다.
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 5. 출금 안내 (화면 중앙 or 버튼) -> Step 5가 "안내"
  {
    target: '[data-tour="vault-condition-btn"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">💡 금고 해제 팁</div>
        <div className="text-sm leading-snug break-keep">
          출금 조건을 채우기 위해 <strong>게임 플레이</strong>와 <strong>상점 아이템 구매</strong>가 도움이 됩니다.
          <div className="mt-2 text-emerald-400">이제 상점으로 가볼까요?</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 6. 상점 (하단 네비)
  {
    target: '[data-tour="nav-shop"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🛒 교환소 (상점)</div>
        <div className="text-sm leading-snug break-keep">
          여기서 <strong>티켓과 아이템</strong>을 구매하고 교환할 수 있어요.
          <div className="mt-2 text-white/70">구매한 아이템은 바로 보상함으로 갑니다!</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 7. 보상함 (자동이동) -> /rewards 페이지의 탭 타겟
  {
    target: '[data-tour="inventory-items-tab"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">📦 보상함 (보유 아이템)</div>
        <div className="text-sm leading-snug break-keep">
          구매하거나 선물 받은 아이템은 모두 <strong>보상함</strong>에 보관됩니다.
          <br />
          <span className="text-amber-400">언제든지 꺼내 쓸 수 있어요!</span>
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
    spotlightPadding: 5,
  },
  // 8. 이벤트/미션 탭 (Index 7)
  {
    target: '[data-tour="nav-events"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🎉 이벤트/미션</div>
        <div className="text-sm leading-snug break-keep">
          다양한 <strong>보상과 이벤트</strong>를 확인하려면 여기를 누르세요.
          <br />
          <span className="text-emerald-400">미션도 여기서 시작합니다!</span>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 9. 이벤트 대시보드 - 미션 카드 (Index 8)
  {
    target: '[data-tour="event-mission-card"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🎯 데일리 미션</div>
        <div className="text-sm leading-snug break-keep">
          매일 주어지는 미션을 완료하면 <strong>다이아</strong>를 드립니다.
          <br />
          눌러서 미션을 확인해보세요.
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  // 10. 미션 보상 (Index 9) -> /missions
  {
    target: '[data-tour="mission-claim-btn"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">💰 보상 받기</div>
        <div className="text-sm leading-snug break-keep">
          미션을 완료했다면 <strong>이 버튼</strong>을 눌러 보상을 챙기세요.
          <div className="mt-2 text-amber-400">잊지 말고 꼭 챙겨가세요!</div>
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  // 11. 이벤트 모달 카드 (Index 10) -> /events
  {
    target: '[data-tour="event-modals-card"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">🎫 이벤트 모음</div>
        <div className="text-sm leading-snug break-keep">
          스트릭, 한정 혜택 등 <strong>모든 이벤트 팝업</strong>을 다시 보려면
          여기를 누르세요.
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  // 12. 모달 페이지 (Index 11) -> /events/modals
  {
    target: '[data-tour="event-modal-list"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">✨ 진행 중인 혜택</div>
        <div className="text-sm leading-snug break-keep">
          현재 참여 가능한 모든 혜택이 여기에 있습니다.
          <br />
          <strong>하나씩 눌러서 확인해보세요!</strong>
        </div>
      </div>
    ),
    placement: "center",
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
    arrowColor: "#22c55e",
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

  // 스텝별 페이지 이동 로직 (Flow Control)
  // 0: 홈, 1: 게임, 2: 금고 Nav, 3: 금고 Page, 4: 금고 버튼, 5: 출금 안내
  // 6: 상점 Nav, 7: 보상함 Page, 8: 이벤트 Nav, 9: 미션 Page, 10: 미션 보상
  useEffect(() => {
    if (!isGuideRunning) return;

    // Step 3, 4, 5: 금고 페이지 유지
    if (stepIndex >= 3 && stepIndex <= 5) {
      if (!location.pathname.startsWith("/vault")) {
        navigate("/vault");
      }
    }

    // Step 7: 보상함 (자동이동) -> Index 6
    if (stepIndex === 6) {
      if (!location.pathname.startsWith("/rewards")) {
        navigate("/rewards");
      }
    }

    // Step 8, 9, 11 (Index 7, 8, 10): 이벤트 대시보드
    // /events 페이지로 이동 (단, /events/modals는 아님)
    if (stepIndex === 7 || stepIndex === 8 || stepIndex === 10) {
      if (location.pathname !== "/events") {
        navigate("/events");
      }
    }

    // Step 10 (Index 9): 미션 페이지
    if (stepIndex === 9) {
      if (!location.pathname.startsWith("/missions")) {
        navigate("/missions");
      }
    }

    // Step 12 (Index 11): 이벤트 모달 페이지
    if (stepIndex === 11) {
      if (!location.pathname.startsWith("/events/modals")) {
        navigate("/events/modals");
      }
    }
  }, [stepIndex, isGuideRunning, navigate, location.pathname]);

  // 타겟 대기 로직
  useEffect(() => {
    if (!isGuideRunning) return;

    // 페이지 이동 직후 타겟이 없을 수 있으므로 대기
    // 이동 그룹 업데이트 (Index 0~11 커버)
    const movingSteps = [3, 4, 5, 6, 7, 8, 9, 10, 11]; 
    if (movingSteps.includes(stepIndex)) {
      const selector = guideSteps[stepIndex]?.target;
      if (typeof selector !== "string") return;

      setIsTargetReady(false);
      let cancelled = false;
      
      (async () => {
        // Body 타겟은 즉시 반환 (Step 9)
        if (selector === "body") {
          setIsTargetReady(true);
          return;
        }

        // 로딩 시간 고려 넉넉히 대기
        const el = await waitForVisibleTarget(selector, 8000, 100);
        if (cancelled) return;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
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
