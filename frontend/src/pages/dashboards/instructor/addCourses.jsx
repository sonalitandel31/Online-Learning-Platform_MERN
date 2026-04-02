import { useState, useEffect } from "react";
import api from "../../../api/api";
import { useNavigate } from "react-router-dom";

function AddCourse() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [level, setLevel] = useState("Beginner");
  const [price, setPrice] = useState(0);

  // thumbnail states (added)
  const [thumbnail, setThumbnail] = useState(""); // stores "/uploads/thumbnails/..."
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // ===== NEW MODULE 7: B2B States =====
  const [isGlobal, setIsGlobal] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  // =====================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false); // New state for inline feedback
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const instructorId = localStorage.getItem("userId");

  // base url for preview (added)
  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  // --- STYLING CONSTANTS ---
  const colors = {
    primary: "#6d28d9", // Deep Purple
    secondary: "#10b981", // Emerald Green
    bg: "#f3f4f6",
    cardBg: "#ffffff",
    text: "#1f2937",
    border: "#d1d5db",
    error: "#ef4444",
    warningBg: "#fffbeb", // For B2B private box
    warningBorder: "#fcd34d"
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/courses/categories", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const cats = Array.isArray(res.data) ? res.data : res.data.categories || [];
        setCategories(cats);
      } catch (err) {
        console.error("Fetch categories error:", err);
        setError("Failed to fetch categories.");
        setCategories([]);
      }
    };

    // ===== NEW MODULE 7: Fetch Companies for B2B =====
    const fetchCompanies = async () => {
      try {
        const res = await api.get("/companies/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data.data || []);
      } catch (err) {
        console.error("Fetch companies error:", err);
      }
    };

    fetchCategories();
    fetchCompanies(); // Call new API
  }, [token]);

  // thumbnail upload handler (added)
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (!token) {
      setError("You must be logged in.");
      return;
    }

    // optional: basic image validation
    const isImage = file.type?.startsWith("image/");
    if (!isImage) {
      setError("Please upload an image file (jpg/png/webp).");
      return;
    }

    try {
      setUploadingThumb(true);

      const formData = new FormData();
      formData.append("thumbnail", file);

      const res = await api.post("/instructor/course/upload-thumbnail", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const fileUrl = res.data?.fileUrl;
      if (!fileUrl) {
        setError("Thumbnail upload failed: missing fileUrl.");
        return;
      }

      // backend returns "/uploads/thumbnails/..."
      setThumbnail(fileUrl);
    } catch (err) {
      console.error("Thumbnail upload error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Thumbnail upload failed."
      );
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) return setError("You must be logged in.");
    if (!category) return setError("Please select a category.");
    if (!isGlobal && !selectedCompany) return setError("Please select a company for this private course."); // B2B Validation

    try {
      setLoading(true);
      const res = await api.post(
        "/instructor/create-course",
        {
          title,
          description,
          category,
          level,
          instructor: instructorId,
          price,
          thumbnail,
          // ===== NEW MODULE 7: B2B Data payload =====
          isGlobal: isGlobal,
          allowedCompanies: isGlobal ? [] : [selectedCompany]
          // ===========================================
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 201 && res.data.course?._id) {
        setSuccess(true);
        // Navigate after a short delay so user can see the success message
        setTimeout(() => {
          navigate("/instructor-dashboard/instructor_courses");
        }, 1500);
      } else {
        console.error("Unexpected response:", res.data);
        setError("Unexpected server response. Check console for details.");
      }
    } catch (err) {
      console.error("Create course error:", err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to create course."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: `1px solid ${colors.border}`,
    fontSize: "1rem",
    outlineColor: colors.primary,
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: colors.text,
    fontSize: "0.9rem",
  };

  // thumbnail preview url (added)
  const thumbPreviewUrl = thumbnail
    ? thumbnail.startsWith("http")
      ? thumbnail
      : `${String(BASE_URL).replace(/\/$/, "")}/${String(thumbnail).replace(/^\//, "")}`
    : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.bg,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: colors.cardBg,
          width: "100%",
          maxWidth: "600px",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            color: colors.primary,
            marginBottom: "30px",
            fontSize: "1.8rem",
            fontWeight: "700",
          }}
        >
          Create New Course
        </h2>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: colors.error,
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "0.9rem",
              border: `1px solid ${colors.error}33`,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "1rem",
              fontWeight: "600",
              textAlign: "center",
              border: `1px solid #10b98133`,
            }}
          >
            Course created successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label style={labelStyle}>Course Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
              placeholder="e.g. Master React in 30 Days"
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
              placeholder="What will your students learn?"
            />
          </div>

          {/* Thumbnail upload UI (added) */}
          <div>
            <label style={labelStyle}>Course Thumbnail (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              style={{ marginBottom: "12px", fontSize: "0.95rem" }}
              disabled={uploadingThumb || loading || success}
            />

            {uploadingThumb && (
              <div style={{ marginBottom: "18px", fontSize: "0.9rem", color: "#92400e" }}>
                Uploading thumbnail...
              </div>
            )}

            {thumbPreviewUrl && !uploadingThumb && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "0.85rem", marginBottom: "8px", color: "#6b7280" }}>
                  Preview:
                </div>
                <img
                  src={thumbPreviewUrl}
                  alt="thumbnail preview"
                  style={{
                    width: "100%",
                    height: "160px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    border: `1px solid ${colors.border}`,
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">-- Select --</option>
                {Array.isArray(categories) &&
                  categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Price (₹)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={inputStyle}
              placeholder="0 for Free"
            />
          </div>

          {/* ===== NEW MODULE 7: B2B Course Visibility Settings ===== */}
          <div style={{
            borderTop: `1px solid ${colors.border}`,
            paddingTop: "20px",
            marginTop: "10px",
            marginBottom: "25px"
          }}>
            <h3 style={{ fontSize: "1.1rem", color: colors.text, marginBottom: "15px", fontWeight: "600" }}>
              Course Visibility (B2B Settings)
            </h3>
            
            <div style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
              <input
                type="checkbox"
                id="globalToggle"
                checked={isGlobal}
                onChange={() => setIsGlobal(!isGlobal)}
                style={{ width: "18px", height: "18px", marginRight: "10px", cursor: "pointer" }}
              />
              <label htmlFor="globalToggle" style={{ fontSize: "0.95rem", color: colors.text, cursor: "pointer", fontWeight: "500", margin: 0 }}>
                Global Course (Available to Public)
              </label>
            </div>

            {!isGlobal && (
              <div style={{
                backgroundColor: colors.warningBg,
                border: `1px solid ${colors.warningBorder}`,
                padding: "15px",
                borderRadius: "8px",
              }}>
                <label style={{ ...labelStyle, color: "#92400e" }}>Select Corporate Client</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  required={!isGlobal}
                  style={{ ...inputStyle, marginBottom: "5px", borderColor: colors.warningBorder }}
                >
                  <option value="">-- Choose a Company --</option>
                  {companies.map((comp) => (
                    <option key={comp._id} value={comp._id}>
                      {comp.companyName}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: "0.8rem", color: "#92400e" }}>
                  Only employees of the selected company will be able to see and access this course.
                </div>
              </div>
            )}
          </div>
          {/* ======================================================== */}

          <button
            type="submit"
            disabled={loading || success || uploadingThumb}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: loading ? "#9ca3af" : success ? colors.secondary : colors.secondary,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: loading || success || uploadingThumb ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
              boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)",
            }}
          >
            {loading ? "Processing..." : success ? "Created!" : uploadingThumb ? "Uploading..." : "Create Course"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/instructor-dashboard/instructor_courses")}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "10px",
              backgroundColor: "transparent",
              color: "#6b7280",
              border: "none",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Cancel and Go Back
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddCourse;