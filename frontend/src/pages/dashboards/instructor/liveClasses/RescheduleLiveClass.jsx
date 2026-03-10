import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/api";

function RescheduleLoader() {
  return (
    <div className="p-3 border rounded-4 bg-light mb-3">
      <div className="d-flex align-items-center gap-3">
        <div className="spinner-border text-warning" role="status" aria-label="Loading" />
        <div>
          <div className="fw-semibold">Updating live class…</div>
          <div className="text-muted small">Saving new class schedule.</div>
        </div>
      </div>
    </div>
  );
}

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${mins}`;
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const isValid = validateForm();
      if (!isValid) return;

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

  const newSchedulePreview = useMemo(() => {
    if (!form.newStartAtLocal) return "-";

    const d = new Date(form.newStartAtLocal);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleString();
  }, [form.newStartAtLocal]);

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h3 className="mb-1 fw-bold">Reschedule Live Class</h3>
        <div className="text-muted small">
          Change the date, time, or duration of a scheduled live session.
        </div>
      </div>

      {error ? <div className="alert alert-danger rounded-4 shadow-sm">{error}</div> : null}
      {submitting ? <RescheduleLoader /> : null}

      {loading ? (
        <div className="p-4 border rounded-4 bg-light">
          <div className="d-flex align-items-center gap-3">
            <div className="spinner-border text-primary" role="status" />
            <div>
              <div className="fw-semibold">Loading class details…</div>
              <div className="text-muted small">Preparing current schedule information.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Live Class Title</label>
                    <input
                      className="form-control rounded-3"
                      value={form.title}
                      disabled
                    />
                    <div className="form-text">This field is read-only for reference.</div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Course</label>
                    <input
                      className="form-control rounded-3"
                      value={form.courseTitle}
                      disabled
                    />
                    <div className="form-text">This class belongs to this course.</div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Current Scheduled Time</label>
                    <input
                      className="form-control rounded-3"
                      value={form.currentStartAt ? new Date(form.currentStartAt).toLocaleString() : "-"}
                      disabled
                    />
                    <div className="form-text">This is the currently saved class time.</div>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-7">
                      <label className="form-label fw-semibold">New Class Date & Time</label>
                      <input
                        type="datetime-local"
                        name="newStartAtLocal"
                        className={`form-control rounded-3 ${fieldErrors.newStartAtLocal ? "is-invalid" : ""}`}
                        value={form.newStartAtLocal}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                      {fieldErrors.newStartAtLocal ? (
                        <div className="invalid-feedback">{fieldErrors.newStartAtLocal}</div>
                      ) : (
                        <div className="form-text">
                          Choose the new future time for the live session.
                        </div>
                      )}
                    </div>

                    <div className="col-md-5">
                      <label className="form-label fw-semibold">Duration (minutes)</label>
                      <input
                        type="number"
                        name="durationMin"
                        min={10}
                        max={600}
                        className={`form-control rounded-3 ${fieldErrors.durationMin ? "is-invalid" : ""}`}
                        value={form.durationMin}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                      {fieldErrors.durationMin ? (
                        <div className="invalid-feedback">{fieldErrors.durationMin}</div>
                      ) : (
                        <div className="form-text">
                          Keep it between 10 and 600 minutes.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 pt-2">
                    <button
                      className="btn btn-warning rounded-pill px-4"
                      type="submit"
                      disabled={submitting || !liveClass || liveClass.status !== "scheduled"}
                    >
                      {submitting ? "Updating..." : "Update Schedule"}
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
                <h5 className="fw-bold mb-3">Schedule Preview</h5>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Class</div>
                  <div className="fw-semibold">{form.title || "-"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Course</div>
                  <div className="fw-semibold">{form.courseTitle || "-"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small mb-1">New Scheduled Time</div>
                  <div className="fw-semibold">{newSchedulePreview}</div>
                </div>

                <div className="mb-0">
                  <div className="text-muted small mb-1">Duration</div>
                  <div className="fw-semibold">
                    {form.durationMin ? `${form.durationMin} min` : "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Helpful Notes</h6>

                <div className="small text-muted mb-2">
                  • Only scheduled classes should be rescheduled.
                </div>
                <div className="small text-muted mb-2">
                  • After rescheduling, students should see the updated class time.
                </div>
                <div className="small text-muted mb-0">
                  • Reminder emails should use the new scheduled time if your backend resets the reminder flag.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}