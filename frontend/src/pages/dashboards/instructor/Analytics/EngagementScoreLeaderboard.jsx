import { useEffect, useMemo, useState } from "react";
import api from "../../../../api/api";
import { FaChalkboardTeacher, FaBolt, FaTrophy, FaSyncAlt, FaMedal, FaCrown, FaInfoCircle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function EngagementScoreLeaderboard() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompute, setLoadingCompute] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    primaryLight: "#f3e8ff",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    card: "#ffffff",
    gold: "#fbbf24",
    silver: "#94a3b8",
    bronze: "#b45309"
  };

  const fetchInstructorCourses = async () => {
    const candidates = [
      "/instructor/courses", "/instructor/courses?status=approved",
      "/instructor-dashboard/instructor_courses", "/instructor/instructor_courses",
      "/instructor/my-courses",
    ];
    for (const url of candidates) {
      try {
        const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
        const list = res.data?.courses || res.data?.myCourses || (Array.isArray(res.data) ? res.data : null);
        if (Array.isArray(list)) return list;
      } catch (e) {}
    }
    throw new Error("No instructor courses endpoint matched.");
  };

  const computeEngagement = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingCompute(true);
      setErr("");
      await api.post(`/analytics/engagement/course/${courseId}/compute?days=30`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await fetchLeaderboard(courseId);
    } catch (e) {
      setErr("Failed to compute engagement score.");
    } finally {
      setLoadingCompute(false);
    }
  };

  const fetchLeaderboard = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingBoard(true);
      setErr("");
      const res = await api.get(`/analytics/engagement/course/${courseId}?days=30`, { headers: { Authorization: `Bearer ${token}` } });
      setLeaderboard(Array.isArray(res.data?.leaderboard) ? res.data.leaderboard : []);
    } catch (e) {
      setErr("Failed to load engagement leaderboard.");
      setLeaderboard([]);
    } finally {
      setLoadingBoard(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const list = await fetchInstructorCourses();
        const normalized = list.map((c) => ({ _id: c._id, title: c.title || c.courseTitle || "Untitled" })).filter((c) => c._id);
        setCourses(normalized);
        const firstId = normalized[0]?._id || "";
        setSelectedCourseId(firstId);
        if (firstId) await fetchLeaderboard(firstId);
      } catch (e) {
        setErr("Could not load instructor courses.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    if (selectedCourseId) fetchLeaderboard(selectedCourseId);
  }, [selectedCourseId]);

  const stats = useMemo(() => {
    const total = leaderboard.length;
    const avg = total > 0 ? Math.round(leaderboard.reduce((s, r) => s + (r.score || 0), 0) / total) : 0;
    const top = total > 0 ? Math.max(...leaderboard.map((r) => r.score || 0)) : 0;
    return { total, avg, top };
  }, [leaderboard]);

  const getRankStyle = (idx) => {
    if (idx === 0) return { color: colors.gold, icon: <FaCrown /> };
    if (idx === 1) return { color: colors.silver, icon: <FaMedal /> };
    if (idx === 2) return { color: colors.bronze, icon: <FaMedal /> };
    return { color: colors.textMuted, icon: null };
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
      <div className="spinner-grow text-primary" role="status"></div>
    </div>
  );

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header Section */}
        <header className="row g-4 mb-4 align-items-center">
          <div className="col-12 col-md-7 text-start">
            <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px" }}>
              Engagement Score
            </h2>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontWeight: 500 }}>
              Gamified student performance based on activity markers (last 30 days).
            </p>
          </div>
          <div className="col-12 col-md-5 text-md-end d-flex gap-2 justify-content-md-end">
             <button
              className="btn"
              onClick={() => computeEngagement(selectedCourseId)}
              disabled={loadingCompute || !selectedCourseId}
              style={{
                background: "linear-gradient(135deg, #6f42c1 0%, #8553e8 100%)",
                color: "#fff", borderRadius: "14px", padding: "12px 24px", fontWeight: "700",
                border: "none", display: "inline-flex", alignItems: "center", gap: "10px",
                boxShadow: "0 10px 20px -5px rgba(111, 66, 193, 0.4)", transition: "all 0.3s ease"
              }}
            >
              <FaBolt className={loadingCompute ? "fa-spin" : ""} />
              {loadingCompute ? "Computing..." : "Compute Score"}
            </button>
            <button
              className="btn btn-white border"
              onClick={() => fetchLeaderboard(selectedCourseId)}
              disabled={loadingBoard || !selectedCourseId}
              style={{ borderRadius: "14px", padding: "12px", background: "#fff" }}
            >
              <FaSyncAlt className={loadingBoard ? "fa-spin" : ""} />
            </button>
          </div>
        </header>

        {err && <div className="alert alert-danger shadow-sm border-0 rounded-4 mb-4 text-start">{err}</div>}

        {/* Course Context Card */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
          <div className="row g-3 align-items-center">
            <div className="col-auto">
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: colors.primary, fontSize: "24px" }}>
                <FaChalkboardTeacher />
              </div>
            </div>
            <div className="col text-start">
              <h6 className="m-0 fw-bold text-dark">Leaderboard Context</h6>
              <p className="m-0 text-muted small">Viewing ranking for selected course</p>
            </div>
            <div className="col-12 col-lg-5">
              <select className="form-select border-0 bg-light fw-bold py-3" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} style={{ borderRadius: "14px", cursor: "pointer" }}>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <StatCard title="Active Students" value={stats.total} icon={<FaMedal />} colors={colors} />
          </div>
          <div className="col-12 col-md-4">
            <StatCard title="Avg Engagement" value={`${stats.avg}%`} icon={<FaBolt />} colors={colors} />
          </div>
          <div className="col-12 col-md-4">
            <StatCard title="Top Score" value={stats.top} icon={<FaCrown />} colors={colors} />
          </div>
        </div>

        {/* Leaderboard Table Card */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "12px" }}>
            <FaTrophy className="text-warning" />
            <h5 className="m-0 fw-bold text-dark">Student Leaderboard</h5>
            <div className="badge bg-light text-muted fw-bold small rounded-pill px-3 py-2 border ms-auto">Last 30 Days</div>
          </div>

          <div className="table-responsive">
            {leaderboard.length === 0 ? (
              <EmptyBox text='No data computed. Click "Compute Score" to generate the leaderboard.' />
            ) : (
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: "#fcfcfd" }}>
                  <tr style={{ color: colors.textMuted, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                    <th className="ps-4 py-4">Rank</th>
                    <th className="text-start">Student Details</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Progress</th>
                    <th className="text-center">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {leaderboard.map((r, idx) => {
                      const { color, icon } = getRankStyle(idx);
                      return (
                        <motion.tr key={r._id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold" style={{ color: color, fontSize: idx < 3 ? "1.2rem" : "1rem" }}>
                                  {idx + 1}
                                </span>
                                {icon && <span style={{ color: color }}>{icon}</span>}
                            </div>
                          </td>
                          <td className="text-start">
                            <div className="fw-bold text-dark">{r.userId?.name || "Unknown"}</div>
                            <div style={{ fontSize: 11, color: colors.textMuted }}>{r.userId?.email}</div>
                          </td>
                          <td className="text-center">
                            <span className="badge rounded-pill px-3 py-2" style={{ background: colors.primaryLight, color: colors.primary, fontWeight: "800" }}>
                              {r.score}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="small text-muted fw-bold">L: {r.lessonCompletes} | W: {r.watch30Events} | E: {r.examCompletes}</div>
                            <div className="progress mt-1" style={{ height: "4px" }}>
                                <div className="progress-bar" style={{ width: `${r.score}%`, background: colors.primary }} />
                            </div>
                          </td>
                          <td className="pe-4 text-end text-muted small">
                            {r.lastEventAt ? new Date(r.lastEventAt).toLocaleDateString() : "—"}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>

          {/* Info Footer */}
          <div style={{ padding: "20px 24px", background: "#f8f9fa", borderTop: `1px solid ${colors.border}` }}>
            <div className="d-flex align-items-center justify-content-start gap-2 text-muted text-start" style={{ fontSize: "12px" }}>
              <FaInfoCircle />
              <span>Score is calculated based on weighted metrics: Lesson Completions, Video Watch time, and Exam performance.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, colors }) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "18px", padding: "20px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
      <div style={{ fontSize: "20px", color: colors.primary }}>{icon}</div>
      <div className="text-start">
        <div style={{ color: colors.textMuted, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{title}</div>
        <div style={{ color: colors.textMain, fontSize: 20, fontWeight: 900 }}>{value}</div>
      </div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: "20px", margin: "20px" }}>
      <p className="mb-0 fw-medium mx-auto" style={{ maxWidth: "400px" }}>{text}</p>
    </div>
  );
}