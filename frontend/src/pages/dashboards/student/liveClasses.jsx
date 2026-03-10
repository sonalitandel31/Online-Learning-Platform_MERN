import { useEffect, useRef, useState } from "react";
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

export default function StudentLiveClasses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState("");
  const [error, setError] = useState("");
  
  // NEW: State for the status filter
  const [statusFilter, setStatusFilter] = useState("all");

  const joinedClassIdRef = useRef(null);

  const fetchUpcoming = async () => {
    try {
      setError("");
      setLoading(true);

      // Note: If you want 'ended' and 'cancelled' classes to show up, 
      // make sure this endpoint returns them, otherwise change to an '/all' endpoint
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

    // Auto refresh every 30 seconds (important for status updates)
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

  // Join rule
  const canJoinClass = (lc) => {
    if (!lc) return false;
    if (lc.status === "cancelled" || lc.status === "ended") return false;

    if (lc.status === "live") return true;

    if (lc.status === "scheduled" && lc.startAt) {
      const diffMs = new Date(lc.startAt).getTime() - Date.now();
      return diffMs <= 10 * 60 * 1000;
    }

    return false;
  };

  const getJoinMessage = (lc) => {
    if (!lc) return "";

    if (lc.status === "cancelled") return "This class has been cancelled.";
    if (lc.status === "ended") return "This class has ended.";
    if (lc.status === "live") return "Class is live now.";

    if (lc.status === "scheduled" && lc.startAt) {
      const diffMs = new Date(lc.startAt).getTime() - Date.now();

      if (diffMs > 10 * 60 * 1000) {
        return "Join unlocks 10 minutes before start.";
      }

      return "Class starting soon.";
    }

    return "";
  };

  const handleJoin = async (lc) => {
    try {
      setError("");

      if (!canJoinClass(lc)) {
        setError(getJoinMessage(lc) || "Cannot join yet.");
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
      await api.post(`/live-classes/${liveClassId}/leave`);
    } catch {}

    joinedClassIdRef.current = null;
  };

  const getBadgeClass = (status) => {
    if (status === "live") return "text-bg-success";
    if (status === "scheduled") return "text-bg-primary";
    if (status === "ended") return "text-bg-secondary";
    return "text-bg-danger";
  };

  // NEW: Filter the items based on the selected status
  const filteredItems = items.filter((lc) => {
    if (statusFilter === "all") return true;
    return lc.status === statusFilter;
  });

  return (
    <div className="container py-3">
      <div className="mb-3 d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <h4 className="mb-0">Live Classes</h4>
          <div className="text-muted small">
            Join live sessions and watch recordings.
          </div>
        </div>
        
        {/* NEW: Filter Buttons */}
        <div className="d-flex flex-wrap gap-2">
          <button 
            className={`btn btn-sm rounded-pill px-3 ${statusFilter === "all" ? "btn-dark" : "btn-outline-dark"}`} 
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          <button 
            className={`btn btn-sm rounded-pill px-3 ${statusFilter === "scheduled" ? "btn-primary" : "btn-outline-primary"}`} 
            onClick={() => setStatusFilter("scheduled")}
          >
            Scheduled
          </button>
          <button 
            className={`btn btn-sm rounded-pill px-3 ${statusFilter === "live" ? "btn-success" : "btn-outline-success"}`} 
            onClick={() => setStatusFilter("live")}
          >
            Live
          </button>
          <button 
            className={`btn btn-sm rounded-pill px-3 ${statusFilter === "ended" ? "btn-secondary" : "btn-outline-secondary"}`} 
            onClick={() => setStatusFilter("ended")}
          >
            Ended
          </button>
          <button 
            className={`btn btn-sm rounded-pill px-3 ${statusFilter === "cancelled" ? "btn-danger" : "btn-outline-danger"}`} 
            onClick={() => setStatusFilter("cancelled")}
          >
            Cancelled
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger rounded shadow-sm">{error}</div>}

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
                  const isJoined = joinedClassIdRef.current === String(lc._id);

                  return (
                    <div key={lc._id} className="list-group-item border-0 border-bottom py-3 px-0">
                      <div className="d-flex justify-content-between flex-wrap gap-3">
                        <div>
                          <div className="fw-bold fs-5 text-dark">{lc.title}</div>

                          <div className="text-muted small mt-1">
                            <span className="fw-semibold">Course:</span> {lc.course?.title || "-"}
                          </div>

                          <div className="text-muted small">
                            <span className="fw-semibold">Start:</span>{" "}
                            {lc.startAt
                              ? new Date(lc.startAt).toLocaleString()
                              : "-"}{" "}
                            • <span className="fw-semibold">Duration:</span> {lc.durationMin} min
                          </div>

                          <div className="text-muted small mt-1">
                            {getJoinMessage(lc)}
                          </div>

                          {/* UPDATED: Show recording if status is ended OR cancelled */}
                          {lc.recordingLink && (lc.status === "ended" || lc.status === "cancelled") && (
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
                          )}
                        </div>

                        <div className="text-end" style={{ minWidth: "140px" }}>
                          <span
                            className={`badge mb-3 px-3 py-2 rounded-pill ${getBadgeClass(lc.status)}`}
                          >
                            {lc.status}
                          </span>

                          <div className="d-flex gap-2 justify-content-end">
                            <button
                              className="btn btn-sm btn-primary rounded-pill px-4 shadow-sm"
                              onClick={() => handleJoin(lc)}
                              disabled={!canJoin || joiningId === String(lc._id)}
                            >
                              {joiningId === String(lc._id)
                                ? "Joining…"
                                : "Join"}
                            </button>

                            {isJoined && (
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                onClick={handleLeave}
                              >
                                Leave
                              </button>
                            )}
                          </div>

                          <div className="text-muted small mt-2" style={{ fontSize: "11px" }}>
                            Attendance tracked automatically.
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