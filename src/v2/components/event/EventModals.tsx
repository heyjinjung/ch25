import React from "react";
import { X, CheckCircle2, Clock, Gift, Users, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MatrixText } from "../ui/MatrixText";
import { Button } from "../ui/button";

interface EventModalsProps {
  selectedId: string | null;
  onClose: () => void;
}

export const EventModals: React.FC<EventModalsProps> = ({ selectedId, onClose }) => {
  const renderModalContent = () => {
    switch (selectedId) {
      case "attendance":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-orange-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">연속출석 이벤트</h2>
              <p className="text-sm text-white/50 px-4">매일 접속만 해도 쏟아지는 혜택!<br/>7일 연속 출석 시 잭팟 기회가 주어집니다.</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h4 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">출석 보상 가이드</h4>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm font-bold text-white/80">{day}일차</span>
                    <span className="text-sm font-black text-amber-500">{day === 7 ? "럭키박스 🎁" : "보너스 포인트 💎"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "golden":
        return (
          <div className="space-y-6">
             <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-4">
                <Clock size={32} className="text-yellow-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">골든아워 이벤트</h2>
              <p className="text-sm text-white/50 px-4">언제 터질지 모르는 황금빛 찬스!<br/>이벤트는 랜덤으로 발생하며 발생 시 알림이 전송됩니다.</p>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border border-yellow-500/20 relative overflow-hidden">
               <div className="relative z-10 text-center">
                  <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mb-2 block">Current Status</span>
                  <div className="text-3xl font-black text-white mb-2 italic">STAND-BY</div>
                  <p className="text-xs text-white/40">알림 설정을 켜두시면 누구보다 빠르게<br/>참여하실 수 있습니다.</p>
               </div>
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <MatrixText text="GOLDEN" />
               </div>
            </div>
          </div>
        );

      case "newuser":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Gift size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">신규유저 이벤트</h2>
              <p className="text-sm text-white/50 px-4">지민코드가 환영하는 첫 발걸음!<br/>가입 후 첫 미션을 완료하고 웰컴 패키지를 받으세요.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
               {[
                 { t: "텔레그램 채널 입장", b: "루렛 1회권" },
                 { t: "첫 입금 완료 (1만이상)", b: "보너스 포인트" },
                 { t: "첫 게임 플레이", b: "럭키 박스" }
               ].map((step, i) => (
                 <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-500">
                       0{i+1}
                    </div>
                    <div>
                       <div className="text-sm font-bold text-white">{step.t}</div>
                       <div className="text-[11px] text-emerald-500/80">{step.b} 지급</div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        );

      case "deposit":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
                <CreditCard size={32} className="text-blue-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">입금지연 보상</h2>
              <p className="text-sm text-white/50 px-4">지연의 아쉬움을 즐거움으로 보답합니다.<br/>처리가 늦어질 경우 즉시 보너스가 지급됩니다.</p>
            </div>

            <div className="bg-blue-500/5 rounded-[32px] p-8 border border-blue-500/20 text-center">
               <h3 className="text-lg font-black text-white mb-2">보상 내용</h3>
               <div className="inline-block py-2 px-6 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
                  <span className="text-2xl font-black text-blue-400">🎁 룰렛 티켓 3장</span>
               </div>
               <p className="text-xs text-white/40 leading-relaxed">충전 신청 후 처리가 지연될 경우<br/>고객센터 문의 시 확인 후 즉시 지급해 드립니다.</p>
            </div>
          </div>
        );

      case "teambattle":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Users size={32} className="text-purple-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">팀배틀 이벤트</h2>
              <p className="text-sm text-white/50 px-4">함께해서 더 즐겁고 확실한 승리!<br/>팀 배틀 이벤트가 곧 공개될 예정입니다.</p>
            </div>

            <div className="relative aspect-video rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 group">
                <div className="absolute inset-0 bg-[url('/assets/bg_pattern.png')] opacity-20 bg-repeat bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                   <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎪</div>
                   <div className="text-xl font-black text-white uppercase tracking-widest italic mb-2">COMING SOON</div>
                   <p className="text-[11px] text-white/40">역대급 상금과 짜릿한 대결을 준비 중입니다.<br/>조금만 더 기다려 주세요!</p>
                </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {selectedId && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center px-4 pb-[env(safe-area-inset-bottom)] sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar rounded-t-[40px] sm:rounded-[40px] border border-white/10 bg-[#121214] p-6 shadow-2xl shadow-black/50"
          >
            {/* Handle Bar on Mobile */}
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {renderModalContent()}

            <div className="mt-8 pt-6 border-t border-white/5">
               <Button 
                onClick={onClose} 
                className="w-full h-14 rounded-2xl bg-white text-black font-black text-lg hover:bg-neutral-200 transition-colors"
               >
                  확인
               </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
