import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function CoursePerformance() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("enrollments");
  const [sortOrder, setSortOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [minEnroll, setMinEnroll] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    api.get("/admin/course-performance")
      .then((res) => setReport(res.data))
      .catch((err) => console.error("Performance API Error:", err))
      .finally(() => setLoading(false));
  }, []);

  const sortData = (key) => {
    const order = sortKey === key && sortOrder === "desc" ? "asc" : "desc";
    setSortKey(key);
    setSortOrder(order);
    const sorted = [...report].sort((a, b) =>
      key === "title"
        ? order === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
        : order === "asc"
        ? a[key] - b[key]
        : b[key] - a[key]
    );
    setReport(sorted);
  };

  const filteredReport = report
    .filter((r) => r.enrollments >= minEnroll)
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.ceil(filteredReport.length / pageSize) || 1;
  const paginatedReport = filteredReport.slice((page - 1) * pageSize, page * pageSize);

  const downloadCSV = () => {
    const headers = ["Course", "Enrollments", "Avg Score"];
    const rows = filteredReport.map((r) => [r.title, r.enrollments, r.avgScore.toFixed(1)]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "course_performance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Analyzing performance data...</p>
      </div>
    );
  }

  const chartData = {
    labels: filteredReport.slice(0, 10).map((r) => r.title), // Show top 10 in chart for clarity
    datasets: [
      {
        label: "Enrollments",
        data: filteredReport.slice(0, 10).map((r) => r.enrollments),
        backgroundColor: "#6f42c1",
        borderRadius: 6,
      },
      {
        label: "Avg Score (%)",
        data: filteredReport.slice(0, 10).map((r) => r.avgScore),
        backgroundColor: "#ffc107",
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="performance-wrapper">
      <h2 className="main-title">Course Performance</h2>

      {/* Chart Section */}
      <div className="chart-card">
        <Bar 
          data={chartData} 
          options={{ 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } } 
          }} 
        />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search course title..."
          className="search-input"
          value={search}
          onChange={(e) => {setSearch(e.target.value); setPage(1);}}
        />
        <div className="filter-group">
          <input
            type="number"
            placeholder="Min Enroll"
            className="number-input"
            value={minEnroll}
            onChange={(e) => {setMinEnroll(Number(e.target.value)); setPage(1);}}
          />
          <button onClick={downloadCSV} className="export-btn">Export CSV</button>
        </div>
      </div>

      {/* Responsive Data List/Table */}
      <div className="table-container">
        <div className="table-header desktop-only">
          <div onClick={() => sortData("title")} className="sort-header">Course {sortKey === "title" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</div>
          <div onClick={() => sortData("enrollments")} className="sort-header">Enrollments {sortKey === "enrollments" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</div>
          <div onClick={() => sortData("avgScore")} className="sort-header">Avg Score {sortKey === "avgScore" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</div>
        </div>

        <div className="table-body">
          {paginatedReport.map((r) => {
            const scoreColor = r.avgScore >= 80 ? "#28a745" : r.avgScore >= 50 ? "#fd7e14" : "#dc3545";
            return (
              <div key={r._id} className="table-row">
                <div className="cell course-cell">
                  <span className="mobile-label">Course</span>
                  <strong>{r.title}</strong>
                </div>
                <div className="cell">
                  <span className="mobile-label">Enrollments</span>
                  <span className="enroll-badge">{r.enrollments}</span>
                </div>
                <div className="cell score-cell">
                  <span className="mobile-label">Avg Score</span>
                  <div className="score-container">
                    <span style={{ color: scoreColor, fontWeight: 700 }}>{r.avgScore.toFixed(1)}%</span>
                    <div className="progress-bg">
                      <div className="progress-fill" style={{ width: `${r.avgScore}%`, background: scoreColor }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="pag-btn">Prev</button>
        <span className="pag-info">Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="pag-btn">Next</button>
      </div>

      <style>{`
        .performance-wrapper { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        .main-title { color: #6f42c1; font-weight: 800; margin-bottom: 25px; }

        .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #6f42c1; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #6f42c1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .chart-card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 25px; height: 350px; }
        
        .filter-bar { display: flex; justify-content: space-between; gap: 15px; flex-wrap: wrap; margin-bottom: 20px; }
        .search-input { flex: 1; min-width: 250px; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; outline: none; }
        .filter-group { display: flex; gap: 10px; }
        .number-input { width: 100px; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; }
        .export-btn { background: #6f42c1; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; }

        .table-container { background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 2fr 1fr 1.5fr; background: #f8fafc; padding: 15px; font-weight: 700; color: #6f42c1; }
        .sort-header { cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .table-row { display: grid; grid-template-columns: 2fr 1fr 1.5fr; padding: 15px; border-bottom: 1px solid #f1f5f9; transition: 0.2s; align-items: center; }
        .table-row:hover { background: #fdfbff; }

        .enroll-badge { background: #f1f5f9; padding: 5px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }
        .score-container { display: flex; flex-direction: column; gap: 4px; }
        .progress-bg { background: #e2e8f0; height: 6px; border-radius: 10px; width: 100%; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.4s ease; }

        .pagination { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; }
        .pag-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: 0.2s; }
        .pag-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pag-btn:hover:not(:disabled) { border-color: #6f42c1; color: #6f42c1; }
        .pag-info { font-weight: 600; color: #64748b; font-size: 0.9rem; }

        .mobile-label { display: none; }

        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .table-row { grid-template-columns: 1fr; gap: 12px; padding: 20px; }
          .cell { display: flex; justify-content: space-between; align-items: center; }
          .course-cell { border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 5px; }
          .mobile-label { display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
          .score-container { width: 60%; align-items: flex-end; }
          .filter-bar { flex-direction: column; }
          .filter-group { width: 100%; }
          .number-input { flex: 1; }
        }
      `}</style>
    </div>
  );
}