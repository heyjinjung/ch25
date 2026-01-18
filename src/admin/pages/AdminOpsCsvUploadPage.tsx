import React, { useMemo, useState } from "react";
import { UploadCloud, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { importOpsLogCsv, type OpsLogCsvImportResponse } from "../api/adminOpsLogApi";

const REQUIRED_COLUMNS = [
  "date",
  "category",
  "action_code",
  "target_model",
  "target_id",
  "meta_data",
  "ref_id",
  "is_automated",
] as const;

const AdminOpsCsvUploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OpsLogCsvImportResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFile = !!file;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await importOpsLogCsv(file);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "업로드 실패");
    } finally {
      setIsUploading(false);
    }
  };

  const summary = useMemo(() => {
    if (!result) return null;
    return {
      total: result.total_rows,
      imported: result.imported,
      duplicates: result.duplicates,
      failed: result.failed,
    };
  }, [result]);

  return (
    <section className="admin-page-container space-y-8">
      <header className="flex flex-col gap-2 border-b border-admin-border pb-6 pt-4">
        <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
          운영 로그 CSV 업로드 <span className="text-admin-brand/40">Ops Log Import</span>
        </h1>
        <p className="text-xs font-bold text-admin-text-muted">
          CSV 파일을 업로드하여 운영 로그를 일괄 등록합니다.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-admin-border bg-admin-sidebar/40 p-6">
            <label className="text-[11px] font-black text-admin-text-muted uppercase tracking-widest block mb-3">
              CSV 파일 선택
            </label>
            <div
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all ${
                hasFile ? "border-admin-brand bg-admin-brand/5" : "border-admin-border hover:border-admin-brand/50"
              }`}
            >
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="ops-log-csv" />
              <label htmlFor="ops-log-csv" className="cursor-pointer flex flex-col items-center gap-3">
                <div className={`p-4 rounded-full ${hasFile ? "bg-admin-brand text-white" : "bg-admin-sidebar text-admin-text-muted"}`}>
                  <FileText size={28} />
                </div>
                <span className="text-sm font-semibold text-admin-text-base">
                  {hasFile ? file?.name : "CSV 파일을 선택하세요"}
                </span>
                <span className="text-[11px] text-admin-text-muted">UTF-8 인코딩 CSV 권장</span>
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="btn-admin-primary px-6 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-admin-brand/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? <UploadCloud className="h-4 w-4 animate-bounce" /> : <UploadCloud className="h-4 w-4" />}
                {isUploading ? "업로드 중..." : "업로드 실행"}
              </button>
              {error && (
                <div className="flex items-center gap-2 text-xs font-bold text-admin-danger">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}
            </div>
          </div>

          {summary && (
            <div className="rounded-2xl border border-admin-border bg-admin-sidebar/40 p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-admin-text-base">
                <CheckCircle2 size={16} className="text-admin-success" />
                업로드 결과 요약
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4">
                  <div className="text-[10px] font-black text-admin-text-muted uppercase">Total</div>
                  <div className="text-xl font-black text-admin-text-base">{summary.total}</div>
                </div>
                <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4">
                  <div className="text-[10px] font-black text-admin-text-muted uppercase">Imported</div>
                  <div className="text-xl font-black text-admin-success">{summary.imported}</div>
                </div>
                <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4">
                  <div className="text-[10px] font-black text-admin-text-muted uppercase">Duplicates</div>
                  <div className="text-xl font-black text-admin-warning">{summary.duplicates}</div>
                </div>
                <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4">
                  <div className="text-[10px] font-black text-admin-text-muted uppercase">Failed</div>
                  <div className="text-xl font-black text-admin-danger">{summary.failed}</div>
                </div>
              </div>

              {result?.errors?.length ? (
                <div className="rounded-xl border border-admin-danger/30 bg-admin-danger/10 p-4">
                  <div className="text-xs font-bold text-admin-danger mb-3">에러 상세</div>
                  <ul className="space-y-2 text-[11px] text-admin-danger">
                    {result.errors.slice(0, 12).map((err) => (
                      <li key={`${err.row_number}-${err.reason}`}>#{err.row_number}: {err.reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-admin-border bg-admin-sidebar/40 p-6">
            <h2 className="text-sm font-black text-admin-text-base mb-3">CSV 컬럼 스키마</h2>
            <div className="flex flex-wrap gap-2">
              {REQUIRED_COLUMNS.map((col) => (
                <span key={col} className="px-2 py-1 rounded bg-admin-sidebar text-[11px] text-admin-text-secondary border border-admin-border">
                  {col}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-admin-text-muted leading-relaxed">
              meta_data는 JSON 문자열로 입력합니다. 예: {`{"tracking_tag":"OPS_IMPORT"}`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminOpsCsvUploadPage;
