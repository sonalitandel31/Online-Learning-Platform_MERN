import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Button, Modal, Form } from "react-bootstrap";

export default function PendingCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // settings
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [noteRequired, setNoteRequired] = useState(true);

  // reject modal
  const [showReject, setShowReject] = useState(false);
  const [rejectCourseId, setRejectCourseId] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [savingReject, setSavingReject] = useState(false);
  const [rejectError, setRejectError] = useState("");

  const [showContent, setShowContent] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentCourse, setContentCourse] = useState(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    // pending courses
    api
      .get("/admin/courses/pending")
      .then((res) => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // system settings (for rejection reasons)
    api
      .get("/system-settings/admin")
      .then((res) => {
        const settings = res.data;
        const reasons = settings?.contentApproval?.rejectionReasons || [];
        setRejectionReasons(reasons);
        setNoteRequired(settings?.contentApproval?.reviewNoteRequiredOnReject ?? true);
        // default dropdown selection
        if (reasons.length > 0) setSelectedReason(reasons[0]);
      })
      .catch((err) => {
        console.error(err);
        // keep safe defaults
        setRejectionReasons([]);
        setNoteRequired(true);
      });
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/admin/courses/${id}/approve`);
      setCourses((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openContentModal = async (courseId) => {
    try {
      setShowContent(true);
      setContentLoading(true);
      setContentError("");
      setContentCourse(null);

      const res = await api.get(`/admin/courses/${courseId}/content`);
      setContentCourse(res.data?.course || null);
    } catch (err) {
      console.error(err);
      setContentError(err?.response?.data?.message || "Failed to load course content");
    } finally {
      setContentLoading(false);
    }
  };

  const closeContentModal = () => {
    setShowContent(false);
    setContentCourse(null);
    setContentError("");
  };

  // open reject modal
  const openRejectModal = (id) => {
    setRejectCourseId(id);
    setReviewNote("");
    setRejectError("");

    // set first reason by default if not selected
    if (!selectedReason && rejectionReasons.length > 0) {
      setSelectedReason(rejectionReasons[0]);
    }
    setShowReject(true);
  };

  const closeRejectModal = () => {
    if (savingReject) return;
    setShowReject(false);
    setRejectCourseId(null);
    setRejectError("");
  };

  const submitReject = async () => {
    setRejectError("");

    if (!selectedReason) {
      setRejectError("Please select a rejection reason.");
      return;
    }
    if (noteRequired && !String(reviewNote || "").trim()) {
      setRejectError("Review note is required.");
      return;
    }

    try {
      setSavingReject(true);
      await api.post(`/admin/courses/${rejectCourseId}/reject`, {
        rejectionReason: selectedReason,
        reviewNote: reviewNote,
      });

      setCourses((prev) => prev.filter((c) => c._id !== rejectCourseId));
      setShowReject(false);
      setRejectCourseId(null);
    } catch (err) {
      console.error(err);
      setRejectError(err?.response?.data?.error || err?.response?.data?.message || "Reject failed");
    } finally {
      setSavingReject(false);
    }
  };

  const styles = {
    container: { padding: "1.5rem", backgroundColor: "#f8f9fc", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" },
    heading: { color: "#6f42c1", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" },
    cardsContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" },
    card: { background: "#fff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", overflow: "hidden", cursor: "default", transition: "all 0.25s ease" },
    cardHover: { transform: "translateY(-4px)", boxShadow: "0 8px 20px rgba(111, 66, 193, 0.15)" },
    thumb: { width: "100%", height: "140px", objectFit: "cover" },
    body: { padding: "16px" },
    title: { color: "#2d3748", fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px", lineHeight: "1.3" },
    text: { fontSize: "0.85rem", color: "#4a5568", marginBottom: "4px" },
    label: { fontWeight: 600, color: "#6f42c1", marginRight: "6px" },
    btn: { border: "none", fontWeight: 600, color: "#fff", width: "48%", padding: "8px 0", borderRadius: "8px", fontSize: "0.85rem" },
    footer: { backgroundColor: "#f8f9fa", borderTop: "1px solid #edf2f7", padding: "10px 16px", fontSize: "12px", color: "#a0aec0", textAlign: "right" },
    details: { marginBottom: "8px", fontSize: "0.85rem", backgroundColor: "#f8f9fa", padding: "8px", borderRadius: "6px" },
    summary: { cursor: "pointer", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" },
    ul: { marginTop: "6px", paddingLeft: "20px", maxHeight: "60px", overflowY: "auto", color: "#718096", marginBottom: 0 },
    viewBtn: { width: "100%",  margin: "12px 0",  borderRadius: "8px",  fontWeight: 600,  fontSize: "0.9rem", backgroundColor: "rgba(111, 66, 193, 0.1)",  color: "#6f42c1", border: "1px solid rgba(111, 66, 193, 0.2)", padding: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", transition: "all 0.2s ease-in-out"},
    viewBtnHover: { backgroundColor: "rgba(111, 66, 193, 0.2)"},
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Pending Courses</h2>

      {/* ✅ Added Skeleton Styles */}
      <style>{`
        .skeleton {
          background: #f1f5f9;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skel-img { height: 140px; width: 100%; }
        .skel-title { height: 22px; width: 80%; margin-bottom: 12px; border-radius: 4px; }
        .skel-line { height: 14px; width: 90%; margin-bottom: 8px; border-radius: 4px; }
        .skel-details { height: 32px; width: 100%; margin-bottom: 8px; border-radius: 6px; }
        .skel-view-btn { height: 42px; width: 100%; margin: 12px 0; border-radius: 8px; }
        .skel-action-btn { height: 36px; width: 48%; border-radius: 8px; }
        .skel-footer { height: 38px; width: 100%; border-top: 1px solid #edf2f7; }
      `}</style>

      {loading ? (
        <div style={styles.cardsContainer}>
          {/* ✅ Render 8 Skeleton Cards */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={styles.card}>
              <div className="skeleton skel-img"></div>
              <div style={styles.body}>
                <div className="skeleton skel-title"></div>
                <div className="skeleton skel-line"></div>
                <div className="skeleton skel-line"></div>
                <div className="skeleton skel-line"></div>
                <div className="skeleton skel-line" style={{ width: '50%' }}></div>
                <div className="skeleton skel-line" style={{ width: '40%', marginTop: '6px' }}></div>

                <div className="skeleton skel-details" style={{ marginTop: '12px' }}></div>
                <div className="skeleton skel-details"></div>

                <div className="skeleton skel-view-btn"></div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px" }}>
                  <div className="skeleton skel-action-btn"></div>
                  <div className="skeleton skel-action-btn"></div>
                </div>
              </div>
              <div className="skeleton skel-footer"></div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6f42c1", fontSize: "1.1rem", marginTop: "2rem" }}>🎉 No pending courses!</p>
      ) : (
        <div style={styles.cardsContainer}>
          {courses.map((c) => (
            <div
              key={c._id}
              style={styles.card}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.card)}
            >
              {c.thumbnail ? (
                <img
                  src={
                    c.thumbnail.startsWith("http")
                      ? c.thumbnail
                      : `${import.meta.env.VITE_BASE_URL?.replace(/\/$/, "")}/${c.thumbnail?.replace(/^\//, "")}`
                  }
                  alt={c.title}
                  style={styles.thumb}
                />
              ) : (
                <div
                  style={{
                    ...styles.thumb,
                    backgroundColor: "#edf2f7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#a0aec0",
                    fontSize: "13px",
                    fontWeight: 500
                  }}
                >
                  No Thumbnail Provided
                </div>
              )}

              <div style={styles.body}>
                <div style={styles.title}>{c.title}</div>
                <div style={styles.text}>
                  <span style={styles.label}>Instructor:</span>
                  {c.instructor?.name || "N/A"}
                </div>
                <div style={styles.text}>
                  <span style={styles.label}>Category:</span>
                  {c.category?.name || "N/A"}
                </div>
                <div style={styles.text}>
                  <span style={styles.label}>Level:</span>
                  {c.level || "—"}
                </div>
                <div style={styles.text}>
                  <span style={styles.label}>Price:</span> ₹{c.price ?? 0}
                </div>

                {/* ✅ NEW MODULE 7: B2B Visibility Badge for Admin */}
                <div style={{ ...styles.text, marginTop: "6px" }}>
                  <span style={styles.label}>Visibility:</span>{" "}
                  {c.isGlobal === false ? (
                    <span style={{ color: "#b45309", backgroundColor: "#fffbeb", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "0.8rem", border: "1px solid #fde68a" }}>
                      Private (B2B)
                    </span>
                  ) : (
                    <span style={{ color: "#047857", backgroundColor: "#ecfdf5", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "0.8rem", border: "1px solid #a7f3d0" }}>
                      Global (B2C)
                    </span>
                  )}
                </div>
                {/* ===================================================== */}

                <details style={{ ...styles.details, marginTop: "12px" }}>
                  <summary style={styles.summary}>Lessons ({c.lessons?.length || 0})</summary>
                  <ul style={styles.ul}>
                    {c.lessons?.slice(0, 5).map((l, index) => (
                      <li key={l._id || `lesson-${index}`}>
                        {l.title} ({l.contentType})
                      </li>
                    ))}
                  </ul>
                </details>

                <details style={styles.details}>
                  <summary style={styles.summary}>Exams ({c.exams?.length || 0})</summary>
                  <ul style={styles.ul}>
                    {c.exams?.slice(0, 5).map((e, index) => (
                      <li key={e._id || `exam-${index}`}>
                        {e.title} ({e.duration} min)
                      </li>
                    ))}
                  </ul>
                </details>

                <button
                  style={styles.viewBtn}
                  onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.viewBtnHover)}
                  onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.viewBtn)}
                  onClick={() => openContentModal(c._id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                  View Full Content
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px" }}>
                  <Button style={{ ...styles.btn, backgroundColor: "#28a745" }} onClick={() => approve(c._id)}>
                    Approve
                  </Button>
                  <Button style={{ ...styles.btn, backgroundColor: "#dc3545" }} onClick={() => openRejectModal(c._id)}>
                    Reject
                  </Button>
                </div>
              </div>

              <div style={styles.footer}>Submitted: {new Date(c.createdAt).toLocaleDateString("en-GB")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal show={showReject} onHide={closeRejectModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Course</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {rejectionReasons.length === 0 ? (
            <div style={{ color: "#dc3545", fontSize: "0.9rem", padding: "10px", backgroundColor: "#fff5f5", borderRadius: "6px" }}>
              No rejection reasons found in System Settings. Add reasons first.
            </div>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: 600 }}>Rejection Reason</Form.Label>
                <Form.Select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
                  {rejectionReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label style={{ fontWeight: 600 }}>
                  Review Note {noteRequired ? <span style={{ color: "#dc3545" }}>*</span> : "(optional)"}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Explain what the instructor needs to fix..."
                  style={{ resize: "none" }}
                />
              </Form.Group>

              {rejectError ? <div style={{ color: "#dc3545", marginTop: "8px", fontSize: "0.9rem" }}>{rejectError}</div> : null}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={closeRejectModal} disabled={savingReject}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={submitReject}
            disabled={savingReject || rejectionReasons.length === 0}
          >
            {savingReject ? "Rejecting..." : "Reject Course"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Content Modal */}
      <Modal show={showContent} onHide={closeContentModal} centered size="lg">
        <Modal.Header closeButton style={{ borderBottom: "1px solid #edf2f7" }}>
          <Modal.Title style={{ color: "#2d3748", fontWeight: 700 }}>Course Content Review</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: "#fafbfc", padding: "1.5rem", maxHeight: "75vh", overflowY: "auto" }}>
          {contentLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6f42c1" }}>Loading course content...</div>
          ) : contentError ? (
            <div style={{ color: "#dc3545", padding: "20px", textAlign: "center" }}>{contentError}</div>
          ) : !contentCourse ? (
            <div style={{ color: "#6b7280", padding: "20px", textAlign: "center" }}>No content found.</div>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "#6f42c1", marginBottom: "4px" }}>{contentCourse.title}</div>
              <div style={{ color: "#718096", fontSize: "0.95rem", marginBottom: "20px" }}>
                <strong>Instructor:</strong> {contentCourse.instructor?.name || "N/A"} &nbsp;|&nbsp; 
                <strong>Category:</strong> {contentCourse.category?.name || "N/A"} &nbsp;|&nbsp; 
                <strong>Level:</strong> {contentCourse.level || "—"}
              </div>

              {/* Lessons Section */}
              <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "12px", color: "#2d3748" }}>
                Lessons ({contentCourse.lessons?.length || 0})
              </div>

              {(contentCourse.lessons || []).length === 0 ? (
                <div style={{ color: "#a0aec0", fontStyle: "italic", marginBottom: "20px" }}>No lessons attached.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                  {contentCourse.lessons.map((l, idx) => {
                    const type = (l.contentType || "").toLowerCase();
                    const base = import.meta.env.VITE_BASE_URL?.replace(/\/$/, "") || "";
                    const src = l.fileUrl
                      ? (l.fileUrl.startsWith("http") ? l.fileUrl : `${base}/${String(l.fileUrl).replace(/^\//, "")}`)
                      : "";

                    const durSec = l.duration || 0;
                    const m = Math.floor(durSec / 60);
                    const s = durSec % 60;
                    const timeString = m > 0 ? `${m}m ${s}s` : `${s}s`;

                    return (
                      <div key={l._id || `lesson-${idx}`} style={{ backgroundColor: "#fff", border: "1px solid #edf2f7", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#2d3748", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                          <span>{idx + 1}. {l.title}</span>
                          <span style={{ color: "#6f42c1", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#f3e8ff", padding: "2px 8px", borderRadius: "12px" }}>
                            {l.contentType}
                          </span>
                          <span style={{ color: "#475569", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "12px" }}>
                            ⏱ {durSec > 0 ? timeString : "0s"}
                          </span>
                        </div>

                        {type === "text" || (!src && l.description) ? (
                          <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", color: "#4a5568", backgroundColor: "#f8f9fa", padding: "12px", borderRadius: "8px" }}>
                            {l.description || "No text content provided."}
                          </div>
                        ) : null}

                        {type === "video" && src ? (
                          <div style={{ marginTop: "14px" }}>
                            <video controls style={{ width: "100%", borderRadius: "8px", border: "1px solid #edf2f7", backgroundColor: "#000" }} src={src} />
                          </div>
                        ) : null}

                        {type === "pdf" && src ? (
                          <div style={{ marginTop: "14px" }}>
                            <iframe
                              title={`pdf-${l._id || idx}`}
                              src={src}
                              style={{ width: "100%", height: "480px", border: "1px solid #edf2f7", borderRadius: "8px" }}
                            />
                          </div>
                        ) : null}

                        {!((type === "text" || (!src && l.description)) || (type === "video" && src) || (type === "pdf" && src)) ? (
                          <div style={{ marginTop: "12px", color: "#a0aec0", fontStyle: "italic" }}>
                            Content not available or format not supported.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Exams Section */}
              <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "12px", color: "#2d3748" }}>
                Exams ({contentCourse.exams?.length || 0})
              </div>

              {(contentCourse.exams || []).length === 0 ? (
                <div style={{ color: "#a0aec0", fontStyle: "italic" }}>No exams attached.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {contentCourse.exams.map((ex, exIdx) => (
                    <div key={ex._id || `exam-${exIdx}`} style={{ backgroundColor: "#fff", border: "1px solid #edf2f7", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#2d3748", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>{exIdx + 1}. {ex.title}</span>
                        <span style={{ color: "#28a745", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#e6f4ea", padding: "2px 8px", borderRadius: "12px" }}>
                          {ex.duration} min
                        </span>
                        <span style={{ color: "#6f42c1", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#eef2ff", padding: "2px 8px", borderRadius: "12px" }}>
                          {(ex.questions || []).length} Qs
                        </span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px", paddingBottom: "12px", borderBottom: "1px dashed #e2e8f0" }}>
                        <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                          Pass: {ex.settings?.passingScore ?? 60}%
                        </span>
                        <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                          Negative Marking: {ex.settings?.negativeMarking ?? 0}
                        </span>
                        <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                          Attempts: {ex.settings?.maxAttempts ?? 3}
                        </span>
                        <span style={{ fontSize: "0.75rem", background: "#fff5f5", border: "1px solid #fed7d7", padding: "3px 8px", borderRadius: "6px", color: "#991b1b", fontWeight: "700" }}>
                          Tab Limit: {ex.proctoring?.tabSwitchLimit ?? 3}
                        </span>
                        
                        {ex.proctoring?.webcamRequired && (
                          <span style={{ fontSize: "0.75rem", background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "6px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                            📸 Webcam Req.
                          </span>
                        )}
                        
                        {ex.proctoring?.fullscreenRequired && (
                          <span style={{ fontSize: "0.75rem", background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "6px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                            🖥️ Fullscreen Req.
                          </span>
                        )}
                      </div>

                      {(ex.questions || []).length === 0 ? (
                        <div style={{ color: "#a0aec0", fontStyle: "italic", marginTop: "10px" }}>No questions provided.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                          {ex.questions.map((q, qIdx) => (
                            <div key={q._id || `q-${qIdx}`} style={{ padding: "12px", borderRadius: "8px", background: "#f8f9fa", border: "1px solid #edf2f7" }}>
                              <div style={{ fontWeight: 600, color: "#2d3748", marginBottom: "8px" }}>
                                Q{qIdx + 1}. {q.questionText}
                              </div>

                              <ul style={{ margin: 0, paddingLeft: "24px", color: "#4a5568" }}>
                                {(q.options || []).map((opt, oIdx) => {
                                  const isCorrect = opt === q.correctAnswer;
                                  return (
                                    <li
                                      key={`${qIdx}-opt-${oIdx}`}
                                      style={{
                                        marginBottom: "6px",
                                        fontWeight: isCorrect ? 700 : 400,
                                        color: isCorrect ? "#15803d" : "inherit",
                                      }}
                                    >
                                      {opt} {isCorrect ? "✅" : ""}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>

    </div>
  );
}