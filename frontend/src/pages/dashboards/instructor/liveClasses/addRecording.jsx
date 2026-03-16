import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/api";

function AddRecordingLoader({ text = "Saving recording link…" }) {
  return (
    <div className="p-3 border rounded-4 bg-light mb-3">
      <div className="d-flex align-items-center gap-3">
        <div className="spinner-border text-success" role="status" aria-label="Loading" />
        <div>
          <div className="fw-semibold">{text}</div>
          <div className="text-muted small">Updating class recording for students.</div>
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

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h3 className="mb-1 fw-bold">Add Class Recording</h3>
        <div className="text-muted small">
          Save the recording link so students can watch the class later.
        </div>
      </div>

      {error ? <div className="alert alert-danger rounded-4 shadow-sm">{error}</div> : null}
      {saving ? <AddRecordingLoader /> : null}

      {loading ? (
        <div className="p-4 border rounded-4 bg-light">
          <div className="d-flex align-items-center gap-3">
            <div className="spinner-border text-primary" role="status" />
            <div>
              <div className="fw-semibold">Loading class details…</div>
              <div className="text-muted small">Preparing class information.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                {!canAddRecording ? (
                  <div className="alert alert-warning rounded-4 mb-0">
                    Recording cannot be added for this class.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Live Class Title</label>
                      <input className="form-control rounded-3" value={liveClass?.title || ""} disabled />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Course</label>
                      <input className="form-control rounded-3" value={liveClass?.course?.title || ""} disabled />
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Class Time</label>
                        <input
                          className="form-control rounded-3"
                          value={liveClass?.startAt ? new Date(liveClass.startAt).toLocaleString() : "-"}
                          disabled
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Status</label>
                        <input
                          className="form-control rounded-3 text-capitalize"
                          value={liveClass?.status || "-"}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Recording Link</label>
                      <input
                        type="url"
                        className={`form-control rounded-3 ${fieldErrors.recordingLink ? "is-invalid" : ""}`}
                        placeholder="Paste Zoom / Google Drive / YouTube recording link"
                        value={form.recordingLink}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, recordingLink: e.target.value }));
                          if (fieldErrors.recordingLink) {
                            setFieldErrors((prev) => ({ ...prev, recordingLink: "" }));
                          }
                          if (error) setError("");
                        }}
                        disabled={saving}
                      />
                      {fieldErrors.recordingLink ? (
                        <div className="invalid-feedback">{fieldErrors.recordingLink}</div>
                      ) : (
                        <div className="form-text">
                          Add a direct recording URL that students can open later.
                        </div>
                      )}
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Recording Status</label>
                        <select
                          className="form-select rounded-3"
                          value={form.recordingStatus}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, recordingStatus: e.target.value }))
                          }
                          disabled={saving}
                        >
                          <option value="processing">Processing</option>
                          <option value="ready">Ready</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Recording Duration (minutes)</label>
                        <input
                          type="number"
                          min={0}
                          className={`form-control rounded-3 ${fieldErrors.recordingDurationMin ? "is-invalid" : ""}`}
                          value={form.recordingDurationMin}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              recordingDurationMin: e.target.value,
                            }));
                            if (fieldErrors.recordingDurationMin) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                recordingDurationMin: "",
                              }));
                            }
                          }}
                          disabled={saving}
                          placeholder="Optional"
                        />
                        {fieldErrors.recordingDurationMin ? (
                          <div className="invalid-feedback">{fieldErrors.recordingDurationMin}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-2 pt-2">
                      <button
                        className="btn btn-success rounded-pill px-4"
                        type="submit"
                        disabled={saving || !canAddRecording}
                      >
                        {saving ? "Saving..." : "Save Recording"}
                      </button>

                      <button
                        className="btn btn-outline-secondary rounded-pill px-4"
                        type="button"
                        onClick={() => navigate(backPath)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Quick Preview</h5>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Class</div>
                  <div className="fw-semibold">{liveClass?.title || "-"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Course</div>
                  <div className="fw-semibold">{liveClass?.course?.title || "-"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Status</div>
                  <div className="fw-semibold text-capitalize">{liveClass?.status || "-"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Recording Status</div>
                  <div className="fw-semibold text-capitalize">{form.recordingStatus}</div>
                </div>

                <div className="mb-0">
                  <div className="text-muted small mb-1">Recording Link Preview</div>
                  <div className="small text-break">{form.recordingLink || "-"}</div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Helpful Notes</h6>
                <div className="small text-muted mb-2">
                  • Paste a direct URL from Zoom, Google Drive, YouTube, or any allowed storage.
                </div>
                <div className="small text-muted mb-2">
                  • Saving recording also ensures ended class flow remains complete.
                </div>
                <div className="small text-muted mb-0">
                  • You can update the same recording later by saving again.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}