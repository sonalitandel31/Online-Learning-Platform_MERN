import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/api";

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

function CreateLiveClassLoader({ text = "Creating live class…" }) {
  return (
    <div className="p-3 border rounded-4 bg-light mb-3">
      <div className="d-flex align-items-center gap-3">
        <div className="spinner-grow text-primary" role="status" aria-label="Loading" />
        <div>
          <div className="fw-semibold">{text}</div>
          <div className="text-muted small">Saving schedule and notifying students.</div>
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

  const selectedCourse = useMemo(() => {
    return (Array.isArray(courses) ? courses : []).find(
      (c) => String(c._id) === String(form.courseId)
    );
  }, [courses, form.courseId]);

  const hasApprovedCourses = Array.isArray(courses) && courses.length > 0;

  const isZoomProvider = form.provider === "zoom";
  const shouldAutoCreateZoom = isZoomProvider && form.autoCreateMeeting;

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

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h3 className="mb-1 fw-bold">Create Live Class</h3>
        <div className="text-muted small">
          Schedule a session, attach meeting details, and notify enrolled students.
        </div>
      </div>

      {error ? <div className="alert alert-danger rounded-4 shadow-sm">{error}</div> : null}

      {!loadingCourses && !hasApprovedCourses ? (
        <div className="alert alert-info rounded-4 shadow-sm">
          No approved courses found. Live classes can be created only for approved courses.
        </div>
      ) : null}

      {submitting ? <CreateLiveClassLoader /> : null}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Course</label>
                  <select
                    className={`form-select rounded-3 ${fieldErrors.courseId ? "is-invalid" : ""}`}
                    name="courseId"
                    value={form.courseId}
                    onChange={handleChange}
                    disabled={loadingCourses || submitting || !hasApprovedCourses}
                  >
                    {loadingCourses ? <option>Loading courses…</option> : null}

                    {!loadingCourses && !hasApprovedCourses ? (
                      <option value="">No approved courses found</option>
                    ) : null}

                    {(Array.isArray(courses) ? courses : []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  {fieldErrors.courseId ? (
                    <div className="invalid-feedback">{fieldErrors.courseId}</div>
                  ) : (
                    <div className="form-text">
                      Only approved courses are available for live class scheduling.
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Class Title</label>
                  <input
                    className={`form-control rounded-3 ${fieldErrors.title ? "is-invalid" : ""}`}
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Revision Session"
                    disabled={submitting || !hasApprovedCourses}
                  />
                  {fieldErrors.title ? (
                    <div className="invalid-feedback">{fieldErrors.title}</div>
                  ) : null}
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    className="form-control rounded-3"
                    rows={4}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="What will be covered in this session?"
                    disabled={submitting || !hasApprovedCourses}
                  />
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Provider</label>
                    <select
                      className="form-select rounded-3"
                      name="provider"
                      value={form.provider}
                      onChange={handleChange}
                      disabled={submitting || !hasApprovedCourses}
                    >
                      <option value="zoom">Zoom</option>
                      <option value="webrtc">WebRTC</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Start Time</label>
                    <input
                      type="datetime-local"
                      className={`form-control rounded-3 ${fieldErrors.startAtLocal ? "is-invalid" : ""}`}
                      name="startAtLocal"
                      value={form.startAtLocal}
                      onChange={handleChange}
                      disabled={submitting || !hasApprovedCourses}
                    />
                    {fieldErrors.startAtLocal ? (
                      <div className="invalid-feedback">{fieldErrors.startAtLocal}</div>
                    ) : null}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Duration (minutes)</label>
                    <input
                      type="number"
                      className={`form-control rounded-3 ${fieldErrors.durationMin ? "is-invalid" : ""}`}
                      name="durationMin"
                      value={form.durationMin}
                      onChange={handleChange}
                      min={10}
                      max={600}
                      disabled={submitting || !hasApprovedCourses}
                    />
                    {fieldErrors.durationMin ? (
                      <div className="invalid-feedback">{fieldErrors.durationMin}</div>
                    ) : null}
                  </div>
                </div>

                <div className="form-check mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="autoCreateMeeting"
                    checked={form.autoCreateMeeting}
                    onChange={handleAutoCreateToggle}
                    disabled={
                      submitting ||
                      !hasApprovedCourses ||
                      form.provider !== "zoom"
                    }
                  />
                  <label className="form-check-label" htmlFor="autoCreateMeeting">
                    Auto create Zoom meeting from backend
                  </label>
                  <div className="form-text">
                    Works only for Zoom provider. If enabled, backend creates the Zoom meeting automatically.
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Meeting Link</label>
                  <input
                    className={`form-control rounded-3 ${fieldErrors.meetingLink ? "is-invalid" : ""}`}
                    name="meetingLink"
                    value={form.meetingLink}
                    onChange={handleChange}
                    placeholder={
                      shouldAutoCreateZoom
                        ? "Auto-generated by backend"
                        : "https://zoom.us/j/xxxxxx"
                    }
                    disabled={submitting || !hasApprovedCourses || shouldAutoCreateZoom}
                  />
                  {fieldErrors.meetingLink ? (
                    <div className="invalid-feedback">{fieldErrors.meetingLink}</div>
                  ) : (
                    <div className="form-text">
                      {shouldAutoCreateZoom
                        ? "You do not need to paste a link. It will be generated automatically."
                        : "Paste the direct meeting join link if you are creating the meeting manually."}
                    </div>
                  )}
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Meeting ID</label>
                    <input
                      className="form-control rounded-3"
                      name="meetingId"
                      value={form.meetingId}
                      onChange={handleChange}
                      placeholder={shouldAutoCreateZoom ? "Optional seed value" : "Optional"}
                      disabled={submitting || !hasApprovedCourses || shouldAutoCreateZoom}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Meeting Password</label>
                    <input
                      className="form-control rounded-3"
                      name="meetingPassword"
                      value={form.meetingPassword}
                      onChange={handleChange}
                      placeholder="Optional"
                      disabled={submitting || !hasApprovedCourses}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Room Name</label>
                    <input
                      className="form-control rounded-3"
                      name="roomName"
                      value={form.roomName}
                      onChange={handleChange}
                      placeholder="Optional"
                      disabled={submitting || !hasApprovedCourses || shouldAutoCreateZoom}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Recording Mode</label>
                  <select
                    className="form-select rounded-3"
                    name="recordingMode"
                    value={form.recordingMode}
                    onChange={handleChange}
                    disabled={submitting || !hasApprovedCourses}
                  >
                    <option value="manual">Manual</option>
                    <option value="auto">Auto</option>
                  </select>
                  <div className="form-text">
                    Auto is useful when provider webhook sync is enabled later.
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 pt-2">
                  <button
                    className="btn btn-primary rounded-pill px-4"
                    type="submit"
                    disabled={submitting || !hasApprovedCourses}
                  >
                    {submitting ? "Creating..." : "Create Live Class"}
                  </button>

                  <button
                    className="btn btn-outline-secondary rounded-pill px-4"
                    type="button"
                    onClick={() => navigate("/instructor-dashboard/live-classes")}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Quick Preview</h5>

              <div className="mb-3">
                <div className="text-muted small mb-1">Selected Course</div>
                <div className="fw-semibold">{selectedCourse?.title || "-"}</div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Class Title</div>
                <div className="fw-semibold">{form.title.trim() || "-"}</div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Provider</div>
                <div className="fw-semibold text-uppercase">{form.provider || "-"}</div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Meeting Setup</div>
                <div className="fw-semibold">
                  {shouldAutoCreateZoom ? "Auto Zoom creation" : "Manual meeting link"}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Start Time</div>
                <div className="fw-semibold">
                  {form.startAtLocal ? new Date(form.startAtLocal).toLocaleString() : "-"}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Duration</div>
                <div className="fw-semibold">
                  {form.durationMin ? `${form.durationMin} min` : "-"}
                </div>
              </div>

              <div className="mb-0">
                <div className="text-muted small mb-1">Recording Mode</div>
                <div className="fw-semibold text-capitalize">{form.recordingMode}</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Helpful Notes</h6>
              <div className="small text-muted mb-2">
                • Students can join when the class becomes live or enters the early join window.
              </div>
              <div className="small text-muted mb-2">
                • Reminder emails are sent automatically before the scheduled time.
              </div>
              <div className="small text-muted mb-2">
                • Classroom page is used for live chat and Q&amp;A.
              </div>
              <div className="small text-muted mb-0">
                • After class ends, recording can be added manually or linked later by provider sync.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}