import React, { useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getNewUserStatus } from "../api/newUserApi";
import Modal from "../components/common/Modal";
import { useMissionStore } from "../stores/missionStore";
import { Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/common/ToastProvider";

const formatSeconds = (seconds: number | null | undefined) => {
  if (seconds == null) return "-";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
};

const Row: React.FC<{ done: boolean; title: string; desc?: string; action?: React.ReactNode }> = ({ done, title, desc, action }) => {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={done ? "text-emerald-400" : "text-white/40"}>{done ? "✓" : "•"}</span>
          <p className="font-black text-white">{title}</p>
        </div>
        {desc ? <p className="mt-1 text-sm text-white/55">{desc}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

const NewUserWelcomePage: React.FC = () => {
  const status = useQuery({
    queryKey: ["new-user-status"],
    queryFn: getNewUserStatus,
    staleTime: 10_000,
    retry: false,
  });

  const { claimReward } = useMissionStore();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [targetMissionId, setTargetMissionId] = React.useState<number | null>(null);

  // Check for completed but unclaimed LOGIN mission
  React.useEffect(() => {
    if (!status.data?.missions) return;

    // Find Day 2 Login mission (Action: LOGIN, Target: 2 usually, or just finding the login mission)
    // Based on logic, we want the one that is COMPLETED but NOT CLAIMED.
    const loginMission = status.data.missions.find(
      (m) => m.action_type === "LOGIN" && m.is_completed && !m.is_claimed
    );

    if (loginMission) {
      setTargetMissionId(loginMission.id);
      setShowSuccessModal(true);
    }
  }, [status.data?.missions]);

  const handleClaimReward = async () => {
    if (!targetMissionId) return;

    try {
      const result = await claimReward(targetMissionId);
      if (result.success) {
        addToast("보상이 지급되었습니다!", "success");
        setShowSuccessModal(false);
        // Refresh status to update UI (remove checkmark, show claimed state if supported, or just hide modal)
        queryClient.invalidateQueries({ queryKey: ["new-user-status"] });
        // Also refresh global mission store if needed
        useMissionStore.getState().fetchMissions();
      } else {
        addToast(result.message || "보상 수령 실패", "error");
      }
    } catch (e) {
      addToast("오류가 발생했습니다.", "error");
    }
  };

  const secondsLeft = status.data?.seconds_left ?? null;
  const windowLabel = useMemo(() => formatSeconds(secondsLeft), [secondsLeft]);

  if (status.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center text-white/60">
        신규 유저 웰컴 미션을 불러오는 중...
      </div>
    );
  }

  if (!status.data?.eligible) {
    return <Navigate to="/landing" replace />;
  }

  const missions = status.data?.missions ?? [];
  const getMissionDone = (predicate: (m: any) => boolean) => missions.some((m) => predicate(m) && Boolean(m.is_completed));
  const play1Done = getMissionDone((m) => m.action_type === "PLAY_GAME" && Number(m.target_value) === 1);
  const play3Done = getMissionDone((m) => m.action_type === "PLAY_GAME" && Number(m.target_value) >= 3);
  const joinOrShareDone = getMissionDone(
    (m) => ["JOIN_CHANNEL", "SHARE", "SHARE_STORY", "SHARE_WALLET"].includes(String(m.action_type ?? ""))
  );
  const nextDayLoginDone = getMissionDone((m) => m.action_type === "LOGIN");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 rounded-3xl border border-emerald-700/30 bg-black/60 p-6 backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">NEW USER ONBOARDING</p>
        <h1 className="mt-2 text-2xl font-black text-white">신규 유저 전용 웰컴 페이지</h1>
        <p className="mt-2 text-sm text-white/60">
          이 페이지는 신규 유저에게만 노출됩니다. 기존 유저는 혜택 대상이 아닙니다.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">BONUS CAP</p>
            <p className="mt-1 text-xl font-black text-white">{status.data.bonus_cap.toLocaleString()} P</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">TIME LEFT</p>
            <p className="mt-1 text-xl font-black text-white">{windowLabel}</p>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <Row
          done={play1Done}
          title="게임 1회 플레이"
          desc={`현재 누적 플레이 수: ${status.data.total_play_count.toLocaleString()}회`}
          action={
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10" to="/dice">
              플레이
            </Link>
          }
        />
        <Row
          done={play3Done}
          title="게임 3회 플레이"
          desc="(룰렛/주사위/복권 합산 기준)"
          action={
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10" to="/games">
              게임 목록
            </Link>
          }
        />
        <Row
          done={joinOrShareDone}
          title="스토리 공유 또는 채널 가입"
          desc="현재는 자동 판별 연동이 필요합니다(봇/콜백)."
          action={
            <a
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
              href="https://t.me/+IE0NYpuze_k1YWZk"
              target="_blank"
              rel="noreferrer"
            >
              채널 열기
            </a>
          }
        />
        <Row
          done={nextDayLoginDone}
          title="다음날 재접속(출석)"
          desc="KST 기준 다음날 접속하면 완료로 처리됩니다."
        />
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-white/65 backdrop-blur">
        <p className="font-bold text-white">입금은 필수 조건</p>
        <p className="mt-1">
          해금(locked → cash) 구조/지급 로직은 운영안 확정 후 서버 정책으로 적용합니다. 이 페이지는 “신규 유저 전용”으로 분리되어 기존 유저에게
          무조건 1만원이 풀리는 문제를 막습니다.
        </p>
        <div className="mt-3 flex gap-2">
          <a
            href="https://ccc-010.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-emerald-500/15 px-4 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-500/20"
          >
            씨씨카지노 바로가기
          </a>
          <Link
            to="/missions"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white/80 hover:bg-white/10"
          >
            미션 보기
          </Link>
        </div>
      </div>

      <Modal
        title="2일차 출석 완료!"
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-4 ring-emerald-500/20">
            <Trophy className="h-10 w-10 text-emerald-400" />
          </div>
          <p className="whitespace-pre-wrap text-lg font-bold text-white">
            축하합니다!{"\n"}2일차 접속 미션을 달성했습니다.
          </p>
          <p className="mt-2 text-sm text-white/60">
            지금 바로 보상을 수령하세요!
          </p>

          <button
            onClick={handleClaimReward}
            className="mt-6 w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-95"
          >
            보상 받기
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default NewUserWelcomePage;
