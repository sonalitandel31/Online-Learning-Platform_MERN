import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";

// This safely extracts an array from many possible API response shapes
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

// This safely extracts courses from many possible API response shapes
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

function AdminLiveClassesLoader() {
  return (
    <div className="p-4 border rounded-4 bg-light">
      <div className="d-flex align-items-center gap-3">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <div>
          <div className="fw-semibold">Loading live classes…</div>
          <div className="text-muted small">Fetching all scheduled sessions for admin.</div>
        </div>
      </div>
    </div>
  );
}

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

        // This keeps only approved courses in admin filter dropdown
        const approvedCourses = (Array.isArray(list) ? list : []).filter(
          (c) => c?.status === "approved"
        );

        setCourses(approvedCourses);
      } catch (e) {
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
    // This auto-refreshes class statuses
    const interval = setInterval(() => {
      fetchAllLiveClasses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadgeClass = (status) => {
    if (status === "scheduled") return "text-bg-primary";
    if (status === "live") return "text-bg-success";
    if (status === "ended") return "text-bg-secondary";
    if (status === "cancelled") return "text-bg-danger";
    return "text-bg-dark";
  };

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

      setLiveClasses((prev) =>
        (Array.isArray(prev) ? prev : []).map((x) =>
          String(x._id) === String(liveClassId) ? { ...x, status: "cancelled" } : x
        )
      );
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

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="mb-1 fw-bold">Admin Live Classes</h3>
          <div className="text-muted small">
            View and manage all live sessions across the platform.
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger rounded-4 shadow-sm">{error}</div>
      ) : null}

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Total Classes</div>
              <div className="fw-bold fs-4">{stats.total}</div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Scheduled</div>
              <div className="fw-bold fs-4 text-primary">{stats.scheduled}</div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Live</div>
              <div className="fw-bold fs-4 text-success">{stats.live}</div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Ended</div>
              <div className="fw-bold fs-4 text-secondary">{stats.ended}</div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Cancelled</div>
              <div className="fw-bold fs-4 text-danger">{stats.cancelled}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-lg-4">
              <label className="form-label fw-semibold">Search</label>
              <input
                type="text"
                className="form-control rounded-3"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by class, course, instructor..."
              />
            </div>

            <div className="col-lg-4">
              <label className="form-label fw-semibold">Filter by Course</label>
              <select
                className="form-select rounded-3"
                name="courseId"
                value={filters.courseId}
                onChange={handleFilterChange}
                disabled={loadingCourses}
              >
                <option value="">All Approved Courses</option>
                {(Array.isArray(courses) ? courses : []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <div className="form-text">
                Only approved courses are shown in this filter.
              </div>
            </div>

            <div className="col-lg-4">
              <label className="form-label fw-semibold">Filter by Status</label>
              <select
                className="form-select rounded-3"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loadingClasses ? (
        <AdminLiveClassesLoader />
      ) : (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h5 className="mb-1 fw-bold">All Live Sessions</h5>
                <div className="text-muted small">
                  Showing <span className="fw-semibold">{filteredClasses.length}</span> class(es)
                </div>
              </div>
            </div>

            {filteredClasses.length === 0 ? (
              <div className="text-center py-5">
                <div className="fw-semibold fs-5 mb-2">No live classes found</div>
                <div className="text-muted">
                  Try changing the search or filter options.
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr className="text-muted small">
                      <th className="fw-semibold">Title</th>
                      <th className="fw-semibold">Course</th>
                      <th className="fw-semibold">Instructor</th>
                      <th className="fw-semibold">Start Time</th>
                      <th className="fw-semibold">Duration</th>
                      <th className="fw-semibold">Status</th>
                      <th className="fw-semibold text-end">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredClasses.map((lc) => {
                      const canOpenMeeting =
                        !!lc.meetingLink && lc.status !== "ended" && lc.status !== "cancelled";

                      return (
                        <tr key={lc._id}>
                          <td style={{ minWidth: "220px" }}>
                            <div className="fw-semibold text-dark">{lc.title}</div>
                            <div className="text-muted small mt-1">
                              Provider: {lc.provider?.toUpperCase() || "ZOOM"}
                            </div>
                          </td>

                          <td style={{ minWidth: "180px" }}>
                            <div className="fw-semibold">{lc.course?.title || "-"}</div>
                          </td>

                          <td style={{ minWidth: "170px" }}>
                            <div>{lc.instructor?.name || "—"}</div>
                          </td>

                          <td style={{ minWidth: "190px" }}>
                            {lc.startAt ? new Date(lc.startAt).toLocaleString() : "-"}
                          </td>

                          <td>{lc.durationMin ? `${lc.durationMin} min` : "-"}</td>

                          <td>
                            <span className={`badge rounded-pill px-3 py-2 ${getStatusBadgeClass(lc.status)}`}>
                              {lc.status}
                            </span>
                          </td>

                          <td className="text-end">
                            <div className="d-flex justify-content-end flex-wrap gap-2">
                              {lc.recordingLink ? (
                                <a
                                  href={lc.recordingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                                >
                                  Recording
                                </a>
                              ) : null}

                              {canOpenMeeting ? (
                                <a
                                  href={lc.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-primary btn-sm rounded-pill px-3"
                                >
                                  Meeting
                                </a>
                              ) : null}

                              {/* CONDITIONAL RENDER: Hide Attendance if status is 'scheduled' */}
                              {lc.status !== "scheduled" ? (
                                <Link
                                  to={`/admin-dashboard/live-classes/${lc._id}/attendance`}
                                  className="btn btn-outline-dark btn-sm rounded-pill px-3"
                                >
                                  Attendance
                                </Link>
                              ) : null}

                              <button
                                className="btn btn-outline-danger btn-sm rounded-pill px-3"
                                onClick={() => handleCancel(lc._id)}
                                disabled={
                                  lc.status === "cancelled" ||
                                  lc.status === "ended" ||
                                  cancelingId === String(lc._id)
                                }
                              >
                                {cancelingId === String(lc._id) ? "Cancelling..." : "Cancel"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-muted small mt-4 pt-3 border-top">
              Tip: Admin can open attendance for any session to verify student participation and watch time.
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 