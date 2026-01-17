import { useState, useEffect } from "react";
import api from "../../../api/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { FaChartBar, FaChartPie, FaTable, FaGraduationCap } from "react-icons/fa";

function CourseAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    chartColors: ["#6f42c1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"],
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get("/instructor/course-analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnalytics(res.data.analytics || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch course analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
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
      <div className="loader-container">
        <div className="spinner" />
        <p style={{ color: colors.primary, marginTop: "10px", fontWeight: "500" }}>Loading Analytics...</p>
        <style>{`
          .loader-container { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 60vh; }
          .spinner { border: 4px solid ${colors.border}; border-top: 4px solid ${colors.primary}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <style>{`
        .analytics-container { padding: 16px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .page-header { margin-bottom: 24px; }
        .page-title { margin: 0; font-size: 1.4rem; font-weight: 800; color: ${colors.textMain}; }
        
        .charts-grid { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
        .chart-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .chart-title { font-size: 1rem; font-weight: 700; color: ${colors.textMain}; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        
        /* Desktop Table View */
        .data-table-wrapper { background: white; border-radius: 12px; border: 1px solid ${colors.border}; overflow: hidden; display: none; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { background: #f8fafc; padding: 14px; text-align: left; font-size: 0.75rem; color: ${colors.textMuted}; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; }
        .data-table td { padding: 14px; border-bottom: 1px solid ${colors.border}; font-size: 0.9rem; color: ${colors.textMain}; }

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
          .chart-card { flex: 1; }
          .data-table-wrapper { display: block; }
          .mobile-data-list { display: none; }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Course Analytics</h1>
      </div>

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      {analytics.length === 0 ? (
        <div style={emptyStateStyle}>No analytics data available for your courses yet.</div>
      ) : (
        <>
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-title"><FaChartBar color={colors.primary}/> Enrollments</div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={enrollmentData}>
                    <XAxis dataKey="course" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="enrollments" fill={colors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title"><FaChartPie color={colors.primary}/> Revenue Split</div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie 
                      data={revenueData} 
                      dataKey="value" 
                      nameKey="name" 
                      innerRadius={60}
                      outerRadius={80} 
                      paddingAngle={5}
                    >
                      {revenueData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors.chartColors[index % colors.chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="chart-title" style={{ marginBottom: '15px' }}><FaTable color={colors.primary}/> Performance Details</div>
          
          {/* Desktop Table View */}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Students</th>
                  <th>Completed</th>
                  <th>Completion %</th>
                  <th>Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: "600" }}>{a.courseTitle}</td>
                    <td>{a.totalStudents}</td>
                    <td>{a.completedStudents}</td>
                    <td style={{ color: colors.primary, fontWeight: "700" }}>{a.completionRate}%</td>
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
                    <span className="stat-label">Completion Rate</span>
                    <span className="stat-val" style={{ color: colors.primary }}>{a.completionRate}%</span>
                </div>
                <div className="stat-row">
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
  borderRadius: "12px", 
  border: "1px solid #e2e8f0" 
};

export default CourseAnalytics;