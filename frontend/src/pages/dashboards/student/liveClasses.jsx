import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";

const EARLY_ACCESS_MINUTES = 10;

// Extract array safely from API responses
const pickArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.classes)) return d.classes;
  if (Array.isArray(d?.result)) return d.result;
  if (Array.isArray(d?.payload)) return d.payload;
  if (Array.isArray(d?.data?.classes)) return d.data.classes;
  return [];
};

// Skeleton loader scaled down to match the tighter layout
function StudentLiveClassesLoader() {
  return (
    <div className="d-flex flex-column gap-3">
      {[1, 2, 3].map((key) => (
        <div key={key} className="card border-0 shadow-sm rounded-4 overflow-hidden" aria-hidden="true">
          <div className="card-body p-3 p-md-4 d-flex flex-column flex-lg-row gap-3 placeholder-glow" style={{ borderLeft: "5px solid #e9ecef" }}>
            <div className="flex-grow-1">
              <div className="d-flex gap-2 mb-2">
                <span className="placeholder col-2 rounded-pill" style={{ height: "22px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-2 rounded-pill" style={{ height: "22px", backgroundColor: "#e9ecef" }}></span>
              </div>
              <span className="placeholder col-8 rounded d-block mb-2" style={{ height: "24px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-5 rounded d-block mb-3" style={{ height: "18px", backgroundColor: "#e9ecef" }}></span>
              
              <div className="d-flex gap-3 mb-3">
                <span className="placeholder col-2 rounded" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-2 rounded" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-2 rounded" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
              </div>
              <span className="placeholder col-10 rounded d-block" style={{ height: "42px", backgroundColor: "#f8f9fa" }}></span>
            </div>
            
            <div className="d-flex flex-column justify-content-center gap-2" style={{ minWidth: "220px" }}>
              <span className="placeholder col-12 rounded-pill" style={{ height: "38px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-12 rounded-pill" style={{ height: "38px", backgroundColor: "#e9ecef" }}></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Generate vibrant colors based on class status
const getStatusColors = (status) => {
  if (status === "live") return { bg: "#198754", text: "#ffffff", lightBg: "#e8f5e9", icon: "#20c997", border: "#198754" }; 
  if (status === "scheduled") return { bg: "#ffc107", text: "#000000", lightBg: "#fff8e1", icon: "#ffca2c", border: "#ffc107" }; 
  if (status === "ended") return { bg: "#6c757d", text: "#ffffff", lightBg: "#f8f9fa", icon: "#adb5bd", border: "#ced4da" }; 
  return { bg: "#fd7e14", text: "#ffffff", lightBg: "#fff3cd", icon: "#ff922b", border: "#fd7e14" }; 
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getMsUntilStart = (startAt) => {
  if (!startAt) return null;
  const diff = new Date(startAt).getTime() - Date.now();
  return Number.isNaN(diff) ? null : diff;
};

const isWithinEarlyWindow = (lc) => {
  if (!lc?.startAt) return false;
  const diffMs = getMsUntilStart(lc.startAt);
  if (diffMs === null) return false;
  return diffMs <= EARLY_ACCESS_MINUTES * 60 * 1000 && diffMs > 0;
};

const isClassroomAccessibleForStudent = (lc) => {
  if (!lc) return false;
  if (lc.status === "cancelled") return false;
  if (lc.status === "live") return true;
  if (lc.status === "scheduled") return isWithinEarlyWindow(lc);
  if (lc.status === "ended") return false; 
  return false;
};

const canJoinClass = (lc) => {
  if (!lc) return false;
  if (lc.status === "cancelled" || lc.status === "ended") return false;
  if (lc.status === "live") return true;
  if (lc.status === "scheduled") return isWithinEarlyWindow(lc);
  return false;
};

const getStatusMessage = (lc) => {
  if (!lc) return "";
  if (lc.status === "cancelled") return "This class has been cancelled.";
  if (lc.status === "ended") return lc.recordingLink ? "This class has ended. Recording is available." : "This class has ended.";
  if (lc.status === "live") return "Class is live now. You can enter the classroom and join the meeting.";
  if (lc.status === "scheduled") {
    const diffMs = getMsUntilStart(lc.startAt);
    if (diffMs === null) return "Class schedule is available.";
    if (diffMs > EARLY_ACCESS_MINUTES * 60 * 1000) return `Classroom and join access will open ${EARLY_ACCESS_MINUTES} minutes before the class starts.`;
    if (diffMs > 0) return "Class starts soon. Classroom and join access are now open.";
    return "Class is about to begin.";
  }
  return "";
};

export default function StudentLiveClasses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState("");
  const [leavingId, setLeavingId] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeJoinedId, setActiveJoinedId] = useState(null);

  const joinedClassIdRef = useRef(null);

  // Load classes from API
  const fetchUpcoming = async () => {
    try {
      setError("");
      setLoading(true);
      const res = await api.get("/live-classes/me/upcoming");
      const list = pickArray(res);
      
      // PERSISTENCE SYNC: Auto-resume active class
      const currentlyJoined = list.find(lc => lc.isCurrentlyJoined === true);
      if (currentlyJoined) {
        setActiveJoinedId(String(currentlyJoined._id));
        joinedClassIdRef.current = String(currentlyJoined._id);
      } else {
        setActiveJoinedId(null);
        joinedClassIdRef.current = null;
      }

      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load live classes");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Poll server every minute
  useEffect(() => {
    fetchUpcoming();
    const interval = setInterval(fetchUpcoming, 60000);
    return () => clearInterval(interval);
  }, []);

  // Leave class if tab is closed
  useEffect(() => {
    const onBeforeUnload = () => {
      const liveClassId = joinedClassIdRef.current;
      if (!liveClassId) return;
      api.post(`/live-classes/${liveClassId}/leave`).catch(() => {});
      joinedClassIdRef.current = null;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Handle joining a session
  const handleJoin = async (lc) => {
    try {
      setError("");
      if (!canJoinClass(lc)) {
        setError(getStatusMessage(lc) || "You cannot join this class right now.");
        return;
      }
      setJoiningId(String(lc._id));
      const res = await api.post(`/live-classes/${lc._id}/join`);
      const meetingLink = res?.data?.data?.meetingLink || res?.data?.meetingLink;

      if (!meetingLink) {
        setError("Meeting link not found.");
        return;
      }

      joinedClassIdRef.current = String(lc._id);
      setActiveJoinedId(String(lc._id));

      window.open(meetingLink, "_blank", "noopener,noreferrer");
      fetchUpcoming(); 
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to join live class");
    } finally {
      setJoiningId("");
    }
  };

  // Handle leaving a session
  const handleLeave = async () => {
    const liveClassId = joinedClassIdRef.current;
    if (!liveClassId) return;
    try {
      setLeavingId(String(liveClassId));
      await api.post(`/live-classes/${liveClassId}/leave`);
      joinedClassIdRef.current = null;
      setActiveJoinedId(null);
      fetchUpcoming();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to leave live class");
    } finally {
      setLeavingId("");
    }
  };

  // Filter items by status and search query
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (Array.isArray(items) ? items : []).filter((lc) => {
      const matchesStatus = statusFilter === "all" ? true : lc.status === statusFilter;
      const matchesSearch = !q ||
        String(lc?.title || "").toLowerCase().includes(q) ||
        String(lc?.course?.title || "").toLowerCase().includes(q) ||
        String(lc?.provider || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [items, statusFilter, search]);

  const brandPurple = "#6f42c1";
  const brandPurpleDark = "#5a189a";

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="container-fluid py-3 py-md-4" style={{ maxWidth: "1100px" }}>
        
        {/* Tighter Header Section */}
        <div className="mb-3 mb-md-4">
          <h1 className="fw-bold mb-1" style={{ color: brandPurpleDark, fontSize: "1.75rem" }}>
            Live Learning Center
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.95rem" }}>
            Join your interactive sessions and manage your learning schedule.
          </p>
        </div>

        {/* Compact Filter and Search Panel */}
        <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
          <div style={{ height: "4px", background: "linear-gradient(90deg, #6f42c1, #ffc107, #20c997, #fd7e14)" }}></div>
          
          <div className="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            
            {/* Filter Pills Scaled Down */}
            <div className="d-flex flex-wrap gap-2">
              {["all", "scheduled", "live", "ended", "cancelled"].map((f) => {
                const isActive = statusFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className="btn rounded-pill px-3 py-1 text-capitalize fw-semibold transition-all"
                    style={{
                      backgroundColor: isActive ? brandPurple : "#f8f9fa",
                      color: isActive ? "#ffffff" : "#495057",
                      border: isActive ? `1px solid ${brandPurple}` : "1px solid #e9ecef",
                      fontSize: "0.85rem",
                      boxShadow: isActive ? "0 2px 6px rgba(111, 66, 193, 0.2)" : "none"
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {/* Scaled Search Input */}
            <div className="position-relative" style={{ minWidth: "260px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={brandPurple} className="position-absolute" style={{ top: "10px", left: "14px" }} viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input
                type="text"
                className="form-control rounded-pill shadow-none"
                placeholder="Search classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ 
                  padding: "8px 16px 8px 38px",
                  fontSize: "0.9rem",
                  border: `1px solid ${brandPurple}40`,
                  backgroundColor: "#ffffff"
                }}
              />
            </div>

          </div>
        </div>

        {/* Scaled Error Alert */}
        {error ? (
          <div className="alert border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2 py-2 px-3" style={{ backgroundColor: "#fd7e14", color: "#ffffff" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <span className="fw-medium" style={{ fontSize: "0.9rem" }}>{error}</span>
          </div>
        ) : null}

        {/* Dynamic Class List */}
        {loading && items.length === 0 ? (
          <StudentLiveClassesLoader />
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredItems.length === 0 ? (
              
              /* Compact Empty State */
              <div className="card border-0 shadow-sm rounded-4 text-center p-4" style={{ backgroundColor: "#ffffff", borderTop: `4px solid ${brandPurple}` }}>
                <div className="card-body py-4">
                  <div className="mb-3 mx-auto d-flex justify-content-center align-items-center rounded-circle" style={{ width: "60px", height: "60px", background: "linear-gradient(135deg, #6f42c1, #ffc107)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="#ffffff" viewBox="0 0 16 16">
                      <path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Z"/>
                      <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2Zm12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12Z"/>
                    </svg>
                  </div>
                  <h5 className="fw-bold mb-1" style={{ color: brandPurpleDark }}>No Classes Found</h5>
                  <p className="small text-muted mb-0">Adjust your search or filter to find what you need.</p>
                </div>
              </div>

            ) : (
              
              /* Refined & Scaled Class Cards */
              filteredItems.map((lc) => {
                const canJoin = canJoinClass(lc);
                const canEnterClassroom = isClassroomAccessibleForStudent(lc);
                const isJoined = activeJoinedId === String(lc._id);
                const attendanceSummary = lc.attendanceSummary || {};
                const hasRecording = !!lc.recordingLink && (lc.status === "ended" || lc.status === "cancelled");
                const colors = getStatusColors(lc.status);

                return (
                  <div key={lc._id} className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
                    
                    <div className="card-body p-0 d-flex flex-column flex-lg-row">
                      
                      {/* Thinner status indicator */}
                      <div className="d-none d-lg-block" style={{ width: "5px", backgroundColor: colors.border }}></div>
                      <div className="d-block d-lg-none" style={{ height: "4px", backgroundColor: colors.border }}></div>

                      <div className="p-3 p-md-4 w-100 d-flex flex-column flex-lg-row gap-3 gap-lg-4">
                        
                        {/* Main Info Section */}
                        <div className="flex-grow-1">
                          
                          {/* Smaller Badges */}
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span 
                              className="badge rounded-pill fw-bold px-2 py-1" 
                              style={{ 
                                backgroundColor: colors.bg, 
                                color: colors.text, 
                                fontSize: "0.7rem",
                                letterSpacing: "0.5px"
                              }}
                            >
                              <span className="text-uppercase">{lc.status}</span>
                            </span>
                            
                            {lc.provider && (
                              <span className="badge rounded-pill px-2 py-1 border" style={{ backgroundColor: "#f8f9fa", color: "#6c757d", fontSize: "0.7rem" }}>
                                {lc.provider.toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          {/* Scaled Title & Course Box */}
                          <h3 className="fw-bold mb-1" style={{ color: "#212529", fontSize: "1.2rem" }}>
                            {lc.title}
                          </h3>
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <span className="fw-semibold small" style={{ color: brandPurple }}>Course:</span>
                            <span className="small text-muted">{lc.course?.title || "Standalone Masterclass"}</span>
                          </div>
                          
                          {/* Tighter Meta Data Icons */}
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <div className="d-flex align-items-center gap-1 px-2 py-1 rounded" style={{ backgroundColor: "#fff8e1", border: "1px solid #ffecb5", fontSize: "0.8rem" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#fd7e14" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                              <span className="fw-medium text-dark">{formatDateTime(lc.startAt)}</span>
                            </div>
                            <div className="d-flex align-items-center gap-1 px-2 py-1 rounded" style={{ backgroundColor: "#e3f2fd", border: "1px solid #bbdefb", fontSize: "0.8rem" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#0d6efd" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                              <span className="fw-medium text-dark">{lc.durationMin} Min</span>
                            </div>
                            <div className="d-flex align-items-center gap-1 px-2 py-1 rounded" style={{ backgroundColor: "#e8f5e9", border: "1px solid #c8e6c9", fontSize: "0.8rem" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#198754" viewBox="0 0 16 16"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72a6.324 6.324 0 0 1 .5-.561zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>
                              <span className="fw-medium text-dark">{attendanceSummary.totalAttendees || 0} Attended</span>
                            </div>
                          </div>

                          {/* Scaled Status Message Panel */}
                          <div className="rounded-3 p-2 px-3 d-flex align-items-center gap-2 border" style={{ backgroundColor: colors.lightBg, borderColor: `${colors.border}30` }}>
                            <div className="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "26px", height: "26px" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill={colors.icon} viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                            </div>
                            <div className="fw-medium" style={{ color: "#495057", fontSize: "0.85rem" }}>
                              {getStatusMessage(lc)}
                            </div>
                          </div>

                        </div>

                        {/* Actions Sidebar Container (Slimmer) */}
                        <div className="d-flex flex-column justify-content-center gap-2 border-start-lg ps-lg-3 pt-3 pt-lg-0" style={{ minWidth: "220px", borderColor: "#e9ecef" }}>
                          
                          {/* Standardized Buttons */}
                          {canEnterClassroom ? (
                            <Link 
                              to={`/live-classes/${lc._id}/classroom`} 
                              className="btn rounded-pill w-100 fw-semibold py-2 shadow-sm"
                              style={{ backgroundColor: "#ffffff", border: `1px solid ${brandPurple}`, color: brandPurple, fontSize: "0.9rem" }}
                            >
                              Enter Classroom
                            </Link>
                          ) : (
                            <button type="button" className="btn rounded-pill w-100 fw-medium py-2 shadow-none" style={{ backgroundColor: "#f8f9fa", color: "#6c757d", border: "1px solid #dee2e6", fontSize: "0.9rem" }} disabled>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-2 mb-1" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
                              Classroom Locked
                            </button>
                          )}

                          {/* Join / Leave Buttons */}
                          {lc.status !== "ended" && lc.status !== "cancelled" && (
                            <>
                              {!isJoined ? (
                                <button
                                  className="btn rounded-pill w-100 fw-bold py-2 text-white shadow-sm"
                                  style={{ background: canJoin ? `linear-gradient(90deg, ${brandPurple}, ${brandPurpleDark})` : "#ced4da", border: "none", fontSize: "0.9rem" }}
                                  onClick={() => handleJoin(lc)}
                                  disabled={!canJoin || joiningId === String(lc._id)}
                                >
                                  {joiningId === String(lc._id) ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Joining...</>
                                  ) : "Join Meeting"}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-danger rounded-pill w-100 fw-bold py-2 shadow-sm"
                                  style={{ fontSize: "0.9rem" }}
                                  onClick={handleLeave}
                                  disabled={leavingId === String(lc._id)}
                                >
                                  {leavingId === String(lc._id) ? "Leaving..." : "Leave Meeting"}
                                </button>
                              )}
                            </>
                          )}

                          {/* Recording Button */}
                          {hasRecording && (
                            <a 
                              href={lc.recordingLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn rounded-pill w-100 fw-semibold py-2 shadow-sm"
                              style={{ backgroundColor: "#ffca2c", color: "#000", border: "none", fontSize: "0.9rem" }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-2 mb-1" viewBox="0 0 16 16"><path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>
                              Watch Recording
                            </a>
                          )}

                          <div className="text-center w-100 mt-1" style={{ fontSize: "0.75rem", color: "#adb5bd" }}>
                            Attendance tracked automatically
                          </div>
                          
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}