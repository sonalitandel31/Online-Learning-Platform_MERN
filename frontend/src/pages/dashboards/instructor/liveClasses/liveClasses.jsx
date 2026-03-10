import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../api/api";

// This safely extracts an array from many possible API response shapes
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

// This page-specific loader shows while classes are fetching
function LiveClassesLoader() {
  return (
    <div className="p-4 border rounded-4 bg-light">
      <div className="d-flex align-items-center gap-3">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <div>
          <div className="fw-semibold">Loading live classes…</div>
          <div className="text-muted small">Fetching your scheduled sessions.</div>
        </div>
      </div>
    </div>
  );
}

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

        const approvedCourses = (Array.isArray(list) ? list : []).filter(
          (c) => c?.status === "approved"
        );

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

      let res;

      if (!selectedCourseId) {
        res = await api.get("/live-classes/me/all");
      } else {
        res = await api.get(`/live-classes/course/${selectedCourseId}`);
      }

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
    const interval = setInterval(() => {
      fetchLiveClasses();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLiveClasses]);

  const getStatusBadgeClass = (status) => {
    if (status === "scheduled") return "text-bg-primary";
    if (status === "live") return "text-bg-success";
    if (status === "ended") return "text-bg-secondary";
    if (status === "cancelled") return "text-bg-danger";
    return "text-bg-dark";
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

  const selectedCourse = selectedCourseId ? courseMap.get(selectedCourseId) : null;

  const filteredLiveClasses = useMemo(() => {
    const list = Array.isArray(liveClasses) ? liveClasses : [];
    const q = search.trim().toLowerCase();

    return list.filter((lc) => {
      const matchesStatus = statusFilter === "all" ? true : lc?.status === statusFilter;

      const matchesSearch =
        !q ||
        String(lc?.title || "").toLowerCase().includes(q) ||
        String(lc?.course?.title || "").toLowerCase().includes(q) ||
        String(lc?.provider || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [liveClasses, statusFilter, search]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3 className="mb-1 fw-bold">Live Classes</h3>
          <div className="text-muted small">
            Schedule, manage, and monitor your course live sessions.
          </div>
        </div>

        <Link
          to="/instructor-dashboard/live-classes/create"
          className="btn btn-primary rounded-pill px-4 shadow-sm"
        >
          + Create Live Class
        </Link>
      </div>

      {error ? <div className="alert alert-danger rounded-4 shadow-sm">{error}</div> : null}

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-lg-4">
              <label className="form-label fw-semibold mb-2">Select Course</label>
              <select
                className="form-select rounded-3"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={loadingCourses}
              >
                <option value="">All Courses</option>

                {!loadingCourses &&
                  (Array.isArray(courses) ? courses : []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="col-lg-4">
              <label className="form-label fw-semibold mb-2">Filter by Status</label>
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="col-lg-4">
              <label className="form-label fw-semibold mb-2">Search</label>
              <input
                type="text"
                className="form-control rounded-3"
                placeholder="Search by title, course, provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 d-flex flex-wrap align-items-center gap-2">
            <span className="text-muted small">Selected course:</span>
            <span className="badge text-bg-light border text-dark px-3 py-2 rounded-pill">
              {selectedCourseId ? selectedCourse?.title || "-" : "All Courses"}
            </span>
          </div>
        </div>
      </div>

      {loadingClasses ? (
        <LiveClassesLoader />
      ) : (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h5 className="mb-1 fw-bold">
                  {selectedCourseId ? "Course Sessions" : "All Course Sessions"}
                </h5>
                <div className="text-muted small">
                  Total classes: <span className="fw-semibold">{filteredLiveClasses.length}</span>
                </div>
              </div>
            </div>

            {!Array.isArray(filteredLiveClasses) || filteredLiveClasses.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-2 fs-5 fw-semibold text-dark">No live classes found</div>
                <div className="text-muted mb-3">
                  {selectedCourseId
                    ? "This course does not have any matching live session."
                    : "No matching live classes found across your courses."}
                </div>
                <Link
                  to="/instructor-dashboard/live-classes/create"
                  className="btn btn-outline-primary rounded-pill px-4"
                >
                  Create Live Class
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr className="text-muted small">
                      <th className="fw-semibold">Title</th>
                      <th className="fw-semibold">Course</th>
                      <th className="fw-semibold">Start Time</th>
                      <th className="fw-semibold">Duration</th>
                      <th className="fw-semibold">Status</th>
                      <th className="fw-semibold text-end">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLiveClasses.map((lc) => {
                      const isScheduled = lc.status === "scheduled";
                      const isLive = lc.status === "live";
                      const isEnded = lc.status === "ended";
                      const isCancelled = lc.status === "cancelled";

                      const showRecordingLink = !!lc.recordingLink;
                      const showAddRecording = !lc.recordingLink && isEnded;

                      const canOpenMeeting = !!lc.meetingLink && !isEnded && !isCancelled;
                      const canReschedule = isScheduled;
                      const canCancel = !isEnded && !isCancelled;
                      const canViewAttendance = isLive || isEnded || isCancelled;

                      return (
                        <tr key={lc._id}>
                          <td style={{ minWidth: "240px" }}>
                            <div className="fw-semibold text-dark">{lc.title}</div>
                            <div className="text-muted small mt-1">
                              Provider: {lc.provider?.toUpperCase() || "ZOOM"}
                            </div>
                          </td>

                          <td style={{ minWidth: "220px" }}>
                            <div className="text-dark">
                              {lc.course?.title || selectedCourse?.title || "-"}
                            </div>
                          </td>

                          <td style={{ minWidth: "190px" }}>
                            <div className="text-dark">
                              {lc.startAt ? new Date(lc.startAt).toLocaleString() : "-"}
                            </div>
                          </td>

                          <td>
                            <span className="text-muted">
                              {lc.durationMin ? `${lc.durationMin} min` : "-"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`badge rounded-pill px-3 py-2 ${getStatusBadgeClass(lc.status)}`}
                            >
                              {lc.status}
                            </span>
                          </td>

                          <td className="text-end" style={{ minWidth: "470px" }}>
                            <div className="d-flex justify-content-end flex-wrap gap-2">
                              {showRecordingLink ? (
                                <a
                                  href={lc.recordingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                                >
                                  Recording
                                </a>
                              ) : null}

                              {showAddRecording ? (
                                <Link
                                  to={`/instructor-dashboard/live-classes/${lc._id}/recording`}
                                  className="btn btn-outline-success btn-sm rounded-pill px-3"
                                >
                                  Add Recording
                                </Link>
                              ) : null}

                              {canOpenMeeting ? (
                                <a
                                  href={lc.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-primary btn-sm rounded-pill px-3"
                                >
                                  Open Meeting
                                </a>
                              ) : null}

                              {canViewAttendance ? (
                                <Link
                                  to={`/instructor-dashboard/live-classes/${lc._id}/attendance`}
                                  className="btn btn-outline-dark btn-sm rounded-pill px-3"
                                >
                                  Attendance
                                </Link>
                              ) : null}

                              {canReschedule ? (
                                <Link
                                  to={`/instructor-dashboard/live-classes/${lc._id}/reschedule`}
                                  className="btn btn-outline-warning btn-sm rounded-pill px-3"
                                >
                                  Reschedule
                                </Link>
                              ) : null}

                              <button
                                className="btn btn-outline-danger btn-sm rounded-pill px-3"
                                onClick={() => handleCancel(lc._id)}
                                disabled={!canCancel || cancelingId === String(lc._id)}
                                title="Cancel this class"
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
              Tip: Use <span className="fw-semibold">All Courses</span> to see every session together,
              or select one course to manage it separately.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}