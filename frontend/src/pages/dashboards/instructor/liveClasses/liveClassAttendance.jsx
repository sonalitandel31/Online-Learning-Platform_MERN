import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/api";

// -------------------------------------------------------------------------
// Helper: Extract Data from various API response formats
// -------------------------------------------------------------------------
const pickAttendancePayload = (res) => {
  const d = res?.data;
  if (d?.data?.attendance || d?.data?.liveClass) return d.data;
  if (d?.attendance || d?.liveClass) return d;

  return {
    liveClass: null,
    attendance: [],
    total: 0,
    summary: null,
  };
};

// -------------------------------------------------------------------------
// Helper: Logic for Array-Based Schema
// -------------------------------------------------------------------------
const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", { hour12: true });
};

const getJoinedAt = (row) => {
  if (row.joinAt) return formatDateTime(row.joinAt);
  if (row.joinTimes && row.joinTimes.length > 0) {
    return formatDateTime(row.joinTimes[0]); // First entry
  }
  return "-";
};

const getLeftAt = (row) => {
  // If joinTimes.length > leaveTimes.length, they are still inside
  const isInside = (row.joinTimes?.length || 0) > (row.leaveTimes?.length || 0);
  if (isInside) return (
    <span className="badge rounded-pill d-inline-flex align-items-center gap-1" style={{ backgroundColor: "#d1e7dd", color: "#0f5132", border: "1px solid #badbcc", fontSize: "0.75rem", padding: "4px 8px" }}>
      <span className="spinner-grow spinner-grow-sm text-success" style={{ width: "8px", height: "8px" }}></span>
      Online
    </span>
  );

  if (row.leaveAt) return formatDateTime(row.leaveAt);
  if (row.leaveTimes && row.leaveTimes.length > 0) {
    return formatDateTime(row.leaveTimes[row.leaveTimes.length - 1]); // Last entry
  }
  return "-";
};

const getMinutesValue = (row) => {
  const v = Number(row?.totalDuration || row?.minutesAttended || 0);
  return Number.isFinite(v) ? Math.round(v) : 0;
};

// Return compact, premium badge colors
const getStatusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "present") return { bg: "#e8f5e9", text: "#198754", border: "#c8e6c9" };
  if (s === "partial") return { bg: "#fff8e1", text: "#fd7e14", border: "#ffecb5" };
  return { bg: "#f8f9fa", text: "#6c757d", border: "#dee2e6" }; // Absent/Default
};

