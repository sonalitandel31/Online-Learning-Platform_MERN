import { useEffect, useState } from "react";
import { 
  FaChalkboardTeacher, FaExclamationCircle, FaSyncAlt, 
  FaCheckCircle, FaLightbulb, FaRobot, FaPlayCircle, FaFilePdf, FaArrowDown 
} from "react-icons/fa";
import api from "../../../../api/api";
import { motion, AnimatePresence } from "framer-motion";

// --- Beautiful Circular Progress Component ---
const CircularProgress = ({ percentage, color, size = 60 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Ensure percentage is capped between 0 and 100 for visual accuracy
  const displayPercent = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (displayPercent / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth} 
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" 
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }} 
        />
      </svg>
      <span style={{ position: "absolute", fontSize: "0.8rem", fontWeight: "800", color: "#1e293b" }}>
        {displayPercent}%
      </span>
    </div>
  );
};

export default function LessonDropoffAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    bg: "#f4f7fb",
    border: "#e2e8f0",
    textMain: "#0f172a",
    textMuted: "#64748b",
    card: "#ffffff",
    danger: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981"
  };

  const fetchInstructorCourses = async () => {
    const candidates = [
      "/instructor/courses", "/instructor/courses?status=approved",
      "/instructor-dashboard/instructor_courses", "/instructor/instructor_courses", "/instructor/my-courses",
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

  const fetchDropoffData = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingData(true);
      setErr("");
      const res = await api.get(`/analytics/dropoff/course/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      setInsights(res.data?.insights || []);
    } catch (e) {
      setErr("Failed to load insights. Ensure backend is running.");
      setInsights([]);
    } finally {
      setLoadingData(false);
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
        if (firstId) await fetchDropoffData(firstId);
      } catch (e) {
        setErr("Could not load courses.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    if (selectedCourseId) fetchDropoffData(selectedCourseId);
  }, [selectedCourseId]);

  const getTheme = (status) => {
    switch (status) {
      case "CRITICAL": return { color: colors.danger, bg: "#fef2f2", light: "#fee2e2", icon: <FaExclamationCircle />, label: "Immediate Action" };
      case "WARNING": return { color: colors.warning, bg: "#fffbeb", light: "#fef3c7", icon: <FaExclamationCircle />, label: "Needs Improvement" };
      case "HEALTHY": return { color: colors.success, bg: "#ecfdf5", light: "#d1fae5", icon: <FaCheckCircle />, label: "Excellent Retention" };
      default: return { color: colors.textMuted, bg: "#f8fafc", light: "#f1f5f9", icon: <FaLightbulb />, label: "Gathering Data" };
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: colors.bg }}>
      <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
    </div>
  );

  return (
    <div style={{ padding: "clamp(20px, 5vw, 40px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* PREMIUM HEADER */}
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "2.5rem", gap: "1.5rem" }}>
          <div>
            <div className="d-flex align-items-center gap-3 mb-2">
              <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px", fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
                Content Optimizer AI
              </h2>
              <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "#fff", padding: "6px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
                <FaRobot size={14}/> Active
              </div>
            </div>
            <p style={{ margin: 0, color: colors.textMuted, fontSize: "1rem", fontWeight: 500 }}>Identify and fix lessons where students lose interest.</p>
          </div>
          
          <button
            onClick={() => fetchDropoffData(selectedCourseId)}
            disabled={loadingData || !selectedCourseId}
            style={{
              background: colors.card, color: "#2563eb", borderRadius: "16px", padding: "14px 32px", fontWeight: "700", border: "1px solid #bfdbfe", transition: "all 0.3s ease", boxShadow: "0 8px 20px rgba(0,0,0,0.04)", display: "inline-flex", alignItems: "center", gap: "10px"
            }}
          >
            <FaSyncAlt className={loadingData ? "fa-spin" : ""} />
            {loadingData ? "Analyzing..." : "Run AI Scan"}
          </button>
        </header>

        {err && <div className="alert alert-danger rounded-4 border-0 mb-4">{err}</div>}

        {/* SELECTOR */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", padding: "20px 28px", marginBottom: "30px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.03)" }}>
          <div className="row g-4 align-items-center text-start">
            <div className="col-auto d-none d-md-block">
              <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: "24px" }}>
                <FaChalkboardTeacher />
              </div>
            </div>
            <div className="col">
              <h6 className="m-0 fw-bold text-dark">Target Course</h6>
              <p className="m-0 text-muted small mt-1">Select course to view its retention heat-map</p>
            </div>
            <div className="col-12 col-lg-5">
              <select className="form-select border-0 bg-light fw-bold py-3 px-4" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} style={{ borderRadius: "16px" }}>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ANALYTICS GRID */}
        <div className="row g-4">
          <AnimatePresence>
            {insights.length === 0 && !loadingData ? (
              <div className="col-12 text-center py-5 bg-white rounded-4 border">
                <FaLightbulb size={32} className="text-muted opacity-50 mb-3" />
                <h5 className="text-dark fw-bold">No Activity Data Found</h5>
              </div>
            ) : (
              insights.map((lesson, index) => {
                const theme = getTheme(lesson.status);
                // --- THE FIX: Capping the Drop-off rate between 0 and 100 ---
                const safeDropoff = Math.min(100, Math.max(0, lesson.dropoffRate));
                
                return (
                  <motion.div 
                    key={lesson.lessonId} className="col-12 col-lg-6"
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  >
                    <div style={{ 
                      background: colors.card, borderRadius: "24px", overflow: "hidden", border: `1px solid ${lesson.status === "CRITICAL" ? '#fca5a5' : colors.border}`, height: "100%", display: "flex", flexDirection: "column", position: "relative"
                    }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: theme.color }} />

                      <div className="p-4 text-start" style={{ flexGrow: 1 }}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <span style={{ padding: "6px 12px", background: "#f1f5f9", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700", color: "#475569" }}>
                                {lesson.contentType?.toUpperCase() || 'LESSON'}
                              </span>
                              <span className="small text-muted fw-bold">• {lesson.duration || 0} SEC</span>
                            </div>
                            <h4 className="fw-bold m-0 text-dark" style={{ lineHeight: '1.3', fontSize: "1.15rem" }}>{lesson.title}</h4>
                          </div>
                          <div className="text-center">
                            <CircularProgress percentage={safeDropoff} color={theme.color} />
                            <div className="tiny-label text-muted fw-bold mt-1" style={{ fontSize: '10px' }}>DROP-OFF</div>
                          </div>
                        </div>

                        <div className="d-flex gap-3 mb-4">
                          <div className="flex-grow-1 bg-light p-3 rounded-4 border">
                            <div className="small text-muted fw-bold text-uppercase">Started</div>
                            <div className="h4 fw-bold m-0">{lesson.views}</div>
                          </div>
                          <div className="flex-grow-1 bg-light p-3 rounded-4 border">
                            <div className="small text-muted fw-bold text-uppercase">Completed</div>
                            <div className="h4 fw-bold m-0">{lesson.completions}</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 text-start" style={{ background: theme.bg, borderTop: `1px solid ${theme.light}` }}>
                        <div className="d-flex align-items-start gap-3">
                          <div style={{ color: theme.color, marginTop: '4px' }}>{theme.icon}</div>
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h6 className="fw-bold m-0" style={{ color: theme.color }}>{theme.label}</h6>
                              {lesson.status === "CRITICAL" && <FaArrowDown color={theme.color} size={12}/>}
                            </div>
                            <p className="m-0 small fw-medium" style={{ color: "#475569" }}>{lesson.aiSuggestion}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}