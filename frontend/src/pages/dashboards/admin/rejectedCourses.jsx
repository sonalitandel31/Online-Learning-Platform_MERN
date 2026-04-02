import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Modal } from "react-bootstrap";

export default function RejectedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Content Modal States
  const [showContent, setShowContent] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentCourse, setContentCourse] = useState(null);

  useEffect(() => {
    api
      .get("/admin/courses/rejected")
      .then((res) => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openContentModal = async (courseId) => {
    try {
      setShowContent(true);
      setContentLoading(true);
      setContentError("");
      setContentCourse(null);

      const token = localStorage.getItem("token");
      const res = await api.get(`/admin/courses/${courseId}/content`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContentCourse(res.data?.course || res.data || null);
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

  const styles = {
    container: {
      padding: "1.5rem",
      backgroundColor: "#f8f9fc",
      minHeight: "100vh",
      fontFamily: "'Segoe UI', sans-serif",
    },
    heading: {
      color: "#6f42c1",
      fontWeight: 700,
      textAlign: "center",
      marginBottom: "1.5rem",
    },
    cardsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "1.5rem",
    },
    card: {
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      overflow: "hidden",
      cursor: "default",
      transition: "all 0.25s ease",
      display: "flex",
      flexDirection: "column",
    },
    cardHover: {
      transform: "translateY(-4px)",
      boxShadow: "0 8px 20px rgba(220, 53, 69, 0.15)", 
    },
    thumb: { width: "100%", height: "140px", objectFit: "cover" },
    body: { padding: "16px", flexGrow: 1 },
    title: {
      color: "#2d3748",
      fontWeight: 700,
      fontSize: "1.1rem",
      marginBottom: "8px",
      lineHeight: "1.3",
    },
    text: { fontSize: "0.85rem", color: "#4a5568", marginBottom: "4px" },
    label: { fontWeight: 600, color: "#6f42c1", marginRight: "6px" },
    
    details: {
      marginBottom: "8px",
      fontSize: "0.85rem",
      backgroundColor: "#f8f9fa",
      padding: "8px",
      borderRadius: "6px",
    },
    summary: { cursor: "pointer", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" },
    ul: {
      marginTop: "6px",
      paddingLeft: "20px",
      maxHeight: "60px",
      overflowY: "auto",
      color: "#718096",
      marginBottom: 0,
    },
    
    rejectBox: {
      margin: "12px 0",
      background: "#fff5f5",
      border: "1px solid #fed7d7",
      borderRadius: "8px",
      padding: "12px",
    },
    rejectHeader: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "8px",
    },
    rejectTitle: {
      fontSize: "0.9rem",
      fontWeight: 700,
      color: "#c53030",
    },
    rejectLine: {
      fontSize: "0.85rem",
      color: "#9b2c2c",
      marginBottom: "6px",
      lineHeight: 1.4,
    },
    rejectMuted: {
      fontSize: "0.85rem",
      color: "#9b2c2c",
      opacity: 0.9,
      lineHeight: 1.4,
      backgroundColor: "rgba(254, 215, 215, 0.3)", 
      padding: "6px",
      borderRadius: "4px",
    },
    
    footer: {
      backgroundColor: "#f8f9fa",
      borderTop: "1px solid #edf2f7",
      padding: "10px 16px",
      fontSize: "12px",
      color: "#a0aec0",
      textAlign: "right",
    },
    viewBtn: { width: "100%", margin: "12px 0", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", backgroundColor: "rgba(111, 66, 193, 0.1)", color: "#6f42c1", border: "1px solid rgba(111, 66, 193, 0.2)", padding: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", transition: "all 0.2s ease-in-out", cursor: "pointer" },
    viewBtnHover: { backgroundColor: "rgba(111, 66, 193, 0.2)" },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Rejected Courses</h2>

      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "70vh",
            color: "#6f42c1",
          }}
        >
          <div
            style={{
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #6f42c1",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              animation: "spin 1s linear infinite",
              marginBottom: "20px",
            }}
          />
          <p>Loading...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : courses.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6f42c1", fontSize: "1.1rem", marginTop: "2rem" }}>
          ✅ No rejected courses!
        </p>
      ) : (
        <div style={styles.cardsContainer}>
          {courses.map((c) => {
            const rejectionReason = c?.review?.rejectionReason || "";
            const reviewNote = c?.review?.reviewNote || "";

            const hasRejectInfo =
              String(rejectionReason || "").trim() ||
              String(reviewNote || "").trim();

            return (
              <div
                key={c._id}
                style={styles.card}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, styles.cardHover)
                }
                onMouseLeave={(e) =>
                  Object.assign(e.currentTarget.style, styles.card)
                }
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
                      fontWeight: 500,
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

                  {hasRejectInfo ? (
                    <div style={styles.rejectBox}>
                      <div style={styles.rejectHeader}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c53030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span style={styles.rejectTitle}>Rejection Details</span>
                      </div>
                      
                      {rejectionReason ? (
                        <div style={styles.rejectLine}>
                          <span style={{ fontWeight: 700 }}>Reason:</span>{" "}
                          {rejectionReason}
                        </div>
                      ) : null}
                      {reviewNote ? (
                        <div style={styles.rejectMuted}>
                          <span style={{ fontWeight: 700 }}>Admin Note:</span>{" "}
                          {reviewNote}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ ...styles.rejectBox, borderColor: "#e2e8f0", background: "#f8fafc" }}>
                      <div style={styles.rejectHeader}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span style={{ ...styles.rejectTitle, color: "#475569" }}>
                          Status: Rejected
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        No specific reason or note was provided during rejection.
                      </div>
                    </div>
                  )}

                  <details style={{ ...styles.details, marginTop: "12px" }}>
                    <summary style={styles.summary}>
                      Lessons ({c.lessons?.length || 0})
                    </summary>
                    <ul style={styles.ul}>
                      {c.lessons?.slice(0, 5).map((l, index) => (
                        <li key={l._id || `lesson-${index}`}>
                          {l.title} ({l.contentType})
                        </li>
                      ))}
                    </ul>
                  </details>

                  <details style={styles.details}>
                    <summary style={styles.summary}>
                      Exams ({c.exams?.length || 0})
                    </summary>
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

                </div>

                <div style={styles.footer}>
                  Rejected on:{" "}
                  {new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-GB")}
                </div>
              </div>
            );
          })}
        </div>
      )}

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