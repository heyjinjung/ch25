import React, { useMemo, useState } from "react";
import { UploadCloud, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { importCh25RawLogs, type Ch25RawLogImportResponse } from "../api/adminCh25Api";

const ACCEPT_EXTENSIONS = [".csv", ".txt"] as const;

const AdminCh25RawLogsUploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Ch25RawLogImportResponse | null>(null);
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
      const res = await importCh25RawLogs(file);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "?…ë¡œ???¤íŒ¨");
    } finally {
      setIsUploading(false);
    }
  };

  const summary = useMemo(() => {
    if (!result) return null;
    return {
      totalLines: result.total_lines,
      chunks: result.chunks,
      fileName: result.file_name || "-",
    };
  }, [result]);

  return (
    <section className="admin-page-container space-y-8">
      <header className="flex flex-col gap-2 border-b border-admin-border pb-6 pt-4">
        <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
          CH25 ë¡œë°?´í„° ?…ë¡œ??<span className="text-admin-brand/40">Raw Log Ingest</span>
        </h1>
        <p className="text-xs font-bold text-admin-text-muted">
          ì¹´ì????¤í¬ì¸??¬ë¡¯ ë¡œë°?´í„° ?Œì¼???…ë¡œ?œí•˜??stream:raw_logsë¡??ì¬?©ë‹ˆ??
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-admin-border bg-admin-sidebar/40 p-6">
            <label className="text-[11px] font-black text-admin-text-muted uppercase tracking-widest block mb-3">
              ë¡œë°?´í„° ?Œì¼ ? íƒ
            </label>
            <div
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all ${
                hasFile ? "border-admin-brand bg-admin-brand/5" : "border-admin-border hover:border-admin-brand/50"
              }`}
            >
              <input type="file" accept={ACCEPT_EXTENSIONS.join(",")} onChange={handleFileChange} className="hidden" id="ch25-raw-logs" />
              <label htmlFor="ch25-raw-logs" className="cursor-pointer flex flex-col items-center gap-3">
                <div className={`p-4 rounded-full ${hasFile ? "bg-admin-brand text-white" : "bg-admin-sidebar text-admin-text-muted"}`}>
                  <FileText size={28} />
                </div>
                <span className="text-sm font-semibold text-admin-text-base">
                  {hasFile ? file?.name : "ë¡œë°?´í„° ?Œì¼??? íƒ?˜ì„¸??}
                </span>
                <span className="text-[11px] text-admin-text-muted">UTF-8 ?¸ì½”??CSV/TXT ê¶Œì¥</span>
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
                {isUploading ? "?…ë¡œ??ì¤?.." : "?…ë¡œ???¤í–‰"}
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
                ?…ë¡œ??ê²°ê³¼ ?”ì•½
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4">
                  <div className="text-[10px] font-black text-admin-text-muted uppercase">Total Lines</div>
                  <div className="text-xl font-black text-admin-text-base">{summary.totalLines}</div>
                </div>
                <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4">
                  <div className="text-[10px] font-black text-admin-text-muted uppercase">Chunks</div>
                  <div className="text-xl font-black text-admin-success">{summary.chunks}</div>
                </div>
                <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4">
                  <div className="text-[10px] font-black text-admin-text-muted uppercase">File</div>
                  <div className="text-sm font-black text-admin-text-base truncate" title={summary.fileName}>
                    {summary.fileName}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {summary && (
            <div className="rounded-2xl border border-admin-border bg-admin-sidebar/40 p-6">
              <h2 className="text-sm font-black text-admin-text-base mb-3">?…ë¡œ???”ì•½</h2>
              <div className="space-y-3 text-xs text-admin-text-muted">
                <div className="flex items-center justify-between">
                  <span>?Œì¼ëª?/span>
                  <span className="text-admin-text-base font-bold truncate max-w-[160px]" title={summary.fileName}>
                    {summary.fileName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>?¼ì¸ ??/span>
                  <span className="text-admin-text-base font-bold">{summary.totalLines}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ì²?¬ ??/span>
                  <span className="text-admin-text-base font-bold">{summary.chunks}</span>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-admin-border bg-admin-sidebar/40 p-6">
            <h2 className="text-sm font-black text-admin-text-base mb-3">?¬ë§· ê°€?´ë“œ</h2>
            <ul className="space-y-2 text-[11px] text-admin-text-muted leading-relaxed">
              <li>???Œì¼ ??ê°?ì¤„ì´ 1ê±´ì˜ ë¡œë°?´í„°ë¡?ì²˜ë¦¬?©ë‹ˆ??</li>
              <li>?????ëŠ” ?¤ì¤‘ ê³µë°± êµ¬ë¶„??ì§€??</li>
              <li>???œê°„ ?¬ë§·: YYYY/MM/DD HH:mm(:ss) (KST).</li>
              <li>???¤í¬ì¸?ë¡œê·¸???•ì‚° ê¸ˆì•¡/ë¯¸ì ì¤??œê¸°ë¥??¬í•¨ ê¶Œì¥.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminCh25RawLogsUploadPage;
