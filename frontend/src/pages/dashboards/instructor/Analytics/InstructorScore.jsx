import { useEffect, useState } from "react";
import api from "../../../../api/api";
import { FaGraduationCap, FaUsers, FaChartPie, FaExclamationCircle, FaInfoCircle } from "react-icons/fa";
import { motion } from "framer-motion";

export default function InstructorScore() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

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
    success: "#10b981",
    warning: "#f59e0b"
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get("/analytics/instructor/score/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data?.data || null);
      } catch (e) {
        setErr("Failed to load instructor score.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
    </div>
  );

  if (err) return (
    <div className="container mt-5 pt-5">
      <div className="alert alert-danger rounded-4 border-0 shadow-sm d-flex align-items-center gap-3">
        <FaExclamationCircle /> {err}
      </div>
    </div>
  );

  if (!data) return <div className="container mt-5 pt-5 text-muted text-center">No performance data found.</div>;

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: "10=00px", margin: "0 auto" }}>

        {/* Header */}
        <header className="mb-5 text-start">
          <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px" }}>
            Performance Overview
          </h2>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontWeight: 500 }}>
            Your overall instructor rating and key course metrics.
          </p>
        </header>

        <div className="row g-4">
          {/* Major Score Card */}
          <div className="col-12 col-lg-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "linear-gradient(135deg, #6f42c1 0%, #8346de 100%)",
                borderRadius: "32px",
                padding: "40px",
                color: "#fff",
                height: "100%",
                boxShadow: "0 20px 40px -10px rgba(111, 66, 193, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center"
              }}
            >
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <svg width="140" height="140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                  <circle cx="70" cy="70" r="60" fill="none" stroke="#fff" strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - data.score / 100)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease-out", transform: "rotate(-90deg)", transformOrigin: "center" }}
                  />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "32px", fontWeight: "900" }}>
                  {data.score}
                </div>
              </div>
              <h4 className="fw-bold mb-1">Instructor Score</h4>
              <p className="opacity-75 small">Based on engagement and retention across all courses</p>
            </motion.div>
          </div>

          {/* Secondary Stats */}
          <div className="col-12 col-lg-8">
            <div className="row g-4">
              <div className="col-12 col-md-6">
                <MiniStatCard icon={<FaGraduationCap />} label="Total Courses" value={data.courseCount} color={colors.primary} />
              </div>
              <div className="col-12 col-md-6">
                <MiniStatCard icon={<FaUsers />} label="Avg Engagement" value={data.avgEngagement} color={colors.success} />
              </div>
              <div className="col-12 col-md-6">
                <MiniStatCard icon={<FaChartPie />} label="High Risk Rate" value={`${data.highRiskRate}%`} color={colors.danger} />
              </div>
              <div className="col-12 col-md-6">
                <div style={{
                  background: colors.card, border: `1px solid ${colors.border}`,
                  borderRadius: "24px", padding: "24px", height: "100%", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)"
                }}>
                  <div className="d-flex justify-content-between align-items-start text-start">
                    <div>
                      <div style={{ color: colors.textMuted, fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>Avg Drop-off</div>
                      <div style={{ color: colors.textMain, fontSize: "28px", fontWeight: "900" }}>{data.avgDropRate}%</div>
                    </div>
                    <div style={{ padding: "10px", borderRadius: "12px", background: "#fee2e2", color: colors.danger }}>
                      <FaChartPie />
                    </div>
                  </div>
                  <div className="mt-2 text-start">
                    <div className="progress" style={{ height: "6px", borderRadius: "10px" }}>
                      <div className="progress-bar" style={{ width: `${data.avgDropRate}%`, background: colors.danger }} />
                    </div>
                    <p className="text-muted small mt-2 mb-0" style={{ fontSize: "11px" }}>Lower rates indicate higher content completion.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip Box */}
        <div style={{
          marginTop: "2rem",
          padding: "24px",
          background: "#fff",
          borderRadius: "24px",
          border: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: colors.primaryLight, color: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FaInfoCircle />
          </div>
          <p className="m-0 text-muted small text-start">
            <strong>Performance Logic:</strong> Your score is calculated by balancing <b>Active Engagement</b> vs <b>Student Risk</b>. Reducing your <b>High Risk Rate</b> below 10% will significantly boost your score.
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniStatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: "24px", padding: "24px", height: "100%",
      display: "flex", alignItems: "center", gap: "20px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)"
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "16px",
        background: `${color}15`, color: color,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
      }}>
        {icon}
      </div>
      <div className="text-start">
        <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>{label}</div>
        <div style={{ color: "#1e293b", fontSize: "28px", fontWeight: "900" }}>{value}</div>
      </div>
    </div>
  );
}