import { useEffect, useState } from "react";
import api from "../../../api/api";

function PendingApprovals() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]); // ✅ NEW MODULE 7: Companies state
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "",
    price: "",
    thumbnail: "",
    isGlobal: true, // ✅ NEW MODULE 7
    allowedCompanies: [], // ✅ NEW MODULE 7
  });

  const [showContent, setShowContent] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentCourse, setContentCourse] = useState(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  // --- STYLING CONSTANTS ---
  const colors = {
    primary: "#6d28d9", // Deep Purple
    warning: "#f59e0b", // Amber
    bg: "#f8fafc",
    cardBg: "#ffffff",
    text: "#1e293b",
    border: "#e2e8f0"
  };

  const fetchPending = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await api.get("/instructor/courses?status=pendingApproval", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch pending courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();

    const fetchCategories = async () => {
      try {
        const res = await api.get("/courses/categories");
        setCategories(Array.isArray(res.data) ? res.data : res.data.categories || []);
      } catch (err) {
        console.error(err);
      }
    };

    // ✅ NEW MODULE 7: Fetch Companies
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/companies/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCategories();
    fetchCompanies();
  }, []);

  const openEditModal = (course) => {
    setEditingCourse(course);
    setForm({
      title: course.title || "",
      description: course.description || "",
      category: course.category?._id || course.category || "",
      level: course.level || "",
      price: course.price || "",
      thumbnail: course.thumbnail || "",
      // ✅ NEW MODULE 7: Bind B2B Data
      isGlobal: course.isGlobal !== false,
      allowedCompanies: course.allowedCompanies?.length > 0
        ? [typeof course.allowedCompanies[0] === 'object' ? course.allowedCompanies[0]._id : course.allowedCompanies[0]]
        : []
    });
    setModalOpen(true);
    setError("");
    setSuccessMsg("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("thumbnail", file);

    try {
      setUploading(true);
      const res = await api.post("/instructor/course/upload-thumbnail", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setForm((prev) => ({ ...prev, thumbnail: res.data.fileUrl }));
    } catch (err) {
      setError("Thumbnail upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      // ✅ NEW MODULE 7: Payload construction
      const payload = {
        ...form,
        allowedCompanies: form.isGlobal ? [] : form.allowedCompanies
      };

      const res = await api.put(`/instructor/course/${editingCourse._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses((prev) =>
        prev.map((c) => (c._id === editingCourse._id ? res.data.course : c))
      );
      setSuccessMsg("Course updated successfully!");
      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update course");
    } finally {
      setSubmitting(false);
    }
  };

  const openContentModal = async (courseId) => {
    try {
      setShowContent(true);
      setContentLoading(true);
      setContentError("");
      setContentCourse(null);

      const token = localStorage.getItem("token");
      const res = await api.get(`/instructor/course/${courseId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  if (loading) {
    return (
      <div style={{ padding: "30px", background: colors.bg, minHeight: "100vh" }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
          .skeleton {
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            background-color: #cbd5e1;
            border-radius: 8px;
          }
        `}</style>

        <div style={{ marginBottom: "30px" }}>
          <div className="skeleton" style={{ height: "36px", width: "250px", marginBottom: "10px" }}></div>
          <div className="skeleton" style={{ height: "20px", width: "350px" }}></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column" }}>
              {/* Image Skeleton */}
              <div className="skeleton" style={{ width: "100%", height: "160px", borderRadius: "0" }}></div>

              {/* Body Skeleton */}
              <div style={{ padding: "20px", flexGrow: 1 }}>
                <div className="skeleton" style={{ height: "24px", width: "80%", marginBottom: "15px" }}></div>
                <div className="skeleton" style={{ height: "16px", width: "60%", marginBottom: "8px" }}></div>
                <div className="skeleton" style={{ height: "16px", width: "45%", marginBottom: "8px" }}></div>
                <div className="skeleton" style={{ height: "16px", width: "30%", marginBottom: "15px" }}></div>
                <div className="skeleton" style={{ height: "22px", width: "35%", borderRadius: "4px" }}></div>
              </div>

              {/* View Content Button Skeleton */}
              <div style={{ padding: "0 20px 15px 20px" }}>
                <div className="skeleton" style={{ height: "40px", width: "100%", borderRadius: "10px" }}></div>
              </div>

              {/* Footer Skeleton */}
              <div style={{ padding: "15px 20px", background: "#f8fafc", borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton" style={{ height: "16px", width: "40%" }}></div>
                <div className="skeleton" style={{ height: "34px", width: "110px", borderRadius: "8px" }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", background: colors.bg, minHeight: "100vh" }}>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ color: colors.primary, fontWeight: "800", margin: 0 }}>Pending Approvals</h2>
        <p className="text-muted">Courses currently under review by administration.</p>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", marginBottom: "20px", border: "1px solid #f87171" }}>
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", background: "#fff", borderRadius: "16px", border: `1px dashed ${colors.border}` }}>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>No courses awaiting approval.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
          {courses.map((course) => (
            <div key={course._id} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative" }}>
                <img
                  src={course.thumbnail ? `${BASE_URL}${course.thumbnail}` : "https://via.placeholder.com/300x160"}
                  alt={course.title}
                  style={{ width: "100%", height: "160px", objectFit: "cover" }}
                />
                <span style={{ position: "absolute", top: "10px", right: "10px", background: colors.warning, color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700" }}>
                  Under Review
                </span>
              </div>

              <div style={{ padding: "20px", flexGrow: 1 }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "10px", color: colors.text }}>{course.title}</h3>
                <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "15px" }}>
                  <div style={{ marginBottom: "5px" }}><strong>Category:</strong> {course.category?.name || "N/A"}</div>
                  <div style={{ marginBottom: "5px" }}><strong>Level:</strong> {course.level}</div>
                  <div style={{ marginBottom: "5px" }}><strong>Price:</strong> {course.price > 0 ? `₹${course.price}` : <span style={{ color: "#10b981", fontWeight: "600" }}>Free</span>}</div>

                  {/* ✅ NEW MODULE 7: Visibility Badge */}
                  <div style={{ marginTop: "8px" }}>
                    <strong>Visibility:</strong>{" "}
                    {course.isGlobal === false ? (
                      <span style={{ color: "#d97706", fontWeight: "bold", fontSize: "0.85rem", backgroundColor: "#fef3c7", padding: "2px 6px", borderRadius: "4px" }}>Private (B2B)</span>
                    ) : (
                      <span style={{ color: "#059669", fontWeight: "bold", fontSize: "0.85rem", backgroundColor: "#d1fae5", padding: "2px 6px", borderRadius: "4px" }}>Global (B2C)</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => openContentModal(course._id)}
                style={{
                  width: "90%",
                  display: "block",
                  margin: "0 auto",
                  borderRadius: "10px",
                  fontWeight: 700,
                  background: "rgba(109,40,217,0.1)",
                  color: colors.primary,
                  border: "1px solid rgba(109,40,217,0.2)",
                  padding: "10px",
                  cursor: "pointer",
                }}
              >
                View Full Content
              </button>

              <div style={{ padding: "15px 20px", background: "#f8fafc", borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {course.lessons?.length || 0} Lessons |  {course.exams?.length || 0} Exams
                </span>
                <button
                  onClick={() => openEditModal(course)}
                  style={{ background: colors.primary, color: "#fff", border: "none", padding: "8px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", transition: "opacity 0.2s" }}
                  onMouseOver={(e) => e.target.style.opacity = "0.9"}
                  onMouseOut={(e) => e.target.style.opacity = "1"}
                >
                  Edit Course
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}>
          <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: "20px", color: colors.primary, fontWeight: "800", textAlign: "center" }}>Edit Course</h3>

            {successMsg && (
              <div style={{ padding: "10px", background: "#dcfce7", color: "#166534", borderRadius: "8px", marginBottom: "15px", textAlign: "center", fontWeight: "600" }}>
                {successMsg}
              </div>
            )}

            <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem" }}>Course Title</label>
            <input name="title" value={form.title} onChange={handleChange} required style={{ width: "100%", marginBottom: "15px", padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}` }} />

            <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem" }}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} style={{ width: "100%", marginBottom: "15px", padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}`, minHeight: "100px" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem" }}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                  <option value="">Select</option>
                  {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem" }}>Price (₹)</label>
                <input name="price" type="number" value={form.price} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}` }} />
              </div>
            </div>

            {/* ✅ NEW MODULE 7: B2B Visibility Settings in Edit Modal */}
            <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "10px", border: `1px solid ${colors.border}`, marginBottom: "15px" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: colors.primary }}>Course Visibility</h4>

              <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                <input
                  type="checkbox"
                  id="globalToggleEditPending"
                  checked={form.isGlobal}
                  onChange={(e) => setForm({ ...form, isGlobal: e.target.checked, allowedCompanies: e.target.checked ? [] : form.allowedCompanies })}
                  style={{ width: "16px", height: "16px", marginRight: "8px" }}
                />
                <label htmlFor="globalToggleEditPending" style={{ fontSize: "0.85rem", margin: 0, fontWeight: "600", cursor: "pointer" }}>
                  Global Course (Available to Public)
                </label>
              </div>

              {!form.isGlobal && (
                <div style={{ marginTop: "10px" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#92400e", fontWeight: "600", marginBottom: "5px" }}>
                    Select Corporate Client for this Private Course
                  </label>
                  <select
                    value={form.allowedCompanies[0] || ""}
                    onChange={(e) => setForm({ ...form, allowedCompanies: e.target.value ? [e.target.value] : [] })}
                    required={!form.isGlobal}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #fcd34d", background: "#fffbeb", outline: "none" }}
                  >
                    <option value="">-- Choose a Company --</option>
                    {companies.map((comp) => (
                      <option key={comp._id} value={comp._id}>{comp.companyName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem" }}>Thumbnail</label>
            <input type="file" onChange={handleThumbnailUpload} style={{ width: "100%", marginBottom: "10px", fontSize: "0.8rem" }} />

            {(form.thumbnail || uploading) && (
              <div style={{ marginBottom: "20px", textAlign: "center", background: "#f8fafc", padding: "10px", borderRadius: "10px", border: `1px dashed ${colors.border}` }}>
                {uploading ? <p style={{ fontSize: "0.8rem", color: colors.primary }}>Uploading...</p> :
                  <img src={form.thumbnail.startsWith("http") ? form.thumbnail : `${BASE_URL}${form.thumbnail}`} alt="preview" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "8px" }} />
                }
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#f1f5f9", fontWeight: "600", cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting || uploading} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: colors.primary, color: "#fff", fontWeight: "600", cursor: (submitting || uploading) ? "not-allowed" : "pointer" }}>
                {submitting ? "Saving Changes..." : "Update Course"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Preview Modal */}
      {showContent && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(15,23,42,0.7)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 2000,
          padding: "20px"
        }}>
          <div style={{
            width: "100%", maxWidth: "950px", maxHeight: "90vh", overflowY: "auto",
            background: "#fff", borderRadius: "18px", padding: "22px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontWeight: 900, color: colors.primary }}>Course Content Review</h3>
              <button
                onClick={closeContentModal}
                style={{ border: "none", background: "transparent", fontSize: "28px", cursor: "pointer", color: "#94a3b8" }}
              >
                &times;
              </button>
            </div>

            {contentLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: colors.primary }}>Loading course content...</div>
            ) : contentError ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#b91c1c" }}>{contentError}</div>
            ) : !contentCourse ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No content found.</div>
            ) : (
              <>
                <div style={{ fontWeight: 900, fontSize: "1.35rem", color: colors.primary }}>
                  {contentCourse.title}
                </div>
                <div style={{ color: "#64748b", margin: "6px 0 18px 0", fontSize: "0.95rem" }}>
                  <strong>Category:</strong> {contentCourse.category?.name || "N/A"} &nbsp;|&nbsp;
                  <strong>Level:</strong> {contentCourse.level || "—"} &nbsp;|&nbsp;
                  <strong>Price:</strong> {Number(contentCourse.price || 0) > 0 ? `₹${contentCourse.price}` : "Free"}
                </div>

                {/* Lessons Section */}
                <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: "10px", color: "#0f172a" }}>
                  Lessons ({contentCourse.lessons?.length || 0})
                </div>

                {(contentCourse.lessons || []).length === 0 ? (
                  <div style={{ color: "#94a3b8", fontStyle: "italic", marginBottom: "18px" }}>No lessons attached.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "22px" }}>
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
                        <div key={l._id || idx} style={{
                          background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px"
                        }}>
                          <div style={{ fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <span>{idx + 1}. {l.title}</span>
                            <span style={{
                              fontSize: "0.78rem", fontWeight: 800,
                              background: "#f3e8ff", color: colors.primary, padding: "2px 10px", borderRadius: "999px"
                            }}>
                              {l.contentType}
                            </span>
                            <span style={{
                              fontSize: "0.78rem", fontWeight: 800,
                              background: "#e2e8f0", color: "#475569", padding: "2px 10px", borderRadius: "999px"
                            }}>
                              ⏱ {durSec > 0 ? timeString : "0s"}
                            </span>
                          </div>

                          {type === "text" || (!src && l.description) ? (
                            <div style={{ marginTop: "10px", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "12px", borderRadius: "10px", color: "#334155" }}>
                              {l.description || "No text content provided."}
                            </div>
                          ) : null}

                          {type === "video" && src ? (
                            <div style={{ marginTop: "12px" }}>
                              <video controls src={src} style={{ width: "100%", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#000" }} />
                            </div>
                          ) : null}

                          {type === "pdf" && src ? (
                            <div style={{ marginTop: "12px" }}>
                              <iframe title={`pdf-${l._id || idx}`} src={src} style={{ width: "100%", height: "480px", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
                            </div>
                          ) : null}

                          {!((type === "text" || (!src && l.description)) || (type === "video" && src) || (type === "pdf" && src)) ? (
                            <div style={{ marginTop: "10px", color: "#94a3b8", fontStyle: "italic" }}>Content not available or format not supported.</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Exams Section */}
                <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: "10px", color: "#0f172a" }}>
                  Exams ({contentCourse.exams?.length || 0})
                </div>

                {(contentCourse.exams || []).length === 0 ? (
                  <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No exams attached.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {contentCourse.exams.map((ex, exIdx) => (
                      <div key={ex._id || exIdx} style={{
                        background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px"
                      }}>
                        <div style={{ fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                          <span>{exIdx + 1}. {ex.title}</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 900, background: "#e6f4ea", color: "#15803d", padding: "2px 10px", borderRadius: "999px" }}>{ex.duration} min</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 900, background: "#eef2ff", color: colors.primary, padding: "2px 10px", borderRadius: "999px" }}>{(ex.questions || []).length} Qs</span>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px", paddingBottom: "12px", borderBottom: `1px dashed ${colors.border}` }}>
                          <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: `1px solid ${colors.border}`, padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                            Pass: {ex.settings?.passingScore ?? 60}%
                          </span>
                          <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: `1px solid ${colors.border}`, padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                            Negative Marking: {ex.settings?.negativeMarking ?? 0}
                          </span>
                          <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: `1px solid ${colors.border}`, padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
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
                          <div style={{ marginTop: "10px", color: "#94a3b8", fontStyle: "italic" }}>No questions provided.</div>
                        ) : (
                          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {ex.questions.map((q, qIdx) => (
                              <div key={q._id || qIdx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px" }}>
                                <div style={{ fontWeight: 700, marginBottom: "6px", color: "#0f172a" }}>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingApprovals;