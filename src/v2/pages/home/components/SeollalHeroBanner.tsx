// src/pages/home/components/SeollalHeroBanner.tsx
// ?¤ë‚  ?Œë§ˆ ?ˆì–´ë¡?ë°°ë„ˆ - ?°ë“± ?¨ê³¼ ?¬í•¨
import { useRef, useEffect } from "react";
import gsap from "gsap";

export function SeollalHeroBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // ?°ë“± ?¨ê³¼ - ?€?€??ë¹??”ë“¤ë¦?
  useEffect(
    () => {
      if (!glowRef.current) return;

      const anim = gsap.to(glowRef.current, {
        opacity: gsap.utils.random(0.6, 1),
        scale: gsap.utils.random(0.98, 1.02),
        duration: gsap.utils.random(1.5, 2.5),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      
      return () => { anim.kill(); };
    },
    []
  );

  return (
    <div
      ref={bannerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d1f1f 50%, #1a1a1a 100%)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
      }}
    >
      {/* ?°ë“± ê¸€ë¡œìš° ?¨ê³¼ */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 50%)",
        }}
      />

      {/* ?„í†µ ë¬¸ì–‘ ?¨í„´ (ë¯¸ë¬˜??ë°°ê²½) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L45 15L30 30L15 15z' fill='%23D4AF37'/%3E%3C/svg%3E")`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* ì½˜í…ì¸?*/}
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* ë¡œê³  */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">?§§</span>
              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: "#D4AF37" }}
              >
                CC CASINO
              </span>
            </div>

            {/* ?€?´í? */}
            <h2
              className="text-xl font-bold mb-1"
              style={{ color: "#F5F5DC" }}
            >
              ?¤ë‚  ?¹ë³„ ?´ë²¤??
            </h2>
            <p className="text-sm text-zinc-400">
              ?ˆí•´ ë³?ë§ì´ ë°›ìœ¼?¸ìš”! ?Š
            </p>

            {/* XP ?œì‹œ */}
            <div className="flex items-center gap-2 mt-3">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(212, 175, 55, 0.2)",
                  color: "#D4AF37",
                }}
              >
                +20 XP
              </span>
            </div>
          </div>

          {/* CTA ë²„íŠ¼ */}
          <button
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: "#C41E3A",
              color: "#F5F5DC",
              boxShadow: "0 4px 12px rgba(196, 30, 58, 0.4)",
            }}
          >
            ?§§ ë³µì£¼ë¨¸ë‹ˆ ë°›ê¸°
          </button>
        </div>
      </div>

      {/* ê¸ˆë°• ?Œë‘ë¦??¨ê³¼ */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "inset 0 0 20px rgba(212, 175, 55, 0.05)",
        }}
      />
    </div>
  );
}
