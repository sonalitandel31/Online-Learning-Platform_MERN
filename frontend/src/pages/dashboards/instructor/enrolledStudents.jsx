import { useEffect, useState } from "react";
import api from "../../../api/api";
import { FaSearch, FaUserGraduate, FaCertificate, FaFilter, FaTimes, FaChevronRight } from "react-icons/fa";

function EnrolledStudents() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    course: "",
    status: "",
    certificate: "",
  });

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
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await api.get("/instructor/enrolled-students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data.students || [];
        setStudents(data);
        setFiltered(data);
      } catch (err) {
        setError("Failed to fetch enrolled students");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [token]);

  useEffect(() => {
    let data = [...students];
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter((s) =>
          s.student?.name?.toLowerCase().includes(searchLower) ||
          s.student?.email?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.course) data = data.filter((s) => s.course?.title === filters.course);
    if (filters.status) data = data.filter((s) => s.status === filters.status);
    if (filters.certificate === "issued") data = data.filter((s) => s.certificate);
    else if (filters.certificate === "not-issued") data = data.filter((s) => !s.certificate);
    setFiltered(data);
  }, [filters, students]);

  const uniqueCourses = [...new Set(students.map((s) => s.course?.title).filter(Boolean))];
  const uniqueStatuses = [...new Set(students.map((s) => s.status).filter(Boolean))];

  const getStatusBadge = (status) => {
    let bg = "#f1f5f9", color = "#475569";
    switch (status?.toLowerCase()) {
      case "active": case "in-progress": bg = "#fff7ed"; color = colors.warning; break;
      case "completed": bg = "#ecfdf5"; color = colors.success; break;
      case "expired": case "inactive": bg = "#fef2f2"; color = colors.danger; break;
      default: break;
    }
    return <span style={{ ...badgeStyle, backgroundColor: bg, color }}>{status || "N/A"}</span>;
  };

  if (loading) {
    return (
      <div style={loaderWrapperStyle}>
        <div className="spinner" />
        <p style={{ marginTop: "15px", color: colors.primary, fontWeight: "500" }}>Syncing student data...</p>
        <style>{`.spinner { border: 4px solid #f3f3f3; border-top: 4px solid ${colors.primary}; border-radius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="enrolled-container">
      <style>{`
        .enrolled-container { padding: 20px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
        
        /* Desktop Filters */
        .filter-section { 
            display: flex; 
            gap: 12px; 
            margin-bottom: 25px; 
            flex-wrap: wrap; 
            background: white; 
            padding: 15px; 
            border-radius: 12px; 
            border: 1px solid ${colors.border};
        }

        .search-box { position: relative; flex: 2; min-width: 250px; }
        .search-box input { width: 100%; padding: 10px 10px 10px 35px; border-radius: 8px; border: 1px solid ${colors.border}; outline: none; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${colors.textMuted}; }
        .filter-select { flex: 1; min-width: 140px; padding: 10px; border-radius: 8px; border: 1px solid ${colors.border}; cursor: pointer; }

        /* Table Design */
        .student-table-wrapper { background: white; border-radius: 12px; border: 1px solid ${colors.border}; overflow: hidden; }
        .student-table { width: 100%; border-collapse: collapse; }
        .student-table th { background: #f8fafc; padding: 15px; text-align: left; font-size: 0.75rem; color: ${colors.textMuted}; border-bottom: 1px solid ${colors.border}; }
        .student-table td { padding: 15px; border-bottom: 1px solid ${colors.border}; font-size: 0.9rem; }

        /* Progress Bar */
        .pg-bg { background: #e2e8f0; border-radius: 10px; height: 6px; width: 80px; margin-top: 4px; }
        .pg-fill { height: 100%; background: ${colors.primary}; border-radius: 10px; }

        /* Mobile Adjustments */
        .mobile-filter-toggle { display: none; }

        @media (max-width: 768px) {
          .filter-section { display: ${showMobileFilters ? 'flex' : 'none'}; flex-direction: column; }
          .mobile-filter-toggle { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 8px; 
              width: 100%; 
              padding: 12px; 
              background: ${showMobileFilters ? colors.danger : colors.primary}; 
              color: white; 
              border: none; 
              border-radius: 8px; 
              margin-bottom: 15px; 
              font-weight: 600;
          }
          .student-table-wrapper { display: none; }
          .mobile-student-list { display: flex; flex-direction: column; gap: 12px; }
          .student-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; }
        }
        @media (min-width: 769px) { .mobile-student-list { display: none; } }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontWeight: "800", color: colors.textMain }}>Students</h2>
        <div style={{ fontSize: "0.8rem", fontWeight: "600", color: colors.primary, background: colors.primary + '15', padding: "4px 12px", borderRadius: "12px" }}>
          {filtered.length} Enrolled
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Mobile Toggle Button */}
      <button className="mobile-filter-toggle" onClick={() => setShowMobileFilters(!showMobileFilters)}>
        {showMobileFilters ? <><FaTimes /> Close Filters</> : <><FaFilter /> Show Filters</>}
      </button>

      {/* Filter Bar (Conditional on Mobile) */}
      <div className="filter-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search student..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select className="filter-select" value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })}>
          <option value="">All Courses</option>
          {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Status</option>
          {uniqueStatuses.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <select className="filter-select" value={filters.certificate} onChange={(e) => setFilters({ ...filters, certificate: e.target.value })}>
          <option value="">Certificate</option>
          <option value="issued">Issued</option>
          <option value="not-issued">Not Issued</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={emptyStateStyle}>
          <FaUserGraduate size={35} color="#cbd5e1" style={{ marginBottom: "10px" }} />
          <p>No matches found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="student-table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Course Title</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Cert</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: "600" }}>{s.student?.name}</div>
                      <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>{s.student?.email}</div>
                    </td>
                    <td style={{ maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.course?.title}</td>
                    <td>
                      <div style={{ fontSize: "0.75rem", fontWeight: "700" }}>{s.progress}%</div>
                      <div className="pg-bg"><div className="pg-fill" style={{ width: `${s.progress}%` }} /></div>
                    </td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td>
                      {s.certificate ? (
                        <a href={`${import.meta.env.VITE_BASE_URL}${s.certificate}`} target="_blank" rel="noopener noreferrer" style={certLinkStyle}>View</a>
                      ) : <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: colors.textMuted }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-student-list">
            {filtered.map((s) => (
              <div key={s._id} className="student-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "700", color: colors.textMain }}>{s.student?.name}</div>
                  {getStatusBadge(s.status)}
                </div>
                <div style={{ fontSize: "0.8rem", color: colors.textMuted, marginBottom: "10px" }}>{s.course?.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: `1px solid ${colors.border}` }}>
                   <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>
                     Progress: <span style={{ color: colors.primary, fontWeight: "700" }}>{s.progress}%</span>
                   </div>
                   {s.certificate && (
                      <a href={`${import.meta.env.VITE_BASE_URL}${s.certificate}`} target="_blank" style={certLinkStyle}>
                        View Cert <FaChevronRight size={10} />
                      </a>
                   )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const badgeStyle = { padding: "4px 8px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: "800", textTransform: "uppercase" };
const certLinkStyle = { display: "flex", alignItems: "center", gap: "4px", color: "#6f42c1", textDecoration: "none", fontWeight: "700", fontSize: "0.8rem" };
const errorStyle = { background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "0.85rem" };
const emptyStateStyle = { textAlign: "center", padding: "50px", color: "#94a3b8", background: "white", borderRadius: "12px" };
const loaderWrapperStyle = { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "60vh" };

export default EnrolledStudents;