import { useEffect, useMemo, useState } from "react";
import api from "../../../../api/api";
import { FaChalkboardTeacher, FaBolt, FaTrophy, FaSyncAlt } from "react-icons/fa";

export default function EngagementScoreLeaderboard() {
  const [courses, setCourses] = useState([]); // [{_id,title}]
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [leaderboard, setLeaderboard] = useState([]); // [{userId:{name,email}, score, ...}]
  const [loading, setLoading] = useState(true);
  const [loadingCompute, setLoadingCompute] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    card: "#ffffff",
  };

  // same logic you use in CourseEventAnalytics
  const fetchInstructorCourses = async () => {
    const candidates = [
      "/instructor/courses",
      "/instructor/courses?status=approved",
      "/instructor-dashboard/instructor_courses",
      "/instructor/instructor_courses",
      "/instructor/my-courses",
    ];

    for (const url of candidates) {
      try {
        const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });

        const list =
          res.data?.courses ||
          res.data?.myCourses ||
          (Array.isArray(res.data) ? res.data : null);

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

      // ✅ compute (days=30 default)
      await api.post(
        `/analytics/engagement/course/${courseId}/compute?days=30`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // after compute, refresh leaderboard
      await fetchLeaderboard(courseId);
    } catch (e) {
      console.error(e);
      setErr("Failed to compute engagement score. Check backend routes/controller.");
    } finally {
      setLoadingCompute(false);
    }
  };

  const fetchLeaderboard = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingBoard(true);
      setErr("");

      const res = await api.get(`/analytics/engagement/course/${courseId}?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLeaderboard(Array.isArray(res.data?.leaderboard) ? res.data.leaderboard : []);
    } catch (e) {
      console.error(e);
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
        setErr("");

        const list = await fetchInstructorCourses();
        const normalized = list
          .map((c) => ({
            _id: c._id,
            title: c.title || c.courseTitle || "Untitled",
          }))
          .filter((c) => c._id);

        setCourses(normalized);
        const firstId = normalized[0]?._id || "";
        setSelectedCourseId(firstId);

        // load leaderboard immediately (may be empty until compute)
        if (firstId) await fetchLeaderboard(firstId);
      } catch (e) {
        console.error(e);
        setErr("Could not load instructor courses. Update the courses endpoint.");
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!selectedCourseId) return;
    fetchLeaderboard(selectedCourseId);
  }, [selectedCourseId]);

  const stats = useMemo(() => {
    const total = leaderboard.length;
    const avg =
      total > 0
        ? Math.round(leaderboard.reduce((s, r) => s + (r.score || 0), 0) / total)
        : 0;
    const top = total > 0 ? Math.max(...leaderboard.map((r) => r.score || 0)) : 0;
    return { total, avg, top };
  }, [leaderboard]);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `4px solid ${colors.border}`,
              borderTop: `4px solid ${colors.primary}`,
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
          <p style={{ marginTop: 12, color: colors.primary, fontWeight: 600 }}>Loading...</p>
          <style>{`@keyframes spin {0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: colors.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-0.3px" }}>
          Engagement Score
        </h2>
        <p style={{ margin: "6px 0 0", color: colors.textMuted, fontWeight: 500 }}>
          Score (0–100) for students based on lessons, video watch, exams (last 30 days)
        </p>
      </div>

      {err && (
        <div className="alert alert-danger" style={{ border: "none", borderRadius: 12, marginBottom: 14 }}>
          {err}
        </div>
      )}

      {/* Filter + actions */}
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 14,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 14,
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "#f5f3ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.primary,
            fontSize: 18,
          }}
        >
          <FaChalkboardTeacher />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: colors.textMuted, textTransform: "uppercase" }}>
            Course
          </div>
          <select
            className="form-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            style={{
              marginTop: 6,
              borderRadius: 12,
              borderColor: colors.border,
              padding: "12px 12px",
              fontWeight: 700,
              color: colors.textMain,
            }}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-dark"
          onClick={() => computeEngagement(selectedCourseId)}
          style={{ borderRadius: 12, fontWeight: 900, padding: "12px 14px" }}
          disabled={loadingCompute || !selectedCourseId}
        >
          <FaBolt style={{ marginRight: 8 }} />
          {loadingCompute ? "Computing..." : "Compute Score"}
        </button>

        <button
          className="btn btn-outline-dark"
          onClick={() => fetchLeaderboard(selectedCourseId)}
          style={{ borderRadius: 12, fontWeight: 800, padding: "12px 14px" }}
          disabled={loadingBoard || !selectedCourseId}
        >
          <FaSyncAlt style={{ marginRight: 8 }} />
          {loadingBoard ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <StatCard title="Students" value={stats.total} colors={colors} />
        <StatCard title="Avg Score" value={stats.avg} colors={colors} />
        <StatCard title="Top Score" value={stats.top} colors={colors} />
      </div>

      {/* Leaderboard table */}
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ color: colors.primary }}>
            <FaTrophy />
          </div>
          <div style={{ fontWeight: 900, color: colors.textMain }}>Leaderboard</div>
          <div style={{ marginLeft: "auto", color: colors.textMuted, fontWeight: 700, fontSize: 12 }}>
            last 30 days
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <EmptyBox text='No engagement data yet. Click "Compute Score" first.' />
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Lessons</th>
                  <th>Watch(30s)</th>
                  <th>Exam Attempts</th>
                  <th>Exam Completes</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r, idx) => (
                  <tr key={r._id || idx}>
                    <td className="fw-bold">{idx + 1}</td>
                    <td>
                      <div className="fw-bold">{r.userId?.name || "Unknown"}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>{r.userId?.email || ""}</div>
                    </td>
                    <td className="fw-bold">{r.score}</td>
                    <td>{r.lessonCompletes}</td>
                    <td>{r.watch30Events}</td>
                    <td>{r.examAttempts}</td>
                    <td>{r.examCompletes}</td>
                    <td style={{ fontSize: 12, color: colors.textMuted }}>
                      {r.lastEventAt ? new Date(r.lastEventAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 10, color: colors.textMuted, fontSize: 12 }}>
          Score = lessons + video watch + exams (weights set in backend). You can change weights anytime.
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, colors }) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ color: colors.textMuted, fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
        {title}
      </div>
      <div style={{ color: colors.textMain, fontSize: 22, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div
      style={{
        padding: "44px 14px",
        textAlign: "center",
        color: "#94a3b8",
        background: "#fff",
        border: "1px dashed #e2e8f0",
        borderRadius: 12,
      }}
    >
      {text}
    </div>
  );
}
