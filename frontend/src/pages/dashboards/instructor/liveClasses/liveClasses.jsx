import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../api/api";

const pickArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.courses)) return d.courses;
  if (Array.isArray(d?.classes)) return d.classes;
  if (Array.isArray(d?.result)) return d.result;
  if (Array.isArray(d?.payload)) return d.payload;
  if (Array.isArray(d?.data?.courses)) return d.data.courses;
  if (Array.isArray(d?.data?.classes)) return d.data.classes;
  return [];
};

// Compact skeleton loader matching the updated table UI
function LiveClassesLoader() {
  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom p-3 p-md-4 placeholder-glow d-flex justify-content-between">
         <span className="placeholder col-3 rounded d-block" style={{ height: "20px", backgroundColor: "#e9ecef" }}></span>
         <span className="placeholder col-1 rounded-pill d-block" style={{ height: "24px", backgroundColor: "#e9ecef" }}></span>
      </div>
      <div className="card-body p-0">
        <div className="d-flex flex-column">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="d-flex align-items-center justify-content-between p-3 border-bottom placeholder-glow">
              <div className="w-25">
                <span className="placeholder col-8 rounded d-block mb-2" style={{ height: "16px", backgroundColor: "#e9ecef" }}></span>
                <div className="d-flex gap-2">
                  <span className="placeholder col-4 rounded d-block" style={{ height: "12px", backgroundColor: "#e9ecef" }}></span>
                  <span className="placeholder col-4 rounded d-block" style={{ height: "12px", backgroundColor: "#e9ecef" }}></span>
                </div>
              </div>
              <span className="placeholder col-2 rounded" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-1 rounded" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-1 rounded-pill" style={{ height: "20px", backgroundColor: "#e9ecef" }}></span>
              <div className="d-flex gap-2 w-25 justify-content-end">
                <span className="placeholder col-3 rounded-pill" style={{ height: "30px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-2 rounded-pill" style={{ height: "30px", backgroundColor: "#e9ecef" }}></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getStatusColors = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "live") return { bg: "#198754", text: "#ffffff", lightBg: "#e8f5e9", icon: "#20c997", border: "#198754" }; 
  if (s === "scheduled") return { bg: "#6f42c1", text: "#ffffff", lightBg: "#f4edfc", icon: "#7b2cbf", border: "#6f42c1" };
  if (s === "ended") return { bg: "#6c757d", text: "#ffffff", lightBg: "#f8f9fa", icon: "#adb5bd", border: "#ced4da" }; 
  if (s === "cancelled") return { bg: "#fd7e14", text: "#ffffff", lightBg: "#fff3cd", icon: "#ff922b", border: "#fd7e14" };
  return { bg: "#343a40", text: "#ffffff", lightBg: "#e9ecef", icon: "#495057", border: "#343a40" };
};

const getRecordingLabel = (lc) => {
  if (!lc) return "Not Available";
  if (lc.recordingLink) return lc.recordingStatus || "Ready";
  if (lc.status === "cancelled") return "Not Available";
  if (lc.status === "ended") return "Pending";
  return lc.recordingStatus || "Not Available";
};

const getRecordingColors = (label) => {
  const l = String(label).toLowerCase();
  if (l.includes("ready") || l.includes("processed")) return { bg: "#d1e7dd", text: "#0f5132", border: "#badbcc" };
  if (l.includes("pending") || l.includes("processing")) return { bg: "#fff3cd", text: "#664d03", border: "#ffecb5" };
  return { bg: "#f8f9fa", text: "#6c757d", border: "#dee2e6" };
};

export default function InstructorLiveClasses() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [liveClasses, setLiveClasses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [cancelingId, setCancelingId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const courseMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(courses) ? courses : []).forEach((c) => m.set(String(c?._id), c));
    return m;
  }, [courses]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setError("");
        setLoadingCourses(true);
        const res = await api.get("/instructor/courses");
        const list = pickArray(res);
        const approvedCourses = (Array.isArray(list) ? list : []).filter((c) => c?.status === "approved");
        setCourses(approvedCourses);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load courses");
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  const fetchLiveClasses = useCallback(async () => {
    try {
      setError("");
      setLoadingClasses(true);
      const res = selectedCourseId
        ? await api.get(`/live-classes/course/${selectedCourseId}`)
        : await api.get("/live-classes/me/all");
      const list = pickArray(res);
      setLiveClasses(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load live classes");
      setLiveClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    fetchLiveClasses();
  }, [fetchLiveClasses]);

  useEffect(() => {
    const interval = setInterval(fetchLiveClasses, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveClasses]);

  const handleCancel = async (liveClassId) => {
    const ok = window.confirm("Are you sure you want to cancel this live class? This action cannot be undone.");
    if (!ok) return;
    try {
      setError("");
      setCancelingId(String(liveClassId));
      await api.patch(`/live-classes/${liveClassId}/cancel`);
      await fetchLiveClasses();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to cancel live class");
    } finally {
      setCancelingId("");
    }
  };

  const selectedCourse = selectedCourseId ? courseMap.get(selectedCourseId) : null;

  const filteredLiveClasses = useMemo(() => {
    const list = Array.isArray(liveClasses) ? liveClasses : [];
    const q = search.trim().toLowerCase();
    return list.filter((lc) => {
      const matchesStatus = statusFilter === "all" ? true : lc?.status === statusFilter;
      const matchesSearch = !q ||
        String(lc?.title || "").toLowerCase().includes(q) ||
        String(lc?.course?.title || "").toLowerCase().includes(q) ||
        String(lc?.provider || "").toLowerCase().includes(q) ||
        String(lc?.meetingId || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [liveClasses, statusFilter, search]);

  const brandPurple = "#6f42c1";
  const brandPurpleDark = "#5a189a";

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
        
        {/* Header Area - Left Aligned */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div className="text-start">
            <h2 className="fw-bold mb-1" style={{ color: brandPurpleDark, fontSize: "1.75rem" }}>Live Sessions Management</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Schedule, manage, and monitor your course live sessions.
            </div>
          </div>
          <Link
            to="/instructor-dashboard/live-classes/create"
            className="btn rounded-pill px-4 py-2 fw-semibold shadow-sm text-white transition-all"
            style={{ backgroundColor: brandPurple, border: "none" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2 mb-1" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Create Live Class
          </Link>
        </div>

        {error ? (
          <div className="alert border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2 py-2 px-3 text-start" style={{ backgroundColor: "#fd7e14", color: "#ffffff" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <span className="fw-medium" style={{ fontSize: "0.9rem" }}>{error}</span>
          </div>
        ) : null}

        {/* Filters */}
        <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ backgroundColor: "#ffffff" }}>
          <div style={{ height: "4px", background: "linear-gradient(90deg, #6f42c1, #ffc107, #20c997, #fd7e14)" }}></div>
          <div className="card-body p-3 p-md-4">
            <div className="row g-3 text-start">
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark small mb-2">Select Course</label>
                <select
                  className="form-select border-0 bg-light rounded-3 py-2 shadow-none cursor-pointer"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={loadingCourses}
                  style={{ fontSize: "0.95rem", color: "#495057" }}
                >
                  <option value="">All Courses</option>
                  {(Array.isArray(courses) ? courses : []).map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark small mb-2">Filter Status</label>
                <select
                  className="form-select border-0 bg-light rounded-3 py-2 shadow-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ fontSize: "0.95rem", color: "#495057" }}
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live Now</option>
                  <option value="ended">Ended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark small mb-2">Search Sessions</label>
                <div className="position-relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#adb5bd" className="position-absolute" style={{ top: "12px", left: "12px" }} viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                  <input
                    type="text"
                    className="form-control border-0 bg-light rounded-3 py-2 ps-5 shadow-none"
                    placeholder="Search by title, ID, provider..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ fontSize: "0.95rem", color: "#495057" }}
                  />
                </div>
              </div>
            </div>
            {(selectedCourseId || statusFilter !== "all" || search) && (
              <div className="mt-3 pt-3 border-top d-flex flex-wrap align-items-center gap-2 justify-content-start">
                <span className="text-muted small fw-medium">Active Filters:</span>
                {selectedCourseId && <span className="badge rounded-pill bg-light text-dark border px-2 py-1 small">{selectedCourse?.title || "Course"}</span>}
                {statusFilter !== "all" && <span className="badge rounded-pill bg-light text-dark border px-2 py-1 small text-capitalize">{statusFilter}</span>}
                {search && <span className="badge rounded-pill bg-light text-dark border px-2 py-1 small">Search: "{search}"</span>}
              </div>
            )}
          </div>
        </div>

        {/* Data Table Section */}
        {loadingClasses && liveClasses.length === 0 ? (
          <LiveClassesLoader />
        ) : (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
            <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold text-start" style={{ color: "#212529", fontSize: "1.1rem" }}>
                {selectedCourseId ? "Course Sessions" : "All Instructor Sessions"}
              </h5>
              <span className="badge rounded-pill px-3 py-1" style={{ backgroundColor: brandPurpleDark, color: "#fff", fontSize: "0.85rem" }}>
                {filteredLiveClasses.length} Sessions
              </span>
            </div>
            
            <div className="card-body p-0">
              {!filteredLiveClasses.length ? (
                /* Empty State - Now Left Aligned */
                <div className="text-start p-5">
                  <div className="mb-3 d-flex justify-content-center align-items-center rounded-circle bg-light" style={{ width: "64px", height: "64px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#adb5bd" viewBox="0 0 16 16">
                      <path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Z"/>
                      <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2Zm12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12Z"/>
                    </svg>
                  </div>
                  <h6 className="fw-bold text-dark mb-2">No Live Classes Found</h6>
                  <p className="text-muted small mb-4">
                    {selectedCourseId
                      ? "There are no sessions scheduled for this specific course."
                      : "You haven't scheduled any live classes yet, or none match your filters."}
                  </p>
                  <Link to="/instructor-dashboard/live-classes/create" className="btn btn-outline-primary rounded-pill px-4 btn-sm fw-medium">
                    Schedule a Session
                  </Link>
                </div>
              ) : (
                /* Refined Data Table - All content text-start */
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 text-start" style={{ fontSize: "0.85rem" }}>
                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                      <tr>
                        <th className="fw-semibold text-muted py-3 ps-4 border-0" style={{ width: "30%" }}>Session Info</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "15%" }}>Schedule</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "15%" }}>Metrics</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "15%" }}>Recording</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "10%" }}>Status</th>
                        <th className="fw-semibold text-muted py-3 pe-4 text-end border-0" style={{ width: "15%" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="border-top-0">
                      {filteredLiveClasses.map((lc) => {
                        const isScheduled = lc.status === "scheduled";
                        const isLive = lc.status === "live";
                        const isEnded = lc.status === "ended";
                        const isCancelled = lc.status === "cancelled";
                        const attendanceSummary = lc.attendanceSummary || {};
                        const canEnterClassroom = !isCancelled;
                        const canOpenMeeting = !!lc.meetingLink && !isEnded && !isCancelled;
                        const canReschedule = isScheduled;
                        const canCancel = !isEnded && !isCancelled;
                        const canViewAttendance = isLive || isEnded || isCancelled;
                        const canManageRecording = !isCancelled && isEnded;
                        const showRecordingLink = !!lc.recordingLink;
                        const statusColor = getStatusColors(lc.status);
                        const recLabel = getRecordingLabel(lc);
                        const recColor = getRecordingColors(recLabel);

                        return (
                          <tr key={lc._id} className="border-bottom">
                            <td className="ps-4 py-3">
                              <h6 className="fw-bold mb-1 text-truncate" style={{ color: brandPurpleDark, fontSize: "1rem", maxWidth: "280px" }}>{lc.title}</h6>
                              <div className="d-flex align-items-center flex-wrap gap-2 mt-2" style={{ fontSize: "0.8rem" }}>
                                <span className="badge bg-light text-dark border px-2 py-1 text-truncate" style={{ maxWidth: "150px" }}>{lc.course?.title || "Standalone"}</span>
                                <span className="text-muted text-uppercase" style={{ fontSize: "0.75rem" }}>{lc.provider || "ZOOM"}</span>
                                {lc.meetingId && <span className="text-muted" style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>ID: {lc.meetingId}</span>}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="text-dark fw-medium mb-1">{formatDateTime(lc.startAt)}</div>
                              <div className="text-muted small">{lc.durationMin ? `${lc.durationMin} min` : "-"}</div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex flex-column gap-1" style={{ fontSize: "0.8rem" }}>
                                <span>Total: <b>{attendanceSummary.totalAttendees || 0}</b></span>
                                <span>Present: <b className="text-success">{attendanceSummary.presentCount || 0}</b></span>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="badge rounded-pill px-2 py-1" style={{ backgroundColor: recColor.bg, color: recColor.text, border: `1px solid ${recColor.border}`, fontSize: "0.7rem" }}>{recLabel}</span>
                              {showRecordingLink && <div className="mt-1"><a href={lc.recordingLink} target="_blank" className="text-decoration-none small fw-medium" style={{ color: brandPurple }}>View</a></div>}
                            </td>
                            <td className="py-3">
                              <span className="badge rounded-pill px-3 py-1 fw-bold" style={{ backgroundColor: statusColor.bg, color: statusColor.text, fontSize: "0.7rem" }}>{lc.status}</span>
                            </td>
                            <td className="py-3 pe-4 text-end">
                              <div className="d-flex justify-content-end gap-2">
                                {canOpenMeeting && <a href={lc.meetingLink} target="_blank" className="btn btn-sm btn-primary rounded-pill px-3 shadow-sm">Launch</a>}
                                {canEnterClassroom && <Link to={`/instructor-dashboard/live-classes/${lc._id}/classroom`} className="btn btn-sm btn-outline-dark rounded-pill px-3 shadow-sm">Classroom</Link>}
                                <div className="dropdown">
                                  <button className="btn btn-sm btn-light border rounded-pill px-2" data-bs-toggle="dropdown">•••</button>
                                  <ul className="dropdown-menu dropdown-menu-end shadow border-0">
                                    {canViewAttendance && <li><Link className="dropdown-item py-2" to={`/instructor-dashboard/live-classes/${lc._id}/attendance`}>Attendance</Link></li>}
                                    {canCancel && <li><button className="dropdown-item py-2 text-danger" onClick={() => handleCancel(lc._id)}>Cancel</button></li>}
                                  </ul>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Note - Now Left Aligned */}
            <div className="card-footer bg-light border-top-0 py-3 text-start ps-4">
              <span className="text-muted small">
                <span className="fw-semibold text-dark">Pro Tip:</span> Use <span className="fw-medium text-dark">Launch Zoom</span> to start the video stream, and keep <span className="fw-medium text-dark">Classroom</span> open for student engagement.
              </span>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}