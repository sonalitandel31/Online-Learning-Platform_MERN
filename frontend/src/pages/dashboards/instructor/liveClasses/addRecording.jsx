import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/api";

// Compact skeleton loader for saving state
function AddRecordingLoader({ text = "Saving recording link…" }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden" aria-hidden="true">
      <div className="card-body p-3 d-flex align-items-center gap-3 placeholder-glow border-start border-4" style={{ borderColor: "#198754" }}>
        <div className="placeholder rounded-circle flex-shrink-0" style={{ width: "36px", height: "36px", backgroundColor: "#e9ecef" }}></div>
        <div className="flex-grow-1">
          <span className="placeholder col-3 rounded d-block mb-1" style={{ height: "14px", backgroundColor: "#198754" }}></span>
          <span className="placeholder col-5 rounded d-block" style={{ height: "12px", backgroundColor: "#adb5bd" }}></span>
        </div>
      </div>
    </div>
  );
}

const isValidHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export default function AddRecording() {
  const { liveClassId } = useParams();
  const navigate = useNavigate();

  const [liveClass, setLiveClass] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    recordingLink: "",
    recordingStatus: "ready",
    recordingDurationMin: "",
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase();

  const backPath =
    role === "admin"
      ? "/admin-dashboard/live-classes"
      : "/instructor-dashboard/live-classes";

  // Fetch the specific class details
  useEffect(() => {
    const fetchLiveClass = async () => {
      try {
        setLoading(true);
        setError("");

        const res =
          role === "admin"
            ? await api.get("/live-classes/admin/all")
            : await api.get("/live-classes/me/all");

        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];

        const found = list.find((x) => String(x._id) === String(liveClassId));

        if (!found) {
          setError("Live class not found.");
          setLiveClass(null);
          return;
        }

        setLiveClass(found);
        setForm({
          recordingLink: found.recordingLink || "",
          recordingStatus: found.recordingStatus || "ready",
          recordingDurationMin:
            found.recordingDurationMin !== undefined && found.recordingDurationMin !== null
              ? String(found.recordingDurationMin)
              : "",
        });
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load live class");
        setLiveClass(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveClass();
  }, [liveClassId, role]);

  // Validate form inputs
  const validate = () => {
    const nextErrors = {};

    if (!form.recordingLink.trim()) {
      nextErrors.recordingLink = "Please enter recording link.";
    } else if (!isValidHttpUrl(form.recordingLink.trim())) {
      nextErrors.recordingLink = "Please enter a valid http/https recording link.";
    }

    if (
      form.recordingDurationMin &&
      (Number.isNaN(Number(form.recordingDurationMin)) || Number(form.recordingDurationMin) < 0)
    ) {
      nextErrors.recordingDurationMin = "Recording duration must be a valid positive number.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Submit updated recording info
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (!validate()) return;

      setSaving(true);

      await api.patch(`/live-classes/${liveClassId}/recording`, {
        recordingLink: form.recordingLink.trim(),
        recordingStatus: form.recordingStatus,
        recordingDurationMin: form.recordingDurationMin
          ? Number(form.recordingDurationMin)
          : undefined,
      });

      navigate(backPath);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save recording link");
    } finally {
      setSaving(false);
    }
  };

  const canAddRecording = useMemo(() => {
    if (!liveClass) return false;
    if (liveClass.status === "cancelled") return false;
    return true;
  }, [liveClass]);

  const brandPurple = "#6f42c1";
  const brandPurpleDark = "#5a189a";

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="container-fluid py-3 py-md-4" style={{ maxWidth: "1000px" }}>
        
        {/* Compact Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: brandPurpleDark, fontSize: "1.5rem" }}>Add Class Recording</h2>
            <div className="text-muted" style={{ fontSize: "0.85rem" }}>
              Save the recording link so students can watch the class later.
            </div>
          </div>
          <button 
            className="btn rounded-pill px-4 py-2 fw-medium shadow-none" 
            onClick={() => navigate(backPath)}
            disabled={saving}
            style={{ backgroundColor: "#e9ecef", color: "#495057", border: "1px solid #dee2e6", fontSize: "0.85rem" }}
          >
            Back to List
          </button>
        </div>

        {/* Global Error Notice */}
        {error ? (
          <div className="alert border-0 shadow-sm rounded-3 mb-4 py-2 px-3 d-flex align-items-center gap-2" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <span className="fw-medium" style={{ fontSize: "0.85rem" }}>{error}</span>
          </div>
        ) : null}

        {saving ? <AddRecordingLoader /> : null}

        {loading ? (
          <div className="card border-0 shadow-sm rounded-4 placeholder-glow">
            <div className="card-body p-4 d-flex align-items-center gap-3">
              <span className="placeholder rounded-circle" style={{ width: "40px", height: "40px", backgroundColor: "#e9ecef" }}></span>
              <div>
                <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: "14px", backgroundColor: "#e9ecef" }}></span>
                <span className="placeholder col-6 rounded d-block" style={{ height: "12px", backgroundColor: "#e9ecef" }}></span>
              </div>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            
            {/* Main Form Area */}
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4" style={{ backgroundColor: "#ffffff" }}>
                <div className="card-body p-3 p-md-4">
                  {!canAddRecording ? (
                    <div className="alert border-0 rounded-3 mb-0 py-2 px-3 text-center" style={{ backgroundColor: "#fff8e1", color: "#664d03", border: "1px solid #ffecb5" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2 mb-1" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                      <strong>Recording blocked.</strong> This class is either cancelled or not eligible for a recording.
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} noValidate>
                      
                      {/* Read-only class info */}
                      <div className="bg-light rounded-3 p-3 mb-4 border">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label text-muted small fw-semibold mb-1">Session Title</label>
                            <div className="fw-bold text-dark text-truncate" style={{ fontSize: "0.95rem" }} title={liveClass?.title}>{liveClass?.title || "-"}</div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted small fw-semibold mb-1">Course</label>
                            <div className="fw-medium text-dark text-truncate" style={{ fontSize: "0.95rem" }} title={liveClass?.course?.title}>{liveClass?.course?.title || "-"}</div>
                          </div>
                        </div>
                      </div>

                      <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: brandPurpleDark, fontSize: "0.95rem" }}>Recording Details</h6>

                      <div className="mb-4">
                        <label className="form-label fw-semibold text-dark small mb-1">Recording Link URL <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0" style={{ borderColor: fieldErrors.recordingLink ? "#dc3545" : "#ced4da" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#6c757d" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>
                          </span>
                          <input
                            type="url"
                            className={`form-control bg-light border-start-0 shadow-none py-2 ${fieldErrors.recordingLink ? "is-invalid border-danger bg-white" : ""}`}
                            placeholder="e.g., https://zoom.us/rec/share/..."
                            value={form.recordingLink}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, recordingLink: e.target.value }));
                              if (fieldErrors.recordingLink) setFieldErrors((prev) => ({ ...prev, recordingLink: "" }));
                              if (error) setError("");
                            }}
                            disabled={saving}
                            style={{ fontSize: "0.9rem", borderLeftColor: fieldErrors.recordingLink ? "#dc3545" : "#ced4da" }}
                          />
                          {fieldErrors.recordingLink && <div className="invalid-feedback small">{fieldErrors.recordingLink}</div>}
                        </div>
                        {!fieldErrors.recordingLink && (
                          <div className="form-text mt-1" style={{ fontSize: "0.75rem" }}>Provide a direct link from Zoom, Drive, YouTube, etc.</div>
                        )}
                      </div>

                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-dark small mb-1">Status</label>
                          <select
                            className="form-select bg-light border-0 shadow-none rounded-3 py-2"
                            value={form.recordingStatus}
                            onChange={(e) => setForm((prev) => ({ ...prev, recordingStatus: e.target.value }))}
                            disabled={saving}
                            style={{ fontSize: "0.9rem" }}
                          >
                            <option value="processing">Processing (Hidden from students)</option>
                            <option value="ready">Ready to Watch</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-dark small mb-1">Duration (Min)</label>
                          <input
                            type="number"
                            min={0}
                            className={`form-control bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.recordingDurationMin ? "is-invalid border-danger bg-white" : ""}`}
                            value={form.recordingDurationMin}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, recordingDurationMin: e.target.value }));
                              if (fieldErrors.recordingDurationMin) setFieldErrors((prev) => ({ ...prev, recordingDurationMin: "" }));
                            }}
                            disabled={saving}
                            placeholder="Optional"
                            style={{ fontSize: "0.9rem" }}
                          />
                          {fieldErrors.recordingDurationMin && <div className="invalid-feedback small">{fieldErrors.recordingDurationMin}</div>}
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="d-flex flex-wrap gap-2 pt-3 border-top">
                        <button
                          className="btn rounded-pill px-4 py-2 text-white fw-bold shadow-sm"
                          type="submit"
                          disabled={saving || !canAddRecording}
                          style={{ backgroundColor: "#198754", border: "none", fontSize: "0.9rem" }}
                        >
                          {saving ? "Saving..." : "Save Recording"}
                        </button>

                        <button
                          className="btn rounded-pill px-4 py-2 fw-medium shadow-none"
                          type="button"
                          onClick={() => navigate(backPath)}
                          disabled={saving}
                          style={{ backgroundColor: "#e9ecef", color: "#495057", border: "1px solid #dee2e6", fontSize: "0.9rem" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Preview */}
            <div className="col-lg-4">
              
              {/* Info Card */}
              <div className="card border-0 shadow-sm rounded-4 mb-3" style={{ backgroundColor: "#ffffff" }}>
                <div className="card-header bg-white border-bottom p-3">
                  <h6 className="fw-bold mb-0 text-dark">Session Overview</h6>
                </div>
                <div className="card-body p-0">
                  <ul className="list-group list-group-flush" style={{ fontSize: "0.85rem" }}>
                    <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                      <span className="text-muted">Date</span>
                      <span className="fw-bold text-dark text-end">{liveClass?.startAt ? new Date(liveClass.startAt).toLocaleString(undefined, { month: 'short', day: 'numeric' }) : "-"}</span>
                    </li>
                    <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                      <span className="text-muted">Session Status</span>
                      <span className="badge rounded-pill bg-light border text-dark text-capitalize">{liveClass?.status || "-"}</span>
                    </li>
                    <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                      <span className="text-muted">Link Status</span>
                      <span className={`badge rounded-pill ${form.recordingStatus === 'ready' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>{form.recordingStatus}</span>
                    </li>
                    <li className="list-group-item px-3 py-2 bg-transparent text-truncate text-muted small" title={form.recordingLink}>
                      {form.recordingLink ? "Link provided" : "No link provided yet"}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Help Notes */}
              <div className="card border-0 shadow-sm rounded-4" style={{ backgroundColor: "#e8f5e9", borderLeft: "4px solid #198754" }}>
                <div className="card-body p-3">
                  <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: "0.9rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#198754" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                    </svg>
                    Best Practices
                  </h6>
                  <ul className="mb-0 ps-3 text-muted" style={{ fontSize: "0.8rem", lineHeight: "1.6" }}>
                    <li className="mb-1">Only set status to <strong>Ready</strong> when the video is fully processed.</li>
                    <li className="mb-1">Students can only view "Ready" recordings.</li>
                    <li>You can return to this page to update the link anytime.</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}