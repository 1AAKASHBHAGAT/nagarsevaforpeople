import { useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import {
  getComplaintStats,
  getComplaints,
  updateComplaintStatus,
} from "../utils/firebaseUtils";
import { generateAIRecommendations } from "../utils/geminiAI";

const AdminDashboard = () => {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Admin credentials (hardcoded for demo)
  const ADMIN_EMAIL = "admin@nagarseva.in";
  const ADMIN_PASSWORD = "Admin@1234";

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setLoginError("");
      setEmail("");
      setPassword("");
      loadData();
    } else {
      setLoginError(t("loginError"));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await getComplaintStats();
      setStats(statsData);

      const complaintsData = await getComplaints({ limit: 500 });
      setComplaints(complaintsData);

      // Generate AI recommendations
      if (statsData.total > 0) {
        const topCat =
          Object.entries(statsData.categories).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] || "General";
        const recs = await generateAIRecommendations({
          totalComplaints: statsData.total,
          topCategory: topCat,
          avgResolutionTime: statsData.avgResolutionTime,
          pendingCount: statsData.pending,
        });
        setRecommendations(recs);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (complaintID, newStatus) => {
    try {
      await updateComplaintStatus(complaintID, newStatus);
      // Refresh data
      loadData();
      alert(`Complaint ${complaintID} updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Error updating status. Please try again.");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-6rem)] bg-surface-soft flex items-center justify-center px-4 py-10">
        <div className="surface-card p-10 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🏛️</div>
            <p className="text-sm uppercase tracking-[0.32em] text-secondary">
              Municipal Administration
            </p>
            <h1 className="mt-3 text-3xl font-poppins font-extrabold text-tertiary">
              {t("adminDashboard")}
            </h1>
          </div>

          {loginError && (
            <div className="mb-6 rounded-[1.75rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block font-bold text-slate-900 mb-3">
                {t("email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("adminEmail")}
                className="w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-3">
                {t("password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                required
              />
            </div>

            <button type="submit" className="w-full primary-button">
              {t("loginBtn")}
            </button>

            <div className="rounded-[1.75rem] border border-tertiary bg-surface-soft p-4 text-xs text-secondary">
              <p className="font-semibold mb-2">Demo Credentials:</p>
              <p>{ADMIN_EMAIL}</p>
              <p>{ADMIN_PASSWORD}</p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center bg-surface-soft">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-tertiary border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-xl font-bold text-tertiary">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const filteredComplaints = complaints.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (
      searchTerm &&
      !c.complaintID.includes(searchTerm.toUpperCase()) &&
      !c.category.includes(searchTerm)
    )
      return false;
    return true;
  });

  return (
    <div className="bg-slate-50">
      <div className="container-default px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-secondary">
              Municipal Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-poppins font-extrabold text-tertiary">
              {t("adminDashboard")} 📊
            </h1>
          </div>
          <button
            onClick={() => setAuthenticated(false)}
            className="button-secondary"
          >
            {t("logout")}
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
            <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] border-l-4 border-tertiary">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">⏳</div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                    {t("totalPending")}
                  </p>
                  <p className="text-4xl font-bold text-tertiary">
                    {stats.pending}
                  </p>
                </div>
              </div>
              <div className="w-full bg-surface-soft rounded-full h-2">
                <div
                  className="bg-tertiary h-2 rounded-full"
                  style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] border-l-4 border-tertiary">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">🔧</div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                    {t("inProgressCount")}
                  </p>
                  <p className="text-4xl font-bold text-tertiary">
                    {stats.inProgress}
                  </p>
                </div>
              </div>
              <div className="w-full bg-surface-soft rounded-full h-2">
                <div
                  className="bg-tertiary/90 h-2 rounded-full"
                  style={{
                    width: `${(stats.inProgress / stats.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] border-l-4 border-tertiary">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">✅</div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                    {t("resolvedToday")}
                  </p>
                  <p className="text-4xl font-bold text-tertiary">
                    {stats.resolved}
                  </p>
                </div>
              </div>
              <div className="w-full bg-surface-soft rounded-full h-2">
                <div
                  className="bg-tertiary/80 h-2 rounded-full"
                  style={{ width: `${(stats.resolved / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] border-l-4 border-tertiary">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">⚡</div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                    {t("avgResolutionTime")}
                  </p>
                  <p className="text-4xl font-bold text-tertiary">
                    {stats.avgResolutionTime}h
                  </p>
                </div>
              </div>
              <div className="w-full bg-surface-soft rounded-full h-2">
                <div
                  className="bg-tertiary/70 h-2 rounded-full"
                  style={{
                    width: `${Math.min((stats.avgResolutionTime / 48) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights */}
        {recommendations && (
          <div className="surface-card rounded-[2rem] bg-white p-8 mb-10 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] border-l-4 border-tertiary">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-3xl">🤖</div>
              <div>
                <h2 className="text-xl font-bold text-tertiary">
                  {t("aiInsights")}
                </h2>
                <p className="text-sm text-secondary">
                  AI-powered recommendations for municipal operations
                </p>
              </div>
            </div>
            <div className="whitespace-pre-line text-slate-700 leading-relaxed bg-surface-soft rounded-[1.5rem] p-6">
              {recommendations}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="surface-card rounded-[2rem] bg-white p-8 mb-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)]">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex gap-3 flex-wrap">
              {[
                { key: "all", label: t("all") },
                { key: "pending", label: t("pending") },
                { key: "inProgress", label: t("inProgress") },
                { key: "resolved", label: t("resolved") },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-[1.75rem] px-6 py-3 text-sm font-semibold transition ${
                    filter === key
                      ? "bg-tertiary text-white shadow-lg"
                      : "bg-surface-soft text-primary hover:bg-[#d8faf1]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by ID or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-[1.75rem] border border-tertiary bg-surface-soft px-5 py-4 text-sm text-primary shadow-sm transition focus:border-tertiary focus:ring-[rgba(45,212,191,0.18)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="surface-card rounded-[2rem] bg-white overflow-hidden shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-900">
                    {t("id")}
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900">
                    {t("category")}
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900">
                    {t("severity")}
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900">
                    {t("ward")}
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((complaint) => (
                    <tr
                      key={complaint.documentID}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">
                        {complaint.complaintID}
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        {complaint.category}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                            complaint.severity === "High"
                              ? "bg-red-100 text-red-700"
                              : complaint.severity === "Medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {complaint.severity === "High"
                            ? "🔴"
                            : complaint.severity === "Medium"
                              ? "🟡"
                              : "🟢"}{" "}
                          {complaint.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {complaint.ward}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={complaint.status || "pending"}
                          onChange={(e) =>
                            handleStatusUpdate(
                              complaint.complaintID,
                              e.target.value,
                            )
                          }
                          className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="assigned">👤 Assigned</option>
                          <option value="inProgress">🔧 In Progress</option>
                          <option value="resolved">✅ Resolved</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            (window.location.href = `/track?id=${complaint.complaintID}`)
                          }
                          className="rounded-[1rem] bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <div className="text-4xl mb-4">📋</div>
                      <p>{t("noData")}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
