/**
 * PasteImportPage - 클립보드 붙여넣기 Import
 *
 * 게임 로그와 데일리 입금 로그를 클립보드에서 직접 붙여넣기로 Import합니다.
 * CSV 파일 업로드 없이 간편하게 데이터를 반입할 수 있습니다.
 * 미리보기에서 각 행을 선택적으로 Import할 수 있습니다.
 *
 * 작성일: 2026-02-04
 */
import { useState, useMemo } from "react";
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
  CheckSquare,
  Square,
  Filter,
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
  previewWithdrawalImport,
  executeWithdrawalImport,
  PasteImportPreviewResponse,
  PasteImportResult,
  WithdrawalImportResponse,
  PreviewItem,
  DepositStatus,
} from "../../../api/adminApi";

type ImportType = "DAILY_DEPOSIT" | "GAME_LOG" | "WITHDRAWAL";
type Step = "INPUT" | "PREVIEW" | "RESULT";
type StatusFilter = "ALL" | DepositStatus;
type ResultData = PasteImportResult | WithdrawalImportResponse;

export default function PasteImportPage() {
  const [step, setStep] = useState<Step>("INPUT");
  const [importType, setImportType] = useState<ImportType>("DAILY_DEPOSIT");
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] =
    useState<PasteImportPreviewResponse | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);

  // 체크박스 선택 상태
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // 필터링된 항목
  const filteredPreview = useMemo(() => {
    if (!previewData?.preview) return [];
    if (statusFilter === "ALL") return previewData.preview;
    return previewData.preview.filter((item) => item.status === statusFilter);
  }, [previewData?.preview, statusFilter]);

  // 선택 가능한 항목
  const selectableItems = useMemo(() => {
    if (!previewData?.preview) return [];
    if (importType === "WITHDRAWAL") {
      return previewData.preview.filter(
        (item) => item.status === "MATCHED" || item.status === "NOT_FOUND",
      );
    }
    return previewData.preview.filter((item) => item.status === "MATCHED");
  }, [previewData?.preview, importType]);

  const handlePreview = async () => {
    if (!pasteText.trim()) {
      setError("붙여넣기할 데이터를 입력하세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result =
        importType === "WITHDRAWAL"
          ? await previewWithdrawalImport({
              text: pasteText,
            })
          : await previewPasteImport({
              text: pasteText,
              import_type: importType,
            });
      setPreviewData(result);
      // 기본적으로 MATCHED 상태인 항목 모두 선택
      const matchedIndices = new Set(
        result.preview
          .filter((item: PreviewItem) =>
            importType === "WITHDRAWAL"
              ? item.status === "MATCHED" || item.status === "NOT_FOUND"
              : item.status === "MATCHED",
          )
          .map((item: PreviewItem) => item.index),
      );
      setSelectedIndices(matchedIndices);
      setStep("PREVIEW");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(`미리보기 실패: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSelectAll = () => {
    const allMatchedIndices = selectableItems.map((item) => item.index);
    setSelectedIndices(new Set(allMatchedIndices));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) {
      setError("선택된 항목이 없습니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result =
        importType === "WITHDRAWAL"
          ? await executeWithdrawalImport({
              text: pasteText,
              selected_indices: Array.from(selectedIndices),
            })
          : await executePasteImport({
              text: pasteText,
              import_type: importType,
              selected_indices: Array.from(selectedIndices),
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
    setSelectedIndices(new Set());
    setStatusFilter("ALL");
  };

  const getStatusBadge = (status: DepositStatus) => {
    const config = {
      MATCHED: {
        color: "border-emerald-500/50 text-emerald-400",
        label: importType === "WITHDRAWAL" ? "처리" : "매칭됨",
      },
      NOT_FOUND: {
        color: "border-red-500/50 text-red-400",
        label: importType === "WITHDRAWAL" ? "미매칭" : "미등록",
      },
      DUPLICATE: { color: "border-amber-500/50 text-amber-400", label: "중복" },
      SKIPPED_OLD: {
        color: "border-zinc-500/50 text-zinc-400",
        label: importType === "WITHDRAWAL" ? "스킵" : "기존",
      },
    };
    const { color, label } = config[status];
    return (
      <Badge variant="outline" className={color}>
        {label}
      </Badge>
    );
  };

  const getPlaceholder = () => {
    if (importType === "DAILY_DEPOSIT") {
      return `번호\t소속\t이름(아이디)\t닉네임\t신청날짜\t충전금액\t입금자명\t충전날짜\t상태
1\tVIP\t홍길동(hong123)\thongkd\t2026-02-04\t100000\t홍길동\t2026-02-04 10:00:00\t완료`;
    }
    if (importType === "WITHDRAWAL") {
      return `번호\t소속\t이름(아이디)\t닉네임\t신청 날짜\t환전 금액\t계좌번호\t예금주\t환전 날짜\t배팅금\t상태
1\tHJ\t박관종(hjer5429)\t꽁돌이\t26/02/04 16:00\t50,000\t110-***-******\t박**\t26/02/04 16:05\t150,000\t정상`;
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
            <div className="grid grid-cols-3 gap-4">
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
                onClick={() => setImportType("WITHDRAWAL")}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  importType === "WITHDRAWAL"
                    ? "border-obsidian-accent bg-obsidian-accent/10"
                    : "border-obsidian-border bg-obsidian-surface hover:border-obsidian-accent/50",
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign
                    className={cn(
                      importType === "WITHDRAWAL"
                        ? "text-obsidian-accent"
                        : "text-zinc-400",
                    )}
                    size={24}
                  />
                  <span className="font-semibold text-white">환전 로그</span>
                </div>
                <p className="text-sm text-zinc-400">
                  HQ 환전 내역을 Import합니다. 정상 상태만 지출로 기록됩니다.
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <div className="text-sm text-zinc-400">매칭됨</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {(
                    previewData.matched_count ?? previewData.new_records_count
                  ).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-obsidian-card border-obsidian-border">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">미등록</div>
                <div className="text-2xl font-bold text-red-400">
                  {(previewData.not_found_count ?? 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-obsidian-card border-obsidian-border">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">중복</div>
                <div className="text-2xl font-bold text-amber-400">
                  {(previewData.duplicate_count ?? 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-obsidian-card border-obsidian-border">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">선택됨</div>
                <div className="text-2xl font-bold text-blue-400">
                  {selectedIndices.size.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Select Controls */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-obsidian-surface rounded-lg">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-400">필터:</span>
              {(
                [
                  "ALL",
                  "MATCHED",
                  "NOT_FOUND",
                  "DUPLICATE",
                  "SKIPPED_OLD",
                ] as const
              ).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "px-2 py-1 text-xs rounded",
                    statusFilter === filter
                      ? "bg-obsidian-accent text-black"
                      : "bg-obsidian-card text-zinc-300 hover:bg-obsidian-border",
                  )}
                >
                  {filter === "ALL"
                    ? "전체"
                    : filter === "MATCHED"
                      ? importType === "WITHDRAWAL"
                        ? "처리"
                        : "매칭"
                      : filter === "NOT_FOUND"
                        ? importType === "WITHDRAWAL"
                          ? "미매칭"
                          : "미등록"
                        : filter === "DUPLICATE"
                          ? "중복"
                          : importType === "WITHDRAWAL"
                            ? "스킵"
                            : "기존"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-1"
              >
                <CheckSquare size={14} />
                전체선택
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="gap-1"
              >
                <Square size={14} />
                전체해제
              </Button>
            </div>
          </div>

          {/* Preview Data */}
          <Card className="bg-obsidian-card border-obsidian-border">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Eye size={18} />
                미리보기 ({filteredPreview.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-obsidian-card">
                    <tr className="border-b border-obsidian-border">
                      <th className="w-10 py-2 px-2"></th>
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
                          <th className="text-center py-2 px-3 text-zinc-400">
                            상태
                          </th>
                        </>
                      ) : importType === "WITHDRAWAL" ? (
                        <>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            CC ID
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            닉네임
                          </th>
                          <th className="text-right py-2 px-3 text-zinc-400">
                            환전 금액
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            환전일시
                          </th>
                          <th className="text-left py-2 px-3 text-zinc-400">
                            상태
                          </th>
                          <th className="text-center py-2 px-3 text-zinc-400">
                            처리
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
                          <th className="text-center py-2 px-3 text-zinc-400">
                            상태
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreview.map((item) => (
                      <tr
                        key={item.index}
                        className={cn(
                          "border-b border-obsidian-border/50 hover:bg-obsidian-surface/50",
                          selectedIndices.has(item.index) &&
                            "bg-obsidian-accent/10",
                        )}
                      >
                        <td className="py-2 px-2">
                          {(importType === "WITHDRAWAL" &&
                            (item.status === "MATCHED" ||
                              item.status === "NOT_FOUND")) ||
                          (importType !== "WITHDRAWAL" &&
                            item.status === "MATCHED") ? (
                            <button
                              onClick={() => handleToggleSelect(item.index)}
                              className="text-zinc-400 hover:text-white"
                            >
                              {selectedIndices.has(item.index) ? (
                                <CheckSquare
                                  size={16}
                                  className="text-emerald-400"
                                />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
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
                            <td className="py-2 px-3 text-center">
                              {getStatusBadge(item.status)}
                            </td>
                          </>
                        ) : importType === "WITHDRAWAL" ? (
                          <>
                            <td className="py-2 px-3 text-white">
                              {item.cc_id}
                            </td>
                            <td className="py-2 px-3 text-white">
                              {item.nickname}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400">
                              ₩{(item.amount ?? 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-zinc-300">
                              {item.withdrawal_at ?? "-"}
                            </td>
                            <td className="py-2 px-3 text-zinc-300">
                              {item.hq_status ?? "-"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {getStatusBadge(item.status)}
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
                            <td className="py-2 px-3 text-center">
                              {getStatusBadge(item.status)}
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
              disabled={selectedIndices.size === 0 || isLoading}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              선택된 {selectedIndices.size}건 Import 실행
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
                <div className="text-xs text-zinc-400">중복/스킵</div>
                <div className="text-lg font-bold text-amber-400">
                  {(
                    (resultData.duplicate_count ?? 0) +
                    ("skipped_old_count" in resultData
                      ? (resultData.skipped_old_count ?? 0)
                      : 0) +
                    ("skipped_status_count" in resultData
                      ? (resultData.skipped_status_count ?? 0)
                      : 0)
                  ).toLocaleString()}
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

            {importType === "WITHDRAWAL" &&
              "spending_recorded_count" in resultData && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="text-xs text-emerald-400">총 환전 금액</div>
                    <div className="text-lg font-bold text-emerald-400">
                      ₩{(resultData.total_amount ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-blue-400">지출 기록</div>
                    <div className="text-lg font-bold text-blue-400">
                      {resultData.spending_recorded_count.toLocaleString()}건
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
