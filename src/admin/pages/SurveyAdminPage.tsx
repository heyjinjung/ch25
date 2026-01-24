// src/admin/pages/SurveyAdminPage.tsx
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye
} from "lucide-react";
import {
  fetchAdminSurveys,
  AdminSurvey
} from "../api/adminSurveyApi";

const SurveyAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: surveysData, isLoading } = useQuery({
    queryKey: ["admin", "surveys"],
    queryFn: fetchAdminSurveys,
  });

  const surveys = surveysData?.items || [];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-admin-accent/20 text-admin-accent",
      DRAFT: "bg-admin-text-muted/20 text-admin-text-muted",
      CLOSED: "bg-admin-danger/20 text-admin-danger",
    };
    return colors[status] || "bg-admin-sidebar text-admin-text-secondary";
  };

  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
            ?§Î¨∏ Í¥ÄÎ¶?<span className="text-admin-brand/40">Surveys</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] })}
            disabled={isLoading}
            className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> ?àÎ°úÍ≥†Ïπ®
          </button>
          <button
            className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 h-auto shadow-admin-glow"
            onClick={() => {
              navigate("/admin/surveys/new");
            }}
          >
            <Plus className="h-4 w-4" /> ?§Î¨∏ ?ùÏÑ±
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">Ï¥??§Î¨∏ ??/p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-text-primary">{surveys.length}</p>
            <FileText className="h-5 w-5 text-admin-brand mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">?úÏÑ± ?§Î¨∏</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-accent">
              {surveys.filter(s => s.status === "ACTIVE").length}
            </p>
            <CheckCircle2 className="h-5 w-5 text-admin-accent mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">?ëÏÑ± Ï§?/p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-warning">
              {surveys.filter(s => s.status === "DRAFT").length}
            </p>
            <Clock className="h-5 w-5 text-admin-warning mb-1" />
          </div>
        </div>
      </div>

      {/* Survey List */}
      <div className="admin-card-premium overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
            <p className="text-admin-meta text-admin-text-secondary">?∞Ïù¥??Î°úÎî© Ï§?..</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="admin-th">
                  <th className="px-4 py-3.5 text-left">ID</th>
                  <th className="px-4 py-3.5 text-left">?§Î¨∏ ?úÎ™©</th>
                  <th className="px-4 py-3.5 text-center">?ÅÌÉú</th>
                  <th className="px-4 py-3.5 text-center">Ï±ÑÎÑê</th>
                  <th className="px-4 py-3.5 text-center">ÏßàÎ¨∏ ??/th>
                  <th className="px-4 py-3.5 text-center">?ùÏÑ±??/th>
                  <th className="px-4 py-3.5 text-center">?°ÏÖò</th>
                </tr>
              </thead>
              <tbody>
                {surveys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                      ?§Î¨∏???ÜÏäµ?àÎã§. ???§Î¨∏???ùÏÑ±?¥Ï£º?∏Ïöî.
                    </td>
                  </tr>
                ) : (
                  surveys.map((survey: AdminSurvey) => (
                    <tr key={survey.id} className="admin-td group">
                      <td className="px-4 py-4 font-mono text-admin-text-primary">{survey.id}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-admin-text-primary font-bold">{survey.title}</span>
                          <span className="text-admin-text-muted text-xs">
                            {new Date(survey.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusBadge(survey.status)}`}>
                          {survey.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-admin-text-secondary text-sm font-medium">{survey.channel}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-admin-text-primary font-black tabular-nums">
                          {survey.question_count}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-admin-text-secondary text-xs tabular-nums">
                        {new Date(survey.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/admin/surveys/${survey.id}`);
                            }}
                            aria-label={`?§Î¨∏ ?ÅÏÑ∏ Î≥¥Í∏∞ (ID: ${survey.id})`}
                            title={`?§Î¨∏ ?ÅÏÑ∏ Î≥¥Í∏∞ (ID: ${survey.id})`}
                            className="p-2 rounded-lg hover:bg-admin-brand/10 text-admin-brand transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/surveys/${survey.id}/responses`)}
                            aria-label={`?§Î¨∏ ?µÍ≥Ñ Î≥¥Í∏∞ (ID: ${survey.id})`}
                            title={`?§Î¨∏ ?µÍ≥Ñ Î≥¥Í∏∞ (ID: ${survey.id})`}
                            className="p-2 rounded-lg hover:bg-admin-accent/10 text-admin-accent transition-colors"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default SurveyAdminPage;
