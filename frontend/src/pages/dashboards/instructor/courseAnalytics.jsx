import { useState, useEffect } from "react";
import api from "../../../api/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { FaChartBar, FaChartPie, FaTable, FaRobot, FaUserShield, FaExclamationTriangle } from "react-icons/fa";

function CourseAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [aiScore, setAiScore] = useState(null); // AI Score state add ki hai
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    primaryLight: "#f3e8ff",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    chartColors: ["#6f42c1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"],
    warning: "#eab308",
    danger: "#ef4444",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Basic Course Analytics (Aapka purana API)
        const resAnalytics = await api.get("/instructor/course-analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnalytics(resAnalytics.data.analytics || []);

        // 2. Fetch AI Instructor Score & Engagement (Naya API jo humne backend mein banaya tha)
        const resScore = await api.get("/analytics/instructor/score/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resScore.data && resScore.data.success) {
          setAiScore(resScore.data.data);
        }

      } catch (err) {
        console.error(err);
        setError("Failed to fetch comprehensive analytics. Some data might be missing.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Format chart data
  const revenueData = analytics.map((c) => ({
    name: c.courseTitle.length > 12 ? c.courseTitle.slice(0, 12) + "..." : c.courseTitle,
    value: c.revenue || 0,
  }));

  const enrollmentData = analytics.map((c) => ({
    course: c.courseTitle.length > 10 ? c.courseTitle.slice(0, 10) + "..." : c.courseTitle,
    enrollments: c.totalStudents || 0,
  }));

  if (loading) {
    return (
      <div className="analytics-container">
        <style>{`
          .analytics-container { padding: 20px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
          .page-header { margin-bottom: 24px; }
          .charts-grid { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
          .chart-card { background: white; padding: 24px; border-radius: 16px; border: 1px solid ${colors.border}; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
          .data-table-wrapper { background: white; border-radius: 16px; border: 1px solid ${colors.border}; overflow: hidden; display: none; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
          .data-table { width: 100%; border-collapse: collapse; }
          .data-table th { background: #f8fafc; padding: 16px; text-align: left; font-size: 0.8rem; color: ${colors.textMuted}; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; font-weight: 700; }
          .data-table td { padding: 16px; border-bottom: 1px solid ${colors.border}; }
          .mobile-data-list { display: flex; flex-direction: column; gap: 12px; }
          .course-stat-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; }

          @media (min-width: 992px) {
            .analytics-container { padding: 30px; }
            .charts-grid { flex-direction: row; }
            .chart-card { flex: 1; width: 50%; }
            .data-table-wrapper { display: block; }
            .mobile-data-list { display: none; }
          }
          
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

        <div className="page-header">
          <div className="skeleton" style={{ height: "36px", width: "300px", marginBottom: "8px" }}></div>
          <div className="skeleton" style={{ height: "20px", width: "400px", maxWidth: "100%" }}></div>
        </div>

        {/* AI Banner Skeleton */}
        <div style={{ background: "#e2e8f0", borderRadius: "16px", padding: "24px", marginBottom: "30px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "15px" }}>
            <div>
              <div className="skeleton" style={{ height: "28px", width: "200px", marginBottom: "8px" }}></div>
              <div className="skeleton" style={{ height: "16px", width: "300px", maxWidth: "100%" }}></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="skeleton" style={{ height: "14px", width: "120px", marginBottom: "8px" }}></div>
              <div className="skeleton" style={{ height: "40px", width: "80px", marginLeft: "auto" }}></div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ background: "rgba(255,255,255,0.4)", padding: "15px", borderRadius: "12px" }}>
                <div className="skeleton" style={{ height: "14px", width: "100px", marginBottom: "12px" }}></div>
                <div className="skeleton" style={{ height: "24px", width: "60px" }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Grid Skeleton */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="skeleton" style={{ height: "24px", width: "180px", marginBottom: "20px" }}></div>
            <div className="skeleton" style={{ width: "100%", height: "280px", borderRadius: "12px" }}></div>
          </div>
          <div className="chart-card">
            <div className="skeleton" style={{ height: "24px", width: "150px", marginBottom: "20px" }}></div>
            <div className="skeleton" style={{ width: "100%", height: "280px", borderRadius: "12px" }}></div>
          </div>
        </div>

        {/* Data Table Skeleton */}
        <div className="skeleton" style={{ height: "24px", width: "220px", marginBottom: "15px" }}></div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th width="35%"><div className="skeleton" style={{ height: "14px", width: "100px" }}></div></th>
                <th width="15%"><div className="skeleton" style={{ height: "14px", width: "80px" }}></div></th>
                <th width="15%"><div className="skeleton" style={{ height: "14px", width: "80px" }}></div></th>
                <th width="20%"><div className="skeleton" style={{ height: "14px", width: "150px" }}></div></th>
                <th width="15%"><div className="skeleton" style={{ height: "14px", width: "100px" }}></div></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((item) => (
                <tr key={item}>
                  <td><div className="skeleton" style={{ height: "20px", width: "180px" }}></div></td>
                  <td><div className="skeleton" style={{ height: "16px", width: "40px" }}></div></td>
                  <td><div className="skeleton" style={{ height: "16px", width: "40px" }}></div></td>
                  <td>
                    <div className="skeleton" style={{ height: "12px", width: "100%", marginBottom: "6px" }}></div>
                    <div className="skeleton" style={{ height: "8px", width: "100%", borderRadius: "10px" }}></div>
                  </td>
                  <td><div className="skeleton" style={{ height: "20px", width: "80px" }}></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Data List Skeleton */}
        <div className="mobile-data-list">
          {[1, 2, 3].map((item) => (
            <div key={item} className="course-stat-card">
              <div className="skeleton" style={{ height: "20px", width: "60%", marginBottom: "16px" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div className="skeleton" style={{ height: "14px", width: "80px" }}></div>
                <div className="skeleton" style={{ height: "14px", width: "40px" }}></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <div className="skeleton" style={{ height: "14px", width: "80px" }}></div>
                <div className="skeleton" style={{ height: "14px", width: "40px" }}></div>
              </div>
              <div className="skeleton" style={{ height: "14px", width: "100%", marginBottom: "6px" }}></div>
              <div className="skeleton" style={{ height: "8px", width: "100%", borderRadius: "10px", marginBottom: "16px" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton" style={{ height: "14px", width: "60px" }}></div>
                <div className="skeleton" style={{ height: "16px", width: "80px" }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <style>{`
        .analytics-container { padding: 20px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .page-header { margin-bottom: 24px; }
        .page-title { margin: 0; font-size: 1.6rem; font-weight: 800; color: ${colors.textMain}; letter-spacing: -0.5px; }
        .page-subtitle { color: ${colors.textMuted}; font-size: 0.95rem; margin-top: 5px; }
        
        /* 🔥 AI Banner Styles */
        .ai-banner { background: linear-gradient(135deg, #6f42c1 0%, #4a148c 100%); color: white; border-radius: 16px; padding: 24px; margin-bottom: 30px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 10px 25px rgba(111, 66, 193, 0.2); }
        .ai-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 15px; }
        .ai-score-box { text-align: right; }
        .ai-score-val { font-size: 2.5rem; font-weight: 800; color: #facc15; line-height: 1; }
        .ai-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .ai-metric-card { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 12px; backdrop-filter: blur(5px); }
        .ai-metric-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 5px; }
        .ai-metric-val { font-size: 1.4rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }

        .charts-grid { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
        .chart-card { background: white; padding: 24px; border-radius: 16px; border: 1px solid ${colors.border}; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .chart-title { font-size: 1.1rem; font-weight: 700; color: ${colors.textMain}; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        
        /* Table View */
        .data-table-wrapper { background: white; border-radius: 16px; border: 1px solid ${colors.border}; overflow: hidden; display: none; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { background: #f8fafc; padding: 16px; text-align: left; font-size: 0.8rem; color: ${colors.textMuted}; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; font-weight: 700; }
        .data-table td { padding: 16px; border-bottom: 1px solid ${colors.border}; font-size: 0.95rem; color: ${colors.textMain}; vertical-align: middle; }

        /* Progress Bar */
        .progress-bg { background: #e2e8f0; height: 8px; border-radius: 10px; width: 100%; overflow: hidden; margin-top: 5px; }
        .progress-fill { height: 100%; background: ${colors.primary}; border-radius: 10px; transition: width 0.5s ease; }

        /* Mobile Stat Cards */
        .mobile-data-list { display: flex; flex-direction: column; gap: 12px; }
        .course-stat-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; }
        .course-name { font-weight: 800; color: ${colors.primary}; margin-bottom: 12px; font-size: 1rem; border-bottom: 1px solid ${colors.border}; padding-bottom: 8px; }
        .stat-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem; }
        .stat-label { color: ${colors.textMuted}; font-weight: 500; }
        .stat-val { color: ${colors.textMain}; font-weight: 700; }

        @media (min-width: 992px) {
          .analytics-container { padding: 30px; }
          .charts-grid { flex-direction: row; }
          .chart-card { flex: 1; width: 50%; }
          .data-table-wrapper { display: block; }
          .mobile-data-list { display: none; }
          .ai-header { flex-direction: row; }
        }
        @media (max-width: 991px) {
          .ai-header { flex-direction: column; align-items: flex-start; gap: 15px; }
          .ai-score-box { text-align: left; }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Course Analytics & Progress</h1>
        <p className="page-subtitle">Track your platform performance, engagement, and student growth.</p>
      </div>

      {error && <div className="alert alert-danger" style={{ borderRadius: '12px' }}>{error}</div>}

      {/* 🔥 AI INSTRUCTOR SCORE BANNER (Merged Feature) */}
      {aiScore && (
        <div className="ai-banner">
          <div className="ai-header">
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <FaRobot color="#facc15" /> AI Performance Report
              </h2>
              <p style={{ opacity: 0.8, margin: '5px 0 0 0', fontSize: '0.9rem' }}>
                Your teaching effectiveness based on platform engagement models.
              </p>
            </div>
            <div className="ai-score-box">
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '1px' }}>Global Rank Score</div>
              <div className="ai-score-val">{aiScore.score}<span style={{ fontSize: '1.2rem', color: 'white', opacity: 0.8 }}>/100</span></div>
            </div>
          </div>
          <div className="ai-metrics-grid">
            <div className="ai-metric-card">
              <div className="ai-metric-label">Avg Engagement</div>
              <div className="ai-metric-val"><FaUserShield size={18} opacity={0.8} /> {aiScore.avgEngagement}%</div>
            </div>
            <div className="ai-metric-card">
              <div className="ai-metric-label">High Risk Students</div>
              <div className="ai-metric-val" style={{ color: aiScore.highRiskRate > 20 ? '#fca5a5' : 'white' }}>
                <FaExclamationTriangle size={18} opacity={0.8} /> {aiScore.highRiskRate}%
              </div>
            </div>
            <div className="ai-metric-card">
              <div className="ai-metric-label">Avg Drop Rate</div>
              {/* <div className="ai-metric-val">{aiScore.avgDropRate}%</div> */}
              <div className="ai-metric-val" style={{ color: aiScore.avgDropRate < 0 ? '#10b981' : 'white' }}>
                {aiScore.avgDropRate < 0 ? '⬇' : '⬆'} {Math.abs(aiScore.avgDropRate)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {analytics.length === 0 ? (
        <div style={emptyStateStyle}>No analytics data available for your courses yet.</div>
      ) : (
        <>
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-title"><FaChartBar color={colors.primary} /> Total Enrollments</div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={enrollmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="course" tick={{ fontSize: 11, fill: colors.textMuted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: colors.textMuted }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: colors.bg }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="enrollments" fill={colors.primary} radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title"><FaChartPie color={colors.primary} /> Revenue Split</div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={revenueData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                    >
                      {revenueData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors.chartColors[index % colors.chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="chart-title" style={{ marginBottom: '15px' }}><FaTable color={colors.primary} /> Student Progress Details</div>

          {/* Desktop Table View */}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th width="35%">Course Title</th>
                  <th width="15%">Students</th>
                  <th width="15%">Completed</th>
                  <th width="20%">Progress & Completion</th>
                  <th width="15%">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((a, i) => (
                  <tr key={i} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ fontWeight: "600" }}>{a.courseTitle}</td>
                    <td>{a.totalStudents}</td>
                    <td>{a.completedStudents}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '2px' }}>
                        <span>Progress</span>
                        <span style={{ color: colors.primary }}>{a.completionRate}%</span>
                      </div>
                      <div className="progress-bg">
                        <div className="progress-flex progress-fill" style={{ width: `${a.completionRate}%` }}></div>
                      </div>
                    </td>
                    <td style={{ fontWeight: "700" }}>₹{a.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-data-list">
            {analytics.map((a, i) => (
              <div key={i} className="course-stat-card">
                <div className="course-name">{a.courseTitle}</div>
                <div className="stat-row">
                  <span className="stat-label">Enrollments</span>
                  <span className="stat-val">{a.totalStudents}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Completed</span>
                  <span className="stat-val">{a.completedStudents}</span>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600' }}>
                    <span className="stat-label">Completion Progress</span>
                    <span style={{ color: colors.primary }}>{a.completionRate}%</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${a.completionRate}%` }}></div>
                  </div>
                </div>
                <div className="stat-row" style={{ marginTop: '12px', borderTop: `1px solid ${colors.border}`, paddingTop: '8px' }}>
                  <span className="stat-label">Revenue</span>
                  <span className="stat-val">₹{a.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const emptyStateStyle = {
  textAlign: "center",
  padding: "60px 20px",
  color: "#94a3b8",
  background: "white",
  borderRadius: "16px",
  border: "1px dashed #cbd5e1"
};

export default CourseAnalytics;