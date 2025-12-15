import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Prize {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_value: string | number;
  readonly stock?: number | null;
  readonly is_active?: boolean;
  readonly weight?: number;
}

interface LotteryCardProps {
  readonly prize?: Prize;
  readonly isRevealed: boolean;
  readonly isScratching: boolean;
  readonly onScratch: () => void;
}

const LotteryCard: React.FC<LotteryCardProps> = ({ prize, isRevealed, isScratching, onScratch }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const sampleCounterRef = useRef(0);
  const overlayHiddenRef = useRef(false);
  const requestedRef = useRef(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [overlayCleared, setOverlayCleared] = useState(false);

  const disabled = useMemo(() => overlayCleared, [overlayCleared]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  const redrawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // Base foil gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(255,255,255,0.4)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.15)");
    gradient.addColorStop(1, "rgba(255,255,255,0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Scatter texture
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    const texturePoints = Math.floor((width * height) / 180);
    for (let i = 0; i < texturePoints; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, 2, 2);
    }

    // Center prompt text
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "600 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("긁어서 확인하세요 ✨", width / 2, height / 2);

    overlayHiddenRef.current = false;
    requestedRef.current = false;
    setOverlayCleared(false);
    if (canvas) {
      canvas.style.opacity = "0.9";
      canvas.style.pointerEvents = "auto";
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    redrawOverlay();
    const handleResize = () => {
      resizeCanvas();
      redrawOverlay();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redrawOverlay]);

  useEffect(() => {
    if (!isRevealed) {
      setScratchProgress(0);
      redrawOverlay();
      isDrawingRef.current = false;
      requestedRef.current = false;
    }
  }, [isRevealed, redrawOverlay]);

  const scratchAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const radius = Math.max(16, Math.min(rect.width, rect.height) * 0.06);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    sampleCounterRef.current += 1;
    if (sampleCounterRef.current % 4 === 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let transparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparent += 1;
      }
      const ratio = transparent / (imageData.data.length / 4);
      const percent = Math.min(100, Math.round(ratio * 100));
      setScratchProgress(percent);

      if (!overlayHiddenRef.current && ratio > 0.6) {
        overlayHiddenRef.current = true;
        setOverlayCleared(true);
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "none";
      }
    }
  };

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    if (disabled) return;
    isDrawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (!overlayHiddenRef.current) {
      setScratchProgress(0);
    }

    if (!requestedRef.current) {
      requestedRef.current = true;
      onScratch();
    }
    scratchAt(e.clientX, e.clientY);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    if (!isDrawingRef.current || disabled) return;
    scratchAt(e.clientX, e.clientY);
  };

  const handlePointerUpOrLeave: React.PointerEventHandler<HTMLCanvasElement> = () => {
    isDrawingRef.current = false;
  };

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative overflow-hidden rounded-3xl border-4 border-gold-500 bg-gradient-to-br from-red-900 via-red-800 to-green-900 p-8 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        <div className="absolute left-4 top-4 text-4xl opacity-20">🎄</div>
        <div className="absolute bottom-4 right-4 text-4xl opacity-20">🎁</div>
        <div className="absolute right-4 top-4 text-4xl opacity-20">⭐</div>
        <div className="absolute bottom-4 left-4 text-4xl opacity-20">❄️</div>

        <div className="relative min-h-[200px] rounded-2xl border-2 border-gold-400/50 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
          <div
            ref={containerRef}
            className="relative flex h-full min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-900"
            style={{ touchAction: "none" }}
          >
            {/* Underlay: prize/result is always rendered, and the canvas overlay is scratched away */}
            <div className="relative z-10 flex flex-col items-center text-center">
              {!isRevealed ? (
                <>
                  <div className="mb-4 text-5xl">🎫</div>
                  <p className="text-lg font-bold text-gold-300">{isScratching ? "결과 생성 중..." : "긁어서 결과를 확인하세요"}</p>
                  <p className="mt-2 text-sm text-slate-400">터치/클릭 후 긁어보세요.</p>
                </>
              ) : prize ? (
                <>
                  <div className={`mb-2 text-5xl ${overlayCleared ? "animate-bounce-in" : ""}`}>🎉</div>
                  <p className="text-sm uppercase tracking-wider text-gold-400">축하합니다!</p>
                  <p className="mt-2 text-2xl font-bold text-white">{prize.label}</p>
                  <p className="mt-1 text-sm text-emerald-300">
                    {prize.reward_type} +{prize.reward_value}
                  </p>
                </>
              ) : (
                <>
                  <div className={`mb-2 text-5xl ${overlayCleared ? "animate-bounce-in" : ""}`}>💨</div>
                  <p className="text-xl font-bold text-slate-300">다음 기회에!</p>
                  <p className="mt-2 text-sm text-slate-400">다시 시도해 주세요.</p>
                </>
              )}

              <p className="mt-2 text-xs text-emerald-300">{scratchProgress}% 제거됨</p>
            </div>

            <canvas
              ref={canvasRef}
              className={`absolute inset-0 cursor-pointer transition-opacity ${disabled ? "opacity-0" : "opacity-80"}`}
              style={{ touchAction: "none", pointerEvents: disabled ? "none" : "auto" }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePointerDown(e);
              }}
              onPointerMove={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePointerMove(e);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePointerUpOrLeave(e);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePointerUpOrLeave(e);
              }}
              onPointerLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePointerUpOrLeave(e);
              }}
            />
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">스크래치 해서 경품 확인</p>
        </div>
      </div>
    </div>
  );
};

export default LotteryCard;