// Contextual skeleton loader for the attendance report
function AttendanceLoader() {
  return (
    <div className="d-flex flex-column gap-3">
      {/* Summary Cards Skeleton */}
      <div className="row g-3">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-4 placeholder-glow">
              <div className="card-body p-3">
                <span className="placeholder col-6 rounded d-block mb-2" style={{ height: "12px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-4 rounded d-block" style={{ height: "24px", backgroundColor: "#e9ecef" }}></span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Table Skeleton */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body p-3 border-bottom placeholder-glow d-flex justify-content-between">
           <div className="w-50">
             <span className="placeholder col-5 rounded d-block mb-1" style={{ height: "18px", backgroundColor: "#e9ecef" }}></span>
             <span className="placeholder col-3 rounded d-block" style={{ height: "12px", backgroundColor: "#e9ecef" }}></span>
           </div>
           <span className="placeholder col-3 rounded-pill" style={{ height: "32px", backgroundColor: "#e9ecef" }}></span>
        </div>
        <div className="p-0">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="d-flex align-items-center justify-content-between p-3 border-bottom placeholder-glow">
              <div className="w-25">
                <span className="placeholder col-8 rounded d-block mb-1" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-5 rounded d-block" style={{ height: "10px", backgroundColor: "#e9ecef" }}></span>
              </div>
              <span className="placeholder col-2 rounded" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-2 rounded" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-1 rounded-pill" style={{ height: "22px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-1 rounded-pill" style={{ height: "22px", backgroundColor: "#e9ecef" }}></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InstructorLiveClassAttendance() {
  const { liveClassId } = useParams();
  const navigate = useNavigate();

  const [liveClass, setLiveClass] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [serverSummary, setServerSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase();

  const backPath = role === "admin" 
    ? "/admin-dashboard/live-classes" 
    : "/instructor-dashboard/live-classes";

  // Fetch attendance data from the backend
  const fetchAttendance = useCallback(async (showFullLoader = true) => {
    try {
      if (showFullLoader) setLoading(true);
      else setRefreshing(true);
      
      const res = await api.get(`/live-classes/${liveClassId}/attendance`);
      const payload = pickAttendancePayload(res);

      setLiveClass(payload?.liveClass || null);
      setAttendance(Array.isArray(payload?.attendance) ? payload.attendance : []);
      setServerSummary(payload?.summary || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [liveClassId]);

  // Load initially and set up 60-second polling
  useEffect(() => {
    if (liveClassId) {
      fetchAttendance(true);
      // Auto-refresh every 60 seconds to keep the instructor updated
      const interval = setInterval(() => fetchAttendance(false), 60000);
      return () => clearInterval(interval);
    }
  }, [liveClassId, fetchAttendance]);

  // Search logic for student list
  const filteredAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (Array.isArray(attendance) ? attendance : []).filter((row) => {
      const name = String(row?.student?.name || "").toLowerCase();
      const email = String(row?.student?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [attendance, search]);

  // Derive metrics if not explicitly supplied by server
  const summary = useMemo(() => {
    if (serverSummary) return serverSummary;
    return {
      total: attendance.length,
      present: attendance.filter(x => x?.attendanceStatus === "present").length,
      partial: attendance.filter(x => x?.attendanceStatus === "partial").length,
      absent: attendance.filter(x => x?.attendanceStatus === "absent").length,
    };
  }, [attendance, serverSummary]);

  const brandPurple = "#6f42c1";
  const brandPurpleDark = "#5a189a";

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="container-fluid py-3 py-md-4" style={{ maxWidth: "1200px" }}>
        
        {/* Compact Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: brandPurpleDark, fontSize: "1.5rem" }}>Live Attendance Report</h2>
            <div className="text-muted" style={{ fontSize: "0.85rem" }}>Real-time student participation log.</div>
          </div>
          
          <div className="d-flex gap-2">
            <button 
              className="btn btn-light rounded-pill px-3 py-1 shadow-sm border fw-medium d-flex align-items-center gap-2" 
              onClick={() => fetchAttendance(false)}
              disabled={refreshing}
              style={{ fontSize: "0.85rem", color: "#495057" }}
            >
              {refreshing ? (
                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg> Refresh</>
              )}
            </button>
            <button 
              className="btn rounded-pill px-4 py-1 fw-medium shadow-none" 
              onClick={() => navigate(backPath)}
              style={{ backgroundColor: "#e9ecef", color: "#495057", border: "1px solid #dee2e6", fontSize: "0.85rem" }}
            >
              Back
            </button>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="alert border-0 shadow-sm rounded-3 mb-4 py-2 px-3 d-flex align-items-center gap-2" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <span className="fw-medium" style={{ fontSize: "0.85rem" }}>{error}</span>
          </div>
        )}

        {loading ? <AttendanceLoader /> : (
          <>
            {/* Tighter Summary Cards */}
            <div className="row g-2 g-md-3 mb-3 mb-md-4">
              {[
                { label: "Total Students", value: summary.total || summary.totalStudents, icon: "#6f42c1", bg: "#f4edfc" },
                { label: "Present", value: summary.present, icon: "#198754", bg: "#e8f5e9" },
                { label: "Partial", value: summary.partial, icon: "#fd7e14", bg: "#fff8e1" },
                { label: "Absent", value: summary.absent, icon: "#6c757d", bg: "#f8f9fa" },
              ].map((card, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm rounded-4 h-100" style={{ backgroundColor: "#ffffff" }}>
                    <div className="card-body p-3 d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "42px", height: "42px", backgroundColor: card.bg }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill={card.icon} viewBox="0 0 16 16"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72a6.324 6.324 0 0 1 .5-.561zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>
                      </div>
                      <div>
                        <div className="text-muted fw-medium mb-0" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{card.label}</div>
                        <div className="fw-bolder" style={{ fontSize: "1.4rem", color: "#212529", lineHeight: "1" }}>{card.value}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Class Info & Search Header */}
            <div className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
              <div style={{ height: "4px", backgroundColor: brandPurple }}></div>
              <div className="card-body p-3 p-md-4">
                <div className="row align-items-center g-3">
                  <div className="col-md-7 col-lg-8">
                    
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <h4 className="fw-bold mb-0 text-truncate" style={{ color: brandPurpleDark, fontSize: "1.25rem", letterSpacing: "-0.3px", maxWidth: "80%" }}>
                        {liveClass?.title || "Class Session"}
                      </h4>
                      {liveClass?.status && (
                        <span className="badge rounded-pill text-uppercase d-flex align-items-center gap-1" style={{ fontSize: "0.65rem", backgroundColor: liveClass.status === 'live' ? '#198754' : '#6c757d', color: '#fff' }}>
                          {liveClass.status === 'live' && <span className="spinner-grow spinner-grow-sm" style={{ width: "6px", height: "6px" }}></span>}
                          {liveClass.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="d-flex flex-wrap align-items-center gap-2 text-muted" style={{ fontSize: "0.85rem" }}>
                      <span className="fw-semibold text-dark px-2 py-1 bg-light rounded border d-inline-flex align-items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 2.5a.5.5 0 0 0-.5.5v1h-1a.5.5 0 0 0 0 1h1v1h-1a.5.5 0 0 0 0 1h1v1a.5.5 0 0 0 1 0v-1h1v1a.5.5 0 0 0 1 0v-1h1a.5.5 0 0 0 0-1h-1v-1h1a.5.5 0 0 0 0-1h-1v-1a.5.5 0 0 0-.5-.5h-1Zm-1 2h2v1h-2v-1Zm0 2h2v1h-2v-1Z"/><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2Z"/></svg>
                        {liveClass?.course?.title || "Standalone"}
                      </span>
                      
                      <span className="text-secondary opacity-50 d-none d-sm-inline">•</span>
                      
                      <span className="d-flex align-items-center gap-1 fw-medium text-dark">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                        {liveClass?.startAt ? new Date(liveClass.startAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                      </span>

                      {liveClass?.durationMin && (
                        <>
                          <span className="text-secondary opacity-50 d-none d-sm-inline">•</span>
                          <span className="d-flex align-items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                            {liveClass.durationMin} mins
                          </span>
                        </>
                      )}

                      {liveClass?.provider && (
                        <>
                          <span className="text-secondary opacity-50 d-none d-sm-inline">•</span>
                          <span className="text-uppercase fw-semibold" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>{liveClass.provider}</span>
                        </>
                      )}
                      
                      {liveClass?.meetingId && (
                        <>
                          <span className="text-secondary opacity-50 d-none d-sm-inline">•</span>
                          <span className="text-muted" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>ID: {liveClass.meetingId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Compact Search Box */}
                  <div className="col-md-5 col-lg-4">
                    <div className="position-relative">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#adb5bd" className="position-absolute" style={{ top: "10px", left: "14px" }} viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                      </svg>
                      <input
                        type="text"
                        className="form-control rounded-pill bg-light border-0 shadow-none"
                        placeholder="Search student or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ padding: "6px 16px 6px 36px", fontSize: "0.85rem", color: "#495057" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tighter Data Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr className="text-muted text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                      <th className="px-4 py-3 border-0 fw-semibold" style={{ width: "35%" }}>Student Details</th>
                      <th className="py-3 border-0 fw-semibold" style={{ width: "20%" }}>First Joined</th>
                      <th className="py-3 border-0 fw-semibold" style={{ width: "20%" }}>Last Left</th>
                      <th className="py-3 text-center border-0 fw-semibold" style={{ width: "12%" }}>Duration</th>
                      <th className="px-4 py-3 text-center border-0 fw-semibold" style={{ width: "13%" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="border-top-0">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          <div className="text-muted mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Z"/><path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2Zm12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12Z"/></svg>
                          </div>
                          <div className="fw-medium text-dark">No attendance records found</div>
                          <div className="small">Try adjusting your search criteria.</div>
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((row) => {
                        const badgeStyle = getStatusBadgeClass(row?.attendanceStatus);
                        
                        return (
                          <tr key={row._id} className="border-bottom">
                            
                            {/* Student Data */}
                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center gap-3">
                                {/* Subtle avatar placeholder */}
                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: "32px", height: "32px", backgroundColor: "#f4edfc", color: brandPurple }}>
                                  {String(row?.student?.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-semibold text-dark" style={{ fontSize: "0.9rem" }}>{row?.student?.name || "Unknown Student"}</div>
                                  <div className="text-muted text-truncate" style={{ fontSize: "0.75rem", maxWidth: "200px" }}>{row?.student?.email || "No email"}</div>
                                </div>
                              </div>
                            </td>
                            
                            {/* Join / Leave Times */}
                            <td className="py-3 text-dark fw-medium" style={{ fontSize: "0.8rem" }}>{getJoinedAt(row)}</td>
                            <td className="py-3 text-dark fw-medium" style={{ fontSize: "0.8rem" }}>{getLeftAt(row)}</td>
                            
                            {/* Duration Badge */}
                            <td className="py-3 text-center">
                              <span className="badge rounded px-2 py-1 fw-semibold" style={{ backgroundColor: "#f8f9fa", border: "1px solid #dee2e6", color: "#495057", fontSize: "0.75rem" }}>
                                {getMinutesValue(row)} min
                              </span>
                            </td>
                            
                            {/* Status Badge */}
                            <td className="px-4 py-3 text-center">
                              <span 
                                className="badge rounded-pill px-3 py-1 text-uppercase fw-bold" 
                                style={{ 
                                  backgroundColor: badgeStyle.bg, 
                                  color: badgeStyle.text, 
                                  border: `1px solid ${badgeStyle.border}`,
                                  fontSize: "0.7rem", 
                                  letterSpacing: "0.5px" 
                                }}
                              >
                                {row?.attendanceStatus || "absent"}
                              </span>
                            </td>
                            
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}