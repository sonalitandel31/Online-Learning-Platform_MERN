import React, { useEffect, useState, useMemo } from "react";
import api from "../../../api/api";
import { Modal } from "react-bootstrap";

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]); // ✅ NEW MODULE 7
  const [loading, setLoading] = useState(true); // ✅ Changed initial to true
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Content Modal States
  const [showContent, setShowContent] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentCourse, setContentCourse] = useState(null);

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

  // ---- FILTERS ----
  const [filters, setFilters] = useState({
    q: "",
    category: "all",
    status: "all",
    level: "all",
    priceType: "all", 
    sort: "newest",   
  });

  const normalize = (v) => String(v ?? "").trim().toLowerCase();

  const getCourseCategoryId = (course) => {
    if (!course?.category) return "";
    return typeof course.category === "object" ? course.category._id : course.category;
  };
  const getCourseStatus = (course) => normalize(course?.status);
  const getCourseLevel = (course) => normalize(course?.level);
  const getCoursePrice = (course) => Number(course?.price || 0);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Unauthorized");
      setLoading(false);
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

    // ✅ NEW MODULE 7: Fetch Companies for B2B Private Courses
    const fetchCompanies = async () => {
      try {
        const res = await api.get("/companies/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCourses();
    fetchCategories();
    fetchCompanies();
  }, []);

  const openEditModal = (course) => {
    setEditingCourse(course);
    setForm({
      title: course.title || "",
      description: course.description || "",
      category: typeof course.category === "object" ? course.category._id : course.category || "",
      level: course.level || "",
      price: course.price || "",
      thumbnail: course.thumbnail || "",
      // ✅ NEW MODULE 7 Data Binding
      isGlobal: course.isGlobal !== false, 
      allowedCompanies: course.allowedCompanies?.length > 0 
        ? [typeof course.allowedCompanies[0] === 'object' ? course.allowedCompanies[0]._id : course.allowedCompanies[0]] 
        : []
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

      // Payload building including B2B settings
      const payload = {
        ...form,
        allowedCompanies: form.isGlobal ? [] : form.allowedCompanies
      };

      const res = await api.put(
        `/instructor/course/${editingCourse._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses((prev) =>
        prev.map((c) => (c._id === editingCourse._id ? res.data.course : c))
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

      setCourses((prev) => prev.filter((c) => c._id !== selectedCourse._id));

      setConfirmOpen(false);
      setSelectedCourse(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      q: "",
      category: "all",
      status: "all",
      level: "all",
      priceType: "all",
      sort: "newest",
    });
  };

  // Content Modal Functions
  const openContentModal = async (courseId) => {
    try {
      setShowContent(true);
      setContentLoading(true);
      setContentError("");
      setContentCourse(null);

      const token = localStorage.getItem("token");
      const res = await api.get(`/instructor/course/${courseId}/details`, {
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

  const filteredCourses = useMemo(() => {
    const q = normalize(filters.q);
    let list = [...courses];

    if (q) {
      list = list.filter((c) => {
        const title = normalize(c?.title);
        const desc = normalize(c?.description);
        return title.includes(q) || desc.includes(q);
      });
    }

    if (filters.category !== "all") {
      list = list.filter((c) => getCourseCategoryId(c) === filters.category);
    }

    if (filters.status !== "all") {
      list = list.filter((c) => getCourseStatus(c) === normalize(filters.status));
    }

    if (filters.level !== "all") {
      list = list.filter((c) => getCourseLevel(c) === normalize(filters.level));
    }

    if (filters.priceType !== "all") {
      list = list.filter((c) => {
        const p = getCoursePrice(c);
        return filters.priceType === "free" ? p === 0 : p > 0;
      });
    }

    const byTitle = (a, b) => normalize(a?.title).localeCompare(normalize(b?.title));
    const byPrice = (a, b) => getCoursePrice(a) - getCoursePrice(b);
    const byDate = (a, b) => {
      const da = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
      const db = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
      return da - db;
    };

    switch (filters.sort) {
      case "oldest": list.sort((a, b) => byDate(a, b)); break;
      case "newest": list.sort((a, b) => byDate(b, a)); break;
      case "priceAsc": list.sort((a, b) => byPrice(a, b)); break;
      case "priceDesc": list.sort((a, b) => byPrice(b, a)); break;
      case "titleAsc": list.sort((a, b) => byTitle(a, b)); break;
      case "titleDesc": list.sort((a, b) => byTitle(b, a)); break;
      default: break;
    }

    return list;
  }, [courses, filters]);

  // STYLING CONSTANTS
  const colors = {
    primary: "#6d28d9", 
    secondary: "#10b981", 
    warning: "#f59e0b", 
    danger: "#ef4444", 
    bg: "#f9fafb",
    text: "#1f2937",
    border: "#e5e7eb"
  };

  return (
    <div style={{ padding: "clamp(15px, 5vw, 40px)", backgroundColor: colors.bg, minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      {/* ✅ Skeleton CSS Styles */}
      <style>{`
        .skeleton {
          background: #f1f5f9;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skel-header-title { width: 180px; height: 32px; border-radius: 6px; }
        .skel-header-badge { width: 80px; height: 28px; border-radius: 20px; }
        
        .skel-filter-bar { height: 72px; width: 100%; border-radius: 16px; margin-bottom: 20px; }
        .skel-filter-meta { height: 24px; width: 100%; margin-bottom: 20px; }
        
        .skel-card { border-radius: 16px; height: 420px; border: 1px solid #e5e7eb; overflow: hidden; background: white; }
        .skel-card-img { width: 100%; height: 180px; }
        .skel-card-body { padding: 20px; display: flex; flexDirection: column; }
        .skel-card-title { width: 80%; height: 20px; margin-bottom: 15px; }
        .skel-card-text { width: 60%; height: 14px; margin-bottom: 8px; }
        .skel-card-btn-row { display: flex; gap: 8px; margin-top: 30px; }
        .skel-card-btn { flex: 1; height: 38px; border-radius: 8px; }

        @media (max-width: 768px) {
          .skel-filter-bar { height: 280px; }
        }
      `}</style>

      {loading ? (
        <>
          {/* Skeleton Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "10px" }}>
            <div className="skeleton skel-header-title"></div>
            <div className="skeleton skel-header-badge"></div>
          </div>

          {/* Skeleton Filter Bar */}
          <div className="skeleton skel-filter-bar"></div>
          <div className="skeleton skel-filter-meta"></div>

          {/* Skeleton Course Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="skel-card">
                <div className="skeleton skel-card-img"></div>
                <div className="skel-card-body">
                  <div className="skeleton skel-card-title"></div>
                  <div className="skeleton skel-card-text"></div>
                  <div className="skeleton skel-card-text" style={{ width: '40%' }}></div>
                  <div className="skeleton skel-card-text" style={{ width: '70%' }}></div>
                  <div className="skeleton skel-card-text" style={{ width: '50%' }}></div>
                  
                  <div className="skel-card-btn-row">
                    <div className="skeleton skel-card-btn"></div>
                    <div className="skeleton skel-card-btn"></div>
                  </div>
                  <div className="skeleton skel-card-btn" style={{ width: '100%', marginTop: '8px' }}></div>
                  <div className="skeleton skel-card-btn" style={{ width: '100%', marginTop: '8px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ margin: 0, color: colors.primary, fontWeight: "700", fontSize: "1.8rem" }}>My Courses</h2>
            <span style={{ fontSize: "0.9rem", color: "#6b7280", background: "#fff", padding: "5px 12px", borderRadius: "20px", border: `1px solid ${colors.border}` }}>
              Total: {courses.length}
            </span>
          </div>

          {/* FILTER BAR */}
          <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "14px", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <input name="q" value={filters.q} onChange={handleFilterChange} placeholder="Search course title..." style={{ flex: "1 1 200px", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${colors.border}`, outlineColor: colors.primary }} />
              <select name="category" value={filters.category} onChange={handleFilterChange} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <option value="all">All Categories</option>
                {categories.map((cat) => <option value={cat._id} key={cat._id}>{cat.name}</option>)}
              </select>
              <select name="status" value={filters.status} onChange={handleFilterChange} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pendingApproval">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select name="level" value={filters.level} onChange={handleFilterChange} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <select name="priceType" value={filters.priceType} onChange={handleFilterChange} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <option value="all">All Prices</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
              <select name="sort" value={filters.sort} onChange={handleFilterChange} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priceAsc">Price: Low → High</option>
                <option value="priceDesc">Price: High → Low</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                Showing <strong style={{ color: colors.text }}>{filteredCourses.length}</strong> of <strong style={{ color: colors.text }}>{courses.length}</strong>
              </div>
              <button onClick={clearFilters} style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${colors.border}`, background: "#fff", cursor: "pointer", fontWeight: 600, color: colors.text }}>
                Clear Filters
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px", backgroundColor: "#fee2e2", color: colors.danger, borderRadius: "8px", marginBottom: "20px", border: `1px solid ${colors.danger}44` }}>
              {error}
            </div>
          )}

          {filteredCourses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px", background: "#fff", borderRadius: "15px", border: `2px dashed ${colors.border}` }}>
              <p style={{ color: "#6b7280", fontSize: "1.1rem" }}>
                {courses.length === 0 ? "No courses created yet. Start by creating your first course!" : "No courses match your filters."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
              {filteredCourses.map((course) => (
                <div key={course._id} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", transition: "transform 0.2s" }}>

                  <div style={{ position: "relative" }}>
                    <img
                      src={course.thumbnail ? (course.thumbnail.startsWith("http") ? course.thumbnail : `${BASE_URL}${course.thumbnail}`) : "https://via.placeholder.com/300x150"}
                      alt={course.title}
                      style={{ width: "100%", height: "180px", objectFit: "cover" }}
                    />
                    <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(255,255,255,0.95)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: colors.primary }}>
                      {course.level}
                    </div>
                  </div>

                  <div style={{ padding: "20px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2rem", color: colors.text, lineHeight: "1.4" }}>{course.title}</h3>

                    <div style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "15px" }}>
                      <div style={{ marginBottom: "5px" }}><strong>Category:</strong> {course.category?.name || "Uncategorized"}</div>
                      <div style={{ marginBottom: "5px" }}><strong>Price:</strong> <span style={{ color: colors.secondary, fontWeight: "bold" }}>{course.price > 0 ? `₹${course.price}` : "Free"}</span></div>
                      
                      {/* ✅ NEW MODULE 7: Visibility Badge */}
                      <div style={{ marginBottom: "5px" }}>
                        <strong>Visibility:</strong>{" "}
                        {course.isGlobal === false ? (
                          <span style={{ color: "#d97706", fontWeight: "bold", fontSize: "0.85rem", backgroundColor: "#fef3c7", padding: "2px 6px", borderRadius: "4px" }}>Private (B2B)</span>
                        ) : (
                          <span style={{ color: "#059669", fontWeight: "bold", fontSize: "0.85rem", backgroundColor: "#d1fae5", padding: "2px 6px", borderRadius: "4px" }}>Global (B2C)</span>
                        )}
                      </div>

                      <div style={{ marginTop: "8px" }}>
                        <strong>Status:</strong>
                        {(() => {
                          const s = String(course.status || "").toLowerCase();
                          const badgeMap = {
                            approved: { bg: "#dcfce7", color: "#166534", label: "approved" },
                            pendingapproval: { bg: "#fef3c7", color: "#92400e", label: "pending" },
                            rejected: { bg: "#fee2e2", color: "#991b1b", label: "rejected" },
                            draft: { bg: "#e5e7eb", color: "#374151", label: "draft" },
                          };
                          const b = badgeMap[s] || { bg: "#e5e7eb", color: "#374151", label: s || "unknown" };
                          return (
                            <span style={{ marginLeft: "5px", padding: "2px 8px", borderRadius: "6px", fontSize: "0.8rem", background: b.bg, color: b.color, fontWeight: "700", textTransform: "uppercase" }}>
                              {b.label}
                            </span>
                          );
                        })()}
                      </div>

                      {course.status === "rejected" && (
                        <div style={{ marginTop: "12px", padding: "10px", borderRadius: "10px", background: "#fff1f2", border: `1px solid ${colors.danger}33`, color: "#7f1d1d", fontSize: "0.85rem", lineHeight: "1.4" }}>
                          <div style={{ fontWeight: "800", marginBottom: "6px" }}>Why rejected?</div>
                          <div style={{ marginBottom: "6px" }}><strong>Reason:</strong> {course.review?.rejectionReason || "Not provided"}</div>
                          {course.review?.reviewNote && <div style={{ marginBottom: "6px" }}><strong>Admin Note:</strong> {course.review.reviewNote}</div>}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: "auto" }}>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <button onClick={() => openEditModal(course)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${colors.primary}`, background: "#fff", color: colors.primary, cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}>
                          Edit
                        </button>

                        {course.status === "draft" && (
                          <button onClick={() => handleStatusUpdate(course, "pendingApproval")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: colors.secondary, color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}>
                            Submit
                          </button>
                        )}

                        {course.status === "pendingApproval" && (
                          <button onClick={() => handleStatusUpdate(course, "draft")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: colors.warning, color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}>
                            Revert
                          </button>
                        )}
                      </div>

                      {course.status === "rejected" && (
                        <button onClick={() => handleStatusUpdate(course, "draft")} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "none", background: colors.warning, color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", marginBottom: "8px" }}>
                          Move to Draft (Fix & Resubmit)
                        </button>
                      )}

                      <button
                        onClick={() => openContentModal(course._id)}
                        style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid rgba(109, 40, 217, 0.2)", background: "rgba(109, 40, 217, 0.05)", color: colors.primary, cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", marginBottom: "8px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        View Content
                      </button>

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

          {/* EDIT MODAL */}
          {modalOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "20px", backdropFilter: "blur(4px)" }}>
              <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginBottom: "20px", color: colors.primary, fontSize: "1.5rem" }}>Edit Course</h3>

                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Course Title</label>
                <input name="title" value={form.title} onChange={handleChange} required style={{ width: "100%", marginBottom: "15px", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}`, outlineColor: colors.primary }} />

                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} style={{ width: "100%", marginBottom: "15px", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}`, minHeight: "80px", outlineColor: colors.primary }} />

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
                    <select name="level" value={form.level} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Price (₹)</label>
                <input name="price" type="number" value={form.price} onChange={handleChange} style={{ width: "100%", marginBottom: "15px", padding: "10px", borderRadius: "8px", border: `1px solid ${colors.border}` }} />

                {/* ✅ NEW MODULE 7: B2B Visibility Settings in Edit Modal */}
                <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "10px", border: `1px solid ${colors.border}`, marginBottom: "15px" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: colors.primary }}>Course Visibility</h4>
                  
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <input
                      type="checkbox"
                      id="globalToggleEdit"
                      checked={form.isGlobal}
                      onChange={(e) => setForm({ ...form, isGlobal: e.target.checked, allowedCompanies: e.target.checked ? [] : form.allowedCompanies })}
                      style={{ width: "16px", height: "16px", marginRight: "8px" }}
                    />
                    <label htmlFor="globalToggleEdit" style={{ fontSize: "0.85rem", margin: 0, fontWeight: "600", cursor: "pointer" }}>
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

                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600" }}>Course Thumbnail</label>
                <input type="file" onChange={handleThumbnailUpload} style={{ marginBottom: "10px", fontSize: "0.8rem" }} />

                {uploading && <p style={{ color: colors.warning, fontSize: "0.8rem" }}>Uploading image...</p>}

                {form.thumbnail && !uploading && (
                  <img src={form.thumbnail.startsWith("http") ? form.thumbnail : `${BASE_URL}${form.thumbnail}`} alt="preview" style={{ width: "100%", height: "120px", marginBottom: "15px", borderRadius: "12px", objectFit: "cover", border: `1px solid ${colors.border}` }} />
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", borderTop: `1px solid ${colors.border}`, paddingTop: "20px" }}>
                  <button type="button" onClick={() => setModalOpen(false)} style={{ padding: "10px 20px", background: "none", border: "none", color: "#6b7280", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={submitting || uploading} style={{ padding: "10px 25px", background: colors.primary, border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: "600" }}>
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
                  <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: "12px", background: "#f3f4f6", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}>Keep it</button>
                  <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "12px", background: colors.danger, border: "none", borderRadius: "10px", color: "#fff", fontWeight: "600", cursor: deleting ? "not-allowed" : "pointer" }}>
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW CONTENT MODAL */}
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
                        const src = l.fileUrl ? (l.fileUrl.startsWith("http") ? l.fileUrl : `${BASE_URL.replace(/\/$/, "")}/${String(l.fileUrl).replace(/^\//, "")}`) : "";
                        const durSec = l.duration || 0;
                        const m = Math.floor(durSec / 60);
                        const s = durSec % 60;
                        const timeString = m > 0 ? `${m}m ${s}s` : `${s}s`;

                        return (
                          <div key={l._id || `lesson-${idx}`} style={{ backgroundColor: "#fff", border: "1px solid #edf2f7", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#2d3748", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                              <span>{idx + 1}. {l.title}</span>
                              <span style={{ color: "#6f42c1", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#f3e8ff", padding: "2px 8px", borderRadius: "12px" }}>{l.contentType}</span>
                              <span style={{ color: "#475569", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "12px" }}>⏱ {durSec > 0 ? timeString : "0s"}</span>
                            </div>
                            {type === "text" || (!src && l.description) ? (
                              <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", color: "#4a5568", backgroundColor: "#f8f9fa", padding: "12px", borderRadius: "8px" }}>{l.description || "No text content provided."}</div>
                            ) : null}
                            {type === "video" && src ? (
                              <div style={{ marginTop: "14px" }}><video controls style={{ width: "100%", borderRadius: "8px", border: "1px solid #edf2f7", backgroundColor: "#000" }} src={src} /></div>
                            ) : null}
                            {type === "pdf" && src ? (
                              <div style={{ marginTop: "14px" }}><iframe title={`pdf-${l._id || idx}`} src={src} style={{ width: "100%", height: "480px", border: "1px solid #edf2f7", borderRadius: "8px" }} /></div>
                            ) : null}
                            {!((type === "text" || (!src && l.description)) || (type === "video" && src) || (type === "pdf" && src)) ? (
                              <div style={{ marginTop: "12px", color: "#a0aec0", fontStyle: "italic" }}>Content not available or format not supported.</div>
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
                            <span style={{ color: "#28a745", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#e6f4ea", padding: "2px 8px", borderRadius: "12px" }}>{ex.duration} min</span>
                            <span style={{ color: "#6f42c1", fontWeight: 600, fontSize: "0.8rem", backgroundColor: "#eef2ff", padding: "2px 8px", borderRadius: "12px" }}>{(ex.questions || []).length} Qs</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px", paddingBottom: "12px", borderBottom: "1px dashed #e2e8f0" }}>
                            <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>Pass: {ex.settings?.passingScore ?? 60}%</span>
                            <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>Negative Marking: {ex.settings?.negativeMarking ?? 0}</span>
                            <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>Attempts: {ex.settings?.maxAttempts ?? 3}</span>
                          </div>
                          {(ex.questions || []).length === 0 ? (
                            <div style={{ color: "#a0aec0", fontStyle: "italic", marginTop: "10px" }}>No questions provided.</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                              {ex.questions.map((q, qIdx) => (
                                <div key={q._id || `q-${qIdx}`} style={{ padding: "12px", borderRadius: "8px", background: "#f8f9fa", border: "1px solid #edf2f7" }}>
                                  <div style={{ fontWeight: 600, color: "#2d3748", marginBottom: "8px" }}>Q{qIdx + 1}. {q.questionText}</div>
                                  <ul style={{ margin: 0, paddingLeft: "24px", color: "#4a5568" }}>
                                    {(q.options || []).map((opt, oIdx) => {
                                      const isCorrect = opt === q.correctAnswer;
                                      return (
                                        <li key={`${qIdx}-opt-${oIdx}`} style={{ marginBottom: "6px", fontWeight: isCorrect ? 700 : 400, color: isCorrect ? "#15803d" : "inherit" }}>
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
        </>
      )}
    </div>
  );
}