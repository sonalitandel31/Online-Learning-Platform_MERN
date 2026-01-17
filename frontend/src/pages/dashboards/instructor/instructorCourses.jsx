import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "",
    price: "",
    thumbnail: "",
  });

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Unauthorized");
      return;
    }

    const fetchCourses = async () => {
      try {
        setLoading(true);

        const res = await api.get("/instructor/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses(res.data.courses || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch courses.");
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await api.get("/courses/categories");
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCourses();
    fetchCategories();
  }, []);

  const openEditModal = (course) => {
    setEditingCourse(course);
    setForm({
      title: course.title || "",
      description: course.description || "",
      category:
        typeof course.category === "object"
          ? course.category._id
          : course.category || "",
      level: course.level || "",
      price: course.price || "",
      thumbnail: course.thumbnail || "",
    });

    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem("token");

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("thumbnail", file);

      const res = await api.post(
        "/instructor/course/upload-thumbnail",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setForm((prev) => ({ ...prev, thumbnail: res.data.fileUrl }));
    } catch (err) {
      console.error(err);
      setError("Thumbnail upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const res = await api.put(
        `/instructor/course/${editingCourse._id}`,
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCourses((prev) =>
        prev.map((c) =>
          c._id === editingCourse._id ? res.data.course : c
        )
      );

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Failed to update course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (course, newStatus) => {
    const token = localStorage.getItem("token");

    try {
      const res = await api.put(
        `/instructor/course/${course._id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? res.data.course : c))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update status");
    }
  };

  const confirmDelete = (course) => {
    setSelectedCourse(course);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem("token");

      await api.delete(`/instructor/course/${selectedCourse._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses((prev) =>
        prev.filter((c) => c._id !== selectedCourse._id)
      );

      setConfirmOpen(false);
      setSelectedCourse(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  // --- STYLING CONSTANTS ---
  const colors = {
    primary: "#6d28d9", // Deep Purple
    secondary: "#10b981", // Emerald Green
    warning: "#f59e0b", // Amber
    danger: "#ef4444", // Red
    bg: "#f9fafb",
    text: "#1f2937",
    border: "#e5e7eb"
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "70vh", color: colors.primary }}>
        <div style={{ border: `4px solid ${colors.border}`, borderTop: `4px solid ${colors.primary}`, borderRadius: "50%", width: "50px", height: "50px", animation: "spin 1s linear infinite", marginBottom: "20px" }} />
        <p style={{ fontWeight: "600" }}>Loading your dashboard...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(15px, 5vw, 40px)", backgroundColor: colors.bg, minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0, color: colors.primary, fontWeight: "700", fontSize: "1.8rem" }}>My Courses</h2>
        <span style={{ fontSize: "0.9rem", color: "#6b7280", background: "#fff", padding: "5px 12px", borderRadius: "20px", border: `1px solid ${colors.border}` }}>
          Total: {courses.length}
        </span>
      </div>

      {error && (
        <div style={{ padding: "12px", backgroundColor: "#fee2e2", color: colors.danger, borderRadius: "8px", marginBottom: "20px", border: `1px solid ${colors.danger}44` }}>
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", background: "#fff", borderRadius: "15px", border: `2px dashed ${colors.border}` }}>
          <p style={{ color: "#6b7280", fontSize: "1.1rem" }}>No courses created yet. Start by creating your first course!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px" }}>
          {courses.map((course) => (
            <div key={course._id} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", transition: "transform 0.2s" }}>
              
              <div style={{ position: "relative" }}>
                <img
                  src={course.thumbnail ? `${BASE_URL}${course.thumbnail}` : "https://via.placeholder.com/300x150"}
                  alt={course.title}
                  style={{ width: "100%", height: "180px", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(255,255,255,0.9)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: colors.primary }}>
                  {course.level}
                </div>
              </div>

              <div style={{ padding: "20px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2rem", color: colors.text, lineHeight: "1.4" }}>{course.title}</h3>
                
                <div style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "15px" }}>
                  <div style={{ marginBottom: "5px" }}><strong>Category:</strong> {course.category?.name || "Uncategorized"}</div>
                  <div style={{ marginBottom: "5px" }}><strong>Price:</strong> <span style={{ color: colors.secondary, fontWeight: "bold" }}>{course.price > 0 ? `₹${course.price}` : "Free"}</span></div>
                  <div>
                    <strong>Status:</strong> 
                    <span style={{ marginLeft: "5px", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem", background: course.status === 'published' ? '#dcfce7' : '#fef3c7', color: course.status === 'published' ? '#166534' : '#92400e' }}>
                      {course.status}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: "auto" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <button onClick={() => openEditModal(course)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${colors.primary}`, background: "#fff", color: colors.primary, cursor: "pointer", fontWeight: "600" }}>
                      Edit Details
                    </button>
                    
                    {course.status === "draft" && (
                      <button onClick={() => handleStatusUpdate(course, "pendingApproval")} style={{ flex: 1.5, padding: "8px", borderRadius: "8px", border: "none", background: colors.secondary, color: "#fff", cursor: "pointer", fontWeight: "600" }}>
                        Submit
                      </button>
                    )}

                    {course.status === "pendingApproval" && (
                      <button onClick={() => handleStatusUpdate(course, "draft")} style={{ flex: 1.5, padding: "8px", borderRadius: "8px", border: "none", background: colors.warning, color: "#fff", cursor: "pointer", fontWeight: "600" }}>
                        Revert
                      </button>
                    )}
                  </div>

                  {(course.status === "draft" || course.status === "pendingApproval") && (
                    <button onClick={() => confirmDelete(course)} disabled={deleting} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "none", background: "#fee2e2", color: colors.danger, cursor: deleting ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "0.85rem" }}>
                      {deleting && selectedCourse?._id === course._id ? "Deleting..." : "Delete Course"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL OVERLAY */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "20px", backdropFilter: "blur(4px)" }}>
          <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginBottom: "20px", color: colors.primary, fontSize: "1.5rem" }}>Edit Course</h3>

            <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Course Title</label>
            <input name="title" placeholder="e.g. Advanced React Patterns" value={form.title} onChange={handleChange} required style={{ width: "100%", marginBottom: "15px", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}`, outlineColor: colors.primary }} />

            <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Description</label>
            <textarea name="description" placeholder="What will students learn?" value={form.description} onChange={handleChange} style={{ width: "100%", marginBottom: "15px", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}`, minHeight: "80px", outlineColor: colors.primary }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                  <option value="">Select</option>
                  {categories.map((cat) => <option value={cat._id} key={cat._id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Level</label>
                <input name="level" placeholder="e.g. Beginner" value={form.level} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}` }} />
              </div>
            </div>

            <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Price (₹)</label>
            <input name="price" type="number" placeholder="0 for Free" value={form.price} onChange={handleChange} style={{ width: "100%", marginBottom: "15px", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}` }} />

            <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Course Thumbnail</label>
            <input type="file" onChange={handleThumbnailUpload} style={{ marginBottom: "10px", fontSize: "0.8rem" }} />

            {uploading && <p style={{ color: colors.warning, fontSize: "0.8rem" }}>Uploading image...</p>}

            {form.thumbnail && !uploading && (
              <img src={`${BASE_URL}${form.thumbnail}`} alt="thumbnail preview" style={{ width: "100%", height: "120px", marginBottom: "15px", borderRadius: "12px", objectFit: "cover", border: `1px solid ${colors.border}` }} />
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", borderTop: `1px solid ${colors.border}`, paddingTop: "20px" }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ padding: "10px 20px", background: "none", border: "none", color: "#6b7280", fontWeight: "600", cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting || uploading} style={{ padding: "10px 25px", background: colors.primary, border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 6px rgba(109, 40, 217, 0.2)" }}>
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmOpen && selectedCourse && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "400px", padding: "30px", borderRadius: "20px", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ width: "60px", height: "60px", background: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <span style={{ color: colors.danger, fontSize: "1.5rem", fontWeight: "bold" }}>!</span>
            </div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.3rem" }}>Delete Course?</h3>
            <p style={{ color: "#6b7280", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{selectedCourse.title}</strong>? This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: "12px", background: "#f3f4f6", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}>
                Keep it
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "12px", background: colors.danger, border: "none", borderRadius: "10px", color: "#fff", fontWeight: "600", cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}