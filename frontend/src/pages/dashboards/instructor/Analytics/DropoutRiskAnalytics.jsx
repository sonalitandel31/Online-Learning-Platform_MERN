import { useEffect, useState } from "react";
import { 
  FaChalkboardTeacher, FaExclamationTriangle, FaSyncAlt, 
  FaUserGraduate, FaRegCalendarAlt, FaInfoCircle, FaRobot 
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
    success: "#10b981"
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
      } catch {}
    }
    throw new Error("No instructor courses endpoint matched.");
  };

  const fetchRisk = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingRisk(true);
      setErr("");
      // Call the backend endpoint (Make sure backend is updated to the new AI logic)
      const res = await api.get(
        `/analytics/risk/course/${courseId}?lookbackDays=90`,
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

  const getRiskBadge = (riskCategory) => {
    const risk = String(riskCategory || "LOW").toUpperCase();
    let bg = "#d1fae5", color = colors.success; // Default Low
    if (risk === "HIGH") { bg = "#fee2e2"; color = colors.danger; }
    else if (risk === "MEDIUM") { bg = "#fef3c7"; color = colors.warning; }

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
        background: bg,
        color: color,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
        {risk} RISK
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
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
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          {/* Header Skeleton */}
          <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div className="skeleton" style={{ height: "40px", width: "300px" }}></div>
              <div className="skeleton" style={{ height: "24px", width: "150px", borderRadius: "100px" }}></div>
            </div>
            <div className="skeleton" style={{ height: "48px", width: "180px", borderRadius: "14px" }}></div>
          </header>

          {/* Course Selector Card Skeleton */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
            <div className="row g-3 align-items-center">
              <div className="col-auto">
                <div className="skeleton" style={{ width: "56px", height: "56px", borderRadius: "16px" }}></div>
              </div>
              <div className="col text-start">
                <div className="skeleton" style={{ height: "16px", width: "150px", marginBottom: "8px" }}></div>
                <div className="skeleton" style={{ height: "12px", width: "200px" }}></div>
              </div>
              <div className="col-12 col-lg-5">
                <div className="skeleton" style={{ height: "56px", width: "100%", borderRadius: "14px" }}></div>
              </div>
            </div>
          </div>

          {/* Main Data Table Card Skeleton */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="skeleton" style={{ width: "20px", height: "20px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ height: "24px", width: "200px" }}></div>
            </div>

            {/* Desktop Table Skeleton */}
            <div className="table-responsive d-none d-lg-block">
              <table className="table align-middle mb-0">
                <thead style={{ background: "#fcfcfd" }}>
                  <tr>
                    <th className="ps-4"><div className="skeleton" style={{ height: "14px", width: "80px" }}></div></th>
                    <th><div className="skeleton" style={{ height: "14px", width: "100px" }}></div></th>
                    <th className="text-center"><div className="skeleton mx-auto" style={{ height: "14px", width: "80px" }}></div></th>
                    <th><div className="skeleton" style={{ height: "14px", width: "150px" }}></div></th>
                    <th className="pe-4 text-end"><div className="skeleton ms-auto" style={{ height: "14px", width: "70px" }}></div></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item}>
                      <td className="ps-4"><div className="skeleton" style={{ height: "24px", width: "80px", borderRadius: "20px" }}></div></td>
                      <td>
                        <div className="skeleton" style={{ height: "16px", width: "120px", marginBottom: "6px" }}></div>
                        <div className="skeleton" style={{ height: "12px", width: "160px" }}></div>
                      </td>
                      <td className="text-center"><div className="skeleton mx-auto" style={{ height: "30px", width: "60px", borderRadius: "10px" }}></div></td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <div className="skeleton" style={{ height: "20px", width: "70px", borderRadius: "4px" }}></div>
                          <div className="skeleton" style={{ height: "20px", width: "90px", borderRadius: "4px" }}></div>
                        </div>
                      </td>
                      <td className="pe-4 text-end">
                        <div className="skeleton ms-auto" style={{ height: "14px", width: "80px", marginBottom: "6px" }}></div>
                        <div className="skeleton ms-auto" style={{ height: "10px", width: "60px" }}></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Skeleton */}
            <div className="d-block d-lg-none">
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-4 border-bottom text-start">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="skeleton" style={{ height: "16px", width: "100px", marginBottom: "6px" }}></div>
                      <div className="skeleton" style={{ height: "12px", width: "140px" }}></div>
                    </div>
                    <div className="skeleton" style={{ height: "24px", width: "80px", borderRadius: "20px" }}></div>
                  </div>
                  <div className="mb-3">
                    <div className="skeleton" style={{ height: "12px", width: "100px", marginBottom: "8px" }}></div>
                    <div className="d-flex flex-wrap gap-1">
                      <div className="skeleton" style={{ height: "20px", width: "70px", borderRadius: "4px" }}></div>
                      <div className="skeleton" style={{ height: "20px", width: "90px", borderRadius: "4px" }}></div>
                    </div>
                  </div>
                  <div className="skeleton" style={{ height: "40px", width: "100%", borderRadius: "8px" }}></div>
                </div>
              ))}
            </div>

            <div style={{ padding: "20px 24px", background: "#f8f9fa", borderTop: `1px solid ${colors.border}` }}>
              <div className="d-flex align-items-center gap-2">
                <div className="skeleton" style={{ width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0 }}></div>
                <div className="skeleton" style={{ height: "12px", width: "100%" }}></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header Section */}
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px", fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
              AI Dropout Risk Engine
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ background: colors.primary, color: "#fff", padding: "6px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "5px" }}>
                <FaRobot /> Predictive Analysis Active
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
              {loadingRisk ? "Analyzing Data..." : "Run AI Analysis"}
            </button>
          </div>
        </header>

        {err && <div className="alert alert-danger shadow-sm border-0 rounded-4 mb-4">{err}</div>}

        {/* Course Selector Card */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
          <div className="row g-3 align-items-center">
            <div className="col-auto">
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: colors.primary, fontSize: "24px" }}>
                <FaChalkboardTeacher />
              </div>
            </div>
            <div className="col text-start">
              <h6 className="m-0 fw-bold text-dark">Select Course Context</h6>
              <p className="m-0 text-muted small">Identify students who need immediate intervention</p>
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
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: "12px" }}>
            <FaExclamationTriangle className="text-danger" style={{ fontSize: "1.2rem" }} />
            <h5 className="m-0 fw-bold text-dark">Intervention Watchlist</h5>
          </div>

          <div className="table-responsive d-none d-lg-block">
            {rows.length === 0 ? <EmptyState /> : (
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: "#fcfcfd" }}>
                  <tr style={{ color: colors.textMuted, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                    <th className="ps-4">Risk Severity</th>
                    <th>Student Details</th>
                    <th className="text-center">AI Risk Score</th>
                    <th>Identified Factors (Why?)</th>
                    <th className="pe-4 text-end">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rows.map((r) => (
                      <motion.tr 
                        key={r.userId} 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      >
                        <td className="ps-4">{getRiskBadge(r.riskCategory)}</td>
                        <td>
                          <div className="fw-bold text-dark">{r.student?.name || "Unknown"}</div>
                          <div style={{ fontSize: 12, color: colors.textMuted }}>{r.student?.email}</div>
                        </td>
                        <td className="text-center">
                          <span className={`badge px-3 py-2 ${r.riskScore >= 60 ? 'bg-danger' : r.riskScore >= 30 ? 'bg-warning' : 'bg-success'}`} style={{ borderRadius: '10px' }}>
                            {r.riskScore ?? 0} pts
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {r.reasons && r.reasons.length > 0 ? (
                              r.reasons.map((reason, idx) => (
                                <span key={idx} className="badge bg-light text-secondary border border-secondary-subtle" style={{ fontSize: '0.7rem', fontWeight: '600' }}>
                                  {reason}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted small">No significant risks detected</span>
                            )}
                          </div>
                        </td>
                        <td className="pe-4 text-end">
                          <div className="d-flex align-items-center justify-content-end gap-2 text-muted small fw-bold">
                            <FaRegCalendarAlt size={12} />
                            {r.lastEventAt ? new Date(r.lastEventAt).toLocaleDateString() : "Never"}
                          </div>
                          <div style={{ fontSize: '10px', color: colors.textMuted }}>
                            ({r.daysInactive === 9999 ? 'No Activity' : `${r.daysInactive} days ago`})
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
          <div className="d-block d-lg-none">
            {rows.length === 0 ? <EmptyState /> : rows.map((r) => (
              <div key={r.userId} className="p-4 border-bottom text-start">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="fw-bold text-dark">{r.student?.name}</div>
                    <div className="small text-muted">{r.student?.email}</div>
                  </div>
                  {getRiskBadge(r.riskCategory)}
                </div>
                
                <div className="mb-3">
                  <div className="small text-muted fw-bold mb-1">AI Identified Risks:</div>
                  <div className="d-flex flex-wrap gap-1">
                    {r.reasons && r.reasons.length > 0 ? r.reasons.map((reason, idx) => (
                      <span key={idx} className="badge bg-light text-secondary border" style={{ fontSize: '0.7rem' }}>{reason}</span>
                    )) : <span className="text-muted small">No risks</span>}
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded-3">
                  <div className="small">
                    <span className="text-muted">Risk Score:</span> <strong className={r.riskScore >= 60 ? 'text-danger' : 'text-dark'}>{r.riskScore}</strong>
                  </div>
                  <div className="small">
                    <span className="text-muted">Inactive:</span> <strong>{r.daysInactive} days</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: "20px 24px", background: "#f8f9fa", borderTop: `1px solid ${colors.border}` }}>
            <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "12px" }}>
              <FaInfoCircle />
              <span><strong>Explainable AI:</strong> The Risk Score is calculated using a weighted algorithm analyzing inactivity, low engagement scores, and behavioral drops.</span>
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
    <h6 className="text-muted fw-bold">No students currently meet the risk threshold.</h6>
    <p className="text-muted small">Your class is highly engaged!</p>
  </div>
);