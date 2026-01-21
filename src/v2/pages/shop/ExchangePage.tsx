import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ShoppingBag, Sparkles, Ticket, ArrowUpRight } from "lucide-react";
import { useV2ShopProducts, useV2PurchaseProduct } from "../../hooks/useV2Shop";
import { useV2Inventory } from "../../hooks/useV2Inventory";
import { Button } from "../../components/ui/button";

export default function ExchangePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  const { data: products, isLoading, error } = useV2ShopProducts();
  const { data: inventory } = useV2Inventory();
  const purchaseMutation = useV2PurchaseProduct();

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return [...products].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    );
  }, [products]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".exchange-hero",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
      );
      gsap.fromTo(
        ".exchange-card",
        { opacity: 0, y: 22, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
        },
      );
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.6,
          scale: 1.02,
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleCardEnter = (index: number) => {
    const target = cardRefs.current[index];
    if (!target) return;
    gsap.to(target, {
      y: -6,
      boxShadow: "0 18px 50px rgba(212, 175, 55, 0.25)",
      duration: 0.25,
      ease: "power2.out",
    });
  };

  const handleCardLeave = (index: number) => {
    const target = cardRefs.current[index];
    if (!target) return;
    gsap.to(target, {
      y: 0,
      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
      duration: 0.25,
      ease: "power2.out",
    });
  };

  const walletBalance = inventory?.wallet ?? {};

  return (
    <div ref={containerRef} className="min-h-full px-4 py-6">
      <section className="exchange-hero relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 mb-6">
        <div
          ref={glowRef}
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_20%_20%,_rgba(212,175,55,0.18)_0%,_transparent_60%),_radial-gradient(ellipse_at_80%_30%,_rgba(196,30,58,0.12)_0%,_transparent_55%)]"
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
            <Sparkles className="w-4 h-4" />
            설날 교환소
          </div>
          <h1 className="text-2xl font-black mt-2 text-[#F5F5DC]">
            골드 & 레드 글래스모피즘 교환소
          </h1>
          <p className="text-sm mt-2 text-white/60">
            보유 티켓과 재화를 원하는 보상으로 즉시 교환하세요.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/v2/inventory"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border border-white/10 bg-white/10 text-white/80 hover:text-white"
            >
              인벤토리 보기 <ArrowUpRight className="w-4 h-4" />
            </Link>
            <span className="text-xs text-white/40">
              티켓 잔액이 자동 반영됩니다.
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-6">
        {Object.keys(walletBalance).length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50">
            현재 보유 지갑 정보가 없습니다.
          </div>
        ) : (
          Object.entries(walletBalance).map(([token, balance]) => (
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

      <section className="space-y-4">
        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
            교환소 상품을 불러오는 중...
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">
            교환소 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
          </div>
        )}
        {!isLoading && !error && sortedProducts.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
            현재 교환 가능한 상품이 없습니다.
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          {sortedProducts.map((product, index) => (
            <div
              key={product.id}
              ref={(el) => {
                if (el) cardRefs.current[index] = el;
              }}
              onMouseEnter={() => handleCardEnter(index)}
              onMouseLeave={() => handleCardLeave(index)}
              className="exchange-card group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            >
              <div className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[linear-gradient(135deg,_rgba(212,175,55,0.35)_0%,_rgba(196,30,58,0.35)_100%)]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {product.reward_type}
                </div>
                <div className="text-lg font-black text-white mt-1">
                  {product.reward_amount}
                </div>
                <div className="mt-3 text-xs text-white/50">
                  {product.cost_type} · {product.cost_amount}
                </div>
                <Button
                  disabled={purchaseMutation.isPending || !product.is_active}
                  onClick={() => purchaseMutation.mutate({ sku: product.id })}
                  className="mt-3 w-full h-9 rounded-xl font-black text-black bg-[linear-gradient(135deg,_rgba(212,175,55,0.95)_0%,_rgba(196,30,58,0.95)_100%)]"
                >
                  {product.is_active ? "즉시 교환" : "교환 불가"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
