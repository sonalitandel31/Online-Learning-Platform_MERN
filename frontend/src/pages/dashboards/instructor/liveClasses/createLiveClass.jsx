import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/api";

// Safely extract array from API response
const pickArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.courses)) return d.courses;
  if (Array.isArray(d?.result)) return d.result;
  if (Array.isArray(d?.payload)) return d.payload;
  if (Array.isArray(d?.data?.courses)) return d.data.courses;
  return [];
};

// Compact skeleton loader for form submission state
function CreateLiveClassLoader({ text = "Creating live class…" }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden" aria-hidden="true">
      <div className="card-body p-3 d-flex align-items-center gap-3 placeholder-glow border-start border-4" style={{ borderColor: "#6f42c1" }}>
        <div className="placeholder rounded-circle flex-shrink-0" style={{ width: "36px", height: "36px", backgroundColor: "#e9ecef" }}></div>
        <div className="flex-grow-1">
          <span className="placeholder col-3 rounded d-block mb-1" style={{ height: "14px", backgroundColor: "#6f42c1" }}></span>
          <span className="placeholder col-5 rounded d-block" style={{ height: "12px", backgroundColor: "#adb5bd" }}></span>
        </div>
      </div>
    </div>
  );
}

export default function CreateLiveClass() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    courseId: "",
    title: "",
    description: "",
    provider: "zoom",
    startAtLocal: "",
    durationMin: 60,
    autoCreateMeeting: false,
    meetingLink: "",
    meetingId: "",
    meetingPassword: "",
    roomName: "",
    recordingMode: "manual",
  });

  // Fetch approved courses on component mount
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

        if (approvedCourses.length > 0) {
          setForm((p) => ({ ...p, courseId: String(approvedCourses[0]._id) }));
        } else {
          setForm((p) => ({ ...p, courseId: "" }));
        }
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load courses");
        setCourses([]);
        setForm((p) => ({ ...p, courseId: "" }));
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  // Compute selected course for preview pane
  const selectedCourse = useMemo(() => {
    return (Array.isArray(courses) ? courses : []).find(
      (c) => String(c._id) === String(form.courseId)
    );
  }, [courses, form.courseId]);

  const hasApprovedCourses = Array.isArray(courses) && courses.length > 0;

  const isZoomProvider = form.provider === "zoom";
  const shouldAutoCreateZoom = isZoomProvider && form.autoCreateMeeting;

  // Handle standard input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // If provider changes away from zoom, auto-create should turn off
      if (name === "provider" && value !== "zoom") {
        next.autoCreateMeeting = false;
      }

      return next;
    });

    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (error) setError("");
  };

  // Handle checkbox toggle for auto-create
  const handleAutoCreateToggle = (e) => {
    const checked = e.target.checked;

    setForm((prev) => ({
      ...prev,
      autoCreateMeeting: checked,
      // clear manual link validation issue when auto create is enabled
      meetingLink: checked ? "" : prev.meetingLink,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      meetingLink: "",
    }));

    if (error) setError("");
  };

  const toISOFromLocal = (localValue) => {
    if (!localValue) return null;
    return new Date(localValue).toISOString();
  };

  const isValidHttpUrl = (value) => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Validate all form fields before submission
  const validateForm = () => {
    const nextErrors = {};

    const title = form.title.trim();
    const meetingLink = form.meetingLink.trim();
    const duration = Number(form.durationMin || 0);
    const startDate = form.startAtLocal ? new Date(form.startAtLocal) : null;

    if (!form.courseId) {
      nextErrors.courseId = "Please select an approved course.";
    }

    if (!title) {
      nextErrors.title = "Please enter class title.";
    } else if (title.length < 3) {
      nextErrors.title = "Title must be at least 3 characters.";
    }

    if (!form.startAtLocal) {
      nextErrors.startAtLocal = "Please choose start time.";
    } else if (!startDate || Number.isNaN(startDate.getTime())) {
      nextErrors.startAtLocal = "Start time is invalid.";
    } else if (startDate.getTime() <= Date.now()) {
      nextErrors.startAtLocal = "Start time must be in the future.";
    }

    if (!duration) {
      nextErrors.durationMin = "Please enter duration.";
    } else if (duration < 10 || duration > 600) {
      nextErrors.durationMin = "Duration must be between 10 and 600 minutes.";
    }

    if (!shouldAutoCreateZoom) {
      if (!meetingLink) {
        nextErrors.meetingLink = "Please enter meeting link.";
      } else if (!isValidHttpUrl(meetingLink)) {
        nextErrors.meetingLink = "Please enter a valid http/https meeting link.";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Submit new live class to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (!hasApprovedCourses) {
        setError("No approved courses found. You can create live classes only for approved courses.");
        return;
      }

      if (!validateForm()) return;

      setSubmitting(true);

      const payload = {
        courseId: form.courseId,
        title: form.title.trim(),
        description: form.description?.trim() || "",
        provider: form.provider || "zoom",
        startAt: toISOFromLocal(form.startAtLocal),
        durationMin: Number(form.durationMin || 60),
        autoCreateMeeting: shouldAutoCreateZoom,
        meetingLink: shouldAutoCreateZoom ? "" : form.meetingLink.trim(),
        meetingId: form.meetingId.trim(),
        meetingPassword: form.meetingPassword.trim(),
        roomName: form.roomName.trim(),
        recordingMode: form.recordingMode,
      };

      await api.post("/live-classes", payload);
      navigate("/instructor-dashboard/live-classes");
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to create live class");
    } finally {
      setSubmitting(false);
    }
  };

  const brandPurple = "#6f42c1";
  const brandPurpleDark = "#5a189a";

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="container-fluid py-3 py-md-4" style={{ maxWidth: "1000px" }}>
        
        {/* Compact Header */}
        <div className="mb-3">
          <h2 className="fw-bold mb-1" style={{ color: brandPurpleDark, fontSize: "1.5rem" }}>Create Live Class</h2>
          <div className="text-muted" style={{ fontSize: "0.85rem" }}>
            Schedule a session, attach meeting details, and automatically notify enrolled students.
          </div>
        </div>

        {/* Global Error Banner */}
        {error ? (
          <div className="alert border-0 shadow-sm rounded-3 mb-3 d-flex align-items-center gap-2 py-2 px-3" style={{ backgroundColor: "#fd7e14", color: "#ffffff" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <span className="fw-medium" style={{ fontSize: "0.85rem" }}>{error}</span>
          </div>
        ) : null}

        {!loadingCourses && !hasApprovedCourses ? (
          <div className="alert border-0 shadow-sm rounded-3 mb-3 py-2 px-3" style={{ backgroundColor: "#e3f2fd", color: "#084298", fontSize: "0.85rem" }}>
            <strong>Note:</strong> No approved courses found. Live classes can be created only for approved courses.
          </div>
        ) : null}

        {/* Show skeleton while submitting */}
        {submitting ? <CreateLiveClassLoader /> : null}

        <div className="row g-3">
          
          {/* Main Form Column */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4" style={{ backgroundColor: "#ffffff" }}>
              <div className="card-body p-3 p-md-4">
                <form onSubmit={handleSubmit} noValidate>
                  
                  {/* General Info Section */}
                  <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: brandPurpleDark, fontSize: "0.95rem" }}>1. General Information</h6>
                  
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark small mb-1">Select Course <span className="text-danger">*</span></label>
                    <select
                      className={`form-select bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.courseId ? "is-invalid border-danger" : ""}`}
                      name="courseId"
                      value={form.courseId}
                      onChange={handleChange}
                      disabled={loadingCourses || submitting || !hasApprovedCourses}
                      style={{ fontSize: "0.9rem" }}
                    >
                      {loadingCourses ? <option>Loading courses…</option> : null}
                      {!loadingCourses && !hasApprovedCourses ? (
                        <option value="">No approved courses found</option>
                      ) : null}
                      {(Array.isArray(courses) ? courses : []).map((c) => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                    {fieldErrors.courseId ? (
                      <div className="invalid-feedback small">{fieldErrors.courseId}</div>
                    ) : (
                      <div className="form-text mt-1" style={{ fontSize: "0.75rem" }}>Only approved courses are available.</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark small mb-1">Class Title <span className="text-danger">*</span></label>
                    <input
                      className={`form-control bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.title ? "is-invalid border-danger" : ""}`}
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. Chapter 3: Advanced React Concepts"
                      disabled={submitting || !hasApprovedCourses}
                      style={{ fontSize: "0.9rem" }}
                    />
                    {fieldErrors.title && <div className="invalid-feedback small">{fieldErrors.title}</div>}
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold text-dark small mb-1">Agenda / Description</label>
                    <textarea
                      className="form-control bg-light border-0 shadow-none rounded-3 py-2"
                      rows={3}
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Briefly describe what will be covered..."
                      disabled={submitting || !hasApprovedCourses}
                      style={{ fontSize: "0.9rem", resize: "none" }}
                    />
                  </div>

                  {/* Scheduling Section */}
                  <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: brandPurpleDark, fontSize: "0.95rem" }}>2. Schedule & Provider</h6>

                  <div className="row g-2 mb-4">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-dark small mb-1">Platform <span className="text-danger">*</span></label>
                      <select
                        className="form-select bg-light border-0 shadow-none rounded-3 py-2"
                        name="provider"
                        value={form.provider}
                        onChange={handleChange}
                        disabled={submitting || !hasApprovedCourses}
                        style={{ fontSize: "0.9rem" }}
                      >
                        <option value="zoom">Zoom Meeting</option>
                        <option value="webrtc">WebRTC (Built-in)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-dark small mb-1">Start Date & Time <span className="text-danger">*</span></label>
                      <input
                        type="datetime-local"
                        className={`form-control bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.startAtLocal ? "is-invalid border-danger" : ""}`}
                        name="startAtLocal"
                        value={form.startAtLocal}
                        onChange={handleChange}
                        disabled={submitting || !hasApprovedCourses}
                        style={{ fontSize: "0.9rem" }}
                      />
                      {fieldErrors.startAtLocal && <div className="invalid-feedback small">{fieldErrors.startAtLocal}</div>}
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-dark small mb-1">Duration (Min) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className={`form-control bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.durationMin ? "is-invalid border-danger" : ""}`}
                        name="durationMin"
                        value={form.durationMin}
                        onChange={handleChange}
                        min={10}
                        max={600}
                        disabled={submitting || !hasApprovedCourses}
                        style={{ fontSize: "0.9rem" }}
                      />
                      {fieldErrors.durationMin && <div className="invalid-feedback small">{fieldErrors.durationMin}</div>}
                    </div>
                  </div>

                  {/* Meeting Details Section */}
                  <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: brandPurpleDark, fontSize: "0.95rem" }}>3. Meeting Configuration</h6>

                  <div className="card bg-light border-0 rounded-3 mb-3">
                    <div className="card-body p-3">
                      <div className="form-check form-switch mb-1">
                        <input
                          className="form-check-input cursor-pointer"
                          type="checkbox"
                          id="autoCreateMeeting"
                          checked={form.autoCreateMeeting}
                          onChange={handleAutoCreateToggle}
                          disabled={submitting || !hasApprovedCourses || form.provider !== "zoom"}
                          style={{ borderColor: form.autoCreateMeeting ? brandPurple : "#adb5bd", backgroundColor: form.autoCreateMeeting ? brandPurple : "transparent" }}
                        />
                        <label className="form-check-label fw-medium text-dark ms-2" htmlFor="autoCreateMeeting" style={{ fontSize: "0.9rem" }}>
                          Auto-generate Zoom meeting
                        </label>
                      </div>
                      <div className="text-muted ms-5 mt-1" style={{ fontSize: "0.75rem" }}>
                        Requires Zoom provider. The system will automatically create the meeting link and ID.
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark small mb-1">Join URL <span className="text-danger">{!shouldAutoCreateZoom && "*"}</span></label>
                    <input
                      className={`form-control bg-light border-0 shadow-none rounded-3 py-2 ${fieldErrors.meetingLink ? "is-invalid border-danger" : ""}`}
                      name="meetingLink"
                      value={form.meetingLink}
                      onChange={handleChange}
                      placeholder={shouldAutoCreateZoom ? "System will generate this link automatically" : "https://zoom.us/j/123456789"}
                      disabled={submitting || !hasApprovedCourses || shouldAutoCreateZoom}
                      style={{ fontSize: "0.9rem" }}
                    />
                    {fieldErrors.meetingLink ? (
                      <div className="invalid-feedback small">{fieldErrors.meetingLink}</div>
                    ) : (
                      <div className="form-text mt-1" style={{ fontSize: "0.75rem" }}>
                        {!shouldAutoCreateZoom && "Paste the direct join link for students."}
                      </div>
                    )}
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-dark small mb-1">Meeting ID</label>
                      <input
                        className="form-control bg-light border-0 shadow-none rounded-3 py-2"
                        name="meetingId"
                        value={form.meetingId}
                        onChange={handleChange}
                        placeholder="Optional"
                        disabled={submitting || !hasApprovedCourses || shouldAutoCreateZoom}
                        style={{ fontSize: "0.9rem" }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-dark small mb-1">Passcode</label>
                      <input
                        className="form-control bg-light border-0 shadow-none rounded-3 py-2"
                        name="meetingPassword"
                        value={form.meetingPassword}
                        onChange={handleChange}
                        placeholder="Optional"
                        disabled={submitting || !hasApprovedCourses}
                        style={{ fontSize: "0.9rem" }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-dark small mb-1">Room Name</label>
                      <input
                        className="form-control bg-light border-0 shadow-none rounded-3 py-2"
                        name="roomName"
                        value={form.roomName}
                        onChange={handleChange}
                        placeholder="Optional"
                        disabled={submitting || !hasApprovedCourses || shouldAutoCreateZoom}
                        style={{ fontSize: "0.9rem" }}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold text-dark small mb-1">Recording Policy</label>
                    <select
                      className="form-select bg-light border-0 shadow-none rounded-3 py-2 w-50"
                      name="recordingMode"
                      value={form.recordingMode}
                      onChange={handleChange}
                      disabled={submitting || !hasApprovedCourses}
                      style={{ fontSize: "0.9rem" }}
                    >
                      <option value="manual">Manual Upload/Link later</option>
                      <option value="auto">Auto-sync via Provider</option>
                    </select>
                  </div>

                  {/* Form Actions */}
                  <div className="d-flex flex-wrap gap-2 pt-3 border-top">
                    <button
                      className="btn rounded-pill px-4 py-2 text-white fw-medium shadow-sm"
                      type="submit"
                      disabled={submitting || !hasApprovedCourses}
                      style={{ background: `linear-gradient(90deg, ${brandPurple}, ${brandPurpleDark})`, border: "none", fontSize: "0.9rem" }}
                    >
                      {submitting ? "Processing..." : "Create Live Class"}
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

          {/* Right Sidebar Column */}
          <div className="col-lg-4">
            
            {/* Summary Ticket */}
            <div className="card border-0 shadow-sm rounded-4 mb-3" style={{ backgroundColor: "#ffffff" }}>
              <div className="card-header bg-white border-bottom p-3">
                <h6 className="fw-bold mb-0 text-dark">Class Summary</h6>
              </div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush" style={{ fontSize: "0.85rem" }}>
                  <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                    <span className="text-muted">Course</span>
                    <span className="fw-semibold text-dark text-end text-truncate w-50" title={selectedCourse?.title}>{selectedCourse?.title || "-"}</span>
                  </li>
                  <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                    <span className="text-muted">Title</span>
                    <span className="fw-semibold text-dark text-end text-truncate w-50" title={form.title}>{form.title.trim() || "-"}</span>
                  </li>
                  <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                    <span className="text-muted">Platform</span>
                    <span className="fw-semibold text-dark text-end text-uppercase">{form.provider || "-"}</span>
                  </li>
                  <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                    <span className="text-muted">Start Time</span>
                    <span className="fw-semibold text-dark text-end">{form.startAtLocal ? new Date(form.startAtLocal).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                  </li>
                  <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                    <span className="text-muted">Duration</span>
                    <span className="fw-semibold text-dark text-end">{form.durationMin ? `${form.durationMin} mins` : "-"}</span>
                  </li>
                  <li className="list-group-item px-3 py-2 d-flex justify-content-between align-items-center bg-transparent border-bottom">
                    <span className="text-muted">Meeting Setup</span>
                    <span className="fw-semibold text-dark text-end">{shouldAutoCreateZoom ? "Auto-generated" : "Manual Link"}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Help Card */}
            <div className="card border-0 shadow-sm rounded-4" style={{ backgroundColor: "#fff8e1", borderLeft: "4px solid #ffc107" }}>
              <div className="card-body p-3">
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: "0.9rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#ffc107" viewBox="0 0 16 16">
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                  </svg>
                  Instructor Notes
                </h6>
                <ul className="mb-0 ps-3 text-muted" style={{ fontSize: "0.8rem", lineHeight: "1.6" }}>
                  <li className="mb-1">Enrolled students are notified automatically.</li>
                  <li className="mb-1">Access opens 10 mins prior to start time.</li>
                  <li className="mb-1">Use the <strong>Classroom</strong> tab for student Q&A.</li>
                  <li>Recordings can be added post-session.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}