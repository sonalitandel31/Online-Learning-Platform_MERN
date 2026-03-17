import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";

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

const pickCourses = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.courses)) return d.courses;
  if (Array.isArray(d?.result)) return d.result;
  if (Array.isArray(d?.payload)) return d.payload;
  if (Array.isArray(d?.data?.courses)) return d.data.courses;
  return [];
};

// Scaled down skeleton loader
function AdminLiveClassesLoader() {
  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body p-4">
        {/* Header Skeleton */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom placeholder-glow">
          <div>
            <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: "24px", backgroundColor: "#e9ecef" }}></span>
            <span className="placeholder col-3 rounded d-block" style={{ height: "16px", backgroundColor: "#e9ecef" }}></span>
          </div>
        </div>
        
        {/* Table Rows Skeleton */}
        <div className="d-flex flex-column gap-3">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="d-flex align-items-center justify-content-between py-3 border-bottom placeholder-glow">
              <div className="w-25">
                <span className="placeholder col-10 rounded d-block mb-2" style={{ height: "18px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-6 rounded d-block" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
              </div>
              <span className="placeholder col-2 rounded" style={{ height: "16px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-2 rounded" style={{ height: "16px", backgroundColor: "#e9ecef" }}></span>
              <span className="placeholder col-1 rounded-pill" style={{ height: "24px", backgroundColor: "#e9ecef" }}></span>
              <div className="d-flex gap-2 w-25 justify-content-end">
                <span className="placeholder col-3 rounded-pill" style={{ height: "32px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-3 rounded-pill" style={{ height: "32px", backgroundColor: "#e9ecef" }}></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Generate vibrant colors based on class status
const getStatusColors = (status) => {
  if (status === "live") return { bg: "#198754", text: "#ffffff", lightBg: "#e8f5e9", icon: "#20c997", border: "#198754" }; 
  if (status === "scheduled") return { bg: "#6f42c1", text: "#ffffff", lightBg: "#f4edfc", icon: "#7b2cbf", border: "#6f42c1" }; 
  if (status === "ended") return { bg: "#6c757d", text: "#ffffff", lightBg: "#f8f9fa", icon: "#adb5bd", border: "#ced4da" }; 
  if (status === "cancelled") return { bg: "#fd7e14", text: "#ffffff", lightBg: "#fff3cd", icon: "#ff922b", border: "#fd7e14" };
  return { bg: "#343a40", text: "#ffffff", lightBg: "#e9ecef", icon: "#495057", border: "#343a40" };
};

export default function AdminLiveClasses() {
  const [courses, setCourses] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState("");

  const [filters, setFilters] = useState({
    courseId: "",
    status: "all",
    search: "",
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        setError("");

        const res = await api.get("/admin/courses");
        const list = pickCourses(res);
        const approvedCourses = (Array.isArray(list) ? list : []).filter(
          (c) => c?.status === "approved"
        );

        setCourses(approvedCourses);
      } catch {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const fetchAllLiveClasses = async () => {
    try {
      setLoadingClasses(true);
      setError("");

      const res = await api.get("/live-classes/admin/all");
      const list = pickArray(res);
      setLiveClasses(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load admin live classes");
      setLiveClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchAllLiveClasses();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchAllLiveClasses, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCancel = async (liveClassId) => {
    const ok = window.confirm("Are you sure you want to cancel this live class?");
    if (!ok) return;

    try {
      setError("");
      setCancelingId(String(liveClassId));
      await api.patch(`/live-classes/${liveClassId}/cancel`);
      fetchAllLiveClasses();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to cancel live class");
    } finally {
      setCancelingId("");
    }
  };

  const filteredClasses = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return (Array.isArray(liveClasses) ? liveClasses : []).filter((lc) => {
      const matchesCourse =
        !filters.courseId || String(lc?.course?._id) === String(filters.courseId);

      const matchesStatus =
        filters.status === "all" || String(lc?.status) === String(filters.status);

      const matchesSearch =
        !search ||
        String(lc?.title || "").toLowerCase().includes(search) ||
        String(lc?.course?.title || "").toLowerCase().includes(search) ||
        String(lc?.instructor?.name || "").toLowerCase().includes(search);

      return matchesCourse && matchesStatus && matchesSearch;
    });
  }, [liveClasses, filters]);

  const stats = useMemo(() => {
    const list = Array.isArray(liveClasses) ? liveClasses : [];
    return {
      total: list.length,
      scheduled: list.filter((x) => x.status === "scheduled").length,
      live: list.filter((x) => x.status === "live").length,
      ended: list.filter((x) => x.status === "ended").length,
      cancelled: list.filter((x) => x.status === "cancelled").length,
    };
  }, [liveClasses]);

  const brandPurple = "#6f42c1";
  const brandPurpleDark = "#5a189a";

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
        
        {/* Header Area */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: brandPurpleDark, fontSize: "1.75rem" }}>Platform Live Classes</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              View and manage all live sessions across the platform.
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error ? (
          <div className="alert border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2 py-2 px-3" style={{ backgroundColor: "#fd7e14", color: "#ffffff" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <span className="fw-medium" style={{ fontSize: "0.9rem" }}>{error}</span>
          </div>
        ) : null}

        {/* Stats Row */}
        <div className="row g-3 mb-4">
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-4 h-100" style={{ backgroundColor: "#ffffff" }}>
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "42px", height: "42px", backgroundColor: "#f8f9fa", color: "#495057" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Z"/><path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2Zm12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12Z"/></svg>
                </div>
                <div>
                  <div className="text-muted fw-medium mb-0" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Classes</div>
                  <div className="fw-bolder" style={{ fontSize: "1.4rem", color: "#212529", lineHeight: "1" }}>{stats.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-4 h-100" style={{ backgroundColor: "#ffffff" }}>
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "42px", height: "42px", backgroundColor: "#f4edfc", color: "#6f42c1" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>
                </div>
                <div>
                  <div className="text-muted fw-medium mb-0" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Scheduled</div>
                  <div className="fw-bolder" style={{ fontSize: "1.4rem", color: "#6f42c1", lineHeight: "1" }}>{stats.scheduled}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-2">
            <div className="card border-0 shadow-sm rounded-4 h-100" style={{ backgroundColor: "#ffffff" }}>
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "42px", height: "42px", backgroundColor: "#e8f5e9", color: "#198754" }}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>
                </div>
                <div>
                  <div className="text-muted fw-medium mb-0" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Live</div>
                  <div className="fw-bolder" style={{ fontSize: "1.4rem", color: "#198754", lineHeight: "1" }}>{stats.live}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-2">
            <div className="card border-0 shadow-sm rounded-4 h-100" style={{ backgroundColor: "#ffffff" }}>
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "42px", height: "42px", backgroundColor: "#f8f9fa", color: "#6c757d" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                </div>
                <div>
                  <div className="text-muted fw-medium mb-0" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ended</div>
                  <div className="fw-bolder" style={{ fontSize: "1.4rem", color: "#6c757d", lineHeight: "1" }}>{stats.ended}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-2">
            <div className="card border-0 shadow-sm rounded-4 h-100" style={{ backgroundColor: "#ffffff" }}>
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "42px", height: "42px", backgroundColor: "#fff3cd", color: "#fd7e14" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                </div>
                <div>
                  <div className="text-muted fw-medium mb-0" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cancelled</div>
                  <div className="fw-bolder" style={{ fontSize: "1.4rem", color: "#fd7e14", lineHeight: "1" }}>{stats.cancelled}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ backgroundColor: "#ffffff" }}>
          <div style={{ height: "4px", background: "linear-gradient(90deg, #6f42c1, #ffc107, #20c997, #fd7e14)" }}></div>
          <div className="card-body p-3 p-md-4">
            <div className="row g-3">
              
              {/* Course Selector */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark small mb-2">Filter Course</label>
                <div className="position-relative">
                  <select
                    className="form-select border-0 bg-light rounded-3 py-2 shadow-none cursor-pointer"
                    name="courseId"
                    value={filters.courseId}
                    onChange={handleFilterChange}
                    disabled={loadingCourses}
                    style={{ fontSize: "0.95rem", color: "#495057" }}
                  >
                    <option value="">All Approved Courses</option>
                    {(Array.isArray(courses) ? courses : []).map((c) => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark small mb-2">Filter Status</label>
                <select
                  className="form-select border-0 bg-light rounded-3 py-2 shadow-none cursor-pointer"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  style={{ fontSize: "0.95rem", color: "#495057" }}
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live Now</option>
                  <option value="ended">Ended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark small mb-2">Search Sessions</label>
                <div className="position-relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#adb5bd" className="position-absolute" style={{ top: "12px", left: "12px" }} viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                  <input
                    type="text"
                    className="form-control border-0 bg-light rounded-3 py-2 ps-5 shadow-none"
                    placeholder="Title, course, or instructor..."
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    style={{ fontSize: "0.95rem", color: "#495057" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        {loadingClasses && liveClasses.length === 0 ? (
          <AdminLiveClassesLoader />
        ) : (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
            <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 fw-bold" style={{ color: "#212529", fontSize: "1.1rem" }}>All Live Sessions</h5>
              </div>
              <span className="badge rounded-pill px-3 py-1" style={{ backgroundColor: brandPurpleDark, color: "#fff", fontSize: "0.85rem" }}>
                {filteredClasses.length} Sessions
              </span>
            </div>
            
            <div className="card-body p-0">
              {!filteredClasses.length ? (
                
                /* Empty State */
                <div className="text-center py-5">
                  <div className="mb-3 mx-auto d-flex justify-content-center align-items-center rounded-circle" style={{ width: "64px", height: "64px", backgroundColor: "#f8f9fa" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#adb5bd" viewBox="0 0 16 16">
                      <path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4 8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Z"/><path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2Zm12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12Z"/>
                    </svg>
                  </div>
                  <h6 className="fw-bold text-dark mb-2">No Live Classes Found</h6>
                  <p className="text-muted small mb-0">Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                
                /* Beautiful Data Table */
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.9rem" }}>
                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                      <tr>
                        <th className="fw-semibold text-muted py-3 ps-4 border-0" style={{ width: "25%" }}>Session Info</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "15%" }}>Instructor</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "20%" }}>Schedule & Provider</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "10%" }}>Status</th>
                        <th className="fw-semibold text-muted py-3 border-0" style={{ width: "15%" }}>Metrics</th>
                        <th className="fw-semibold text-muted py-3 pe-4 text-end border-0" style={{ width: "15%" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="border-top-0">
                      {filteredClasses.map((lc) => {
                        const canOpenMeeting = !!lc.meetingLink && lc.status !== "ended" && lc.status !== "cancelled";
                        const attendanceSummary = lc.attendanceSummary || {};
                        const statusColor = getStatusColors(lc.status);

                        return (
                          <tr key={lc._id} className="border-bottom">
                            
                            {/* Column 1: Info */}
                            <td className="ps-4 py-3">
                              <div>
                                <h6 className="fw-bold text-dark mb-1" style={{ fontSize: "0.95rem" }}>{lc.title}</h6>
                                <div className="text-muted small text-truncate" style={{ maxWidth: "250px" }} title={lc.course?.title}>
                                  {lc.course?.title || "-"}
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Instructor */}
                            <td className="py-3">
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: "28px", height: "28px", backgroundColor: "#f4edfc", color: brandPurple, fontSize: "0.75rem" }}>
                                  {String(lc.instructor?.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <span className="fw-medium text-dark" style={{ fontSize: "0.85rem" }}>{lc.instructor?.name || "—"}</span>
                              </div>
                            </td>

                            {/* Column 3: Schedule & Provider */}
                            <td className="py-3">
                              <div className="text-dark fw-medium mb-1" style={{ fontSize: "0.85rem" }}>
                                {lc.startAt ? new Date(lc.startAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                              </div>
                              <div className="d-flex align-items-center gap-2 mt-1">
                                <span className="badge bg-light text-secondary border px-2 py-0" style={{ fontSize: "0.65rem" }}>
                                  {lc.provider?.toUpperCase() || "ZOOM"}
                                </span>
                              </div>
                            </td>

                            {/* Column 4: Status */}
                            <td className="py-3">
                              <span 
                                className="badge rounded-pill px-3 py-1 fw-bold" 
                                style={{ backgroundColor: statusColor.bg, color: statusColor.text, fontSize: "0.7rem", letterSpacing: "0.5px", textTransform: "uppercase" }}
                              >
                                {lc.status}
                              </span>
                            </td>

                            {/* Column 5: Metrics & Recording */}
                            <td className="py-3">
                              <div className="d-flex flex-column gap-1" style={{ fontSize: "0.8rem" }}>
                                <div className="d-flex justify-content-between text-muted" style={{ maxWidth: "120px" }}>
                                  <span>Total:</span>
                                  <span className="fw-bold text-dark">{attendanceSummary.totalAttendees || 0}</span>
                                </div>
                                <div className="d-flex justify-content-between text-muted" style={{ maxWidth: "120px" }}>
                                  <span>Present:</span>
                                  <span className="fw-bold text-success">{attendanceSummary.presentCount || 0}</span>
                                </div>
                                <div className="mt-1">
                                  {lc.recordingLink ? (
                                    <a href={lc.recordingLink} target="_blank" rel="noreferrer" className="text-decoration-none small fw-medium" style={{ color: brandPurple }}>
                                      View Rec <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" className="ms-1" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
                                    </a>
                                  ) : (
                                    <span className="small text-muted fst-italic">No recording</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Column 6: Actions */}
                            <td className="py-3 pe-4 text-end">
                              <div className="d-flex justify-content-end flex-wrap gap-2">
                                
                                {canOpenMeeting && (
                                  <a href={lc.meetingLink} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary rounded-pill px-3 fw-medium shadow-sm" style={{ fontSize: "0.8rem" }}>
                                    Join Zoom
                                  </a>
                                )}

                                {/* Secondary Action Dropdown */}
                                <div className="dropdown">
                                  <button className="btn btn-sm btn-light border rounded-pill px-3 fw-medium text-muted shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{ fontSize: "0.8rem" }}>
                                    Manage <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="ms-1" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>
                                  </button>
                                  <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 mt-1" style={{ fontSize: "0.85rem" }}>
                                    {lc.status !== "scheduled" && (
                                      <li><Link className="dropdown-item py-2 fw-medium text-dark" to={`/admin-dashboard/live-classes/${lc._id}/attendance`}>View Attendance</Link></li>
                                    )}
                                    {(lc.status !== "scheduled" && (lc.status !== "ended" && lc.status !== "cancelled")) && <li><hr className="dropdown-divider" /></li>}
                                    {lc.status !== "ended" && lc.status !== "cancelled" && (
                                      <li>
                                        <button 
                                          className="dropdown-item py-2 text-danger fw-medium" 
                                          onClick={() => handleCancel(lc._id)}
                                          disabled={cancelingId === String(lc._id)}
                                        >
                                          {cancelingId === String(lc._id) ? "Cancelling..." : "Cancel Session"}
                                        </button>
                                      </li>
                                    )}
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

          </div>
        )}
      </div>
    </div>
  );
}