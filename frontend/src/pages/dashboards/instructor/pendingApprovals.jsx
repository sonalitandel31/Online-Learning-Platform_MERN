import { useEffect, useState } from "react";
import api from "../../../api/api";

function PendingApprovals() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(""); // Added for inline feedback
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "",
    price: "",
    thumbnail: "",
  });
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    fetchCategories();
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
      const res = await api.put(`/instructor/course/${editingCourse._id}`, form, {
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

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "70vh", color: colors.primary }}>
        <div style={{ border: "4px solid #f3f3f3", borderTop: `4px solid ${colors.primary}`, borderRadius: "50%", width: "50px", height: "50px", animation: "spin 1s linear infinite", marginBottom: "20px" }} />
        <p style={{ fontWeight: "600" }}>Loading pending approvals...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
                  <div><strong>Price:</strong> {course.price > 0 ? `₹${course.price}` : <span style={{ color: "#10b981", fontWeight: "600" }}>Free</span>}</div>
                </div>
              </div>

              <div style={{ padding: "15px 20px", background: "#f8fafc", borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {course.lessons?.length || 0} Lessons
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

            <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem" }}>Thumbnail</label>
            <input type="file" onChange={handleThumbnailUpload} style={{ width: "100%", marginBottom: "10px", fontSize: "0.8rem" }} />
            
            {(form.thumbnail || uploading) && (
              <div style={{ marginBottom: "20px", textAlign: "center", background: "#f8fafc", padding: "10px", borderRadius: "10px", border: `1px dashed ${colors.border}` }}>
                {uploading ? <p style={{ fontSize: "0.8rem", color: colors.primary }}>Uploading...</p> : 
                  <img src={`${BASE_URL}${form.thumbnail}`} alt="preview" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "8px" }} />
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
    </div>
  );
}

export default PendingApprovals;