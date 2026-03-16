import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/api";

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

function AttendanceLoader() {
  return (
    <div className="p-4 border rounded-4 bg-light">
      <div className="d-flex align-items-center gap-3">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <div>
          <div className="fw-semibold">Loading attendance…</div>
          <div className="text-muted small">Fetching student join and leave records.</div>
        </div>
      </div>
    </div>
  );
}

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const getMinutesValue = (row) => {
  const v = Number(row?.minutesAttended || 0);
  return Number.isFinite(v) ? v : 0;
};

const getStatusBadgeClass = (status) => {
  if (status === "present") return "text-bg-success";
  if (status === "partial") return "text-bg-warning";
  return "text-bg-secondary";
};

export default function InstructorLiveClassAttendance() {
  const { liveClassId } = useParams();
  const navigate = useNavigate();

  const [liveClass, setLiveClass] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [serverSummary, setServerSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase();

  const backPath =
    role === "admin"
      ? "/admin-dashboard/live-classes"
      : "/instructor-dashboard/live-classes";

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setError("");
        setLoading(true);

        const res = await api.get(`/live-classes/${liveClassId}/attendance`);
        const payload = pickAttendancePayload(res);

        setLiveClass(payload?.liveClass || null);
        setAttendance(Array.isArray(payload?.attendance) ? payload.attendance : []);
        setServerSummary(payload?.summary || null);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load attendance");
        setLiveClass(null);
        setAttendance([]);
        setServerSummary(null);
      } finally {
        setLoading(false);
      }
    };

    if (liveClassId) fetchAttendance();
  }, [liveClassId]);

  const filteredAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (Array.isArray(attendance) ? attendance : []).filter((row) => {
      if (!q) return true;

      const studentName = String(row?.student?.name || "").toLowerCase();
      const studentEmail = String(row?.student?.email || "").toLowerCase();

      return studentName.includes(q) || studentEmail.includes(q);
    });
  }, [attendance, search]);

  const summary = useMemo(() => {
    if (serverSummary) {
      return {
        totalStudents: serverSummary.total || 0,
        present: serverSummary.present || 0,
        partial: serverSummary.partial || 0,
        absent: serverSummary.absent || 0,
      };
    }

    const list = Array.isArray(attendance) ? attendance : [];

    return {
      totalStudents: list.length,
      present: list.filter((x) => x?.attendanceStatus === "present").length,
      partial: list.filter((x) => x?.attendanceStatus === "partial").length,
      absent: list.filter((x) => x?.attendanceStatus === "absent").length,
    };
  }, [attendance, serverSummary]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="mb-1 fw-bold">Live Class Attendance</h3>
          <div className="text-muted small">
            View student participation and attendance duration for this session.
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary rounded-pill px-4"
            onClick={() => navigate(backPath)}
          >
            Back
          </button>

          {liveClass?.recordingLink ? (
            <a
              href={liveClass.recordingLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-dark rounded-pill px-4"
            >
              Recording
            </a>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-danger rounded-4 shadow-sm">{error}</div> : null}

      {loading ? (
        <AttendanceLoader />
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="text-muted small mb-1">Total Records</div>
                  <div className="fs-4 fw-bold">{summary.totalStudents}</div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="text-muted small mb-1">Present</div>
                  <div className="fs-4 fw-bold text-success">{summary.present}</div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="text-muted small mb-1">Partial</div>
                  <div className="fs-4 fw-bold text-warning">{summary.partial}</div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="text-muted small mb-1">Absent</div>
                  <div className="fs-4 fw-bold text-secondary">{summary.absent}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <div className="row g-3 align-items-end">
                <div className="col-lg-8">
                  <div className="text-muted small mb-1">Live Class</div>
                  <div className="fw-bold fs-5">{liveClass?.title || "-"}</div>

                  <div className="mt-2 text-muted small">
                    Course: <span className="fw-semibold text-dark">{liveClass?.course?.title || "-"}</span>
                  </div>

                  <div className="text-muted small mt-1">
                    Start Time:{" "}
                    <span className="fw-semibold text-dark">
                      {liveClass?.startAt ? formatDateTime(liveClass.startAt) : "-"}
                    </span>
                  </div>

                  <div className="text-muted small mt-1">
                    Duration:{" "}
                    <span className="fw-semibold text-dark">
                      {liveClass?.durationMin ? `${liveClass.durationMin} min` : "-"}
                    </span>
                  </div>

                  <div className="text-muted small mt-1">
                    Status:{" "}
                    <span className="fw-semibold text-dark text-capitalize">
                      {liveClass?.status || "-"}
                    </span>
                  </div>
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold mb-2">Search Student</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                  <h5 className="mb-1 fw-bold">Attendance Records</h5>
                  <div className="text-muted small">
                    Showing <span className="fw-semibold">{filteredAttendance.length}</span> record(s)
                  </div>
                </div>
              </div>

              {!filteredAttendance.length ? (
                <div className="text-center py-5">
                  <div className="mb-2 fs-5 fw-semibold text-dark">No attendance found</div>
                  <div className="text-muted">
                    No students have joined this live session yet, or no record matches your search.
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr className="text-muted small">
                        <th className="fw-semibold">Student</th>
                        <th className="fw-semibold">Email</th>
                        <th className="fw-semibold">Joined At</th>
                        <th className="fw-semibold">Left At</th>
                        <th className="fw-semibold">Minutes</th>
                        <th className="fw-semibold">Attendance Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredAttendance.map((row) => (
                        <tr key={row._id}>
                          <td style={{ minWidth: "220px" }}>
                            <div className="fw-semibold text-dark">{row?.student?.name || "—"}</div>
                          </td>

                          <td style={{ minWidth: "240px" }}>
                            <div className="text-muted">{row?.student?.email || "-"}</div>
                          </td>

                          <td style={{ minWidth: "180px" }}>
                            <div className="text-dark">{formatDateTime(row?.joinAt)}</div>
                          </td>

                          <td style={{ minWidth: "180px" }}>
                            <div className="text-dark">{formatDateTime(row?.leaveAt)}</div>
                          </td>

                          <td style={{ minWidth: "120px" }}>
                            <span className="badge text-bg-light border text-dark px-3 py-2 rounded-pill">
                              {getMinutesValue(row)} min
                            </span>
                          </td>

                          <td style={{ minWidth: "160px" }}>
                            <span className={`badge rounded-pill px-3 py-2 ${getStatusBadgeClass(row?.attendanceStatus)}`}>
                              {row?.attendanceStatus || "absent"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-muted small mt-4 pt-3 border-top">
                Tip: Present/partial/absent is calculated automatically using attended minutes vs total class duration.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}