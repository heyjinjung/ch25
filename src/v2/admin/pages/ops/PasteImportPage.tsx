/**
 * PasteImportPage - 클립보드 붙여넣기 Import
 *
 * 게임 로그와 데일리 입금 로그를 클립보드에서 직접 붙여넣기로 Import합니다.
 * CSV 파일 업로드 없이 간편하게 데이터를 반입할 수 있습니다.
 *
 * 작성일: 2026-02-04
 */
import { useState } from "react";
import {
  ClipboardPaste,
  Eye,
  Upload,
  CheckCircle2,
  AlertCircle,
  Gamepad2,
  DollarSign,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Textarea } from "../../../components/ui/textarea";
import { cn } from "../../../lib/utils";
import {
  previewPasteImport,
  executePasteImport,
  PasteImportPreviewResponse,
  PasteImportResult,
} from "../../../api/adminApi";

type ImportType = "DAILY_DEPOSIT" | "GAME_LOG";
type Step = "INPUT" | "PREVIEW" | "RESULT";

export default function PasteImportPage() {
  const [step, setStep] = useState<Step>("INPUT");
  const [importType, setImportType] = useState<ImportType>("DAILY_DEPOSIT");
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] =
    useState<PasteImportPreviewResponse | null>(null);
  const [resultData, setResultData] = useState<PasteImportResult | null>(null);

  const handlePreview = async () => {
    if (!pasteText.trim()) {
      setError("붙여넣기할 데이터를 입력하세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await previewPasteImport({
        text: pasteText,
        import_type: importType,
      });
      setPreviewData(result);
      setStep("PREVIEW");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(`미리보기 실패: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await executePasteImport({
        text: pasteText,
        import_type: importType,
      });
      setResultData(result);
      setStep("RESULT");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(`Import 실패: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep("INPUT");
    setPasteText("");
    setPreviewData(null);
    setResultData(null);
    setError(null);
  };

  const getPlaceholder = () => {
    if (importType === "DAILY_DEPOSIT") {
      return `번호\t소속\t이름(아이디)\t닉네임\t신청날짜\t충전금액\t입금자명\t충전날짜\t상태
1\tVIP\t홍길동(hong123)\thongkd\t2026-02-04\t100000\t홍길동\t2026-02-04 10:00:00\t완료`;
    }
    return `번호\t이름\t닉네임\t타입\t베팅일시\t게임종류\t금액
1\t홍길동\thongkd\t베팅\t2026-02-04 10:30:00\t슬롯\t50000`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ClipboardPaste className="text-obsidian-accent" size={24} />
            붙여넣기 Import
          </h2>
          <p className="text-zinc-400 mt-1">
            HQ에서 복사한 데이터를 직접 붙여넣어 Import합니다. 기존 기록 이후의
            데이터만 처리됩니다.
          </p>
        </div>
        {step !== "INPUT" && (
          <Button variant="outline" onClick={reset} className="gap-2">
            <RefreshCw size={16} />
            초기화
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-400" size={20} />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Step 1: Input */}
      {step === "INPUT" && (
        <Card className="bg-obsidian-card border-obsidian-border">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              데이터 유형 선택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Import Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setImportType("DAILY_DEPOSIT")}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  importType === "DAILY_DEPOSIT"
                    ? "border-obsidian-accent bg-obsidian-accent/10"
                    : "border-obsidian-border bg-obsidian-surface hover:border-obsidian-accent/50",
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign
                    className={cn(
                      importType === "DAILY_DEPOSIT"
                        ? "text-obsidian-accent"
                        : "text-zinc-400",
                    )}
                    size={24}
                  />
                  <span className="font-semibold text-white">
                    데일리 입금 로그
                  </span>
                </div>
                <p className="text-sm text-zinc-400">
                  HQ 일별 입금 내역을 Import합니다. 입금 → 레벨 → 보상 순서로
                  처리됩니다.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setImportType("GAME_LOG")}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  importType === "GAME_LOG"
                    ? "border-obsidian-accent bg-obsidian-accent/10"
                    : "border-obsidian-border bg-obsidian-surface hover:border-obsidian-accent/50",
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Gamepad2
                    className={cn(
                      importType === "GAME_LOG"
                        ? "text-obsidian-accent"
                        : "text-zinc-400",
                    )}
                    size={24}
                  />
                  <span className="font-semibold text-white">게임 로그</span>
                </div>
                <p className="text-sm text-zinc-400">
                  게임 베팅/결과 로그를 Import합니다. 수익률 분석 및 위기 감지에
                  사용됩니다.
                </p>
              </button>
            </div>

            {/* Paste Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                데이터 붙여넣기 (탭으로 구분된 형식)
              </label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={getPlaceholder()}
                className="min-h-[200px] font-mono text-sm bg-obsidian-surface border-obsidian-border"
              />
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Info size={12} />
                HQ에서 표 전체를 선택 후 복사(Ctrl+C)하여
                붙여넣기(Ctrl+V)하세요.
              </p>
            </div>

            {/* Preview Button */}
            <Button
              onClick={handlePreview}
              disabled={!pasteText.trim() || isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Eye size={16} />
              )}
              미리보기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === "PREVIEW" && previewData && (
        <div className="space-y-4">
          {/* Preview Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-obsidian-card border-obsidian-border">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">총 파싱</div>
                <div className="text-2xl font-bold text-white">
                  {previewData.total_parsed.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-obsidian-card border-obsidian-border">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">신규 레코드</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {previewData.new_records_count.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-obsidian-card border-obsidian-border">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">DB 최신 기록</div>
                <div className="text-sm font-medium text-zinc-300">
                  {previewData.latest_in_db ?? "없음"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Data */}
          <Card className="bg-obsidian-card border-obsidian-border">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Eye size={18} />
                미리보기 (처음 10건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-obsidian-border">
                      {importType === "DAILY_DEPOSIT" ? (
                        <>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            닉네임
                          </th>
                          <th className="text-right py-2 px-3 text-zinc-400">
                            금액
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            입금일시
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            입금자
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            CC ID
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            닉네임
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            타입
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            게임
                          </th>
                          <th className="text-right py-2 px-3 text-zinc-400">
                            금액
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-obsidian-border/50 hover:bg-obsidian-surface/50"
                      >
                        {importType === "DAILY_DEPOSIT" ? (
                          <>
                            <td className="py-2 px-3 text-white">
                              {item.nickname}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400">
                              ₩{(item.amount ?? 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-zinc-300">
                              {item.deposit_at ?? "-"}
                            </td>
                            <td className="py-2 px-3 text-zinc-300">
                              {item.depositor ?? "-"}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 text-white">
                              {item.cc_id}
                            </td>
                            <td className="py-2 px-3 text-white">
                              {item.nickname}
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  item.log_type === "베팅"
                                    ? "border-amber-500/50 text-amber-400"
                                    : "border-emerald-500/50 text-emerald-400",
                                )}
                              >
                                {item.log_type}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-zinc-300">
                              {item.game_type}
                            </td>
                            <td className="py-2 px-3 text-right text-white">
                              ₩{(item.amount ?? 0).toLocaleString()}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep("INPUT")}
              className="flex-1"
            >
              이전으로
            </Button>
            <Button
              onClick={handleImport}
              disabled={previewData.new_records_count === 0 || isLoading}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {previewData.new_records_count}건 Import 실행
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "RESULT" && resultData && (
        <Card className="bg-obsidian-card border-obsidian-border">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              {resultData.success ? (
                <CheckCircle2 className="text-emerald-400" size={20} />
              ) : (
                <AlertCircle className="text-red-400" size={20} />
              )}
              Import {resultData.success ? "완료" : "실패"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Result Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-obsidian-surface rounded-lg">
                <div className="text-xs text-zinc-400">총 파싱</div>
                <div className="text-lg font-bold text-white">
                  {resultData.total_parsed.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-obsidian-surface rounded-lg">
                <div className="text-xs text-zinc-400">처리됨</div>
                <div className="text-lg font-bold text-emerald-400">
                  {resultData.processed_count.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-obsidian-surface rounded-lg">
                <div className="text-xs text-zinc-400">기존 스킵</div>
                <div className="text-lg font-bold text-amber-400">
                  {resultData.skipped_old_count.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-obsidian-surface rounded-lg">
                <div className="text-xs text-zinc-400">매칭 실패</div>
                <div className="text-lg font-bold text-red-400">
                  {resultData.not_found_count.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Additional Stats for DAILY_DEPOSIT */}
            {importType === "DAILY_DEPOSIT" &&
              resultData.total_amount !== undefined && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="text-xs text-emerald-400">총 금액</div>
                    <div className="text-lg font-bold text-emerald-400">
                      ₩{resultData.total_amount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-blue-400">고유 유저</div>
                    <div className="text-lg font-bold text-blue-400">
                      {(resultData.unique_users ?? 0).toLocaleString()}명
                    </div>
                  </div>
                </div>
              )}

            {/* Matched Details */}
            {resultData.matched_details &&
              resultData.matched_details.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">
                    매칭된 내역 (처음 20건)
                  </h4>
                  <div className="max-h-48 overflow-y-auto bg-obsidian-surface rounded-lg p-2">
                    {resultData.matched_details.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between py-1 px-2 text-sm border-b border-obsidian-border/30 last:border-0"
                      >
                        <span className="text-white">{item.nickname}</span>
                        <span className="text-emerald-400">
                          ₩{item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Error Message */}
            {resultData.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <span className="text-red-400">{resultData.error}</span>
              </div>
            )}

            <Button onClick={reset} className="w-full gap-2">
              <RefreshCw size={16} />
              새로 시작
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
