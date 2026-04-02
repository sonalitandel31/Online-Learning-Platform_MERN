import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Modal } from "react-bootstrap"; // ✅ Added import

export default function AllCourses() {
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // ✅ Added Content Modal States
  const [showContent, setShowContent] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentCourse, setContentCourse] = useState(null);

  useEffect(() => {
    api
      .get("/admin/courses")
      .then((res) => {
        setCourses(res.data);
        setFiltered(res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    let filteredList = courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor?.name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || c.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        c.category?.name === categoryFilter ||
        c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    setFiltered(filteredList);
  }, [search, statusFilter, categoryFilter, courses]);

  const categories = [
    ...new Set(courses.map((c) => c.category?.name).filter(Boolean)),
  ];

  // Helper for Status Badge Color
  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "#28a745";
      case "pendingApproval": return "#ffc107";
      case "rejected": return "#dc3545";
      default: return "#6c757d";
    }
  };

  // ✅ Added Content Modal Functions
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

  return (
    <div className="admin-container">
      <style>{`
        .admin-container {
          padding: 20px;
          background-color: #f8f9fc;
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .header-title {
          color: #6f42c1;
          text-align: center;
          margin-bottom: 30px;
          font-weight: 700;
          font-size: 2rem;
        }
        .filter-section {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }
        .input-style {
          padding: 10px 15px;
          border-radius: 8px;
          border: 1px solid #ddd;
          outline: none;
          min-width: 200px;
          flex: 1;
          max-width: 300px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          padding: 10px;
        }
        .course-card {
          background-color: #fff;
          border-radius: 15px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .course-card:hover {
          transform: translateY(-8px);
        }
        .card-img {
          width: 100%;
          height: 160px;
          object-fit: cover;
        }
        .no-thumb {
          height: 160px;
          background: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #adb5bd;
        }
        .card-body {
          padding: 15px;
          flex-grow: 1;
        }
        .badge {
          padding: 4px 8px;
          border-radius: 5px;
          color: white;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: bold;
        }
        .footer-date {
          background-color: #fcfcfc;
          padding: 10px 15px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #888;
          text-align: right;
        }
        
        /* ✅ Added styles for View Button */
        .view-btn {
          width: 100%;
          margin: 12px 0;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          background-color: rgba(111, 66, 193, 0.1);
          color: #6f42c1;
          border: 1px solid rgba(111, 66, 193, 0.2);
          padding: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
        }
        .view-btn:hover {
          background-color: rgba(111, 66, 193, 0.2);
        }

        /* Mobile Adjustments */
        @media (max-width: 600px) {
          .header-title { font-size: 1.5rem; }
          .input-style { max-width: 100%; min-width: 100%; }
          .admin-container { padding: 10px; }
        }
      `}</style>

      <h2 className="header-title">Course Management</h2>

      <div className="filter-section">
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-style"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-style"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pendingApproval">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-style"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid-container">
        {filtered.map((course) => (
          <div key={course._id} className="course-card">
            {course.thumbnail ? (
              <img
                src={course.thumbnail.startsWith("http") ? course.thumbnail : `${import.meta.env.VITE_BASE_URL}${course.thumbnail}`}
                alt={course.title}
                className="card-img"
              />
            ) : (
              <div className="no-thumb">No Thumbnail Available</div>
            )}

            <div className="card-body">
              <h5 style={{ color: "#333", margin: "0 0 10px 0", fontSize: "1.1rem" }}>{course.title}</h5>

              <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.8" }}>
                <div><strong>Instructor:</strong> {course.instructor?.name || "N/A"}</div>
                <div><strong>Category:</strong> {course.category?.name || "N/A"}</div>
                <div><strong>Level:</strong> {course.level}</div>

                {/* ===== NEW MODULE 7 UPDATE: B2B Visibility Badge ===== */}
                <div style={{ marginTop: "4px" }}>
                  <strong>Visibility:</strong>{" "}
                  {course.isGlobal === false ? (
                    <span style={{ backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" }}>
                      🏢 Private (B2B)
                    </span>
                  ) : (
                    <span style={{ backgroundColor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" }}>
                      🌍 Global (B2C)
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '10px' }}>
                  <span className="badge" style={{ backgroundColor: getStatusColor(course.status) }}>
                    {course.status}
                  </span>
                  <span style={{ float: 'right', fontWeight: 'bold', color: '#6f42c1', fontSize: '15px' }}>
                    ₹{course.price}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "15px" }}>
                <details style={{ marginBottom: "8px", fontSize: "13px" }}>
                  <summary style={{ cursor: "pointer", color: "#6f42c1", fontWeight: "600" }}>
                    Lessons ({course.lessons?.length || 0})
                  </summary>
                  <ul style={{ paddingLeft: "20px", marginTop: "5px", color: "#555" }}>
                    {course.lessons?.map((l) => (
                      <li key={l._id}>{l.title}</li>
                    ))}
                  </ul>
                </details>

                <details style={{ fontSize: "13px" }}>
                  <summary style={{ cursor: "pointer", color: "#6f42c1", fontWeight: "600" }}>
                    Exams ({course.exams?.length || 0})
                  </summary>
                  <ul style={{ paddingLeft: "20px", marginTop: "5px", color: "#555" }}>
                    {course.exams?.map((e) => (
                      <li key={e._id}>{e.title}</li>
                    ))}
                  </ul>
                </details>
              </div>

              {/* ✅ Added View Content Button */}
              <button
                className="view-btn"
                onClick={() => openContentModal(course._id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                View Full Content
              </button>

            </div>

            <div className="footer-date">
              Published: {new Date(course.createdAt).toLocaleDateString("en-GB")}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>
          <h4>No courses found matching your criteria.</h4>
        </div>
      )}

      {/* ✅ Added Content Modal */}
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