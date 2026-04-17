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
  Cell
} from "recharts";
import { FaChalkboardTeacher, FaChartBar, FaSyncAlt, FaLightbulb } from "react-icons/fa";
import { motion } from "framer-motion";

export default function CourseEventAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
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
    accent: "#8b5cf6"
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
        const list = res.data?.courses || res.data?.myCourses || (Array.isArray(res.data) ? res.data : null);
        if (Array.isArray(list)) return list;
      } catch (e) {}
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
          .map((c) => ({ _id: c._id, title: c.title || c.courseTitle || "Untitled" }))
          .filter((c) => c._id);

        setCourses(normalized);
        setSelectedCourseId(normalized[0]?._id || "");
      } catch (e) {
        setErr("Could not load instructor courses.");
      } finally {
        setLoading(false);
      }
    };
    init();
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
      setErr("Failed to load course event analytics.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) fetchCourseEvents(selectedCourseId);
  }, [selectedCourseId]);

  const chartData = useMemo(() => {
    return events.map((e) => ({ event: e._id.replace(/_/g, ' '), count: e.count || 0 }));
  }, [events]);

  if (loading) {
    return (
      <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
          .skeleton {
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            background-color: #cbd5e1;
            border-radius: 8px;
          }
        `}</style>
        
        {/* Header Skeleton */}
        <header className="mb-5 text-start">
          <div className="skeleton" style={{ height: "36px", width: "300px", marginBottom: "8px" }}></div>
          <div className="skeleton" style={{ height: "20px", width: "400px", maxWidth: "100%" }}></div>
        </header>

        {/* Selector Card Skeleton */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: "24px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)"
        }}>
          <div className="row g-3 align-items-center">
            <div className="col-auto">
              <div className="skeleton" style={{ width: "56px", height: "56px", borderRadius: "16px" }}></div>
            </div>
            <div className="col text-start">
              <div className="skeleton" style={{ height: "16px", width: "120px", marginBottom: "8px" }}></div>
              <div className="skeleton" style={{ height: "14px", width: "180px" }}></div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="skeleton" style={{ height: "56px", width: "100%", borderRadius: "14px" }}></div>
            </div>
            <div className="col-auto">
              <div className="skeleton" style={{ height: "56px", width: "120px", borderRadius: "14px" }}></div>
            </div>
          </div>
        </div>

        {/* Main Chart Card Skeleton */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
          minHeight: "500px",
          display: "flex",
          flexDirection: "column"
        }}>
          <div className="d-flex align-items-center gap-2 mb-5">
            <div className="skeleton" style={{ width: "24px", height: "24px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ height: "24px", width: "200px" }}></div>
            <div className="skeleton ms-auto" style={{ height: "30px", width: "100px", borderRadius: "50rem" }}></div>
          </div>
          
          <div className="skeleton" style={{ width: "100%", height: "400px", borderRadius: "16px", marginBottom: "2rem" }}></div>
          
          <div style={{ 
              padding: "1rem 1.5rem", 
              background: "#f8fafc", 
              borderRadius: "16px", 
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "auto"
          }}>
            <div className="skeleton" style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0 }}></div>
            <div className="skeleton" style={{ height: "16px", width: "100%" }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Header Section */}
      <header className="mb-5 text-start">
        <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px" }}>
          Course Activity Insights
        </h2>
        <p style={{ margin: "4px 0 0", color: colors.textMuted, fontWeight: 500 }}>
          Granular breakdown of student interactions over the last 30 days.
        </p>
      </header>

      {err && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="alert alert-danger border-0 shadow-sm rounded-4 mb-4 text-start">
          {err}
        </motion.div>
      )}

      {/* Selector Card */}
      <div style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: "24px",
        padding: "24px",
        marginBottom: "24px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)"
      }}>
        <div className="row g-3 align-items-center">
          <div className="col-auto">
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              background: colors.primaryLight, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: colors.primary, fontSize: "24px"
            }}>
              <FaChalkboardTeacher />
            </div>
          </div>
          <div className="col text-start">
            <h6 className="m-0 fw-bold text-dark">Select Course</h6>
            <p className="m-0 text-muted small">Choose a course to filter event data</p>
          </div>
          <div className="col-12 col-lg-4">
            <select
              className="form-select border-0 bg-light fw-bold py-3"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{ borderRadius: "14px", cursor: "pointer" }}
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="col-auto">
            <button
              className="btn"
              onClick={() => fetchCourseEvents(selectedCourseId)}
              disabled={loadingEvents || !selectedCourseId}
              style={{
                background: "linear-gradient(135deg, #6f42c1 0%, #8553e8 100%)",
                color: "#fff",
                borderRadius: "14px",
                padding: "14px 24px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgba(111, 66, 193, 0.3)"
              }}
            >
              <FaSyncAlt className={loadingEvents ? "fa-spin" : ""} />
              {loadingEvents ? "Syncing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
        minHeight: "500px"
      }}>
        <div className="d-flex align-items-center gap-2 mb-5">
          <FaChartBar className="text-primary" size={20} />
          <h5 className="m-0 fw-bold text-dark">Event Distribution</h5>
          <div className="badge rounded-pill border ms-auto px-3 py-2 bg-light text-muted small fw-bold">
            Last 30 Days
          </div>
        </div>

        {chartData.length === 0 ? (
          <EmptyBox text="No engagement data found. Encourage students to interact with lessons and exams to populate this chart." />
        ) : (
          <div style={{ width: "100%", height: 400 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="event" 
                  tick={{ fontSize: 11, fontWeight: 600, fill: colors.textMuted }} 
                  axisLine={false}
                  tickLine={false}
                  angle={-25} 
                  textAnchor="end" 
                  interval={0}
                />
                <YAxis 
                  tick={{ fontSize: 11, fontWeight: 600, fill: colors.textMuted }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? colors.primary : colors.accent} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Info Box Footer */}
        <div style={{ 
            marginTop: "2rem", 
            padding: "1rem 1.5rem", 
            background: "#f8fafc", 
            borderRadius: "16px", 
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "12px"
        }}>
          <FaLightbulb className="text-warning" />
          <p className="m-0 text-muted small text-start">
            <strong>Pro Tip:</strong> Focus on <b>lesson_complete</b> vs <b>lesson_open</b> ratios to identify content friction points in your course.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div style={{
      padding: "80px 20px",
      textAlign: "center",
      color: "#94a3b8",
      background: "#f8fafc",
      border: "2px dashed #e2e8f0",
      borderRadius: "20px",
      margin: "20px 0"
    }}>
      <p className="mb-0 fw-medium mx-auto" style={{ maxWidth: "400px" }}>{text}</p>
    </div>
  );
}