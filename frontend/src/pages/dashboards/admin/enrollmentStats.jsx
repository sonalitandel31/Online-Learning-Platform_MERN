import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import api from "../../../api/api";
import "chart.js/auto";

export default function EnrollmentStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortKey, setSortKey] = useState("count");
  const [sortOrder, setSortOrder] = useState("desc");
  const [status, setStatus] = useState({ text: "", type: "" });

  const showStatus = (text, type = "success") => {
    setStatus({ text, type });
    setTimeout(() => setStatus({ text: "", type: "" }), 3000);
  };

  const fetchData = async (start, end) => {
    setLoading(true);
    let url = "/admin/enrollment-stats";
    if (start && end) url += `?start=${start}&end=${end}`;
    try {
      const res = await api.get(url);
      setData(res.data);
      if (start && end) showStatus("Filtered successfully");
    } catch (err) {
      console.error(err);
      showStatus("Failed to load data", "error");
      setData({
        labels: [],
        values: [],
        totalEnrollments: 0,
        newThisMonth: 0,
        growth: 0,
        topCourses: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const downloadCSV = () => {
    if (!data || !data.topCourses.length) return;
    try {
      const headers = ["Course", "Enrollments"];
      const rows = data.topCourses.map(c => [c.course, c.count]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", "top_courses.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showStatus("CSV Exported!");
    } catch {
      showStatus("Export failed", "error");
    }
  };

  const sortTopCourses = key => {
    const order = sortKey === key && sortOrder === "desc" ? "asc" : "desc";
    setSortKey(key);
    setSortOrder(order);
    if (!data) return;
    const sorted = [...data.topCourses].sort((a, b) => {
      if (key === "course")
        return order === "asc" ? a.course.localeCompare(b.course) : b.course.localeCompare(a.course);
      return order === "asc" ? a[key] - b[key] : b[key] - a[key];
    });
    setData({ ...data, topCourses: sorted });
  };

  return (
    <div className="stats-container">
      <div className="header-flex">
        <h2 className="title">Enrollment Analytics</h2>
        {status.text && (
          <div className={`status-pill ${status.type}`}>{status.text}</div>
        )}
      </div>

      {loading ? (
        <>
          {/* Skeleton Filters */}
          <div className="filter-card">
            <div className="date-group" style={{ width: '100%' }}>
              <div className="skeleton skel-input"></div>
              <span className="date-sep">to</span>
              <div className="skeleton skel-input"></div>
            </div>
            <div className="button-group">
              <div className="skeleton skel-btn"></div>
              <div className="skeleton skel-btn"></div>
              <div className="skeleton skel-btn"></div>
            </div>
          </div>

          {/* Skeleton KPI Cards */}
          <div className="kpi-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="kpi-card">
                <div className="skeleton skel-kpi-label"></div>
                <div className="skeleton skel-kpi-val"></div>
              </div>
            ))}
          </div>

          {/* Skeleton Chart */}
          <div className="chart-box">
            <div className="skeleton skel-chart-title"></div>
            <div className="skeleton skel-chart-area"></div>
          </div>

          {/* Skeleton Table */}
          <div className="table-card">
            <div className="skeleton skel-chart-title"></div>
            <div className="data-header desktop-only border-bottom">
              <div>Course</div>
              <div style={{ textAlign: "right" }}>Enrollments</div>
            </div>
            <div className="data-body">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="data-row" style={{ padding: '15px 0' }}>
                  <div className="skeleton skel-table-course"></div>
                  <div className="skeleton skel-table-count"></div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Filter Controls */}
          <div className="filter-card">
            <div className="date-group">
              <input type="date" className="input-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="date-sep">to</span>
              <input type="date" className="input-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="button-group">
              <button className="btn-primary" onClick={() => fetchData(startDate, endDate)}>Apply Filter</button>
              <button className="btn-secondary" onClick={() => { setStartDate(""); setEndDate(""); fetchData(); }}>Reset</button>
              <button className="btn-export" onClick={downloadCSV}>Export CSV</button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Enrollments</span>
              <span className="kpi-val">{data?.totalEnrollments || 0}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">New This Month</span>
              <span className="kpi-val">{data?.newThisMonth || 0}</span>
            </div>
            {/* <div className="kpi-card">
              <span className="kpi-label">Growth Rate</span>
              <span className={`kpi-val ${data?.growth >= 0 ? "up" : "down"}`}>
                {data?.growth.toFixed(1)}% {data?.growth >= 0 ? "▲" : "▼"}
              </span>
            </div> */}
            <div className="kpi-card">
              <span className="kpi-label">Growth Rate</span>
              <span className={`kpi-val ${data?.growth >= 0 ? "up" : "down"}`}>
                {Math.abs(data?.growth || 0).toFixed(1)}% {data?.growth >= 0 ? "▲" : "▼"}
              </span>
            </div>
          </div>

          {/* Main Chart */}
          <div className="chart-box">
            <h4 className="chart-title">Enrollment Trends</h4>
            <div className="chart-wrapper">
              <Line
                data={{
                  labels: data?.labels,
                  datasets: [{
                    label: "Enrollments",
                    data: data?.values,
                    borderColor: "#6f42c1",
                    backgroundColor: "rgba(111,66,193,0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
                    x: { grid: { display: false } }
                  }
                }}
              />
            </div>
          </div>

          {/* Top Courses Table */}
          <div className="table-card">
            <h4 className="table-title">Top Performing Courses</h4>
            <div className="data-header desktop-only">
              <div onClick={() => sortTopCourses("course")} style={{ cursor: "pointer" }}>Course {sortKey === "course" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</div>
              <div onClick={() => sortTopCourses("count")} style={{ cursor: "pointer", textAlign: "right" }}>Enrollments {sortKey === "count" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</div>
            </div>
            <div className="data-body">
              {data?.topCourses.map((c, idx) => (
                <div key={idx} className="data-row">
                  <div className="cell course-name">
                    <span className="mobile-label">Course</span>
                    {c.course}
                  </div>
                  <div className="cell count-val">
                    <span className="mobile-label">Enrollments</span>
                    <strong>{c.count}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        /* Skeleton Styles */
        .skeleton {
          background: #f1f5f9;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .skel-input { width: 180px; height: 36px; border-radius: 8px; }
        .skel-btn { width: 100px; height: 36px; border-radius: 8px; }
        
        .skel-kpi-label { width: 120px; height: 14px; margin-bottom: 12px; }
        .skel-kpi-val { width: 80px; height: 32px; border-radius: 6px; }
        
        .skel-chart-title { width: 200px; height: 24px; margin-bottom: 20px; border-radius: 6px; }
        .skel-chart-area { width: 100%; height: 300px; border-radius: 8px; }
        
        .skel-table-course { width: 60%; height: 18px; border-radius: 4px; }
        .skel-table-count { width: 40px; height: 18px; border-radius: 4px; margin-left: auto; }

        /* Original Styles */
        .stats-container { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .title { color: #2d3436; font-weight: 800; margin: 0; }

        .status-pill { padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; animation: fadeIn 0.3s; }
        .status-pill.success { background: #dcfce7; color: #166534; }
        .status-pill.error { background: #fee2e2; color: #991b1b; }

        .filter-card { background: white; padding: 20px; border-radius: 16px; display: flex; flex-wrap: wrap; gap: 15px; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .date-group { display: flex; align-items: center; gap: 10px; }
        .input-date { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; }
        .button-group { display: flex; gap: 8px; }
        .btn-primary, .btn-secondary, .btn-export { padding: 8px 16px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
        .btn-primary { background: #6f42c1; color: white; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-export { background: #22c55e; color: white; }

        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px; }
        .kpi-card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
        .kpi-label { font-size: 0.85rem; color: #64748b; font-weight: 600; }
        .kpi-val { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin-top: 5px; }
        .kpi-val.up { color: #22c55e; }
        .kpi-val.down { color: #ef4444; }

        .chart-box { background: white; padding: 25px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .chart-wrapper { height: 300px; }
        .chart-title { margin-bottom: 20px; color: #1e293b; }

        .table-card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .data-header { display: grid; grid-template-columns: 3fr 1fr; padding: 12px; border-bottom: 2px solid #f1f5f9; font-weight: 700; color: #6f42c1; }
        .data-row { display: grid; grid-template-columns: 3fr 1fr; padding: 15px; border-bottom: 1px solid #f1f5f9; transition: 0.2s; }
        .data-row:hover { background: #fdfbff; }
        .count-val { text-align: right; }
        
        .mobile-label { display: none; }

        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .data-row { grid-template-columns: 1fr; gap: 8px; }
          .cell { display: flex; justify-content: space-between; }
          .mobile-label { display: block; color: #94a3b8; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
          .count-val { text-align: left; }
          .filter-card { flex-direction: column; align-items: stretch; }
          .date-group { flex-direction: column; }
          .button-group { flex-direction: column; }
          
          .skel-input { width: 100%; }
          .skel-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}