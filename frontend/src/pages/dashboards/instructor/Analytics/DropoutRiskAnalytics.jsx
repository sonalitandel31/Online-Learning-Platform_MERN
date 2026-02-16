import { useEffect, useState } from "react";
import { FaChalkboardTeacher, FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";
import api from "../../../../api/api";

export default function DropoutRiskAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRisk, setLoadingRisk] = useState(false);
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
      } catch {}
    }
    throw new Error("No instructor courses endpoint matched.");
  };

  const fetchRisk = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingRisk(true);
      setErr("");
      const res = await api.get(
        `/analytics/risk/course/${courseId}?lookbackDays=90&inactive7=7&inactive14=14`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
    } catch (e) {
      console.error(e);
      setErr("Failed to load dropout risk.");
      setRows([]);
    } finally {
      setLoadingRisk(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setErr("");

        const list = await fetchInstructorCourses();
        const normalized = list
          .map((c) => ({ _id: c._id, title: c.title || c.courseTitle || "Untitled" }))
          .filter((c) => c._id);

        setCourses(normalized);
        const firstId = normalized[0]?._id || "";
        setSelectedCourseId(firstId);

        if (firstId) await fetchRisk(firstId);
      } catch (e) {
        console.error(e);
        setErr("Could not load instructor courses.");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!selectedCourseId) return;
    fetchRisk(selectedCourseId);
  }, [selectedCourseId]);

  if (loading) return <div className="container mt-5">Loading...</div>;

  return (
    <div style={{ padding: 16, background: colors.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900 }}>Drop-out Risk</h2>
        <p style={{ margin: "6px 0 0", color: colors.textMuted, fontWeight: 500 }}>
          7 days inactive = Medium, 14 days inactive = High
        </p>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* Filter */}
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
            style={{ marginTop: 6, borderRadius: 12, padding: "12px 12px", fontWeight: 700 }}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-outline-dark"
          onClick={() => fetchRisk(selectedCourseId)}
          style={{ borderRadius: 12, fontWeight: 800, padding: "12px 14px" }}
          disabled={loadingRisk || !selectedCourseId}
        >
          <FaSyncAlt style={{ marginRight: 8 }} />
          {loadingRisk ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ color: colors.primary }}>
            <FaExclamationTriangle />
          </div>
          <div style={{ fontWeight: 900, color: colors.textMain }}>At-risk Students</div>
        </div>

        {rows.length === 0 ? (
          <div style={{ color: colors.textMuted }}>No data yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Risk</th>
                  <th>Student</th>
                  <th>Days Inactive</th>
                  <th>Engagement Score</th>
                  <th>Lessons</th>
                  <th>Watch(30s)</th>
                  <th>Exam Attempts</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId}>
                    <td className="fw-bold">{r.risk}</td>
                    <td>
                      <div className="fw-bold">{r.student?.name || "Unknown"}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>{r.student?.email || ""}</div>
                    </td>
                    <td className="fw-bold">{r.daysInactive}</td>
                    <td className="fw-bold">{r.score ?? "—"}</td>
                    <td>{r.lessonCompletes}</td>
                    <td>{r.watch30Events}</td>
                    <td>{r.examAttempts}</td>
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
          Tip: First run Engagement Compute for better scores, but risk works even without it (uses last activity).
        </div>
      </div>
    </div>
  );
}
