import { useEffect, useState } from "react";
import { 
  FaChalkboardTeacher, FaExclamationTriangle, FaSyncAlt, 
  FaUserGraduate, FaRegCalendarAlt, FaEnvelope, FaBookOpen 
} from "react-icons/fa";
import api from "../../../../api/api";
import { motion, AnimatePresence } from "framer-motion";

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
    primaryLight: "#f3e8ff",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    card: "#ffffff",
    danger: "#ef4444",
    warning: "#f59e0b",
  };

  // --- Logic remains unchanged ---
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
  }, [token]);

  useEffect(() => {
    if (!selectedCourseId) return;
    fetchRisk(selectedCourseId);
  }, [selectedCourseId]);

  const getRiskBadge = (risk) => {
    const isHigh = risk?.toLowerCase().includes("high");
    return (
      <div style={{
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: "800",
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: isHigh ? "#fee2e2" : "#fef3c7",
        color: isHigh ? colors.danger : colors.warning,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
        {risk}
      </div>
    );
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
      <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
    </div>
  );

  return (
    <div style={{ 
      padding: "clamp(16px, 4vw, 32px)", 
      background: colors.bg, 
      minHeight: "100vh", 
      fontFamily: "'Plus Jakarta Sans', sans-serif" 
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header Section */}
        <header style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginBottom: "2rem",
          gap: "1.5rem" 
        }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ 
              margin: 0, 
              color: colors.textMain, 
              fontWeight: 900, 
              letterSpacing: "-1px",
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
            }}>
              Dropout Risk Analytics
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ 
                background: colors.warning, color: "#fff", padding: "6px 14px", 
                borderRadius: "100px", fontSize: "12px", fontWeight: "700",
                boxShadow: "0 4px 10px rgba(245, 158, 11, 0.2)"
              }}>
                7d Inactive = Medium
              </span>
              <span style={{ 
                background: colors.danger, color: "#fff", padding: "6px 14px", 
                borderRadius: "100px", fontSize: "12px", fontWeight: "700",
                boxShadow: "0 4px 10px rgba(239, 68, 68, 0.2)"
              }}>
                14d Inactive = High
              </span>
            </div>
          </div>
          
          <div>
            <button
              onClick={() => fetchRisk(selectedCourseId)}
              disabled={loadingRisk || !selectedCourseId}
              style={{
                background: "linear-gradient(135deg, #6f42c1 0%, #8553e8 100%)",
                color: "#fff",
                borderRadius: "14px",
                padding: "12px 28px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                border: "none",
                transition: "all 0.3s ease",
                boxShadow: "0 10px 20px -5px rgba(111, 66, 193, 0.4)",
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <FaSyncAlt className={loadingRisk ? "fa-spin" : ""} />
              {loadingRisk ? "Refreshing..." : "Refresh Insights"}
            </button>
          </div>
        </header>

        {err && <div className="alert alert-danger shadow-sm border-0 rounded-4 mb-4">{err}</div>}

        {/* Course Selector Card */}
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
              <h6 className="m-0 fw-bold text-dark">Switch Analytics Context</h6>
              <p className="m-0 text-muted small">Viewing dropout risk for your students</p>
            </div>
            <div className="col-12 col-lg-5">
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
          </div>
        </div>

        {/* Main Data Table Card */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)"
        }}>
          <div style={{ 
            padding: "24px", 
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "flex-start"
          }}>
            <FaExclamationTriangle className="text-danger" style={{ fontSize: "1.2rem" }} />
            <h5 className="m-0 fw-bold text-dark">Critical Risk Watchlist</h5>
          </div>

          <div className="table-responsive d-none d-md-block">
            {rows.length === 0 ? <EmptyState /> : (
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: "#fcfcfd" }}>
                  <tr style={{ color: colors.textMuted, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                    <th className="text-center">Risk Severity</th>
                    <th className="text-start">Student Details</th>
                    <th className="text-center">Gap (Days)</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Engagement</th>
                    <th className="pe-4 text-end">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rows.map((r) => (
                      <motion.tr 
                        key={r.userId} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0 }}
                      >
                        <td className="ps-4">{getRiskBadge(r.risk)}</td>
                        <td className="text-start">
                          <div className="fw-bold text-dark">{r.student?.name || "Unknown"}</div>
                          <div style={{ fontSize: 12, color: colors.textMuted }}>{r.student?.email}</div>
                        </td>
                        <td className="text-center">
                          <span className={`fw-bold ${r.daysInactive > 10 ? 'text-danger' : 'text-dark'}`}>{r.daysInactive}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge px-3 py-2" style={{ background: colors.primaryLight, color: colors.primary, borderRadius: '10px' }}>
                            {r.score ?? "—"}
                          </span>
                        </td>
                        <td className="text-center">
                           <div className="small text-muted fw-bold">L: {r.lessonCompletes} | E: {r.examAttempts}</div>
                        </td>
                        <td className="pe-4 text-end">
                          <div className="d-flex align-items-center justify-content-end gap-2 text-muted small">
                            <FaRegCalendarAlt size={12} />
                            {r.lastEventAt ? new Date(r.lastEventAt).toLocaleDateString() : "Never"}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile View */}
          <div className="d-block d-md-none">
            {rows.length === 0 ? <EmptyState /> : rows.map((r) => (
              <div key={r.userId} className="p-4 border-bottom text-start">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="text-start">
                    <div className="fw-bold text-dark">{r.student?.name}</div>
                    <div className="small text-muted">{r.student?.email}</div>
                  </div>
                  {getRiskBadge(r.risk)}
                </div>
                <div className="row g-2 text-center">
                  <div className="col-4">
                    <div className="p-2 bg-light rounded-3 small text-muted">Inactive</div>
                    <div className="fw-bold">{r.daysInactive}d</div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 bg-light rounded-3 small text-muted">Score</div>
                    <div className="fw-bold text-primary">{r.score ?? 0}</div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 bg-light rounded-3 small text-muted">Lessons</div>
                    <div className="fw-bold">{r.lessonCompletes}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* REFINED BOTTOM INFO SECTION: strictly left-aligned */}
          <div style={{ 
            padding: "20px 24px", 
            background: "#f8f9fa", 
            borderTop: `1px solid ${colors.border}`,
            width: "100%" 
          }}>
            <div className="d-flex align-items-center justify-content-start gap-2 text-muted" style={{ fontSize: "12px" }}>
              <FaInfoCircle />
              <span className="text-start">Pro Tip: Run "Engagement Compute" regularly to maintain accurate student risk profiles.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EmptyState = () => (
  <div className="p-5 text-center">
    <FaUserGraduate size={48} className="text-light mb-3" />
    <h6 className="text-muted fw-bold">No students currently meet the inactivity risk threshold.</h6>
  </div>
);

function FaInfoCircle(props) {
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" {...props}>
      <path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"></path>
    </svg>
  );
}