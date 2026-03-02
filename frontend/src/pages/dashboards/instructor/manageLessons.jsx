import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaVideo,
  FaFilePdf,
  FaFileAlt,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

export default function ManageLessons() {
  const { courseId: selectedCourseId } = useParams();
  const token = localStorage.getItem("token");

  const EDITABLE_STATUSES = ["draft", "pendingApproval"];

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- Lesson Preview Modal (View Lessons Only) ---
  const [showLessonPreview, setShowLessonPreview] = useState(false);
  const [previewCourse, setPreviewCourse] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [form, setForm] = useState({
    title: "",
    contentType: "video",
    fileUrl: "",
    description: "",
    isPreviewFree: false,
    duration: 0,
  });

  // --- Theme Colors ---
  const colors = {
    primary: "#6f42c1",
    primaryHover: "#5a32a3",
    danger: "#dc3545",
    success: "#198754",
    warning: "#d97706",
    bg: "#f8fafc",
    border: "#e2e8f0",
  };

  const buildFileUrl = (path) => {
    if (!path) return "";
    if (String(path).startsWith("http")) return path;

    const base = (import.meta.env.VITE_BASE_URL || "").replace(/\/$/, "");
    return `${base}/${String(path).replace(/^\//, "")}`;
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await api.get("/instructor/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const coursesData = res.data.courses.map((course) => ({
          ...course,
          lessons: course.lessons || [],
          lessonsCount: course.lessonsCount ?? 0,
          expanded: false,
          lessonsLoading: false,
        }));

        setCourses(coursesData);
      } catch (err) {
        setError("Failed to fetch courses");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [token]);

  useEffect(() => {
    if (!selectedCourseId) return;
    setCourses((prev) =>
      prev.map((course) =>
        course._id === selectedCourseId ? { ...course, expanded: true } : course
      )
    );
  }, [selectedCourseId]);

  const toggleCourse = async (courseId) => {
    setCourses((prev) =>
      prev.map((course) =>
        course._id === courseId ? { ...course, expanded: !course.expanded } : course
      )
    );

    const course = courses.find((c) => c._id === courseId);

    if (course && course.lessons.length === 0) {
      try {
        setCourses((prev) =>
          prev.map((c) => (c._id === courseId ? { ...c, lessonsLoading: true } : c))
        );

        const res = await api.get(`/instructor/course/${courseId}/lessons`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses((prev) =>
          prev.map((c) =>
            c._id === courseId
              ? {
                ...c,
                lessons: res.data.lessons || [],
                lessonsCount: res.data.lessonsCount ?? (res.data.lessons || []).length,
                lessonsLoading: false,
              }
              : c
          )
        );
      } catch (err) {
        setError("Failed to fetch lessons");
      }
    }
  };

  const isCourseEditable = (status) => EDITABLE_STATUSES.includes(status);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      let newForm = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "contentType") {
        if (value === "text") newForm.fileUrl = "";
        newForm.duration = 0;
      }
      return newForm;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await api.post("/instructor/lesson/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      let uploadedPath = res.data.fileUrl;
      if (uploadedPath.startsWith("http")) {
        const filename = uploadedPath.split("/").pop();
        uploadedPath = `/uploads/lessons/${filename}`;
      }

      // setForm((prev) => ({ ...prev, fileUrl: uploadedPath }));
      setForm((prev) => ({ ...prev, fileUrl: uploadedPath, duration: Number(res.data.duration || 0) }));
    } catch (err) {
      setError("File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openModal = (courseId, lesson = null) => {
    const course = courses.find((c) => c._id === courseId);
    if (!isCourseEditable(course.status)) {
      setWarning("You cannot add/edit lessons for an approved course!");
      return;
    }

    setCurrentCourseId(courseId);
    if (lesson) {
      setEditingLesson(lesson);
      setForm({
        title: lesson.title,
        contentType: lesson.contentType,
        fileUrl: lesson.fileUrl,
        description: lesson.description,
        isPreviewFree: lesson.isPreviewFree,
        duration: lesson.duration || 0,
      });
    } else {
      setEditingLesson(null);
      setForm({
        title: "",
        contentType: "video",
        fileUrl: "",
        description: "",
        isPreviewFree: false,
        duration: 0,
      });
    }

    setModalOpen(true);
    setWarning("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const course = courses.find((c) => c._id === currentCourseId);
    if (!isCourseEditable(course.status)) return;

    if (form.contentType !== "text" && !form.fileUrl) {
      return setError("Please upload a file first");
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        contentType: form.contentType,
        description: form.description,
        isPreviewFree: form.isPreviewFree,
        duration: form.duration,
        ...(form.contentType !== "text" && { fileUrl: form.fileUrl }),
      };

      let res;
      if (editingLesson) {
        res = await api.put(`/instructor/lesson/${editingLesson._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses((prev) =>
          prev.map((c) =>
            c._id !== currentCourseId
              ? c
              : {
                ...c,
                lessons: c.lessons.map((l) =>
                  l._id === editingLesson._id ? res.data.lesson : l
                ),
              }
          )
        );
      } else {
        res = await api.post(`/instructor/course/${currentCourseId}/add-lesson`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses((prev) =>
          prev.map((c) =>
            c._id !== currentCourseId
              ? c
              : {
                ...c,
                lessons: [...c.lessons, res.data.lesson],
                lessonsCount: (c.lessonsCount || 0) + 1,
              }
          )
        );
      }
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save lesson");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (courseId, lessonId) => {
    const course = courses.find((c) => c._id === courseId);
    if (!isCourseEditable(course.status)) return;
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;

    try {
      await api.delete(`/instructor/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses((prev) =>
        prev.map((c) =>
          c._id !== courseId
            ? c
            : {
              ...c,
              lessons: c.lessons.filter((l) => l._id !== lessonId),
              lessonsCount: Math.max((c.lessonsCount || 1) - 1, 0),
            }
        )
      );
    } catch (err) {
      setError("Failed to delete lesson");
    }
  };

  const openLessonsPreview = async (courseId) => {
    try {
      setShowLessonPreview(true);
      setPreviewLoading(true);
      setPreviewError("");

      // 1) current course find
      const course = courses.find((c) => c._id === courseId) || null;

      // 2) If lessons already present, use them
      if (course && Array.isArray(course.lessons) && course.lessons.length > 0) {
        setPreviewCourse(course);
        return;
      }

      // 3) Otherwise fetch lessons from API
      const res = await api.get(`/instructor/course/${courseId}/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const lessons = res.data?.lessons || [];

      // 4) Update both preview + main courses state
      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId
            ? {
              ...c,
              lessons,
              lessonsCount: res.data.lessonsCount ?? lessons.length,
            }
            : c
        )
      );

      setPreviewCourse((prevCourse) => {
        // ensure preview gets updated course object (fresh)
        const updated = (courses.find((c) => c._id === courseId) || course || {});
        return { ...updated, lessons };
      });
    } catch (err) {
      console.error(err);
      setPreviewError(err?.response?.data?.message || "Failed to load lessons");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeLessonsPreview = () => {
    setShowLessonPreview(false);
    setPreviewCourse(null);
    setPreviewError("");
  };

  const formatDuration = (seconds = 0) => {
    const totalSeconds = Number(seconds || 0);

    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }

    const totalMinutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}m`;
    }

    return `${totalMinutes}m`;
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
        }}
      >
        <div className="spinner" />
        <p style={{ marginTop: "15px", color: colors.primary }}>Loading lessons...</p>
        <style>{`.spinner { border: 4px solid #f3f3f3; border-top: 4px solid ${colors.primary}; borderRadius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="manage-lessons-container">
      <style>{`
        .manage-lessons-container { padding: 15px; background: ${colors.bg}; min-height: 100vh; }
        .course-row { background: #fff; border: 1px solid ${colors.border}; border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
        .course-header { padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
        .course-header:hover { background: #f1f5f9; }
        
        .lesson-table { width: 100%; border-collapse: collapse; display: none; }
        .lesson-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 0.85rem; color: #64748b; border-bottom: 1px solid ${colors.border}; }
        .lesson-table td { padding: 12px; border-bottom: 1px solid ${colors.border}; }

        .lesson-mobile-list { display: flex; flex-direction: column; gap: 10px; padding: 10px; }
        .lesson-card { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid ${colors.border}; }

        @media (min-width: 768px) {
          .manage-lessons-container { padding: 30px; }
          .lesson-table { display: table; }
          .lesson-mobile-list { display: none; }
        }

        .btn-add { background: ${colors.primary}; color: white; padding: 10px 18px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 15px; }
        .btn-add:disabled { background: #cbd5e1; cursor: not-allowed; }
      `}</style>

      <h2 style={{ marginBottom: "25px", fontWeight: "800", color: "#1e293b" }}>
        Manage Lessons
      </h2>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          {error}
        </div>
      )}
      {warning && (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          {warning}
        </div>
      )}

      {courses.map((course) => (
        <div key={course._id} className="course-row">
          <div
            className="course-header"
            onClick={() => toggleCourse(course._id)}
            style={{ background: course._id === selectedCourseId ? "#f3e8ff" : "white" }}
          >
            <div>
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "1.05rem",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                {course.title}
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "#eef2ff",
                    color: colors.primary,
                    fontWeight: "700",
                  }}
                >
                  {course.lessonsCount === null ? "..." : `${course.lessonsCount} Lessons`}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                Status:{" "}
                <span
                  style={{
                    fontWeight: "bold",
                    color: course.status === "approved" ? colors.success : colors.warning,
                  }}
                >
                  {course.status}
                </span>
              </div>
            </div>
            {course.expanded ? <FaChevronUp color="#94a3b8" /> : <FaChevronDown color="#94a3b8" />}
          </div>

          <div
            style={{
              maxHeight: course.expanded ? "2000px" : "0px",
              overflow: "hidden",
              transition: "max-height 0.4s ease",
            }}
          >
            <button
              className="btn-add"
              onClick={() => openModal(course._id)}
              disabled={!isCourseEditable(course.status)}
            >
              <FaPlus size={12} /> Add New Lesson
            </button>

            <button
              className="btn-add"
              type="button"
              onClick={() => openLessonsPreview(course._id)}
              style={{
                background: "rgba(111,66,193,0.12)",
                color: colors.primary,
                border: `1px solid rgba(111,66,193,0.25)`,
                marginTop: 0,
              }}
            >
              View Lessons
            </button>

            {course.lessonsLoading ? (
              <p style={{ padding: "20px", color: colors.primary }}>Fetching lessons...</p>
            ) : course.lessons.length === 0 ? (
              <p style={{ padding: "0 20px 20px 20px", color: "#94a3b8" }}>
                No lessons found for this course.
              </p>
            ) : (
              <>
                {/* DESKTOP TABLE */}
                <table className="lesson-table">
                  <thead>
                    <tr>
                      <th>Lesson Title</th>
                      <th>Type</th>
                      <th>Preview</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.lessons.map((lesson) => (
                      <tr key={lesson._id}>
                        <td style={{ fontWeight: "600" }}>{lesson.title}</td>
                        <td style={{ fontSize: "0.85rem", textTransform: "capitalize" }}>
                          {lesson.contentType}
                        </td>
                        <td>
                          {lesson.isPreviewFree ? (
                            <span style={{ color: colors.success }}>Free</span>
                          ) : (
                            "Paid"
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <FaEdit
                              className="action-icon"
                              onClick={() => openModal(course._id, lesson)}
                              style={{
                                cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed",
                                color: colors.primary,
                              }}
                            />
                            <FaTrash
                              className="action-icon"
                              onClick={() => handleDelete(course._id, lesson._id)}
                              style={{
                                cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed",
                                color: colors.danger,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* MOBILE LIST */}
                <div className="lesson-mobile-list">
                  {course.lessons.map((lesson) => (
                    <div key={lesson._id} className="lesson-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ fontWeight: "700" }}>{lesson.title}</div>
                        <div style={{ display: "flex", gap: "15px" }}>
                          <FaEdit
                            onClick={() => openModal(course._id, lesson)}
                            style={{ color: colors.primary, fontSize: "1.2rem" }}
                          />
                          <FaTrash
                            onClick={() => handleDelete(course._id, lesson._id)}
                            style={{ color: colors.danger, fontSize: "1.2rem" }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "15px", fontSize: "0.8rem", color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {lesson.contentType === "video" ? (
                            <FaVideo />
                          ) : lesson.contentType === "pdf" ? (
                            <FaFilePdf />
                          ) : (
                            <FaFileAlt />
                          )}
                          {lesson.contentType.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span style={{ color: lesson.isPreviewFree ? colors.success : "inherit" }}>
                          {lesson.isPreviewFree ? "Free Preview" : "Paid Content"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      {modalOpen && (
        <div style={modalOverlayStyle}>
          <form onSubmit={handleSubmit} style={modalContentStyle}>
            <h3 style={{ marginBottom: "20px", color: colors.primary }}>
              {editingLesson ? "Edit Lesson" : "Add Lesson"}
            </h3>

            <label style={labelStyle}>Lesson Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              style={inputFieldStyle}
              placeholder="Introduction to..."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div>
                <label style={labelStyle}>Content Type</label>
                <select
                  name="contentType"
                  value={form.contentType}
                  onChange={handleChange}
                  style={inputFieldStyle}
                >
                  <option value="video">Video</option>
                  <option value="pdf">Pdf</option>
                  <option value="text">Text Content</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: "25px" }}>
                <input
                  type="checkbox"
                  id="isPreviewFree"
                  name="isPreviewFree"
                  checked={form.isPreviewFree}
                  onChange={handleChange}
                  style={{ marginRight: "8px" }}
                />
                <label htmlFor="isPreviewFree" style={{ fontSize: "0.9rem", cursor: "pointer" }}>
                  Free Preview
                </label>
              </div>
            </div>

            {form.contentType !== "text" && (
              <div style={{ marginTop: "15px" }}>
                <label style={labelStyle}>Lesson File</label>
                <input type="file" onChange={handleFileUpload} style={{ ...inputFieldStyle, padding: "8px" }} />
                {uploading && <p style={{ fontSize: "0.8rem", color: colors.primary }}>Uploading to server...</p>}
                {form.fileUrl && !uploading && (
                  <p style={{ fontSize: "0.75rem", color: colors.success, overflow: "hidden", textOverflow: "ellipsis" }}>
                    File ready: {form.fileUrl}
                  </p>
                )}
              </div>
            )}

            <label style={{ ...labelStyle, marginTop: "15px" }}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              style={{ ...inputFieldStyle, height: "80px", resize: "none" }}
              placeholder="What will students learn?"
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "25px" }}>
              <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} style={cancelBtnStyle}>
                Cancel
              </button>
              <button type="submit" disabled={submitting || uploading} style={submitBtnStyle}>
                {submitting ? "Saving..." : editingLesson ? "Update Lesson" : "Add Lesson"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showLessonPreview && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "900px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, color: colors.primary, fontWeight: 900 }}>
                Lessons Preview
              </h3>

              <button
                onClick={closeLessonsPreview}
                style={{ border: "none", background: "transparent", fontSize: "28px", cursor: "pointer", color: "#94a3b8" }}
              >
                &times;
              </button>
            </div>

            {previewLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: colors.primary, fontWeight: 700 }}>
                Loading lessons...
              </div>
            ) : previewError ? (
              <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "10px" }}>
                {previewError}
              </div>
            ) : !previewCourse ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                No course found.
              </div>
            ) : (previewCourse.lessons || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                No lessons attached.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {(previewCourse.lessons || []).map((l, idx) => {
                  const type = String(l.contentType || "").toLowerCase();
                  const src = buildFileUrl(l.fileUrl);

                  return (
                    <div
                      key={l._id || idx}
                      style={{
                        background: "#fff",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "14px",
                        padding: "14px",
                      }}
                    >
                      {/* Lesson header */}
                      <div style={{ fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>{idx + 1}. {l.title}</span>

                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 900,
                            background: "#f3e8ff",
                            color: colors.primary,
                            padding: "2px 10px",
                            borderRadius: "999px",
                            textTransform: "uppercase",
                          }}
                        >
                          {type || "N/A"}
                        </span>

                        {l.isPreviewFree ? (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 900,
                              background: "#e6f4ea",
                              color: "#15803d",
                              padding: "2px 10px",
                              borderRadius: "999px",
                            }}
                          >
                            FREE PREVIEW
                          </span>
                        ) : null}
                      </div>

                      {/* Duration if exists */}
                      {Number(l.duration || 0) > 0 ? (
                        <div style={{ marginTop: "6px", color: "#64748b", fontSize: "0.85rem" }}>
                          ⏱ {formatDuration(l.duration)}
                        </div>
                      ) : null}

                      {/* TEXT */}
                      {type === "text" || (!src && l.description) ? (
                        <div
                          style={{
                            marginTop: "10px",
                            whiteSpace: "pre-wrap",
                            background: "#f8fafc",
                            padding: "12px",
                            borderRadius: "10px",
                            color: "#334155",
                          }}
                        >
                          {l.description || "No text content provided."}
                        </div>
                      ) : null}

                      {/* VIDEO */}
                      {type === "video" && src ? (
                        <div style={{ marginTop: "12px" }}>
                          <video
                            controls
                            src={src}
                            style={{
                              width: "100%",
                              borderRadius: "10px",
                              border: `1px solid ${colors.border}`,
                              background: "#000",
                            }}
                          />
                        </div>
                      ) : null}

                      {/* PDF */}
                      {type === "pdf" && src ? (
                        <div style={{ marginTop: "12px" }}>
                          <iframe
                            title={`pdf-${l._id || idx}`}
                            src={src}
                            style={{
                              width: "100%",
                              height: "480px",
                              border: `1px solid ${colors.border}`,
                              borderRadius: "10px",
                            }}
                          />
                        </div>
                      ) : null}

                      {/* fallback */}
                      {!(
                        (type === "text" || (!src && l.description)) ||
                        (type === "video" && src) ||
                        (type === "pdf" && src)
                      ) ? (
                        <div style={{ marginTop: "10px", color: "#94a3b8", fontStyle: "italic" }}>
                          Content not available or format not supported.
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styled Components Replacements (Internal) ---
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(15, 23, 42, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "15px",
};
const modalContentStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "15px",
  width: "100%",
  maxWidth: "500px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};
const labelStyle = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: "600",
  color: "#64748b",
  marginBottom: "6px",
};
const inputFieldStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  marginBottom: "12px",
  boxSizing: "border-box",
  fontSize: "16px",
};
const cancelBtnStyle = {
  padding: "10px 20px",
  background: "#f1f5f9",
  color: "#64748b",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};
const submitBtnStyle = {
  padding: "10px 20px",
  background: "#6f42c1",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};