// src/components/guide/AppGuide.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, Styles, TooltipRenderProps } from "react-joyride";
import { useGuide } from "../../contexts/GuideContext";
import { useNavigate, useLocation } from "react-router-dom";

// ?œë‹ˆ??ì¹œí™”????ê¸€?? ëª…í™•???œê? ?ˆë‚´
// ?„ì²´ ?Œë¡œ??ìµœì‹ ): ????ê²Œì„ ??ê¸ˆê³  ??ì¶œê¸ˆì¡°ê±´ë²„íŠ¼ ??ì¶œê¸ˆ?ˆë‚´ ???ì  ??ë³´ìƒ?????´ë²¤????ë¯¸ì…˜ ??ë³´ìƒ?˜ë ¹
const guideSteps: Step[] = [
  // 1. ??
  {
    target: '[data-tour="nav-home"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?  ??/div>
        <div className="text-sm leading-snug break-keep">
          ?¬ê¸°??<strong>??/strong>?…ë‹ˆ?? ê²Œì„ ëª©ë¡ê³?ì£¼ìš” ê¸°ëŠ¥??ë³????ˆì–´??
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 2. ê²Œì„
  {
    target: '[data-tour="nav-games"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?® ê²Œì„</div>
        <div className="text-sm leading-snug break-keep">
          <strong>ë£°ë ›, ì£¼ì‚¬?? ë³µê¶Œ</strong> ê²Œì„???˜ë ¤ë©??¬ê¸°ë¥??„ë¥´?¸ìš”.
          <div className="mt-2 text-amber-400">?’¡ ?°ì¼“???ˆì–´??ê²Œì„???????ˆì–´??</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 3. ê¸ˆê³ 
  {
    target: '[data-tour="nav-vault"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?” ê¸ˆê³ </div>
        <div className="text-sm leading-snug break-keep">
          <strong>??ë³´ìƒ ê¸ˆì•¡</strong>???•ì¸?˜ë ¤ë©??¬ê¸°ë¥??ŒëŸ¬ ê¸ˆê³ ë¡?ê°€?¸ìš”.
          <div className="mt-2 text-emerald-400">??ê²Œì„?ì„œ ?»ì? ë³´ìƒ???¬ê¸°???“ì—¬??</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 4. ê¸ˆê³  ì¶œê¸ˆ ì¡°ê±´ ë²„íŠ¼ (ê¸ˆê³  ?˜ì´ì§€ ??
  {
    target: '[data-tour="vault-condition-btn"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?“‹ ì¶œê¸ˆ ì¡°ê±´</div>
        <div className="text-sm leading-snug break-keep">
          ?ê¸ˆ??ì¶œê¸ˆ?˜ë ¤ë©?ì¡°ê±´???„ìš”?´ìš”.
          <br />
          <strong>??ë²„íŠ¼</strong>???ŒëŸ¬ ?„ì¬ ?¬ì„± ?„í™©???•ì¸?????ˆìŠµ?ˆë‹¤.
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 5. ì¶œê¸ˆ ?ˆë‚´ (?”ë©´ ì¤‘ì•™ or ë²„íŠ¼) -> Step 5ê°€ "?ˆë‚´"
  {
    target: '[data-tour="vault-condition-btn"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?’¡ ê¸ˆê³  ?´ì œ ??/div>
        <div className="text-sm leading-snug break-keep">
          ì¶œê¸ˆ ì¡°ê±´??ì±„ìš°ê¸??„í•´ <strong>ê²Œì„ ?Œë ˆ??/strong>?€ <strong>?ì  ?„ì´??êµ¬ë§¤</strong>ê°€ ?„ì????©ë‹ˆ??
          <div className="mt-2 text-emerald-400">?´ì œ ?ì ?¼ë¡œ ê°€ë³¼ê¹Œ??</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 6. ?ì  (?˜ë‹¨ ?¤ë¹„)
  {
    target: '[data-tour="nav-shop"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?›’ êµí™˜??(?ì )</div>
        <div className="text-sm leading-snug break-keep">
          ?¬ê¸°??<strong>?°ì¼“ê³??„ì´??/strong>??êµ¬ë§¤?˜ê³  êµí™˜?????ˆì–´??
          <div className="mt-2 text-white/70">êµ¬ë§¤???„ì´?œì? ë°”ë¡œ ë³´ìƒ?¨ìœ¼ë¡?ê°‘ë‹ˆ??</div>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 7. ë³´ìƒ??(?ë™?´ë™) -> /rewards ?˜ì´ì§€?????€ê²?
  {
    target: '[data-tour="inventory-items-tab"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?“¦ ë³´ìƒ??(ë³´ìœ  ?„ì´??</div>
        <div className="text-sm leading-snug break-keep">
          êµ¬ë§¤?˜ê±°??? ë¬¼ ë°›ì? ?„ì´?œì? ëª¨ë‘ <strong>ë³´ìƒ??/strong>??ë³´ê??©ë‹ˆ??
          <br />
          <span className="text-amber-400">?¸ì œ? ì? êº¼ë‚´ ?????ˆì–´??</span>
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
    spotlightPadding: 5,
  },
  // 8. ?´ë²¤??ë¯¸ì…˜ ??(Index 7)
  {
    target: '[data-tour="nav-events"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?‰ ?´ë²¤??ë¯¸ì…˜</div>
        <div className="text-sm leading-snug break-keep">
          ?¤ì–‘??<strong>ë³´ìƒê³??´ë²¤??/strong>ë¥??•ì¸?˜ë ¤ë©??¬ê¸°ë¥??„ë¥´?¸ìš”.
          <br />
          <span className="text-emerald-400">ë¯¸ì…˜???¬ê¸°???œì‘?©ë‹ˆ??</span>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  // 9. ?´ë²¤???€?œë³´??- ë¯¸ì…˜ ì¹´ë“œ (Index 8)
  {
    target: '[data-tour="event-mission-card"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?¯ ?°ì¼ë¦?ë¯¸ì…˜</div>
        <div className="text-sm leading-snug break-keep">
          ë§¤ì¼ ì£¼ì–´ì§€??ë¯¸ì…˜???„ë£Œ?˜ë©´ <strong>?¤ì´??/strong>ë¥??œë¦½?ˆë‹¤.
          <br />
          ?ŒëŸ¬??ë¯¸ì…˜???•ì¸?´ë³´?¸ìš”.
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  // 10. ë¯¸ì…˜ ë³´ìƒ (Index 9) -> /missions
  {
    target: '[data-tour="mission-claim-btn"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?’° ë³´ìƒ ë°›ê¸°</div>
        <div className="text-sm leading-snug break-keep">
          ë¯¸ì…˜???„ë£Œ?ˆë‹¤ë©?<strong>??ë²„íŠ¼</strong>???ŒëŸ¬ ë³´ìƒ??ì±™ê¸°?¸ìš”.
          <div className="mt-2 text-amber-400">?Šì? ë§ê³  ê¼?ì±™ê²¨ê°€?¸ìš”!</div>
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  // 11. ?´ë²¤??ëª¨ë‹¬ ì¹´ë“œ (Index 10) -> /events
  {
    target: '[data-tour="event-modals-card"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">?« ?´ë²¤??ëª¨ìŒ</div>
        <div className="text-sm leading-snug break-keep">
          ?¤íŠ¸ë¦? ?œì • ?œíƒ ??<strong>ëª¨ë“  ?´ë²¤???ì—…</strong>???¤ì‹œ ë³´ë ¤ë©?
          ?¬ê¸°ë¥??„ë¥´?¸ìš”.
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  // 12. ëª¨ë‹¬ ?˜ì´ì§€ (Index 11) -> /events/modals
  {
    target: '[data-tour="event-modal-list"]',
    content: (
      <div className="text-left">
        <div className="text-lg font-black mb-2">??ì§„í–‰ ì¤‘ì¸ ?œíƒ</div>
        <div className="text-sm leading-snug break-keep">
          ?„ì¬ ì°¸ì—¬ ê°€?¥í•œ ëª¨ë“  ?œíƒ???¬ê¸°???ˆìŠµ?ˆë‹¤.
          <br />
          <strong>?˜ë‚˜???ŒëŸ¬???•ì¸?´ë³´?¸ìš”!</strong>
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

// ?€ê²Ÿì´ ?¤ì œë¡??”ë©´??ë³´ì¼ ?Œê¹Œì§€ ?´ë§ (sr-only ?œì™¸)
const waitForVisibleTarget = (
  selector: string,
  maxWait = 2000,
  interval = 100
): Promise<HTMLElement | null> => {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      // sr-only ?´ë˜?¤ê? ?†ê³  offsetParentê°€ ?ˆìœ¼ë©??”ë©´??ë³´ì´??ê²?
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

// ?œë‹ˆ??ì¹œí™”???¤í???(??ê¸€?? ?’ì? ?€ë¹? ?“ì? ë²„íŠ¼)
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

// ì»¤ìŠ¤?€ ?´íŒ (?œë‹ˆ??ì¹œí™”????ë²„íŠ¼)
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
          ê±´ë„ˆ?°ê¸°
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
            ???´ì „
          </button>
        )}
        <div className="flex-1" />
        <button
          {...primaryProps}
          className="bg-emerald-500 hover:bg-emerald-400 text-black text-base font-black px-6 py-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-900/30"
        >
          {continuous && index < size - 1 ? "?¤ìŒ ?? : "?„ë£Œ! ??}
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

  // ?¤í…ë³??˜ì´ì§€ ?´ë™ ë¡œì§ (Flow Control)
  // 0: ?? 1: ê²Œì„, 2: ê¸ˆê³  Nav, 3: ê¸ˆê³  Page, 4: ê¸ˆê³  ë²„íŠ¼, 5: ì¶œê¸ˆ ?ˆë‚´
  // 6: ?ì  Nav, 7: ë³´ìƒ??Page, 8: ?´ë²¤??Nav, 9: ë¯¸ì…˜ Page, 10: ë¯¸ì…˜ ë³´ìƒ
  useEffect(() => {
    if (!isGuideRunning) return;

    // Step 3, 4, 5: ê¸ˆê³  ?˜ì´ì§€ ? ì?
    if (stepIndex >= 3 && stepIndex <= 5) {
      if (!location.pathname.startsWith("/vault")) {
        navigate("/vault");
      }
    }

    // Step 7: ë³´ìƒ??(?ë™?´ë™) -> Index 6
    if (stepIndex === 6) {
      if (!location.pathname.startsWith("/rewards")) {
        navigate("/rewards");
      }
    }

    // Step 8, 9, 11 (Index 7, 8, 10): ?´ë²¤???€?œë³´??
    // /events ?˜ì´ì§€ë¡??´ë™ (?? /events/modals???„ë‹˜)
    if (stepIndex === 7 || stepIndex === 8 || stepIndex === 10) {
      if (location.pathname !== "/events") {
        navigate("/events");
      }
    }

    // Step 10 (Index 9): ë¯¸ì…˜ ?˜ì´ì§€
    if (stepIndex === 9) {
      if (!location.pathname.startsWith("/missions")) {
        navigate("/missions");
      }
    }

    // Step 12 (Index 11): ?´ë²¤??ëª¨ë‹¬ ?˜ì´ì§€
    if (stepIndex === 11) {
      if (!location.pathname.startsWith("/events/modals")) {
        navigate("/events/modals");
      }
    }
  }, [stepIndex, isGuideRunning, navigate, location.pathname]);

  // ?€ê²??€ê¸?ë¡œì§
  useEffect(() => {
    if (!isGuideRunning) return;

    // ?˜ì´ì§€ ?´ë™ ì§í›„ ?€ê²Ÿì´ ?†ì„ ???ˆìœ¼ë¯€ë¡??€ê¸?
    // ?´ë™ ê·¸ë£¹ ?…ë°?´íŠ¸ (Index 0~11 ì»¤ë²„)
    const movingSteps = [3, 4, 5, 6, 7, 8, 9, 10, 11]; 
    if (movingSteps.includes(stepIndex)) {
      const selector = guideSteps[stepIndex]?.target;
      if (typeof selector !== "string") return;

      setIsTargetReady(false);
      let cancelled = false;
      
      (async () => {
        // Body ?€ê²Ÿì? ì¦‰ì‹œ ë°˜í™˜ (Step 9)
        if (selector === "body") {
          setIsTargetReady(true);
          return;
        }

        // ë¡œë”© ?œê°„ ê³ ë ¤ ?‰ë„‰???€ê¸?
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

      // ?€ê²Ÿì„ ëª?ì°¾ìœ¼ë©???ë²????¤í¬ë¡????¬ì‹œ?? ê·¸ë‹¤?Œì—ë§??¨ìŠ¤
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

      // ?„ë£Œ ?ëŠ” ?¤í‚µ
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        errorRetryRef.current.clear();
        stopGuide();
        markGuideSeen();
        return;
      }

      // ?«ê¸° ë²„íŠ¼
      if (action === ACTIONS.CLOSE) {
        stopGuide();
        return;
      }

      // ?¤í… ë³€ê²?
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
        back: "?´ì „",
        close: "?«ê¸°",
        last: "?„ë£Œ",
        next: "?¤ìŒ",
        skip: "ê±´ë„ˆ?°ê¸°",
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};

export default AppGuide;
