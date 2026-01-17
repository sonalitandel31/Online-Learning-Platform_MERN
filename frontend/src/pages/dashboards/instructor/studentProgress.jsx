import { useState, useEffect } from "react";
import api from "../../../api/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { FaUserGraduate, FaChartPie, FaChartBar, FaListUl } from "react-icons/fa";

function StudentProgress() {
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await api.get("/instructor/students-progress", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const filteredData = (res.data.progress || []).filter(
          (p) => p.status === "active" || p.status === "completed"
        );
        setProgressData(filteredData);
      } catch (err) {
        setError("Failed to fetch student progress");
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [token]);

  // ----- Chart Data Calculations -----
  const totalStudents = progressData.length;
  const completedCount = progressData.filter((p) => p.progress >= 100).length;
  const inProgressCount = progressData.filter((p) => p.progress > 0 && p.progress < 100).length;
  const notStartedCount = totalStudents - completedCount - inProgressCount;

  const statusData = [
    { name: "Completed", value: completedCount },
    { name: "In Progress", value: inProgressCount },
    { name: "Not Started", value: notStartedCount },
  ];

  const PIE_COLORS = [colors.success, colors.warning, colors.danger];

  const courseProgress = Object.values(
    progressData.reduce((acc, p) => {
      const title = p.course?.title || "Unknown Course";
      if (!acc[title]) acc[title] = { course: title, total: 0, count: 0 };
      acc[title].total += p.progress;
      acc[title].count += 1;
      return acc;
    }, {})
  ).map((c) => ({
    course: c.course.length > 12 ? c.course.slice(0, 12) + "..." : c.course,
    progress: Math.round(c.total / c.count),
  }));

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner" />
        <style>{`
          .loader-container { display: flex; justify-content: center; align-items: center; height: 60vh; }
          .spinner { border: 4px solid ${colors.border}; border-top: 4px solid ${colors.primary}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="progress-container">
      <style>{`
        .progress-container { padding: 16px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .page-title { font-size: 1.5rem; font-weight: 800; color: ${colors.textMain}; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
        
        .charts-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 30px; }
        .chart-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .chart-header { font-size: 1rem; font-weight: 700; color: ${colors.textMain}; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }

        /* Desktop Table */
        .table-wrapper { background: white; border-radius: 12px; border: 1px solid ${colors.border}; overflow: hidden; display: none; }
        .progress-table { width: 100%; border-collapse: collapse; }
        .progress-table th { background: #f8fafc; padding: 14px; text-align: left; font-size: 0.7rem; color: ${colors.textMuted}; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; }
        .progress-table td { padding: 14px; border-bottom: 1px solid ${colors.border}; font-size: 0.85rem; color: ${colors.textMain}; }

        /* Mobile Cards */
        .mobile-list { display: flex; flex-direction: column; gap: 12px; }
        .student-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; }
        .student-name { font-weight: 800; color: ${colors.primary}; margin-bottom: 4px; }
        .course-name { font-size: 0.8rem; color: ${colors.textMuted}; margin-bottom: 12px; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem; }
        .stat-box { background: #f8fafc; padding: 8px; border-radius: 6px; }
        .stat-label { display: block; color: ${colors.textMuted}; font-size: 0.7rem; }
        .stat-val { font-weight: 700; color: ${colors.textMain}; }

        @media (min-width: 992px) {
          .progress-container { padding: 30px; }
          .charts-grid { grid-template-columns: 1fr 1.5fr; }
          .table-wrapper { display: block; }
          .mobile-list { display: none; }
        }
      `}</style>

      <h1 className="page-title"><FaUserGraduate color={colors.primary} /> Student Progress</h1>

      {error && <p style={{ color: colors.danger }}>{error}</p>}

      {progressData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "12px" }}>No progress data found.</div>
      ) : (
        <>
          <div className="charts-grid">
            {/* Completion Pie */}
            <div className="chart-card">
              <div className="chart-header"><FaChartPie color={colors.primary} /> Completion Status</div>
              <div style={{ width: "100%", height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {statusData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Average Progress Bar */}
            <div className="chart-card">
              <div className="chart-header"><FaChartBar color={colors.primary} /> Avg. Progress per Course (%)</div>
              <div style={{ width: "100%", height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={courseProgress}>
                    <XAxis dataKey="course" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="progress" fill={colors.primary} radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="chart-header" style={{ marginBottom: "15px" }}><FaListUl color={colors.primary} /> Detailed Student List</div>

          {/* Desktop Table View */}
          <div className="table-wrapper">
            <table className="progress-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Lessons</th>
                  <th>Exams</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {progressData.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: "600" }}>{p.student?.name}</td>
                    <td style={{ color: colors.textMuted }}>{p.course?.title}</td>
                    <td>{p.completedLessons} / {p.totalLessons}</td>
                    <td>{p.completedExams} / {p.totalExams}</td>
                    <td>
                      <span style={{ 
                        fontWeight: "800", 
                        color: p.progress >= 100 ? colors.success : p.progress >= 50 ? colors.warning : colors.danger 
                      }}>
                        {Math.round(p.progress)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-list">
            {progressData.map((p) => (
              <div key={p._id} className="student-card">
                <div className="student-name">{p.student?.name}</div>
                <div className="course-name">{p.course?.title}</div>
                <div className="stat-grid">
                  <div className="stat-box">
                    <span className="stat-label">Lessons</span>
                    <span className="stat-val">{p.completedLessons}/{p.totalLessons}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Exams</span>
                    <span className="stat-val">{p.completedExams}/{p.totalExams}</span>
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Overall Progress</span>
                    <span style={{ 
                        fontWeight: "800", 
                        color: p.progress >= 100 ? colors.success : p.progress >= 50 ? colors.warning : colors.danger 
                    }}>
                        {Math.round(p.progress)}%
                    </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default StudentProgress;