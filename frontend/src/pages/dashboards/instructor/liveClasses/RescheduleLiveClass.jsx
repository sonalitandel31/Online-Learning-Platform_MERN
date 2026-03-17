import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/api";

// Compact skeleton loader for submitting state
function RescheduleLoader() {
  return (
    <div className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden" aria-hidden="true">
      <div className="card-body p-3 d-flex align-items-center gap-3 placeholder-glow border-start border-4" style={{ borderColor: "#ffc107" }}>
        <div className="placeholder rounded-circle flex-shrink-0" style={{ width: "36px", height: "36px", backgroundColor: "#e9ecef" }}></div>
        <div className="flex-grow-1">
          <span className="placeholder col-3 rounded d-block mb-1" style={{ height: "14px", backgroundColor: "#ffc107" }}></span>
          <span className="placeholder col-5 rounded d-block" style={{ height: "12px", backgroundColor: "#adb5bd" }}></span>
        </div>
      </div>
    </div>
  );
}

// Convert ISO string to HTML datetime-local format
const toDateTimeLocal = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export default function RescheduleLiveClass() {
  const { liveClassId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [liveClass, setLiveClass] = useState(null);

  const [form, setForm] = useState({
    title: "",
    courseTitle: "",
    currentStartAt: "",
    newStartAtLocal: "",
    durationMin: 60,
  });

  // Fetch the specific class details
  useEffect(() => {
    const fetchLiveClass = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/live-classes/me/all");
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

        if (found.status !== "scheduled") {
          setError("Only scheduled classes can be rescheduled.");
          setLiveClass(found);
          return;
        }

        setLiveClass(found);
        setForm({
          title: found.title || "",
          courseTitle: found.course?.title || "",
          currentStartAt: found.startAt || "",
          newStartAtLocal: toDateTimeLocal(found.startAt),
          durationMin: found.durationMin || 60,
        });
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load live class");
      } finally {
        setLoading(false);
      }
    };

    fetchLiveClass();
  }, [liveClassId]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    if (error) setError("");
  };

  // Validate form before submission
  const validateForm = () => {
    const nextErrors = {};
    const startDate = form.newStartAtLocal ? new Date(form.newStartAtLocal) : null;
    const duration = Number(form.durationMin || 0);

    if (!form.newStartAtLocal) {
      nextErrors.newStartAtLocal = "Please choose the new class date and time.";
    } else if (!startDate || Number.isNaN(startDate.getTime())) {
      nextErrors.newStartAtLocal = "New class date/time is invalid.";
    } else if (startDate.getTime() <= Date.now()) {
      nextErrors.newStartAtLocal = "New class date/time must be in the future.";
    }

    if (!duration) {
      nextErrors.durationMin = "Please enter duration.";
    } else if (duration < 10 || duration > 600) {
      nextErrors.durationMin = "Duration must be between 10 and 600 minutes.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Submit the reschedule request
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      if (!validateForm()) return;

      setSubmitting(true);

      await api.patch(`/live-classes/${liveClassId}/reschedule`, {
        startAt: new Date(form.newStartAtLocal).toISOString(),
        durationMin: Number(form.durationMin),
      });

      navigate("/instructor-dashboard/live-classes");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to reschedule live class");
    } finally {
      setSubmitting(false);
    }
  };

  // Compute a nicely formatted preview string for the new date
  const newSchedulePreview = useMemo(() => {
    if (!form.newStartAtLocal) return "-";
    const d = new Date(form.newStartAtLocal);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [form.newStartAtLocal]);

  const brandPurple = "#6f42c1";
  const brandPurpleDark = "#5a189a";

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="container-fluid py-3 py-md-4" style={{ maxWidth: "1000px" }}>
        
        {/* Compact Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: brandPurpleDark, fontSize: "1.5rem" }}>Reschedule Session</h2>
            <div className="text-muted" style={{ fontSize: "0.85rem" }}>
              Change the date, time, or duration of a scheduled live session.
            </div>
          </div>
          <button 
            className="btn rounded-pill px-4 py-2 fw-medium shadow-none" 
            onClick={() => navigate("/instructor-dashboard/live-classes")}
            disabled={submitting}
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

        {submitting ? <RescheduleLoader /> : null}

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
                  <form onSubmit={handleSubmit} noValidate>
                    
                    {/* Read-only class info */}
                    <div className="bg-light rounded-3 p-3 mb-4 border">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label text-muted small fw-semibold mb-1">Session Title</label>
                          <div className="fw-bold text-dark text-truncate" style={{ fontSize: "0.95rem" }} title={form.title}>{form.title}</div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted small fw-semibold mb-1">Course</label>
                          <div className="fw-medium text-dark text-truncate" style={{ fontSize: "0.95rem" }} title={form.courseTitle}>{form.courseTitle || "-"}</div>
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: brandPurpleDark, fontSize: "0.95rem" }}>Update Schedule</h6>

                    <div className="row g-3 mb-4">
                      
                      {/* Current Time (Read Only) */}
                      <div className="col-12">
                         <label className="form-label fw-semibold text-dark small mb-1">Current Scheduled Time</label>
                         <input
                           className="form-control bg-light border-0 shadow-none rounded-3 py-2 text-muted"
                           value={form.currentStartAt ? new Date(form.currentStartAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                           disabled
                           style={{ fontSize: "0.9rem" }}
                         />
                      </div>

                      {/* New Date Input */}
                      <div className="col-md-7">
                        <label className="form-label fw-semibold text-dark small mb-1">New Date & Time <span className="text-danger">*</span></label>
                        <input
                          type="datetime-local"
                          name="newStartAtLocal"
                          className={`form-control bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.newStartAtLocal ? "is-invalid border-danger bg-white" : ""}`}
                          value={form.newStartAtLocal}
                          onChange={handleChange}
                          disabled={submitting}
                          style={{ fontSize: "0.9rem" }}
                        />
                        {fieldErrors.newStartAtLocal && <div className="invalid-feedback small">{fieldErrors.newStartAtLocal}</div>}
                      </div>

                      {/* Duration Input */}
                      <div className="col-md-5">
                        <label className="form-label fw-semibold text-dark small mb-1">Duration (Min) <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          name="durationMin"
                          min={10}
                          max={600}
                          className={`form-control bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.durationMin ? "is-invalid border-danger bg-white" : ""}`}
                          value={form.durationMin}
                          onChange={handleChange}
                          disabled={submitting}
                          style={{ fontSize: "0.9rem" }}
                        />
                        {fieldErrors.durationMin && <div className="invalid-feedback small">{fieldErrors.durationMin}</div>}
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="d-flex flex-wrap gap-2 pt-3 border-top">
                      <button
                        className="btn rounded-pill px-4 py-2 text-dark fw-bold shadow-sm"
                        type="submit"
                        disabled={submitting || !liveClass || liveClass.status !== "scheduled"}
                        style={{ backgroundColor: "#ffc107", border: "none", fontSize: "0.9rem" }}
                      >
                        {submitting ? "Updating..." : "Update Schedule"}
                      </button>

                      <button
                        className="btn rounded-pill px-4 py-2 fw-medium shadow-none"
                        type="button"
                        onClick={() => navigate("/instructor-dashboard/live-classes")}
                        disabled={submitting}
                        style={{ backgroundColor: "#e9ecef", color: "#495057", border: "1px solid #dee2e6", fontSize: "0.9rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Sidebar Preview */}
            <div className="col-lg-4">
              
              {/* Preview Card */}
              <div className="card border-0 shadow-sm rounded-4 mb-3" style={{ backgroundColor: "#ffffff" }}>
                <div className="card-header bg-white border-bottom p-3">
                  <h6 className="fw-bold mb-0 text-dark">Schedule Preview</h6>
                </div>
                <div className="card-body p-0">
                  <ul className="list-group list-group-flush" style={{ fontSize: "0.85rem" }}>
                    <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                      <span className="text-muted">New Start</span>
                      <span className="fw-bold text-dark text-end">{newSchedulePreview}</span>
                    </li>
                    <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent">
                      <span className="text-muted">Duration</span>
                      <span className="fw-bold text-dark text-end">{form.durationMin ? `${form.durationMin} mins` : "-"}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Help Notes */}
              <div className="card border-0 shadow-sm rounded-4" style={{ backgroundColor: "#fff8e1", borderLeft: "4px solid #ffc107" }}>
                <div className="card-body p-3">
                  <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: "0.9rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#ffc107" viewBox="0 0 16 16">
                      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                    </svg>
                    What happens next?
                  </h6>
                  <ul className="mb-0 ps-3 text-muted" style={{ fontSize: "0.8rem", lineHeight: "1.6" }}>
                    <li className="mb-1">Reminder flags will be reset automatically.</li>
                    <li>Students will be notified about the updated schedule.</li>
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