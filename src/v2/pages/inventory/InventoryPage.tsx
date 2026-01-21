import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import {
  PackageOpen,
  Sparkles,
  Gift,
  Ticket,
  ArrowUpRight,
} from "lucide-react";
import {
  useV2Inventory,
  useV2UseInventoryItem,
} from "../../hooks/useV2Inventory";
import { Button } from "../../components/ui/button";

export default function InventoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useV2Inventory();
  const useItemMutation = useV2UseInventoryItem();

  const items = useMemo(() => data?.items ?? [], [data]);
  const wallet = data?.wallet ?? {};

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".inventory-hero",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
      );
      if (listRef.current) {
        gsap.fromTo(
          listRef.current.children,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.07,
          },
        );
      }
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.55,
          scale: 1.03,
          duration: 2.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, [items.length]);

  return (
    <div ref={containerRef} className="min-h-full px-4 py-6">
      <section className="inventory-hero relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 mb-6">
        <div
          ref={glowRef}
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_70%_20%,_rgba(212,175,55,0.18)_0%,_transparent_60%),_radial-gradient(ellipse_at_20%_30%,_rgba(196,30,58,0.12)_0%,_transparent_55%)]"
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
            <Sparkles className="w-4 h-4" />
            설날 인벤토리
          </div>
          <h1 className="text-2xl font-black mt-2 text-[#F5F5DC]">
            골드 & 레드 글래스 보관함
          </h1>
          <p className="text-sm mt-2 text-white/60">
            보유 아이템과 티켓을 한눈에 확인하고 즉시 사용하세요.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/v2/shop"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border border-white/10 bg-white/10 text-white/80 hover:text-white"
            >
              교환소로 이동 <ArrowUpRight className="w-4 h-4" />
            </Link>
            <span className="text-xs text-white/40">
              교환/사용 시 자동 갱신됩니다.
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-6">
        {Object.keys(wallet).length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50">
            현재 보유 지갑 정보가 없습니다.
          </div>
        ) : (
          Object.entries(wallet).map(([token, balance]) => (
            <div
              key={token}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Ticket className="w-3.5 h-3.5" />
                {token}
              </div>
              <div className="text-lg font-black text-white mt-1">
                {balance}
              </div>
            </div>
          ))
        )}
      </section>

      <section ref={listRef} className="space-y-4">
        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
            인벤토리를 불러오는 중...
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">
            인벤토리 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
          </div>
        )}
        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
            현재 보유 중인 아이템이 없습니다.
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.item_type}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5"
          >
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0)_55%,_rgba(196,30,58,0.12)_100%)]" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center border bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.4)]">
                  <Gift className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {item.item_type}
                  </h3>
                  <p className="text-xs text-white/60 mt-1">
                    설날 한정 보관 아이템
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/50">보유 수량</div>
                <div className="text-lg font-black text-white">
                  {item.quantity}
                </div>
              </div>
            </div>
            <div className="relative z-10 mt-4 flex items-center gap-3">
              <Button
                disabled={useItemMutation.isPending || item.quantity <= 0}
                onClick={() =>
                  useItemMutation.mutate({
                    item_type: item.item_type,
                    quantity: 1,
                  })
                }
                className="h-11 rounded-2xl px-4 text-black font-black bg-[linear-gradient(135deg,_rgba(212,175,55,0.95)_0%,_rgba(196,30,58,0.95)_100%)]"
              >
                즉시 사용
              </Button>
              <div className="text-xs text-white/50">
                사용 시 보상은 자동으로 반영됩니다.
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#C41E3A]">
          <PackageOpen className="w-4 h-4" />
          설날 보관함 안내
        </div>
        <p className="text-xs text-white/50 mt-2">
          사용 가능한 아이템은 교환소에서 즉시 충전할 수 있으며, 일부 아이템은
          이벤트 조건 달성 시 자동 지급됩니다.
        </p>
      </section>
    </div>
  );
}
