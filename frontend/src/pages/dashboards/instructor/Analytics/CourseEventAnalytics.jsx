// src/pages/Instructor/Analytics/CourseEventAnalytics.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../../../api/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { FaChalkboardTeacher, FaChartBar } from "react-icons/fa";

export default function CourseEventAnalytics() {
  const [courses, setCourses] = useState([]); // [{_id,title}]
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [events, setEvents] = useState([]); // [{_id:event,count}]
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
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

  // ✅ IMPORTANT:
  // This endpoint must return instructor courses list.
  // If your backend uses different path, change it here.
  const fetchInstructorCourses = async () => {
    // Try multiple common endpoints, first that works will be used
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

        // normalize response
        const list =
          res.data?.courses ||
          res.data?.myCourses ||
          (Array.isArray(res.data) ? res.data : null);

        if (Array.isArray(list)) return list;
      } catch (e) {
        // continue
      }
    }

    throw new Error("No instructor courses endpoint matched.");
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
        setSelectedCourseId(normalized[0]?._id || "");
      } catch (e) {
        console.error(e);
        setErr(
          "Could not load instructor courses. Please update the courses endpoint in CourseEventAnalytics.jsx."
        );
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchCourseEvents = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingEvents(true);
      setErr("");
      const res = await api.get(`/analytics/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(Array.isArray(res.data?.events) ? res.data.events : []);
    } catch (e) {
      console.error(e);
      setErr("Failed to load course event analytics.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (!selectedCourseId) return;
    fetchCourseEvents(selectedCourseId);
  }, [selectedCourseId]);

  const chartData = useMemo(() => {
    return events.map((e) => ({ event: e._id, count: e.count || 0 }));
  }, [events]);

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
          <p style={{ marginTop: 12, color: colors.primary, fontWeight: 600 }}>Loading Courses...</p>
          <style>{`@keyframes spin {0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: colors.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-0.3px" }}>
          Course Event Analytics
        </h2>
        <p style={{ margin: "6px 0 0", color: colors.textMuted, fontWeight: 500 }}>
          Select a course and see student actions (last 30 days)
        </p>
      </div>

      {err && (
        <div className="alert alert-danger" style={{ border: "none", borderRadius: 12, marginBottom: 14 }}>
          {err}
        </div>
      )}

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
          className="btn btn-outline-dark"
          onClick={() => fetchCourseEvents(selectedCourseId)}
          style={{ borderRadius: 12, fontWeight: 800, padding: "12px 14px" }}
          disabled={loadingEvents || !selectedCourseId}
        >
          {loadingEvents ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Chart */}
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
            <FaChartBar />
          </div>
          <div style={{ fontWeight: 900, color: colors.textMain }}>Event Counts</div>
          <div style={{ marginLeft: "auto", color: colors.textMuted, fontWeight: 700, fontSize: 12 }}>
            last 30 days
          </div>
        </div>

        {chartData.length === 0 ? (
          <EmptyBox text="No course event data yet. Open lesson/exam pages to generate events." />
        ) : (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="event" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={colors.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ marginTop: 10, color: colors.textMuted, fontSize: 12 }}>
          Tip: track events like <b>course_open</b>, <b>lesson_open</b>, <b>lesson_complete</b>, <b>exam_start</b>, <b>exam_complete</b>.
        </div>
      </div>
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
