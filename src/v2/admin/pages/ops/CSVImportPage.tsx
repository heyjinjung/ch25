/* webhint-disable no-inline-styles */
import React, { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Users,
  DollarSign,
  ArrowRight,
  RefreshCw,
  PieChart,
  Info,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  useValidateCSV,
  useUploadCSV,
  useExecuteCSVImport,
} from "../../../hooks/useAdminCSVImport";
import { cn } from "../../../lib/utils";
import { Progress } from "../../../components/ui/progress";
import styles from "./CSVImportPage.module.css";

type Step = "SELECT" | "VALIDATE" | "IMPORTING" | "RESULT";

export default function CSVImportPage() {
  const [step, setStep] = useState<Step>("SELECT");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string>("");
  const [batchSize, setBatchSize] = useState(250);
  const [isHistorical, setIsHistorical] = useState(false);
  const [emitToRedis] = useState(true);
  const [importType, setImportType] = useState<"GAME_LOG" | "HQ_MARGIN">("GAME_LOG");

  const validateMutation = useValidateCSV();
  const uploadMutation = useUploadCSV();
  const importMutation = useExecuteCSVImport();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onNextToValidate = async () => {
    if (!selectedFile) return;
    try {
      // 1. Upload first (to get a path for estimate/import)
      const uploadRes = await uploadMutation.mutateAsync(selectedFile);
      setFilePath(uploadRes.file_path);

      // 2. Validate
      await validateMutation.mutateAsync(selectedFile);
      setStep("VALIDATE");
    } catch (err) {
      console.error(err);
    }
  };

  const onStartImport = async () => {
    if (!filePath) return;
    setStep("IMPORTING");
    try {
      await importMutation.mutateAsync({
        file_path: filePath,
        batch_size: batchSize,
        historical_mode: isHistorical,
        emit_to_redis: emitToRedis,
        import_type: importType,
      });
      setStep("RESULT");
    } catch (err) {
      console.error(err);
      setStep("VALIDATE"); // Go back on error
    }
  };

  const reset = () => {
    setStep("SELECT");
    setSelectedFile(null);
    setFilePath("");
  };

  return (
    <div className="p-6 space-y-6 bg-obsidian-bg min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
            <Upload className="w-8 h-8 text-indigo-400" />
            외부 게임 로그 임포트
          </h1>
          <p className="text-sm text-zinc-400">
            외부 카지노 플랫폼의 CSV 로그를 시스템에 통합하고 분석합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 gap-2"
            onClick={reset}
          >
            <RefreshCw className="w-4 h-4" /> 초기화
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-8">
        <StepIndicator
          active={step === "SELECT"}
          done={["VALIDATE", "IMPORTING", "RESULT"].includes(step)}
          label="파일 선택"
        />
        <ArrowRight className="w-4 h-4 text-zinc-600" />
        <StepIndicator
          active={step === "VALIDATE"}
          done={["IMPORTING", "RESULT"].includes(step)}
          label="검증 및 설정"
        />
        <ArrowRight className="w-4 h-4 text-zinc-600" />
        <StepIndicator
          active={step === "IMPORTING"}
          done={["RESULT"].includes(step)}
          label="처리 중"
        />
        <ArrowRight className="w-4 h-4 text-zinc-600" />
        <StepIndicator
          active={step === "RESULT"}
          done={false}
          label="분석 결과"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto">
        {step === "SELECT" && (
          <Card className="bg-[#18181B] border-white/5 p-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <FileText className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">CSV 파일을 업로드하세요</h3>
                <p className="text-zinc-500 text-sm max-w-md mx-auto">
                  시스템에서 정의한 표준 CSV 형식을 준수해야 합니다.
                </p>
              </div>

              {/* Import Type Selection */}
              <div className="w-full max-w-sm space-y-3 bg-zinc-900/50 border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <Info className="w-4 h-4" />
                  데이터 타입 선택
                </div>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md bg-black/20 hover:bg-black/40 transition-colors border border-white/5">
                    <input
                      type="radio"
                      name="importType"
                      value="GAME_LOG"
                      checked={importType === "GAME_LOG"}
                      onChange={() => setImportType("GAME_LOG")}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">외부 게임 로그 (기본)</div>
                      <div className="text-xs text-zinc-500">
                        timestamp, user_id, game_type, result, bet, payout...
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md bg-black/20 hover:bg-black/40 transition-colors border border-white/5">
                    <input
                      type="radio"
                      name="importType"
                      value="HQ_MARGIN"
                      checked={importType === "HQ_MARGIN"}
                      onChange={() => setImportType("HQ_MARGIN")}
                      className="w-4 h-4 text-amber-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        💰 본사 마진 데이터
                        <Badge variant="outline" className="text-xs">NEW</Badge>
                      </div>
                      <div className="text-xs text-zinc-500">
                        이름, 닉네임, 충전/환전 금액, 마진, 경과일, 세그먼트
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full max-w-sm">
                <Input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".csv"
                  className="bg-black/40 border-white/10"
                />
                <Button
                  onClick={onNextToValidate}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                >
                  {uploadMutation.isPending
                    ? "업로드 중..."
                    : "검증하기 (Next)"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === "VALIDATE" && validateMutation.data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-[#18181B] border-white/5">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    {validateMutation.data.is_valid ? (
                      <CheckCircle2 className="text-emerald-500" />
                    ) : (
                      <AlertCircle className="text-red-500" />
                    )}
                    검증 결과: {validateMutation.data.filename}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <StatItem
                      label="총 행 수"
                      value={`${validateMutation.data.total_rows?.toLocaleString()} rows`}
                    />
                    <StatItem
                      label="파일 크기"
                      value={`${(validateMutation.data.file_size_bytes / 1024).toFixed(1)} KB`}
                    />
                    <StatItem
                      label="예상 소요 시간"
                      value={`${validateMutation.data.estimated_minutes} 분`}
                    />
                    <StatItem
                      label="상태"
                      value={
                        validateMutation.data.is_valid
                          ? "검증 통과"
                          : "오류 발견"
                      }
                      status={validateMutation.data.is_valid ? "OK" : "ERROR"}
                    />
                  </div>

                  {!validateMutation.data.is_valid && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <strong>Error:</strong> {validateMutation.data.error}
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase">
                      임포트 설정
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-500 font-bold uppercase">
                          배치 크기
                        </label>
                        <select
                          className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={batchSize}
                          onChange={(e) => setBatchSize(Number(e.target.value))}
                        >
                          <option value={100}>100 (안전)</option>
                          <option value={250}>250 (권장)</option>
                          <option value={500}>500 (고속)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-500 font-bold uppercase">
                          실시간 트리거
                        </label>
                        <div className="flex items-center gap-4 h-10">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isHistorical}
                              onChange={(e) =>
                                setIsHistorical(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">
                              히스토리 모드 (트리거 비활성)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-white/10"
                  onClick={() => setStep("SELECT")}
                >
                  이전으로
                </Button>
                <Button
                  className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-lg font-bold"
                  onClick={onStartImport}
                  disabled={!validateMutation.data.is_valid}
                >
                  임포트 시작
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="bg-[#18181B] border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400" /> 주의사항
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-zinc-500 space-y-3 leading-relaxed">
                  <p>
                    • 임포트된 데이터는 Golden V2 이벤트 시스템에 즉시
                    반영됩니다.
                  </p>
                  <p>• 누락된 유저 ID가 포함된 행은 자동으로 스킵됩니다.</p>
                  <p>
                    • 중복된 세션 ID 체크가 활성화되어 중복 입력을 방지합니다.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === "IMPORTING" && (
          <Card className="bg-[#18181B] border-white/5 p-12 text-center space-y-8">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin" />
              <h2 className="text-2xl font-bold">임포트 처리 중...</h2>
              <p className="text-zinc-500 italic text-sm">
                최대 수 분이 소요될 수 있습니다. 브라우저를 닫지 마세요.
              </p>
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <Progress value={undefined} className="h-2" />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>STATUS: PROCESSING_CSV</span>
                <span>B_SIZE: {batchSize}</span>
              </div>
            </div>
          </Card>
        )}

        {step === "RESULT" && importMutation.data && (
          <div className="space-y-6">
            {/* Success Summary Header */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">임포트 완료</h2>
                  <p className="text-emerald-400/60 text-sm">
                    성공적으로{" "}
                    {importMutation.data.successful_rows.toLocaleString()}개의
                    이벤트를 반영했습니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">
                    성공률
                  </p>
                  <p className="text-xl font-bold">
                    {(
                      (importMutation.data.successful_rows /
                        importMutation.data.total_rows) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">
                    실행 시간
                  </p>
                  <p className="text-xl font-bold">
                    {importMutation.data.duration_seconds.toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Grid */}
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-8">
              <BarChart3 className="w-5 h-5 text-indigo-400" /> 데이터 분석 결과
              (Analysis)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <AnalyticsCard
                label="총 베팅 규모"
                value={`₩ ${importMutation.data.total_bet.toLocaleString()}`}
                icon={DollarSign}
                subtext="Total Amount Bet"
              />
              <AnalyticsCard
                label="총 당첨 규모"
                value={`₩ ${importMutation.data.total_payout.toLocaleString()}`}
                color="text-emerald-400"
                icon={PieChart}
                subtext="Total Amount Paid"
              />
              <AnalyticsCard
                label="참여 유저 수"
                value={`${importMutation.data.unique_user_count.toLocaleString()} 명`}
                icon={Users}
                subtext="Unique Active Users"
              />
              <AnalyticsCard
                label="수익 (GGR)"
                value={`₩ ${(importMutation.data.total_bet - importMutation.data.total_payout).toLocaleString()}`}
                icon={ArrowRight}
                color={
                  importMutation.data.total_bet -
                    importMutation.data.total_payout >=
                  0
                    ? "text-indigo-400"
                    : "text-red-400"
                }
                subtext="Bet - Payout"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card className="bg-[#18181B] border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">
                    결과 분포 (Distribution)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <DistributionBar
                      label="WIN"
                      count={importMutation.data.win_count}
                      total={importMutation.data.successful_rows}
                      color="bg-emerald-500"
                    />
                    <DistributionBar
                      label="LOSE"
                      count={importMutation.data.loss_count}
                      total={importMutation.data.successful_rows}
                      color="bg-zinc-700"
                    />
                    <DistributionBar
                      label="JACKPOT"
                      count={importMutation.data.jackpot_count}
                      total={importMutation.data.successful_rows}
                      color="bg-amber-500"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#18181B] border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex justify-between items-center">
                    <span>오류 및 경고</span>
                    <Badge
                      variant="outline"
                      className="border-white/10 text-zinc-500"
                    >
                      Total:{" "}
                      {importMutation.data.failed_rows +
                        importMutation.data.skipped_rows}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {importMutation.data.errors.length === 0 &&
                  importMutation.data.warnings.length === 0 ? (
                    <div className="py-10 text-center text-zinc-600 text-sm">
                      발견된 오류나 경고가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {importMutation.data.errors.map((err, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-red-500/5 border border-red-500/10 text-[10px] text-red-400 font-mono"
                        >
                          [ERR] {err}
                        </div>
                      ))}
                      {importMutation.data.warnings.map((wrn, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400 font-mono"
                        >
                          [WRN] {wrn}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center pt-8">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 w-full max-w-sm h-12"
                onClick={reset}
              >
                새 파일 임포트하기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300",
        active
          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold shadow-[0_0_15px_rgba(99,102,241,0.1)]"
          : done
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
            : "bg-zinc-900 border-white/5 text-zinc-600",
      )}
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            active ? "bg-indigo-400 animate-pulse" : "bg-zinc-600",
          )}
        />
      )}
      <span className="text-xs">{label}</span>
    </div>
  );
}

function StatItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "OK" | "ERROR";
}) {
  return (
    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
      <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1 tracking-widest">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-bold",
          status === "OK"
            ? "text-emerald-400"
            : status === "ERROR"
              ? "text-red-400"
              : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  icon: Icon,
  subtext,
  color = "text-white",
}: any) {
  return (
    <div className="bg-[#18181B] border border-white/5 p-5 rounded-2xl shadow-lg relative overflow-hidden group">
      <div className="absolute -right-2 -bottom-2 opacity-5 text-indigo-400 group-hover:scale-110 transition-transform">
        <Icon size={80} />
      </div>
      <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">
        {label}
      </p>
      <p className={cn("text-xl font-bold font-mono truncate", color)}>
        {value}
      </p>
      <p className="text-[10px] text-zinc-600 mt-2">{subtext}</p>
    </div>
  );
}

function DistributionBar({ label, count, total, color }: any) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  const getWidthClass = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    const step = Math.round(clamped / 5) * 5;
    const key = `w${step}` as keyof typeof styles;
    return styles[key] ?? styles.w0;
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white">
          {count.toLocaleString()}{" "}
          <span className="text-zinc-600 font-normal">
            ({percent.toFixed(1)}%)
          </span>
        </span>
      </div>
      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-1000",
            styles.barFill,
            getWidthClass(percent),
            color,
          )}
        />
      </div>
    </div>
  );
}
