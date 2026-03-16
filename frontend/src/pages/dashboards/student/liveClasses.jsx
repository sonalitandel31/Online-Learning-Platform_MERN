import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";

const EARLY_ACCESS_MINUTES = 10;

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

function StudentLiveClassesLoader() {
  return (
    <div className="p-4 border rounded bg-light">
      <div className="d-flex align-items-center gap-3">
        <div className="spinner-border text-primary" role="status" />
        <div>
          <div className="fw-semibold">Loading your live classes…</div>
          <div className="text-muted small">Checking your schedule.</div>
        </div>
      </div>
    </div>
  );
}

const badgeClass = (status) => {
  if (status === "live") return "text-bg-success";
  if (status === "scheduled") return "text-bg-primary";
  if (status === "ended") return "text-bg-secondary";
  return "text-bg-danger";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
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
  if (lc.status === "ended") return false; // keep classroom closed after class for students
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

  if (lc.status === "cancelled") {
    return "This class has been cancelled.";
  }

  if (lc.status === "ended") {
    return lc.recordingLink
      ? "This class has ended. Recording is available."
      : "This class has ended.";
  }

  if (lc.status === "live") {
    return "Class is live now. You can enter the classroom and join the meeting.";
  }

  if (lc.status === "scheduled") {
    const diffMs = getMsUntilStart(lc.startAt);

    if (diffMs === null) {
      return "Class schedule is available.";
    }

    if (diffMs > EARLY_ACCESS_MINUTES * 60 * 1000) {
      return `Classroom and join access will open ${EARLY_ACCESS_MINUTES} minutes before the class starts.`;
    }

    if (diffMs > 0) {
      return "Class starts soon. Classroom and join access are now open.";
    }

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

  const joinedClassIdRef = useRef(null);

  const fetchUpcoming = async () => {
    try {
      setError("");
      setLoading(true);

      const res = await api.get("/live-classes/me/upcoming");
      const list = pickArray(res);
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load live classes");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
    const interval = setInterval(fetchUpcoming, 30000);
    return () => clearInterval(interval);
  }, []);

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
      window.open(meetingLink, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to join live class");
    } finally {
      setJoiningId("");
    }
  };

  const handleLeave = async () => {
    const liveClassId = joinedClassIdRef.current;
    if (!liveClassId) return;

    try {
      setLeavingId(String(liveClassId));
      await api.post(`/live-classes/${liveClassId}/leave`);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to leave live class");
    } finally {
      joinedClassIdRef.current = null;
      setLeavingId("");
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (Array.isArray(items) ? items : []).filter((lc) => {
      const matchesStatus = statusFilter === "all" ? true : lc.status === statusFilter;

      const matchesSearch =
        !q ||
        String(lc?.title || "").toLowerCase().includes(q) ||
        String(lc?.course?.title || "").toLowerCase().includes(q) ||
        String(lc?.provider || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [items, statusFilter, search]);

  return (
    <div className="container py-3">
      <div className="mb-3 d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <h4 className="mb-0">Live Classes</h4>
          <div className="text-muted small">
            Join live sessions and watch class recordings.
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            className={`btn btn-sm rounded-pill px-3 ${
              statusFilter === "all" ? "btn-dark" : "btn-outline-dark"
            }`}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 ${
              statusFilter === "scheduled" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setStatusFilter("scheduled")}
          >
            Scheduled
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 ${
              statusFilter === "live" ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setStatusFilter("live")}
          >
            Live
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 ${
              statusFilter === "ended" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => setStatusFilter("ended")}
          >
            Ended
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 ${
              statusFilter === "cancelled" ? "btn-danger" : "btn-outline-danger"
            }`}
            onClick={() => setStatusFilter("cancelled")}
          >
            Cancelled
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3">
          <label className="form-label fw-semibold mb-2">Search</label>
          <input
            type="text"
            className="form-control rounded-3"
            placeholder="Search by class title, course, provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? <div className="alert alert-danger rounded shadow-sm">{error}</div> : null}

      {loading ? (
        <StudentLiveClassesLoader />
      ) : (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body">
            {filteredItems.length === 0 ? (
              <div className="text-center py-5 text-muted">
                No classes found for the selected filter.
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {filteredItems.map((lc) => {
                  const canJoin = canJoinClass(lc);
                  const canEnterClassroom = isClassroomAccessibleForStudent(lc);
                  const isJoined = joinedClassIdRef.current === String(lc._id);
                  const attendanceSummary = lc.attendanceSummary || {};
                  const hasRecording =
                    !!lc.recordingLink &&
                    (lc.status === "ended" || lc.status === "cancelled");

                  return (
                    <div
                      key={lc._id}
                      className="list-group-item border-0 border-bottom py-3 px-0"
                    >
                      <div className="d-flex justify-content-between flex-wrap gap-3">
                        <div>
                          <div className="fw-bold fs-5 text-dark">{lc.title}</div>

                          <div className="text-muted small mt-1">
                            <span className="fw-semibold">Course:</span>{" "}
                            {lc.course?.title || "-"}
                          </div>

                          <div className="text-muted small">
                            <span className="fw-semibold">Start:</span>{" "}
                            {formatDateTime(lc.startAt)} •{" "}
                            <span className="fw-semibold">Duration:</span>{" "}
                            {lc.durationMin} min
                          </div>

                          <div className="text-muted small mt-1">
                            <span className="fw-semibold">Provider:</span>{" "}
                            {lc.provider?.toUpperCase() || "ZOOM"}
                          </div>

                          <div className="text-muted small mt-1">
                            <span className="fw-semibold">Attendance:</span>{" "}
                            {attendanceSummary.totalAttendees || 0} tracked
                          </div>

                          <div className="text-muted small mt-1">
                            <span className="fw-semibold">Recording:</span>{" "}
                            {lc.recordingLink
                              ? lc.recordingStatus || "ready"
                              : "not available"}
                          </div>

                          <div className="text-muted small mt-2">{getStatusMessage(lc)}</div>

                          {hasRecording ? (
                            <div className="mt-2">
                              <a
                                href={lc.recordingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline-dark rounded-pill px-3"
                              >
                                Watch Recording
                              </a>
                            </div>
                          ) : null}
                        </div>

                        <div className="text-end" style={{ minWidth: "280px" }}>
                          <span
                            className={`badge mb-3 px-3 py-2 rounded-pill ${badgeClass(
                              lc.status
                            )}`}
                          >
                            {lc.status}
                          </span>

                          <div className="d-flex gap-2 justify-content-end flex-wrap">
                            {canEnterClassroom ? (
                              <Link
                                to={`/live-classes/${lc._id}/classroom`}
                                className="btn btn-sm btn-outline-dark rounded-pill px-3"
                              >
                                Enter Classroom
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                disabled
                              >
                                Classroom Locked
                              </button>
                            )}

                            {lc.status !== "ended" && lc.status !== "cancelled" ? (
                              <button
                                className="btn btn-sm btn-primary rounded-pill px-4 shadow-sm"
                                onClick={() => handleJoin(lc)}
                                disabled={!canJoin || joiningId === String(lc._id)}
                              >
                                {joiningId === String(lc._id) ? "Joining…" : "Join"}
                              </button>
                            ) : null}

                            {isJoined ? (
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                onClick={handleLeave}
                                disabled={leavingId === String(lc._id)}
                              >
                                {leavingId === String(lc._id) ? "Leaving..." : "Leave"}
                              </button>
                            ) : null}
                          </div>

                          <div
                            className="text-muted small mt-2"
                            style={{ fontSize: "11px" }}
                          >
                            Attendance is tracked automatically when you join and leave.
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}